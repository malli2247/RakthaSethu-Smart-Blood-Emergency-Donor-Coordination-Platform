import { Router, Request, Response, NextFunction } from 'express';
import { upload, UploadService } from '../../services/uploadService';
import { authenticateToken } from '../../middleware/auth';
import { sendSuccess, AppError } from '../../utils/response';

export const uploadRouter = Router();

uploadRouter.post(
  '/',
  authenticateToken,
  upload.single('file'),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new AppError('No file provided or file rejected by validator', 400, 'NO_FILE');
      }

      sendSuccess(
        res,
        {
          fileName: req.file.filename,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          url: UploadService.getFileUrl(req.file.filename),
        },
        'File uploaded successfully',
        201
      );
    } catch (err) {
      next(err);
    }
  }
);
