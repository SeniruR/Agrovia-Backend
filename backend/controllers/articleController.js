const Article = require('../models/Article');
const { formatResponse } = require('../utils/helpers');

// Create a new article
const createArticle = async (req, res, next) => {
  try {
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);
    console.log('Request user:', req.user);

    const {
      title,
      content,
      category = 'Default'
    } = req.body;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json(
        formatResponse(false, 'Title and content are required')
      );
    }

    // Get user ID from authenticated request
    const userId = req.user.id;
    if (!userId) {
      return res.status(401).json(
        formatResponse(false, 'Authentication required')
      );
    }

    // Process cover image
    let cover_image = null;
    let cover_image_mime = null;
    if (req.files && req.files.cover_image) {
      const coverFile = req.files.cover_image[0];
      cover_image = coverFile.buffer;
      cover_image_mime = coverFile.mimetype;
    }

    // Process content images/figures
    const figures = [];
    if (req.files && req.files.figures) {
      req.files.figures.forEach((file, index) => {
        figures.push({
          name: file.originalname,
          image: file.buffer,
          mime_type: file.mimetype
        });
      });
    }

    // Create article with user_id
    const result = await Article.create({
      title,
      content,
      cover_image,
      cover_image_mime,
      user_id: userId,
      category,
      figures
    });

    res.status(201).json(
      formatResponse(true, 'Article created successfully', { articleId: result.articleId })
    );
  } catch (error) {
    console.error('Article creation error:', error);
    next(error);
  }
};

// Get all articles with filters and pagination
const getArticles = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      author,
      searchTerm
    } = req.query;

    const articles = await Article.getAll({
      page: parseInt(page),
      limit: parseInt(limit),
      category,
      author,
      searchTerm
    });

    res.json(
      formatResponse(true, 'Articles retrieved successfully', { articles })
    );
  } catch (error) {
    next(error);
  }
};

// Get a single article by ID
const getArticleById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const article = await Article.getById(id);

    if (!article) {
      return res.status(404).json(
        formatResponse(false, 'Article not found')
      );
    }

    res.json(
      formatResponse(true, 'Article retrieved successfully', { article })
    );
  } catch (error) {
    next(error);
  }
};

// Update an article
const updateArticle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      category
    } = req.body;

    // Check if article exists and user is author
    const article = await Article.getById(id);
    if (!article) {
      return res.status(404).json(
        formatResponse(false, 'Article not found')
      );
    }

    if (article.author_id !== req.user.id) {
      return res.status(403).json(
        formatResponse(false, 'Not authorized to update this article')
      );
    }

    // Process cover image if provided
    let cover_image = undefined;
    let cover_image_mime = undefined;
    if (req.files && req.files.cover_image) {
      const coverFile = req.files.cover_image[0];
      cover_image = coverFile.buffer;
      cover_image_mime = coverFile.mimetype;
    }

    // Process figures if provided
    let figures = undefined;
    if (req.files && req.files.figures) {
      figures = req.files.figures.map(file => ({
        name: file.originalname,
        image: file.buffer,
        mime_type: file.mimetype
      }));
    }

    await Article.update(id, {
      title,
      content,
      cover_image,
      cover_image_mime,
      category,
      figures
    });

    res.json(
      formatResponse(true, 'Article updated successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Delete an article
const deleteArticle = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if article exists and user is author
    const article = await Article.getById(id);
    if (!article) {
      return res.status(404).json(
        formatResponse(false, 'Article not found')
      );
    }

    if (article.author_id !== req.user.id) {
      return res.status(403).json(
        formatResponse(false, 'Not authorized to delete this article')
      );
    }

    await Article.delete(id);

    res.json(
      formatResponse(true, 'Article deleted successfully')
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createArticle,
  getArticles,
  getArticleById,
  updateArticle,
  deleteArticle
};
