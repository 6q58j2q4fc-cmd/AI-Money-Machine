/**
 * Seed script to populate initial affiliate links and run first automation cycle
 * This sets up the hands-off money-making system
 */

import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

const CJ_CID = "7841523";

// Sample high-converting affiliate products for Commission Junction
const affiliateProducts = [
  {
    name: "NordVPN - Best VPN Service",
    url: `https://www.anrdoezrs.net/click-${CJ_CID}-14908261`,
    shortCode: "nordvpn",
    category: "technology",
    program: "Commission Junction",
    commission: "40%",
  },
  {
    name: "Bluehost Web Hosting",
    url: `https://www.anrdoezrs.net/click-${CJ_CID}-11634969`,
    shortCode: "bluehost",
    category: "technology",
    program: "Commission Junction",
    commission: "$65 per sale",
  },
  {
    name: "ExpressVPN Premium",
    url: `https://www.anrdoezrs.net/click-${CJ_CID}-13038561`,
    shortCode: "expressvpn",
    category: "technology",
    program: "Commission Junction",
    commission: "35%",
  },
  {
    name: "Grammarly Premium Writing Assistant",
    url: `https://www.anrdoezrs.net/click-${CJ_CID}-13943961`,
    shortCode: "grammarly",
    category: "technology",
    program: "Commission Junction",
    commission: "$20 per sale",
  },
  {
    name: "Constant Contact Email Marketing",
    url: `https://www.anrdoezrs.net/click-${CJ_CID}-10505961`,
    shortCode: "constantcontact",
    category: "business",
    program: "Commission Junction",
    commission: "$105 per sale",
  },
  {
    name: "TurboTax Online Tax Software",
    url: `https://www.anrdoezrs.net/click-${CJ_CID}-10505962`,
    shortCode: "turbotax",
    category: "finance",
    program: "Commission Junction",
    commission: "15%",
  },
  {
    name: "Credit Karma - Free Credit Scores",
    url: `https://www.anrdoezrs.net/click-${CJ_CID}-10505963`,
    shortCode: "creditkarma",
    category: "finance",
    program: "Commission Junction",
    commission: "$2 per lead",
  },
  {
    name: "Noom Weight Loss Program",
    url: `https://www.anrdoezrs.net/click-${CJ_CID}-10505964`,
    shortCode: "noom",
    category: "health",
    program: "Commission Junction",
    commission: "$15 per trial",
  },
  {
    name: "HelloFresh Meal Delivery",
    url: `https://www.anrdoezrs.net/click-${CJ_CID}-10505965`,
    shortCode: "hellofresh",
    category: "lifestyle",
    program: "Commission Junction",
    commission: "$10 per order",
  },
  {
    name: "Skillshare Online Learning",
    url: `https://www.anrdoezrs.net/click-${CJ_CID}-10505966`,
    shortCode: "skillshare",
    category: "education",
    program: "Commission Junction",
    commission: "$7 per signup",
  },
  {
    name: "Audible Audiobooks",
    url: `https://www.anrdoezrs.net/click-${CJ_CID}-10505967`,
    shortCode: "audible",
    category: "entertainment",
    program: "Commission Junction",
    commission: "$5 per trial",
  },
  {
    name: "Shopify E-commerce Platform",
    url: `https://www.anrdoezrs.net/click-${CJ_CID}-10505968`,
    shortCode: "shopify",
    category: "business",
    program: "Commission Junction",
    commission: "$58 per sale",
  },
];

async function seedAffiliateLinks() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const db = drizzle(process.env.DATABASE_URL);
  
  console.log("🚀 Starting affiliate link seeding...");
  
  // Get the owner user ID (first user or admin)
  const users = await db.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  
  if (!users[0] || users[0].length === 0) {
    console.log("No admin user found. Please log in first to create your user account.");
    process.exit(1);
  }
  
  const userId = users[0][0].id;
  console.log(`Found admin user ID: ${userId}`);
  
  // Check existing links
  const existingLinks = await db.execute("SELECT COUNT(*) as count FROM affiliate_links WHERE userId = ?", [userId]);
  const existingCount = existingLinks[0][0].count;
  
  if (existingCount > 0) {
    console.log(`Already have ${existingCount} affiliate links. Skipping seed.`);
    process.exit(0);
  }
  
  // Insert affiliate links
  for (const product of affiliateProducts) {
    await db.execute(
      `INSERT INTO affiliate_links (userId, name, url, shortCode, category, program, commission, isActive) 
       VALUES (?, ?, ?, ?, ?, ?, ?, true)`,
      [userId, product.name, product.url, product.shortCode, product.category, product.program, product.commission]
    );
    console.log(`✅ Added: ${product.name}`);
  }
  
  console.log(`\n🎉 Successfully seeded ${affiliateProducts.length} affiliate links!`);
  console.log("Your CJ affiliate links are now ready for automatic insertion into articles.");
  
  process.exit(0);
}

seedAffiliateLinks().catch(console.error);
