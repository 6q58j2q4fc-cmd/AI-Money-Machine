import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: 'gateway01.us-west-2.prod.aws.tidbcloud.com',
  port: 4000,
  user: '3dEhPRrK8rp8Lzx.root',
  password: 'JGJUYwjZEHfvPANp',
  database: 'money_machine_8b174543',
  ssl: { rejectUnauthorized: true }
});

// Check affiliate links
const [links] = await connection.execute(
  'SELECT id, name, url, category, program FROM affiliate_links WHERE isActive = 1 LIMIT 20'
);

console.log('=== Active Affiliate Links ===');
for (const link of links) {
  console.log(`${link.id}: ${link.name}`);
  console.log(`   URL: ${link.url.substring(0, 100)}...`);
  console.log(`   Category: ${link.category}, Program: ${link.program}`);
  console.log('');
}

// Check article-affiliate link associations
const [associations] = await connection.execute(`
  SELECT aal.articleId, aal.affiliateLinkId, aal.anchorText, al.name, al.url
  FROM article_affiliate_links aal
  JOIN affiliate_links al ON aal.affiliateLinkId = al.id
  LIMIT 10
`);

console.log('=== Article-Affiliate Link Associations ===');
for (const assoc of associations) {
  console.log(`Article ${assoc.articleId}: ${assoc.name}`);
  console.log(`   URL: ${assoc.url.substring(0, 80)}...`);
  console.log('');
}

await connection.end();
