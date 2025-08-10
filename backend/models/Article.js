const { pool } = require('../config/database');

class Article {
  // Create a new article
  static async create(articleData) {
    const {
      title,
      content,
      cover_image,
      cover_image_mime,
      user_id,  // Add user_id
      category = 'Default',
      figures = []
    } = articleData;

    try {
      // First verify that the user exists and has appropriate user_type
      const [users] = await pool.execute(
        'SELECT user_type FROM users WHERE id = ?',
        [user_id]
      );

      if (users.length === 0) {
        throw new Error('User not found');
      }

      const user = users[0];
      // Verify user_type - add your specific user type conditions here
      // For example, if only moderators can create articles:
      // if (user.user_type !== 'moderator') {
      //   throw new Error('User not authorized to create articles');
      // }

      // Start transaction
      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        // Insert main article
        const [articleResult] = await connection.execute(
          `INSERT INTO articles (
            title, content, cover_image, cover_image_mime,
            user_id, category, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [title, content, cover_image, cover_image_mime, user_id, category]
        );

        const articleId = articleResult.insertId;

        // Insert figures if any
        if (figures.length > 0) {
          const figureValues = figures.map(figure => [
            articleId,
            figure.name,
            figure.image,
            figure.mime_type
          ]);

          await connection.query(
            `INSERT INTO article_figures (
              article_id, figure_name, figure_image, figure_mime_type
            ) VALUES ?`,
            [figureValues]
          );
        }

        await connection.commit();
        return { articleId };
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    } catch (error) {
      throw error;
    }
  }

  // Get articles with pagination and filters
  static async getAll(options = {}) {
    const {
      page = 1,
      limit = 10,
      category,
      author,
      searchTerm
    } = options;

    const offset = (page - 1) * limit;
    let query = `
      SELECT 
        a.id, a.title, a.content, a.cover_image, a.cover_image_mime,
        a.category, a.created_at, a.user_id,
        u.full_name as author_name, u.user_type,
        COUNT(f.id) as figure_count
      FROM articles a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN article_figures f ON a.id = f.article_id
    `;

    const whereConditions = [];
    const params = [];

    if (category) {
      whereConditions.push('a.category = ?');
      params.push(category);
    }

    // Removed author filter since we no longer have author_id

    if (searchTerm) {
      whereConditions.push('(a.title LIKE ? OR a.content LIKE ?)');
      params.push(`%${searchTerm}%`, `%${searchTerm}%`);
    }

    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }

    query += ' GROUP BY a.id ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    try {
      const [rows] = await pool.execute(query, params);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Get a single article by ID with its figures
  static async getById(id) {
    try {
      // Get article with user info
      const [articles] = await pool.execute(
        `SELECT 
          a.*,
          u.full_name as author_name,
          u.user_type
        FROM articles a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE a.id = ?`,
        [id]
      );

      if (articles.length === 0) return null;

      const article = articles[0];

      // Get figures
      const [figures] = await pool.execute(
        'SELECT * FROM article_figures WHERE article_id = ?',
        [id]
      );

      return { ...article, figures };
    } catch (error) {
      throw error;
    }
  }

  // Update an article
  static async update(id, articleData) {
    const {
      title,
      content,
      cover_image,
      cover_image_mime,
      category,
      figures = []
    } = articleData;

    try {
      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        // Update main article
        const updateFields = [];
        const updateValues = [];

        if (title !== undefined) {
          updateFields.push('title = ?');
          updateValues.push(title);
        }
        if (content !== undefined) {
          updateFields.push('content = ?');
          updateValues.push(content);
        }
        if (cover_image !== undefined) {
          updateFields.push('cover_image = ?');
          updateValues.push(cover_image);
        }
        if (cover_image_mime !== undefined) {
          updateFields.push('cover_image_mime = ?');
          updateValues.push(cover_image_mime);
        }
        if (category !== undefined) {
          updateFields.push('category = ?');
          updateValues.push(category);
        }

        if (updateFields.length > 0) {
          await connection.execute(
            `UPDATE articles SET ${updateFields.join(', ')} WHERE id = ?`,
            [...updateValues, id]
          );
        }

        // Update figures if provided
        if (figures.length > 0) {
          // Delete existing figures
          await connection.execute(
            'DELETE FROM article_figures WHERE article_id = ?',
            [id]
          );

          // Insert new figures
          const figureValues = figures.map(figure => [
            id,
            figure.name,
            figure.image,
            figure.mime_type
          ]);

          await connection.query(
            `INSERT INTO article_figures (
              article_id, figure_name, figure_image, figure_mime_type
            ) VALUES ?`,
            [figureValues]
          );
        }

        await connection.commit();
        return true;
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    } catch (error) {
      throw error;
    }
  }

  // Delete an article
  static async delete(id) {
    try {
      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        // Delete figures first
        await connection.execute(
          'DELETE FROM article_figures WHERE article_id = ?',
          [id]
        );

        // Delete article
        await connection.execute(
          'DELETE FROM articles WHERE id = ?',
          [id]
        );

        await connection.commit();
        return true;
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Article;
