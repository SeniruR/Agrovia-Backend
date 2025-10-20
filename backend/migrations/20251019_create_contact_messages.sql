-- Migration: create contact_messages table
CREATE TABLE IF NOT EXISTS contact_messages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(25),
  type ENUM('feedback','support') NOT NULL,
  category VARCHAR(255),
  message TEXT NOT NULL,
  anonymous BOOLEAN DEFAULT FALSE,
  source VARCHAR(100) DEFAULT 'web',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_contact_type (type),
  INDEX idx_contact_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
