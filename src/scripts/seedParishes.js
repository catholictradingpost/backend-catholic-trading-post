// Script to seed famous parishes into the database
import { config } from "dotenv";
config();

import mongoose from "mongoose";
import Parish from "../models/parish.model.js";
import User from "../models/user.model.js";
import Role from "../models/role.model.js";
import { MONGODB_URI } from "../config.js";

const famousParishes = [
  {
    name: "St. Peter's Basilica",
    description: "The most renowned work of Renaissance architecture and the largest church in the world, located in Vatican City.",
    address: "Piazza San Pietro",
    city: "Vatican City",
    state: "Vatican",
    zipCode: "00120",
    coordinates: {
      latitude: 41.9022,
      longitude: 12.4539,
    },
    phone: "+39 06 6982 3731",
    email: "info@vatican.va",
    website: "https://www.vatican.va",
    pastor: "Cardinal Mauro Gambetti",
    massTimes: [
      "Sunday: 7:00 AM, 8:30 AM, 10:00 AM, 11:00 AM, 12:00 PM, 5:00 PM",
      "Daily: 7:00 AM, 8:00 AM, 9:00 AM, 10:00 AM, 11:00 AM, 12:00 PM, 5:00 PM",
    ],
    members: 0, // Not applicable for basilica
    status: "active",
  },
  {
    name: "Notre-Dame de Paris",
    description: "A medieval Catholic cathedral on the Île de la Cité in Paris, France, one of the finest examples of French Gothic architecture.",
    address: "6 Parvis Notre-Dame - Pl. Jean-Paul II",
    city: "Paris",
    state: "Île-de-France",
    zipCode: "75004",
    coordinates: {
      latitude: 48.8530,
      longitude: 2.3499,
    },
    phone: "+33 1 42 34 56 10",
    email: "contact@notredamedeparis.fr",
    website: "https://www.notredamedeparis.fr",
    pastor: "Monsignor Patrick Chauvet",
    massTimes: [
      "Sunday: 8:30 AM, 9:30 AM, 10:00 AM, 11:30 AM, 12:45 PM, 6:30 PM",
      "Daily: 8:00 AM, 9:00 AM, 12:00 PM, 5:45 PM, 6:15 PM",
    ],
    members: 0,
    status: "active",
  },
  {
    name: "St. Patrick's Cathedral",
    description: "A decorated Neo-Gothic-style Roman Catholic cathedral church and a prominent landmark of New York City.",
    address: "5th Avenue",
    city: "New York",
    state: "New York",
    zipCode: "10022",
    coordinates: {
      latitude: 40.7589,
      longitude: -73.9851,
    },
    phone: "(212) 753-2261",
    email: "info@stpatrickscathedral.org",
    website: "https://www.saintpatrickscathedral.org",
    pastor: "Monsignor Robert T. Ritchie",
    massTimes: [
      "Sunday: 7:00 AM, 8:00 AM, 9:00 AM, 10:15 AM, 11:30 AM, 12:45 PM, 1:00 PM, 4:00 PM, 5:30 PM",
      "Daily: 7:00 AM, 7:30 AM, 8:00 AM, 12:00 PM, 12:30 PM, 1:00 PM, 5:30 PM",
    ],
    members: 0,
    status: "active",
  },
  {
    name: "Westminster Cathedral",
    description: "The mother church of the Catholic Church in England and Wales, located in London.",
    address: "42 Francis Street",
    city: "London",
    state: "England",
    zipCode: "SW1P 1QW",
    coordinates: {
      latitude: 51.4958,
      longitude: -0.1394,
    },
    phone: "+44 20 7798 9055",
    email: "info@westminstercathedral.org.uk",
    website: "https://www.westminstercathedral.org.uk",
    pastor: "Cardinal Vincent Nichols",
    massTimes: [
      "Sunday: 7:00 AM, 8:00 AM, 9:00 AM, 10:30 AM, 12:00 PM, 5:30 PM, 7:00 PM",
      "Daily: 7:00 AM, 8:00 AM, 9:00 AM, 12:30 PM, 5:30 PM",
    ],
    members: 0,
    status: "active",
  },
  {
    name: "Basilica of Our Lady of Guadalupe",
    description: "A Roman Catholic church, basilica, and National shrine of Mexico which houses the cloak containing the image of Our Lady of Guadalupe.",
    address: "Plaza de las Américas 1",
    city: "Mexico City",
    state: "Mexico City",
    zipCode: "07050",
    coordinates: {
      latitude: 19.4846,
      longitude: -99.1173,
    },
    phone: "+52 55 5118 0500",
    email: "info@virgendeguadalupe.org.mx",
    website: "https://www.virgendeguadalupe.org.mx",
    pastor: "Cardinal Carlos Aguiar Retes",
    massTimes: [
      "Sunday: 6:00 AM, 7:00 AM, 8:00 AM, 9:00 AM, 10:00 AM, 11:00 AM, 12:00 PM, 1:00 PM, 2:00 PM, 3:00 PM, 4:00 PM, 5:00 PM, 6:00 PM, 7:00 PM",
      "Daily: 6:00 AM, 7:00 AM, 8:00 AM, 9:00 AM, 10:00 AM, 11:00 AM, 12:00 PM, 1:00 PM, 2:00 PM, 3:00 PM, 4:00 PM, 5:00 PM, 6:00 PM, 7:00 PM",
    ],
    members: 0,
    status: "active",
  },
  {
    name: "Sagrada Família",
    description: "An unfinished church in Barcelona, Spain, designed by architect Antoni Gaudí. It is the largest unfinished Catholic church in the world.",
    address: "Carrer de Mallorca, 401",
    city: "Barcelona",
    state: "Catalonia",
    zipCode: "08013",
    coordinates: {
      latitude: 41.4036,
      longitude: 2.1744,
    },
    phone: "+34 932 080 414",
    email: "info@sagradafamilia.org",
    website: "https://www.sagradafamilia.org",
    pastor: "Monsignor Lluís Martínez Sistach",
    massTimes: [
      "Sunday: 9:00 AM, 11:00 AM, 1:00 PM, 6:00 PM, 8:00 PM",
      "Daily: 9:00 AM, 11:00 AM, 1:00 PM, 6:00 PM, 8:00 PM",
    ],
    members: 0,
    status: "active",
  },
  {
    name: "St. Mary's Cathedral",
    description: "The cathedral church of the Roman Catholic Archdiocese of San Francisco, California.",
    address: "1111 Gough Street",
    city: "San Francisco",
    state: "California",
    zipCode: "94109",
    coordinates: {
      latitude: 37.7849,
      longitude: -122.4258,
    },
    phone: "(415) 567-2020",
    email: "info@stmarycathedral.org",
    website: "https://www.stmarycathedral.org",
    pastor: "Archbishop Salvatore Cordileone",
    massTimes: [
      "Sunday: 7:30 AM, 9:00 AM, 10:30 AM, 12:00 PM, 5:30 PM",
      "Daily: 7:00 AM, 8:00 AM, 12:10 PM, 5:30 PM",
    ],
    members: 0,
    status: "active",
  },
  {
    name: "St. Joseph's Oratory",
    description: "A Roman Catholic minor basilica and national shrine located on Mount Royal in Montreal, Quebec, Canada.",
    address: "3800 Queen Mary Road",
    city: "Montreal",
    state: "Quebec",
    zipCode: "H3V 1H6",
    coordinates: {
      latitude: 45.4928,
      longitude: -73.6174,
    },
    phone: "(514) 733-8211",
    email: "info@osj.qc.ca",
    website: "https://www.saint-joseph.org",
    pastor: "Father Claude Grou",
    massTimes: [
      "Sunday: 7:30 AM, 9:00 AM, 10:30 AM, 12:00 PM, 2:30 PM, 4:00 PM, 5:30 PM",
      "Daily: 7:00 AM, 8:00 AM, 9:30 AM, 11:00 AM, 12:30 PM, 3:00 PM, 4:30 PM, 7:30 PM",
    ],
    members: 0,
    status: "active",
  },
  {
    name: "Basilica of the National Shrine of the Immaculate Conception",
    description: "A large Catholic minor basilica and national shrine located in Washington, D.C., United States.",
    address: "400 Michigan Avenue Northeast",
    city: "Washington",
    state: "District of Columbia",
    zipCode: "20017",
    coordinates: {
      latitude: 38.9332,
      longitude: -77.0000,
    },
    phone: "(202) 526-8300",
    email: "info@nationalshrine.com",
    website: "https://www.nationalshrine.org",
    pastor: "Monsignor Walter R. Rossi",
    massTimes: [
      "Sunday: 7:00 AM, 8:00 AM, 9:00 AM, 10:00 AM, 11:00 AM, 12:00 PM, 1:00 PM, 2:00 PM, 4:30 PM",
      "Daily: 7:00 AM, 8:00 AM, 9:00 AM, 10:00 AM, 11:00 AM, 12:10 PM, 1:00 PM, 2:00 PM, 4:30 PM, 5:15 PM",
    ],
    members: 0,
    status: "active",
  },
  {
    name: "St. Mary's Cathedral",
    description: "The cathedral church of the Roman Catholic Archdiocese of Sydney, Australia.",
    address: "St Mary's Road",
    city: "Sydney",
    state: "New South Wales",
    zipCode: "2000",
    coordinates: {
      latitude: -33.8705,
      longitude: 151.2108,
    },
    phone: "+61 2 9220 0400",
    email: "info@stmaryscathedral.org.au",
    website: "https://www.stmaryscathedral.org.au",
    pastor: "Archbishop Anthony Fisher",
    massTimes: [
      "Sunday: 6:30 AM, 8:00 AM, 9:00 AM, 10:30 AM, 12:00 PM, 5:00 PM, 6:30 PM",
      "Daily: 6:30 AM, 7:30 AM, 8:00 AM, 12:15 PM, 1:10 PM, 5:10 PM",
    ],
    members: 0,
    status: "active",
  },
  {
    name: "Our Lady of Grace",
    description: "A vibrant parish community focused on spiritual growth and outreach",
    address: "789 Pine Street",
    city: "City",
    state: "State",
    zipCode: "12345",
    phone: "(555) 345-6789",
    email: "office@olgrace.org",
    pastor: "Father David Johnson",
    massTimes: [
      "Sunday: 7:30 AM, 10:30 AM, 5:00 PM",
      "Daily: 6:30 AM",
    ],
    members: 1200,
    status: "active",
  },
  {
    name: "St. Joseph Parish",
    description: "Serving our community with love and dedication since 1950",
    address: "456 Oak Avenue",
    city: "City",
    state: "State",
    zipCode: "12345",
    phone: "(555) 234-5678",
    email: "contact@stjoseph.org",
    pastor: "Father Anthony Smith",
    massTimes: [
      "Sunday: 9:00 AM, 11:00 AM",
      "Daily: 8:00 AM",
    ],
    members: 850,
    status: "active",
  },
  {
    name: "Sacred Heart Parish",
    description: "Building faith and community through prayer and service",
    address: "321 Elm Boulevard",
    city: "City",
    state: "State",
    zipCode: "12345",
    phone: "(555) 456-7890",
    email: "info@sacredheart.org",
    pastor: "Father Robert Williams",
    massTimes: [
      "Sunday: 8:30 AM, 11:00 AM",
      "Daily: 7:30 AM",
    ],
    members: 980,
    status: "active",
  },
];

