-- Create crop_reviews table if it doesn't exist
CREATE TABLE IF NOT EXISTS crop_reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  crop_id INT NOT NULL,
  buyer_id INT NOT NULL,
  rating INT NOT NULL,
  comment TEXT NOT NULL,
  attachments TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (crop_id),
  INDEX (buyer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
