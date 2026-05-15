import { S3Client } from '@aws-sdk/client-s3';

// Cloudflare R2 is S3-compatible — same SDK, different endpoint
export const s3 = new S3Client({
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  region: 'auto',
  forcePathStyle: false,
  // Prevents x-amz-checksum-mode=ENABLED from being injected into signed URLs — R2 rejects it
  requestChecksumCalculation: 'WHEN_REQUIRED',
});

export const R2_BUCKET     = process.env.R2_BUCKET!;
export const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
