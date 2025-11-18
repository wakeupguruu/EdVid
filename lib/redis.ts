// lib/redis.ts
import { createClient } from 'redis';
import { logger } from '@/lib/logger';

const client = createClient({
  url: process.env.REDIS_URL || undefined,
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

let isConnected = false;

export async function getRedisClient() {
  if (!isConnected) {
    await client.connect();
    isConnected = true;
    logger.info('✅ [Redis] Connected');
  }
  return client;
}
