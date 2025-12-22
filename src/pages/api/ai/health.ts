/**
 * AI Model Server Health Check API
 *
 * This endpoint checks the connectivity and health of the AI model server.
 * Use this to diagnose deployment issues with the AI detection feature.
 */

import { NextApiRequest, NextApiResponse } from 'next';

const AI_MODEL_ENDPOINT = process.env.AI_MODEL_ENDPOINT;
const AI_DEPLOYMENT_TYPE = process.env.AI_DEPLOYMENT_TYPE || 'roboflow';

interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'unconfigured';
  deploymentType: string;
  aiModelEndpoint: string | null;
  aiServerStatus?: {
    reachable: boolean;
    modelLoaded?: boolean;
    runtime?: string;
    error?: string;
  };
  environment: string;
  timestamp: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthCheckResponse>,
) {
  const result: HealthCheckResponse = {
    status: 'unconfigured',
    deploymentType: AI_DEPLOYMENT_TYPE,
    aiModelEndpoint: AI_MODEL_ENDPOINT ? AI_MODEL_ENDPOINT.replace(/\/\/.*@/, '//***@') : null, // Mask any credentials
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  };

  // Check if we're configured to use DigitalOcean AI server
  if (AI_DEPLOYMENT_TYPE === 'digitalocean') {
    if (!AI_MODEL_ENDPOINT) {
      result.status = 'unconfigured';
      result.aiServerStatus = {
        reachable: false,
        error: 'AI_MODEL_ENDPOINT environment variable is not set',
      };
      return res.status(503).json(result);
    }

    // Try to reach the AI model server health endpoint
    try {
      console.log(`[AI Health] Checking AI server at: ${AI_MODEL_ENDPOINT}/health`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${AI_MODEL_ENDPOINT}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const healthData = await response.json();
        result.status = 'healthy';
        result.aiServerStatus = {
          reachable: true,
          modelLoaded: healthData.model_loaded ?? healthData.modelLoaded,
          runtime: healthData.runtime,
        };
        return res.status(200).json(result);
      } else {
        result.status = 'unhealthy';
        result.aiServerStatus = {
          reachable: true,
          error: `AI server returned status ${response.status}: ${response.statusText}`,
        };
        return res.status(503).json(result);
      }
    } catch (error: any) {
      console.error('[AI Health] Error connecting to AI server:', error);

      result.status = 'unhealthy';
      result.aiServerStatus = {
        reachable: false,
        error:
          error.name === 'AbortError'
            ? 'Connection to AI server timed out (10s)'
            : `Failed to connect to AI server: ${error.message}`,
      };
      return res.status(503).json(result);
    }
  } else if (AI_DEPLOYMENT_TYPE === 'roboflow') {
    // Check Roboflow configuration
    const hasRoboflowConfig = !!(
      process.env.ROBOFLOW_API_KEY && process.env.ROBOFLOW_MODEL_ENDPOINT
    );

    if (hasRoboflowConfig) {
      result.status = 'healthy';
      result.aiServerStatus = {
        reachable: true,
        runtime: 'Roboflow Cloud',
      };
    } else {
      result.status = 'unconfigured';
      result.aiServerStatus = {
        reachable: false,
        error:
          'Roboflow API not configured (ROBOFLOW_API_KEY and/or ROBOFLOW_MODEL_ENDPOINT missing)',
      };
    }

    return res.status(hasRoboflowConfig ? 200 : 503).json(result);
  } else {
    // Other deployment types
    result.status = 'unconfigured';
    result.aiServerStatus = {
      reachable: false,
      error: `Unknown deployment type: ${AI_DEPLOYMENT_TYPE}`,
    };
    return res.status(503).json(result);
  }
}
