// src/utils/imageStorage.ts - Unified Image Storage Interface
import { compressImage, compressImages, CompressionOptions } from './imageCompression';

/**
 * Storage result for images
 */
export interface ImageStorageResult {
  success: boolean;
  data: string; // Either R2 URL or base64 data
  isUrl: boolean; // true if data is URL, false if base64
  error?: string;
}

/**
 * Check if R2 is configured
 * This is a client-side check using public env vars
 */
function isR2Configured(): boolean {
  return !!(
    typeof window !== 'undefined' &&
    process.env.NEXT_PUBLIC_R2_ACCOUNT_ID &&
    process.env.NEXT_PUBLIC_R2_BUCKET_NAME
  );
}

/**
 * Upload image to storage (R2 if configured, otherwise returns base64)
 * @param base64Data - Compressed base64 image
 * @param folder - Folder path for organization
 * @returns Storage result with URL or base64
 */
export async function uploadImage(
  base64Data: string,
  folder: string = 'inspections'
): Promise<ImageStorageResult> {
  // If R2 is configured, upload to R2
  if (isR2Configured()) {
    try {
      // Call API endpoint to upload to R2 (server-side only has credentials)
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Data,
          folder,
        }),
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          data: result.url,
          isUrl: true,
        };
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('[ImageStorage] R2 upload failed, falling back to base64:', error);
      // Fallback to base64 if R2 upload fails
      return {
        success: true,
        data: base64Data,
        isUrl: false,
      };
    }
  }

  // Fallback: Return base64 data (current behavior)
  return {
    success: true,
    data: base64Data,
    isUrl: false,
  };
}

/**
 * Upload multiple images
 * @param images - Array of base64 images
 * @param folder - Folder path
 * @returns Array of storage results
 */
export async function uploadImages(
  images: string[],
  folder: string = 'inspections'
): Promise<ImageStorageResult[]> {
  const uploadPromises = images.map(image => uploadImage(image, folder));
  return Promise.all(uploadPromises);
}

/**
 * Compress and upload image
 * @param base64Data - Raw base64 image
 * @param folder - Folder path
 * @param compressionOptions - Compression settings
 * @returns Storage result
 */
export async function compressAndUploadImage(
  base64Data: string,
  folder: string = 'inspections',
  compressionOptions?: CompressionOptions
): Promise<ImageStorageResult> {
  try {
    // Compress first
    const compressed = await compressImage(base64Data, compressionOptions);

    // Then upload
    return await uploadImage(compressed, folder);
  } catch (error) {
    console.error('[ImageStorage] Failed to compress and upload:', error);
    return {
      success: false,
      data: '',
      isUrl: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Compress and upload multiple images
 * @param images - Array of raw base64 images
 * @param folder - Folder path
 * @param compressionOptions - Compression settings
 * @returns Array of storage results
 */
export async function compressAndUploadImages(
  images: string[],
  folder: string = 'inspections',
  compressionOptions?: CompressionOptions
): Promise<ImageStorageResult[]> {
  try {
    // Compress all images first
    const compressed = await compressImages(images, compressionOptions);

    // Then upload all
    return await uploadImages(compressed, folder);
  } catch (error) {
    console.error('[ImageStorage] Failed to compress and upload images:', error);
    return images.map(() => ({
      success: false,
      data: '',
      isUrl: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }));
  }
}

/**
 * Get display URL for image (works with both R2 URLs and base64)
 * @param imageData - Either R2 URL or base64 string
 * @returns URL suitable for img src
 */
export function getImageUrl(imageData: string): string {
  // If it's already a URL, return as-is
  if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
    return imageData;
  }

  // If it's base64, return as-is (works in img src)
  return imageData;
}

/**
 * Check if data is a URL
 */
export function isImageUrl(data: string): boolean {
  return data.startsWith('http://') || data.startsWith('https://');
}

/**
 * Get storage info
 */
export function getStorageInfo() {
  const r2Configured = isR2Configured();

  return {
    storageType: r2Configured ? 'R2' : 'LocalStorage (Base64)',
    r2Configured,
    r2AccountId: process.env.NEXT_PUBLIC_R2_ACCOUNT_ID || 'Not configured',
    r2BucketName: process.env.NEXT_PUBLIC_R2_BUCKET_NAME || 'Not configured',
  };
}
