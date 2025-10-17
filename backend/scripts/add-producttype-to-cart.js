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

async function addProductTypeToCart() {
  let connection;
  
  try {
    console.log('🔧 Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database');

    // Step 1: Drop the existing foreign key constraint
    console.log('🗑️ Dropping existing foreign key constraint...');
    try {
      await connection.execute(`
        ALTER TABLE carts 
        DROP FOREIGN KEY carts_ibfk_2
      `);
      console.log('✅ Foreign key constraint dropped');
    } catch (error) {
      console.log('⚠️ Foreign key constraint might not exist, continuing...');
    }

    // Step 2: Add productType column
    console.log('➕ Adding productType column...');
    try {
      await connection.execute(`
        ALTER TABLE carts 
        ADD COLUMN productType ENUM('crop', 'shop') NOT NULL DEFAULT 'crop'
      `);
      console.log('✅ ProductType column added');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('⚠️ ProductType column already exists, continuing...');
      } else {
        throw error;
      }
    }

    // Step 3: Update existing records to have productType = 'crop' (since they were all crops before)
    console.log('🔄 Updating existing records to set productType = "crop"...');
    const [updateResult] = await connection.execute(`
      UPDATE carts SET productType = 'crop' WHERE productType IS NULL OR productType = ''
    `);
    console.log(`✅ Updated ${updateResult.affectedRows} existing records`);

    // Step 4: Show the updated table structure
    console.log('📋 Checking updated table structure...');
    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM carts
    `);
    console.log('✅ Current carts table structure:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
    });

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
addProductTypeToCart();