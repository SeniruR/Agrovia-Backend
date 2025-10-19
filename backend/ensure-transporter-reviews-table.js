const mysql = require('mysql2/promise');

async function ensureTransporterReviewsTable() {
  let connection;
  try {
    console.log('Checking for transporter_reviews table...');

    connection = await mysql.createConnection({
      host: 'agrovia-sheharagamage2002-1cc3.c.aivencloud.com',
      port: 12267,
      user: 'avnadmin',
      password: 'AVNS_iOtAXIKDXzwb0S4k4dm',
      database: 'defaultdb',
      ssl: { rejectUnauthorized: false }
    });

    const [tableExists] = await connection.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'transporter_reviews'
    `);

    if (tableExists.length === 0) {
      console.log('Creating transporter_reviews table...');
      await connection.query(`
        CREATE TABLE transporter_reviews (
          id INT AUTO_INCREMENT PRIMARY KEY,
          order_transport_id INT NULL,
          order_item_id BIGINT UNSIGNED NOT NULL,
          transporter_id BIGINT UNSIGNED NOT NULL,
          reviewer_id BIGINT UNSIGNED NOT NULL,
          reviewer_role ENUM('buyer','farmer','shop_owner','moderator') DEFAULT 'buyer',
          rating TINYINT UNSIGNED NOT NULL,
          comment TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uniq_reviewer_item_role (order_item_id, reviewer_id, reviewer_role),
          INDEX idx_transporter (transporter_id),
          INDEX idx_order_transport (order_transport_id),
          CONSTRAINT fk_tr_order_transport FOREIGN KEY (order_transport_id)
            REFERENCES order_transports(id) ON DELETE SET NULL,
          CONSTRAINT fk_tr_order_item FOREIGN KEY (order_item_id)
            REFERENCES order_items(id) ON DELETE CASCADE,
          CONSTRAINT fk_tr_transporter FOREIGN KEY (transporter_id)
            REFERENCES transporter_details(id) ON DELETE CASCADE,
          CONSTRAINT fk_tr_reviewer FOREIGN KEY (reviewer_id)
            REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT chk_tr_rating CHECK (rating BETWEEN 1 AND 5)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      console.log('transporter_reviews table created successfully.');
    } else {
      console.log('transporter_reviews table already exists.');
    }

    console.log('Done.');
    process.exit(0);
  } catch (error) {
    console.error('Error ensuring transporter_reviews table:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

if (require.main === module) {
  ensureTransporterReviewsTable();
}

module.exports = ensureTransporterReviewsTable;
