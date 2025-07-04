const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
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

    // Users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        contact_number VARCHAR(20) NOT NULL,
        district VARCHAR(100) NOT NULL,
        land_size DECIMAL(10,2),
        nic_number VARCHAR(20) UNIQUE NOT NULL,
        role ENUM('farmer', 'organization_committee_member', 'admin', 'moderator', 'viewer') NOT NULL,
        organization_committee_number VARCHAR(50),
        certificate_path VARCHAR(500),
        is_verified BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_committee_number) REFERENCES organizations(committee_number) ON DELETE SET NULL
      )
    `);

    // Create indexes for better performance (MySQL compatible way)
    try {
      await connection.execute(`CREATE INDEX idx_users_email ON users(email)`);
    } catch (err) {
      if (!err.message.includes('Duplicate key name')) throw err;
    }
    
    try {
      await connection.execute(`CREATE INDEX idx_users_role ON users(role)`);
    } catch (err) {
      if (!err.message.includes('Duplicate key name')) throw err;
    }
    
    try {
      await connection.execute(`CREATE INDEX idx_users_organization ON users(organization_committee_number)`);
    } catch (err) {
      if (!err.message.includes('Duplicate key name')) throw err;
    }

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
