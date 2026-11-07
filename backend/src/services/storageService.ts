import fs from 'fs';
import path from 'path';
import { ENV } from '../config/env.js';

export interface StorageProvider {
  uploadFile(file: Express.Multer.File): Promise<string>;
  deleteFile(fileUrl: string): Promise<boolean>;
}

class LocalStorageProvider implements StorageProvider {
  private uploadDir: string;

  constructor() {
    this.uploadDir = ENV.UPLOAD_DIR;
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    // Return relative or static URL accessible from frontend
    return `/uploads/${file.filename}`;
  }

  async deleteFile(fileUrl: string): Promise<boolean> {
    const filename = path.basename(fileUrl);
    const filePath = path.join(this.uploadDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }
}

// In future / production: SupabaseStorageProvider or CloudinaryStorageProvider can be substituted here
export const storageService = new LocalStorageProvider();
