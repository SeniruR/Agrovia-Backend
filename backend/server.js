require('dotenv').config();
const express = require('express');
// const cors = require('cors');

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
const cors = require('cors');
const app = express();
// Enable CORS for frontend dev server
app.use(cors({
  origin: 'http://localhost:5174',
  credentials: true
}));
const PORT = process.env.PORT || 5000;

// Socket.IO setup will be initialized after DB connection

// Security middleware
app.use(helmet());



app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'], // Vite default ports
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  // allow common custom headers used by the frontend
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-User-Id', 'x-user-id']
}));

// Explicitly respond to preflight requests with the same CORS config to ensure
// Access-Control-Allow-Headers contains our custom header names (some clients
// require exact matches on preflight responses).
app.options('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-User-Id', 'x-user-id']
}));
// CORS configuration
// app.use(cors({
//   origin: process.env.NODE_ENV === 'production' 
//     ? ['https://yourdomain.com'] // Replace with your frontend domain
//     : ['http://localhost:3000', 'http://localhost:3001'], // React dev server
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));

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
    server.listen(PORT, () => {
      console.log(`
🚀 Agrovia Backend Server Started
📍 Environment: ${process.env.NODE_ENV || 'development'}
🌐 Server: http://localhost:${PORT}
🔗 API Base: http://localhost:${PORT}/api/v1
📊 Health Check: http://localhost:${PORT}/api/v1/health
      `);
    });

    // Setup Socket.IO
    const io = new Server(server, {
      cors: {
        origin: ['http://localhost:5173', 'http://localhost:5174'],
        methods: ['GET', 'POST']
      }
    });

    // Lazy-load model and auth verify function
    const BulkSellerChat = require('./models/BulkSellerChat');
    const { verifyToken } = require('./middleware/auth');

    io.use((socket, next) => {
      // Accept token via socket.handshake.auth.token or query
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Authentication error: token required'));
      try {
        const decoded = verifyToken(token);
        socket.user = decoded; // keep decoded payload (must contain userId)
        return next();
      } catch (err) {
        return next(new Error('Authentication error'));
      }
    });

    io.on('connection', (socket) => {
      const userId = socket.user.userId;
      console.log('Socket connected userId=', userId);

      // Join a conversation room
      socket.on('join_conversation', ({ seller_id, buyer_id }) => {
        if (!seller_id || !buyer_id) return;
        const room = `conversation_${Math.min(seller_id,buyer_id)}_${Math.max(seller_id,buyer_id)}`;
        socket.join(room);
        socket.emit('joined', { room });
      });

      // Handle sending messages
      socket.on('send_message', async (payload, ack) => {
        try {
          const { seller_id, buyer_id, message, sent_by } = payload;
          // Basic validation
          if (!seller_id || !buyer_id || !message || !sent_by) {
            if (ack) ack({ success: false, error: 'Invalid payload' });
            return;
          }

          const id = await BulkSellerChat.create({ seller_id, buyer_id, message, sent_by });
          const rows = await BulkSellerChat.getByConversation({ seller_id, buyer_id, limit: 1, offset: 0 });
          const msg = rows[rows.length - 1] || null;
          const room = `conversation_${Math.min(seller_id,buyer_id)}_${Math.max(seller_id,buyer_id)}`;
          io.to(room).emit('new_message', msg);
          if (ack) ack({ success: true, data: msg });
        } catch (err) {
          console.error('send_message error', err);
          if (ack) ack({ success: false, error: err.message });
        }
      });

      socket.on('disconnect', () => {
        // handle disconnect if needed
      });
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
