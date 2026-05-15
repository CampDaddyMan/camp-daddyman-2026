import { Queue } from 'bullmq';
import { redisConnection } from './redis';

export interface TranscodeJobData {
  contentId: string;
  mediaUrl: string;
  contentType: string;
}

let _queue: Queue<TranscodeJobData> | null = null;

export function getTranscodeQueue(): Queue<TranscodeJobData> | null {
  if (_queue) return _queue;
  try {
    _queue = new Queue<TranscodeJobData>('transcode', {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
    return _queue;
  } catch {
    return null;
  }
}
