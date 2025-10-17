require('dotenv').config();
const express = require('express');
const cors = require('cors');

const helmet = require('helmet');
const path = require('path');
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

// Create Express app
const app = express();

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
app.use('/uploads', cors(), express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    res.setHeader('Content-Type', mimeTypes.lookup(filePath) || 'application/octet-stream');
  }
}));
app.use('/uploads/crop-images', cors(), express.static(path.join(__dirname, 'uploads/crop-images'), {
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
// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Agrovia API',
    version: '1.0.0',
    documentation: '/api/v1/health'
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
    app.listen(PORT, () => {
      console.log(`
🚀 Agrovia Backend Server Started
📍 Environment: ${process.env.NODE_ENV || 'development'}
🌐 Server: http://localhost:${PORT}
🔗 API Base: http://localhost:${PORT}/api/v1
📊 Health Check: http://localhost:${PORT}/api/v1/health
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
