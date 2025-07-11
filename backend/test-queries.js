const { pool } = require('./config/database');

async function testQuery() {
  try {
    console.log('Testing database queries...\n');
    
    // Test 1: Simple query to get a crop post
    console.log('1. Testing simple query...');
    const [simpleResult] = await pool.execute('SELECT * FROM crop_posts WHERE id = 1 LIMIT 1');
    if (simpleResult.length > 0) {
      console.log('   ✅ Simple query works');
      console.log(`   Found crop: ${simpleResult[0].crop_name}`);
      console.log(`   Minimum bulk: ${simpleResult[0].minimum_quantity_bulk}`);
    } else {
      console.log('   ❌ No crop found with ID 1');
    }
    
    // Test 2: Enhanced query
    console.log('\n2. Testing enhanced query...');
    const enhancedQuery = `
      SELECT 
        cp.*, 
        u.full_name as farmer_name, 
        u.phone_number as farmer_phone,
        u.email as farmer_email,
        CASE 
          WHEN cp.minimum_quantity_bulk IS NOT NULL 
          THEN CONCAT('Min bulk: ', cp.minimum_quantity_bulk, ' ', cp.unit)
          ELSE 'No minimum bulk requirement'
        END as bulk_info
      FROM crop_posts cp
      LEFT JOIN users u ON cp.farmer_id = u.id
      WHERE cp.id = ? AND cp.status = 'active'
    `;
    
    const [enhancedResult] = await pool.execute(enhancedQuery, [1]);
    if (enhancedResult.length > 0) {
      console.log('   ✅ Enhanced query works');
      const crop = enhancedResult[0];
      console.log(`   Crop: ${crop.crop_name}`);
      console.log(`   Farmer: ${crop.farmer_name}`);
      console.log(`   Minimum bulk: ${crop.minimum_quantity_bulk}`);
      console.log(`   Bulk info: ${crop.bulk_info}`);
    } else {
      console.log('   ❌ Enhanced query returned no results');
    }
    
    // Test 3: Test the CropPost model method
    console.log('\n3. Testing CropPost.getById method...');
    const CropPost = require('./models/CropPost');
    const cropPost = await CropPost.getById(1);
    
    if (cropPost) {
      console.log('   ✅ CropPost.getById works');
      console.log(`   Crop: ${cropPost.crop_name}`);
      console.log(`   Has bulk minimum: ${cropPost.has_minimum_bulk}`);
      console.log(`   Minimum bulk: ${cropPost.minimum_quantity_bulk}`);
      console.log(`   Bulk info: ${cropPost.bulk_info}`);
    } else {
      console.log('   ❌ CropPost.getById returned null');
    }
    
  } catch (error) {
    console.error('❌ Query test failed:', error.message);
  } finally {
    await pool.end();
    console.log('\n🔚 Database connection closed');
  }
}

testQuery();
