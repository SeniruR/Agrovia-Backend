const pool = require('../config/database');

class ShopReviews {
    // Helper method to process attachments before storing in the database
    static processAttachments(attachments) {
        if (!attachments) return null;
        
        try {
            // If it's already a string, check if it's JSON
            if (typeof attachments === 'string') {
                // If it looks like JSON, parse it and then stringify it to ensure it's valid
                if (attachments.trim().startsWith('[') || attachments.trim().startsWith('{')) {
                    const parsed = JSON.parse(attachments);
                    return JSON.stringify(parsed);
                }
                // If it's a comma-separated list, convert to array and stringify
                else if (attachments.includes(',')) {
                    const array = attachments.split(',').map(item => item.trim()).filter(Boolean);
                    return JSON.stringify(array);
                }
                // Single value, make it an array
                else if (attachments.trim()) {
                    return JSON.stringify([attachments.trim()]);
                }
                return null;
            }
            
            // If it's an array, stringify it
            if (Array.isArray(attachments)) {
                return JSON.stringify(attachments.filter(Boolean));
            }
            
            // If it's an object, stringify it
            return JSON.stringify(attachments);
        } catch (error) {
            console.error('Error processing attachments:', error);
            return null;
        }
    }
    
    static async create(shopReviewsData) {
        const {
            shop_id,
            farmer_id,
            farmer_name,
            rating,
            comment = null,
            attachments = null
        } = shopReviewsData;

        // Process attachments to ensure proper JSON format
        const processedAttachments = this.processAttachments(attachments);
        
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
            processedAttachments
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
        
        // Process each review to handle attachments
        return reviews.map(review => {
            if (review.attachments) {
                try {
                    // Try to parse the JSON attachments
                    const parsedAttachments = JSON.parse(review.attachments);
                    review.attachments = parsedAttachments;
                    
                    // Add URLs for each attachment
                    if (Array.isArray(parsedAttachments)) {
                        review.attachment_urls = parsedAttachments.map(filename => {
                            // If it already has a full path or URL, use it
                            if (typeof filename === 'string' && (filename.startsWith('http') || filename.startsWith('/uploads/'))) {
                                return filename;
                            }
                            // Otherwise construct the URL
                            return `/uploads/${filename}`;
                        });
                    }
                } catch (error) {
                    console.error(`Error parsing attachments for review ${review.id}:`, error);
                    review.attachments = [];
                    review.attachment_urls = [];
                }
            } else {
                review.attachments = [];
                review.attachment_urls = [];
            }
            return review;
        });
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
