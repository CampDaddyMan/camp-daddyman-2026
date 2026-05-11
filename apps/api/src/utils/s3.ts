import { Upload } from '@aws-sdk/lib-storage';
import { DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3, R2_BUCKET, R2_PUBLIC_URL } from '../config/storage';

export async function uploadToS3(file: Express.Multer.File, folder: string): Promise<string> {
  const safeName = file.originalname.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.\-_]/g, '');
  const key = `${folder}/${Date.now()}-${safeName}`;

  await new Upload({
    client: s3,
    params: {
      Bucket:      R2_BUCKET,
      Key:         key,
      Body:        file.buffer,
      ContentType: file.mimetype,
    },
  }).done();

  // Return the public CDN URL (R2 public bucket URL or custom domain)
  return `${R2_PUBLIC_URL}/${key}`;
}

export async function deleteFromS3(fileUrl: string): Promise<void> {
  const key = extractKey(fileUrl);
  if (!key) return;
  await s3.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
}

// Short-lived signed URL for subscriber-only / private content
export async function getSignedMediaUrl(fileUrl: string, expiresIn = 3600): Promise<string> {
  const key = extractKey(fileUrl);
  if (!key) return fileUrl;
  const command = new GetObjectCommand({ Bucket: R2_BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn });
}

/** Strip the public base URL to get the object key */
function extractKey(fileUrl: string): string {
  if (R2_PUBLIC_URL && fileUrl.startsWith(R2_PUBLIC_URL)) {
    return fileUrl.slice(R2_PUBLIC_URL.length + 1); // +1 for the leading slash
  }
  // Fallback: take everything after the first slash following the hostname
  try {
    return new URL(fileUrl).pathname.replace(/^\//, '');
  } catch {
    return '';
  }
}
