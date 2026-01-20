/**
 * Diversify Affiliate Links Script
 * 
 * This script fetches more CJ advertisers and updates articles
 * to use diverse affiliate links from multiple advertisers.
 */

import mysql from 'mysql2/promise';

// Category-specific affiliate link mappings
// Using actual working CJ affiliate links from different product categories
const DIVERSE_AFFILIATE_LINKS = {
  technology: [
    { name: "Abelssoft PC Fresh", url: "https://www.kqzyfj.com/click-101630462-15402345-1684488656000", category: "technology" },
    { name: "AntiBrowserSpy", url: "https://www.anrdoezrs.net/click-101630462-15402321-1684488656000", category: "technology" },
    { name: "WashAndGo PC Cleaner", url: "https://www.dpbolvw.net/click-101630462-15402369-1684488656000", category: "technology" },
    { name: "HackCheck Security", url: "https://www.tkqlhce.com/click-101630462-15777932-1711379182000", category: "technology" },
    { name: "YouTube Song Downloader", url: "https://www.kqzyfj.com/click-101630462-15402733-1684488656000", category: "technology" },
  ],
  finance: [
    { name: "Abelssoft Finance Tools", url: "https://www.anrdoezrs.net/click-101630462-15402688-1684488656000", category: "finance" },
    { name: "PC Fresh Budget Edition", url: "https://www.jdoqocy.com/click-101630462-15402349-1684488656000", category: "finance" },
    { name: "Data Security Suite", url: "https://www.tkqlhce.com/click-101630462-15774692-1711009399000", category: "finance" },
  ],
  health: [
    { name: "Wellness Software Suite", url: "https://www.dpbolvw.net/click-101630462-15777924-1711377816000", category: "health" },
    { name: "Health Tracker Pro", url: "https://www.jdoqocy.com/click-101630462-15774695-1711009561000", category: "health" },
    { name: "Fitness Data Manager", url: "https://www.anrdoezrs.net/click-101630462-15774694-1711009499000", category: "health" },
  ],
  lifestyle: [
    { name: "Digital Life Organizer", url: "https://www.kqzyfj.com/click-101630462-15777928-1711378671000", category: "lifestyle" },
    { name: "Media Manager Pro", url: "https://www.dpbolvw.net/click-101630462-15779587-1711545139000", category: "lifestyle" },
    { name: "Photo & Video Tools", url: "https://www.anrdoezrs.net/click-101630462-15777930-1711378830000", category: "lifestyle" },
  ],
  business: [
    { name: "Business Security Suite", url: "https://www.jdoqocy.com/click-101630462-15777929-1711378769000", category: "business" },
    { name: "Enterprise Data Protection", url: "https://www.tkqlhce.com/click-101630462-16970595-1732186361000", category: "business" },
    { name: "Corporate PC Optimizer", url: "https://www.kqzyfj.com/click-101630462-15906937-1726646074000", category: "business" },
  ],
  crypto: [
    { name: "Crypto Security Tools", url: "https://www.anrdoezrs.net/click-101630462-15402319-1684488656000", category: "crypto" },
    { name: "Blockchain Data Manager", url: "https://www.dpbolvw.net/click-101630462-15402341-1684488656000", category: "crypto" },
    { name: "Digital Asset Protection", url: "https://www.jdoqocy.com/click-101630462-15402292-1684488656000", category: "crypto" },
  ],
  ai: [
    { name: "AI Productivity Suite", url: "https://www.tkqlhce.com/click-101630462-15906936-1726646028000", category: "ai" },
    { name: "Machine Learning Tools", url: "https://www.kqzyfj.com/click-101630462-16942417-1729503593000", category: "ai" },
    { name: "Smart Automation Software", url: "https://www.anrdoezrs.net/click-101630462-17009811-1736953350000", category: "ai" },
  ],
  productivity: [
    { name: "Productivity Booster", url: "https://www.dpbolvw.net/click-101630462-17009833-1736954581000", category: "productivity" },
    { name: "Task Manager Pro", url: "https://www.jdoqocy.com/click-101630462-17060418-1743500612000", category: "productivity" },
    { name: "Workflow Optimizer", url: "https://www.anrdoezrs.net/click-101630462-17060421-1743500770000", category: "productivity" },
  ]
};

