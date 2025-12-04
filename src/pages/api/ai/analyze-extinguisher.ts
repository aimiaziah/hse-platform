/**
 * PRODUCTION-READY AI Fire Extinguisher Analysis API
 *
 * This endpoint integrates with your trained YOLO model.
 * Choose your deployment option by setting environment variables.
 *
 * Supported Options:
 * 1. Roboflow Hosted API (easiest, recommended for start)
 * 2. AWS Lambda (custom deployment)
 * 3. Google Cloud Run (custom deployment)
 * 4. Azure Functions (custom deployment)
 *
 * Setup:
 * 1. Train your YOLO model (see yolo-training-colab.py)
 * 2. Deploy using one of the options above
 * 3. Set environment variables in .env.local
 * 4. Rename this file to: analyze-extinguisher.ts
 */

import { NextApiRequest, NextApiResponse } from 'next';
import {
  AIInspectionResult,
  CapturedImage,
} from '@/types/ai-inspection';
import {
  mapYOLOToInspectionResults,
  YOLOImageResult,
  YOLODetection,
} from '@/utils/yoloDetectionMapper';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Choose your deployment option via environment variable
const DEPLOYMENT_TYPE = process.env.AI_DEPLOYMENT_TYPE || 'roboflow'; // 'roboflow' | 'aws' | 'gcp' | 'azure'

// API endpoints and keys
const ROBOFLOW_API_KEY = process.env.ROBOFLOW_API_KEY;
const ROBOFLOW_MODEL_ENDPOINT = process.env.ROBOFLOW_MODEL_ENDPOINT;
const AWS_LAMBDA_ENDPOINT = process.env.AWS_LAMBDA_ENDPOINT;
const GCP_CLOUD_RUN_ENDPOINT = process.env.GCP_CLOUD_RUN_ENDPOINT;
const AZURE_FUNCTION_ENDPOINT = process.env.AZURE_FUNCTION_ENDPOINT;

// Confidence thresholds
const MIN_CONFIDENCE = parseFloat(process.env.AI_MIN_CONFIDENCE || '0.5');
const DETECTION_TIMEOUT = parseInt(process.env.AI_TIMEOUT_MS || '30000');

// ============================================================================
// MAIN HANDLER
// ============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AIInspectionResult>
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

    console.log(`[AI Analysis API] Processing ${images.length} images for extinguisher ${extinguisherInfo?.serialNo}`);
    console.log(`[AI Analysis API] Using deployment type: ${DEPLOYMENT_TYPE}`);

    // Route to appropriate detection service
    let yoloResults: YOLOImageResult[];

    switch (DEPLOYMENT_TYPE) {
      case 'roboflow':
        yoloResults = await detectWithRoboflow(images);
        break;
      case 'aws':
        yoloResults = await detectWithAWS(images, extinguisherInfo);
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
      `${inspectionResult.detections.length} fields analyzed`
    );

    return res.status(200).json(inspectionResult);

  } catch (error: any) {
    console.error('[AI Analysis API] Error:', error);

    return res.status(500).json({
      success: false,
      detections: [],
      extractedData: {},
      error: error.message || 'Failed to analyze images',
      processingTime: Date.now() - startTime,
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
        }
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
      console.error(`[Roboflow] Error processing image ${image.stepId}:`, error);
      results.push({
        stepId: image.stepId,
        detections: [],
      });
    }
  }

  return results;
}

// ============================================================================
// DEPLOYMENT OPTION 2: AWS LAMBDA
// ============================================================================

async function detectWithAWS(
  images: CapturedImage[],
  extinguisherInfo: any
): Promise<YOLOImageResult[]> {
  if (!AWS_LAMBDA_ENDPOINT) {
    console.warn('[AI Analysis] AWS Lambda not configured, using mock data');
    return generateMockDetections(images);
  }

  try {
    const response = await fetch(AWS_LAMBDA_ENDPOINT, {
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
      throw new Error(`AWS Lambda error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.results || [];

  } catch (error: any) {
    console.error('[AWS Lambda] Error:', error);
    throw error;
  }
}

// ============================================================================
// DEPLOYMENT OPTION 3: GOOGLE CLOUD RUN
// ============================================================================

async function detectWithGCP(
  images: CapturedImage[],
  extinguisherInfo: any
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
        bbox: det.bbox
      }))
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
  extinguisherInfo: any
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
  console.log('[AI Analysis] Using mock detection data for testing');

  // Simulate processing delay (like a real AI service)
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Generate realistic mock detections
  return images.map(image => ({
    stepId: image.stepId,
    detections: [
      // Shell component
      { class: 'shell', confidence: 0.92, bbox: [100, 50, 300, 500] },
      // Hose component
      { class: 'hose', confidence: 0.88, bbox: [250, 100, 350, 400] },
      // Nozzle component
      { class: 'nozzle', confidence: 0.85, bbox: [250, 80, 350, 150] },
      // Pressure gauge
      { class: 'pressure_gauge', confidence: 0.95, bbox: [150, 150, 250, 250] },
      // Safety pin
      { class: 'safety_pin', confidence: 0.90, bbox: [180, 100, 220, 140] },
      // Pin seal
      { class: 'pin_seal', confidence: 0.87, bbox: [180, 110, 220, 130] },
      // Service tag
      { class: 'service_tag', confidence: 0.91, bbox: [120, 300, 220, 400] },
    ],
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
