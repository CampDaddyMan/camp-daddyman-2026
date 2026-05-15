import { Upload } from '@aws-sdk/lib-storage';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import * as fs from 'fs';
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

export async function getSignedMediaUrl(fileUrl: string, expiresIn = 3600): Promise<string> {
  const key = extractKey(fileUrl);
  if (!key) return fileUrl;
  const command = new GetObjectCommand({ Bucket: R2_BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn });
}

// Sign any R2 URL — falls back to original if signing fails
export async function signR2Url(url: string | null | undefined, expiresIn = 86400): Promise<string | null> {
  if (!url) return null;
  if (!url.startsWith('http')) return url; // local/relative path, leave as-is
  try {
    return await getSignedMediaUrl(url, expiresIn);
  } catch {
    return url;
  }
}

/** Download an R2 object to a local file path */
export async function downloadFromS3(fileUrl: string, destPath: string): Promise<void> {
  const key = extractKey(fileUrl);
  if (!key) throw new Error(`Cannot extract key from URL: ${fileUrl}`);
  const response = await s3.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }));
  const stream = response.Body as Readable;
  await new Promise<void>((resolve, reject) => {
    const writer = fs.createWriteStream(destPath);
    stream.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
    stream.on('error', reject);
  });
}

/** Upload a raw Buffer or file path to R2 under a specific key, return public URL */
export async function uploadRawToS3(
  body: Buffer,
  key: string,
  contentType: string,
): Promise<string> {
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
  return `${R2_PUBLIC_URL}/${key}`;
}

/** Strip the public base URL to get the object key */
export function extractKey(fileUrl: string): string {
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
