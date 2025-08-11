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

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS articles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        cover_image LONGBLOB,
        cover_image_mime VARCHAR(100),
        user_id INT NOT NULL,
        category VARCHAR(100) DEFAULT 'Default',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Article figures table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS article_figures (
        id INT AUTO_INCREMENT PRIMARY KEY,
        article_id INT NOT NULL,
        figure_name VARCHAR(255) NOT NULL,
        figure_image LONGBLOB NOT NULL,
        figure_mime_type VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
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

    console.log('✅ Database tables created/verified successfully');
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
    throw error;
  }
};

module.exports = {
  pool,
  testConnection
};
