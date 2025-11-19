// Script to seed sample groups into the database
import { config } from "dotenv";
config();

import mongoose from "mongoose";
import Group from "../models/group.model.js";
import User from "../models/user.model.js";
import Role from "../models/role.model.js";
import { MONGODB_URI } from "../config.js";

const sampleGroups = [
  {
    name: "Bible Study Group",
    description: "Weekly Bible study sessions for community members. We explore Scripture together, share insights, and grow in faith through discussion and prayer.",
    category: "Spiritual Growth",
    tags: ["Bible", "Study", "Scripture", "Faith"],
    location: "St. Mary's Church",
    address: "123 Main Street",
    city: "City",
    state: "State",
    zipCode: "12345",
    members: 45,
    meetingSchedule: {
      frequency: "weekly",
      dayOfWeek: "Wednesday",
      time: "7:00 PM",
      notes: "Meets in the parish hall",
    },
    isPublic: true,
    requiresApproval: false,
    status: "active",
  },
  {
    name: "Youth Ministry",
    description: "Engaging activities and discussions for young Catholics. Join us for faith formation, community service, and fun events designed for teens and young adults.",
    category: "Youth",
    tags: ["Youth", "Teens", "Young Adults", "Community"],
    location: "Community Center",
    address: "456 Oak Avenue",
    city: "City",
    state: "State",
    zipCode: "12345",
    members: 28,
    meetingSchedule: {
      frequency: "weekly",
      dayOfWeek: "Sunday",
      time: "2:00 PM",
      notes: "After Mass, in the youth room",
    },
    isPublic: true,
    requiresApproval: false,
    status: "active",
  },
  {
    name: "Prayer Circle",
    description: "Daily prayer meetings and spiritual support. A dedicated group that meets regularly to pray for the community, the Church, and personal intentions.",
    category: "Prayer",
    tags: ["Prayer", "Intercession", "Spiritual Support"],
    location: "Various Locations",
    address: "Rotates between members' homes",
    city: "City",
    state: "State",
    members: 62,
    meetingSchedule: {
      frequency: "daily",
      dayOfWeek: "Monday",
      time: "6:00 AM",
      notes: "Morning prayer, location rotates weekly",
    },
    isPublic: true,
    requiresApproval: false,
    status: "active",
  },
  {
    name: "Rosary Group",
    description: "Weekly rosary recitation and meditation. Come together to pray the Rosary, meditate on the mysteries, and grow in devotion to Our Lady.",
    category: "Devotion",
    tags: ["Rosary", "Marian", "Devotion", "Prayer"],
    location: "Chapel",
    address: "789 Pine Street",
    city: "City",
    state: "State",
    zipCode: "12345",
    members: 35,
    meetingSchedule: {
      frequency: "weekly",
      dayOfWeek: "Saturday",
      time: "9:00 AM",
      notes: "In the parish chapel, followed by coffee",
    },
    isPublic: true,
    requiresApproval: false,
    status: "active",
  },
  {
    name: "Charity & Service Group",
    description: "Serving our community through acts of charity and service. We organize food drives, visit the sick, and support those in need.",
    category: "Service",
    tags: ["Charity", "Service", "Community", "Outreach"],
    location: "Parish Office",
    address: "123 Main Street",
    city: "City",
    state: "State",
    zipCode: "12345",
    members: 52,
    meetingSchedule: {
      frequency: "bi-weekly",
      dayOfWeek: "Saturday",
      time: "10:00 AM",
      notes: "Planning meetings, service activities vary",
    },
    isPublic: true,
    requiresApproval: false,
    status: "active",
  },
  {
    name: "Men's Fellowship",
    description: "A group for Catholic men to grow in faith, support each other, and strengthen their role as spiritual leaders in their families and community.",
    category: "Spiritual Growth",
    tags: ["Men", "Fellowship", "Leadership", "Faith"],
    location: "Parish Hall",
    address: "123 Main Street",
    city: "City",
    state: "State",
    zipCode: "12345",
    members: 38,
    meetingSchedule: {
      frequency: "monthly",
      dayOfWeek: "Saturday",
      time: "8:00 AM",
      notes: "First Saturday of each month - Breakfast and discussion",
    },
    isPublic: true,
    requiresApproval: false,
    status: "active",
  },
  {
    name: "Women's Circle",
    description: "A supportive community for Catholic women to share faith, friendship, and grow together in their spiritual journey.",
    category: "Spiritual Growth",
    tags: ["Women", "Fellowship", "Community", "Faith"],
    location: "Parish Hall",
    address: "123 Main Street",
    city: "City",
    state: "State",
    zipCode: "12345",
    members: 41,
    meetingSchedule: {
      frequency: "bi-weekly",
      dayOfWeek: "Thursday",
      time: "7:00 PM",
      notes: "Evening meetings with refreshments",
    },
    isPublic: true,
    requiresApproval: false,
    status: "active",
  },
  {
    name: "Choir & Music Ministry",
    description: "Enhancing our worship through music. Join us to sing praises to God and help lead the congregation in song during Mass and special services.",
    category: "Ministry",
    tags: ["Music", "Choir", "Worship", "Ministry"],
    location: "Church",
    address: "123 Main Street",
    city: "City",
    state: "State",
    zipCode: "12345",
    members: 24,
    meetingSchedule: {
      frequency: "weekly",
      dayOfWeek: "Thursday",
      time: "7:30 PM",
      notes: "Rehearsal in the church",
    },
    isPublic: true,
    requiresApproval: true,
    status: "active",
  },
  {
    name: "RCIA Support Group",
    description: "Supporting those on their journey to become Catholic. A welcoming group for RCIA candidates, catechumens, and their sponsors.",
    category: "Formation",
    tags: ["RCIA", "Conversion", "Formation", "Catechism"],
    location: "Parish Office",
    address: "123 Main Street",
    city: "City",
    state: "State",
    zipCode: "12345",
    members: 18,
    meetingSchedule: {
      frequency: "weekly",
      dayOfWeek: "Sunday",
      time: "11:30 AM",
      notes: "After Mass, during RCIA sessions",
    },
    isPublic: true,
    requiresApproval: false,
    status: "active",
  },
  {
    name: "Eucharistic Adoration Group",
    description: "Dedicated time in prayer before the Blessed Sacrament. Join us for scheduled adoration hours and special adoration events.",
    category: "Devotion",
    tags: ["Adoration", "Eucharist", "Prayer", "Devotion"],
    location: "Chapel",
    address: "789 Pine Street",
    city: "City",
    state: "State",
    zipCode: "12345",
    members: 67,
    meetingSchedule: {
      frequency: "weekly",
      dayOfWeek: "Friday",
      time: "6:00 PM",
      notes: "First Friday adoration, other times available",
    },
    isPublic: true,
    requiresApproval: false,
    status: "active",
  },
];

