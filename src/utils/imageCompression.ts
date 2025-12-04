// src/utils/imageCompression.ts - Image Compression Utility

/**
 * Compression options
 */
export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.0 to 1.0
  mimeType?: 'image/jpeg' | 'image/png' | 'image/webp';
}

/**
 * Default compression settings for different use cases
 */
export const COMPRESSION_PRESETS = {
  signature: {
    maxWidth: 800,
    maxHeight: 400,
    quality: 0.7,
    mimeType: 'image/jpeg' as const,
  },
  photo: {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.75,
    mimeType: 'image/jpeg' as const,
  },
  logo: {
    maxWidth: 400,
    maxHeight: 400,
    quality: 0.8,
    mimeType: 'image/png' as const,
  },
  thumbnail: {
    maxWidth: 300,
    maxHeight: 300,
    quality: 0.6,
    mimeType: 'image/jpeg' as const,
  },
};

/**
 * Compress an image from a base64 data URL or image element
 * @param imageSource - Base64 data URL string or HTMLImageElement
 * @param options - Compression options
 * @returns Compressed image as base64 data URL
 */
export async function compressImage(
  imageSource: string | HTMLImageElement,
  options: CompressionOptions = {},
): Promise<string> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8,
    mimeType = 'image/jpeg',
  } = options;

  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';

      img.onload = () => {
        try {
          // Calculate new dimensions while maintaining aspect ratio
          let { width, height } = img;

          if (width > maxWidth || height > maxHeight) {
            const aspectRatio = width / height;

            if (width > height) {
              width = maxWidth;
              height = width / aspectRatio;

              if (height > maxHeight) {
                height = maxHeight;
                width = height * aspectRatio;
              }
            } else {
              height = maxHeight;
              width = height * aspectRatio;

              if (width > maxWidth) {
                width = maxWidth;
                height = width / aspectRatio;
              }
            }
          }

          // Create canvas and draw compressed image
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(width);
          canvas.height = Math.round(height);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Enable image smoothing for better quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Draw the resized image
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Convert to compressed data URL
          const compressedDataUrl = canvas.toDataURL(mimeType, quality);

          // Log compression stats
          const originalSize = typeof imageSource === 'string' ? imageSource.length : 0;
          const compressedSize = compressedDataUrl.length;
          const reduction = originalSize > 0
            ? ((1 - compressedSize / originalSize) * 100).toFixed(1)
            : 'N/A';

          console.log('Image compressed:', {
            originalDimensions: `${img.width}x${img.height}`,
            newDimensions: `${canvas.width}x${canvas.height}`,
            originalSize: `${(originalSize / 1024).toFixed(1)} KB`,
            compressedSize: `${(compressedSize / 1024).toFixed(1)} KB`,
            reduction: `${reduction}%`,
          });

          resolve(compressedDataUrl);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for compression'));
      };

      // Load the image
      if (typeof imageSource === 'string') {
        img.src = imageSource;
      } else {
        // Already an image element
        resolve(imageSource.src);
      }
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Compress multiple images in parallel
 * @param images - Array of base64 data URLs
 * @param options - Compression options
 * @returns Array of compressed images
 */
export async function compressImages(
  images: string[],
  options: CompressionOptions = {},
): Promise<string[]> {
  return Promise.all(images.map(img => compressImage(img, options)));
}

/**
 * Compress a signature image (optimized for signatures)
 * Adds white background to prevent transparency issues in Excel
 * @param signatureDataUrl - Signature as base64 data URL
 * @returns Compressed signature with white background
 */
export async function compressSignature(signatureDataUrl: string): Promise<string> {
  if (!signatureDataUrl) return signatureDataUrl;

  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';

      img.onload = () => {
        try {
          const { maxWidth, maxHeight, quality, mimeType } = COMPRESSION_PRESETS.signature;

          // Calculate new dimensions
          let { width, height } = img;
          if (width > maxWidth || height > maxHeight) {
            const aspectRatio = width / height;
            if (width > height) {
              width = maxWidth;
              height = width / aspectRatio;
            } else {
              height = maxHeight;
              width = height * aspectRatio;
            }
          }

          // Create canvas with white background
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(width);
          canvas.height = Math.round(height);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Fill with WHITE background (prevents black transparency in Excel)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Enable smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Draw signature on white background
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Convert to compressed data URL
          const compressedDataUrl = canvas.toDataURL(mimeType, quality);
          resolve(compressedDataUrl);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load signature for compression'));
      };

      img.src = signatureDataUrl;
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Compress a photo (optimized for inspection photos)
 * @param photoDataUrl - Photo as base64 data URL
 * @returns Compressed photo
 */
export async function compressPhoto(photoDataUrl: string): Promise<string> {
  if (!photoDataUrl) return photoDataUrl;
  return compressImage(photoDataUrl, COMPRESSION_PRESETS.photo);
}

/**
 * Compress observation photos
 * @param photos - Array of photo data URLs
 * @returns Array of compressed photos
 */
export async function compressObservationPhotos(photos: string[]): Promise<string[]> {
  return compressImages(photos, COMPRESSION_PRESETS.photo);
}

/**
 * Get the size of a base64 data URL in bytes
 * @param dataUrl - Base64 data URL
 * @returns Size in bytes
 */
export function getImageSize(dataUrl: string): number {
  if (!dataUrl || typeof dataUrl !== 'string') return 0;

  // Remove the data URL prefix
  const base64 = dataUrl.split(',')[1] || '';

  // Calculate size in bytes
  // Base64 encoding increases size by ~33%, so we calculate the original size
  return Math.round((base64.length * 3) / 4);
}

/**
 * Check if an image needs compression
 * @param dataUrl - Base64 data URL
 * @param maxSizeKB - Maximum size in KB before compression is needed
 * @returns true if compression is needed
 */
export function needsCompression(dataUrl: string, maxSizeKB: number = 500): boolean {
  const sizeBytes = getImageSize(dataUrl);
  const sizeKB = sizeBytes / 1024;
  return sizeKB > maxSizeKB;
}
