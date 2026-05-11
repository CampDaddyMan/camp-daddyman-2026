import { Queue } from 'bullmq';
import { redisConnection } from './redis';

export interface TranscodeJobData {
  contentId: string;
  mediaUrl: string;
  contentType: string;
}

export const transcodeQueue = new Queue<TranscodeJobData>('transcode', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 30_000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});
