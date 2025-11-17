import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/db/generated/prisma';
import { logger } from '@/lib/logger';

const prisma = new PrismaClient();

/**
 * Webhook endpoint that receives notifications from Manim execution service
 * Called when video processing is complete or failed
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { videoId, status, videoUrl, duration, errorMessage } = body;

    logger.info(`Received webhook for video ${videoId}`, { status, videoUrl });

    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    // Find video in database
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: { prompt: { select: { userId: true } } }
    });

    if (!video) {
      logger.warn(`Video not found: ${videoId}`);
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    if (status === 'completed') {
      // Update video with generated URL and duration
      await prisma.video.update({
        where: { id: videoId },
        data: {
          status: 'completed',
          videoUrl,
          duration,
          processingCompletedAt: new Date()
        }
      });

      await prisma.videoProcessingLog.create({
        data: {
          videoId,
          stage: 'completed',
          message: `Video uploaded to Cloudinary: ${videoUrl}`,
          level: 'info'
        }
      });

      logger.info(`Video ${videoId} completed successfully`, {
        url: videoUrl,
        duration
      });

    } else if (status === 'failed') {
      // Update video with error status
      await prisma.video.update({
        where: { id: videoId },
        data: {
          status: 'failed',
          errorMessage,
          processingCompletedAt: new Date()
        }
      });

      await prisma.videoProcessingLog.create({
        data: {
          videoId,
          stage: 'failed',
          message: errorMessage || 'Video processing failed',
          level: 'error'
        }
      });

      logger.error(`Video ${videoId} failed`, { error: errorMessage });
    }

    return NextResponse.json({
      success: true,
      message: `Video ${videoId} status updated to ${status}`
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Webhook error', { error: errorMessage });

    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
