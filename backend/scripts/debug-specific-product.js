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

async function debugSpecificProduct() {
  let connection;
  
  try {
    console.log('🔧 Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database');

    // Get the exact same query that ShopProductModel.getAll() uses
    console.log('🔍 Running the same query as ShopProductModel.getAll()...');
    const [rows] = await connection.execute(`
      SELECT p.id AS productId, p.shop_id, p.product_name, p.brand_name, p.description,
        p.category_id, p.image AS primary_image, p.image_mime AS primary_mime,
        inv.unit_type, inv.unit_price, inv.quantity, inv.is_available,
        pc.name AS category_name,
             sd.id AS shop_detail_id, sd.shop_name,
             sd.is_active,
             u.full_name AS owner_name,
             COALESCE(sd.shop_phone_number, u.phone_number) AS phone_no,
             COALESCE(sd.shop_email, u.email) AS email,
             sd.shop_address,
             sd.business_registration_number,
             sd.shop_description,
             sd.shop_category,
             sd.operating_hours,
             sd.opening_days,
             sd.delivery_areas,
             sd.latitude,
             sd.longitude,
             sd.shop_image AS shop_image_blob, sd.shop_image_mime,
             NULL AS city,
        pi.id AS image_id, pi.image AS image_blob, pi.image_mime AS image_mime
      FROM products p
      LEFT JOIN product_inventory inv ON inv.product_id = p.id
      LEFT JOIN product_images pi ON pi.product_id = p.id
      LEFT JOIN product_categories pc ON pc.id = p.category_id
      LEFT JOIN shop_details sd ON sd.id = p.shop_id
      LEFT JOIN users u ON u.id = sd.user_id
      WHERE p.product_name = 'ssss'
      ORDER BY p.id DESC
    `);
    
    console.log('📋 Raw database results for product "ssss":');
    rows.forEach((row, index) => {
      console.log(`Row ${index + 1}:`);
      console.log(`  productId: ${row.productId}`);
      console.log(`  product_name: ${row.product_name}`);
      console.log(`  brand_name: ${row.brand_name}`);
      console.log(`  unit_price: ${row.unit_price}`);
      console.log(`  quantity: ${row.quantity}`);
      console.log(`  is_available (inventory): ${row.is_available}`);
      console.log(`  is_active (shop): ${row.is_active}`);
      console.log(`  shop_name: ${row.shop_name}`);
      console.log(`  unit_type: ${row.unit_type}`);
      console.log('  ---');
    });

    // Show what the processed data would look like (mimicking ShopProductModel logic)
    console.log('🔄 Simulating ShopProductModel processing...');
    const map = new Map();
    for (const r of rows) {
      const pid = r.productId;
      if (!map.has(pid)) {
        const processedItem = {
          id: pid,
          shop_name: r.shop_name,
          product_name: r.product_name,
          brand: r.brand_name,
          unit: r.unit_type,
          price: r.unit_price,
          available_quantity: r.quantity,  // This should be 22
          is_available: r.is_available,    // This should be 1
          is_active: r.is_active          // This should be 1
        };
        map.set(pid, processedItem);
        
        console.log('📦 Processed item data:');
        console.log(`  id: ${processedItem.id}`);
        console.log(`  product_name: ${processedItem.product_name}`);
        console.log(`  available_quantity: ${processedItem.available_quantity} (type: ${typeof processedItem.available_quantity})`);
        console.log(`  is_available: ${processedItem.is_available} (type: ${typeof processedItem.is_available})`);
        console.log(`  is_active: ${processedItem.is_active} (type: ${typeof processedItem.is_active})`);
        console.log(`  price: ${processedItem.price}`);
        console.log(`  unit: ${processedItem.unit}`);
      }
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
debugSpecificProduct();