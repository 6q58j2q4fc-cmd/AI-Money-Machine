/**
 * Fix Articles Without Affiliate Links
 * 
 * This script finds articles without CJ affiliate links and adds them
 */

import mysql from 'mysql2/promise';

// CJ Affiliate links to use (from our database)
const CJ_AFFILIATE_LINKS = [
  { name: "AntiBrowserSpy", url: "https://www.anrdoezrs.net/click-101630462-15402321-1684488656000", category: "technology" },
  { name: "YouTube Song Downloader", url: "https://www.anrdoezrs.net/click-101630462-15774694-1711009491000", category: "technology" },
  { name: "HackCheck Security", url: "https://www.anrdoezrs.net/click-101630462-15777927-1711378591000", category: "technology" },
  { name: "PCFresh Optimizer", url: "https://www.anrdoezrs.net/click-101630462-15777867-1711374423000", category: "technology" },
  { name: "Abelssoft Tools", url: "https://www.anrdoezrs.net/click-101630462-15402688-1684488656000", category: "technology" },
  { name: "Easter Sale Special", url: "https://www.anrdoezrs.net/click-101630462-17060421-1743500772000", category: "technology" },
  { name: "Black Week Deals", url: "https://www.anrdoezrs.net/click-101630462-16970592-1732186223000", category: "technology" },
];

// Generate product card HTML with affiliate link
function generateProductCard(product, position) {
  return `
<div class="product-card" style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 20px 0; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);">
  <div style="display: flex; justify-content: space-between; align-items: start;">
    <div>
      <span style="background: #10b981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">Top Pick #${position}</span>
      <h3 style="margin: 12px 0 8px 0; font-size: 18px; font-weight: 700; color: #1f2937;">${product.name}</h3>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 16px 0;">Highly recommended by our editorial team for quality and value.</p>
    </div>
  </div>
  <a href="${product.url}" target="_blank" rel="noopener sponsored" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
    Check Price →
  </a>
</div>`;
}

// Generate affiliate section HTML
function generateAffiliateSection(products) {
  const cards = products.map((p, i) => generateProductCard(p, i + 1)).join('\n');
  return `
<div class="affiliate-recommendations" style="margin: 32px 0;">
  <h2 style="font-size: 24px; font-weight: 700; color: #1f2937; margin-bottom: 20px; border-bottom: 2px solid #10b981; padding-bottom: 12px;">
    🏆 Our Top Recommendations
  </h2>
  <p style="color: #6b7280; margin-bottom: 24px;">Based on extensive research and user reviews, here are our top picks:</p>
  ${cards}
  <p style="font-size: 12px; color: #9ca3af; margin-top: 16px; font-style: italic;">
    Disclosure: We may earn a commission when you click on links and make a purchase. This helps support our editorial team.
  </p>
</div>`;
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    // Find articles without CJ affiliate links
    const [articles] = await conn.execute(
      "SELECT id, title, content FROM articles WHERE status = 'published' AND content NOT LIKE '%anrdoezrs.net%'"
    );
    
    console.log(`Found ${articles.length} articles without CJ affiliate links`);
    
    for (const article of articles) {
      console.log(`\nProcessing: ${article.title} (ID: ${article.id})`);
      
      // Select 3-5 random affiliate links
      const shuffled = [...CJ_AFFILIATE_LINKS].sort(() => Math.random() - 0.5);
      const selectedLinks = shuffled.slice(0, 3 + Math.floor(Math.random() * 3));
      
      // Generate affiliate section
      const affiliateSection = generateAffiliateSection(selectedLinks);
      
      // Find a good insertion point (after first paragraph or intro)
      let content = article.content;
      
      // Try to insert after the first </p> tag
      const firstParagraphEnd = content.indexOf('</p>');
      if (firstParagraphEnd > 0) {
        content = content.slice(0, firstParagraphEnd + 4) + affiliateSection + content.slice(firstParagraphEnd + 4);
      } else {
        // Just prepend if no paragraph found
        content = affiliateSection + content;
      }
      
      // Update the article
      await conn.execute(
        "UPDATE articles SET content = ? WHERE id = ?",
        [content, article.id]
      );
      
      console.log(`  ✓ Added ${selectedLinks.length} affiliate links`);
    }
    
    console.log(`\n✅ Successfully updated ${articles.length} articles with CJ affiliate links`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await conn.end();
  }
}

main();
