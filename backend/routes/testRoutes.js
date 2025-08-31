const express = require('express');
const router = express.Router();
const db = require('../config/database');

/**
 * Simple test endpoint to check database connectivity
 */
router.get('/test', async (req, res) => {
  let connection;
  try {
    // Get connection from the pool
    connection = await db.getConnection();
    
    // Try to authenticate with the database
    await connection.query('SELECT 1 as test');
    
    // Check if crop_reviews table exists
    const [tableExists] = await connection.execute(`
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'crop_reviews'
    `);
    
    return res.status(200).json({
      status: 'success',
      message: 'Database connection is working',
      tables: {
        crop_reviews_exists: tableExists.length > 0
      }
    });
  } catch (error) {
    console.error('Database connection test failed:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Database connection test failed',
      error: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

module.exports = router;
