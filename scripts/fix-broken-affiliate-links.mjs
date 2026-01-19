import mysql from 'mysql2/promise';

// Working Abelssoft affiliate links to use as replacements
const workingLinks = [
  "https://www.kqzyfj.com/click-101630462-15402312-1684488656000",
  "https://www.jdoqocy.com/click-101630462-15402725-1684488656000",
  "https://www.anrdoezrs.net/click-101630462-17060421-1743500772000",
  "https://www.jdoqocy.com/click-101630462-15402349-1684488656000",
  "https://www.dpbolvw.net/click-101630462-15402341-1684488656000",
  "https://www.tkqlhce.com/click-101630462-16970606-1732186486000",
  "https://www.kqzyfj.com/click-101630462-15639151-1697008580000",
  "https://www.kqzyfj.com/click-101630462-16942422-1729503964000",
  "https://www.dpbolvw.net/click-101630462-15639154-1697008689000",
  "https://www.anrdoezrs.net/click-101630462-15777927-1711378591000",
  "https://www.anrdoezrs.net/click-101630462-15774694-1711009491000",
  "https://www.kqzyfj.com/click-101630462-16942417-1729503593000",
  "https://www.tkqlhce.com/click-101630462-15639171-1697010866000",
  "https://www.anrdoezrs.net/click-101630462-15638638-1696947090000",
  "https://www.jdoqocy.com/click-101630462-15639163-1697009878000",
  "https://www.kqzyfj.com/click-101630462-15639167-1697010271000",
  "https://www.tkqlhce.com/click-101630462-15638636-1696946978000",
  "https://www.dpbolvw.net/click-101630462-15402687-1684488656000",
  "https://www.jdoqocy.com/click-101630462-15402291-1684488656000",
  "https://www.dpbolvw.net/click-101630462-15402369-1684488656000",
  "https://www.kqzyfj.com/click-101630462-15639162-1697009763000",
  "https://www.tkqlhce.com/click-101630462-16942418-1729503668000",
  "https://www.tkqlhce.com/click-101630462-16970595-1732186361000",
  "https://www.jdoqocy.com/click-101630462-15639155-1697008836000",
  "https://www.tkqlhce.com/click-101630462-15774692-1711009399000",
  "https://www.anrdoezrs.net/click-101630462-15780513-1711615175000",
  "https://www.jdoqocy.com/click-101630462-15774695-1711009561000",
  "https://www.anrdoezrs.net/click-101630462-15402688-1684488656000",
  "https://www.anrdoezrs.net/click-101630462-17009811-1736953352000"
];

async function fixBrokenLinks() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  console.log('Fetching articles with broken 24-7PressRelease links...');
  
  // Get all articles with broken links (advertiser IDs starting with 1075 or 1050)
  const [articles] = await conn.execute(`
    SELECT id, title, content
    FROM articles 
    WHERE status = 'published' 
    AND (content LIKE '%click-101630462-1075%' OR content LIKE '%click-101630462-1050%')
  `);
  
  console.log(`Found ${articles.length} articles with broken links`);
  
  let fixedCount = 0;
  let linkReplacementCount = 0;
  
  for (const article of articles) {
    let content = article.content;
    let modified = false;
    
    // Find all broken CJ links (24-7PressRelease advertiser IDs)
    const brokenLinkPattern = /https:\/\/www\.(jdoqocy|dpbolvw|anrdoezrs|kqzyfj|tkqlhce)\.(com|net)\/click-101630462-(1075\d+|1050\d+)-\d+/g;
    
    let match;
    let replacements = [];
    
    while ((match = brokenLinkPattern.exec(content)) !== null) {
      // Get a random working link
      const replacementLink = workingLinks[Math.floor(Math.random() * workingLinks.length)];
      replacements.push({ original: match[0], replacement: replacementLink });
    }
    
    // Apply replacements
    for (const { original, replacement } of replacements) {
      content = content.replace(original, replacement);
      linkReplacementCount++;
      modified = true;
    }
    
    if (modified) {
      // Update the article
      await conn.execute(
        'UPDATE articles SET content = ? WHERE id = ?',
        [content, article.id]
      );
      fixedCount++;
      
      if (fixedCount % 100 === 0) {
        console.log(`Fixed ${fixedCount} articles so far...`);
      }
    }
  }
  
  console.log(`\nComplete!`);
  console.log(`Fixed ${fixedCount} articles`);
  console.log(`Replaced ${linkReplacementCount} broken links`);
  
  await conn.end();
}

fixBrokenLinks().catch(console.error);
