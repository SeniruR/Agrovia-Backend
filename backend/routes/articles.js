const express = require('express');
const { authenticate } = require('../middleware/auth');
const { uploadMemory } = require('../config/upload');
const {
  createArticle,
  getArticles,
  getArticleById,
  updateArticle,
  deleteArticle
} = require('../controllers/articleController');

const router = express.Router();

// Configure multer for article files
const articleUpload = uploadMemory.fields([
  { name: 'cover_image', maxCount: 1 },
  { name: 'figures', maxCount: 10 } // Limit to 10 figures per article
]);

// Public routes
router.get('/', getArticles);
router.get('/:id', getArticleById);

// Protected routes
router.post('/',
  authenticate,
  articleUpload,
  createArticle
);

router.put('/:id',
  authenticate,
  articleUpload,
  updateArticle
);

router.delete('/:id',
  authenticate,
  deleteArticle
);

module.exports = router;
