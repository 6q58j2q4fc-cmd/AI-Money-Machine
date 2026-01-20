import mysql from 'mysql2/promise';

async function checkArticles() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Count articles by status
  const [counts] = await connection.execute(`
    SELECT status, COUNT(*) as count 
    FROM articles 
    GROUP BY status
  `);
  console.log('Articles by status:', counts);
  
  // Count total articles
  const [total] = await connection.execute('SELECT COUNT(*) as total FROM articles');
  console.log('Total articles:', total[0].total);
  
  // Count pending/draft articles
  const [pending] = await connection.execute(`
    SELECT COUNT(*) as count 
    FROM articles 
    WHERE status IN ('draft', 'pending', 'review')
  `);
  console.log('Pending/Draft articles:', pending[0].count);
  
  await connection.end();
}

checkArticles().catch(console.error);
