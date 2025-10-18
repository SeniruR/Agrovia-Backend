const express = require('express');
const multer = require('multer');

const createArticleController = require('../controllers/createArticleController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 8 * 1024 * 1024, // 8 MB per file
		files: 12,
	},
});

const uploadFields = upload.fields([
	{ name: 'coverImage', maxCount: 1 },
	{ name: 'supportingImages', maxCount: 10 },
]);

router.post(
	'/',
	authenticate,
	authorize(['moderator', 'main_moderator', 'admin']),
	uploadFields,
	createArticleController.createArticle,
);

router.get(
	'/',
	authenticate,
	authorize(['moderator', 'main_moderator', 'admin']),
	createArticleController.getAllArticles,
);

router.get(
	'/:articleId',
	authenticate,
	authorize(['moderator', 'main_moderator', 'admin']),
	createArticleController.getArticleById,
);

router.put(
	'/:articleId',
	authenticate,
	authorize(['moderator', 'main_moderator', 'admin']),
	uploadFields,
	createArticleController.updateArticle,
);

router.delete(
	'/:articleId',
	authenticate,
	authorize(['moderator', 'main_moderator', 'admin']),
	createArticleController.deleteArticle,
);

router.delete(
	'/:articleId/supporting-images/:imageId',
	authenticate,
	authorize(['moderator', 'main_moderator', 'admin']),
	createArticleController.deleteSupportingImage,
);

module.exports = router;
