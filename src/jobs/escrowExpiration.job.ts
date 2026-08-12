import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { resolveEscrowExpiration } from '../controllers/classRequest.controller';

export function startEscrowExpirationJob() {
  const intervalMs = env.escrowExpirationCheckIntervalMinutes * 60 * 1000;
  setInterval(async () => {
    try {
      const overdue = await (prisma as any).classRequest.findMany({
        where: { status: 'WAITING_PAYMENT', payment_deadline: { lt: new Date() } },
        select: { request_id: true },
      });
      for (const { request_id } of overdue) {
        await resolveEscrowExpiration(request_id).catch((err) =>
          console.error(`[escrow-expiration-job] failed for ${request_id}:`, err)
        );
      }
    } catch (err) {
      console.error('[escrow-expiration-job] scan failed:', err);
    }
  }, intervalMs);
  console.log(`[escrow-expiration-job] started, checking every ${env.escrowExpirationCheckIntervalMinutes}min`);
}
