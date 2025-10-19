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
  status ENUM('active', 'inactive', 'pending', 'rejected', 'deleted', 'sold') DEFAULT 'active',
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

    // Ensure new enum includes 'sold' for existing databases
    const [statusColumn] = await connection.query(`SHOW COLUMNS FROM crop_posts LIKE 'status'`);
    if (statusColumn?.length) {
      const enumDefinition = statusColumn[0].Type || '';
      if (!enumDefinition.includes("'sold'")) {
        await connection.execute(`
          ALTER TABLE crop_posts
          MODIFY COLUMN status ENUM('active', 'inactive', 'pending', 'rejected', 'deleted', 'sold') DEFAULT 'active'
        `);
      }
    }

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS crop_chats (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        crop_id BIGINT UNSIGNED NOT NULL,
        farmer_id BIGINT UNSIGNED NOT NULL,
        buyer_id BIGINT UNSIGNED NOT NULL,
        sender_id BIGINT UNSIGNED NOT NULL,
        message TEXT NOT NULL,
        client_message_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_crop_chats_room (crop_id, farmer_id, buyer_id, created_at),
        INDEX idx_crop_chats_sender (sender_id, created_at),
        CONSTRAINT fk_crop_chats_crop FOREIGN KEY (crop_id) REFERENCES crop_posts(id) ON DELETE CASCADE,
        CONSTRAINT fk_crop_chats_farmer FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_crop_chats_buyer FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_crop_chats_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
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

    // Ensure legacy schemas upgrade product image columns to LONGBLOB
    const [productImageColumn] = await connection.query(`SHOW COLUMNS FROM products LIKE 'image'`);
    if (productImageColumn?.length && productImageColumn[0].Type?.toLowerCase() !== 'longblob') {
      await connection.execute(`ALTER TABLE products MODIFY image LONGBLOB NULL`);
    }

    const [productImagesImageColumn] = await connection.query(`SHOW COLUMNS FROM product_images LIKE 'image'`);
    if (productImagesImageColumn?.length && productImagesImageColumn[0].Type?.toLowerCase() !== 'longblob') {
      await connection.execute(`ALTER TABLE product_images MODIFY image LONGBLOB NULL`);
    }

    // Knowledge article table to store moderator article requests
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS knowledge_article (
        article_id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        status ENUM('draft', 'pending', 'published', 'archived', 'rejected') NOT NULL DEFAULT 'draft',
        requested_by BIGINT UNSIGNED NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        cover_image_blob LONGBLOB,
        cover_image_mime_type VARCHAR(50),
        cover_image_filename VARCHAR(255),
        INDEX idx_requested_by (requested_by),
        CONSTRAINT fk_knowledge_article_requested_by FOREIGN KEY (requested_by)
          REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    const [knowledgeArticleStatusColumn] = await connection.query(`SHOW COLUMNS FROM knowledge_article LIKE 'status'`);
    if (knowledgeArticleStatusColumn?.length && !knowledgeArticleStatusColumn[0].Type.includes('rejected')) {
      await connection.execute(`ALTER TABLE knowledge_article MODIFY COLUMN status ENUM('draft', 'pending', 'published', 'archived', 'rejected') NOT NULL DEFAULT 'draft'`);
    }

    const [requestedByColumn] = await connection.query(`SHOW COLUMNS FROM knowledge_article LIKE 'requested_by'`);
    if (!requestedByColumn?.length) {
      await connection.execute(`ALTER TABLE knowledge_article ADD COLUMN requested_by BIGINT UNSIGNED NULL AFTER status`);
      await connection.execute(`ALTER TABLE knowledge_article ADD INDEX idx_requested_by (requested_by)`);
      await connection.execute(`ALTER TABLE knowledge_article ADD CONSTRAINT fk_knowledge_article_requested_by FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL`);
    } else {
      const columnType = (requestedByColumn[0]?.Type || '').toLowerCase();
      if (!columnType.startsWith('bigint') || !columnType.includes('unsigned')) {
        await connection.execute(`ALTER TABLE knowledge_article MODIFY COLUMN requested_by BIGINT UNSIGNED NULL`);
      }

      const [requestedByIndex] = await connection.query(`SHOW INDEX FROM knowledge_article WHERE Key_name = 'idx_requested_by'`);
      if (!requestedByIndex?.length) {
        try {
          await connection.execute(`ALTER TABLE knowledge_article ADD INDEX idx_requested_by (requested_by)`);
        } catch (err) {
          if (!err.message.includes('Duplicate') && !err.message.includes('already exists')) {
            throw err;
          }
        }
      }

      const [requestedByConstraint] = await connection.query(`
        SELECT CONSTRAINT_NAME
          FROM information_schema.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'knowledge_article'
           AND COLUMN_NAME = 'requested_by'
           AND REFERENCED_TABLE_NAME = 'users'
      `);
      if (!requestedByConstraint?.length) {
        try {
          await connection.execute(`ALTER TABLE knowledge_article ADD CONSTRAINT fk_knowledge_article_requested_by FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL`);
        } catch (err) {
          if (!err.message.includes('Duplicate') && !err.message.includes('already exists')) {
            throw err;
          }
        }
      }
    }

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS knowledge_article_images (
        image_id INT AUTO_INCREMENT PRIMARY KEY,
        article_id INT NOT NULL,
        image_blob LONGBLOB,
        image_mime_type VARCHAR(50),
        image_filename VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (article_id) REFERENCES knowledge_article(article_id) ON DELETE CASCADE
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
