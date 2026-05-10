import { S3Client } from '@aws-sdk/client-s3';

export const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  region: process.env.AWS_REGION || 'us-east-1',
});

export const S3_BUCKET = process.env.AWS_S3_BUCKET!;
export const S3_REGION = process.env.AWS_REGION || 'us-east-1';
