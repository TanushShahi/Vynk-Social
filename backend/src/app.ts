import express from 'express';
import cors from 'cors';
import path from 'path';
import { ENV } from './config/env.js';
import { initDatabase, query } from './config/db.js';
import { authRateLimiter, apiRateLimiter } from './middleware/rateLimiter.js';

// Import Routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import postRoutes from './routes/postRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import storyRoutes from './routes/storyRoutes.js';
import vibesRoutes from './routes/vibesRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import capsuleRoutes from './routes/capsuleRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import moderationRoutes from './routes/moderationRoutes.js';

const app = express();

// Initialize Database
initDatabase();

// Reverse proxy trust (for Docker, Nginx, Cloudflare)
app.set('trust proxy', 1);

// Production Security Headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Production-hardened CORS allowlist
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : [ENV.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server, mobile app, dev requests, and Vercel deployments
    if (
      !origin || 
      allowedOrigins.includes(origin) || 
      allowedOrigins.includes('*') || 
      origin.endsWith('.vercel.app') ||
      process.env.NODE_ENV !== 'production'
    ) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply general API rate limiting
app.use('/api', apiRateLimiter);

// Static uploads serving
app.use('/uploads', express.static(ENV.UPLOAD_DIR));

// Dual Health Check endpoints for Docker, Kubernetes, & Load Balancers
app.get(['/api/health', '/health'], (_req, res) => {
  try {
    const dbOk = query.get('SELECT 1 as healthy');
    res.json({
      status: 'ok',
      platform: 'Vynk Social',
      version: '4.2.0',
      database: dbOk ? 'connected' : 'unhealthy',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(503).json({
      status: 'error',
      platform: 'Vynk Social',
      database: 'disconnected',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Mount Routes
app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/vibes', vibesRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/capsules', capsuleRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/health-engagement', healthRoutes);
app.use('/api/moderation', moderationRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'An unexpected internal server error occurred.'
  });
});

export default app;
