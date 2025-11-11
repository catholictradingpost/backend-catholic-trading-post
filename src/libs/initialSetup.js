// bin/init.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Role from "../models/role.model.js";
import User from "../models/user.model.js";
import Module from "../models/module.model.js";
import Permission from "../models/permission.model.js";
import Plan from "../models/plan.model.js";
import bcrypt from "bcryptjs";
import {
  USER_EMAIL,
  USER_NAME,
  USER_PASSWORD
} from "../config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const firstRunFlagPath = path.join(__dirname, "..", "..", "firstRun.flag");

async function createRoles() {
  const count = await Role.estimatedDocumentCount();
  if (count > 0) {
    // Check if Moderator and Member roles exist, add them if missing
    const existingRoles = await Role.find({});
    const roleNames = existingRoles.map(r => r.name);
    
    const rolesToAdd = [];
    if (!roleNames.includes("Moderator")) {
      rolesToAdd.push(new Role({ name: "Moderator" }));
    }
    if (!roleNames.includes("Member")) {
      rolesToAdd.push(new Role({ name: "Member" }));
    }
    
    if (rolesToAdd.length > 0) {
      await Promise.all(rolesToAdd.map(role => role.save()));
      console.log("Additional roles created:", rolesToAdd.map(r => r.name).join(", "));
    }
    return;
  }
  
  await Promise.all([
    new Role({ name: "Super User" }).save(),
    new Role({ name: "Admin"      }).save(),
    new Role({ name: "User"       }).save(),
    new Role({ name: "Default"    }).save(),
    new Role({ name: "Moderator"  }).save(),
    new Role({ name: "Member"     }).save(),
  ]);
  console.log("Roles created.");
}

async function createModules() {
  const count = await Module.estimatedDocumentCount();
  if (count > 0) return;
  const modules = [
    "plan","post","role","subscription","user","verification","permission"
  ].map(name => ({ name }));
  await Module.insertMany(modules);
  console.log("Modules created.");
}

async function createPermissions() {
  const roles   = await Role.find();
  const modules = await Module.find();
  if (!roles.length || !modules.length) throw new Error("Missing roles or modules");
  
  // Check existing permissions to avoid duplicates
  const existingPerms = await Permission.find();
  const existingPermKeys = new Set(
    existingPerms.map(p => `${p.role.toString()}-${p.module.toString()}`)
  );
  
  const perms = [];
  for (const role of roles) {
    const isSU = role.name === "Super User";
    const isA  = role.name === "Admin";
    const isMod = role.name === "Moderator";
    const isMember = role.name === "Member" || role.name === "User" || role.name === "Default";
    
    for (const m of modules) {
      const permKey = `${role._id.toString()}-${m._id.toString()}`;
      if (existingPermKeys.has(permKey)) continue; // Skip if permission already exists
      
      let actions = { create: false, read: false, update: false, delete: false };
      if (isSU) {
        actions = { create:true, read:true, update:true, delete:true };
      } else if (isA) {
        if (m.name==="role" || m.name==="permission")
          actions = { create:false, read: m.name==="role", update:false, delete:false };
        else if (m.name==="user")
          actions = { create:false, read:true, update:false, delete:false };
        else
          actions = { create:true, read:true, update:true, delete:true };
      } else if (isMod) {
        // Moderator can read most things and moderate (update/delete posts, comments, etc.)
        if (m.name==="post" || m.name==="comment" || m.name==="report")
          actions = { create:true, read:true, update:true, delete:true };
        else if (m.name==="user" || m.name==="plan" || m.name==="subscription")
          actions = { create:false, read:true, update:false, delete:false };
        else
          actions = { create:false, read:true, update:false, delete:false };
      } else if (isMember) {
        // Members can create posts, read their own content, but limited updates
        if (m.name==="post")
          actions = { create:true, read:true, update:true, delete:true };
        else
          actions = { create:false, read:true, update:false, delete:false };
      }
      perms.push({ role: role._id, module: m._id, actions });
    }
  }
  
  if (perms.length > 0) {
    await Permission.insertMany(perms);
    console.log("Permissions created:", perms.length);
  } else {
    console.log("No new permissions to create.");
  }
}

