require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');

const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const mimeTypes = require('mime-types');



// Import middleware
const { generalLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Import database
const { testConnection } = require('./config/database');

// Import routes
const routes = require('./routes');

// Import order routes
const orderRoutes = require('./routes/orders');

// Import admin routes
const adminRoutes = require('./routes/adminRoutes');
const { initSocket } = require('./utils/socket');
const registerCropChatSocket = require('./sockets/cropChat');

// Create Express app
const app = express();
const httpServer = http.createServer(app);

// CORS configuration - Allow access from all origins in development
const corsOptions = {
  origin: function(origin, callback) {
    // In development, allow any origin
    if (process.env.NODE_ENV === 'development' || !origin) {
      callback(null, true);
    } else {
      const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174'
      ];
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-User-Id', 'x-user-id']
};

const io = initSocket(httpServer, {
  origin: corsOptions.origin,
  credentials: true
});
registerCropChatSocket(io);

app.use(cors(corsOptions));

// Explicitly respond to preflight requests
app.options('*', cors(corsOptions));

const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// Rate limiting: in development we skip the general limiter entirely to avoid noisy 429s
if (process.env.NODE_ENV === 'development') {
  // No-op rate limiting in dev
  app.use((req, res, next) => next());
} else {
  // In production/staging apply the general limiter but still skip sensitive profile endpoints
  app.use((req, res, next) => {
    const skipPaths = ['/api/v1/users/profile', '/api/v1/auth/profile'];
    if (skipPaths.includes(req.path)) return next();
    return generalLimiter(req, res, next);
  });
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (uploaded documents and crop images)
console.log('Serving static files from:', path.join(__dirname, 'uploads'));

// Create a redirect for files directly under /uploads to /uploads/reviews
// This handles existing files that are in the reviews subfolder
app.get('/uploads/:filename', (req, res, next) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', filename);
  
  // Check if the file exists directly in uploads
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // File doesn't exist in /uploads, try /uploads/reviews
      const reviewsPath = path.join(__dirname, 'uploads/reviews', filename);
      fs.access(reviewsPath, fs.constants.F_OK, (reviewErr) => {
        if (reviewErr) {
          // File doesn't exist in reviews either
          console.error(`File not found in either location: ${filename}`);
          next(); // Continue to next middleware (which will be 404)
        } else {
          // File exists in reviews, serve it
          res.sendFile(reviewsPath);
        }
      });
    } else {
      // If it exists in uploads, continue to static middleware
      next();
    }
  });
});

// Regular static file serving
app.use('/uploads', cors(), express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    console.log('Serving file:', filePath);
    res.setHeader('Content-Type', mimeTypes.lookup(filePath) || 'application/octet-stream');
  }
}));
app.use('/uploads/crop-images', cors(), express.static(path.join(__dirname, 'uploads/crop-images'), {
  setHeaders: (res, filePath) => {
    res.setHeader('Content-Type', mimeTypes.lookup(filePath) || 'application/octet-stream');
  }
}));

// Serve review attachments specifically
app.use('/uploads/reviews', cors(), express.static(path.join(__dirname, 'uploads/reviews'), {
  setHeaders: (res, filePath) => {
    res.setHeader('Content-Type', mimeTypes.lookup(filePath) || 'application/octet-stream');
  }
}));

const shopProductRoutes = require('./routes/shopProductRoutes');
const shopStatsRoutes = require('./routes/shopStats');
// Use the correct route file name (TransportRoutes.js) instead of non-existent transportAllocationRoutes
const transportAllocationRoutes = require('./routes/TransportRoutes');
app.use('/api/transport-allocations', transportAllocationRoutes);

app.use('/api/v1/shop-products', shopProductRoutes);
app.use('/api/v1/shop', shopStatsRoutes);
// API routes
app.use('/api/v1', routes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/admin', adminRoutes);

// Shop reviews routes
const shopReviewsRoutes = require('./routes/shopReviewsRoutes');
app.use('/api/v1/shop-reviews', shopReviewsRoutes);

// Pest alert routes
const pestAlertRoutes = require('./routes/pestAlert.routes');
app.use('/api', pestAlertRoutes);
// File upload routes
const uploadRoutes = require('./routes/uploadRoutes');
app.use('/api/v1/upload', uploadRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Agrovia API',
    version: '1.0.0',
    documentation: '/api/v1/health'
  });
});

// Debug endpoint to check if a file exists
app.get('/check-file', (req, res) => {
  const filePath = req.query.path;
  if (!filePath) {
    return res.status(400).json({ success: false, message: 'No file path provided' });
  }
  
  // Check both in direct uploads folder and in uploads/reviews
  const fullPath = path.join(__dirname, filePath);
  const reviewsPath = filePath.includes('reviews') ? 
    fullPath : 
    path.join(__dirname, filePath.replace('uploads', 'uploads/reviews'));
    
  console.log('Checking paths:');
  console.log('1. Direct path:', fullPath);
  console.log('2. Reviews path:', reviewsPath);
  
  // Check both paths
  const results = { 
    directPath: { exists: false, path: fullPath },
    reviewsPath: { exists: false, path: reviewsPath }
  };
  
  // Check direct path
  fs.access(fullPath, fs.constants.F_OK, (err) => {
    results.directPath.exists = !err;
    if (err) {
      results.directPath.error = err.message;
    }
    
    // Check reviews path
    fs.access(reviewsPath, fs.constants.F_OK, (reviewErr) => {
      results.reviewsPath.exists = !reviewErr;
      if (reviewErr) {
        results.reviewsPath.error = reviewErr.message;
      }
      
      // Return all results
      res.json({ 
        success: results.directPath.exists || results.reviewsPath.exists,
        message: `File check results for: ${filePath}`,
        results: results
      });
    });
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Optionally skip database connection during local frontend-only development
    if (process.env.SKIP_DB === 'true') {
      console.log('⚠️ SKIP_DB is true - skipping database connection check (development only)');
    } else {
      // Test database connection
      await testConnection();
    }

    // Start the server
    httpServer.listen(PORT, () => {
      console.log(`
🚀 Agrovia Backend Server Started
📍 Environment: ${process.env.NODE_ENV || 'development'}
🌐 Server: http://localhost:${PORT}
🔗 API Base: http://localhost:${PORT}/api/v1
📊 Health Check: http://localhost:${PORT}/api/v1/health
🔗 Socket.IO: http://localhost:${PORT}/api/v1/socket.io
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('Unhandled Promise Rejection:', err.message);
  process.exit(1);
});

// Handle uncaught exceptions with more detailed error handling
process.on('uncaughtException', (err) => {
  // Check for common file-type module errors
  if (err.message && (
    err.message.includes('file-type') || 
    err.message.includes('fromBuffer') ||
    err.message.includes('Unsupported file type')
  )) {
    console.error('Uncaught Exception in file detection:', err.message);
    console.log('This is likely related to image processing. The server will continue running.');
    // Don't exit for file-type related errors
    return;
  }
  
  console.error('Uncaught Exception:', err.message);
  console.error(err.stack);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

startServer();