const seedParishes = async () => {
  try {
    if (!MONGODB_URI) {
      console.error("❌ MONGODB_URI not found in environment variables");
      process.exit(1);
    }

    // Connect to MongoDB
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Get the first admin user to set as createdBy (optional)
    let createdBy = null;
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
          console.log(`📋 Using admin user: ${adminUser.email} as creator`);
        } else {
          // If no admin found, just use the first user or null
          console.log(`ℹ️  No admin user found, parishes will be created without creator`);
        }
      }
    } catch (error) {
      // If there's an error finding admin, continue without creator
      console.log(`ℹ️  Could not find admin user, continuing without creator`);
    }

    // Check if parishes already exist
    const existingCount = await Parish.countDocuments();
    if (existingCount > 0) {
      console.log(`\n⚠️  Found ${existingCount} existing parishes in database.`);
      console.log("   This script will add new parishes (skipping duplicates by name).");
    }

    let added = 0;
    let skipped = 0;

    // Insert parishes
    for (const parishData of famousParishes) {
      try {
        // Check if parish already exists by name
        const existing = await Parish.findOne({ name: parishData.name });
        if (existing) {
          console.log(`⏭️  Skipping "${parishData.name}" (already exists)`);
          skipped++;
          continue;
        }

        const parish = new Parish({
          ...parishData,
          createdBy,
        });

        await parish.save();
        console.log(`✅ Added: ${parishData.name}`);
        added++;
      } catch (error) {
        console.error(`❌ Error adding "${parishData.name}":`, error.message);
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log(`✅ Successfully seeded parishes!`);
    console.log(`   Added: ${added} parishes`);
    console.log(`   Skipped: ${skipped} parishes (already exist)`);
    console.log(`   Total in database: ${await Parish.countDocuments()} parishes`);
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
seedParishes();

