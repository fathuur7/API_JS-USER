// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import connectDB from "./config/db.js";
import authRoutes from './routes/auth/authRoutes.js';
import cookieParser from "cookie-parser";
import { rateLimiter } from "./middleware/authMiddleware.js";

// Load environment variables early
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ["http://localhost:5050", "http://localhost:5000"];

// Connect to MongoDB
(async () => {
  try {
    await connectDB();
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    // Consider process.exit(1) for critical connection failures
  }
})();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
}));

// Parse request body
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Compress responses
app.use(compression());

// Logging middleware - only in development
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// CORS configuration with origin validation
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed
    if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS","PATCH"],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Trust proxies if behind a load balancer in production
if (NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Routes
app.use('/api/auth', rateLimiter, authRoutes);

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Root route
app.get('/', (req, res) => {
  res.send("API is running...");
});

// 404 Not Found handler
app.use((req, res) => {
  res.status(404).json({ 
    message: "Resource not found",
    path: req.originalUrl
  });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const errorResponse = {
    message: err.message || "Internal Server Error",
    ...(NODE_ENV === 'development' && { stack: err.stack })
  };
  
  // Log error
  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err);
  
  res.status(statusCode).json(errorResponse);
});

// Start the server with graceful shutdown
const server = app.listen(PORT, () => {
  console.log(`Server running in ${NODE_ENV} mode on http://localhost:${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Graceful shutdown on SIGTERM
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

export default server;