const db = require('./config/database');

async function ensureCropReviewsTable() {
  let connection;
  try {
    console.log('Checking for crop_reviews table...');
    
    // Get connection from the pool
    connection = await db.getConnection();
    
    // Check if the table exists
    const [tableExists] = await connection.execute(`
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'crop_reviews'
    `);
    
    if (tableExists.length === 0) {
      console.log('Creating crop_reviews table...');
      
      // Create the table
      await connection.execute(`
        CREATE TABLE crop_reviews (
          id INT AUTO_INCREMENT PRIMARY KEY,
          crop_id INT NOT NULL,
          buyer_id INT NOT NULL,
          rating INT NOT NULL,
          comment TEXT NOT NULL,
          attachments TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX (crop_id),
          INDEX (buyer_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      
      console.log('crop_reviews table created successfully');
    } else {
      console.log('crop_reviews table already exists');
      
      // Check if the updated_at column exists
      const [updatedAtExists] = await connection.execute(`
        SHOW COLUMNS FROM crop_reviews LIKE 'updated_at'
      `);
      
      if (updatedAtExists.length === 0) {
        console.log('Adding updated_at column to crop_reviews table...');
        
        // Add the updated_at column
        await connection.execute(`
          ALTER TABLE crop_reviews 
          ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        `);
        
        console.log('Added updated_at column successfully');
      } else {
        console.log('updated_at column already exists');
      }
    }
    
    console.log('Done');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Run the function
ensureCropReviewsTable();
