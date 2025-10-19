const CreateArticleModel = require('../models/CreateArticleModel');

const ALLOWED_STATUSES = new Set(['draft', 'pending', 'published', 'archived', 'rejected']);

const buildCoverImagePayload = (file) => {
	if (!file) return null;
	return {
		buffer: file.buffer,
		mimeType: file.mimetype,
		filename: file.originalname,
	};
};

const buildSupportingImagePayload = (files = []) =>
	files.map((file) => ({
		buffer: file.buffer,
		mimeType: file.mimetype,
		filename: file.originalname,
	}));

exports.createArticle = async (req, res) => {
	try {
		const { title, description, status } = req.body;
		const requestedBy = req.user?.id ?? null;

		if (!title || !title.toString().trim()) {
			return res.status(400).json({
				success: false,
				message: 'Title is required.',
			});
		}

		if (!description || !description.toString().trim()) {
			return res.status(400).json({
				success: false,
				message: 'Description is required.',
			});
		}

		const coverFile = req.files?.coverImage?.[0];
		if (!coverFile) {
			return res.status(400).json({
				success: false,
				message: 'Cover image is required.',
			});
		}

		const articleStatus = status && ALLOWED_STATUSES.has(status) ? status : 'pending';

		const article = await CreateArticleModel.createArticle({
			title: title.trim(),
			description: description.trim(),
			status: articleStatus,
			requestedBy,
			coverImage: buildCoverImagePayload(coverFile),
			supportingImages: buildSupportingImagePayload(req.files?.supportingImages),
		});

		return res.status(201).json({
			success: true,
			message: 'Article request submitted successfully.',
			data: article,
		});
	} catch (error) {
		console.error('Error creating article:', error);
		return res.status(500).json({
			success: false,
			message: 'Failed to create article request.',
			error: process.env.NODE_ENV === 'development' ? error.message : undefined,
		});
	}
};

exports.getAllArticles = async (req, res) => {
	try {
		const shouldScopeToUser = req.user?.role === 'moderator';
		const articles = await CreateArticleModel.getAllArticles({
			requestedBy: shouldScopeToUser ? req.user.id : null,
		});
		return res.status(200).json({
			success: true,
			data: articles,
		});
	} catch (error) {
		console.error('Error fetching articles:', error);
		return res.status(500).json({
			success: false,
			message: 'Failed to fetch articles.',
		});
	}
};

exports.getArticleById = async (req, res) => {
	try {
		const { articleId } = req.params;
		const article = await CreateArticleModel.getArticleById(articleId);

		if (!article) {
			return res.status(404).json({
				success: false,
				message: 'Article not found.',
			});
		}

		const isModerator = req.user?.role === 'moderator';
		if (isModerator && article.requestedBy !== req.user.id) {
			return res.status(403).json({
				success: false,
				message: 'You do not have permission to view this article.',
			});
		}

		return res.status(200).json({
			success: true,
			data: article,
		});
	} catch (error) {
		console.error('Error fetching article by id:', error);
		return res.status(500).json({
			success: false,
			message: 'Failed to fetch article.',
		});
	}
};

exports.updateArticle = async (req, res) => {
	try {
		const { articleId } = req.params;
		const { title, description, status, removeImageIds } = req.body;
		const existingArticle = await CreateArticleModel.getArticleById(articleId);

		if (!existingArticle) {
			return res.status(404).json({
				success: false,
				message: 'Article not found.',
			});
		}

		const userRole = req.user?.role || null;
		const userId = req.user?.id != null ? Number(req.user.id) : null;
		const isModerator = userRole === 'moderator';
		const isOwner = existingArticle.requestedBy != null && userId != null && Number(existingArticle.requestedBy) === userId;

		if (isModerator) {
			if (!isOwner) {
				return res.status(403).json({
					success: false,
					message: 'You can only modify article requests you created.',
				});
			}
			if (existingArticle.status !== 'pending') {
				return res.status(400).json({
					success: false,
					message: 'Only pending article requests can be edited.',
				});
			}
		}

		if (status && ['published', 'rejected'].includes(status) && !['main_moderator', 'admin'].includes(userRole)) {
			return res.status(403).json({
				success: false,
				message: 'Only main moderators or administrators can approve or reject article requests.',
			});
		}

		let removeIds = [];
		if (removeImageIds) {
			if (Array.isArray(removeImageIds)) {
				removeIds = removeImageIds.map((id) => Number(id)).filter(Number.isFinite);
			} else if (typeof removeImageIds === 'string') {
				try {
					const parsed = JSON.parse(removeImageIds);
					if (Array.isArray(parsed)) {
						removeIds = parsed.map((id) => Number(id)).filter(Number.isFinite);
					} else if (!Number.isNaN(Number(removeImageIds))) {
						removeIds = [Number(removeImageIds)];
					}
				} catch (err) {
					if (!Number.isNaN(Number(removeImageIds))) {
						removeIds = [Number(removeImageIds)];
					}
				}
			}
		}

		const coverFile = req.files?.coverImage?.[0];

		let nextStatus;
		if (status && ALLOWED_STATUSES.has(status)) {
			if (isModerator) {
				if (status !== existingArticle.status) {
					return res.status(403).json({
						success: false,
						message: 'Moderators cannot change the status of their article requests.',
					});
				}
				nextStatus = undefined;
			} else {
				nextStatus = status;
			}
		}

		const updated = await CreateArticleModel.updateArticle(articleId, {
			title: title?.trim(),
			description: description?.trim(),
			status: nextStatus,
			coverImage: buildCoverImagePayload(coverFile),
			newSupportingImages: buildSupportingImagePayload(req.files?.supportingImages),
			removeSupportingImageIds: removeIds,
		});

		return res.status(200).json({
			success: true,
			message: 'Article updated successfully.',
			data: updated,
		});
	} catch (error) {
		console.error('Error updating article:', error);
		return res.status(500).json({
			success: false,
			message: 'Failed to update article.',
			error: process.env.NODE_ENV === 'development' ? error.message : undefined,
		});
	}
};

