require('dotenv').config();
const { pool } = require('./config/database');
const bcrypt = require('bcrypt');

const sampleData = {
  organizations: [
    {
      name: "Colombo Farmers Association",
      committee_number: "ORG001",
      district: "Colombo"
    },
    {
      name: "Gampaha Agricultural Society",
      committee_number: "ORG002", 
      district: "Gampaha"
    },
    {
      name: "Kandy Organic Farmers Union",
      committee_number: "ORG003",
      district: "Kandy"
    }
  ],
  users: [
    {
      name: "Admin User",
      email: "admin@agrovia.com",
      password: "admin123456",
      contact_number: "0771234567",
      district: "Colombo",
      nic_number: "199012345678",
      role: "admin"
    },
    {
      name: "Sarath Perera",
      email: "farmer@gmail.com",
      password: "farmer123",
      contact_number: "0771234567",
      district: "Colombo",
      nic_number: "199112345679",
      role: "farmer"
    }
  ]
};

const insertSampleData = async () => {
  let connection;
  
  try {
    connection = await pool.getConnection();
    console.log('🔌 Connected to database');

    // Insert organizations
    console.log('📊 Inserting sample organizations...');
    for (const org of sampleData.organizations) {
      try {
        await connection.execute(
          'INSERT INTO organizations (name, committee_number, district) VALUES (?, ?, ?)',
          [org.name, org.committee_number, org.district]
        );
        console.log(`✅ Created organization: ${org.name} (${org.committee_number})`);
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          console.log(`⚠️  Organization ${org.committee_number} already exists`);
        } else {
          throw error;
        }
      }
    }

    // Insert users
    console.log('👥 Inserting sample users...');
    for (const user of sampleData.users) {
      try {
        const hashedPassword = await bcrypt.hash(user.password, 12);
        const userType = user.role === 'admin' ? 3 : 1; // 3 = admin, 1 = farmer
        await connection.execute(
          `INSERT INTO users (full_name, email, password_hash, phone_number, district, nic, user_type, address) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [user.name, user.email, hashedPassword, user.contact_number, user.district, user.nic_number, userType, 'Sample Address, ' + user.district]
        );
        console.log(`✅ Created user: ${user.name} (${user.role})`);
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          console.log(`⚠️  User ${user.email} already exists`);
        } else {
          throw error;
        }
      }
    }

    console.log(`
🎉 Sample data insertion completed!

You can now use these credentials to test the API:

📧 Admin Login:
   Email: admin@agrovia.com
   Password: admin123456

� Farmer Login:
   Email: farmer@gmail.com
   Password: farmer123

�🏢 Available Organizations:
   - ORG001: Colombo Farmers Association
   - ORG002: Gampaha Agricultural Society  
   - ORG003: Kandy Organic Farmers Union

🚀 API Endpoints:
   - Health: http://localhost:5000/api/v1/health
   - Login: POST http://localhost:5000/api/v1/auth/login
   - Organizations: GET http://localhost:5000/api/v1/organizations
    `);

  } catch (error) {
    console.error('❌ Error inserting sample data:', error);
  } finally {
    if (connection) connection.release();
    process.exit(0);
  }
};

insertSampleData();
