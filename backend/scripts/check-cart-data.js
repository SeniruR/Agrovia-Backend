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

async function checkCartData() {
  let connection;
  
  try {
    console.log('🔧 Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database');

    // Check current cart data
    console.log('🔍 Checking current cart data...');
    const [cartItems] = await connection.execute(`
      SELECT id, userId, productId, productName, farmerName, productType, 
             LEFT(productImage, 100) as imagePreview,
             LENGTH(productImage) as imageLength,
             createdAt
      FROM carts 
      ORDER BY createdAt DESC 
      LIMIT 10
    `);
    
    console.log(`📋 Found ${cartItems.length} cart items:`);
    cartItems.forEach((item, index) => {
      console.log(`\n${index + 1}. Cart Item ID: ${item.id}`);
      console.log(`   User ID: ${item.userId}`);
      console.log(`   Product ID: ${item.productId}`);
      console.log(`   Product Name: ${item.productName}`);
      console.log(`   Farmer/Shop: ${item.farmerName}`);
      console.log(`   Product Type: ${item.productType}`);
      console.log(`   Image Length: ${item.imageLength} chars`);
      console.log(`   Image Preview: ${item.imagePreview ? item.imagePreview.substring(0, 50) + '...' : 'No image'}`);
      console.log(`   Created: ${item.createdAt}`);
    });

    // Check for potentially corrupted entries
    console.log('\n🔍 Checking for potentially corrupted entries...');
    const [corruptedItems] = await connection.execute(`
      SELECT id, productName, farmerName, productType
      FROM carts 
      WHERE productName LIKE '%ssss%' 
         OR farmerName LIKE '%adasd%'
         OR productName = ''
         OR farmerName = ''
         OR productName IS NULL
         OR farmerName IS NULL
    `);
    
    if (corruptedItems.length > 0) {
      console.log(`❌ Found ${corruptedItems.length} potentially corrupted cart items:`);
      corruptedItems.forEach(item => {
        console.log(`   ID: ${item.id}, Name: "${item.productName}", Farmer: "${item.farmerName}", Type: ${item.productType}`);
      });
      
      console.log('\n🗑️ Would you like to clean these up? (This would require manual confirmation)');
    } else {
      console.log('✅ No obviously corrupted cart items found');
    }

    console.log('\n🎉 Cart data check completed!');

  } catch (error) {
    console.error('❌ Check failed:', error.message);
    console.error('Full error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the check
checkCartData();