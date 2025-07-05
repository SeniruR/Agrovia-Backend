const { pool } = require('../config/database');

async function checkCropPostsTable() {
  try {
    console.log('📋 Checking crop_posts table structure...');
    const [rows] = await pool.execute('DESCRIBE crop_posts');
    console.log('Crop posts table structure:');
    console.table(rows);

    console.log('\n📊 Checking status values...');
    const [statusRows] = await pool.execute('SELECT DISTINCT status FROM crop_posts');
    console.log('Status values in table:');
    console.table(statusRows);

    console.log('\n🔍 Testing simple count query...');
    const [countRows] = await pool.execute('SELECT COUNT(*) as total FROM crop_posts');
    console.log('Total rows:', countRows[0].total);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkCropPostsTable();
