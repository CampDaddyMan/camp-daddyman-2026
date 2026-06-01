import { prisma } from '../config/database';
import { notifyFollowers } from '../utils/notifications';
import { runDatabaseBackup } from './backup';

function msUntilNext3am(): number {
  const now  = new Date();
  const next = new Date(now);
  next.setHours(3, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

function scheduleDailyBackup() {
  setTimeout(async () => {
    try {
      await runDatabaseBackup();
    } catch (err: any) {
      console.error('[Scheduler] Backup failed:', err.message);
    }
    scheduleDailyBackup(); // reschedule for next day
  }, msUntilNext3am());

  const h = Math.round(msUntilNext3am() / 3_600_000 * 10) / 10;
  console.log(`[Scheduler] Next DB backup in ${h}h`);
}

export function startScheduler() {
  // Content publishing — check every minute
  setInterval(async () => {
    try {
      const due = await prisma.content.findMany({
        where: { status: 'SCHEDULED', publishAt: { lte: new Date() } },
        select: { id: true, creatorId: true },
      });

      for (const item of due) {
        await prisma.content.update({
          where: { id: item.id },
          data: { status: 'ACTIVE' },
        });
        notifyFollowers(item.creatorId, item.id);
      }

      if (due.length > 0) {
        console.log(`[Scheduler] Published ${due.length} scheduled item(s)`);
      }
    } catch (err) {
      console.error('[Scheduler] Error:', err);
    }
  }, 60_000);

  // Ad expiration — check every hour, mark completed ads
  setInterval(async () => {
    try {
      const { count } = await prisma.ad.updateMany({
        where: { status: 'ACTIVE', endsAt: { lt: new Date() } },
        data:  { status: 'COMPLETED' },
      });
      if (count > 0) {
        console.log(`[Scheduler] Marked ${count} ad(s) as COMPLETED`);
      }
    } catch (err) {
      console.error('[Scheduler] Ad expiration error:', err);
    }
  }, 60 * 60_000);

  // Daily database backup at 3am
  scheduleDailyBackup();
}
