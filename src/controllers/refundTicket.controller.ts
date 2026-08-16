import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export const refundTicketController = {
  // 1. Học viên hoặc Gia sư gửi yêu cầu hủy lớp & hoàn tiền (trong 7 ngày kể từ assigned_at)
  async createTicket(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ message: 'Vui lòng đăng nhập.' });
      }

      const classId = String(req.params.classId || '').trim();
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      const isUuid = uuidRegex.test(classId);

      const { reason } = req.body;

      if (!reason || !String(reason).trim()) {
        return res.status(400).json({ message: 'Vui lòng điền lý do yêu cầu hủy lớp / hoàn tiền.' });
      }

      const offlineClass = await (prisma as any).offlineClass.findFirst({
        where: isUuid
          ? { OR: [{ class_id: classId }, { class_offline_code: classId }] }
          : { class_offline_code: classId },
        include: {
          payments: true,
          refund_tickets: {
            where: { status: { in: ['PENDING', 'APPROVED', 'COMPLETED'] } },
          },
        },
      });

      if (!offlineClass) {
        return res.status(404).json({ message: 'Không tìm thấy thông tin lớp học offline.' });
      }

      if (offlineClass.status !== 'ACTIVE') {
        return res.status(400).json({ message: 'Lớp học hiện không ở trạng thái ACTIVE để tạo yêu cầu hủy.' });
      }

      // Check 7-day refund deadline
      const now = new Date();
      const deadline = new Date(offlineClass.refund_deadline);
      if (now > deadline) {
        return res.status(400).json({
          message: `Đã quá thời hạn 7 ngày được phép gửi yêu cầu hủy/hoàn tiền. Hạn chót là: ${deadline.toLocaleString('vi-VN')}`,
        });
      }

      // Check if ticket already exists
      if (offlineClass.refund_tickets && offlineClass.refund_tickets.length > 0) {
        return res.status(400).json({ message: 'Lớp học này đang có một yêu cầu hủy/hoàn tiền chờ xử lý hoặc đã được duyệt.' });
      }

      // Calculate initial amounts from OfflineClassPayment
      const payments = offlineClass.payments || [];
      const studentPayment = payments.find((p: any) => p.type === 'STUDENT_TUITION' && p.status === 'PAID');
      const tutorPayment = payments.find((p: any) => p.type === 'TUTOR_PLACEMENT_FEE' && p.status === 'PAID');

      const studentTuitionAmount = studentPayment ? Number(studentPayment.paid_amount || studentPayment.required_amount) : Number(offlineClass.class_salary || 0);
      const tutorFeeAmount = tutorPayment ? Number(tutorPayment.paid_amount || tutorPayment.required_amount) : Number(offlineClass.class_salary || 0) * (Number(offlineClass.commission_rate || 35) / 100);

      const ticket = await (prisma as any).refundTicket.create({
        data: {
          class_id: offlineClass.class_id,
          requested_by: user.user_id,
          reason: String(reason).trim(),
          status: 'PENDING',
          student_tuition_amount: studentTuitionAmount,
          student_penalty_amount: 0,
          student_refund_amount: 0,
          tutor_fee_amount: tutorFeeAmount,
          tutor_penalty_amount: 0,
          tutor_refund_amount: 0,
        },
        include: {
          offline_class: true,
          requester: {
            select: { email: true, role: true },
          },
        },
      });

      return res.status(201).json({
        message: 'Đã gửi yêu cầu hủy lớp thành công! Admin sẽ kiểm tra và xác minh căn cứ trong thời gian sớm nhất.',
        data: ticket,
      });
    } catch (error: any) {
      console.error('Error in createTicket:', error);
      return res.status(500).json({ message: 'Lỗi khi tạo yêu cầu hoàn tiền.', error: error.message });
    }
  },

  // 2. Lấy danh sách RefundTicket (Dành cho Admin hoặc User xem ticket của mình)
  async getTickets(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ message: 'Vui lòng đăng nhập.' });
      }

      const { status, class_id } = req.query;
      const where: any = {};

      if (user.role !== 'admin') {
        where.requested_by = user.user_id;
      }

      if (status && status !== 'all') {
        where.status = String(status);
      }

      if (class_id) {
        where.class_id = String(class_id);
      }

      const tickets = await (prisma as any).refundTicket.findMany({
        where,
        orderBy: { requested_at: 'desc' },
        include: {
          offline_class: {
            include: {
              tutor: { select: { full_name: true, phone: true } },
              student: { select: { full_name: true, phone: true } },
            },
          },
          requester: { select: { email: true, role: true } },
          processed_admin: { select: { email: true } },
        },
      });

      return res.json({ data: tickets });
    } catch (error: any) {
      console.error('Error in getTickets:', error);
      return res.status(500).json({ message: 'Lỗi khi lấy danh sách yêu cầu hoàn tiền.', error: error.message });
    }
  },

  // 3. Admin xử lý RefundTicket (Duyệt/từ chối, chọn fault_type và tính 10%/90% hoặc 20%/80%)
  async adminProcessTicket(req: Request, res: Response) {
    try {
      const adminUser = (req as any).user;
      if (!adminUser || adminUser.role !== 'admin') {
        return res.status(403).json({ message: 'Chỉ Admin mới có quyền xử lý yêu cầu hủy lớp / hoàn tiền.' });
      }

      const ticketId = String(req.params.ticketId || '').trim();
      const { status, fault_type, admin_note } = req.body;

      const ticket = await (prisma as any).refundTicket.findUnique({
        where: { ticket_id: ticketId },
        include: {
          offline_class: {
            include: {
              tutor: { select: { tutor_id: true, user_id: true } },
              student: { select: { student_id: true, user_id: true } },
              payments: true,
            },
          },
        },
      });

      if (!ticket) {
        return res.status(404).json({ message: 'Không tìm thấy yêu cầu hoàn tiền.' });
      }

      if (ticket.status === 'COMPLETED' || ticket.status === 'REJECTED') {
        return res.status(400).json({ message: `Yêu cầu này đã được xử lý ở trạng thái ${ticket.status}.` });
      }

      // Action: REJECT
      if (status === 'REJECTED') {
        const updatedTicket = await (prisma as any).refundTicket.update({
          where: { ticket_id: ticketId },
          data: {
            status: 'REJECTED',
            admin_note: admin_note || 'Không đủ căn cứ để hủy lớp và hoàn tiền.',
            processed_by: adminUser.user_id,
            processed_at: new Date(),
          },
        });

        return res.json({
          message: 'Đã từ chối yêu cầu hủy lớp. Lớp học tiếp tục duy trì trạng thái ACTIVE.',
          data: updatedTicket,
        });
      }

      // Action: APPROVE & COMPLETE
      if (!fault_type || !['STUDENT_FAULT', 'TUTOR_FAULT'].includes(fault_type)) {
        return res.status(400).json({
          message: 'Vui lòng xác định bên có lỗi (fault_type): STUDENT_FAULT (lỗi Học viên) hoặc TUTOR_FAULT (lỗi Gia sư).',
        });
      }

      const studentTuition = Number(ticket.student_tuition_amount || 0);
      const tutorFee = Number(ticket.tutor_fee_amount || 0);

      let studentPenalty = 0;
      let studentRefund = 0;
      let tutorPenalty = 0;
      let tutorRefund = 0;

      if (fault_type === 'STUDENT_FAULT') {
        studentPenalty = studentTuition * 0.10;
        studentRefund = studentTuition * 0.90;
        tutorPenalty = 0;
        tutorRefund = tutorFee * 1.00;
      } else {
        tutorPenalty = tutorFee * 0.20;
        tutorRefund = tutorFee * 0.80;
        studentPenalty = 0;
        studentRefund = studentTuition * 1.00;
      }

      const offlineClass = ticket.offline_class || {};
      let studentUserId = offlineClass.student?.user_id || null;
      let tutorUserId = offlineClass.tutor?.user_id || null;

      if (!studentUserId && offlineClass.email) {
        const u = await (prisma as any).user.findFirst({
          where: { email: { equals: offlineClass.email, mode: 'insensitive' } },
          select: { user_id: true },
        });
        studentUserId = u?.user_id || null;
      }

      const payments = offlineClass.payments || [];
      const studentPayment = payments.find((p: any) => p.type === 'STUDENT_TUITION');
      const tutorPayment = payments.find((p: any) => p.type === 'TUTOR_PLACEMENT_FEE');

      // Execute transaction: Credit wallets, update payments, update class, set ticket COMPLETED
      const [updatedTicket] = await (prisma as any).$transaction([
        (prisma as any).refundTicket.update({
          where: { ticket_id: ticketId },
          data: {
            fault_type: fault_type as any,
            admin_note: admin_note || null,
            status: 'COMPLETED',
            student_penalty_amount: studentPenalty,
            student_refund_amount: studentRefund,
            tutor_penalty_amount: tutorPenalty,
            tutor_refund_amount: tutorRefund,
            processed_by: adminUser.user_id,
            processed_at: new Date(),
          },
        }),
        (prisma as any).offlineClass.update({
          where: { class_id: ticket.class_id },
          data: {
            status: 'CANCELLED',
            admin_note: `Lớp bị hủy qua RefundTicket (${fault_type}). ${admin_note || ''}`,
          },
        }),
        ...(studentPayment
          ? [
              (prisma as any).offlineClassPayment.update({
                where: { payment_id: studentPayment.payment_id },
                data: {
                  status: studentPenalty > 0 ? 'PARTIALLY_REFUNDED' : 'REFUNDED',
                  penalty_amount: studentPenalty,
                  refunded_amount: studentRefund,
                  refunded_at: new Date(),
                },
              }),
            ]
          : []),
        ...(tutorPayment
          ? [
              (prisma as any).offlineClassPayment.update({
                where: { payment_id: tutorPayment.payment_id },
                data: {
                  status: tutorPenalty > 0 ? 'PARTIALLY_REFUNDED' : 'REFUNDED',
                  penalty_amount: tutorPenalty,
                  refunded_amount: tutorRefund,
                  refunded_at: new Date(),
                },
              }),
            ]
          : []),
        ...(studentUserId && studentRefund > 0
          ? [
              (prisma as any).wallet.upsert({
                where: { user_id: studentUserId },
                create: { user_id: studentUserId, balance: studentRefund },
                update: { balance: { increment: studentRefund }, updated_at: new Date() },
              }),
              (prisma as any).transaction.create({
                data: {
                  user_id: studentUserId,
                  amount: studentRefund,
                  payment_method: 'wallet',
                  description: `Hoàn tiền hủy lớp Offline (Mã lớp gốc: ${offlineClass.class_offline_code || ''}) - Lý do: ${fault_type}`,
                  status: 'refunded',
                  paid_at: new Date(),
                },
              }),
            ]
          : []),
        ...(tutorUserId && tutorRefund > 0
          ? [
              (prisma as any).wallet.upsert({
                where: { user_id: tutorUserId },
                create: { user_id: tutorUserId, balance: tutorRefund },
                update: { balance: { increment: tutorRefund }, updated_at: new Date() },
              }),
              (prisma as any).transaction.create({
                data: {
                  user_id: tutorUserId,
                  amount: tutorRefund,
                  payment_method: 'wallet',
                  description: `Hoàn phí nhận lớp Offline (Mã lớp gốc: ${offlineClass.class_offline_code || ''}) - Lý do: ${fault_type}`,
                  status: 'refunded',
                  paid_at: new Date(),
                },
              }),
            ]
          : []),
      ]);

      return res.json({
        message: 'Đã xử lý chốt hủy lớp và hoàn tiền thành công!',
        data: updatedTicket,
      });
    } catch (error: any) {
      console.error('Error in adminProcessTicket:', error);
      return res.status(500).json({ message: 'Lỗi khi xử lý yêu cầu hoàn tiền.', error: error.message });
    }
  },
};
