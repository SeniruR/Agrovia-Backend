// controllers/shopReviewsController.js
const ShopReviews = require('../models/ShopReviews');
const pool = require('../config/database');

const MAX_ATTACHMENTS = 1;

const normalizeExistingAttachments = (raw) => {
    if (!raw) return [];

    let parsed = raw;

    if (Buffer.isBuffer(raw)) {
        try {
            const asString = raw.toString('utf8');
            if (!asString.trim()) return [];
            parsed = asString;
        } catch (error) {
            console.error('Failed to decode attachment buffer:', error);
            return [];
        }
    }

    if (typeof parsed === 'string') {
        const trimmed = parsed.trim();
        if (!trimmed) return [];
        try {
            parsed = JSON.parse(trimmed);
        } catch (err) {
            // If the string is a comma separated list
            if (trimmed.includes(',')) {
                parsed = trimmed.split(',').map((part) => part.trim()).filter(Boolean);
            } else {
                parsed = [trimmed];
            }
        }
    }

    if (!Array.isArray(parsed)) {
        parsed = [parsed];
    }

    return parsed
        .map((entry, index) => {
            if (!entry) return null;

            if (typeof entry === 'string') {
                const trimmed = entry.trim();
                if (!trimmed) return null;
                return {
                    filename: trimmed.split('/').pop(),
                    mimetype: null,
                    size: null,
                    data: null,
                    legacyPath: trimmed
                };
            }

            if (typeof entry === 'object') {
                const filename = entry.filename || entry.name || `attachment-${index + 1}`;
                const mimetype = entry.mimetype || 'image/jpeg';
                const size = entry.size ?? null;
                let data = entry.data || entry.base64 || entry.base64Data || entry.attachmentData || null;

                if (typeof data === 'string') {
                    const trimmedData = data.trim();
                    data = trimmedData.startsWith('data:') ? trimmedData.split(',').pop() : trimmedData;
                } else {
                    data = null;
                }

                const legacyPath = entry.legacyPath || entry.path || entry.url || entry.Location || entry.location || null;

                return {
                    filename,
                    mimetype,
                    size,
                    data,
                    legacyPath
                };
            }

            return null;
        })
        .filter(Boolean)
        .slice(0, MAX_ATTACHMENTS);
};

const filesToAttachmentBlobs = (files = []) =>
    files
        .filter((file) => file && Buffer.isBuffer(file.buffer))
        .map((file, index) => ({
            filename: file.originalname || `attachment-${index + 1}`,
            mimetype: file.mimetype || 'image/jpeg',
            size: file.size ?? null,
            data: file.buffer.toString('base64'),
            legacyPath: null
        }));

const toResponseAttachment = (attachment) => {
    if (!attachment) return null;

    const mime = attachment.mimetype || 'application/octet-stream';

    if (attachment.data) {
        const base64 = attachment.data.startsWith('data:') ? attachment.data.split(',').pop() : attachment.data;
        return {
            filename: attachment.filename,
            mimetype: mime,
            size: attachment.size ?? null,
            data: base64,
            url: `data:${mime};base64,${base64}`
        };
    }

    if (attachment.legacyPath) {
        const legacy = attachment.legacyPath;
        const url = legacy.startsWith('http') || legacy.startsWith('data:')
            ? legacy
            : legacy.startsWith('/uploads/')
                ? legacy
                : `/uploads/${legacy}`;

        return {
            filename: attachment.filename,
            mimetype: mime,
            size: attachment.size ?? null,
            data: null,
            url
        };
    }

    if (attachment.filename) {
        return {
            filename: attachment.filename,
            mimetype: mime,
            size: attachment.size ?? null,
            data: null,
            url: `/uploads/${attachment.filename}`
        };
    }

    return null;
};

class ShopReviewsController {
    // ✅ Create a new shop review
    static async createReview(req, res) {
        try {
            const {
                shop_id,
                farmer_id,
                farmer_name,
                rating,
                comment = null,
                existing_attachments = null
            } = req.body;

            if (!shop_id || !farmer_id || !farmer_name || !rating) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            // First verify that the product exists 
            const [products] = await pool.execute('SELECT id FROM products WHERE id = ?', [shop_id]);
            
            if (products.length === 0) {
                return res.status(404).json({ 
                    success: false,
                    error: `Product with ID ${shop_id} not found` 
                });
            }
            
            const existing = normalizeExistingAttachments(existing_attachments || req.body.attachments);
            const uploaded = filesToAttachmentBlobs(req.files);
            const attachments = [...existing, ...uploaded].slice(0, MAX_ATTACHMENTS);
            
            // For backward compatibility, we keep shop_id parameter name but it's actually product_id
            // No need to check if active since we're checking for product existence

            const newReview = await ShopReviews.create({
                shop_id,
                farmer_id,
                farmer_name,
                rating,
                comment: comment || null,
                attachments
            });

            res.status(201).json({
                message: 'Review created successfully',
                review: {
                    ...newReview,
                    attachments,
                    attachment_blobs: attachments.map(toResponseAttachment).filter(Boolean)
                }
            });
        } catch (error) {
            console.error('Error creating shop review:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // ✅ Get all reviews for a shop/product
    static async getReviewsByShop(req, res) {
        try {
            // Handle both query parameter (shop_id in query) and URL parameter (shop_id in params)
            const shop_id = req.query.shop_id || req.params.shop_id;

            if (!shop_id) {
                return res.status(400).json({ 
                    success: false,
                    error: 'shop_id is required' 
                });
            }

            const reviews = await ShopReviews.findByShopId(shop_id);

            const enriched = reviews.map((review) => ({
                ...review,
                attachment_blobs: (review.attachments || []).map(toResponseAttachment).filter(Boolean)
            }));

            res.status(200).json(enriched);
        } catch (error) {
            console.error('Error fetching shop reviews:', error);
            res.status(500).json({ 
                success: false,
                error: 'Internal Server Error' 
            });
        }
    }

    // ✅ Update a review
    static async updateReview(req, res) {
        try {
            const { id } = req.params;
            const {
                rating,
                comment = null,
                existing_attachments = null
            } = req.body;

            const existing = normalizeExistingAttachments(existing_attachments || req.body.attachments);
            const uploaded = filesToAttachmentBlobs(req.files);
            const attachments = [...existing, ...uploaded].slice(0, MAX_ATTACHMENTS);

            const updatePayload = {};
            if (rating !== undefined) updatePayload.rating = rating;
            if (comment !== undefined) updatePayload.comment = comment;
            updatePayload.attachments = attachments;

            const updatedReview = await ShopReviews.update(id, updatePayload);

            const responseAttachments = (updatedReview && updatedReview.attachments)
                ? normalizeExistingAttachments(updatedReview.attachments)
                : attachments;

            res.status(200).json({
                message: 'Review updated successfully',
                review: {
                    ...updatedReview,
                    attachments: responseAttachments,
                    attachment_blobs: responseAttachments.map(toResponseAttachment).filter(Boolean)
                }
            });
        } catch (error) {
            console.error('Error updating shop review:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // ✅ Delete a review
    static async deleteReview(req, res) {
        try {
            const { id } = req.params;

            await ShopReviews.delete(id);

            res.status(200).json({ message: 'Review deleted successfully' });
        } catch (error) {
            console.error('Error deleting shop review:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}

module.exports = ShopReviewsController;
