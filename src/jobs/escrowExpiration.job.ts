import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { resolveEscrowExpiration } from '../controllers/classRequest.controller';

export async function repairOrphanedEscrowRefunds() {
  try {
    // 1. Scan STUDENT_TUITION payments that are REFUNDED or (PAID on OPEN/CANCELLED/EXPIRED class)
    const suspiciousStudentPayments = await (prisma as any).offlineClassPayment.findMany({
      where: {
        type: 'STUDENT_TUITION',
        OR: [
          { status: 'REFUNDED' },
          {
            status: 'PAID',
            class_request: { status: { in: ['OPEN', 'CANCELLED', 'EXPIRED'] } }
          }
        ]
      },
      include: {
        transaction: true,
        class_request: {
          include: { student: { select: { user_id: true } } }
        }
      }
    });

    for (const payment of suspiciousStudentPayments) {
      const refundAmt = Number(payment.refunded_amount || payment.paid_amount || payment.required_amount || 0);
      if (refundAmt <= 0) continue;

      let studentUserId = payment.payer_user_id || payment.transaction?.user_id || null;
      if (!studentUserId) {
        if (payment.class_request?.student?.user_id) {
          studentUserId = payment.class_request.student.user_id;
        } else if (payment.class_request?.email) {
          const u = await (prisma as any).user.findFirst({
            where: { email: { equals: payment.class_request.email, mode: 'insensitive' } },
            select: { user_id: true }
          });
          studentUserId = u?.user_id || null;
        }
      }

      if (!studentUserId) {
        console.warn(`[repairOrphanedEscrowRefunds] Could not resolve studentUserId for payment ${payment.payment_id}`);
        continue;
      }

      const existingRefundTx = await (prisma as any).transaction.findFirst({
        where: {
          user_id: studentUserId,
          amount: refundAmt,
          payment_method: 'wallet',
          description: { contains: 'Hoàn tiền 100% học phí' }
        }
      });

      if (!existingRefundTx) {
        console.log(`[repairOrphanedEscrowRefunds] Repairing missing refund of ${refundAmt} VND for student ${studentUserId} (Payment: ${payment.payment_id})`);

        await (prisma as any).$transaction([
          (prisma as any).offlineClassPayment.update({
            where: { payment_id: payment.payment_id },
            data: {
              payer_user_id: studentUserId,
              status: 'REFUNDED',
              refunded_amount: refundAmt,
              refunded_at: new Date()
            }
          }),
          (prisma as any).wallet.upsert({
            where: { user_id: studentUserId },
            update: { balance: { increment: refundAmt }, updated_at: new Date() },
            create: { user_id: studentUserId, balance: refundAmt, currency: 'VND' }
          }),
          (prisma as any).transaction.create({
            data: {
              user_id: studentUserId,
              amount: refundAmt,
              payment_method: 'wallet',
              description: `Hoàn tiền 100% học phí tháng đầu escrow MS:${payment.class_request?.class_code || payment.payment_id.slice(0, 8)} do Gia sư từ chối/hủy nhận lớp (tự động quét bù)`,
              status: 'success',
              paid_at: new Date()
            }
          })
        ]);
      }
    }

    // 2. Scan TUTOR_PLACEMENT_FEE payments that are REFUNDED or (PAID on OPEN/CANCELLED/EXPIRED class)
    const suspiciousTutorPayments = await (prisma as any).offlineClassPayment.findMany({
      where: {
        type: 'TUTOR_PLACEMENT_FEE',
        OR: [
          { status: 'REFUNDED' },
          {
            status: 'PAID',
            class_request: { status: { in: ['OPEN', 'CANCELLED', 'EXPIRED'] } }
          }
        ]
      },
      include: {
        transaction: true,
        class_request: {
          include: {
            applications: {
              include: { tutor: { select: { user_id: true } } }
            }
          }
        }
      }
    });

    for (const payment of suspiciousTutorPayments) {
      const refundAmt = Number(payment.refunded_amount || payment.paid_amount || payment.required_amount || 0);
      if (refundAmt <= 0) continue;

      let tutorUserId = payment.payer_user_id || payment.transaction?.user_id || null;
      if (!tutorUserId) {
        const approvedApp = (payment.class_request?.applications || []).find((a: any) => a.tutor?.user_id);
        tutorUserId = approvedApp?.tutor?.user_id || null;
      }
      if (!tutorUserId && payment.class_request?.selected_tutor_code) {
        const tp = await (prisma as any).tutorProfile.findFirst({
          where: { tutor_code: { equals: String(payment.class_request.selected_tutor_code).trim(), mode: 'insensitive' } },
          select: { user_id: true }
        });
        tutorUserId = tp?.user_id || null;
      }

      if (!tutorUserId) {
        console.warn(`[repairOrphanedEscrowRefunds] Could not resolve tutorUserId for payment ${payment.payment_id}`);
        continue;
      }

      const existingRefundTx = await (prisma as any).transaction.findFirst({
        where: {
          user_id: tutorUserId,
          amount: refundAmt,
          payment_method: 'wallet',
          description: { contains: 'Hoàn tiền 100% phí nhận lớp' }
        }
      });

      if (!existingRefundTx) {
        console.log(`[repairOrphanedEscrowRefunds] Repairing missing refund of ${refundAmt} VND for tutor ${tutorUserId} (Payment: ${payment.payment_id})`);

        await (prisma as any).$transaction([
          (prisma as any).offlineClassPayment.update({
            where: { payment_id: payment.payment_id },
            data: {
              payer_user_id: tutorUserId,
              status: 'REFUNDED',
              refunded_amount: refundAmt,
              refunded_at: new Date()
            }
          }),
          (prisma as any).wallet.upsert({
            where: { user_id: tutorUserId },
            update: { balance: { increment: refundAmt }, updated_at: new Date() },
            create: { user_id: tutorUserId, balance: refundAmt, currency: 'VND' }
          }),
          (prisma as any).transaction.create({
            data: {
              user_id: tutorUserId,
              amount: refundAmt,
              payment_method: 'wallet',
              description: `Hoàn tiền 100% phí nhận lớp escrow MS:${payment.class_request?.class_code || payment.payment_id.slice(0, 8)} do Học viên từ chối/hủy nhận lớp (tự động quét bù)`,
              status: 'success',
              paid_at: new Date()
            }
          })
        ]);
      }
    }
  } catch (err) {
    console.error('[repairOrphanedEscrowRefunds] Error repairing orphaned refunds:', err);
  }
}

export function startEscrowExpirationJob() {
  const intervalMs = env.escrowExpirationCheckIntervalMinutes * 60 * 1000;
  
  // Run an immediate scan & repair on startup
  repairOrphanedEscrowRefunds().catch((err) =>
    console.error('[escrow-expiration-job] initial repair scan failed:', err)
  );

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
      await repairOrphanedEscrowRefunds();
    } catch (err) {
      console.error('[escrow-expiration-job] scan failed:', err);
    }
  }, intervalMs);
  console.log(`[escrow-expiration-job] started, checking every ${env.escrowExpirationCheckIntervalMinutes}min`);
}

