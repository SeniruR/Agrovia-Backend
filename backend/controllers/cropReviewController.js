const db = require('../config/database');
const fs = require('fs');
const path = require('path');
const FileType = require('file-type');

/**
 * Get all reviews for a specific crop
 */
exports.getReviewsByCropId = async (req, res) => {
  let connection;
  try {
    const { crop_id } = req.query;
    
    if (!crop_id) {
      return res.status(400).json({
        success: false,
        message: 'Crop ID is required'
      });
    }

    connection = await db.getConnection();
    
    // First, check if the crop_reviews table exists
    try {
      const checkTableQuery = `
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = 'crop_reviews'
      `;
      
      const [tableExists] = await connection.execute(checkTableQuery);
      
      if (tableExists.length === 0) {
        console.log("crop_reviews table does not exist");
        // If table doesn't exist, return empty reviews
        return res.status(200).json({
          success: true,
          reviews: []
        });
      }
    } catch (tableCheckError) {
      console.error("Error checking if table exists:", tableCheckError);
      // Continue with the query, the error will be caught in the main try-catch
    }

    // Query to get reviews with buyer name
    const query = `
      SELECT cr.id, cr.crop_id, cr.buyer_id, u.full_name as buyer_name, 
             cr.rating, cr.comment, cr.created_at, 
             cr.attachments
      FROM crop_reviews cr
      LEFT JOIN users u ON cr.buyer_id = u.id
      WHERE cr.crop_id = ?
      ORDER BY cr.created_at DESC
    `;
    
    console.log("Executing query for crop_id:", crop_id);
    const [reviews] = await connection.execute(query, [crop_id]);
    console.log("Query result:", reviews);
    
    // Process the reviews to add attachment URLs if they exist
    const reviewsWithAttachmentUrls = reviews.map((review) => {
      let attachmentUrls = [];
      let attachmentBlobs = [];

      if (review.attachments) {
        try {
          const parsed = JSON.parse(review.attachments);
          if (Array.isArray(parsed) && parsed.length > 0) {
            attachmentUrls = parsed.map((item, index) =>
              `/api/v1/crop-reviews/${review.id}/attachment?file=${encodeURIComponent(item.filename || `attachment-${index + 1}`)}`
            );

            attachmentBlobs = parsed
              .map((item, index) => {
                if (item && typeof item === 'object') {
                  const filename = item.filename || `attachment-${index + 1}`;
                  const mimetype = item.mimetype || 'application/octet-stream';
                  if (typeof item.data === 'string' && item.data.trim()) {
                    return {
                      filename,
                      mimetype,
                      size: item.size ?? null,
                      data: item.data
                    };
                  }
                }
                if (typeof item === 'string') {
                  const trimmed = item.trim();
                  if (trimmed.startsWith('data:')) {
                    return {
                      filename: `attachment-${index + 1}`,
                      mimetype: trimmed.substring(5, trimmed.indexOf(';')) || 'application/octet-stream',
                      size: null,
                      data: trimmed
                    };
                  }
                }
                return null;
              })
              .filter(Boolean);
          }
        } catch (err) {
          attachmentUrls = [`/api/v1/crop-reviews/${review.id}/attachment`];
        }
      }

      return {
        id: review.id,
        crop_id: review.crop_id,
        buyer_id: review.buyer_id,
        buyer_name: review.buyer_name || 'Anonymous',
        rating: review.rating,
        comment: review.comment,
        created_at: review.created_at,
        attachment_urls: attachmentUrls,
        attachment_blobs: attachmentBlobs
      };
    });
    
    return res.status(200).json({
      success: true,
      reviews: reviewsWithAttachmentUrls
    });
  } catch (error) {
    console.error('Error getting reviews:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get reviews',
      error: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/**
 * Add a new review
 */
exports.addReview = async (req, res) => {
  let connection;
  try {
    // Upload files using multer
    console.log('Processing review submission...');
    console.log('Request body:', req.body);
    console.log('Files:', req.files ? req.files.length : 'No files');
    
    // Get connection from the pool
    connection = await db.getConnection();
    await connection.beginTransaction();
    
    const { crop_id, comment } = req.body;
    let { rating, buyer_id } = req.body;
    
    // If buyer_id is not in the body, use a default value for testing
    if (!buyer_id) {
      console.log('No buyer_id provided, using default (1)');
      buyer_id = 1; // Default for testing
    }
    
    // Validate required fields
    if (!crop_id || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: crop_id, rating, and comment are required'
      });
    }
      
      // Convert rating to number if it's a string
      if (typeof rating === 'string') {
        rating = parseInt(rating, 10);
        if (isNaN(rating)) {
          return res.status(400).json({
            success: false,
            message: 'Rating must be a number between 1 and 5'
          });
        }
      }
      
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be between 1 and 5'
        });
      }
      
      let attachmentPayload = null;

      if (req.files && req.files.length > 1) {
        return res.status(400).json({
          success: false,
          message: 'Only one attachment is allowed per review.'
        });
      }

      if (req.files && req.files.length === 1) {
        const file = req.files[0];
        if (Buffer.isBuffer(file.buffer)) {
          const prepared = {
            filename: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            data: file.buffer.toString('base64')
          };
          attachmentPayload = JSON.stringify([prepared]);
        }
      }

      // Create the review record
      const insertQuery = `
        INSERT INTO crop_reviews (crop_id, buyer_id, rating, comment, attachments, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `;
      
      const insertParams = [
        crop_id, 
        buyer_id, 
        rating, 
        comment, 
        attachmentPayload
      ];
      
      console.log('Executing insert query with params:', insertParams);
      
      const [result] = await connection.execute(insertQuery, insertParams);
      const reviewId = result.insertId;
      
      let attachmentBlobs = [];

      if (attachmentPayload) {
        try {
          const parsed = JSON.parse(attachmentPayload);
          attachmentBlobs = parsed
            .map((item, index) => {
              if (item && typeof item === 'object' && typeof item.data === 'string' && item.data.trim()) {
                return {
                  filename: item.filename || `attachment-${index + 1}`,
                  mimetype: item.mimetype || 'application/octet-stream',
                  size: item.size ?? null,
                  data: item.data
                };
              }
              if (typeof item === 'string') {
                const trimmed = item.trim();
                if (trimmed.startsWith('data:')) {
                  return {
                    filename: `attachment-${index + 1}`,
                    mimetype: trimmed.substring(5, trimmed.indexOf(';')) || 'application/octet-stream',
                    size: null,
                    data: trimmed
                  };
                }
              }
              return null;
            })
            .filter(Boolean);
        } catch (parseErr) {
          console.warn('Failed to parse attachment payload for response preview:', parseErr);
        }
      }

      // Commit the transaction
      await connection.commit();
      
      // Return the created review
      return res.status(201).json({
        success: true,
        message: 'Review added successfully',
        id: reviewId,
        review: {
          id: reviewId,
          crop_id,
          buyer_id,
          rating,
          comment,
          attachment_urls: attachmentPayload ? [`/api/v1/crop-reviews/${reviewId}/attachment`] : [],
          attachment_blobs: attachmentBlobs
        }
      });
  } catch (error) {
    console.error('Error adding review:', error);
    
    // Rollback the transaction if there was an error
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
      }
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to add review: ' + error.message,
      error: error.message
    });
  } finally {
    // Release the connection back to the pool
    if (connection) {
      connection.release();
    }
  }
};

