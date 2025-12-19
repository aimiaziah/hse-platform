// src/pages/api/upload/image.ts - API endpoint for image uploads to DigitalOcean Spaces
import type { NextApiRequest, NextApiResponse } from 'next';
import { uploadImageToSpaces, isSpacesConfigured } from '../../../utils/digitalOceanSpaces';
import { uploadImageToR2, isR2Configured } from '../../../utils/cloudflareR2';

type UploadResponse = {
  success: boolean;
  url?: string;
  error?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<UploadResponse>) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const { image, folder } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        error: 'Image data is required',
      });
    }

    // Prefer DigitalOcean Spaces, fallback to R2
    let result;
    if (isSpacesConfigured()) {
      console.log('[API] Uploading to DigitalOcean Spaces...');
      result = await uploadImageToSpaces(image, folder || 'inspections');
    } else if (isR2Configured()) {
      console.log('[API] Uploading to Cloudflare R2...');
      result = await uploadImageToR2(image, folder || 'inspections');
    } else {
      return res.status(500).json({
        success: false,
        error: 'No storage provider configured. Please set up DO Spaces or R2.',
      });
    }

    if (result.success) {
      return res.status(200).json({
        success: true,
        url: result.url,
      });
    }
    return res.status(500).json({
      success: false,
      error: result.error || 'Upload failed',
    });
  } catch (error) {
    console.error('[API] Image upload error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

// Increase body size limit for base64 images (default is 1mb)
// A 1200x1200 JPEG at 75% quality can be ~200-500KB base64
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Allow up to 10MB for image uploads
    },
  },
};
