const pool = require('../config/database');

class ShopReviews {
    static async create(shopReviewsData) {
        const {
            shop_id,
            farmer_id,
            farmer_name,
            rating,
            comment = null,
            attachments = null
        } = shopReviewsData;

        const shopReviewsQuery = `
            INSERT INTO shop_reviews (
                shop_id, farmer_id, farmer_name, rating, comment, attachments
            ) VALUES (?, ?, ?, ?, ?, ?)
        `;

        const shopReviewsValues = [
            shop_id,
            farmer_id,
            farmer_name,
            rating,
            comment === undefined ? null : comment,
            attachments === undefined ? null : attachments
        ];

        const [shopReviewResult] = await pool.execute(shopReviewsQuery, shopReviewsValues);

        // Return the inserted review ID
        return { id: shopReviewResult.insertId, ...shopReviewsData };
    }
}

module.exports = ShopReviews;
