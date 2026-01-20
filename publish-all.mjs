// Script to publish all pending articles
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function publishAllPending() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    // First, get article counts by status
    const [statusCounts] = await connection.execute(`
      SELECT status, COUNT(*) as count 
      FROM articles 
      GROUP BY status
    `);
    console.log('Current article status counts:', statusCounts);
    
    // Update all draft and pending articles to published
    const [result] = await connection.execute(`
      UPDATE articles 
      SET status = 'published', 
          publishedAt = NOW() 
      WHERE status IN ('draft', 'pending', 'review')
    `);
    console.log('Published articles:', result.affectedRows);
    
    // Get new counts
    const [newCounts] = await connection.execute(`
      SELECT status, COUNT(*) as count 
      FROM articles 
      GROUP BY status
    `);
    console.log('New article status counts:', newCounts);
    
  } finally {
    await connection.end();
  }
}

publishAllPending().catch(console.error);