/**
 * Get a specific review by ID
 */
exports.getReviewById = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    
    connection = await db.getConnection();
    
    const query = `
      SELECT cr.id, cr.crop_id, cr.buyer_id, u.full_name as buyer_name, 
             cr.rating, cr.comment, cr.created_at, 
             cr.attachments
      FROM crop_reviews cr
      LEFT JOIN users u ON cr.buyer_id = u.id
      WHERE cr.id = ?
    `;
    
    const [reviews] = await connection.execute(query, [id]);
    
    if (reviews.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }
    
    const review = reviews[0];
    
    // Process attachments
    let attachmentUrls = [];
    let attachmentBlobs = [];
    if (review.attachments) {
      try {
        const parsed = JSON.parse(review.attachments);
        if (Array.isArray(parsed) && parsed.length > 0) {
          attachmentUrls = parsed.map((item, index) =>
            `/api/v1/crop-reviews/${review.id}/attachment?file=${encodeURIComponent(item.filename || `attachment-${index + 1}`)}`
          );

          attachmentBlobs = parsed
            .map((item, index) => {
              if (item && typeof item === 'object') {
                const filename = item.filename || `attachment-${index + 1}`;
                const mimetype = item.mimetype || 'application/octet-stream';
                if (typeof item.data === 'string' && item.data.trim()) {
                  return {
                    filename,
                    mimetype,
                    size: item.size ?? null,
                    data: item.data
                  };
                }
              }
              if (typeof item === 'string') {
                const trimmed = item.trim();
                if (trimmed.startsWith('data:')) {
                  return {
                    filename: `attachment-${index + 1}`,
                    mimetype: trimmed.substring(5, trimmed.indexOf(';')) || 'application/octet-stream',
                    size: null,
                    data: trimmed
                  };
                }
              }
              return null;
            })
            .filter(Boolean);
        }
      } catch (err) {
        attachmentUrls = [`/api/v1/crop-reviews/${review.id}/attachment`];
      }
    }
    
    return res.status(200).json({
      success: true,
      review: {
        id: review.id,
        crop_id: review.crop_id,
        buyer_id: review.buyer_id,
        buyer_name: review.buyer_name || 'Anonymous',
        rating: review.rating,
        comment: review.comment,
        created_at: review.created_at,
        attachment_urls: attachmentUrls,
        attachment_blobs: attachmentBlobs
      }
    });
  } catch (error) {
    console.error('Error getting review:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get review',
      error: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/**
 * Serve review attachment
 */
exports.getReviewAttachment = async (req, res) => {
  let connection;
  try {
    const { reviewId } = req.params;
    const { file: requestedFile } = req.query;

    connection = await db.getConnection();

    const query = `
      SELECT attachments
      FROM crop_reviews
      WHERE id = ?
    `;

    const [rows] = await connection.execute(query, [reviewId]);

    if (rows.length === 0 || !rows[0].attachments) {
      return res.status(404).json({
        success: false,
        message: `Review ${reviewId} not found or has no attachment`
      });
    }

    const raw = rows[0].attachments;
    const asString = Buffer.isBuffer(raw) ? raw.toString('utf8') : raw;
    let attachments = [];

    if (typeof asString === 'string') {
      try {
        const parsed = JSON.parse(asString);
        if (Array.isArray(parsed)) {
          attachments = parsed;
        }
      } catch (err) {
        // Might be JSON array of plain strings (legacy file paths)
        if (asString.trim().startsWith('[')) {
          try {
            const fallback = JSON.parse(asString.replace(/'/g, '"'));
            if (Array.isArray(fallback)) {
              attachments = fallback.map((entry) => ({ path: entry }));
            }
          } catch (_) {
            attachments = [{ data: raw.toString('base64'), filename: requestedFile || 'attachment' }];
          }
        } else {
          attachments = [{ data: raw.toString('base64'), filename: requestedFile || 'attachment' }];
        }
      }
    } else if (Buffer.isBuffer(raw)) {
      attachments = [{ data: raw.toString('base64'), filename: requestedFile || 'attachment' }];
    }

    if (attachments.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Attachment not found`
      });
    }

    let target = attachments[0];

    if (requestedFile) {
      target = attachments.find((entry) => entry && entry.filename === requestedFile) || attachments[0];
    }

    // Legacy path support (string path stored instead of blob)
    if (target && target.path) {
      const absolutePath = path.isAbsolute(target.path)
        ? target.path
        : path.join(__dirname, '..', target.path.replace(/^\/+/, ''));

      if (!fs.existsSync(absolutePath)) {
        return res.status(404).json({
          success: false,
          message: 'Attachment file not found on server'
        });
      }

  const detectionStream = fs.createReadStream(absolutePath);
  const mimeType = (await FileType.fromStream(detectionStream)) || { mime: 'application/octet-stream' };
  detectionStream.destroy();

  res.setHeader('Content-Type', mimeType.mime);
      res.setHeader('Content-Disposition', `inline; filename="${path.basename(absolutePath)}"`);

      // Need fresh stream because file-type consumed some bytes
      fs.createReadStream(absolutePath).pipe(res);
      return;
    }

    if (!target || !target.data) {
      return res.status(404).json({
        success: false,
        message: 'Attachment data not available'
      });
    }

    const buffer = Buffer.from(target.data, 'base64');
    let mime = target.mimetype;

    if (!mime) {
      const detected = await FileType.fromBuffer(buffer);
      mime = detected?.mime || 'application/octet-stream';
    }

    if (target.filename) {
      res.setHeader('Content-Disposition', `inline; filename="${target.filename.replace(/"/g, '')}"`);
    }

    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Length', buffer.length);

    return res.send(buffer);
  } catch (error) {
    console.error('Error serving attachment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get attachment',
      error: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/**
 * Update an existing review
 */
exports.updateReview = async (req, res) => {
  let connection;
  try {
    // Get the review ID from the URL parameter
    const { reviewId } = req.params;
    const { rating, comment, buyer_id } = req.body;
    
    // Validate input
    if (!rating) {
      return res.status(400).json({
        success: false,
        message: 'Rating is required'
      });
    }
    
    // Get connection from the pool
    connection = await db.getConnection();
    
    // Check if the review exists and belongs to the user
    const [reviews] = await connection.execute(
      'SELECT * FROM crop_reviews WHERE id = ?',
      [reviewId]
    );
    
    if (reviews.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }
    
    // Check if the review belongs to the user
    if (reviews[0].buyer_id !== parseInt(buyer_id)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this review'
      });
    }
    
    // Process attachment if exists
    let attachmentData = reviews[0].attachments;
    let updateFields = '';
    let updateParams = [];
    
    if (req.files && req.files.length > 1) {
      return res.status(400).json({
        success: false,
        message: 'Only one attachment is allowed per review.'
      });
    }

    if (req.files && req.files.length === 1) {
      const file = req.files[0];
      if (Buffer.isBuffer(file.buffer)) {
        const payload = {
          filename: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          data: file.buffer.toString('base64')
        };
        attachmentData = JSON.stringify([payload]);
      }
    }

    if (attachmentData) {
      updateFields = 'rating = ?, comment = ?, attachments = ?, updated_at = NOW()';
      updateParams = [rating, comment, attachmentData, reviewId];
    } else {
      // No new attachment, just update rating and comment
      updateFields = 'rating = ?, comment = ?, updated_at = NOW()';
      updateParams = [rating, comment, reviewId];
    }
    
    // Update the review in the database
    await connection.execute(
      `UPDATE crop_reviews SET ${updateFields} WHERE id = ?`,
      updateParams
    );
    
    let responseAttachments = [];
    let responseAttachmentBlobs = [];

    if (attachmentData) {
      try {
        const parsed = JSON.parse(attachmentData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          responseAttachments = parsed.map((item, index) =>
            `/api/v1/crop-reviews/${reviewId}/attachment?file=${encodeURIComponent(item.filename || `attachment-${index + 1}`)}`
          );

          responseAttachmentBlobs = parsed
            .map((item, index) => {
              if (item && typeof item === 'object' && typeof item.data === 'string' && item.data.trim()) {
                return {
                  filename: item.filename || `attachment-${index + 1}`,
                  mimetype: item.mimetype || 'application/octet-stream',
                  size: item.size ?? null,
                  data: item.data
                };
              }
              if (typeof item === 'string') {
                const trimmed = item.trim();
                if (trimmed.startsWith('data:')) {
                  return {
                    filename: `attachment-${index + 1}`,
                    mimetype: trimmed.substring(5, trimmed.indexOf(';')) || 'application/octet-stream',
                    size: null,
                    data: trimmed
                  };
                }
              }
              return null;
            })
            .filter(Boolean);
        }
      } catch (err) {
        responseAttachments = [`/api/v1/crop-reviews/${reviewId}/attachment`];
      }
    } else if (reviews[0].attachments) {
      try {
        const parsedOriginal = JSON.parse(reviews[0].attachments);
        if (Array.isArray(parsedOriginal) && parsedOriginal.length > 0) {
          responseAttachments = parsedOriginal.map((item, index) =>
            `/api/v1/crop-reviews/${reviewId}/attachment?file=${encodeURIComponent(item.filename || `attachment-${index + 1}`)}`
          );

          responseAttachmentBlobs = parsedOriginal
            .map((item, index) => {
              if (item && typeof item === 'object' && typeof item.data === 'string' && item.data.trim()) {
                return {
                  filename: item.filename || `attachment-${index + 1}`,
                  mimetype: item.mimetype || 'application/octet-stream',
                  size: item.size ?? null,
                  data: item.data
                };
              }
              if (typeof item === 'string') {
                const trimmed = item.trim();
                if (trimmed.startsWith('data:')) {
                  return {
                    filename: `attachment-${index + 1}`,
                    mimetype: trimmed.substring(5, trimmed.indexOf(';')) || 'application/octet-stream',
                    size: null,
                    data: trimmed
                  };
                }
              }
              return null;
            })
            .filter(Boolean);
        }
      } catch (err) {
        responseAttachments = [`/api/v1/crop-reviews/${reviewId}/attachment`];
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      review: {
        id: reviewId,
        rating,
        comment,
        attachment_urls: responseAttachments,
        attachment_blobs: responseAttachmentBlobs
      }
    });
  } catch (error) {
    console.error('Error updating review:', error);
    console.error('Request body:', req.body);
    console.error('Request files:', req.files);
    console.error('ReviewId:', req.params.reviewId);
    return res.status(500).json({
      success: false,
      message: 'Failed to update review',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? { 
        stack: error.stack,
        body: req.body,
        files: req.files ? 'Files present' : 'No files' 
      } : undefined
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/**
 * Delete a review
 */
exports.deleteReview = async (req, res) => {
  let connection;
  try {
    // Get the review ID from the URL parameter
    const { reviewId } = req.params;
    const { buyer_id } = req.query;
    
    if (!buyer_id) {
      return res.status(400).json({
        success: false,
        message: 'Buyer ID is required'
      });
    }
    
    // Get connection from the pool
    connection = await db.getConnection();
    
    // Check if the review exists and belongs to the user
    const [reviews] = await connection.execute(
      'SELECT * FROM crop_reviews WHERE id = ?',
      [reviewId]
    );
    
    if (reviews.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }
    
    // Check if the review belongs to the user
    if (reviews[0].buyer_id !== parseInt(buyer_id)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this review'
      });
    }
    
    // Delete the review
    await connection.execute(
      'DELETE FROM crop_reviews WHERE id = ?',
      [reviewId]
    );
    
    return res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete review',
      error: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

module.exports = exports;
