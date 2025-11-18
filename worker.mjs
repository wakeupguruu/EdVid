/**
 * Simple Redis-based Video Worker
 * Listens to 'video-queue' Redis list for jobs
 * Start with: node worker.mjs
 */

import 'dotenv/config';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from 'redis';
import { PrismaClient } from './db/generated/prisma/index.js';
import FormData from 'form-data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Global Prisma singleton to avoid connection exhaustion
const globalObj = global;
globalObj.prismaInstance = globalObj.prismaInstance || new PrismaClient({
  log: ['error'],
});
const prisma = globalObj.prismaInstance;

// Redis connection
const redis = createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

redis.on('error', (err) => console.error('❌ Redis Client Error', err));
redis.on('connect', () => console.log('✅ Connected to Redis'));

// Python service URL
const MANIM_SERVICE_URL = process.env.MANIM_SERVICE_URL || 'http://localhost:5000';

console.log('🚀 Video Worker started...');
console.log(`📍 Redis: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`);
console.log(`🐍 Python Service: ${MANIM_SERVICE_URL}`);

async function processJob(jobData) {
  const { videoId, userId, promptId } = jobData;

  console.log(`\n⏳ [Worker] Processing video ${videoId} for user ${userId}`);

  try {
    // Update status to processing
    await prisma.video.update({
      where: { id: videoId },
      data: { status: 'processing', processingStartedAt: new Date() }
    });

    console.log(`   📍 Status updated to processing`);

    // Get code from database
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        prompt: {
          include: { codeSnippet: true }
        }
      }
    });

    if (!video || !video.prompt?.codeSnippet) {
      throw new Error('Video or code snippet not found');
    }

    const pythonCode = video.prompt.codeSnippet.code;
    console.log(`   🐍 Python code length: ${pythonCode.length} chars`);

    // Call Python service
    console.log(`   📞 Calling Python service at ${MANIM_SERVICE_URL}...`);
    
    const response = await axios.post(
      `${MANIM_SERVICE_URL}/execute`,
      {
        videoId,
        pythonCode
      },
      { timeout: 600000 } // 10 min
    );

    if (!response.data.success) {
      throw new Error(`Manim failed: ${response.data.error}`);
    }

    const { videoPath, tempDir } = response.data;
    console.log(`   ✅ Video generated at ${videoPath}`);

    // Check if file exists
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    console.log(`   ☁️  Uploading to Cloudinary...`);

    // Upload to Cloudinary
    const form = new FormData();
    form.append('file', fs.createReadStream(videoPath));
    form.append('upload_preset', process.env.CLOUDINARY_UPLOAD_PRESET);
    form.append('resource_type', 'video');

    const cloudinaryResponse = await axios.post(
      `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload`,
      form,
      { headers: form.getHeaders(), timeout: 300000 }
    );

    const videoUrl = cloudinaryResponse.data.secure_url;
    console.log(`   🔗 Video URL: ${videoUrl}`);

    // Update database
    console.log(`   💾 Updating database...`);
    
    await prisma.video.update({
      where: { id: videoId },
      data: {
        status: 'completed',
        videoUrl,
        processingCompletedAt: new Date()
      }
    });

    // Cleanup temp files
    try {
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true });
        console.log(`   🧹 Cleaned up temp files`);
      }
    } catch (e) {
      console.warn(`   ⚠️  Failed to cleanup ${tempDir}`);
    }

    console.log(`   ✨ Video ${videoId} completed!\n`);
    return true;

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

    return false;
  }
}

async function startWorker() {
  await redis.connect();

  console.log('👂 Listening for jobs on video-queue...\n');

  // Poll for jobs
  while (true) {
    try {
      // Pop a job from the queue (blocking for 5 seconds)
      const jobJson = await redis.brPop('video-queue', 5);

      if (jobJson && jobJson.element) {
        try {
          const jobData = JSON.parse(jobJson.element);
          console.log(`📥 Job received:`, jobData);
          await processJob(jobData);
        } catch (parseError) {
          console.error('❌ Failed to parse job:', parseError);
        }
      }
    } catch (error) {
      console.error('❌ Worker error:', error);
      // Continue listening even on error
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down worker...');
  await redis.disconnect();
  await prisma.$disconnect();
  process.exit(0);
});

// Start the worker
startWorker().catch(console.error);
