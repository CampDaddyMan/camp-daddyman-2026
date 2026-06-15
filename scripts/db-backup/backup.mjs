// Scheduled DB backup: pg_dump -> gzip -> local temp -> Cloudflare R2, with verify + prune.
// Run by .github/workflows/db-backup.yml. Fully env-driven; prints no secrets.
// Exits non-zero on any failure so the workflow's failure-alert step fires.
import { spawn } from 'node:child_process';
import { createGzip } from 'node:zlib';
import { createWriteStream, statSync, createReadStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  S3Client, HeadObjectCommand, ListObjectsV2Command, DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

const {
  DATABASE_URL,
  R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET,
  PG_DUMP = 'pg_dump',
} = process.env;

const RETAIN_DAYS    = Number(process.env.RETAIN_DAYS || 30);
const MIN_DUMP_BYTES = 1000; // guard against empty/failed dumps
const PREFIX         = 'db-backups';

for (const [k, v] of Object.entries({ DATABASE_URL, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET })) {
  if (!v) { console.error(`❌ Missing required env: ${k}`); process.exit(1); }
}

const label     = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const key       = `${PREFIX}/${label}.sql.gz`;
const localPath = join(tmpdir(), `${label}.sql.gz`);

const s3 = new S3Client({
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  region: 'auto',
  forcePathStyle: false,
  // R2 rejects the SDK's default checksum headers — match apps/api/src/config/storage.ts
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

function dumpToLocal() {
  return new Promise((resolve, reject) => {
    const pg  = spawn(PG_DUMP, ['--no-password', '--format=plain', DATABASE_URL]);
    const gz  = createGzip({ level: 9 });
    const out = createWriteStream(localPath);
    let stderr = '';
    pg.stdout.pipe(gz).pipe(out);
    pg.stderr.on('data', (d) => { stderr += d.toString(); });
    pg.on('error', reject);
    out.on('error', reject);
    // Fail loudly on a bad dump so we never upload a truncated, corrupt-but-valid-looking file.
    pg.on('close', (code) => { if (code !== 0) reject(new Error(`pg_dump exited ${code}: ${stderr.trim()}`)); });
    out.on('finish', () => resolve(stderr.trim()));
  });
}

async function pruneOldBackups() {
  const cutoff = new Date(Date.now() - RETAIN_DAYS * 86_400_000);
  const list = await s3.send(new ListObjectsV2Command({ Bucket: R2_BUCKET, Prefix: PREFIX + '/' }));
  for (const obj of (list.Contents ?? [])) {
    if (obj.LastModified && obj.LastModified < cutoff) {
      await s3.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: obj.Key }));
      console.log(`   pruned (>${RETAIN_DAYS}d): ${obj.Key}`);
    }
  }
}

try {
  console.log(`[1/4] Dumping database -> ${localPath}`);
  const warn = await dumpToLocal();
  if (warn) console.log('      pg_dump notices:', warn);

  const bytes = statSync(localPath).size;
  if (bytes < MIN_DUMP_BYTES) throw new Error(`Dump suspiciously small (${bytes} bytes) — aborting.`);
  console.log(`[2/4] Local dump OK: ${(bytes / 1024 / 1024).toFixed(2)} MB`);

  console.log(`[3/4] Uploading -> r2://${R2_BUCKET}/${key}`);
  await new Upload({
    client: s3,
    params: { Bucket: R2_BUCKET, Key: key, Body: createReadStream(localPath), ContentType: 'application/gzip' },
  }).done();

  const head = await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
  if (head.ContentLength !== bytes) throw new Error(`Size mismatch: local ${bytes} vs R2 ${head.ContentLength}`);
  console.log(`[4/4] Verified in R2: ${head.ContentLength} bytes`);

  await pruneOldBackups();
  console.log(`\n✅ BACKUP COMPLETE → ${key}`);
} catch (err) {
  console.error(`\n❌ BACKUP FAILED: ${err.message}`);
  process.exit(1);
}
