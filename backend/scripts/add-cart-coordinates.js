const mysql = require('mysql2/promise');

const config = {
  host: 'agrovia-sheharagamage2002-1cc3.c.aivencloud.com',
  user: 'avnadmin',
  password: 'AVNS_iOtAXIKDXzwb0S4k4dm',
  database: 'defaultdb',
  port: 12267,
  ssl: {
    rejectUnauthorized: false
  }
};

async function ensureCartCoordinates() {
  let connection;

  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected');

    const ensureColumn = async (columnName, columnDefinition) => {
      const [columns] = await connection.execute(
        'SHOW COLUMNS FROM carts WHERE Field = ?',
        [columnName]
      );

      if (columns.length === 0) {
        console.log(`➕ Adding ${columnName} column...`);
        await connection.execute(
          `ALTER TABLE carts ADD COLUMN ${columnName} ${columnDefinition}`
        );
        console.log(`✅ ${columnName} column added`);
      } else {
        console.log(`ℹ️ ${columnName} column already exists (Type: ${columns[0].Type})`);
      }
    };

    await ensureColumn('latitude', 'DECIMAL(10,8) NULL');
    await ensureColumn('longitude', 'DECIMAL(11,8) NULL');

    console.log('📋 Updated carts table definition:');
    const [structure] = await connection.execute('SHOW COLUMNS FROM carts');
    structure.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type}${col.Null === 'NO' ? ' NOT NULL' : ''}`);
    });

    console.log('🎉 Cart coordinates migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connection closed');
    }
  }
}

ensureCartCoordinates();
