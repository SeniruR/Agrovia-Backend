const { pool } = require('../config/database');

async function checkTableStructure() {
  try {
    console.log('📋 Checking users table structure...');
    const [usersRows] = await pool.execute('DESCRIBE users');
    console.log('Users table:');
    console.table(usersRows);

    console.log('\n📋 Checking if crop_posts table exists...');
    try {
      const [cropPostsRows] = await pool.execute('DESCRIBE crop_posts');
      console.log('Crop posts table:');
      console.table(cropPostsRows);
    } catch (error) {
      console.log('❌ crop_posts table does not exist');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking table structure:', error.message);
    process.exit(1);
  }
}

checkTableStructure();
