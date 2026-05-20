import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const rows = await prisma.content.findMany({
  orderBy: { createdAt: 'desc' },
  take: 20,
  select: { title: true, type: true, status: true, thumbnailUrl: true },
});
for (const r of rows) {
  const thumb = r.thumbnailUrl
    ? (r.thumbnailUrl.startsWith('http') ? 'R2: ' + r.thumbnailUrl.slice(0, 60) + '...' : 'LOCAL: ' + r.thumbnailUrl)
    : 'NULL';
  console.log(`[${r.status}] ${r.type.padEnd(12)} | ${r.title.slice(0,30).padEnd(30)} | ${thumb}`);
}
await prisma.$disconnect();
