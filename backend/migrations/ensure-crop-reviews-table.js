const db = require('../config/database');

async function ensureCropReviewsTable() {
  let connection;
  try {
    connection = await db.getConnection();
    
    // Check if the crop_reviews table exists
    const checkTableQuery = `
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'crop_reviews'
    `;
    
    const [tableExists] = await connection.execute(checkTableQuery);
    
    if (tableExists.length === 0) {
      console.log("crop_reviews table does not exist, creating it now...");
      
      // Create the crop_reviews table
      const createTableQuery = `
        CREATE TABLE crop_reviews (
          id INT AUTO_INCREMENT PRIMARY KEY,
          crop_id INT NOT NULL,
          buyer_id INT NOT NULL,
          rating INT NOT NULL,
          comment TEXT NOT NULL,
          attachments TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX (crop_id),
          INDEX (buyer_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `;
      
      await connection.execute(createTableQuery);
      console.log("crop_reviews table created successfully");
    } else {
      console.log("crop_reviews table already exists");
    }
    
    // If there's an updated_at column in the existing table, we need to handle it
    // Check if updated_at column exists
    const checkColumnQuery = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'crop_reviews' 
      AND COLUMN_NAME = 'updated_at'
    `;
    
    const [columnExists] = await connection.execute(checkColumnQuery);
    
    if (columnExists.length > 0) {
      console.log("updated_at column exists, dropping it...");
      
      // Drop the updated_at column
      const dropColumnQuery = `
        ALTER TABLE crop_reviews
        DROP COLUMN updated_at
      `;
      
      await connection.execute(dropColumnQuery);
      console.log("updated_at column dropped successfully");
    }
    
    console.log("Table check completed successfully");
  } catch (error) {
    console.error("Error ensuring crop_reviews table:", error);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Run the function
ensureCropReviewsTable()
  .then(() => {
    console.log("Finished ensuring crop_reviews table");
    process.exit(0);
  })
  .catch(err => {
    console.error("Failed to ensure crop_reviews table:", err);
    process.exit(1);
  });
