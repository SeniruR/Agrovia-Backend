const { pool } = require('../config/database');

async function recreateCropPostsTable() {
  try {
    console.log('🗑️ Dropping existing crop_posts table...');
    await pool.execute('DROP TABLE IF EXISTS crop_posts');
    console.log('✅ Table dropped successfully');

    console.log('🔄 Creating new crop_posts table...');
    await pool.execute(`
      CREATE TABLE crop_posts (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        farmer_id BIGINT UNSIGNED NOT NULL,
        crop_name VARCHAR(100) NOT NULL,
        crop_category ENUM('vegetables', 'grains') NOT NULL,
        variety VARCHAR(100),
        quantity DECIMAL(10,2) NOT NULL,
        unit ENUM('kg', 'g', 'tons', 'bags', 'pieces', 'bunches') NOT NULL,
        price_per_unit DECIMAL(10,2) NOT NULL,
        harvest_date DATE NOT NULL,
        expiry_date DATE,
        location VARCHAR(500) NOT NULL,
        district VARCHAR(100) NOT NULL,
        description TEXT,
        organic_certified BOOLEAN DEFAULT FALSE,
        pesticide_free BOOLEAN DEFAULT FALSE,
        freshly_harvested BOOLEAN DEFAULT FALSE,
        contact_number VARCHAR(20) NOT NULL,
        email VARCHAR(255),
        images JSON,
        status ENUM('active', 'inactive', 'pending', 'rejected', 'deleted') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_farmer_id (farmer_id),
        INDEX idx_category (crop_category),
        INDEX idx_district (district),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at),
        FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Table created successfully');

    console.log('🎉 crop_posts table recreated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error recreating table:', error.message);
    process.exit(1);
  }
}

recreateCropPostsTable();
