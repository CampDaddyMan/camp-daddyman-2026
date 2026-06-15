import { spawn } from 'child_process';
import { createGzip } from 'zlib';
import { ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { s3 } from '../config/storage';

const BACKUP_PREFIX = 'db-backups';
const RETAIN_DAYS   = 30;
const BUCKET        = process.env.R2_BUCKET!;

// Delete backups older than RETAIN_DAYS
async function pruneOldBackups(): Promise<void> {
  const cutoff = new Date(Date.now() - RETAIN_DAYS * 86_400_000);

  const list = await s3.send(new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: BACKUP_PREFIX + '/',
  }));

  const stale = (list.Contents ?? []).filter(
    (obj) => obj.LastModified && obj.LastModified < cutoff,
  );

  for (const obj of stale) {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: obj.Key! }));
    console.log(`[Backup] Pruned: ${obj.Key}`);
  }
}

export async function runDatabaseBackup(): Promise<void> {
  const label = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const key   = `${BACKUP_PREFIX}/${label}.sql.gz`;

  console.log(`[Backup] Starting → ${key}`);

  // Stream pg_dump → gzip → R2 directly. Memory stays bounded (one multipart
  // part at a time) instead of buffering the whole dump.
  const pg = spawn('pg_dump', ['--no-password', '--format=plain', process.env.DATABASE_URL!]);
  const gz = createGzip({ level: 9 });
  pg.stdout.pipe(gz);

  pg.stderr.on('data', (d: Buffer) => console.error('[Backup] pg_dump:', d.toString().trim()));
  pg.on('error', (err) => gz.destroy(err));
  // If pg_dump fails mid-stream, tear down the gzip stream so the upload aborts
  // rather than saving a truncated, corrupt backup that looks valid.
  pg.on('close', (code) => {
    if (code !== 0) gz.destroy(new Error(`pg_dump exited with code ${code}`));
  });

  const upload = new Upload({
    client: s3,
    params: { Bucket: BUCKET, Key: key, Body: gz, ContentType: 'application/gzip' },
  });

  await upload.done();   // rejects and aborts the multipart upload if gz was destroyed
  console.log(`[Backup] ✓ uploaded → ${key}`);

  await pruneOldBackups();
}
