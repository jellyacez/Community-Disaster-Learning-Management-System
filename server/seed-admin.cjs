const { auth } = require("./utils/auth.js");
require("dotenv").config();

async function createAdmin() {
  try {
    console.log("Locating database configuration...");
    
    // Fallback block to safely extract your database connection string or client instance
    const dbClient = auth.options?.database;
    if (!dbClient) {
      throw new Error("Could not extract raw database configuration from your Better-Auth initialization profile.");
    }

    console.log("Injecting user record directly...");
    
    // Better-Auth standard structural mapping
    const adminData = {
      id: "mdrrmo-admin-" + Date.now(),
      email: "admin.bacolor@mdrrmo.gov.ph",
      // Pre-hashed 'SuperSecurePassword2026!' string 
      password: "$2a$10$w879wWbXg4oY1GfeZpX/HeN8G6Pym5v.hVl1G2gN6wU63vG.YpCbe", 
      name: "MDRRMO Bacolor Admin",
      role: "mdrrmo_admin",
      barangay: "Balas",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Use Better-Auth's universal base adapter manager
    const result = await auth.adapter.create({
      model: "user",
      data: adminData
    });

    console.log("-----------------------------------------");
    console.log("SUCCESS: MDRRMO Administrative account registered seamlessly!");
    console.log(`Email: ${result.email}`);
    console.log(`Role: ${result.role}`);
    console.log(`Barangay: ${result.barangay}`);
    console.log("-----------------------------------------");
    process.exit(0);
  } catch (err) {
    console.error("Initialization Failed:", err.message || err);
    process.exit(1);
  }
}

createAdmin();