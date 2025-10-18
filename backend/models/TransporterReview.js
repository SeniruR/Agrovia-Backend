const { pool } = require('../config/database');

class TransporterReview {
  static async createOrUpdate({
    order_transport_id = null,
    order_item_id,
    transporter_id,
    reviewer_id,
    reviewer_role = 'buyer',
    rating,
    comment = null
  }) {
    const sql = `
      INSERT INTO transporter_reviews (
        order_transport_id,
        order_item_id,
        transporter_id,
        reviewer_id,
        reviewer_role,
        rating,
        comment
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        rating = VALUES(rating),
        comment = VALUES(comment),
        updated_at = CURRENT_TIMESTAMP
    `;

    const params = [
      order_transport_id,
      order_item_id,
      transporter_id,
      reviewer_id,
      reviewer_role,
      rating,
      comment
    ];

    await pool.execute(sql, params);

    return this.findByOrderItemAndReviewer(order_item_id, reviewer_id, reviewer_role);
  }

  static async findByOrderItemAndReviewer(orderItemId, reviewerId, reviewerRole = 'buyer') {
    const [rows] = await pool.execute(
      `SELECT * FROM transporter_reviews WHERE order_item_id = ? AND reviewer_id = ? AND reviewer_role = ?`,
      [orderItemId, reviewerId, reviewerRole]
    );
    return rows[0] || null;
  }

  static async findByTransporter(transporterId) {
    const [rows] = await pool.execute(
      `SELECT * FROM transporter_reviews WHERE transporter_id = ? ORDER BY created_at DESC`,
      [transporterId]
    );
    return rows;
  }

  static async getSummaryForTransporter(transporterId) {
    const [rows] = await pool.execute(
      `SELECT 
         transporter_id,
         COUNT(*) AS review_count,
         AVG(rating) AS average_rating,
         MAX(updated_at) AS last_updated
       FROM transporter_reviews
       WHERE transporter_id = ?
       GROUP BY transporter_id`,
      [transporterId]
    );
    return rows[0] || { transporter_id: transporterId, review_count: 0, average_rating: null, last_updated: null };
  }
}

module.exports = TransporterReview;