async function createPlans() {
  const count = await Plan.estimatedDocumentCount();
  if (count > 0) {
    // Check if required plans exist, add missing ones
    const existingPlans = await Plan.find({});
    const planNames = existingPlans.map(p => p.name);
    
    const plansToAdd = [];
    
    // 1 Month Plan - $70
    if (!planNames.includes("1 Month Plan")) {
      plansToAdd.push(new Plan({
        name: "1 Month Plan",
        description: "1 month subscription with unlimited posts",
        price: 70,
        durationInDays: 30,
        benefits: [
          "Unlimited posts during subscription term",
          "Full access to marketplace",
          "Priority support"
        ],
        unlimitedPosts: true,
        postCredits: 0,
        creditCostPerPost: 1
      }));
    }
    
    // 3 Month Plan - $180
    if (!planNames.includes("3 Month Plan")) {
      plansToAdd.push(new Plan({
        name: "3 Month Plan",
        description: "3 month subscription with unlimited posts",
        price: 180,
        durationInDays: 90,
        benefits: [
          "Unlimited posts during subscription term",
          "Full access to marketplace",
          "Priority support",
          "Best value option"
        ],
        unlimitedPosts: true,
        postCredits: 0,
        creditCostPerPost: 1
      }));
    }
    
    // 6 Month Plan - $300
    if (!planNames.includes("6 Month Plan")) {
      plansToAdd.push(new Plan({
        name: "6 Month Plan",
        description: "6 month subscription with unlimited posts",
        price: 300,
        durationInDays: 180,
        benefits: [
          "Unlimited posts during subscription term",
          "Full access to marketplace",
          "Priority support",
          "Maximum savings"
        ],
        unlimitedPosts: true,
        postCredits: 0,
        creditCostPerPost: 1
      }));
    }
    
    if (plansToAdd.length > 0) {
      await Promise.all(plansToAdd.map(plan => plan.save()));
      console.log("Plans created:", plansToAdd.map(p => p.name).join(", "));
    } else {
      console.log("All required plans already exist.");
    }
    return;
  }
  
  // Create initial plans
  await Promise.all([
    new Plan({
      name: "1 Month Plan",
      description: "1 month subscription with unlimited posts",
      price: 70,
      durationInDays: 30,
      benefits: [
        "Unlimited posts during subscription term",
        "Full access to marketplace",
        "Priority support"
      ],
      unlimitedPosts: true,
      postCredits: 0,
      creditCostPerPost: 1
    }).save(),
    new Plan({
      name: "3 Month Plan",
      description: "3 month subscription with unlimited posts",
      price: 180,
      durationInDays: 90,
      benefits: [
        "Unlimited posts during subscription term",
        "Full access to marketplace",
        "Priority support",
        "Best value option"
      ],
      unlimitedPosts: true,
      postCredits: 0,
      creditCostPerPost: 1
    }).save(),
    new Plan({
      name: "6 Month Plan",
      description: "6 month subscription with unlimited posts",
      price: 300,
      durationInDays: 180,
      benefits: [
        "Unlimited posts during subscription term",
        "Full access to marketplace",
        "Priority support",
        "Maximum savings"
      ],
      unlimitedPosts: true,
      postCredits: 0,
      creditCostPerPost: 1
    }).save()
  ]);
  console.log("Plans created.");
}

async function createUser() {
  const existing = await User.findOne({ email: USER_EMAIL });
  if (existing) return;
  const su = await Role.findOne({ name: "Super User" });
  if (!su) throw new Error("Super User role not found!");
  const pwHash = await bcrypt.hash(USER_PASSWORD, 10);
  const u = await User.create({
    email:      USER_EMAIL,
    first_name: USER_NAME,
    password:   pwHash,
    roles:      [su._id],
  });
  console.log("Admin user created:", u.email);
}

(async () => {
  if (fs.existsSync(firstRunFlagPath)) {
    console.log("🎉 Already initialized, skipping seed.");
    return;
  }

  try {
    await createRoles();
    await createModules();
    await createPermissions();
    await createPlans();
    await createUser();

    fs.writeFileSync(firstRunFlagPath, "done");
    console.log("🚀 Initialization complete!");
  } catch (err) {
    console.error("Initialization error:", err);
    process.exit(1);
  }
})();
