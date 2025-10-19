require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const path = require('path');
const mimeTypes = require('mime-types');
const cors = require('cors');
const http = require('http');

// Import Socket.io initialization
const { initSocket } = require('./socket');

// Import middleware
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Import database
const { testConnection } = require('./config/database');

// Import routes
const routes = require('./routes');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/adminRoutes');
const shopProductRoutes = require('./routes/shopProductRoutes');
const shopStatsRoutes = require('./routes/shopStats');
const transportAllocationRoutes = require('./routes/TransportRoutes');
const shopReviewsRoutes = require('./routes/shopReviewsRoutes');
const pestAlertRoutes = require('./routes/pestAlert.routes');
const notificationRoutes = require('./routes/notificationRoutes');

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'], // Vite default ports
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-User-Id', 'x-user-id']
}));

// Explicitly respond to preflight requests with the same CORS config
app.options('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-User-Id', 'x-user-id']
}));

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
const createArticleRoutes = require('./routes/createArticleRoutes');
app.use('/api/transport-allocations', transportAllocationRoutes);
app.use('/api/v1/shop-products', shopProductRoutes);
app.use('/api/v1/shop', shopStatsRoutes);
app.use('/api/v1/knowledge-articles', createArticleRoutes);
// API routes
app.use('/api/v1', routes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/shop-reviews', shopReviewsRoutes);
app.use('/api', pestAlertRoutes);
app.use('/api/v1/notifications', notificationRoutes);

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

// Create HTTP server and initialize Socket.io
const server = http.createServer(app);
initSocket(server);

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
    server.listen(PORT, () => {
      console.log(`
🚀 Agrovia Backend Server Started
📍 Environment: ${process.env.NODE_ENV || 'development'}
🌐 Server: http://localhost:${PORT}
🔗 API Base: http://localhost:${PORT}/api/v1
📊 Health Check: http://localhost:${PORT}/api/v1/health
🔔 Socket.io: Enabled for real-time notifications
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

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
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