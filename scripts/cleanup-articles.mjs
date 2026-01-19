// Script to clean up article titles and excerpts
// Run with: node scripts/cleanup-articles.mjs

import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

async function cleanupArticles() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    console.log('Starting article cleanup...');
    
    // Clean up titles - remove repetitive "Best Best" patterns
    const titleCleanup = await connection.execute(`
      UPDATE articles 
      SET title = REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(title, 'Best Best Best Best Best ', 'Best '),
              'Best Best Best Best ', 'Best '
            ),
            'Best Best Best ', 'Best '
          ),
          'Best Best ', 'Best '
        ),
        ' - -', ''
      )
      WHERE title LIKE '%Best Best%' OR title LIKE '% - -%'
    `);
    console.log(`Cleaned ${titleCleanup[0].affectedRows} article titles`);
    
    // Clean up excerpts - remove "Top Picks & Reviews" patterns
    const excerptCleanup = await connection.execute(`
      UPDATE articles 
      SET excerpt = REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(excerpt, ' - Top Picks & Reviews - Top Picks & Reviews - Top Picks & Reviews - Top Picks & Reviews', ''),
              ' - Top Picks & Reviews - Top Picks & Reviews - Top Picks & Reviews', ''
            ),
            ' - Top Picks & Reviews - Top Picks & Reviews', ''
          ),
          ' - Top Picks & Reviews', ''
        ),
        'Top Picks & Reviews', ''
      )
      WHERE excerpt LIKE '%Top Picks & Reviews%'
    `);
    console.log(`Cleaned ${excerptCleanup[0].affectedRows} article excerpts`);
    
    // Clean up excerpts - remove "Best Best" patterns
    const excerptBestCleanup = await connection.execute(`
      UPDATE articles 
      SET excerpt = REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(excerpt, 'Best Best Best Best Best ', 'Best '),
              'Best Best Best Best ', 'Best '
            ),
            'Best Best Best ', 'Best '
          ),
          'Best Best ', 'Best '
        ),
        'best best ', 'best '
      )
      WHERE excerpt LIKE '%Best Best%' OR excerpt LIKE '%best best%'
    `);
    console.log(`Cleaned ${excerptBestCleanup[0].affectedRows} article excerpts (Best patterns)`);
    
    // Clean up meta descriptions
    const metaCleanup = await connection.execute(`
      UPDATE articles 
      SET metaDescription = REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(metaDescription, 'Best Best Best Best ', 'Best '),
            'Best Best Best ', 'Best '
          ),
          'Best Best ', 'Best '
        ),
        ' - Top Picks & Reviews', ''
      )
      WHERE metaDescription LIKE '%Best Best%' OR metaDescription LIKE '%Top Picks & Reviews%'
    `);
    console.log(`Cleaned ${metaCleanup[0].affectedRows} meta descriptions`);
    
    console.log('Article cleanup completed successfully!');
    
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await connection.end();
  }
}

cleanupArticles();
