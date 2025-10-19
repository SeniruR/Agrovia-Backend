-- Weather alert system tables
CREATE TABLE IF NOT EXISTS WeatherAlerts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  moderatorId BIGINT UNSIGNED NOT NULL,
  weatherType VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(50) NOT NULL,
  dateIssued DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_weatheralerts_moderator (moderatorId),
  INDEX idx_weatheralerts_severity (severity),
  CONSTRAINT fk_weatheralerts_users FOREIGN KEY (moderatorId)
    REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS WeatherAlertAreas (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  weatherAlertId INT UNSIGNED NOT NULL,
  areaName VARCHAR(255) NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_weatheralertareas_alert (weatherAlertId),
  INDEX idx_weatheralertareas_areaname (areaName),
  CONSTRAINT fk_weatheralertareas_alert FOREIGN KEY (weatherAlertId)
    REFERENCES WeatherAlerts(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
