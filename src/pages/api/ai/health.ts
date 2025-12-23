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
  status: 'healthy' | 'unhealthy' | 'unconfigured' | 'checking';
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
  // Basic result without network calls first
  const result: HealthCheckResponse = {
    status: 'unconfigured',
    deploymentType: AI_DEPLOYMENT_TYPE,
    aiModelEndpoint: AI_MODEL_ENDPOINT || null,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  };

  try {
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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

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
            error: `AI server returned status ${response.status}`,
          };
          return res.status(503).json(result);
        }
      } catch (fetchError: unknown) {
        const errorMessage =
          fetchError instanceof Error ? fetchError.message : 'Unknown fetch error';
        const errorName = fetchError instanceof Error ? fetchError.name : 'Error';

        result.status = 'unhealthy';
        result.aiServerStatus = {
          reachable: false,
          error:
            errorName === 'AbortError'
              ? 'Connection to AI server timed out (10s)'
              : `Failed to connect: ${errorMessage}`,
        };
        return res.status(503).json(result);
      }
    } else if (AI_DEPLOYMENT_TYPE === 'roboflow') {
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
          error: 'Roboflow API not configured',
        };
      }

      return res.status(hasRoboflowConfig ? 200 : 503).json(result);
    } else {
      result.status = 'unconfigured';
      result.aiServerStatus = {
        reachable: false,
        error: `Unknown deployment type: ${AI_DEPLOYMENT_TYPE}`,
      };
      return res.status(503).json(result);
    }
  } catch (error: unknown) {
    // Catch-all error handler
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.status = 'unhealthy';
    result.aiServerStatus = {
      reachable: false,
      error: `Handler error: ${errorMessage}`,
    };
    return res.status(500).json(result);
  }
}
