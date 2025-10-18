const { pool } = require('../config/database');

const formatCoverImage = (row, includeBinary = false) => {
	if (!row.cover_image_blob) {
		return includeBinary
			? { hasImage: false, data: null, mimeType: null, filename: null }
			: { hasImage: false, mimeType: null, filename: null };
	}

	const base = {
		hasImage: true,
		mimeType: row.cover_image_mime_type,
		filename: row.cover_image_filename,
	};

	if (!includeBinary) {
		return base;
	}

	return {
		...base,
		data: row.cover_image_blob.toString('base64'),
	};
};

const formatSupportingImage = (row, includeBinary = false) => {
	const image = {
		imageId: row.image_id,
		mimeType: row.image_mime_type,
		filename: row.image_filename,
		createdAt: row.created_at,
	};

	if (includeBinary && row.image_blob) {
		image.data = row.image_blob.toString('base64');
	}

	return image;
};

const formatArticleRow = (row, options = {}) => {
	const { includeCoverBinary = false, includeSupportImages = false, supportingRows = [] } = options;

	return {
		articleId: row.article_id,
		title: row.title,
		description: row.description,
		status: row.status,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		requestedBy: row.requested_by != null ? Number(row.requested_by) : null,
		coverImage: formatCoverImage(row, includeCoverBinary),
		supportingImages: includeSupportImages
			? supportingRows.map((imageRow) => formatSupportingImage(imageRow, includeCoverBinary))
			: undefined,
	};
};

class CreateArticleModel {
	static async createArticle({
		title,
		description,
		status = 'pending',
		coverImage,
		supportingImages = [],
		requestedBy = null,
	}) {
		const connection = await pool.getConnection();

		try {
			await connection.beginTransaction();

			const [result] = await connection.execute(
				`INSERT INTO knowledge_article
					(title, description, status, requested_by, cover_image_blob, cover_image_mime_type, cover_image_filename)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`,
				[
					title,
					description,
					status,
					requestedBy,
					coverImage?.buffer || null,
					coverImage?.mimeType || null,
					coverImage?.filename || null,
				],
			);

			const articleId = result.insertId;

			if (supportingImages.length > 0) {
				const insertQuery = `
					INSERT INTO knowledge_article_images
						(article_id, image_blob, image_mime_type, image_filename)
					VALUES (?, ?, ?, ?)
				`;

				for (const image of supportingImages) {
					await connection.execute(insertQuery, [
						articleId,
						image.buffer,
						image.mimeType,
						image.filename,
					]);
				}
			}

			await connection.commit();

			return await this.getArticleById(articleId);
		} catch (error) {
			await connection.rollback();
			throw error;
		} finally {
			connection.release();
		}
	}

	static async getAllArticles(options = {}) {
		const { requestedBy = null } = options;

		let query = `SELECT article_id, title, description, status, created_at, updated_at,
						cover_image_blob, cover_image_mime_type, cover_image_filename, requested_by
				 FROM knowledge_article`;
		const params = [];

		if (requestedBy) {
			query += ' WHERE requested_by = ?';
			params.push(requestedBy);
		}

		query += ' ORDER BY created_at DESC';

		const [rows] = await pool.query(query, params);

		if (rows.length === 0) {
			return [];
		}

		const articleIds = rows.map((row) => row.article_id);
		let supportingRows = [];

		if (articleIds.length > 0) {
			const placeholders = articleIds.map(() => '?').join(', ');
			const [images] = await pool.query(
				`SELECT image_id, article_id, image_blob, image_mime_type, image_filename, created_at
					 FROM knowledge_article_images
					WHERE article_id IN (${placeholders})
					ORDER BY article_id ASC, image_id ASC`,
				articleIds,
			);
			supportingRows = images;
		}

		const imagesByArticle = supportingRows.reduce((acc, row) => {
			if (!acc[row.article_id]) {
				acc[row.article_id] = [];
			}
			acc[row.article_id].push(row);
			return acc;
		}, {});

		return rows.map((row) =>
			formatArticleRow(row, {
				includeCoverBinary: true,
				includeSupportImages: true,
				supportingRows: imagesByArticle[row.article_id] || [],
			}),
		);
	}

	static async getArticleById(articleId) {
		const [[articleRow]] = await pool.query(
			`SELECT article_id, title, description, status, created_at, updated_at,
						cover_image_blob, cover_image_mime_type, cover_image_filename, requested_by
				 FROM knowledge_article
			WHERE article_id = ?
			LIMIT 1`,
			[articleId],
		);

		if (!articleRow) {
			return null;
		}

		const [supportingRows] = await pool.query(
			`SELECT image_id, article_id, image_blob, image_mime_type, image_filename, created_at
				 FROM knowledge_article_images
				WHERE article_id = ?
				ORDER BY image_id ASC`,
			[articleId],
		);

		return formatArticleRow(articleRow, {
			includeCoverBinary: true,
			includeSupportImages: true,
			supportingRows,
		});
	}

	static async updateArticle(articleId, {
		title,
		description,
		status,
		coverImage,
		newSupportingImages = [],
		removeSupportingImageIds = [],
	}) {
		const connection = await pool.getConnection();

		try {
			await connection.beginTransaction();

			const updates = [];
			const values = [];

			if (title !== undefined) {
				updates.push('title = ?');
				values.push(title);
			}

			if (description !== undefined) {
				updates.push('description = ?');
				values.push(description);
			}

			if (status !== undefined) {
				updates.push('status = ?');
				values.push(status);
			}

			if (coverImage) {
				updates.push('cover_image_blob = ?', 'cover_image_mime_type = ?', 'cover_image_filename = ?');
				values.push(coverImage.buffer, coverImage.mimeType, coverImage.filename);
			}

			if (updates.length > 0) {
				values.push(articleId);
				const [result] = await connection.execute(
					`UPDATE knowledge_article
							SET ${updates.join(', ')}
						WHERE article_id = ?`,
					values,
				);

				if (result.affectedRows === 0) {
					throw new Error('Article not found');
				}
			}

			if (removeSupportingImageIds.length > 0) {
				const placeholders = removeSupportingImageIds.map(() => '?').join(', ');
				await connection.execute(
					`DELETE FROM knowledge_article_images
						 WHERE article_id = ? AND image_id IN (${placeholders})`,
					[articleId, ...removeSupportingImageIds],
				);
			}

			if (newSupportingImages.length > 0) {
				const insertQuery = `
					INSERT INTO knowledge_article_images
						(article_id, image_blob, image_mime_type, image_filename)
					VALUES (?, ?, ?, ?)
				`;

				for (const image of newSupportingImages) {
					await connection.execute(insertQuery, [
						articleId,
						image.buffer,
						image.mimeType,
						image.filename,
					]);
				}
			}

			await connection.commit();

			return await this.getArticleById(articleId);
		} catch (error) {
			await connection.rollback();
			throw error;
		} finally {
			connection.release();
		}
	}

	static async deleteArticle(articleId) {
		const [result] = await pool.execute(
			'DELETE FROM knowledge_article WHERE article_id = ?',
			[articleId],
		);

		return result.affectedRows > 0;
	}

	static async deleteSupportingImage(articleId, imageId) {
		const [result] = await pool.execute(
			'DELETE FROM knowledge_article_images WHERE article_id = ? AND image_id = ?',
			[articleId, imageId],
		);

		return result.affectedRows > 0;
	}
}

module.exports = CreateArticleModel;
