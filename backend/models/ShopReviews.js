const pool = require('../config/database');

class ShopReviews {
    // Helper method to process attachments before storing in the database
    static processAttachments(attachments) {
        if (!attachments) return null;

        const pack = (normalized) => {
            if (!normalized || !normalized.length) return null;
            try {
                const json = JSON.stringify(normalized);
                if (!json || !json.length) return null;
                return Buffer.from(json, 'utf8');
            } catch (error) {
                console.error('Error stringifying attachments:', error);
                return null;
            }
        };

        const normalizeEntry = (entry, index = 0) => {
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
                const mimetype = entry.mimetype || entry.type || 'image/jpeg';
                const size = entry.size ?? null;
                let data = entry.data || entry.base64 || entry.base64Data || entry.attachmentData || null;

                if (typeof data === 'string') {
                    const trimmedData = data.trim();
                    data = trimmedData.startsWith('data:') ? trimmedData.split(',').pop() : trimmedData;
                } else {
                    data = null;
                }

                const legacyPath = entry.path || entry.filepath || entry.url || entry.Location || entry.location || null;

                return {
                    filename,
                    mimetype,
                    size,
                    data,
                    legacyPath
                };
            }

            return null;
        };

        try {
            if (Buffer.isBuffer(attachments)) {
                const asString = attachments.toString('utf8');
                if (!asString.trim()) return null;
                const parsed = JSON.parse(asString);
                const normalized = Array.isArray(parsed)
                    ? parsed.map((entry, idx) => normalizeEntry(entry, idx)).filter(Boolean)
                    : [];
                return pack(normalized);
            }

            if (typeof attachments === 'string') {
                if (!attachments.trim()) return null;
                if (attachments.trim().startsWith('[') || attachments.trim().startsWith('{')) {
                    const parsed = JSON.parse(attachments);
                    const normalized = Array.isArray(parsed) ? parsed.map((entry, idx) => normalizeEntry(entry, idx)).filter(Boolean) : [];
                    return pack(normalized);
                }
                return pack([normalizeEntry(attachments, 0)].filter(Boolean));
            }

            if (Array.isArray(attachments)) {
                const normalized = attachments.map((entry, idx) => normalizeEntry(entry, idx)).filter(Boolean);
                return pack(normalized);
            }

            if (typeof attachments === 'object') {
                const normalized = normalizeEntry(attachments, 0);
                return normalized ? pack([normalized]) : null;
            }

            return null;
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

        const parseStoredAttachments = (raw) => {
            if (!raw) return [];

            let working = raw;

            if (Buffer.isBuffer(raw)) {
                try {
                    working = raw.toString('utf8');
                } catch (error) {
                    console.error('Error decoding attachment buffer:', error);
                    return [];
                }
            }

            try {
                let parsed;

                if (typeof working === 'string') {
                    const trimmed = working.trim();
                    if (!trimmed) return [];

                    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
                        parsed = JSON.parse(trimmed);
                    } else if (trimmed.includes(',')) {
                        parsed = trimmed.split(',').map((part) => part.trim()).filter(Boolean);
                    } else {
                        parsed = [trimmed];
                    }
                } else if (Array.isArray(working)) {
                    parsed = working;
                } else {
                    return [];
                }

                if (!Array.isArray(parsed)) return [];

                return parsed
                    .map((entry, idx) => {
                        if (!entry) return null;
                        if (typeof entry === 'string') {
                            const trimmed = entry.trim();
                            if (!trimmed) return null;
                            const filename = trimmed.split('/').pop();
                            const legacyPath = trimmed.startsWith('http') || trimmed.startsWith('/') ? trimmed : `/uploads/${trimmed}`;
                            return {
                                filename,
                                mimetype: null,
                                size: null,
                                data: null,
                                legacyPath
                            };
                        }

                        const filename = entry.filename || entry.name || `attachment-${idx + 1}`;
                        const mimetype = entry.mimetype || 'image/jpeg';
                        const size = entry.size ?? null;
                        let data = entry.data || entry.base64 || entry.base64Data || null;

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
                    })
                    .filter(Boolean);
            } catch (error) {
                console.error('Error parsing stored attachments:', error);
                return [];
            }
        };

        return reviews.map((review) => {
            const attachments = parseStoredAttachments(review.attachments);

            review.attachments = attachments;
            review.attachment_urls = attachments.map((attachment) => {
                if (attachment.data) {
                    const mime = attachment.mimetype || 'application/octet-stream';
                    return `data:${mime};base64,${attachment.data}`;
                }

                if (attachment.legacyPath) {
                    if (attachment.legacyPath.startsWith('http') || attachment.legacyPath.startsWith('data:')) {
                        return attachment.legacyPath;
                    }
                    if (attachment.legacyPath.startsWith('/')) {
                        return attachment.legacyPath;
                    }
                    return `/uploads/${attachment.legacyPath}`;
                }

                if (attachment.filename) {
                    return `/uploads/${attachment.filename}`;
                }

                return '';
            }).filter(Boolean);

            return review;
        });
    }
    
    static async update(id, updateData) {
        const allowedFields = ['rating', 'comment', 'attachments'];
        const updates = [];
        const values = [];
        
        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                if (field === 'attachments') {
                    // Ensure attachments are stored as JSON (array or null)
                    const processed = this.processAttachments(updateData[field]);
                    updates.push(`${field} = ?`);
                    values.push(processed);
                } else {
                    updates.push(`${field} = ?`);
                    values.push(updateData[field]);
                }
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
