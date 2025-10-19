const fs = require('fs');
const path = require('path');
const db = require('../config/database');

const run = async () => {
  try {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'migrations', '20251019_create_contact_messages.sql'), 'utf8');
    const conn = await db.getConnection();
    await conn.query(sql);
    conn.release();
    console.log('Migration executed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err && err.message ? err.message : err);
    process.exit(1);
  }
};

run();
