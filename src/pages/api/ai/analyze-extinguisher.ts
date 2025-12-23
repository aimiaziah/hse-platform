/**
 * PRODUCTION-READY AI Fire Extinguisher Analysis API
 *
 * This endpoint integrates with your trained YOLO model.
 * Choose your deployment option by setting environment variables.
 *
 * Supported Options:
 * 1. DigitalOcean App Platform (recommended for production - integrated with main app)
 * 2. Roboflow Hosted API (easiest for testing)
 * 3. Google Cloud Run (custom deployment)
 * 4. Azure Functions (custom deployment)
 *
 * Setup:
 * 1. Train your YOLO model (see yolo-training-colab.py)
 * 2. Deploy using one of the options above
 * 3. Set environment variables in .env.local or DigitalOcean dashboard
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { AIInspectionResult, CapturedImage } from '@/types/ai-inspection';
import {
  mapYOLOToInspectionResults,
  YOLOImageResult,
  YOLODetection,
} from '@/utils/yoloDetectionMapper';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Choose your deployment option via environment variable
const DEPLOYMENT_TYPE = process.env.AI_DEPLOYMENT_TYPE || 'roboflow'; // 'roboflow' | 'digitalocean' | 'gcp' | 'azure'

// API endpoints and keys
const { ROBOFLOW_API_KEY } = process.env;
const { ROBOFLOW_MODEL_ENDPOINT } = process.env;
const AI_MODEL_ENDPOINT = process.env.AI_MODEL_ENDPOINT; // DigitalOcean internal endpoint
const { GCP_CLOUD_RUN_ENDPOINT } = process.env;
const { AZURE_FUNCTION_ENDPOINT } = process.env;

// Confidence thresholds
const MIN_CONFIDENCE = parseFloat(process.env.AI_MIN_CONFIDENCE || '0.5');
const DETECTION_TIMEOUT = parseInt(process.env.AI_TIMEOUT_MS || '30000');

// ============================================================================
// MAIN HANDLER
// ============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AIInspectionResult>,
) {
  console.log('[AI Analysis API] Request received:', req.method);

  if (req.method !== 'POST') {
    console.error('[AI Analysis API] Invalid method:', req.method);
    return res.status(405).json({
      success: false,
      detections: [],
      extractedData: {},
      error: 'Method not allowed',
    });
  }

  const startTime = Date.now();

  try {
    const { images, extinguisherInfo } = req.body;
    console.log('[AI Analysis API] Request body:', {
      imageCount: images?.length,
      extinguisherInfo,
      deploymentType: DEPLOYMENT_TYPE,
    });

    // Validate input
    if (!images || !Array.isArray(images) || images.length === 0) {
      console.error('[AI Analysis API] No images provided');
      return res.status(400).json({
        success: false,
        detections: [],
        extractedData: {},
        error: 'No images provided',
      });
    }

    console.log(
      `[AI Analysis API] Processing ${images.length} images for extinguisher ${extinguisherInfo?.serialNo}`,
    );
    console.log(`[AI Analysis API] Using deployment type: ${DEPLOYMENT_TYPE}`);

    // Route to appropriate detection service
    let yoloResults: YOLOImageResult[];

    switch (DEPLOYMENT_TYPE) {
      case 'roboflow':
        yoloResults = await detectWithRoboflow(images);
        break;
      case 'digitalocean':
        yoloResults = await detectWithDigitalOcean(images, extinguisherInfo);
        break;
      case 'gcp':
        yoloResults = await detectWithGCP(images, extinguisherInfo);
        break;
      case 'azure':
        yoloResults = await detectWithAzure(images, extinguisherInfo);
        break;
      default:
        throw new Error(`Unknown deployment type: ${DEPLOYMENT_TYPE}`);
    }

    console.log('[AI Analysis API] YOLO results:', yoloResults);

    // Map YOLO detections to inspection results
    const inspectionResult = mapYOLOToInspectionResults(yoloResults, images);
    console.log('[AI Analysis API] Mapped inspection result:', inspectionResult);

    // Add processing metadata
    inspectionResult.processingTime = Date.now() - startTime;

    console.log(
      `[AI Analysis API] Complete in ${inspectionResult.processingTime}ms - ` +
        `${inspectionResult.detections.length} fields analyzed`,
    );

    return res.status(200).json(inspectionResult);
  } catch (error: any) {
    console.error('[AI Analysis API] Error:', error);
    console.error('[AI Analysis API] Error stack:', error.stack);
    console.error('[AI Analysis API] Config:', {
      deploymentType: DEPLOYMENT_TYPE,
      aiModelEndpoint: AI_MODEL_ENDPOINT ? 'set' : 'not set',
      roboflowConfigured: !!(ROBOFLOW_API_KEY && ROBOFLOW_MODEL_ENDPOINT),
    });

    return res.status(500).json({
      success: false,
      detections: [],
      extractedData: {},
      error: error.message || 'Failed to analyze images',
      processingTime: Date.now() - startTime,
      debug: {
        deploymentType: DEPLOYMENT_TYPE,
        aiEndpointConfigured: !!AI_MODEL_ENDPOINT,
        errorType: error.name || 'Error',
      },
    });
  }
}

// ============================================================================
// DEPLOYMENT OPTION 1: ROBOFLOW
// ============================================================================

async function detectWithRoboflow(images: CapturedImage[]): Promise<YOLOImageResult[]> {
  if (!ROBOFLOW_API_KEY || !ROBOFLOW_MODEL_ENDPOINT) {
    console.warn('[AI Analysis] Roboflow not configured, using mock data');
    return generateMockDetections(images);
  }

  const results: YOLOImageResult[] = [];

  for (const image of images) {
    try {
      // Extract base64 data
      const base64Data = image.dataUrl.split(',')[1] || image.dataUrl;

      // Call Roboflow API
      const response = await fetch(
        `${ROBOFLOW_MODEL_ENDPOINT}?api_key=${ROBOFLOW_API_KEY}&confidence=${MIN_CONFIDENCE}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: base64Data,
        },
      );

      if (!response.ok) {
        throw new Error(`Roboflow API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Convert Roboflow format to our format
      const detections: YOLODetection[] = (data.predictions || []).map((pred: any) => ({
        class: pred.class,
        confidence: pred.confidence,
        bbox: [
          pred.x - pred.width / 2,
          pred.y - pred.height / 2,
          pred.x + pred.width / 2,
          pred.y + pred.height / 2,
        ],
      }));

      results.push({
        stepId: image.stepId,
        detections,
      });
    } catch (error) {
      // Sanitize stepId to prevent format string injection
      const safeStepId = String(image.stepId || 'unknown').substring(0, 50);
      console.error(`[Roboflow] Error processing image ${safeStepId}:`, error);
      results.push({
        stepId: image.stepId,
        detections: [],
      });
    }
  }

  return results;
}

// ============================================================================
// DEPLOYMENT OPTION 2: DIGITALOCEAN APP PLATFORM
// ============================================================================

async function detectWithDigitalOcean(
  images: CapturedImage[],
  extinguisherInfo: any,
): Promise<YOLOImageResult[]> {
  if (!AI_MODEL_ENDPOINT) {
    console.error('[AI Analysis] ❌ AI_MODEL_ENDPOINT environment variable is not set!');
    console.error(
      '[AI Analysis] Please set AI_MODEL_ENDPOINT in DigitalOcean App Platform settings',
    );

    // Try Roboflow as fallback if configured
    if (ROBOFLOW_API_KEY && ROBOFLOW_MODEL_ENDPOINT) {
      console.log('[AI Analysis] Falling back to Roboflow...');
      return detectWithRoboflow(images);
    }

    throw new Error(
      'AI service not configured. Please contact your administrator to set up AI detection.',
    );
  }

  console.log(`[DigitalOcean AI] Attempting to connect to: ${AI_MODEL_ENDPOINT}/detect`);
  console.log(
    `[DigitalOcean AI] Processing ${images.length} image(s), confidence threshold: ${MIN_CONFIDENCE}`,
  );

  try {
    // First, check if the AI server is healthy (with a short timeout)
    const healthCheck = await checkAIServerHealth();
    if (!healthCheck.healthy) {
      console.error(`[DigitalOcean AI] ❌ AI Server health check failed: ${healthCheck.error}`);

      // Try Roboflow as fallback if configured
      if (ROBOFLOW_API_KEY && ROBOFLOW_MODEL_ENDPOINT) {
        console.log('[AI Analysis] Falling back to Roboflow...');
        return detectWithRoboflow(images);
      }

      // Provide user-friendly error message
      throw new Error(
        'AI detection service is temporarily unavailable. Please try again later or submit the inspection manually without AI assistance.',
      );
    }

    // Create AbortController for timeout (more compatible than AbortSignal.timeout)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DETECTION_TIMEOUT);

    try {
      const response = await fetch(`${AI_MODEL_ENDPOINT}/detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images,
          extinguisherInfo,
          minConfidence: MIN_CONFIDENCE,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        console.error(`[DigitalOcean AI] Server returned ${response.status}: ${errorText}`);
        throw new Error(`AI server returned error ${response.status}`);
      }

      const data = await response.json();
      console.log('[DigitalOcean AI] Raw response:', JSON.stringify(data, null, 2));

      // Check if the response indicates model not loaded
      if (data.error && data.error.includes('Model not loaded')) {
        throw new Error('AI model is still loading. Please wait a moment and try again.');
      }

      // Map Python server response format to our format
      // Python server returns: { results: [{ stepId, detections: [{ class_name, confidence, bbox }] }] }
      // We need: { results: [{ stepId, detections: [{ class, confidence, bbox }] }] }
      const mappedResults = (data.results || []).map((result: any) => ({
        stepId: result.stepId,
        detections: (result.detections || []).map((det: any) => ({
          class: det.class_name || det.class, // Map class_name to class
          confidence: det.confidence,
          bbox: det.bbox,
        })),
      }));

      console.log('[DigitalOcean AI] Mapped results:', JSON.stringify(mappedResults, null, 2));
      console.log(
        `[DigitalOcean AI] ✅ Detection complete. Found ${mappedResults.reduce(
          (acc: number, r: any) => acc + r.detections.length,
          0,
        )} total detections`,
      );

      return mappedResults;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error: any) {
    console.error('[DigitalOcean AI] ❌ Error:', error.message);

    // Provide more helpful error messages for users
    if (
      error.name === 'AbortError' ||
      error.message.includes('timeout') ||
      error.message.includes('aborted')
    ) {
      throw new Error(
        'AI analysis is taking too long. Please try with a smaller/clearer image or submit manually.',
      );
    }

    if (
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('fetch failed') ||
      error.message.includes('ENOTFOUND')
    ) {
      throw new Error(
        'AI detection service is currently unavailable. Please try again later or submit the inspection manually.',
      );
    }

    // Re-throw if it's already a user-friendly message
    if (
      error.message.includes('temporarily unavailable') ||
      error.message.includes('still loading') ||
      error.message.includes('try again')
    ) {
      throw error;
    }

    throw new Error('AI analysis failed. Please try again or submit the inspection manually.');
  }
}

// Helper function to check AI server health
async function checkAIServerHealth(): Promise<{ healthy: boolean; error?: string }> {
  if (!AI_MODEL_ENDPOINT) {
    return { healthy: false, error: 'AI_MODEL_ENDPOINT not configured' };
  }

  // Create AbortController for timeout (more compatible than AbortSignal.timeout)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

  try {
    const response = await fetch(`${AI_MODEL_ENDPOINT}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data.model_loaded === false) {
        return { healthy: false, error: 'Model not loaded on server' };
      }
      return { healthy: true };
    } else {
      return { healthy: false, error: `Health check returned ${response.status}` };
    }
  } catch (error: any) {
    clearTimeout(timeoutId);
    return {
      healthy: false,
      error: error.name === 'AbortError' ? 'Connection timeout' : error.message,
    };
  }
}

// ============================================================================
// DEPLOYMENT OPTION 3: GOOGLE CLOUD RUN
// ============================================================================

async function detectWithGCP(
  images: CapturedImage[],
  extinguisherInfo: any,
): Promise<YOLOImageResult[]> {
  if (!GCP_CLOUD_RUN_ENDPOINT) {
    console.warn('[AI Analysis] GCP Cloud Run not configured, using mock data');
    return generateMockDetections(images);
  }

  try {
    const response = await fetch(`${GCP_CLOUD_RUN_ENDPOINT}/detect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        images,
        extinguisherInfo,
        minConfidence: MIN_CONFIDENCE,
      }),
      signal: AbortSignal.timeout(DETECTION_TIMEOUT),
    });

    if (!response.ok) {
      throw new Error(`GCP Cloud Run error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[GCP] Raw response:', data);

    // Map Python server response format to our format
    // Python server returns: { results: [{ stepId, detections: [{ class_name, confidence, bbox }] }] }
    // We need: { results: [{ stepId, detections: [{ class, confidence, bbox }] }] }
    const mappedResults = (data.results || []).map((result: any) => ({
      stepId: result.stepId,
      detections: (result.detections || []).map((det: any) => ({
        class: det.class_name || det.class, // Map class_name to class
        confidence: det.confidence,
        bbox: det.bbox,
      })),
    }));

    console.log('[GCP] Mapped results:', mappedResults);
    return mappedResults;
  } catch (error: any) {
    console.error('[GCP Cloud Run] Error:', error);
    throw error;
  }
}

// ============================================================================
// DEPLOYMENT OPTION 4: AZURE FUNCTIONS
// ============================================================================

async function detectWithAzure(
  images: CapturedImage[],
  extinguisherInfo: any,
): Promise<YOLOImageResult[]> {
  if (!AZURE_FUNCTION_ENDPOINT) {
    console.warn('[AI Analysis] Azure Function not configured, using mock data');
    return generateMockDetections(images);
  }

  try {
    const response = await fetch(AZURE_FUNCTION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        images,
        extinguisherInfo,
        minConfidence: MIN_CONFIDENCE,
      }),
      signal: AbortSignal.timeout(DETECTION_TIMEOUT),
    });

    if (!response.ok) {
      throw new Error(`Azure Function error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error: any) {
    console.error('[Azure Function] Error:', error);
    throw error;
  }
}

// ============================================================================
// MOCK FALLBACK (when no AI service is configured)
// ============================================================================

async function generateMockDetections(images: CapturedImage[]): Promise<YOLOImageResult[]> {
  // Check if we're in production - NEVER use mock data in production
  const isProduction =
    process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

  if (isProduction) {
    console.error('[AI Analysis] ⚠️  CRITICAL: AI service not configured in production!');
    throw new Error(
      'AI detection service is not configured. Please set up one of the following: ' +
        'ROBOFLOW_API_KEY, AI_MODEL_ENDPOINT, GCP_CLOUD_RUN_ENDPOINT, or AZURE_FUNCTION_ENDPOINT',
    );
  }

  console.warn('[AI Analysis] ⚠️  Using mock detection data - FOR DEVELOPMENT ONLY');
  console.warn(
    '[AI Analysis] Mock data will return EMPTY detections to simulate "not a fire extinguisher"',
  );

  // Simulate processing delay (like a real AI service)
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Return EMPTY detections to properly test the validation logic
  // This will trigger the "not a fire extinguisher" warning in the mapper
  return images.map((image) => ({
    stepId: image.stepId,
    detections: [],
  }));
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Adjust based on image sizes
    },
  },
};
