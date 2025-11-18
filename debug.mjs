/**
 * Debug script to check database and Redis state
 */

import 'dotenv/config';
import { createClient } from 'redis';
import { PrismaClient } from './db/generated/prisma/index.js';

const prisma = new PrismaClient();
const redis = createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

async function debug() {
  console.log('🔍 Debug Report\n');

  try {
    // Check Redis connection
    console.log('📍 Checking Redis...');
    await redis.connect();
    const info = await redis.info();
    console.log('✅ Redis connected');

    // Check queue length
    const queueLength = await redis.lLen('video-queue');
    console.log(`📊 Jobs in queue: ${queueLength}`);

    if (queueLength > 0) {
      const job = await redis.lRange('video-queue', 0, 0);
      console.log(`📥 First job: ${job[0]}`);
    }

    await redis.disconnect();

    // Check database
    console.log('\n💾 Checking Database...');
    
    const videoCount = await prisma.video.count();
    console.log(`📊 Total videos: ${videoCount}`);

    const latestVideos = await prisma.video.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        videoUrl: true,
        createdAt: true,
        prompt: {
          select: {
            inputText: true,
            codeSnippet: {
              select: {
                code: true
              }
            }
          }
        }
      }
    });

    console.log('\n📹 Latest 5 Videos:');
    latestVideos.forEach((video, idx) => {
      console.log(`\n  [${idx + 1}] ID: ${video.id}`);
      console.log(`      Status: ${video.status}`);
      console.log(`      URL: ${video.videoUrl || 'None'}`);
      console.log(`      Created: ${video.createdAt.toISOString()}`);
      console.log(`      Prompt: ${video.prompt?.inputText?.substring(0, 50) || 'N/A'}...`);
      console.log(`      Code length: ${video.prompt?.codeSnippet?.code?.length || 0} chars`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debug();
