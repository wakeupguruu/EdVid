/**
 * Video Processing Worker
 * NOTE: This file exports utilities only. The actual worker runs as a separate process (worker.js)
 * This keeps Bull's child process requirements out of Next.js
 */

import { PrismaClient } from '@/db/generated/prisma';
import { logger } from '@/lib/logger';

const prisma = new PrismaClient();

/**
 * Get job status from database
 * Called from /api/videos/[videoId]/status/route.ts
 */
export async function getJobStatus(videoId: string) {
  try {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: {
        id: true,
        status: true,
        videoUrl: true,
        errorMessage: true,
        processingStartedAt: true,
        processingCompletedAt: true,
      }
    });

    if (!video) {
      return { status: 'not-found' };
    }

    return {
      videoId: video.id,
      status: video.status,
      videoUrl: video.videoUrl,
      errorMessage: video.errorMessage,
      processingLogs: [],
      startedAt: video.processingStartedAt,
      completedAt: video.processingCompletedAt
    };
  } catch (error) {
    logger.error('Failed to get job status', { error });
    throw error;
  }
}

export default { getJobStatus };
