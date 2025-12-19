// src/utils/digitalOceanSpaces.ts - DigitalOcean Spaces Storage Client
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * DigitalOcean Spaces Configuration
 */
interface SpacesConfig {
  endpoint: string;
  region: string;
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
 * Get DO Spaces configuration from environment variables
 */
function getSpacesConfig(): SpacesConfig | null {
  const endpoint = process.env.DO_SPACES_ENDPOINT;
  const region = process.env.DO_SPACES_REGION || 'sgp1';
  const accessKeyId = process.env.DO_SPACES_KEY;
  const secretAccessKey = process.env.DO_SPACES_SECRET;
  const bucketName = process.env.DO_SPACES_NAME;

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucketName) {
    console.error('[DO Spaces] Missing configuration. Please check environment variables.');
    return null;
  }

  return {
    endpoint,
    region,
    accessKeyId,
    secretAccessKey,
    bucketName,
  };
}

/**
 * Create DO Spaces S3 Client
 */
function createSpacesClient(): S3Client | null {
  const config = getSpacesConfig();
  if (!config) return null;

  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: false, // DO Spaces uses virtual-hosted-style URLs
  });
}

/**
 * Convert base64 data URL to Buffer
 */
function base64ToBuffer(base64Data: string): Buffer {
  // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
  const base64String = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

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
 * Generate unique file key for storage
 */
function generateFileKey(prefix: string, mimeType: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const extension = getExtension(mimeType);
  return `${prefix}/${timestamp}-${random}.${extension}`;
}

/**
 * Upload base64 image to DigitalOcean Spaces
 * @param base64Data - Base64 encoded image data (with or without data URL prefix)
 * @param folder - Folder path in Spaces (e.g., 'inspections/fire-extinguisher')
 * @returns Upload result with public URL
 */
export async function uploadImageToSpaces(
  base64Data: string,
  folder = 'inspections',
): Promise<UploadResult> {
  try {
    const client = createSpacesClient();
    const config = getSpacesConfig();

    if (!client || !config) {
      return {
        success: false,
        error: 'DigitalOcean Spaces is not configured. Please check environment variables.',
      };
    }

    // Convert base64 to buffer
    const buffer = base64ToBuffer(base64Data);
    const mimeType = getMimeType(base64Data);
    const key = generateFileKey(folder, mimeType);

    // Upload to DO Spaces
    const command = new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ACL: 'public-read', // Make object publicly accessible
    });

    await client.send(command);

    // Generate public URL
    // DigitalOcean Spaces public URL format:
    // https://{bucket-name}.{region}.digitaloceanspaces.com/{key}
    const publicUrl = `https://${config.bucketName}.${config.region}.digitaloceanspaces.com/${key}`;

    console.log(`[DO Spaces] ✅ Uploaded: ${key}`);

    return {
      success: true,
      url: publicUrl,
      key,
    };
  } catch (error) {
    console.error('[DO Spaces] ❌ Upload failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Upload multiple images to DO Spaces
 * @param images - Array of base64 encoded images
 * @param folder - Folder path in Spaces
 * @returns Array of upload results
 */
export async function uploadImagesToSpaces(
  images: string[],
  folder = 'inspections',
): Promise<UploadResult[]> {
  const uploadPromises = images.map((image) => uploadImageToSpaces(image, folder));
  return Promise.all(uploadPromises);
}

/**
 * Delete image from DO Spaces
 * @param key - File key in Spaces
 * @returns Success status
 */
export async function deleteImageFromSpaces(key: string): Promise<boolean> {
  try {
    const client = createSpacesClient();
    const config = getSpacesConfig();

    if (!client || !config) {
      console.error('[DO Spaces] Cannot delete: DO Spaces not configured');
      return false;
    }

    const command = new DeleteObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    });

    await client.send(command);
    console.log(`[DO Spaces] 🗑️  Deleted: ${key}`);
    return true;
  } catch (error) {
    console.error('[DO Spaces] ❌ Delete failed:', error);
    return false;
  }
}

/**
 * Generate a signed URL for temporary access to a private file
 * @param key - File key in Spaces
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Signed URL
 */
export async function getSignedUrlForSpaces(
  key: string,
  expiresIn = 3600,
): Promise<string | null> {
  try {
    const client = createSpacesClient();
    const config = getSpacesConfig();

    if (!client || !config) {
      console.error('[DO Spaces] Cannot generate signed URL: DO Spaces not configured');
      return null;
    }

    const command = new GetObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    });

    const signedUrl = await getSignedUrl(client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error('[DO Spaces] ❌ Failed to generate signed URL:', error);
    return null;
  }
}

/**
 * Check if DO Spaces is configured
 */
export function isSpacesConfigured(): boolean {
  return getSpacesConfig() !== null;
}

/**
 * Get bucket info for diagnostics
 */
export function getSpacesInfo() {
  const config = getSpacesConfig();
  if (!config) {
    return {
      configured: false,
      message: 'DigitalOcean Spaces is not configured',
    };
  }

  return {
    configured: true,
    region: config.region,
    bucketName: config.bucketName,
    endpoint: config.endpoint,
    publicUrlFormat: `https://${config.bucketName}.${config.region}.digitaloceanspaces.com/`,
  };
}
