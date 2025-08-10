-- Create articles table
CREATE TABLE IF NOT EXISTS articles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  cover_image LONGBLOB,
  cover_image_mime VARCHAR(50),
  author_id INT NOT NULL,
  category VARCHAR(50) DEFAULT 'Default',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

-- Create article figures table
CREATE TABLE IF NOT EXISTS article_figures (
  id INT AUTO_INCREMENT PRIMARY KEY,
  article_id INT NOT NULL,
  figure_name VARCHAR(255) NOT NULL,
  figure_image LONGBLOB NOT NULL,
  figure_mime_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- Add indexes for better performance
CREATE INDEX idx_articles_author ON articles(author_id);
CREATE INDEX idx_articles_category ON articles(category);
CREATE INDEX idx_articles_created ON articles(created_at);
CREATE INDEX idx_figures_article ON article_figures(article_id);
