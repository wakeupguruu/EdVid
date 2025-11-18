/**
 * Standalone Bull Queue Worker
 * This runs as a separate Node.js process, not inside Next.js
 * Start with: node worker.js
 */

import('dotenv/config');
import Queue from 'bull';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from './db/generated/prisma/index.js';

const prisma = new PrismaClient();

// Redis connection
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

// Python service URL
const MANIM_SERVICE_URL = process.env.MANIM_SERVICE_URL || 'http://localhost:5000';

// Create queue
const videoQueue = new Queue('video-processing', redisConfig);

console.log('🚀 Bull Worker started...');
console.log(`📍 Redis: ${redisConfig.host}:${redisConfig.port}`);
console.log(`🐍 Python Service: ${MANIM_SERVICE_URL}`);

/**
 * Process video jobs
 */
videoQueue.process('generate-video', async (job) => {
  const { videoId, userId } = job.data;

  try {
    console.log(`\n⏳ [Worker] Processing video ${videoId} for user ${userId}`);
    job.progress(10);

    // STEP 1: Get code from database
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        prompt: {
          include: { codeSnippet: true, user: true }
        }
      }
    });

    if (!video || video.prompt.userId !== userId) {
      throw new Error('Video or access denied');
    }

    if (!video.prompt.codeSnippet) {
      throw new Error('No code snippet found');
    }

    const pythonCode = video.prompt.codeSnippet.code;

    // Update status to "processing"
    await prisma.video.update({
      where: { id: videoId },
      data: { status: 'processing', processingStartedAt: new Date() }
    });

    job.progress(20);
    console.log(`   📞 Calling Python service...`);

    // STEP 2: Call Python Manim service
    const response = await axios.post(
      `${MANIM_SERVICE_URL}/execute`,
      { videoId, pythonCode },
      { timeout: 600000 } // 10 min
    );

    if (!response.data.success) {
      throw new Error(`Manim failed: ${response.data.error}`);
    }

    const { videoPath, tempDir } = response.data;
    job.progress(50);
    console.log(`   ✅ Video generated at ${videoPath}`);

    // STEP 3: Check if file exists
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    job.progress(70);

    // STEP 4: Upload to Cloudinary
    console.log(`   ☁️  Uploading to Cloudinary...`);
    
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', fs.createReadStream(videoPath));
    form.append('upload_preset', process.env.CLOUDINARY_UPLOAD_PRESET);
    form.append('resource_type', 'video');

    const cloudinaryResponse = await axios.post(
      `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload`,
      form,
      { headers: form.getHeaders() }
    );

    const videoUrl = cloudinaryResponse.data.secure_url;
    job.progress(85);
    console.log(`   🔗 Video URL: ${videoUrl}`);

    // STEP 5: Update database
    console.log(`   💾 Updating database...`);
    
    await prisma.video.update({
      where: { id: videoId },
      data: {
        status: 'completed',
        videoUrl,
        processingCompletedAt: new Date()
      }
    });

    // Cleanup
    try {
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true });
        console.log(`   🧹 Cleaned up temp files`);
      }
    } catch (e) {
      console.warn(`   ⚠️  Failed to cleanup ${tempDir}`);
    }

    job.progress(100);
    console.log(`   ✨ Video ${videoId} completed!\n`);

    return { videoId, videoUrl, status: 'completed' };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`   ❌ Video ${videoId} failed: ${errorMsg}\n`);

    // Update database with error
    try {
      await prisma.video.update({
        where: { id: videoId },
        data: {
          status: 'failed',
          errorMessage: errorMsg,
          processingCompletedAt: new Date()
        }
      });
    } catch (dbError) {
      console.error(`   ❌ Failed to update database with error`);
    }

    throw error;
  }
});

// Job events
videoQueue.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

videoQueue.on('failed', (job, err) => {
  console.error(`❌ Job ${job.id} failed: ${err.message}`);
});

videoQueue.on('retry', (job) => {
  console.warn(`🔄 Job ${job.id} retrying (attempt ${job.attemptsMade + 1}/3)`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down worker...');
  await videoQueue.close();
  await prisma.$disconnect();
  process.exit(0);
});
