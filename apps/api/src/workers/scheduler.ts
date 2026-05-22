import { prisma } from '../config/database';
import { notifyFollowers } from '../utils/notifications';

export function startScheduler() {
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
}