exports.deleteArticle = async (req, res) => {
	try {
		const { articleId } = req.params;
		const existingArticle = await CreateArticleModel.getArticleById(articleId);

		if (!existingArticle) {
			return res.status(404).json({
				success: false,
				message: 'Article not found.',
			});
		}

		const userRole = req.user?.role || null;
		const userId = req.user?.id != null ? Number(req.user.id) : null;
		const isModerator = userRole === 'moderator';
		const isOwner = existingArticle.requestedBy != null && userId != null && Number(existingArticle.requestedBy) === userId;

		if (isModerator) {
			if (!isOwner) {
				return res.status(403).json({
					success: false,
					message: 'You can only delete article requests you created.',
				});
			}
			if (existingArticle.status !== 'pending') {
				return res.status(400).json({
					success: false,
					message: 'Only pending article requests can be deleted.',
				});
			}
		}
		const deleted = await CreateArticleModel.deleteArticle(articleId);

		if (!deleted) {
			return res.status(404).json({
				success: false,
				message: 'Article not found.',
			});
		}

		return res.status(200).json({
			success: true,
			message: 'Article deleted successfully.',
		});
	} catch (error) {
		console.error('Error deleting article:', error);
		return res.status(500).json({
			success: false,
			message: 'Failed to delete article.',
		});
	}
};

exports.deleteSupportingImage = async (req, res) => {
	try {
		const { articleId, imageId } = req.params;
		const existingArticle = await CreateArticleModel.getArticleById(articleId);

		if (!existingArticle) {
			return res.status(404).json({
				success: false,
				message: 'Article not found.',
			});
		}

		const userRole = req.user?.role || null;
		const userId = req.user?.id != null ? Number(req.user.id) : null;
		const isModerator = userRole === 'moderator';
		const isOwner = existingArticle.requestedBy != null && userId != null && Number(existingArticle.requestedBy) === userId;

		if (isModerator) {
			if (!isOwner) {
				return res.status(403).json({
					success: false,
					message: 'You can only remove images from article requests you created.',
				});
			}
			if (existingArticle.status !== 'pending') {
				return res.status(400).json({
					success: false,
					message: 'Only pending article requests can be modified.',
				});
			}
		}
		const deleted = await CreateArticleModel.deleteSupportingImage(articleId, imageId);

		if (!deleted) {
			return res.status(404).json({
				success: false,
				message: 'Supporting image not found.',
			});
		}

		return res.status(200).json({
			success: true,
			message: 'Supporting image removed successfully.',
		});
	} catch (error) {
		console.error('Error deleting supporting image:', error);
		return res.status(500).json({
			success: false,
			message: 'Failed to delete supporting image.',
		});
	}
};

exports.getPublishedArticlesPublic = async (_req, res) => {
	try {
		const articles = await CreateArticleModel.getPublishedArticles();
		return res.status(200).json({
			success: true,
			data: articles,
		});
	} catch (error) {
		console.error('Error fetching published articles:', error);
		return res.status(500).json({
			success: false,
			message: 'Failed to fetch published articles.',
		});
	}
};

exports.getPublishedArticleByIdPublic = async (req, res) => {
	try {
		const { articleId } = req.params;
		const article = await CreateArticleModel.getPublishedArticleById(articleId);

		if (!article) {
			return res.status(404).json({
				success: false,
				message: 'Article not found.',
			});
		}

		return res.status(200).json({
			success: true,
			data: article,
		});
	} catch (error) {
		console.error('Error fetching published article:', error);
		return res.status(500).json({
			success: false,
			message: 'Failed to fetch article.',
		});
	}
};
