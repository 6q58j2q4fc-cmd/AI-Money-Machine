/**
 * Seed CJ Advertisers into the database
 * Run with: npx tsx scripts/seed-cj-advertisers.ts
 */

import { drizzle } from "drizzle-orm/mysql2";
import { affiliateLinks } from "../drizzle/schema";
import { allCJAdvertisers, CJ_PUBLISHER_ID } from "../shared/cjAdvertisers";

async function seedCJAdvertisers() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const db = drizzle(process.env.DATABASE_URL);
  
  console.log(`Seeding ${allCJAdvertisers.length} CJ advertisers...`);
  
  let added = 0;
  const domains = ["anrdoezrs.net", "jdoqocy.com", "tkqlhce.com", "dpbolvw.net", "kqzyfj.com"];
  
  for (const advertiser of allCJAdvertisers) {
    for (const link of advertiser.links) {
      // Generate a proper CJ link URL
      const domain = domains[added % domains.length];
      const linkId = link.id || Math.floor(Math.random() * 100000000).toString();
      const url = `https://www.${domain}/click-${CJ_PUBLISHER_ID}-${advertiser.id}-${linkId}`;
      
      try {
        await db.insert(affiliateLinks).values({
          userId: 1,
          name: `${advertiser.name} - ${link.name}`,
          url: url,
          shortCode: `cj-${advertiser.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          category: advertiser.category,
          program: advertiser.name,
          commission: advertiser.commission,
          isActive: true,
          clicks: 0,
          conversions: 0,
          revenue: "0",
        });
        added++;
        console.log(`  Added: ${advertiser.name} - ${link.name}`);
      } catch (error: any) {
        // Skip duplicates
        if (!error.message?.includes('Duplicate')) {
          console.error(`  Error adding ${advertiser.name}:`, error.message);
        }
      }
    }
  }
  
  console.log(`\nSeeded ${added} affiliate links from ${allCJAdvertisers.length} advertisers`);
  process.exit(0);
}

seedCJAdvertisers().catch(console.error);
