import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { ENV } from '../config/env.js';

if (!fs.existsSync(ENV.UPLOAD_DIR)) {
  fs.mkdirSync(ENV.UPLOAD_DIR, { recursive: true });
}

// Multer disk storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, ENV.UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  }
});

// File filter
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = /jpeg|jpg|png|webp|gif|mp4|webm|mov/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const mime = file.mimetype.toLowerCase();

  if (allowed.test(ext) || allowed.test(mime)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type. Only JPEG, PNG, WEBP, GIF, and MP4/WEBM video files are allowed.'));
  }
};

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB
  fileFilter
});

export const uploadController = {
  uploadSingle: async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
      }

      const baseUrl = process.env.API_URL || process.env.RENDER_EXTERNAL_URL || '';
      const fileUrl = baseUrl 
        ? `${baseUrl.replace(/\/+$/, '')}/uploads/${req.file.filename}` 
        : `/uploads/${req.file.filename}`;
      const isVideo = req.file.mimetype.startsWith('video');

      return res.status(201).json({
        url: fileUrl,
        type: isVideo ? 'video' : 'image',
        filename: req.file.filename,
        size: req.file.size,
        mimeType: req.file.mimetype,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'File upload failed.' });
    }
  }
};
