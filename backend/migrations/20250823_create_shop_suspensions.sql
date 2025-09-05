-- Migration: create shop_suspensions and shop_suspension_items

CREATE TABLE IF NOT EXISTS shop_suspensions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shop_id INT NOT NULL,
  action ENUM('suspend','activate') NOT NULL,
  reason_code VARCHAR(64) NOT NULL,
  reason_detail TEXT DEFAULT NULL,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shop_id) REFERENCES shop_details(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS shop_suspension_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  suspension_id INT NOT NULL,
  product_id INT NOT NULL,
  note TEXT DEFAULT NULL,
  FOREIGN KEY (suspension_id) REFERENCES shop_suspensions(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
