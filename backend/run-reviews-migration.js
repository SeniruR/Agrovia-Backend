/**
 * Run crop reviews table migration
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const db = require('./config/database');

async function runMigration() {
  let connection;
  try {
    console.log('Running crop_reviews table migration...');
    
    // Get database connection
    connection = await db.getConnection();
    
    // Read the SQL migration file
    const migrationFile = path.join(__dirname, 'migrations', '20250831_create_crop_reviews.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    // Execute the SQL statements
    console.log('Executing SQL migration...');
    await connection.query(sql);
    
    console.log('Migration completed successfully');
    console.log('Created crop_reviews table');
    
    return true;
  } catch (error) {
    console.error('Error running migration:', error);
    return false;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  runMigration()
    .then(success => {
      if (success) {
        console.log('Migration script completed successfully');
        process.exit(0);
      } else {
        console.error('Migration script failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Unhandled error in migration script:', error);
      process.exit(1);
    });
}

module.exports = runMigration;
