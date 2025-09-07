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
    
    static async findByShopId(shop_id) {
        const query = `
            SELECT * FROM shop_reviews 
            WHERE shop_id = ?
            ORDER BY created_at DESC
        `;
        
        const [reviews] = await pool.execute(query, [shop_id]);
        return reviews;
    }
    
    static async update(id, updateData) {
        const allowedFields = ['rating', 'comment', 'attachments'];
        const updates = [];
        const values = [];
        
        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                updates.push(`${field} = ?`);
                values.push(updateData[field]);
            }
        }
        
        if (updates.length === 0) {
            throw new Error('No valid fields to update');
        }
        
        const query = `
            UPDATE shop_reviews
            SET ${updates.join(', ')}
            WHERE id = ?
        `;
        
        values.push(id);
        
        await pool.execute(query, values);
        
        // Return the updated review
        const [updatedReview] = await pool.execute('SELECT * FROM shop_reviews WHERE id = ?', [id]);
        return updatedReview[0];
    }
    
    static async delete(id) {
        const query = 'DELETE FROM shop_reviews WHERE id = ?';
        await pool.execute(query, [id]);
        return true;
    }
}

module.exports = ShopReviews;
