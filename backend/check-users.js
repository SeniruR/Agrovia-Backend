const mysql = require('mysql2/promise');

async function checkUsers() {
  try {
    const pool = mysql.createPool({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'agrovia_db'
    });

    const [rows] = await pool.execute('SELECT id, full_name, email, district, address, user_type FROM users LIMIT 5');
    
    console.log('📋 Available test users in database:');
    console.log('================================================');
    
    rows.forEach(user => {
      console.log(`ID: ${user.id}`);
      console.log(`Name: ${user.full_name}`);
      console.log(`Email: ${user.email}`);
      console.log(`District: ${user.district || '(not set)'}`);
      console.log(`Address: ${user.address || '(not set)'}`);
      console.log(`User Type: ${user.user_type}`);
      console.log('------------------------------------------------');
    });

    await pool.end();
  } catch (error) {
    console.error('Error checking users:', error);
  }
}

checkUsers();
