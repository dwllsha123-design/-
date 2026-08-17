import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

const ALLOWED = /^image\/(jpeg|png|webp|gif)$/i;

export function imageUploadOptions(dest: string, fileSize = 6 * 1024 * 1024): MulterOptions {
  return {
    dest,
    limits: { fileSize },
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED.test(file.mimetype)) {
        cb(
          new BadRequestException('يُسمح بصور JPEG أو PNG أو WEBP أو GIF فقط') as unknown as Error,
          false,
        );
        return;
      }
      cb(null, true);
    },
  };
}
