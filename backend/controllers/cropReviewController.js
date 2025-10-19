const db = require('../config/database');
const fs = require('fs');
const path = require('path');
let FileType;
try {
  FileType = require('file-type');
} catch (e) {
  FileType = null;
  console.warn('Optional package "file-type" not installed; attachment MIME detection will use filename extension fallback');
}
const mimeTypes = require('mime-types');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/reviews');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    // Generate unique filename
    const uniqueFileName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueFileName);
  }
});

// Configure multer with file size limits and accepted file types
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function(req, file, cb) {
    // Accept only image files
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
}).array('attachments', 5); // Allow up to 5 files with field name 'attachments'


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
    const reviewsWithAttachmentUrls = reviews.map(review => {
      let attachmentUrls = [];
      
      if (review.attachments) {
        try {
          // If attachments field contains JSON string of URLs
          attachmentUrls = JSON.parse(review.attachments);
        } catch (e) {
          // If not a JSON string (e.g., a direct file path or blob)
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
        attachment_urls: attachmentUrls
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
      
      // Check if crop_reviews table exists, if not create it
      try {
        const checkTableQuery = `
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = DATABASE() 
          AND table_name = 'crop_reviews'
        `;
        
        const [tableExists] = await connection.execute(checkTableQuery);
        
        if (tableExists.length === 0) {
          console.log("crop_reviews table does not exist, creating it now...");
          
          // Create the crop_reviews table
          const createTableQuery = `
            CREATE TABLE crop_reviews (
              id INT AUTO_INCREMENT PRIMARY KEY,
              crop_id INT NOT NULL,
              buyer_id INT NOT NULL,
              rating INT NOT NULL,
              comment TEXT NOT NULL,
              attachments TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              INDEX (crop_id),
              INDEX (buyer_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
          `;
          
          await connection.execute(createTableQuery);
          console.log("crop_reviews table created successfully");
        }
      } catch (tableError) {
        console.error("Error checking/creating crop_reviews table:", tableError);
        await connection.rollback();
        connection.release();
        throw tableError; // Re-throw to be caught by the main try-catch
      }
      
      // Process uploaded files
      let attachmentUrls = [];
      
      if (req.files && req.files.length > 0) {
        // Store paths to files
        for (const file of req.files) {
          const relativePath = `/uploads/reviews/${path.basename(file.path)}`;
          attachmentUrls.push(relativePath);
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
        attachmentUrls.length > 0 ? JSON.stringify(attachmentUrls) : null
      ];
      
      console.log('Executing insert query with params:', insertParams);
      
      const [result] = await connection.execute(insertQuery, insertParams);
      const reviewId = result.insertId;
      
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
          attachment_urls: attachmentUrls
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
    if (review.attachments) {
      try {
        // If attachments field contains JSON string of URLs
        attachmentUrls = JSON.parse(review.attachments);
      } catch (e) {
        // If not a JSON string (e.g., a direct file path or blob)
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
        attachment_urls: attachmentUrls
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
  try {
    const { reviewId, fileName } = req.params;
    
    // Construct the file path
    const filePath = path.join(__dirname, '../uploads/reviews', fileName);
    
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }
    
    // Determine content type
    const ext = path.extname(filePath).toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
    }
    
    // Set content type
    res.setHeader('Content-Type', contentType);
    
    // Stream the file to the response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error serving attachment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get attachment',
      error: error.message
    });
  }
};

module.exports = exports;
