const mysql = require('mysql2/promise');

const config = {
  host: 'agrovia-sheharagamage2002-1cc3.c.aivencloud.com',
  user: 'avnadmin',
  password: 'AVNS_iOtAXIKDXzwb0S4k4dm',
  database: 'defaultdb',
  port: 12267,
  ssl: {
    rejectUnauthorized: false
  }
};

async function expandProductImageField() {
  let connection;
  
  try {
    console.log('🔧 Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database');

    // Step 1: Check current productImage field size
    console.log('🔍 Checking current productImage field structure...');
    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM carts WHERE Field = 'productImage'
    `);
    
    if (columns.length > 0) {
      console.log(`📋 Current productImage field: ${columns[0].Type}`);
    }

    // Step 2: Expand productImage field to LONGTEXT to handle base64 data URLs
    console.log('📏 Expanding productImage field to LONGTEXT...');
    await connection.execute(`
      ALTER TABLE carts 
      MODIFY COLUMN productImage LONGTEXT
    `);
    console.log('✅ ProductImage field expanded to LONGTEXT');

    // Step 3: Verify the change
    console.log('🔍 Verifying the change...');
    const [newColumns] = await connection.execute(`
      SHOW COLUMNS FROM carts WHERE Field = 'productImage'
    `);
    
    if (newColumns.length > 0) {
      console.log(`✅ New productImage field type: ${newColumns[0].Type}`);
    }

    console.log('🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the migration
expandProductImageField();