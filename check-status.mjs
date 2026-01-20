import { createConnection } from 'mysql2/promise';

const conn = await createConnection({
  host: 'gateway01.us-west-2.prod.aws.tidbcloud.com',
  port: 4000,
  user: '3pKCBjLJMGJTHBk.root',
  password: process.env.TIDB_PASSWORD,
  database: 'money_machine',
  ssl: { rejectUnauthorized: true }
});

const [rows] = await conn.execute('SELECT status, COUNT(*) as count FROM articles GROUP BY status');
console.log('Article status counts:');
console.table(rows);
await conn.end();
