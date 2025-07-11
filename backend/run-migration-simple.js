const { pool } = require('./config/database');

async function runMigration() {
  try {
    console.log('🔄 Running database migration to add minimum_quantity_bulk column...\n');
    
    // Check if column already exists
    console.log('1. Checking if minimum_quantity_bulk column exists...');
    try {
      const [columns] = await pool.execute("SHOW COLUMNS FROM crop_posts LIKE 'minimum_quantity_bulk'");
      if (columns.length > 0) {
        console.log('   ⚠️  Column already exists, skipping migration');
        await testEnhancedAPI();
        return;
      }
    } catch (error) {
      console.log('   Error checking column:', error.message);
    }
    
    // Add the column
    console.log('2. Adding minimum_quantity_bulk column...');
    const alterSQL = `
      ALTER TABLE crop_posts 
      ADD COLUMN minimum_quantity_bulk DECIMAL(10,2) DEFAULT NULL AFTER price_per_unit
    `;
    
    try {
      await pool.execute(alterSQL);
      console.log('   ✅ Column added successfully\n');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('   ⚠️  Column already exists\n');
      } else {
        throw error;
      }
    }
    
    // Add comment to the column
    console.log('3. Adding column comment...');
    const commentSQL = `
      ALTER TABLE crop_posts 
      MODIFY COLUMN minimum_quantity_bulk DECIMAL(10,2) DEFAULT NULL 
      COMMENT 'Minimum quantity required for bulk orders'
    `;
    
    try {
      await pool.execute(commentSQL);
      console.log('   ✅ Comment added successfully\n');
    } catch (error) {
      console.log('   ⚠️  Comment update failed:', error.message);
    }
    
    // Verify the column was added
    console.log('4. Verifying column was added...');
    const [testResult] = await pool.execute('DESCRIBE crop_posts');
    const bulkColumn = testResult.find(col => col.Field === 'minimum_quantity_bulk');
    
    if (bulkColumn) {
      console.log('   ✅ minimum_quantity_bulk column confirmed:');
      console.log(`      Type: ${bulkColumn.Type}`);
      console.log(`      Null: ${bulkColumn.Null}`);
      console.log(`      Default: ${bulkColumn.Default}`);
      if (bulkColumn.Comment) {
        console.log(`      Comment: ${bulkColumn.Comment}`);
      }
      console.log('');
    } else {
      console.log('   ❌ minimum_quantity_bulk column not found\n');
      return;
    }
    
    // Update a few existing crop posts with sample bulk quantities for testing
    console.log('5. Adding sample bulk quantities to existing crops...');
    const updateQueries = [
      "UPDATE crop_posts SET minimum_quantity_bulk = 25.00 WHERE id = 1",
      "UPDATE crop_posts SET minimum_quantity_bulk = 10.00 WHERE id = 2",
      "UPDATE crop_posts SET minimum_quantity_bulk = 50.00 WHERE id = 3",
      "UPDATE crop_posts SET minimum_quantity_bulk = NULL WHERE id = 4",
      "UPDATE crop_posts SET minimum_quantity_bulk = 15.00 WHERE id = 5"
    ];
    
    for (const query of updateQueries) {
      try {
        await pool.execute(query);
        console.log(`   ✅ Updated crop post`);
      } catch (error) {
        console.log(`   ⚠️  Update failed: ${error.message}`);
      }
    }
    console.log('');
    
    await testEnhancedAPI();
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\n🔚 Database connection closed');
  }
}

async function testEnhancedAPI() {
  // Test enhanced API after migration
  console.log('6. Testing enhanced API after migration...');
  const axios = require('axios');
  
  try {
    const response = await axios.get('http://localhost:5000/api/v1/crop-posts/enhanced/1');
    if (response.data.success) {
      console.log('   ✅ Enhanced API is working!');
      const crop = response.data.data;
      console.log(`      Crop: ${crop.crop_name}`);
      console.log(`      Minimum Bulk: ${crop.minimum_quantity_bulk || 'Not set'}`);
      console.log(`      Has Bulk Minimum: ${crop.has_minimum_bulk}`);
      console.log(`      Bulk Info: ${crop.bulk_info}`);
    } else {
      console.log('   ❌ Enhanced API returned error:', response.data.message);
    }
  } catch (apiError) {
    console.log('   ❌ Enhanced API test failed:', apiError.response?.data?.message || apiError.message);
  }
  
  // Test bulk orders endpoint
  try {
    const bulkResponse = await axios.get('http://localhost:5000/api/v1/crop-posts/bulk-orders');
    if (bulkResponse.data.success) {
      console.log(`   ✅ Bulk orders API working! Found ${bulkResponse.data.data.length} bulk eligible crops`);
    }
  } catch (apiError) {
    console.log('   ❌ Bulk orders API test failed:', apiError.response?.data?.message || apiError.message);
  }
}

// Run the migration
runMigration();
