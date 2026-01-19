import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Get a sample article to extract all unique href domains
  const [articles] = await conn.execute(`
    SELECT id, content
    FROM articles 
    WHERE status = 'published'
    LIMIT 100
  `);
  
  const domains = new Set();
  const cjDomains = ['anrdoezrs.net', 'tkqlhce.com', 'dpbolvw.net', 'kqzyfj.com', 'jdoqocy.com', 'emjcd.com'];
  
  articles.forEach(a => {
    const hrefs = a.content.match(/href=['"]([^'"]+)['"]/gi) || [];
    hrefs.forEach(h => {
      try {
        const match = h.match(/href=['"]([^'"]+)['"]/i);
        if (match && match[1].startsWith('http')) {
          const domain = new URL(match[1]).hostname.replace('www.', '');
          domains.add(domain);
        }
      } catch (e) {}
    });
  });
  
  console.log('=== ALL LINK DOMAINS FOUND IN ARTICLES ===');
  const sortedDomains = Array.from(domains).sort();
  sortedDomains.forEach(d => {
    const isCJ = cjDomains.some(cj => d.includes(cj));
    console.log(`  ${d} ${isCJ ? '(CJ)' : ''}`);
  });
  
  // Check for any non-CJ external links
  const nonCJDomains = sortedDomains.filter(d => {
    return !cjDomains.some(cj => d.includes(cj));
  });
  console.log('\n=== NON-CJ DOMAINS ===');
  nonCJDomains.forEach(d => console.log(`  ${d}`));
  
  await conn.end();
}

main().catch(console.error);
