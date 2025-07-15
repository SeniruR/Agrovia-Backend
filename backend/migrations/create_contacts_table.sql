-- Create contacts table for storing contact form submissions
CREATE TABLE IF NOT EXISTS contacts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    user_type ENUM('farmer', 'buyer', 'supplier', 'logistics', 'organization', 'other') NOT NULL,
    user_id INT NULL,
    status ENUM('pending', 'in_progress', 'resolved') DEFAULT 'pending',
    responded_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (responded_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Indexes for better performance
    INDEX idx_status (status),
    INDEX idx_user_type (user_type),
    INDEX idx_created_at (created_at),
    INDEX idx_email (email),
    INDEX idx_user_id (user_id)
);

-- Insert sample data for testing (optional)
INSERT INTO contacts (name, email, phone, subject, message, user_type, status) VALUES
('John Farmer', 'john@example.com', '+94771234567', 'Need help with crop pricing', 'I need assistance with understanding the current market prices for rice. Can someone help me?', 'farmer', 'pending'),
('Mary Buyer', 'mary@company.com', '+94771234568', 'Bulk purchase inquiry', 'I am interested in purchasing large quantities of vegetables. Please contact me.', 'buyer', 'in_progress'),
('Support Test', 'support@test.com', '+94771234569', 'Platform feedback', 'The platform is great! Just wanted to provide some positive feedback.', 'other', 'resolved');
