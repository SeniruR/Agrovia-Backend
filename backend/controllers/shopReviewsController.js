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
            
            // For backward compatibility, we keep shop_id parameter name but it's actually product_id
            // No need to check if active since we're checking for product existence

            const newReview = await ShopReviews.create({
                shop_id,
                farmer_id,
                farmer_name,
                rating,
                comment: comment || null, // Ensure null instead of undefined
                attachments: attachments || null // Ensure null instead of undefined
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

            res.status(200).json(reviews);
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
