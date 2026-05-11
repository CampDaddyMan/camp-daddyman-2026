import { Worker } from 'bullmq';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { redisConnection } from '../config/redis';
import { TranscodeJobData } from '../config/queue';
import { prisma } from '../config/database';
import { downloadFromS3, uploadRawToS3 } from '../utils/s3';
import { R2_PUBLIC_URL } from '../config/storage';
import { notifyFollowers } from '../utils/notifications';

// Only FILM gets HLS video transcoding; all other types activate immediately
const VIDEO_TYPES = new Set(['FILM']);

function ffmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const p = spawn('ffmpeg', ['-version'], { stdio: 'ignore' });
    p.on('close', (code) => resolve(code === 0));
    p.on('error', () => resolve(false));
  });
}

function runFFmpeg(inputPath: string, outputDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const manifestPath = path.join(outputDir, 'index.m3u8');
    const segmentPattern = path.join(outputDir, 'seg%d.ts');

    const args = [
      '-y',
      '-i', inputPath,
      // video: scale to 720p max height, H.264
      '-vf', 'scale=-2:min(720\\,ih)',
      '-c:v', 'libx264', '-crf', '23', '-preset', 'fast',
      '-profile:v', 'main',
      // audio: AAC 128k
      '-c:a', 'aac', '-b:a', '128k', '-ar', '44100',
      // HLS options
      '-hls_time', '6',
      '-hls_list_size', '0',
      '-hls_segment_type', 'mpegts',
      '-hls_segment_filename', segmentPattern,
      '-f', 'hls',
      manifestPath,
    ];

    let stderr = '';
    const proc = spawn('ffmpeg', args);
    proc.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-800)}`));
    });
    proc.on('error', (err) => reject(new Error(`ffmpeg spawn error: ${err.message}`)));
  });
}

function extractThumbnail(inputPath: string, thumbPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Seek to 3 seconds (or start of file if shorter), grab one frame
    const proc = spawn('ffmpeg', [
      '-y', '-ss', '3', '-i', inputPath,
      '-frames:v', '1', '-q:v', '2',
      '-vf', 'scale=1280:-2',
      thumbPath,
    ]);
    proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg thumb exit ${code}`))));
    proc.on('error', reject);
  });
}

async function uploadHLSDir(dir: string, prefix: string): Promise<void> {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const key = `${prefix}/${file}`;
    const contentType = file.endsWith('.m3u8')
      ? 'application/vnd.apple.mpegurl'
      : 'video/MP2T';
    const body = fs.readFileSync(filePath);
    await uploadRawToS3(body, key, contentType);
  }
}

export async function startTranscodeWorker(): Promise<void> {
  const hasFFmpeg = await ffmpegAvailable();
  if (!hasFFmpeg) {
    console.warn('[Transcoder] ffmpeg not found — HLS transcoding disabled. Videos will serve as direct MP4.');
    return;
  }

  const worker = new Worker<TranscodeJobData>(
    'transcode',
    async (job) => {
      const { contentId, mediaUrl, contentType } = job.data;

      // Non-video types: just activate directly, no HLS needed
      if (!VIDEO_TYPES.has(contentType)) {
        await prisma.content.update({ where: { id: contentId }, data: { status: 'ACTIVE' } });
        return;
      }

      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `cdm-transcode-${contentId}-`));
      const inputPath = path.join(tmpDir, 'source');
      const outputDir = path.join(tmpDir, 'hls');
      fs.mkdirSync(outputDir);

      try {
        console.log(`[Transcoder] Starting job ${job.id} for content ${contentId}`);

        await job.updateProgress(10);
        await downloadFromS3(mediaUrl, inputPath);

        // Auto-generate thumbnail if none was uploaded
        const existing = await prisma.content.findUnique({
          where: { id: contentId },
          select: { thumbnailUrl: true },
        });
        let autoThumbUrl: string | undefined;
        if (!existing?.thumbnailUrl) {
          const thumbPath = path.join(tmpDir, 'thumb.jpg');
          try {
            await extractThumbnail(inputPath, thumbPath);
            if (fs.existsSync(thumbPath)) {
              const thumbKey = `thumbnails/${contentId}-auto.jpg`;
              autoThumbUrl = await uploadRawToS3(fs.readFileSync(thumbPath), thumbKey, 'image/jpeg');
            }
          } catch (e) {
            console.warn('[Transcoder] Thumbnail extraction failed (non-fatal):', (e as Error).message);
          }
        }

        await job.updateProgress(30);
        await runFFmpeg(inputPath, outputDir);

        await job.updateProgress(80);
        const hlsPrefix = `hls/${contentId}`;
        await uploadHLSDir(outputDir, hlsPrefix);

        const hlsUrl = `${R2_PUBLIC_URL}/${hlsPrefix}/index.m3u8`;
        const updated = await prisma.content.update({
          where: { id: contentId },
          data: {
            hlsUrl,
            status: 'ACTIVE',
            ...(autoThumbUrl && { thumbnailUrl: autoThumbUrl }),
          },
          select: { creatorId: true },
        });

        // Now that it's live, notify followers
        notifyFollowers(updated.creatorId, contentId);

        await job.updateProgress(100);
        console.log(`[Transcoder] Job ${job.id} complete — ${hlsUrl}`);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    },
    {
      connection: redisConnection,
      concurrency: 2,
    },
  );

  worker.on('failed', async (job, err) => {
    console.error(`[Transcoder] Job ${job?.id} failed:`, err.message);
    // Fall back to direct URL playback on failure
    if (job?.data.contentId) {
      await prisma.content.update({
        where: { id: job.data.contentId },
        data: { status: 'ACTIVE' },
      }).catch(() => {});
    }
  });

  console.log('[Transcoder] Worker started (concurrency: 2)');
}
