// src/utils/cloudflareR2.ts - Cloudflare R2 Storage Client
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Cloudflare R2 Configuration
 */
interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

/**
 * Upload result with public URL
 */
interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

/**
 * Get R2 configuration from environment variables
 */
function getR2Config(): R2Config | null {
  const accountId = process.env.NEXT_PUBLIC_R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.NEXT_PUBLIC_R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    console.error('[R2] Missing configuration. Please check environment variables.');
    return null;
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
  };
}

/**
 * Create R2 S3 Client
 */
function createR2Client(): S3Client | null {
  const config = getR2Config();
  if (!config) return null;

  return new S3Client({
    region: 'auto', // R2 uses 'auto' as the region
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

/**
 * Convert base64 data URL to Buffer
 */
function base64ToBuffer(base64Data: string): Buffer {
  // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
  const base64String = base64Data.includes(',')
    ? base64Data.split(',')[1]
    : base64Data;

  return Buffer.from(base64String, 'base64');
}

/**
 * Get MIME type from base64 data URL
 */
function getMimeType(base64Data: string): string {
  const match = base64Data.match(/data:([^;]+);/);
  return match ? match[1] : 'image/jpeg';
}

/**
 * Get file extension from MIME type
 */
function getExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'application/pdf': 'pdf',
  };
  return extensions[mimeType] || 'jpg';
}

/**
 * Generate unique file key for R2 storage
 */
function generateFileKey(prefix: string, mimeType: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const extension = getExtension(mimeType);
  return `${prefix}/${timestamp}-${random}.${extension}`;
}

/**
 * Upload base64 image to R2
 * @param base64Data - Base64 encoded image data (with or without data URL prefix)
 * @param folder - Folder path in R2 (e.g., 'inspections/fire-extinguisher')
 * @returns Upload result with public URL
 */
export async function uploadImageToR2(
  base64Data: string,
  folder: string = 'inspections'
): Promise<UploadResult> {
  try {
    const client = createR2Client();
    const config = getR2Config();

    if (!client || !config) {
      return {
        success: false,
        error: 'R2 is not configured. Please check environment variables.',
      };
    }

    // Convert base64 to buffer
    const buffer = base64ToBuffer(base64Data);
    const mimeType = getMimeType(base64Data);
    const key = generateFileKey(folder, mimeType);

    // Upload to R2
    const command = new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      // Make object publicly accessible (optional - depends on your bucket settings)
      // If your bucket has public access enabled, this allows direct access via URL
    });

    await client.send(command);

    // Generate public URL
    // Option 1: Using custom domain (recommended for production)
    const customDomain = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN;
    const publicUrl = customDomain
      ? `https://${customDomain}/${key}`
      : `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucketName}/${key}`;

    console.log(`[R2] ✅ Uploaded: ${key}`);

    return {
      success: true,
      url: publicUrl,
      key,
    };
  } catch (error) {
    console.error('[R2] ❌ Upload failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Upload multiple images to R2
 * @param images - Array of base64 encoded images
 * @param folder - Folder path in R2
 * @returns Array of upload results
 */
export async function uploadImagesToR2(
  images: string[],
  folder: string = 'inspections'
): Promise<UploadResult[]> {
  const uploadPromises = images.map(image => uploadImageToR2(image, folder));
  return Promise.all(uploadPromises);
}

/**
 * Delete image from R2
 * @param key - File key in R2
 * @returns Success status
 */
export async function deleteImageFromR2(key: string): Promise<boolean> {
  try {
    const client = createR2Client();
    const config = getR2Config();

    if (!client || !config) {
      console.error('[R2] Cannot delete: R2 not configured');
      return false;
    }

    const command = new DeleteObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    });

    await client.send(command);
    console.log(`[R2] 🗑️  Deleted: ${key}`);
    return true;
  } catch (error) {
    console.error('[R2] ❌ Delete failed:', error);
    return false;
  }
}

/**
 * Generate a signed URL for temporary access to a private file
 * @param key - File key in R2
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Signed URL
 */
export async function getSignedUrlForR2(
  key: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const client = createR2Client();
    const config = getR2Config();

    if (!client || !config) {
      console.error('[R2] Cannot generate signed URL: R2 not configured');
      return null;
    }

    const command = new GetObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    });

    const signedUrl = await getSignedUrl(client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error('[R2] ❌ Failed to generate signed URL:', error);
    return null;
  }
}

/**
 * Check if R2 is configured
 */
export function isR2Configured(): boolean {
  return getR2Config() !== null;
}

/**
 * Get bucket info for diagnostics
 */
export function getR2Info() {
  const config = getR2Config();
  if (!config) {
    return {
      configured: false,
      message: 'R2 is not configured',
    };
  }

  return {
    configured: true,
    accountId: config.accountId,
    bucketName: config.bucketName,
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
  };
}
