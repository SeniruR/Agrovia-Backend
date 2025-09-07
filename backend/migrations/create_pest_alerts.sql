
-- Enhanced Migration: Create comprehensive pest_alerts table
CREATE TABLE IF NOT EXISTS pest_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    crop VARCHAR(255),
    symptoms TEXT,
    location VARCHAR(255),
    severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'low',
    status ENUM('active', 'resolved', 'monitoring', 'escalated') DEFAULT 'active',
    pest_type ENUM('insect', 'disease', 'weed', 'rodent', 'bird', 'other') DEFAULT 'other',
    affected_area DECIMAL(10,2) COMMENT 'Area in hectares',
    estimated_loss DECIMAL(12,2) COMMENT 'Estimated financial loss',
    treatment_applied TEXT COMMENT 'Treatment or action taken',
    recommendations TEXT,
    images JSON COMMENT 'Array of image URLs',
    weather_conditions JSON COMMENT 'Weather data when reported',
    priority_score INT DEFAULT 1 COMMENT 'Calculated priority (1-10)',
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by INT,
    verification_date DATETIME,
    reported_by INT NOT NULL,
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    follow_up_required BOOLEAN DEFAULT TRUE,
    follow_up_date DATE,
    resolution_notes TEXT,
    tags JSON COMMENT 'Array of tags for categorization',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    
    -- Indexes for better performance
    INDEX idx_severity_status (severity, status),
    INDEX idx_location (location),
    INDEX idx_crop (crop),
    INDEX idx_pest_type (pest_type),
    INDEX idx_created_at (created_at),
    INDEX idx_priority (priority_score),
    INDEX idx_coordinates (latitude, longitude),
    
    -- Foreign key constraints
    FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create pest_alert_updates table for tracking changes
CREATE TABLE IF NOT EXISTS pest_alert_updates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pest_alert_id INT NOT NULL,
    updated_by INT NOT NULL,
    update_type ENUM('status_change', 'treatment_applied', 'verification', 'escalation', 'resolution') NOT NULL,
    old_value TEXT,
    new_value TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (pest_alert_id) REFERENCES pest_alerts(id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_pest_alert_updates (pest_alert_id, created_at)
);

-- Create pest_types reference table
CREATE TABLE IF NOT EXISTS pest_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    category ENUM('insect', 'disease', 'weed', 'rodent', 'bird', 'other') NOT NULL,
    scientific_name VARCHAR(255),
    description TEXT,
    common_symptoms TEXT,
    treatment_methods TEXT,
    prevention_tips TEXT,
    image_url VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert some common pest types
INSERT INTO pest_types (name, category, scientific_name, description, common_symptoms, treatment_methods, prevention_tips) VALUES
('Brown Planthopper', 'insect', 'Nilaparvata lugens', 'A major rice pest that causes hopperburn', 'Yellowing and drying of rice plants, stunted growth', 'Insecticide spraying, biological control agents', 'Proper water management, resistant varieties'),
('Blast Disease', 'disease', 'Magnaporthe oryzae', 'Fungal disease affecting rice crops', 'Leaf spots, neck blast, panicle blast', 'Fungicide application, resistant varieties', 'Proper spacing, balanced fertilization'),
('Stem Borer', 'insect', 'Chilo suppressalis', 'Larval stage bores into rice stems', 'Dead hearts, white heads, damaged stems', 'Pheromone traps, biological control', 'Early planting, field sanitation'),
('Bacterial Blight', 'disease', 'Xanthomonas oryzae', 'Bacterial infection in rice', 'Water-soaked lesions, yellowing leaves', 'Copper-based bactericides, resistant varieties', 'Clean seed, proper drainage');

-- Create a view for comprehensive pest alert information
CREATE VIEW pest_alerts_detailed AS
SELECT 
    pa.*,
    u.full_name as reporter_name,
    u.email as reporter_email,
    v.full_name as verifier_name,
    pt.name as pest_type_name,
    pt.scientific_name,
    pt.treatment_methods as suggested_treatments,
    CASE 
        WHEN pa.severity = 'critical' THEN 10
        WHEN pa.severity = 'high' THEN 7
        WHEN pa.severity = 'medium' THEN 4
        ELSE 1
    END as calculated_priority,
    DATEDIFF(CURRENT_DATE, DATE(pa.created_at)) as days_since_reported
FROM pest_alerts pa
LEFT JOIN users u ON pa.reported_by = u.id
LEFT JOIN users v ON pa.verified_by = v.id
LEFT JOIN pest_types pt ON pt.name = pa.pest_type OR pt.category = pa.pest_type;

-- Trigger to update priority score based on various factors
DELIMITER //
CREATE TRIGGER calculate_priority_score 
BEFORE UPDATE ON pest_alerts
FOR EACH ROW
BEGIN
    SET NEW.priority_score = (
        CASE NEW.severity
            WHEN 'critical' THEN 8
            WHEN 'high' THEN 6
            WHEN 'medium' THEN 4
            ELSE 2
        END
        +
        CASE NEW.status
            WHEN 'escalated' THEN 3
            WHEN 'active' THEN 2
            WHEN 'monitoring' THEN 1
            ELSE 0
        END
        +
        CASE 
            WHEN NEW.affected_area > 10 THEN 2
            WHEN NEW.affected_area > 5 THEN 1
            ELSE 0
        END
    );
END//
DELIMITER ;
