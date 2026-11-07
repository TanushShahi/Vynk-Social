import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_JWT_SECRET = 'vynk_super_secret_jwt_key_2026_future_social';
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_JWT_SECRET)) {
  console.warn('\x1b[33m⚠️ [SECURITY WARNING] Vynk is running in production with the default or missing JWT_SECRET! Please set a strong random secret via the JWT_SECRET environment variable.\x1b[0m');
}

export const ENV = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  JWT_SECRET: process.env.JWT_SECRET || DEFAULT_JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  DB_PATH: process.env.DB_PATH || path.resolve(process.cwd(), 'data', 'vynk.db'),
  STORAGE_PROVIDER: process.env.STORAGE_PROVIDER || 'local', // 'local' | 'supabase' | 'cloudinary'
  UPLOAD_DIR: process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads'),
  AI_PROVIDER: process.env.AI_PROVIDER || (process.env.GEMINI_API_KEY ? 'gemini' : (process.env.OPENAI_API_KEY ? 'openai' : 'local_semantic')),
  AI_API_KEY: process.env.AI_API_KEY || process.env.GEMINI_API_KEY || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.AI_API_KEY || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  AI_MODEL: process.env.AI_MODEL || 'gemini-1.5-flash',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
};
