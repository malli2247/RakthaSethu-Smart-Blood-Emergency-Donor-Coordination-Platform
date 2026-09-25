import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Request } from 'express';
import { config } from '../config';
import { AppError } from '../utils/response';
import { logger } from '../utils/logger';

// Permitted MIME types and file extensions
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

// Ensure local upload directory exists
const uploadDirectory = config.storage.uploadDir;
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

// Multer disk storage engine generating unguessable UUID filenames
const diskStorage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => {
    cb(null, uploadDirectory);
  },
  filename: (_req: any, file: any, cb: any) => {
    const extension = MIME_EXTENSION_MAP[file.mimetype] || path.extname(file.originalname).toLowerCase();
    const safeExtension = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'].includes(extension) ? extension : '.bin';
    const uniqueId = crypto.randomUUID();
    cb(null, `${uniqueId}${safeExtension}`);
  },
});

// File filter checking MIME types
const fileFilter = (
  _req: Request,
  file: any,
  cb: any
) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        `Invalid file type: ${file.mimetype}. Allowed types: JPEG, PNG, WebP, PDF.`,
        400,
        'INVALID_FILE_TYPE'
      )
    );
  }
};

export const upload = multer({
  storage: diskStorage,
  limits: {
    fileSize: config.storage.maxFileSizeMb * 1024 * 1024, // 5MB default
    files: 1, // Single file per upload request
  },
  fileFilter,
});

export interface UploadResult {
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

export class UploadService {
  /**
   * Generates public URL for an uploaded file
   */
  static getFileUrl(fileName: string): string {
    return `${config.backendUrl}/uploads/${fileName}`;
  }

  /**
   * Deletes a file from storage
   */
  static async deleteFile(fileName: string): Promise<boolean> {
    try {
      // Prevent directory traversal attacks
      const sanitizedName = path.basename(fileName);
      const filePath = path.join(uploadDirectory, sanitizedName);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        return true;
      }
      return false;
    } catch (err) {
      logger.error(`Failed to delete file: ${fileName}`, err);
      return false;
    }
  }
}
