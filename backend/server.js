require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');



// Import middleware
const { generalLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Import database
const { testConnection } = require('./config/database');

// Import routes
const routes = require('./routes');

// Import order routes
const orderRoutes = require('./routes/orders');

// Create Express app
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const PORT = process.env.PORT || 5000;

// Socket.IO setup will be initialized after DB connection

// Security middleware
app.use(helmet());



app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'], // Vite default ports
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
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

// Rate limiting: skip profile routes to avoid excessive 429 errors
app.use((req, res, next) => {
  const skipPaths = ['/api/v1/users/profile', '/api/v1/auth/profile'];
  if (skipPaths.includes(req.path)) return next();
  return generalLimiter(req, res, next);
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (uploaded documents and crop images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/crop-images', express.static(path.join(__dirname, 'uploads/crop-images')));
const shopProductRoutes = require('./routes/shopProductRoutes');


app.use('/api/v1/shop-products', shopProductRoutes);
// API routes
app.use('/api/v1', routes);
app.use('/api/v1/orders', orderRoutes);

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
    // Test database connection
    await testConnection();
    
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
