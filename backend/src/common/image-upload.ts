import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

const ALLOWED = /^image\/(jpeg|pjpeg|jpg|png|x-png|webp|gif|bmp|tiff|tif|avif|heic|heif)$/i;

export type UploadedImageFile = {
  filename?: string;
  path?: string;
  destination?: string;
  originalname: string;
  mimetype: string;
  buffer?: Buffer;
};

export function imageUploadOptions(dest: string, fileSize = 8 * 1024 * 1024): MulterOptions {
  mkdirSync(dest, { recursive: true });
  return {
    dest,
    limits: { fileSize },
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED.test(file.mimetype)) {
        cb(
          new BadRequestException(
            'يُسمح بصور JPEG أو JPG أو PNG أو WEBP أو GIF',
          ) as unknown as Error,
          false,
        );
        return;
      }
      cb(null, true);
    },
  };
}

export const PRODUCT_IMAGE_SIZE = { width: 1200, height: 1500 } as const;

type WebpSaveOptions = {
  width?: number;
  height?: number;
  fit?: 'cover' | 'inside';
};

/** يحوّل أي صورة مرفوعة إلى WebP ثم يحذف الملف الأصلي. */
export async function saveUploadAsWebp(
  file: UploadedImageFile,
  destDir: string,
  publicPrefix: string,
  size?: WebpSaveOptions,
): Promise<{ filename: string; url: string }> {
  mkdirSync(destDir, { recursive: true });
  const input = readUploadBytes(file, destDir);
  const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.webp`;
  const outPath = join(destDir, filename);

  const width = size?.width ?? 1920;
  const height = size?.height ?? 1920;
  const fit = size?.fit ?? 'inside';

  try {
    let pipeline = sharp(input, { failOn: 'none', animated: false }).rotate();
    if (fit === 'cover' && size?.width && size?.height) {
      pipeline = pipeline.resize(size.width, size.height, {
        fit: 'cover',
        position: 'centre',
      });
    } else {
      pipeline = pipeline.resize({
        width,
        height,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }
    await pipeline.webp({ quality: 82, effort: 4 }).toFile(outPath);
  } catch {
    throw new BadRequestException('تعذر تجهيز الصورة. جرّبي ملف JPG أو PNG واضحاً');
  }

  cleanupOriginal(file, destDir, outPath);
  const prefix = publicPrefix.replace(/\/$/, '');
  return { filename, url: `${prefix}/${filename}` };
}

function readUploadBytes(file: UploadedImageFile, destDir: string): Buffer {
  if (file.buffer?.length) return file.buffer;
  if (file.path && existsSync(file.path)) return readFileSync(file.path);
  if (file.filename) {
    const diskPath = join(file.destination || destDir, file.filename);
    if (existsSync(diskPath)) return readFileSync(diskPath);
  }
  throw new BadRequestException('اختاري صورة للرفع');
}

function cleanupOriginal(file: UploadedImageFile, destDir: string, keptPath: string) {
  const candidates = [
    file.path,
    file.filename ? join(file.destination || destDir, file.filename) : '',
  ].filter(Boolean);
  for (const p of candidates) {
    if (p && p !== keptPath && existsSync(p)) {
      try {
        unlinkSync(p);
      } catch {
        /* ignore */
      }
    }
  }
}
