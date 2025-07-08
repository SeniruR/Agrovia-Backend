const { pool } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🔄 Running database migration to add minimum_quantity_bulk column...\n');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', 'add_minimum_quantity_bulk.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split SQL commands (remove comments and empty lines)
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`Found ${commands.length} SQL commands to execute:\n`);
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      console.log(`${i + 1}. Executing: ${command.substring(0, 60)}...`);
      
      try {
        await pool.execute(command);
        console.log('   ✅ Success\n');
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME' || error.message.includes('Duplicate column name')) {
          console.log('   ⚠️  Column already exists, skipping\n');
        } else {
          console.error('   ❌ Error:', error.message);
          throw error;
        }
      }
    }
    
    console.log('🎉 Migration completed successfully!\n');
    
    // Test the new column
    console.log('🔍 Testing the new column...');
    const [testResult] = await pool.execute('DESCRIBE crop_posts');
    const bulkColumn = testResult.find(col => col.Field === 'minimum_quantity_bulk');
    
    if (bulkColumn) {
      console.log('✅ minimum_quantity_bulk column confirmed:');
      console.log(`   Type: ${bulkColumn.Type}`);
      console.log(`   Null: ${bulkColumn.Null}`);
      console.log(`   Default: ${bulkColumn.Default}`);
      console.log(`   Extra: ${bulkColumn.Extra}\n`);
    } else {
      console.log('❌ minimum_quantity_bulk column not found\n');
    }
    
    // Test enhanced API after migration
    console.log('🧪 Testing enhanced API after migration...');
    const axios = require('axios');
    
    try {
      const response = await axios.get('http://localhost:5000/api/v1/crop-posts/enhanced/1');
      if (response.data.success) {
        console.log('✅ Enhanced API is working!');
        const crop = response.data.data;
        console.log(`   Crop: ${crop.crop_name}`);
        console.log(`   Minimum Bulk: ${crop.minimum_quantity_bulk || 'Not set'}`);
        console.log(`   Has Bulk Minimum: ${crop.has_minimum_bulk}`);
      } else {
        console.log('❌ Enhanced API returned error:', response.data.message);
      }
    } catch (apiError) {
      console.log('❌ Enhanced API test failed:', apiError.response?.data?.message || apiError.message);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\n🔚 Database connection closed');
  }
}

// Run the migration
runMigration();
