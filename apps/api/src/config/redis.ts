import Redis from 'ioredis';

export const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
});

redisConnection.on('error', (err) => {
  // Only log, never crash the server
  if ((err as any).code !== 'ECONNREFUSED') {
    console.error('[Redis]', err.message);
  }
});
