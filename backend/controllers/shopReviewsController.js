// controllers/shopReviewsController.js
const ShopReviews = require('../models/ShopReviews');
const pool = require('../config/database');

class ShopReviewsController {
    // ✅ Create a new shop review
    static async createReview(req, res) {
        try {
            const {
                shop_id,
                farmer_id,
                farmer_name,
                rating,
                comment = null, // Default to null if undefined
                attachments = null // Default to null if undefined
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
            
            // Process attachments before saving
            let processedAttachments = attachments;
            
            // If attachments is a string that looks like JSON, parse it first
            if (typeof attachments === 'string' && (attachments.trim().startsWith('[') || attachments.trim().startsWith('{'))) {
                try {
                    processedAttachments = JSON.parse(attachments);
                } catch (err) {
                    console.error('Error parsing attachments JSON:', err);
                    processedAttachments = null;
                }
            }
            
            // For backward compatibility, we keep shop_id parameter name but it's actually product_id
            // No need to check if active since we're checking for product existence

            const newReview = await ShopReviews.create({
                shop_id,
                farmer_id,
                farmer_name,
                rating,
                comment: comment || null, // Ensure null instead of undefined
                attachments: processedAttachments // Use the processed attachments
            });

            res.status(201).json({ message: 'Review created successfully', review: newReview });
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
            
            // Add full URLs for attachments if needed
            const reviewsWithUrls = reviews.map(review => {
                // Already processed in the model, but let's ensure the structure is consistent
                if (!review.attachment_urls && review.attachments && Array.isArray(review.attachments)) {
                    review.attachment_urls = review.attachments.map(attachment => {
                        if (typeof attachment === 'string') {
                            // If it's just a filename, construct the URL
                            if (!attachment.startsWith('http') && !attachment.startsWith('/uploads/')) {
                                return `/uploads/${attachment}`;
                            }
                            return attachment;
                        }
                        // If it's an object with path property
                        if (attachment && attachment.path) {
                            return attachment.path;
                        }
                        return '';
                    }).filter(Boolean);
                }
                return review;
            });

            res.status(200).json(reviewsWithUrls);
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
            const updateData = req.body;

            const updatedReview = await ShopReviews.update(id, updateData);

            res.status(200).json({ message: 'Review updated successfully', review: updatedReview });
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
