-- Migration: create bulk_seller_chat table
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
);
