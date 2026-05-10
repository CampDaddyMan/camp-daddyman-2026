import { Upload } from '@aws-sdk/lib-storage';
import { DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3, S3_BUCKET, S3_REGION } from '../config/aws';

export async function uploadToS3(file: Express.Multer.File, folder: string): Promise<string> {
  const key = `${folder}/${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;

  const upload = new Upload({
    client: s3,
    params: {
      Bucket: S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    },
  });

  await upload.done();
  return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;
}

export async function deleteFromS3(fileUrl: string): Promise<void> {
  const key = fileUrl.split('.amazonaws.com/')[1];
  if (!key) return;
  await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
}

// Generate a short-lived signed URL for private/subscriber-only content
export async function getSignedMediaUrl(fileUrl: string, expiresIn = 3600): Promise<string> {
  const key = fileUrl.split('.amazonaws.com/')[1];
  const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn });
}
