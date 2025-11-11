# Migration Rollback Plan

This document outlines the procedure for rolling back database migrations and schema changes.

## Overview

The rollback plan ensures that database changes can be safely reverted if issues are discovered after deployment.

## Pre-Migration Checklist

Before applying any migration:

1. ✅ **Create Backup**
   ```bash
   node scripts/backup.js create
   ```

2. ✅ **Document Changes**
   - List all schema changes
   - Document new fields, indexes, constraints
   - Note any data transformations

3. ✅ **Test in Development**
   - Run migration in development environment
   - Verify data integrity
   - Test application functionality

4. ✅ **Prepare Rollback Script**
   - Create reverse migration script
   - Test rollback in development

## Rollback Procedures

### 1. Schema Changes Rollback

#### Adding Fields
**Migration:**
```javascript
// Add new field
await User.updateMany({}, { $set: { newField: defaultValue } });
```

**Rollback:**
```javascript
// Remove field
await User.updateMany({}, { $unset: { newField: "" } });
```

#### Removing Fields
**Migration:**
```javascript
// Remove field
await User.updateMany({}, { $unset: { oldField: "" } });
```

**Rollback:**
```javascript
// Restore field (if you have backup data)
// Or recreate with default value
await User.updateMany({}, { $set: { oldField: defaultValue } });
```

#### Changing Field Types
**Migration:**
```javascript
// Convert field type
await User.updateMany(
  { field: { $exists: true } },
  [{ $set: { field: { $toString: "$field" } } }]
);
```

**Rollback:**
```javascript
// Convert back to original type
await User.updateMany(
  { field: { $exists: true } },
  [{ $set: { field: { $toInt: "$field" } } }]
);
```

### 2. Index Changes Rollback

#### Adding Index
**Migration:**
```javascript
await User.collection.createIndex({ newField: 1 });
```

**Rollback:**
```javascript
await User.collection.dropIndex("newField_1");
```

#### Removing Index
**Migration:**
```javascript
await User.collection.dropIndex("oldField_1");
```

**Rollback:**
```javascript
await User.collection.createIndex({ oldField: 1 });
```

### 3. Collection Changes Rollback

#### Creating Collection
**Migration:**
```javascript
await mongoose.connection.db.createCollection("NewCollection");
```

**Rollback:**
```javascript
await mongoose.connection.db.dropCollection("NewCollection");
```

#### Dropping Collection
**Migration:**
```javascript
await mongoose.connection.db.dropCollection("OldCollection");
```

**Rollback:**
- Restore from backup if collection was dropped
- Or recreate collection schema

### 4. Data Migration Rollback

#### Data Transformation
**Migration:**
```javascript
await User.updateMany(
  { status: "old_status" },
  { $set: { status: "new_status" } }
);
```

**Rollback:**
```javascript
await User.updateMany(
  { status: "new_status" },
  { $set: { status: "old_status" } }
);
```

## Full Database Rollback

If a complete rollback is needed:

1. **Stop Application**
   ```bash
   # Stop the Node.js application
   pm2 stop catholic-trading-post
   ```

2. **List Available Backups**
   ```bash
   node scripts/backup.js list
   ```

3. **Restore from Backup**
   ```bash
   node scripts/backup.js restore <backup-name>
   ```

4. **Verify Data**
   - Check database connection
   - Verify critical collections
   - Test application functionality

5. **Restart Application**
   ```bash
   pm2 start catholic-trading-post
   ```

## Automated Rollback Script

Create rollback scripts for each migration:

```javascript
// scripts/rollback-001-add-user-status.js
import User from "../src/models/user.model.js";
import mongoose from "mongoose";

export async function rollback() {
  try {
    // Remove status field
    await User.updateMany({}, { $unset: { status: "" } });
    
    // Drop index
    await User.collection.dropIndex("status_1");
    
    console.log("Rollback completed successfully");
  } catch (error) {
    console.error("Rollback failed:", error);
    throw error;
  }
}
```

## Best Practices

1. **Always Create Backup Before Migration**
   - Use automated backup script
   - Store backups in secure location
   - Keep multiple backup versions

2. **Version Control Migrations**
   - Store migration scripts in Git
   - Tag releases with migration versions
   - Document migration dependencies

3. **Test Rollback Procedures**
   - Test rollback in development
   - Verify data integrity after rollback
   - Document any issues encountered

4. **Monitor After Migration**
   - Check application logs
   - Monitor database performance
   - Watch for error rates

5. **Gradual Rollout**
   - Deploy to staging first
   - Monitor for 24-48 hours
   - Then deploy to production

## Emergency Rollback

If critical issues are discovered:

1. **Immediate Actions:**
   - Stop accepting new requests (if possible)
   - Create current state backup
   - Notify team

2. **Rollback Decision:**
   - Assess impact of rollback vs. fix
   - Determine rollback point
   - Execute rollback procedure

3. **Post-Rollback:**
   - Verify system stability
   - Investigate root cause
   - Plan fix and re-deployment

## Backup Retention Policy

- **Daily Backups:** Keep for 7 days
- **Weekly Backups:** Keep for 4 weeks
- **Monthly Backups:** Keep for 12 months
- **Pre-Migration Backups:** Keep indefinitely

## Contact Information

For migration issues:
- **Database Admin:** [Contact Info]
- **DevOps Team:** [Contact Info]
- **On-Call Engineer:** [Contact Info]

