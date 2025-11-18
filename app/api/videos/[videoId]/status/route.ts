import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/db/generated/prisma';
import { getServerSession } from 'next-auth';
import { Next_Auth } from '@/lib/auth';
import { ExtendedUser } from '@/lib/auth';
import { logger } from '@/lib/logger';

const prisma = new PrismaClient();

/**
 * Get video status and progress
 * Frontend polls this endpoint every 2 seconds
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const session = await getServerSession(Next_Auth);
    const user = session?.user as ExtendedUser;

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { videoId } = await params;

    // Get video with latest processing logs
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        prompt: { select: { userId: true } },
        processingLogs: true
      }
    });    
    if (!video || video.prompt.userId !== user.id) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    return NextResponse.json({
      videoId: video.id,
      status: video.status, // queued, processing, completed, failed
      videoUrl: video.videoUrl,
      duration: video.duration,
      errorMessage: video.errorMessage,
      createdAt: video.createdAt,
      processingStartedAt: video.processingStartedAt,
      processingCompletedAt: video.processingCompletedAt,
      logs: video.processingLogs
    });

  } catch (error) {
    logger.error('Status endpoint error', { error });
    return NextResponse.json(
      { error: 'Failed to fetch status' },
      { status: 500 }
    );
  }
}
