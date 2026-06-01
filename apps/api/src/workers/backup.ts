import { spawn } from 'child_process';
import { createGzip } from 'zlib';
import { PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { s3 } from '../config/storage';

const BACKUP_PREFIX = 'db-backups';
const RETAIN_DAYS   = 30;
const BUCKET        = process.env.R2_BUCKET!;

// Stream pg_dump stdout through gzip into a Buffer
function pgDumpToBuffer(dbUrl: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pg     = spawn('pg_dump', ['--no-password', '--format=plain', dbUrl]);
    const gz     = createGzip({ level: 9 });
    const chunks: Buffer[] = [];

    pg.stdout.pipe(gz);
    gz.on('data',  (chunk: Buffer) => chunks.push(chunk));
    gz.on('end',   () => resolve(Buffer.concat(chunks)));
    gz.on('error', reject);

    pg.stderr.on('data', (d: Buffer) => console.error('[Backup] pg_dump:', d.toString().trim()));
    pg.on('error', reject);
    pg.on('close', (code) => {
      if (code !== 0) reject(new Error(`pg_dump exited with code ${code}`));
    });
  });
}

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

  const buffer = await pgDumpToBuffer(process.env.DATABASE_URL!);

  await s3.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    Body:        buffer,
    ContentType: 'application/gzip',
  }));

  const mb = (buffer.length / 1024 / 1024).toFixed(2);
  console.log(`[Backup] ✓ ${mb} MB uploaded → ${key}`);

  await pruneOldBackups();
}
