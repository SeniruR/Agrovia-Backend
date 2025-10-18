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

async function debugShopProductInventory() {
  let connection;
  
  try {
    console.log('🔧 Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database');

    // Check a specific product with price 22 (from your error message)
    console.log('🔍 Looking for products with unit_price = 22...');
    const [products] = await connection.execute(`
      SELECT p.id, p.product_name, p.brand_name,
             inv.unit_price, inv.quantity, inv.unit_type, inv.is_available
      FROM products p
      LEFT JOIN product_inventory inv ON inv.product_id = p.id
      WHERE inv.unit_price = 22
      ORDER BY p.id
    `);
    
    console.log('📋 Products with price 22:');
    products.forEach(product => {
      console.log(`  Product ID: ${product.id}`);
      console.log(`  Name: ${product.product_name} (${product.brand_name})`);
      console.log(`  Price: ${product.unit_price}`);
      console.log(`  Quantity: ${product.quantity}`);
      console.log(`  Unit: ${product.unit_type}`);
      console.log(`  Available: ${product.is_available}`);
      console.log('  ---');
    });

    // Check for any products that might have multiple inventory records
    console.log('🔍 Checking for products with multiple inventory records...');
    const [duplicates] = await connection.execute(`
      SELECT product_id, COUNT(*) as record_count
      FROM product_inventory
      GROUP BY product_id
      HAVING COUNT(*) > 1
    `);
    
    if (duplicates.length > 0) {
      console.log('⚠️ Products with multiple inventory records:');
      duplicates.forEach(dup => {
        console.log(`  Product ID: ${dup.product_id} has ${dup.record_count} inventory records`);
      });
      
      // Show details for these products
      for (const dup of duplicates) {
        const [details] = await connection.execute(`
          SELECT p.product_name, inv.unit_price, inv.quantity, inv.unit_type
          FROM products p
          JOIN product_inventory inv ON inv.product_id = p.id
          WHERE p.id = ?
        `, [dup.product_id]);
        
        console.log(`  Details for Product ID ${dup.product_id}:`);
        details.forEach((detail, index) => {
          console.log(`    Record ${index + 1}: ${detail.product_name} - Price: ${detail.unit_price}, Qty: ${detail.quantity}, Unit: ${detail.unit_type}`);
        });
      }
    } else {
      console.log('✅ No products have multiple inventory records');
    }

    // Check for products without inventory records
    console.log('🔍 Checking for products without inventory records...');
    const [noInventory] = await connection.execute(`
      SELECT p.id, p.product_name
      FROM products p
      LEFT JOIN product_inventory inv ON inv.product_id = p.id
      WHERE inv.product_id IS NULL
    `);
    
    if (noInventory.length > 0) {
      console.log('⚠️ Products without inventory records:');
      noInventory.forEach(product => {
        console.log(`  Product ID: ${product.id} - ${product.product_name}`);
      });
    } else {
      console.log('✅ All products have inventory records');
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the debug
debugShopProductInventory();