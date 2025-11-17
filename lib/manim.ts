/**
 * Utility to communicate with Manim Execution Service
 * Handles sending Python code to VM and receiving video URLs
 */

import { logger } from './logger';

interface ManifExecuteRequest {
  videoId: string;
  pythonCode: string;
  quality?: 'l' | 'm' | 'h'; // l=low(480p), m=medium(720p), h=high(1080p)
}

interface ManifExecuteResponse {
  videoId: string;
  status: 'completed' | 'failed' | 'queued';
  videoUrl?: string;
  duration?: number;
  errorMessage?: string;
}


// Get the Manim service URL from environment or use default
const MANIM_SERVICE_URL = process.env.MANIM_SERVICE_URL || 'http://localhost:5000';

/**
 * Execute Manim code synchronously on VM
 * Returns video URL after execution completes
 * 
 * @param videoId - Unique video identifier
 * @param pythonCode - Complete Manim Python script
 * @param quality - Video quality ('l'=low fast, 'h'=high slow)
 * @returns Video URL and metadata
 */
export async function executeManim(
  videoId: string,
  pythonCode: string,
  quality: 'l' | 'm' | 'h' = 'l'
): Promise<ManifExecuteResponse> {
  try {
    logger.info(`Executing Manim code for video ${videoId}`, { quality });

    const response = await fetch(`${MANIM_SERVICE_URL}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoId,
        pythonCode,
        quality,
      } as ManifExecuteRequest),
      timeout: 600000, // 10 minute timeout for Manim execution
    }as RequestInit);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Manim execution failed');
    }

    const result: ManifExecuteResponse = await response.json();

    if (result.status === 'completed') {
      logger.info(`Video ${videoId} generated successfully`, {
        url: result.videoUrl,
        duration: result.duration,
      });
    } else {
      logger.error(`Video ${videoId} generation failed`, {
        error: result.errorMessage,
      });
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Manim execution error', {
      videoId,
      error: errorMessage,
    });

    return {
      videoId,
      status: 'failed',
      errorMessage: errorMessage,
    };
  }
}

/**
 * Execute Manim code asynchronously on VM
 * Returns immediately, video will be uploaded to Cloudinary
 * Next.js app receives webhook callback when ready
 * 
 * @param videoId - Unique video identifier
 * @param pythonCode - Complete Manim Python script
 * @param quality - Video quality ('l'=low fast, 'h'=high slow)
 */
export async function executeManifAsync(
  videoId: string,
  pythonCode: string,
  quality: 'l' | 'm' | 'h' = 'l'
): Promise<void> {
  try {
    logger.info(`Queuing async Manim execution for video ${videoId}`, { quality });

    const response = await fetch(`${MANIM_SERVICE_URL}/execute-async`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoId,
        pythonCode,
        quality,
      } as ManifExecuteRequest),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to queue Manim execution');
    }

    logger.info(`Video ${videoId} queued for async processing`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Manim async queue error', {
      videoId,
      error: errorMessage,
    });

    throw error;
  }
}

/**
 * Health check for Manim service
 * Verifies the VM backend is running and Cloudinary is configured
 */
export async function checkManifServiceHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${MANIM_SERVICE_URL}/health`);
    return response.ok;
  } catch {
    logger.warn('Manim service health check failed');
    return false;
  }
}