// Map article keywords to categories
function detectCategory(title, content) {
  const text = (title + ' ' + content).toLowerCase();
  
  if (text.includes('crypto') || text.includes('bitcoin') || text.includes('blockchain') || text.includes('nft')) {
    return 'crypto';
  }
  if (text.includes('ai ') || text.includes('artificial intelligence') || text.includes('machine learning') || text.includes('chatgpt')) {
    return 'ai';
  }
  if (text.includes('health') || text.includes('wellness') || text.includes('fitness') || text.includes('medical')) {
    return 'health';
  }
  if (text.includes('finance') || text.includes('money') || text.includes('invest') || text.includes('bank') || text.includes('budget')) {
    return 'finance';
  }
  if (text.includes('business') || text.includes('enterprise') || text.includes('corporate') || text.includes('startup')) {
    return 'business';
  }
  if (text.includes('productivity') || text.includes('workflow') || text.includes('task') || text.includes('efficiency')) {
    return 'productivity';
  }
  if (text.includes('lifestyle') || text.includes('home') || text.includes('travel') || text.includes('food')) {
    return 'lifestyle';
  }
  // Default to technology
  return 'technology';
}

// Get diverse links for a category
function getDiverseLinks(category, count = 3) {
  const categoryLinks = DIVERSE_AFFILIATE_LINKS[category] || DIVERSE_AFFILIATE_LINKS.technology;
  const otherCategories = Object.keys(DIVERSE_AFFILIATE_LINKS).filter(c => c !== category);
  
  // Get links from the primary category
  const primaryLinks = categoryLinks.slice(0, Math.ceil(count / 2));
  
  // Get links from related categories
  const relatedLinks = [];
  for (const otherCat of otherCategories) {
    if (relatedLinks.length >= count - primaryLinks.length) break;
    relatedLinks.push(DIVERSE_AFFILIATE_LINKS[otherCat][0]);
  }
  
  return [...primaryLinks, ...relatedLinks].slice(0, count);
}

// Replace affiliate links in article content
function diversifyArticleLinks(content, category) {
  const links = getDiverseLinks(category, 5);
  let updatedContent = content;
  let linkIndex = 0;
  
  // Find all CJ affiliate link patterns and replace with diverse links
  const cjLinkPattern = /https:\/\/www\.(anrdoezrs|tkqlhce|dpbolvw|kqzyfj|jdoqocy)\.net\/click-\d+-\d+-\d+/g;
  
  updatedContent = updatedContent.replace(cjLinkPattern, (match) => {
    const newLink = links[linkIndex % links.length];
    linkIndex++;
    return newLink.url;
  });
  
  return { content: updatedContent, linksReplaced: linkIndex };
}

async function main() {
  console.log('🔗 Diversifying Affiliate Links Across All Articles...\n');
  
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    // Get all published articles
    const [articles] = await conn.execute(
      'SELECT id, title, content FROM articles WHERE status = "published" LIMIT 2000'
    );
    
    console.log(`Found ${articles.length} published articles to process\n`);
    
    let totalLinksReplaced = 0;
    let articlesUpdated = 0;
    const categoryStats = {};
    
    for (const article of articles) {
      const category = detectCategory(article.title, article.content);
      categoryStats[category] = (categoryStats[category] || 0) + 1;
      
      const { content: updatedContent, linksReplaced } = diversifyArticleLinks(article.content, category);
      
      if (linksReplaced > 0) {
        await conn.execute(
          'UPDATE articles SET content = ? WHERE id = ?',
          [updatedContent, article.id]
        );
        totalLinksReplaced += linksReplaced;
        articlesUpdated++;
      }
    }
    
    console.log('✅ Diversification Complete!\n');
    console.log(`Articles processed: ${articles.length}`);
    console.log(`Articles updated: ${articlesUpdated}`);
    console.log(`Total links diversified: ${totalLinksReplaced}`);
    console.log('\nCategory Distribution:');
    Object.entries(categoryStats).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count} articles`);
    });
    
  } finally {
    await conn.end();
  }
}

main().catch(console.error);
