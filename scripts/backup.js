#!/usr/bin/env node

/**
 * Database Backup Script
 * Creates MongoDB snapshots for backup and rollback
 */

import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

config();

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGODB_URI = process.env.MONGODB_URI;
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, "../backups");
const MAX_BACKUPS = parseInt(process.env.MAX_BACKUPS || "30"); // Keep last 30 backups

/**
 * Parse MongoDB URI to get connection details
 */
function parseMongoURI(uri) {
  try {
    const url = new URL(uri);
    return {
      host: url.hostname,
      port: url.port || 27017,
      database: url.pathname.replace("/", ""),
      username: url.username,
      password: url.password,
    };
  } catch (error) {
    throw new Error(`Invalid MongoDB URI: ${error.message}`);
  }
}

/**
 * Create backup directory if it doesn't exist
 */
async function ensureBackupDir() {
  await fs.ensureDir(BACKUP_DIR);
  console.log(`Backup directory: ${BACKUP_DIR}`);
}

/**
 * Get backup filename with timestamp
 */
function getBackupFilename() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `backup-${timestamp}`;
}

/**
 * Create MongoDB backup using mongodump
 */
async function createBackup() {
  try {
    const mongoConfig = parseMongoURI(MONGODB_URI);
    const backupName = getBackupFilename();
    const backupPath = path.join(BACKUP_DIR, backupName);

    await ensureBackupDir();

    // Build mongodump command
    let command = `mongodump --uri="${MONGODB_URI}" --out="${backupPath}"`;

    // If using authentication, add credentials
    if (mongoConfig.username && mongoConfig.password) {
      command = `mongodump --host=${mongoConfig.host} --port=${mongoConfig.port} --username=${mongoConfig.username} --password=${mongoConfig.password} --authenticationDatabase=admin --db=${mongoConfig.database} --out="${backupPath}"`;
    }

    console.log("Creating backup...");
    console.log(`Command: ${command.replace(/--password=[^\s]+/, "--password=***")}`);

    const { stdout, stderr } = await execAsync(command);

    if (stderr && !stderr.includes("writing")) {
      console.error("Backup warnings:", stderr);
    }

    console.log("Backup created successfully!");
    console.log(`Backup location: ${backupPath}`);

    // Create metadata file
    const metadata = {
      timestamp: new Date().toISOString(),
      database: mongoConfig.database,
      backupPath: backupPath,
      version: "1.0.0",
    };

    await fs.writeJSON(path.join(backupPath, "metadata.json"), metadata, {
      spaces: 2,
    });

    // Clean up old backups
    await cleanupOldBackups();

    return backupPath;
  } catch (error) {
    console.error("Error creating backup:", error);
    throw error;
  }
}

/**
 * Restore from backup
 */
async function restoreBackup(backupName) {
  try {
    const mongoConfig = parseMongoURI(MONGODB_URI);
    const backupPath = path.join(BACKUP_DIR, backupName);

    // Check if backup exists
    if (!(await fs.pathExists(backupPath))) {
      throw new Error(`Backup not found: ${backupPath}`);
    }

    // Read metadata
    const metadataPath = path.join(backupPath, "metadata.json");
    let metadata = {};
    if (await fs.pathExists(metadataPath)) {
      metadata = await fs.readJSON(metadataPath);
    }

    console.log(`Restoring from backup: ${backupName}`);
    console.log(`Backup timestamp: ${metadata.timestamp || "Unknown"}`);

    // Build mongorestore command
    const dbPath = path.join(backupPath, mongoConfig.database);
    let command = `mongorestore --uri="${MONGODB_URI}" --drop "${dbPath}"`;

    // If using authentication
    if (mongoConfig.username && mongoConfig.password) {
      command = `mongorestore --host=${mongoConfig.host} --port=${mongoConfig.port} --username=${mongoConfig.username} --password=${mongoConfig.password} --authenticationDatabase=admin --db=${mongoConfig.database} --drop "${dbPath}"`;
    }

    console.log("Restoring backup...");
    console.log(`Command: ${command.replace(/--password=[^\s]+/, "--password=***")}`);

    const { stdout, stderr } = await execAsync(command);

    if (stderr && !stderr.includes("restoring")) {
      console.error("Restore warnings:", stderr);
    }

    console.log("Backup restored successfully!");
  } catch (error) {
    console.error("Error restoring backup:", error);
    throw error;
  }
}

/**
 * List available backups
 */
async function listBackups() {
  try {
    await ensureBackupDir();
    const backups = await fs.readdir(BACKUP_DIR);

    const backupList = [];
    for (const backup of backups) {
      const backupPath = path.join(BACKUP_DIR, backup);
      const stats = await fs.stat(backupPath);

      if (stats.isDirectory()) {
        const metadataPath = path.join(backupPath, "metadata.json");
        let metadata = {};
        if (await fs.pathExists(metadataPath)) {
          metadata = await fs.readJSON(metadataPath);
        }

        backupList.push({
          name: backup,
          timestamp: metadata.timestamp || stats.birthtime.toISOString(),
          size: await getDirectorySize(backupPath),
        });
      }
    }

    // Sort by timestamp (newest first)
    backupList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return backupList;
  } catch (error) {
    console.error("Error listing backups:", error);
    throw error;
  }
}

/**
 * Get directory size
 */
async function getDirectorySize(dirPath) {
  let size = 0;
  const files = await fs.readdir(dirPath);

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stats = await fs.stat(filePath);

    if (stats.isDirectory()) {
      size += await getDirectorySize(filePath);
    } else {
      size += stats.size;
    }
  }

  return size;
}

/**
 * Clean up old backups (keep only MAX_BACKUPS)
 */
async function cleanupOldBackups() {
  try {
    const backups = await listBackups();

    if (backups.length > MAX_BACKUPS) {
      const toDelete = backups.slice(MAX_BACKUPS);
      console.log(`Cleaning up ${toDelete.length} old backup(s)...`);

      for (const backup of toDelete) {
        const backupPath = path.join(BACKUP_DIR, backup.name);
        await fs.remove(backupPath);
        console.log(`Deleted old backup: ${backup.name}`);
      }
    }
  } catch (error) {
    console.error("Error cleaning up backups:", error);
  }
}

// CLI interface
const command = process.argv[2];
const arg = process.argv[3];

(async () => {
  try {
    if (!MONGODB_URI) {
      console.error("MONGODB_URI environment variable is required");
      process.exit(1);
    }

    switch (command) {
      case "create":
        await createBackup();
        break;
      case "restore":
        if (!arg) {
          console.error("Backup name is required for restore");
          console.log("Usage: node backup.js restore <backup-name>");
          process.exit(1);
        }
        await restoreBackup(arg);
        break;
      case "list":
        const backups = await listBackups();
        console.log("\nAvailable backups:");
        backups.forEach((backup, index) => {
          const sizeMB = (backup.size / 1024 / 1024).toFixed(2);
          console.log(
            `${index + 1}. ${backup.name} (${backup.timestamp}) - ${sizeMB} MB`
          );
        });
        break;
      default:
        console.log("Usage:");
        console.log("  node backup.js create          - Create a new backup");
        console.log("  node backup.js restore <name>  - Restore from backup");
        console.log("  node backup.js list            - List available backups");
        process.exit(1);
    }
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
})();

