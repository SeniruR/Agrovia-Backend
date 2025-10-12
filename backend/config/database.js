const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  host: 'agrovia-sheharagamage2002-1cc3.c.aivencloud.com',
  user: 'avnadmin',
  password: 'AVNS_iOtAXIKDXzwb0S4k4dm',
  database: 'defaultdb',
  port: 12267,
  ssl: {
    // For development, allow self-signed certificates
    // For production, download the CA certificate from Aiven and use it
    rejectUnauthorized: process.env.NODE_ENV === 'production',
    // ca: fs.readFileSync(path.join(__dirname, '../ca-certificate.pem')),
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    
    // Create tables if they don't exist
    await createTables(connection);
    
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

// Create necessary tables
const createTables = async (connection) => {
  try {
    // Organizations table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS organizations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        committee_number VARCHAR(50) UNIQUE NOT NULL,
        district VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);


    // Users table (no organization_committee_number, no foreign key)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        district VARCHAR(100) NOT NULL,
        nic VARCHAR(20) UNIQUE NOT NULL,
        address VARCHAR(500),
        profile_image VARCHAR(500),
        user_type INT NOT NULL,
        is_verified BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Farmer details table (organization_committee_number foreign key here)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS farmer_details (
        user_id INT PRIMARY KEY,
        land_size DECIMAL(10,2),
        birth_date DATE,
        description TEXT,
        division_gramasewa_number VARCHAR(100),
        organization_committee_number VARCHAR(100),
        farming_experience VARCHAR(50),
        cultivated_crops VARCHAR(100),
        irrigation_system VARCHAR(100),
        soil_type VARCHAR(100),
        farming_certifications TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (organization_committee_number) REFERENCES organizations(committee_number) ON DELETE SET NULL
      )
    `);

    // Disable accounts table (user_id FK to users)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS disable_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        case_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Shop details table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS shop_details (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        shop_name VARCHAR(255) NOT NULL,
        business_registration_number VARCHAR(100),
        shop_address TEXT,
        shop_phone_number VARCHAR(20),
        shop_email VARCHAR(255),
        shop_description TEXT,
        shop_category VARCHAR(100),
        operating_hours VARCHAR(100),
        opening_days VARCHAR(255),
        delivery_areas TEXT,
        shop_license BLOB,
        shop_image BLOB,
        shop_image_mime VARCHAR(45),
        shop_license_mime VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better performance (MySQL compatible way)
    try {
      await connection.execute(`CREATE INDEX idx_users_email ON users(email)`);
    } catch (err) {
      if (!err.message.includes('Duplicate key name')) throw err;
    }
    try {
      await connection.execute(`CREATE INDEX idx_users_user_type ON users(user_type)`);
    } catch (err) {
      if (!err.message.includes('Duplicate key name')) throw err;
    }

    // Crop posts table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS crop_posts (
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
        minimum_quantity_bulk VARCHAR(100) NULL,
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

    // Pest alerts table (basic, no triggers/views/sample data)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS pest_alerts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        crop VARCHAR(255),
        symptoms TEXT,
        location VARCHAR(255),
        severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'low',
        status ENUM('active', 'resolved', 'monitoring', 'escalated') DEFAULT 'active',
        pest_type ENUM('insect', 'disease', 'weed', 'rodent', 'bird', 'other') DEFAULT 'other',
        affected_area DECIMAL(10,2),
        estimated_loss DECIMAL(12,2),
        treatment_applied TEXT,
        recommendations TEXT,
        images JSON,
        weather_conditions JSON,
        priority_score INT DEFAULT 1,
        is_verified BOOLEAN DEFAULT FALSE,
        verified_by INT,
        verification_date DATETIME,
        reported_by INT NOT NULL,
        contact_phone VARCHAR(20),
        contact_email VARCHAR(255),
        follow_up_required BOOLEAN DEFAULT TRUE,
        follow_up_date DATE,
        resolution_notes TEXT,
        tags JSON,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        resolved_at DATETIME,
        INDEX idx_severity_status (severity, status),
        INDEX idx_location (location),
        INDEX idx_crop (crop),
        INDEX idx_pest_type (pest_type),
        INDEX idx_created_at (created_at),
        INDEX idx_priority (priority_score),
        INDEX idx_coordinates (latitude, longitude),
        FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Pest alert updates table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS pest_alert_updates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pest_alert_id INT NOT NULL,
        updated_by INT NOT NULL,
        update_type ENUM('status_change', 'treatment_applied', 'verification', 'escalation', 'resolution') NOT NULL,
        old_value TEXT,
        new_value TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pest_alert_id) REFERENCES pest_alerts(id) ON DELETE CASCADE,
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_pest_alert_updates (pest_alert_id, created_at)
      )
    `);

    // Pest types reference table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS pest_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        category ENUM('insect', 'disease', 'weed', 'rodent', 'bird', 'other') NOT NULL,
        scientific_name VARCHAR(255),
        description TEXT,
        common_symptoms TEXT,
        treatment_methods TEXT,
        prevention_tips TEXT,
        image_url VARCHAR(500),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Bulk seller chat table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS bulk_seller_chat (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        seller_id BIGINT UNSIGNED NOT NULL,
        buyer_id BIGINT UNSIGNED NOT NULL,
        message TEXT NOT NULL,
        sent_by ENUM('seller','buyer') NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_seller_buyer (seller_id, buyer_id),
        INDEX idx_created_at (created_at),
        FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Database tables created/verified successfully');
    // Product categories table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS product_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE
      )
    `);

    // Products table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        brand_name VARCHAR(255),
        description TEXT,
        category_id INT,
        image LONGBLOB,
        image_mime VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (shop_id) REFERENCES shop_details(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE SET NULL
      )
    `);

    // Product inventory table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS product_inventory (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        product_id BIGINT NOT NULL,
        unit_type VARCHAR(50) NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        quantity FLOAT NOT NULL,
        is_available TINYINT(1) DEFAULT 1,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);

    // Product images table (for multiple images per product)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS product_images (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        product_id BIGINT NOT NULL,
        image LONGBLOB,
        image_mime VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);

    // Seed common product categories if not present
    const defaultCategories = ['Seeds', 'Fertilizer', 'Chemical'];
    for (const name of defaultCategories) {
      try {
        await connection.execute('INSERT IGNORE INTO product_categories (name) VALUES (?)', [name]);
      } catch (err) {
        // ignore duplicate or other insertion issues for seed
      }
    }
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
    throw error;
  }
};


// Add getConnection helper for compatibility
const getConnection = async () => {
  return await pool.getConnection();
};

module.exports = {
  pool,
  testConnection,
  execute: pool.execute.bind(pool),
  query: pool.query.bind(pool),
  getConnection
};