const seedGroups = async () => {
  try {
    if (!MONGODB_URI) {
      console.error("❌ MONGODB_URI not found in environment variables");
      process.exit(1);
    }

    // Connect to MongoDB
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Get the first admin user to set as createdBy and leader (optional)
    let createdBy = null;
    let leader = null;
    try {
      const adminUser = await User.findOne().populate("roles");
      
      if (adminUser && adminUser.roles && adminUser.roles.length > 0) {
        const roleNames = adminUser.roles.map((role) => {
          // Handle both populated and unpopulated roles
          if (typeof role === 'object' && role.name) {
            return role.name;
          }
          return role.toString();
        });
        
        const isAdmin = roleNames.some(
          (roleName) =>
            roleName === "Admin" ||
            roleName === "Super Usuario" ||
            (typeof roleName === 'string' && roleName.toLowerCase().includes("admin"))
        );
        
        if (isAdmin) {
          createdBy = adminUser._id;
          leader = adminUser._id;
          console.log(`📋 Using admin user: ${adminUser.email} as creator and leader`);
        } else {
          // Use first user as leader if no admin
          const firstUser = await User.findOne();
          if (firstUser) {
            createdBy = firstUser._id;
            leader = firstUser._id;
            console.log(`📋 Using first user: ${firstUser.email} as creator and leader`);
          }
        }
      } else {
        // Use first user if no roles found
        const firstUser = await User.findOne();
        if (firstUser) {
          createdBy = firstUser._id;
          leader = firstUser._id;
          console.log(`📋 Using first user: ${firstUser.email} as creator and leader`);
        }
      }
    } catch (error) {
      // If there's an error finding users, continue without creator/leader
      console.log(`ℹ️  Could not find users, continuing without creator/leader`);
    }

    // Check if groups already exist
    const existingCount = await Group.countDocuments();
    if (existingCount > 0) {
      console.log(`\n⚠️  Found ${existingCount} existing groups in database.`);
      console.log("   This script will add new groups (skipping duplicates by name).");
    }

    let added = 0;
    let skipped = 0;

    // Insert groups
    for (const groupData of sampleGroups) {
      try {
        // Check if group already exists by name
        const existing = await Group.findOne({ name: groupData.name });
        if (existing) {
          console.log(`⏭️  Skipping "${groupData.name}" (already exists)`);
          skipped++;
          continue;
        }

        const group = new Group({
          ...groupData,
          createdBy,
          leader: leader || createdBy,
        });

        await group.save();
        console.log(`✅ Added: ${groupData.name}`);
        added++;
      } catch (error) {
        console.error(`❌ Error adding "${groupData.name}":`, error.message);
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log(`✅ Successfully seeded groups!`);
    console.log(`   Added: ${added} groups`);
    console.log(`   Skipped: ${skipped} groups (already exist)`);
    console.log(`   Total in database: ${await Group.countDocuments()} groups`);
    console.log("=".repeat(50));

    await mongoose.disconnect();
    console.log("\n✅ Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
};

// Run the seed function
seedGroups();

