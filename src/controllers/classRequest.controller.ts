import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { GradeLevel } from '@prisma/client';
import { env } from '../config/env';

export function mapToGradeLevel(val: any): GradeLevel | null {
  if (!val) return null;
  const str = String(val).trim();
  if (Object.values(GradeLevel).includes(str as GradeLevel)) return str as GradeLevel;
  const match = str.match(/(\d+)/);
  if (match) {
    const key = `grade_${match[1]}` as keyof typeof GradeLevel;
    if (key in GradeLevel) return GradeLevel[key];
  }
  return null;
}

export function formatGradeLevel(val: any): string {
  if (!val) return 'Tất cả các lớp';
  const str = String(val).trim();
  const match = str.match(/^grade_(\d+)$/i);
  if (match) {
    return `Lớp ${match[1]}`;
  }
  return str;
}

async function buildSelectedTutorMap(items: any[]): Promise<Map<string, any>> {
  const codes = new Set<string>();
  items.forEach((item) => {
    if (item && item.selected_tutor_code) {
      codes.add(String(item.selected_tutor_code).trim().toLowerCase());
    }
  });

  const tutorMap = new Map<string, any>();
  if (codes.size === 0) return tutorMap;

  try {
    const tutors = await (prisma as any).tutorProfile.findMany({
      where: {
        tutor_code: { in: Array.from(codes), mode: 'insensitive' },
      },
      select: {
        tutor_id: true,
        tutor_code: true,
        full_name: true,
        phone: true,
        avatar_url: true,
      },
    });

    tutors.forEach((t: any) => {
      if (t.tutor_code) {
        tutorMap.set(String(t.tutor_code).trim().toLowerCase(), {
          tutor_id: t.tutor_id,
          tutor_code: t.tutor_code,
          full_name: t.full_name,
          phone: t.phone,
          avatar_url: t.avatar_url,
        });
      }
    });
  } catch (err) {
    console.error('Error building selected tutor map:', err);
  }

  return tutorMap;
}

function formatClassRequestResponse(cls: any, extraTutorMap?: Map<string, any>) {
  if (!cls) return cls;
  const selCode = cls.selected_tutor_code ? String(cls.selected_tutor_code).trim() : null;
  let selectedTutor = cls.selected_tutor || null;
  if (!selectedTutor && selCode && extraTutorMap) {
    selectedTutor = extraTutorMap.get(selCode.toLowerCase()) || null;
  }
  return {
    ...cls,
    record_type: 'class_request',
    code: cls.class_code || cls.class_offline_code || cls.code || '',
    class_code: cls.class_code || cls.class_offline_code || cls.code || '',
    grade_level: formatGradeLevel(cls.grade_level),
    subject_name: cls.subject?.name || cls.subject_name || '',
    desired_price: cls.class_salary ? Number(cls.class_salary) : Number(cls.desired_price || 0),
    selected_tutor_code: selCode,
    selected_tutor: selectedTutor,
  };
}

function formatOfflineClassResponse(cls: any, extraSubjectName?: string) {
  if (!cls) return cls;
  const refundTickets = cls.refund_tickets || [];
  const hasPendingRefund = refundTickets.some((t: any) => t.status === 'PENDING');
  return {
    request_id: cls.class_id,
    class_id: cls.class_id,
    record_type: 'offline_class',
    code: cls.class_offline_code || '',
    class_code: cls.class_offline_code || '',
    student_name: cls.student_name,
    phone: cls.phone,
    email: cls.email || '',
    address_detail: cls.address_detail,
    district: cls.district || '',
    province: cls.province || '',
    grade_level: formatGradeLevel(cls.grade_level),
    subject_id: cls.subject_id || null,
    subject_name: extraSubjectName || cls.subject?.name || cls.subject_name || '',
    num_students: cls.num_students || 1,
    academic_level: cls.academic_level || '',
    sessions_per_week: cls.sessions_per_week || 2,
    study_time: cls.study_time || '',
    desired_price: Number(cls.class_salary || 0),
    commission_rate: Number(cls.commission_rate || 35),
    status: cls.status,
    assigned_tutor: cls.tutor ? { full_name: cls.tutor.full_name, phone: cls.tutor.phone } : undefined,
    created_at: cls.created_at || cls.assigned_at,
    refund_deadline: cls.refund_deadline,
    refund_tickets: refundTickets,
    has_pending_refund: hasPendingRefund,
  };
}

// Helper: Kiểm tra nếu cả 2 khoản escrow (STUDENT_TUITION & TUTOR_PLACEMENT_FEE) đều đã PAID -> Tạo OfflineClass và XÓA ClassRequest
async function checkAndActivateOfflineClass(classRequestId: string) {
  return await (prisma as any).$transaction(async (tx: any) => {
    const payments = await tx.offlineClassPayment.findMany({
      where: { class_request_id: classRequestId },
    });

    const studentPayment = payments.find((p: any) => p.type === 'STUDENT_TUITION' && p.status === 'PAID');
    const tutorPayment = payments.find((p: any) => p.type === 'TUTOR_PLACEMENT_FEE' && p.status === 'PAID');

    if (!studentPayment || !tutorPayment) {
      return null; // Chưa đóng đủ cả 2 khoản
    }

    // Lấy tutor_id từ thông tin gia sư đã thanh toán hoặc application APPROVED (thực hiện trước khi xóa)
    const approvedApp = await tx.classApplication.findFirst({
      where: { class_request_id: classRequestId, status: 'APPROVED' },
      select: { tutor_id: true },
    });

    let tutor_id = approvedApp?.tutor_id;
    if (!tutor_id && tutorPayment.payer_user_id) {
      const tutorProfile = await tx.tutorProfile.findUnique({
        where: { user_id: tutorPayment.payer_user_id },
        select: { tutor_id: true },
      });
      tutor_id = tutorProfile?.tutor_id;
    }

    if (!tutor_id) {
      throw new Error('Không xác định được Gia sư nhận lớp để khởi tạo OfflineClass.');
    }

    // Chuyển tất cả đơn ứng tuyển còn PENDING sang REJECTED khi lớp được kích hoạt thành công
    await tx.classApplication.updateMany({
      where: {
        class_request_id: classRequestId,
        status: 'PENDING',
      },
      data: { status: 'REJECTED' },
    });

    // Atomic claim via delete-as-lock:
    let classRequest;
    try {
      classRequest = await tx.classRequest.delete({
        where: { request_id: classRequestId },
      });
    } catch (e: any) {
      if (e.code === 'P2025') return null; // lost the race — another concurrent call already activated this class
      throw e;
    }

    const now = new Date();
    const refundDeadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // assigned_at + 7 days

    const offlineClass = await tx.offlineClass.create({
      data: {
        tutor_id,
        student_id: classRequest.student_id,
        class_offline_code: classRequest.class_code,
        student_name: classRequest.student_name,
        phone: classRequest.phone,
        email: classRequest.email,
        address_detail: classRequest.address_detail,
        district: classRequest.district,
        province: classRequest.province,
        grade_level: classRequest.grade_level,
        subject_id: classRequest.subject_id,
        num_students: classRequest.num_students,
        academic_level: classRequest.academic_level,
        sessions_per_week: classRequest.sessions_per_week,
        study_time: classRequest.study_time,
        class_salary: classRequest.class_salary,
        commission_rate: 35,
        status: 'ACTIVE',
        assigned_at: now,
        refund_deadline: refundDeadline,
      },
    });

    // Gán class_id cho cả 2 dòng OfflineClassPayment
    await tx.offlineClassPayment.updateMany({
      where: { payment_id: { in: [studentPayment.payment_id, tutorPayment.payment_id] } },
      data: { class_id: offlineClass.class_id },
    });

    return offlineClass;
  });
}

export async function determineFaultParty(studentPayment: any, tutorPayment: any): Promise<'STUDENT' | 'TUTOR'> {
  return studentPayment?.status === 'PAID' ? 'TUTOR' : 'STUDENT';
}

export async function resolveEscrowExpiration(classRequestId: string, faultPartyOverride?: 'STUDENT' | 'TUTOR') {
  const classRequest = await (prisma as any).classRequest.findUnique({
    where: { request_id: classRequestId },
    include: { payments: true },
  });

  if (!classRequest) return null;
  if (classRequest.status !== 'WAITING_PAYMENT') return null;

  const payments = classRequest.payments || [];
  const studentPayment = payments.find((p: any) => p.type === 'STUDENT_TUITION');
  const tutorPayment = payments.find((p: any) => p.type === 'TUTOR_PLACEMENT_FEE');

  const faultParty = (faultPartyOverride === 'STUDENT' || faultPartyOverride === 'TUTOR')
    ? faultPartyOverride
    : await determineFaultParty(studentPayment, tutorPayment);

  if (faultParty === 'STUDENT') {
    if (studentPayment) {
      await (prisma as any).offlineClassPayment.update({
        where: { payment_id: studentPayment.payment_id },
        data: { status: 'EXPIRED' },
      });
    }
    if (tutorPayment && tutorPayment.status === 'PAID') {
      const refundAmt = Number(tutorPayment.paid_amount || tutorPayment.required_amount || 0);
      let tutorUserId = tutorPayment.payer_user_id;
      if (!tutorUserId) {
        const approvedApp = await (prisma as any).classApplication.findFirst({
          where: { class_request_id: classRequestId, status: 'APPROVED' },
          include: { tutor: { select: { user_id: true } } },
        });
        tutorUserId = approvedApp?.tutor?.user_id || null;
      }

      await (prisma as any).offlineClassPayment.update({
        where: { payment_id: tutorPayment.payment_id },
        data: { status: 'REFUNDED', refunded_amount: refundAmt, refunded_at: new Date() },
      });

      if (tutorUserId) {
        await (prisma as any).wallet.upsert({
          where: { user_id: tutorUserId },
          update: { balance: { increment: refundAmt }, updated_at: new Date() },
          create: { user_id: tutorUserId, balance: refundAmt, currency: 'VND' },
        });

        await (prisma as any).transaction.create({
          data: {
            user_id: tutorUserId,
            amount: refundAmt,
            payment_method: 'wallet',
            description: `Hoàn tiền 100% phí nhận lớp escrow MS:${classRequest.class_code || classRequestId.slice(0, 8)} do Học viên trễ hạn nộp học phí`,
            status: 'success',
            paid_at: new Date(),
          },
        });
      }
    }

    const updated = await (prisma as any).classRequest.update({
      where: { request_id: classRequestId },
      data: { status: 'EXPIRED' },
    });

    return { updated, message: 'Đã xử lý trễ hạn phía Học viên. Lớp chuyển sang EXPIRED đóng vĩnh viễn.', faultParty };
  } else {
    if (tutorPayment) {
      await (prisma as any).offlineClassPayment.update({
        where: { payment_id: tutorPayment.payment_id },
        data: { status: 'EXPIRED' },
      });
    }

    if (studentPayment && studentPayment.status === 'PAID') {
      const refundAmt = Number(studentPayment.paid_amount || studentPayment.required_amount || 0);

      let studentUserId = studentPayment.payer_user_id;
      if (!studentUserId) {
        if (classRequest.student_id) {
          const sp = await (prisma as any).studentProfile.findUnique({
            where: { student_id: classRequest.student_id },
            select: { user_id: true },
          });
          studentUserId = sp?.user_id || null;
        }
        if (!studentUserId && classRequest.email) {
          const u = await (prisma as any).user.findFirst({
            where: { email: { equals: classRequest.email, mode: 'insensitive' } },
            select: { user_id: true },
          });
          studentUserId = u?.user_id || null;
        }
      }

      await (prisma as any).offlineClassPayment.update({
        where: { payment_id: studentPayment.payment_id },
        data: { status: 'REFUNDED', refunded_amount: refundAmt, refunded_at: new Date() },
      });

      if (studentUserId) {
        await (prisma as any).wallet.upsert({
          where: { user_id: studentUserId },
          update: { balance: { increment: refundAmt }, updated_at: new Date() },
          create: { user_id: studentUserId, balance: refundAmt, currency: 'VND' },
        });

        await (prisma as any).transaction.create({
          data: {
            user_id: studentUserId,
            amount: refundAmt,
            payment_method: 'wallet',
            description: `Hoàn tiền 100% học phí tháng đầu escrow MS:${classRequest.class_code || classRequestId.slice(0, 8)} do Gia sư từ chối/hủy nhận lớp`,
            status: 'success',
            paid_at: new Date(),
          },
        });
      }
    }

    await (prisma as any).classApplication.updateMany({
      where: { class_request_id: classRequestId, status: 'APPROVED' },
      data: { status: 'EXPIRED' },
    });

    const updated = await (prisma as any).classRequest.update({
      where: { request_id: classRequestId },
      data: { status: 'OPEN', selected_tutor_code: null },
    });

    return { updated, message: 'Đã xử lý hủy/trễ hạn phía Gia sư. Lớp quay lại trạng thái OPEN và đã hoàn 100% tiền học phí về ví Học viên.', faultParty };
  }
}

export const classRequestController = {
  // 1. Học viên tạo yêu cầu tìm gia sư
  async create(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ message: 'Vui lòng đăng nhập tài khoản Học viên để đăng bài tìm gia sư.' });
      }
      if (user.role === 'tutor') {
        return res.status(403).json({ message: 'Tài khoản Gia sư không thể tạo bài tìm gia sư. Vui lòng sử dụng tài khoản Học viên.' });
      }

      const {
        student_name,
        phone,
        email,
        address_detail,
        district,
        province,
        grade_level,
        grade_id: input_grade_id,
        subject_name,
        subject_id: input_subject_id,
        num_students,
        academic_level,
        sessions_per_week,
        study_time,
        tutor_requirement,
        selected_tutor_code,
        desired_price,
        class_salary,
        other_requirements,
      } = req.body;

      if (!student_name || !phone || !address_detail) {
        return res.status(400).json({
          message: 'Vui lòng điền đầy đủ các thông tin bắt buộc (*)',
        });
      }

      const gEnum = mapToGradeLevel(grade_level || input_grade_id);

      let finalSubjectId: string | null = input_subject_id || null;
      if (!finalSubjectId && subject_name) {
        const foundSubject = await (prisma as any).subject.findFirst({
          where: { name: { equals: String(subject_name).trim(), mode: 'insensitive' } },
        });
        if (foundSubject) {
          finalSubjectId = foundSubject.subject_id;
        }
      }

      const randomCode = `${Math.floor(80000 + Math.random() * 19999)}`;

      let student_id: string | undefined = undefined;
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      if (user && user.user_id && uuidRegex.test(String(user.user_id))) {
        let studentProfile = await (prisma as any).studentProfile.findUnique({
          where: { user_id: user.user_id },
        });
        if (!studentProfile) {
          try {
            studentProfile = await (prisma as any).studentProfile.create({
              data: {
                user_id: user.user_id,
                full_name: student_name || user.user_metadata?.full_name || '',
                phone: phone || null,
              },
            });
          } catch (_) {
            // Ignore if profile auto-create fails
          }
        }
        if (studentProfile) {
          student_id = studentProfile.student_id;
        }
      }

      const priceInput = class_salary !== undefined ? class_salary : desired_price;
      const numericPrice = typeof priceInput === 'number'
        ? priceInput
        : Number(String(priceInput || 0).replace(/[^0-9.]/g, '')) || 0;

      const classRequest = await (prisma as any).classRequest.create({
        data: {
          class_code: randomCode,
          student_id: student_id || null,
          student_name,
          phone,
          email: email || null,
          address_detail,
          district: district || null,
          province: province || null,
          grade_level: gEnum,
          subject_id: finalSubjectId,
          num_students: num_students ? Number(num_students) : 1,
          academic_level: academic_level || null,
          sessions_per_week: sessions_per_week ? Number(sessions_per_week) : 2,
          study_time: study_time || null,
          tutor_requirement: tutor_requirement || null,
          selected_tutor_code: selected_tutor_code || null,
          class_salary: numericPrice,
          other_requirements: other_requirements || null,
          status: 'PENDING_ADMIN',
        },
        include: {
          subject: { select: { name: true } },
        },
      });

      return res.status(201).json({
        message: 'Đăng ký tìm gia sư thành công! Yêu cầu đang chờ Admin kiểm duyệt nội dung.',
        data: formatClassRequestResponse(classRequest),
      });
    } catch (error: any) {
      console.error('Error creating class request:', error);
      return res.status(500).json({ message: 'Lỗi máy chủ khi tạo yêu cầu tìm gia sư.', error: error.message });
    }
  },

  // 2. Lấy danh sách Lớp học OPEN cho Gia sư & Công khai
  async getOpenClasses(req: Request, res: Response) {
    try {
      const { search, province, grade, page = 1, limit = 20 } = req.query;

      const where: any = { status: 'OPEN' };

      if (province && province !== '--Tất cả Tỉnh/Thành--' && province !== 'all') {
        where.province = { contains: String(province), mode: 'insensitive' };
      }

      if (grade && grade !== 'all') {
        const gEnum = mapToGradeLevel(grade);
        if (gEnum) where.grade_level = gEnum;
      }

      if (search) {
        const searchStr = String(search).trim();
        where.OR = [
          { class_code: { contains: searchStr, mode: 'insensitive' } },
          { address_detail: { contains: searchStr, mode: 'insensitive' } },
          { district: { contains: searchStr, mode: 'insensitive' } },
          { subject: { name: { contains: searchStr, mode: 'insensitive' } } },
        ];
      }

      const take = Number(limit);
      const skip = (Number(page) - 1) * take;

      const [total, items] = await Promise.all([
        (prisma as any).classRequest.count({ where }),
        (prisma as any).classRequest.findMany({
          where,
          take,
          skip,
          orderBy: { created_at: 'desc' },
          include: {
            subject: { select: { name: true } },
            _count: { select: { applications: true } },
          },
        }),
      ]);

      const formattedItems = items.map((cls: any) => formatClassRequestResponse(cls));

      return res.json({
        total,
        page: Number(page),
        limit: take,
        totalPages: Math.ceil(total / take),
        data: formattedItems,
      });
    } catch (error: any) {
      console.error('Error fetching open classes:', error);
      return res.status(500).json({ message: 'Lỗi khi lấy danh sách lớp chưa giao.', error: error.message });
    }
  },

  // 3. Lấy chi tiết 1 lớp học
  async getDetail(req: Request, res: Response) {
    try {
      const id = String(req.params.id || '').trim();
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      const isUuid = uuidRegex.test(id);

      let classRequest = await (prisma as any).classRequest.findFirst({
        where: isUuid
          ? { OR: [{ request_id: id }, { class_code: id }] }
          : { class_code: id },
        include: {
          subject: { select: { name: true } },
          applications: {
            orderBy: { created_at: 'desc' },
            include: {
              tutor: {
                include: {
                  certificates: true,
                  user: { select: { email: true } },
                },
              },
            },
          },
          payments: true,
        },
      });

      if (!classRequest) {
        const offlineClass = await (prisma as any).offlineClass.findFirst({
          where: isUuid
            ? { OR: [{ class_id: id }, { class_offline_code: id }] }
            : { class_offline_code: id },
          include: {
            tutor: { select: { tutor_id: true, full_name: true, phone: true, avatar_url: true } },
            student: { select: { student_id: true, full_name: true, phone: true } },
            payments: true,
            refund_tickets: {
              include: {
                requester: {
                  select: {
                    user_id: true,
                    email: true,
                    role: true,
                    student_profile: { select: { full_name: true, phone: true } },
                    tutor_profile: { select: { full_name: true, phone: true, tutor_code: true } },
                    admin_profile: { select: { full_name: true, phone: true } },
                  },
                },
              },
            },
          },
        });

        if (offlineClass) {
          let extraSubName = '';
          if (offlineClass.subject_id) {
            const sub = await (prisma as any).subject.findUnique({ where: { subject_id: offlineClass.subject_id } });
            if (sub) extraSubName = sub.name;
          }
          return res.json({
            data: {
              ...formatOfflineClassResponse(offlineClass, extraSubName),
              is_active_offline_class: true,
              tutor: offlineClass.tutor,
              student: offlineClass.student,
              payments: offlineClass.payments,
              refund_tickets: offlineClass.refund_tickets,
            },
          });
        }

        return res.status(404).json({ message: 'Không tìm thấy thông tin lớp học.' });
      }

      const reqUser = (req as any).user;
      const isAdmin = reqUser?.role === 'admin';

      const sanitizedApplications = (classRequest.applications || []).map((app: any) => ({
        ...app,
        applicant_phone: isAdmin ? (app.applicant_phone || app.tutor?.phone || '') : undefined,
        tutor: app.tutor
          ? {
              tutor_id: app.tutor.tutor_id,
              tutor_code: app.tutor.tutor_code || '',
              full_name: app.tutor.full_name || '',
              avatar_url: app.tutor.avatar_url || '',
              phone: isAdmin ? (app.tutor.phone || app.applicant_phone || '') : undefined,
              email: isAdmin ? app.tutor.user?.email : undefined,
              university: app.tutor.university || '',
              major: app.tutor.major || '',
              current_role: app.tutor.current_role || '',
              experience_years: app.tutor.experience_years || 0,
              rating: app.tutor.rating ? Number(app.tutor.rating) : 0,
              certificates: app.tutor.certificates || [],
            }
          : undefined,
      }));

      const selTutorMap = await buildSelectedTutorMap([classRequest]);

      return res.json({
        data: {
          ...formatClassRequestResponse(classRequest, selTutorMap),
          is_active_offline_class: false,
          applications: sanitizedApplications,
          payments: classRequest.payments,
        },
      });
    } catch (error: any) {
      console.error('Error fetching class detail:', error);
      return res.status(500).json({ message: 'Lỗi khi lấy chi tiết lớp học.', error: error.message });
    }
  },

  // 4. Gia sư đăng ký ứng tuyển nhận lớp
  async apply(req: Request, res: Response) {
    try {
      const id = String(req.params.id || '').trim();
      const { applicant_phone, available_date, available_from, notes } = req.body;

      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      const isUuid = uuidRegex.test(id);

      const classRequest = await (prisma as any).classRequest.findFirst({
        where: isUuid
          ? { OR: [{ request_id: id }, { class_code: id }] }
          : { class_code: id },
      });

      if (!classRequest) {
        return res.status(404).json({ message: 'Không tìm thấy thông tin lớp học.' });
      }

      if (classRequest.status !== 'OPEN') {
        return res.status(400).json({ message: 'Lớp học này hiện không ở trạng thái mở ứng tuyển (OPEN).' });
      }

      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ message: 'Vui lòng đăng nhập tài khoản Gia sư để ứng tuyển.' });
      }
      if (user.role !== 'tutor') {
        return res.status(403).json({ message: 'Chỉ tài khoản Gia sư mới có thể đăng ký nhận lớp dạy.' });
      }

      const tutorProfile = await (prisma as any).tutorProfile.findUnique({
        where: { user_id: user.user_id },
      });

      const dateVal = available_from || available_date;
      if (!dateVal) {
        return res.status(400).json({ message: 'Vui lòng chọn thời gian có thể nhận lớp hợp lệ.' });
      }

      const parsedDate = new Date(dateVal);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ message: 'Vui lòng chọn thời gian có thể nhận lớp hợp lệ.' });
      }

      const finalPhone = applicant_phone || tutorProfile?.phone || user.email || 'Chưa cập nhật SĐT';

      const application = await (prisma as any).classApplication.create({
        data: {
          class_request_id: classRequest.request_id,
          tutor_id: tutorProfile?.tutor_id || null,
          applicant_phone: finalPhone,
          available_from: parsedDate,
          notes: notes ? String(notes).trim() : null,
          status: 'PENDING',
        },
      });

      return res.status(201).json({
        message: 'Đăng ký ứng tuyển thành công! Trung tâm sẽ xem xét và giao lớp.',
        data: application,
      });
    } catch (error: any) {
      console.error('Error applying for class:', error);
      return res.status(500).json({ message: 'Lỗi khi đăng ký nhận lớp.', error: error.message });
    }
  },

  // 5. Admin Lấy danh sách bài yêu cầu (gộp cả ClassRequest và OfflineClass)
  async adminGetAll(req: Request, res: Response) {
    try {
      const { status, search, page = 1, limit = 50 } = req.query;

      const searchStr = search ? String(search).trim().replace(/^MS:\s*/i, '') : '';
      const take = Number(limit);
      const skip = (Number(page) - 1) * take;
      const statusStr = status ? String(status) : 'all';

      // Neu filter theo tab OfflineClass cu the:
      if (statusStr === 'OFFLINE_ACTIVE' || statusStr === 'OFFLINE_CANCELLED') {
        const targetStatus = statusStr === 'OFFLINE_ACTIVE' ? 'ACTIVE' : 'CANCELLED';
        const offlineClassWhere: any = { status: targetStatus };

        let matchingSubjectIds: string[] = [];
        if (searchStr) {
          const matchingSubjects = await (prisma as any).subject.findMany({
            where: { name: { contains: searchStr, mode: 'insensitive' } },
            select: { subject_id: true },
          });
          matchingSubjectIds = matchingSubjects.map((s: any) => s.subject_id);

          offlineClassWhere.OR = [
            { class_offline_code: { contains: searchStr, mode: 'insensitive' } },
            { student_name: { contains: searchStr, mode: 'insensitive' } },
            { phone: { contains: searchStr, mode: 'insensitive' } },
            { address_detail: { contains: searchStr, mode: 'insensitive' } },
            { district: { contains: searchStr, mode: 'insensitive' } },
            ...(matchingSubjectIds.length > 0 ? [{ subject_id: { in: matchingSubjectIds } }] : []),
          ];
        }

        const [total, items] = await Promise.all([
          (prisma as any).offlineClass.count({ where: offlineClassWhere }),
          (prisma as any).offlineClass.findMany({
            where: offlineClassWhere,
            take,
            skip,
            orderBy: { created_at: 'desc' },
            include: {
              tutor: { select: { full_name: true, phone: true } },
              refund_tickets: {
              include: {
                requester: {
                  select: {
                    user_id: true,
                    email: true,
                    role: true,
                    student_profile: { select: { full_name: true, phone: true } },
                    tutor_profile: { select: { full_name: true, phone: true, tutor_code: true } },
                    admin_profile: { select: { full_name: true, phone: true } },
                  },
                },
              },
            },
            },
          }),
        ]);

        const ocSubIds = items.map((i: any) => i.subject_id).filter(Boolean);
        const ocSubs = ocSubIds.length > 0
          ? await (prisma as any).subject.findMany({ where: { subject_id: { in: ocSubIds } } })
          : [];
        const ocSubMap = new Map(ocSubs.map((s: any) => [s.subject_id, s.name]));

        const formattedItems = items.map((cls: any) => formatOfflineClassResponse(cls, cls.subject_id ? (ocSubMap.get(cls.subject_id) as string) : undefined));

        return res.json({
          total,
          page: Number(page),
          limit: take,
          totalPages: Math.ceil(total / take),
          data: formattedItems,
        });
      }

      // Neu filter theo tab ClassRequest cu the (khac 'all'):
      if (statusStr !== 'all') {
        const classRequestWhere: any = { status: statusStr };
        if (searchStr) {
          classRequestWhere.OR = [
            { class_code: { contains: searchStr, mode: 'insensitive' } },
            { student_name: { contains: searchStr, mode: 'insensitive' } },
            { phone: { contains: searchStr, mode: 'insensitive' } },
            { address_detail: { contains: searchStr, mode: 'insensitive' } },
            { district: { contains: searchStr, mode: 'insensitive' } },
            { subject: { name: { contains: searchStr, mode: 'insensitive' } } },
          ];
        }

        const [total, items] = await Promise.all([
          (prisma as any).classRequest.count({ where: classRequestWhere }),
          (prisma as any).classRequest.findMany({
            where: classRequestWhere,
            take,
            skip,
            orderBy: { created_at: 'desc' },
            include: {
              subject: { select: { name: true } },
              payments: true,
              _count: { select: { applications: true } },
            },
          }),
        ]);

        const selTutorMap = await buildSelectedTutorMap(items);
        const formattedItems = items.map((cls: any) => formatClassRequestResponse(cls, selTutorMap));

        return res.json({
          total,
          page: Number(page),
          limit: take,
          totalPages: Math.ceil(total / take),
          data: formattedItems,
        });
      }

      // Khi status === 'all': query ca ClassRequest va OfflineClass roi merge & sort
      const classRequestWhere: any = {};
      const offlineClassWhere: any = {};

      if (searchStr) {
        classRequestWhere.OR = [
          { class_code: { contains: searchStr, mode: 'insensitive' } },
          { student_name: { contains: searchStr, mode: 'insensitive' } },
          { phone: { contains: searchStr, mode: 'insensitive' } },
          { address_detail: { contains: searchStr, mode: 'insensitive' } },
          { district: { contains: searchStr, mode: 'insensitive' } },
          { subject: { name: { contains: searchStr, mode: 'insensitive' } } },
        ];

        const matchingSubjects = await (prisma as any).subject.findMany({
          where: { name: { contains: searchStr, mode: 'insensitive' } },
          select: { subject_id: true },
        });
        const matchingSubjectIds = matchingSubjects.map((s: any) => s.subject_id);

        offlineClassWhere.OR = [
          { class_offline_code: { contains: searchStr, mode: 'insensitive' } },
          { student_name: { contains: searchStr, mode: 'insensitive' } },
          { phone: { contains: searchStr, mode: 'insensitive' } },
          { address_detail: { contains: searchStr, mode: 'insensitive' } },
          { district: { contains: searchStr, mode: 'insensitive' } },
          ...(matchingSubjectIds.length > 0 ? [{ subject_id: { in: matchingSubjectIds } }] : []),
        ];
      }

      const [crTotal, crItems, ocTotal, ocItems] = await Promise.all([
        (prisma as any).classRequest.count({ where: classRequestWhere }),
        (prisma as any).classRequest.findMany({
          where: classRequestWhere,
          orderBy: { created_at: 'desc' },
          include: {
            subject: { select: { name: true } },
            payments: true,
            _count: { select: { applications: true } },
          },
        }),
        (prisma as any).offlineClass.count({ where: offlineClassWhere }),
        (prisma as any).offlineClass.findMany({
          where: offlineClassWhere,
          orderBy: { created_at: 'desc' },
          include: {
            tutor: { select: { full_name: true, phone: true } },
            refund_tickets: {
              include: {
                requester: {
                  select: {
                    user_id: true,
                    email: true,
                    role: true,
                    student_profile: { select: { full_name: true, phone: true } },
                    tutor_profile: { select: { full_name: true, phone: true, tutor_code: true } },
                    admin_profile: { select: { full_name: true, phone: true } },
                  },
                },
              },
            },
          },
        }),
      ]);

      const ocSubIds = ocItems.map((i: any) => i.subject_id).filter(Boolean);
      const ocSubs = ocSubIds.length > 0
        ? await (prisma as any).subject.findMany({ where: { subject_id: { in: ocSubIds } } })
        : [];
      const ocSubMap = new Map(ocSubs.map((s: any) => [s.subject_id, s.name]));

      const crTutorMap = await buildSelectedTutorMap(crItems);
      const formattedCr = crItems.map((cls: any) => formatClassRequestResponse(cls, crTutorMap));
      const formattedOc = ocItems.map((cls: any) => formatOfflineClassResponse(cls, cls.subject_id ? (ocSubMap.get(cls.subject_id) as string) : undefined));

      const merged = [...formattedCr, ...formattedOc].sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });

      const total = crTotal + ocTotal;
      const paginatedData = merged.slice(skip, skip + take);

      return res.json({
        total,
        page: Number(page),
        limit: take,
        totalPages: Math.ceil(total / take),
        data: paginatedData,
      });
    } catch (error: any) {
      console.error('Error admin get class requests:', error);
      return res.status(500).json({ message: 'Lỗi khi lấy danh sách yêu cầu lớp phía Admin.', error: error.message });
    }
  },

  // 6. Admin Duyệt mở lớp (PENDING_ADMIN -> WAITING_TUTOR_CONFIRM hoặc OPEN)
  async adminApproveOpen(req: Request, res: Response) {
    try {
      const id = String(req.params.id || '').trim();
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      const isUuid = uuidRegex.test(id);

      const existingClass = await (prisma as any).classRequest.findFirst({
        where: isUuid
          ? { OR: [{ request_id: id }, { class_code: id }] }
          : { class_code: id },
      });

      if (!existingClass) {
        return res.status(404).json({ message: 'Không tìm thấy lớp học.' });
      }

      if (existingClass.status === 'CANCELLED' || existingClass.status === 'EXPIRED') {
        return res.status(400).json({ message: `Lớp học đã ở trạng thái ${existingClass.status}, không thể mở duyệt.` });
      }

      const selCode = existingClass.selected_tutor_code ? String(existingClass.selected_tutor_code).trim() : '';

      let targetTutor: any = null;
      if (selCode) {
        targetTutor = await (prisma as any).tutorProfile.findFirst({
          where: { tutor_code: { equals: selCode, mode: 'insensitive' } },
        });
      }

      if (targetTutor) {
        const updated = await (prisma as any).classRequest.update({
          where: { request_id: existingClass.request_id },
          data: { status: 'WAITING_TUTOR_CONFIRM' },
        });

        return res.json({
          message: `Đã duyệt yêu cầu bài đăng! Hệ thống đã chuyển sang gửi lời mời trực tiếp đến Gia sư MS:${targetTutor.tutor_code || selCode}.`,
          data: formatClassRequestResponse(updated),
        });
      } else {
        const updated = await (prisma as any).classRequest.update({
          where: { request_id: existingClass.request_id },
          data: { status: 'OPEN' },
        });

        return res.json({
          message: 'Đã duyệt mở lớp công khai (OPEN) thành công!',
          data: formatClassRequestResponse(updated),
        });
      }
    } catch (error: any) {
      console.error('Error admin approving class:', error);
      return res.status(500).json({ message: 'Lỗi khi duyệt mở lớp.', error: error.message });
    }
  },

  // 6b. Admin Từ chối bài đăng tìm gia sư (PENDING_ADMIN -> REJECTED)
  async adminRejectClass(req: Request, res: Response) {
    try {
      const id = String(req.params.id || '').trim();
      const { admin_note } = req.body;

      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      const isUuid = uuidRegex.test(id);

      const existingClass = await (prisma as any).classRequest.findFirst({
        where: isUuid
          ? { OR: [{ request_id: id }, { class_code: id }] }
          : { class_code: id },
      });

      if (!existingClass) {
        return res.status(404).json({ message: 'Không tìm thấy lớp học.' });
      }

      if (['CANCELLED', 'EXPIRED', 'REJECTED'].includes(existingClass.status)) {
        return res.status(400).json({ message: `Lớp học đã ở trạng thái ${existingClass.status}, không thể từ chối.` });
      }

      const updated = await (prisma as any).classRequest.update({
        where: { request_id: existingClass.request_id },
        data: {
          status: 'REJECTED',
          admin_note: admin_note ? String(admin_note).trim() : 'Admin từ chối bài đăng.',
        },
      });

      return res.json({
        message: 'Đã từ chối bài đăng tìm gia sư thành công.',
        data: formatClassRequestResponse(updated),
      });
    } catch (error: any) {
      console.error('Error admin rejecting class:', error);
      return res.status(500).json({ message: 'Lỗi khi từ chối bài đăng.', error: error.message });
    }
  },

  // 6c. Gia sư Phản hồi Lời mời chỉ định trực tiếp (WAITING_TUTOR_CONFIRM -> ACCEPT hoặc DECLINE)
  async tutorRespondDirectClass(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ message: 'Vui lòng đăng nhập tài khoản Gia sư.' });
      }

      const id = String(req.params.id || '').trim();
      const { action } = req.body;

      if (!['ACCEPT', 'DECLINE'].includes(action)) {
        return res.status(400).json({ message: 'Hành động không hợp lệ (ACCEPT hoặc DECLINE).' });
      }

      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      const isUuid = uuidRegex.test(id);

      const classRequest = await (prisma as any).classRequest.findFirst({
        where: isUuid
          ? { OR: [{ request_id: id }, { class_code: id }] }
          : { class_code: id },
        include: { student: { select: { user_id: true } } },
      });

      if (!classRequest) {
        return res.status(404).json({ message: 'Không tìm thấy thông tin lớp học.' });
      }

      if (classRequest.status !== 'WAITING_TUTOR_CONFIRM' && classRequest.status !== 'OPEN') {
        return res.status(400).json({ message: `Lớp học ở trạng thái ${classRequest.status}, không thể thực hiện thao tác này.` });
      }

      const tutorProfile = await (prisma as any).tutorProfile.findUnique({
        where: { user_id: user.user_id },
      });

      if (!tutorProfile) {
        return res.status(403).json({ message: 'Không tìm thấy hồ sơ Gia sư của bạn.' });
      }

      const tutorCode = tutorProfile.tutor_code ? String(tutorProfile.tutor_code).trim().toLowerCase() : '';
      const tutorPhone = tutorProfile.phone ? String(tutorProfile.phone).trim() : '';
      const selCode = classRequest.selected_tutor_code ? String(classRequest.selected_tutor_code).trim().toLowerCase() : '';

      const isDirectedToMe = selCode !== '' && (
        (tutorCode && selCode.includes(tutorCode)) ||
        (tutorPhone && selCode.includes(tutorPhone))
      );

      if (!isDirectedToMe) {
        return res.status(403).json({ message: 'Bạn không phải Gia sư được chỉ định trực tiếp cho lớp này.' });
      }

      if (action === 'DECLINE') {
        if (classRequest.status === 'WAITING_PAYMENT') {
          const resEscrow = await resolveEscrowExpiration(classRequest.request_id, 'TUTOR');
          return res.json({
            message: 'Bạn đã từ chối nhận lớp chỉ định. Hệ thống đã hoàn 100% học phí về ví Học viên và chuyển bài đăng sang công khai (OPEN).',
            data: formatClassRequestResponse(resEscrow?.updated || classRequest),
          });
        }

        const updated = await (prisma as any).classRequest.update({
          where: { request_id: classRequest.request_id },
          data: {
            status: 'OPEN',
            selected_tutor_code: null,
          },
        });

        return res.json({
          message: 'Bạn đã từ chối nhận lớp chỉ định. Yêu cầu đã được chuyển sang bài đăng công khai (OPEN).',
          data: formatClassRequestResponse(updated),
        });
      }

      let studentUserId = classRequest.student?.user_id || null;
      if (!studentUserId && classRequest.student_id) {
        const studentProfile = await (prisma as any).studentProfile.findUnique({
          where: { student_id: classRequest.student_id },
          select: { user_id: true },
        });
        studentUserId = studentProfile?.user_id || null;
      }
      if (!studentUserId && classRequest.email) {
        const userByEmail = await (prisma as any).user.findFirst({
          where: { email: { equals: classRequest.email, mode: 'insensitive' } },
          select: { user_id: true },
        });
        studentUserId = userByEmail?.user_id || null;
      }

      if (!studentUserId) {
        return res.status(400).json({ message: 'Lớp học này chưa có tài khoản Học viên liên kết để tạo nghĩa vụ nộp học phí escrow.' });
      }

      const salary = Number(classRequest.class_salary || 0);
      const commissionAmount = salary * 0.35;

      let existingApp = await (prisma as any).classApplication.findFirst({
        where: { class_request_id: classRequest.request_id, tutor_id: tutorProfile.tutor_id },
      });

      if (!existingApp) {
        existingApp = await (prisma as any).classApplication.create({
          data: {
            class_request_id: classRequest.request_id,
            tutor_id: tutorProfile.tutor_id,
            applicant_phone: tutorProfile.phone || user.email || '',
            available_from: new Date(),
            notes: 'Gia sư nhận lời mời chỉ định trực tiếp',
            status: 'APPROVED',
          },
        });
      } else {
        await (prisma as any).classApplication.update({
          where: { application_id: existingApp.application_id },
          data: { status: 'APPROVED' },
        });
      }

      const [updatedClass] = await (prisma as any).$transaction([
        (prisma as any).classRequest.update({
          where: { request_id: classRequest.request_id },
          data: {
            status: 'WAITING_PAYMENT',
            payment_deadline: new Date(Date.now() + env.escrowPaymentDeadlineMinutes * 60 * 1000),
            selected_tutor_code: tutorProfile.tutor_code,
          },
        }),
        (prisma as any).offlineClassPayment.create({
          data: {
            class_request_id: classRequest.request_id,
            payer_user_id: studentUserId,
            type: 'STUDENT_TUITION',
            status: 'PENDING',
            required_amount: salary,
          },
        }),
        (prisma as any).offlineClassPayment.create({
          data: {
            class_request_id: classRequest.request_id,
            payer_user_id: user.user_id,
            type: 'TUTOR_PLACEMENT_FEE',
            status: 'PENDING',
            required_amount: commissionAmount,
          },
        }),
      ]);

      return res.json({
        message: 'Bạn đã đồng ý nhận lớp chỉ định! Hệ thống chuyển sang đếm ngược 48h nộp tiền giữ chỗ (Escrow).',
        data: formatClassRequestResponse(updatedClass),
      });
    } catch (error: any) {
      console.error('Error in tutorRespondDirectClass:', error);
      return res.status(500).json({ message: 'Lỗi khi phản hồi nhận lớp chỉ định.', error: error.message });
    }
  },

  // 7. Admin Duyệt chọn Gia sư nhận lớp -> Giao lớp (chuyển sang WAITING_PAYMENT và TẠO 2 NGHĨA VỤ ESCROW PAYMENT)
  async adminAssignTutor(req: Request, res: Response) {
    try {
      const id = String(req.params.id || '').trim();
      const { tutor_id, tutor_code, application_id } = req.body;

      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      const isUuid = uuidRegex.test(id);

      const existingClass = await (prisma as any).classRequest.findFirst({
        where: isUuid
          ? { OR: [{ request_id: id }, { class_code: id }] }
          : { class_code: id },
        include: {
          student: { select: { user_id: true } },
        },
      });

      if (!existingClass) {
        return res.status(404).json({ message: 'Không tìm thấy thông tin lớp học.' });
      }

      if (['CANCELLED', 'EXPIRED'].includes(existingClass.status)) {
        return res.status(400).json({ message: `Lớp học đã ở trạng thái ${existingClass.status}, không thể giao gia sư.` });
      }

      let selectedTutorProfile: any = null;
      let targetApplicationId: string | null = application_id || null;

      if (tutor_id) {
        selectedTutorProfile = await (prisma as any).tutorProfile.findUnique({ where: { tutor_id } });
      } else if (tutor_code) {
        selectedTutorProfile = await (prisma as any).tutorProfile.findFirst({ where: { tutor_code: String(tutor_code).trim() } });
      } else if (application_id) {
        const app = await (prisma as any).classApplication.findUnique({ where: { application_id } });
        if (app && app.tutor_id) {
          selectedTutorProfile = await (prisma as any).tutorProfile.findUnique({ where: { tutor_id: app.tutor_id } });
        }
      }

      if (!selectedTutorProfile) {
        return res.status(400).json({ message: 'Vui lòng chọn thông tin Gia sư hợp lệ để giao lớp.' });
      }

      if (!targetApplicationId && selectedTutorProfile) {
        const existingApp = await (prisma as any).classApplication.findFirst({
          where: {
            class_request_id: existingClass.request_id,
            tutor_id: selectedTutorProfile.tutor_id,
          },
        });
        if (existingApp) {
          targetApplicationId = existingApp.application_id;
        }
      }

      let studentUserId = existingClass.student?.user_id || null;
      if (!studentUserId && existingClass.student_id) {
        const studentProfile = await (prisma as any).studentProfile.findUnique({
          where: { student_id: existingClass.student_id },
          select: { user_id: true },
        });
        studentUserId = studentProfile?.user_id || null;
      }
      if (!studentUserId && existingClass.email) {
        const userByEmail = await (prisma as any).user.findFirst({
          where: { email: { equals: existingClass.email, mode: 'insensitive' } },
          select: { user_id: true },
        });
        studentUserId = userByEmail?.user_id || null;
      }

      if (!studentUserId) {
        return res.status(400).json({ message: 'Lớp học này chưa có tài khoản Học viên liên kết để tạo nghĩa vụ nộp học phí escrow.' });
      }

      const tutorUserId = selectedTutorProfile.user_id;
      const salary = Number(existingClass.class_salary || 0);
      const commissionAmount = salary * 0.35; // 35% commission rate default

      const [updatedClass] = await (prisma as any).$transaction([
        (prisma as any).classRequest.update({
          where: { request_id: existingClass.request_id },
          data: {
            status: 'WAITING_PAYMENT',
            payment_deadline: new Date(Date.now() + env.escrowPaymentDeadlineMinutes * 60 * 1000),
            selected_tutor_code: selectedTutorProfile.tutor_code,
          },
        }),
        // Expire any stale pending escrow payments for this class request before creating new ones
        (prisma as any).offlineClassPayment.updateMany({
          where: {
            class_request_id: existingClass.request_id,
            status: 'PENDING',
          },
          data: { status: 'EXPIRED' },
        }),
        ...(targetApplicationId
          ? [
              (prisma as any).classApplication.update({
                where: { application_id: targetApplicationId },
                data: { status: 'APPROVED' },
              }),
            ]
          : []),
        (prisma as any).offlineClassPayment.create({
          data: {
            class_request_id: existingClass.request_id,
            payer_user_id: studentUserId,
            type: 'STUDENT_TUITION',
            status: 'PENDING',
            required_amount: salary,
          },
        }),
        (prisma as any).offlineClassPayment.create({
          data: {
            class_request_id: existingClass.request_id,
            payer_user_id: tutorUserId,
            type: 'TUTOR_PLACEMENT_FEE',
            status: 'PENDING',
            required_amount: commissionAmount,
          },
        }),
      ]);

      return res.json({
        message: 'Giao lớp thành công! Hệ thống đã khởi tạo 2 nghĩa vụ tiền giữ chỗ (Escrow) chờ Học viên và Gia sư thanh toán.',
        data: formatClassRequestResponse(updatedClass),
      });
    } catch (error: any) {
      console.error('Error assigning tutor:', error);
      return res.status(500).json({ message: 'Lỗi khi giao lớp cho gia sư.', error: error.message });
    }
  },

  // 8. Gia sư thanh toán phí nhận lớp escrow (TUTOR_PLACEMENT_FEE)
  async payCommission(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ message: 'Vui lòng đăng nhập tài khoản Gia sư.' });
      }

      const id = String(req.params.id || '').trim();
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      const isUuid = uuidRegex.test(id);

      const classRequest = await (prisma as any).classRequest.findFirst({
        where: isUuid
          ? { OR: [{ request_id: id }, { class_code: id }] }
          : { class_code: id },
        include: { subject: { select: { name: true } } },
      });

      if (!classRequest) {
        return res.status(404).json({ message: 'Không tìm thấy thông tin lớp học.' });
      }

      let paymentRecord = await (prisma as any).offlineClassPayment.findFirst({
        where: {
          class_request_id: classRequest.request_id,
          type: 'TUTOR_PLACEMENT_FEE',
          status: 'PENDING',
        },
      });

      if (!paymentRecord) {
        const requiredAmount = Number(classRequest.class_salary || 0) * 0.35;
        paymentRecord = await (prisma as any).offlineClassPayment.create({
          data: {
            class_request_id: classRequest.request_id,
            payer_user_id: user.user_id,
            type: 'TUTOR_PLACEMENT_FEE',
            status: 'PENDING',
            required_amount: requiredAmount,
          },
        });
      }

      const feeAmount = Number(paymentRecord.required_amount);

      const tutorWallet = await (prisma as any).wallet.findUnique({
        where: { user_id: user.user_id },
      });
      const currentBalance = tutorWallet ? Number(tutorWallet.balance) : 0;

      if (currentBalance < feeAmount) {
        return res.status(400).json({
          error: 'insufficient_balance',
          message: `Số dư ví không đủ. Cần ${feeAmount.toLocaleString('vi-VN')} VNĐ, hiện có ${currentBalance.toLocaleString('vi-VN')} VNĐ.`,
          balance: currentBalance,
          fee_amount: feeAmount,
          shortage: feeAmount - currentBalance,
        });
      }

      const subjectName = classRequest.subject?.name || 'Lớp Offline';

      const [transaction] = await (prisma as any).$transaction([
        (prisma as any).transaction.create({
          data: {
            user_id: user.user_id,
            amount: feeAmount,
            payment_method: 'wallet',
            description: `Phí nhận lớp escrow MS:${classRequest.class_code} — ${subjectName}`,
            status: 'success',
            paid_at: new Date(),
          },
        }),
        (prisma as any).wallet.update({
          where: { user_id: user.user_id },
          data: { balance: { decrement: feeAmount }, updated_at: new Date() },
        }),
      ]);

      await (prisma as any).offlineClassPayment.update({
        where: { payment_id: paymentRecord.payment_id },
        data: {
          status: 'PAID',
          paid_amount: feeAmount,
          paid_at: new Date(),
          transaction_id: transaction.transaction_id,
        },
      });

      const activatedOfflineClass = await checkAndActivateOfflineClass(classRequest.request_id);

      return res.json({
        message: activatedOfflineClass
          ? 'Đã hoàn tất đóng phí nhận lớp! Cả 2 bên đã thanh toán đủ tiền giữ chỗ — Lớp học chính thức được kích hoạt (ACTIVE).'
          : 'Đã hoàn tất đóng phí nhận lớp! Đang chờ Học viên hoàn tất nộp học phí tháng đầu để khởi tạo lớp chính thức.',
        data: {
          activated: !!activatedOfflineClass,
          offline_class: activatedOfflineClass,
        },
      });
    } catch (error: any) {
      console.error('Error in payCommission:', error);
      return res.status(500).json({ message: 'Lỗi khi thanh toán phí nhận lớp.', error: error.message });
    }
  },

  // 8b. Gia sư hủy nhận lớp khi đang ở trạng thái WAITING_PAYMENT
  async cancelTutorAssignment(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ message: 'Vui lòng đăng nhập tài khoản Gia sư.' });
      }

      const id = String(req.params.id || '').trim();
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      const isUuid = uuidRegex.test(id);

      const classRequest = await (prisma as any).classRequest.findFirst({
        where: isUuid
          ? { OR: [{ request_id: id }, { class_code: id }] }
          : { class_code: id },
        include: {
          applications: true,
        },
      });

      if (!classRequest) {
        return res.status(404).json({ message: 'Không tìm thấy thông tin lớp học.' });
      }

      if (classRequest.status !== 'WAITING_PAYMENT') {
        return res.status(400).json({ message: 'Lớp học hiện không ở trạng thái chờ thanh toán (WAITING_PAYMENT).' });
      }

      const tutorProfile = await (prisma as any).tutorProfile.findUnique({
        where: { user_id: user.user_id },
      });

      if (!tutorProfile) {
        return res.status(403).json({ message: 'Không tìm thấy hồ sơ Gia sư của bạn.' });
      }

      const approvedApp = (classRequest.applications || []).find((app: any) => app.status === 'APPROVED');
      const isAssignedTutor =
        (approvedApp && approvedApp.tutor_id === tutorProfile.tutor_id) ||
        (classRequest.selected_tutor_code &&
          tutorProfile.tutor_code &&
          classRequest.selected_tutor_code.toLowerCase().includes(tutorProfile.tutor_code.toLowerCase()));

      if (!isAssignedTutor) {
        return res.status(403).json({ message: 'Bạn không phải gia sư được chọn cho lớp này.' });
      }

      const result = await resolveEscrowExpiration(classRequest.request_id, 'TUTOR');
      if (!result) {
        return res.status(400).json({ message: 'Không thể hủy nhận lớp vào lúc này.' });
      }

      return res.json({
        message: 'Đã hủy nhận lớp thành công. Lớp đã được mở lại để các Gia sư khác ứng tuyển.',
        data: result.updated,
      });
    } catch (error: any) {
      console.error('Error in cancelTutorAssignment:', error);
      return res.status(500).json({ message: 'Lỗi khi hủy nhận lớp.', error: error.message });
    }
  },

  // 9. Học viên thanh toán học phí tháng đầu escrow (STUDENT_TUITION)
  async payStudentTuition(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ message: 'Vui lòng đăng nhập tài khoản Học viên.' });
      }

      const id = String(req.params.id || '').trim();
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      const isUuid = uuidRegex.test(id);

      const classRequest = await (prisma as any).classRequest.findFirst({
        where: isUuid
          ? { OR: [{ request_id: id }, { class_code: id }] }
          : { class_code: id },
        include: { subject: { select: { name: true } } },
      });

      if (!classRequest) {
        return res.status(404).json({ message: 'Không tìm thấy thông tin lớp học.' });
      }

      let paymentRecord = await (prisma as any).offlineClassPayment.findFirst({
        where: {
          class_request_id: classRequest.request_id,
          type: 'STUDENT_TUITION',
          status: 'PENDING',
        },
      });

      if (!paymentRecord) {
        const requiredAmount = Number(classRequest.class_salary || 0);
        paymentRecord = await (prisma as any).offlineClassPayment.create({
          data: {
            class_request_id: classRequest.request_id,
            payer_user_id: user.user_id,
            type: 'STUDENT_TUITION',
            status: 'PENDING',
            required_amount: requiredAmount,
          },
        });
      }

      const tuitionAmount = Number(paymentRecord.required_amount);

      const studentWallet = await (prisma as any).wallet.findUnique({
        where: { user_id: user.user_id },
      });
      const currentBalance = studentWallet ? Number(studentWallet.balance) : 0;

      if (currentBalance < tuitionAmount) {
        return res.status(400).json({
          error: 'insufficient_balance',
          message: `Số dư ví không đủ. Cần ${tuitionAmount.toLocaleString('vi-VN')} VNĐ, hiện có ${currentBalance.toLocaleString('vi-VN')} VNĐ.`,
          balance: currentBalance,
          tuition_amount: tuitionAmount,
          shortage: tuitionAmount - currentBalance,
        });
      }

      const subjectName = classRequest.subject?.name || 'Lớp Offline';

      const [transaction] = await (prisma as any).$transaction([
        (prisma as any).transaction.create({
          data: {
            user_id: user.user_id,
            amount: tuitionAmount,
            payment_method: 'wallet',
            description: `Học phí tháng đầu escrow MS:${classRequest.class_code} — ${subjectName}`,
            status: 'success',
            paid_at: new Date(),
          },
        }),
        (prisma as any).wallet.update({
          where: { user_id: user.user_id },
          data: { balance: { decrement: tuitionAmount }, updated_at: new Date() },
        }),
      ]);

      await (prisma as any).offlineClassPayment.update({
        where: { payment_id: paymentRecord.payment_id },
        data: {
          status: 'PAID',
          paid_amount: tuitionAmount,
          paid_at: new Date(),
          transaction_id: transaction.transaction_id,
        },
      });

      const activatedOfflineClass = await checkAndActivateOfflineClass(classRequest.request_id);

      return res.json({
        message: activatedOfflineClass
          ? 'Đã hoàn tất thanh toán học phí! Cả 2 bên đã nộp đủ tiền giữ chỗ — Lớp học chính thức được kích hoạt (ACTIVE).'
          : 'Đã hoàn tất thanh toán học phí tháng đầu! Đang chờ Gia sư hoàn tất nộp phí nhận lớp để khởi tạo lớp chính thức.',
        data: {
          activated: !!activatedOfflineClass,
          offline_class: activatedOfflineClass,
        },
      });
    } catch (error: any) {
      console.error('Error in payStudentTuition:', error);
      return res.status(500).json({ message: 'Lỗi khi thanh toán học phí.', error: error.message });
    }
  },

  // 10. Xử lý Trễ hạn đóng tiền Escrow
  async handleEscrowExpiration(req: Request, res: Response) {
    try {
      const id = String(req.params.id || '').trim();
      const { fault_party } = req.body;

      const override = (fault_party === 'STUDENT' || fault_party === 'TUTOR') ? fault_party : undefined;
      const result = await resolveEscrowExpiration(id, override);

      if (!result) {
        return res.status(400).json({ message: 'Không thể xử lý trễ hạn (không tìm thấy lớp hoặc lớp không ở trạng thái WAITING_PAYMENT).' });
      }

      return res.json({ message: result.message, data: result.updated });
    } catch (error: any) {
      console.error('Error handling escrow expiration:', error);
      return res.status(500).json({ message: 'Lỗi khi xử lý trễ hạn đóng phí.', error: error.message });
    }
  },

  // 11. Học viên lấy danh sách các lớp của mình
  async getMyRequests(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ message: 'Vui lòng đăng nhập.' });
      }

      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

      let studentProfile: any = null;
      if (user.user_id && uuidRegex.test(String(user.user_id))) {
        studentProfile = await (prisma as any).studentProfile.findUnique({
          where: { user_id: user.user_id },
        });
      }

      const matchCriteria: any[] = [];
      if (user.email) matchCriteria.push({ email: { equals: user.email, mode: 'insensitive' } });
      if (studentProfile?.phone) matchCriteria.push({ phone: studentProfile.phone });

      if (studentProfile && matchCriteria.length > 0) {
        await (prisma as any).classRequest.updateMany({
          where: { student_id: null, OR: matchCriteria },
          data: { student_id: studentProfile.student_id },
        });
      }

      const whereConditions: any[] = [];
      if (studentProfile) whereConditions.push({ student_id: studentProfile.student_id });
      if (user.email) whereConditions.push({ email: { equals: user.email, mode: 'insensitive' } });

      const requests = whereConditions.length > 0
        ? await (prisma as any).classRequest.findMany({
            where: { OR: whereConditions },
            orderBy: { created_at: 'desc' },
            include: {
              subject: { select: { name: true } },
              payments: true,
              applications: { select: { applicant_phone: true, tutor: { select: { full_name: true, phone: true } } } },
              _count: { select: { applications: true } },
            },
          })
        : [];

      const offlineClasses = studentProfile
        ? await (prisma as any).offlineClass.findMany({
            where: { student_id: studentProfile.student_id },
            orderBy: { created_at: 'desc' },
            include: {
              tutor: { select: { full_name: true, phone: true, avatar_url: true } },
              payments: true,
              refund_tickets: {
              include: {
                requester: {
                  select: {
                    user_id: true,
                    email: true,
                    role: true,
                    student_profile: { select: { full_name: true, phone: true } },
                    tutor_profile: { select: { full_name: true, phone: true, tutor_code: true } },
                    admin_profile: { select: { full_name: true, phone: true } },
                  },
                },
              },
            },
            },
          })
        : [];

      const studentTutorMap = await buildSelectedTutorMap(requests);
      const formattedRequests = requests.map((cls: any) => ({
        ...formatClassRequestResponse(cls, studentTutorMap),
        is_active_offline_class: false,
      }));

      const formattedOfflineClasses = offlineClasses.map((cls: any) => ({
        ...formatClassRequestResponse(cls),
        is_active_offline_class: true,
        tutor_name: cls.tutor?.full_name,
        tutor_phone: cls.tutor?.phone,
        payments: cls.payments,
        refund_tickets: cls.refund_tickets,
      }));

      return res.json({
        data: [...formattedRequests, ...formattedOfflineClasses],
      });
    } catch (error: any) {
      console.error('Error fetching my class requests:', error);
      return res.status(500).json({ message: 'Lỗi khi lấy danh sách lớp yêu cầu của học viên.', error: error.message });
    }
  },

  // 12. Học viên cập nhật yêu cầu
  async updateMyRequest(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: 'Vui lòng đăng nhập.' });

      const id = String(req.params.id || '').trim();
      const { desired_price, class_salary, status } = req.body;

      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      const isUuid = uuidRegex.test(id);

      const existing = await (prisma as any).classRequest.findFirst({
        where: isUuid ? { OR: [{ request_id: id }, { class_code: id }] } : { class_code: id },
      });

      if (!existing) return res.status(404).json({ message: 'Không tìm thấy yêu cầu lớp học.' });

      // Kiểm tra quyền sở hữu đối với ClassRequest (student_id, email, phone, hoặc Admin)
      let studentProfile: any = null;
      if (user.user_id && uuidRegex.test(String(user.user_id))) {
        studentProfile = await (prisma as any).studentProfile.findUnique({
          where: { user_id: user.user_id },
        });
      }

      const userRole = String(user.role || '').toLowerCase();
      const isOwner =
        userRole === 'admin' ||
        (studentProfile && existing.student_id === studentProfile.student_id) ||
        (user.email && existing.email && String(existing.email).trim().toLowerCase() === String(user.email).trim().toLowerCase()) ||
        (studentProfile?.phone && existing.phone && String(studentProfile.phone).trim() === String(existing.phone).trim());

      if (!isOwner) {
        return res.status(403).json({ message: 'Bạn không có quyền chỉnh sửa yêu cầu lớp học này.' });
      }

      // Tự động liên kết student_id nếu lớp chưa được gắn student_id
      if (studentProfile && !existing.student_id) {
        await (prisma as any).classRequest.update({
          where: { request_id: existing.request_id },
          data: { student_id: studentProfile.student_id },
        });
      }

      const updateData: any = {};
      const priceInput = class_salary !== undefined ? class_salary : desired_price;
      if (priceInput !== undefined && priceInput !== null) {
        updateData.class_salary = typeof priceInput === 'number' ? priceInput : Number(String(priceInput || 0).replace(/[^0-9.]/g, '')) || 0;
      }

      if (status && ['CANCELLED', 'OPEN', 'PENDING_ADMIN'].includes(status)) {
        updateData.status = status;
      }

      const updated = await (prisma as any).classRequest.update({
        where: { request_id: existing.request_id },
        data: updateData,
        include: { subject: { select: { name: true } } },
      });

      return res.json({
        message: 'Cập nhật thông tin lớp yêu cầu thành công!',
        data: formatClassRequestResponse(updated),
      });
    } catch (error: any) {
      console.error('Error updating my class request:', error);
      return res.status(500).json({ message: 'Lỗi khi cập nhật yêu cầu lớp học.', error: error.message });
    }
  },

  // 13. Gia sư lấy danh sách lớp liên quan
  async getTutorClasses(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: 'Vui lòng đăng nhập tài khoản Gia sư.' });

      const tutorProfile = await (prisma as any).tutorProfile.findUnique({
        where: { user_id: user.user_id },
      });

      if (!tutorProfile) return res.json({ data: [] });

      const tutorCode = tutorProfile.tutor_code ? String(tutorProfile.tutor_code).trim() : null;
      const tutorPhone = tutorProfile.phone ? String(tutorProfile.phone).trim() : null;

      const matchOrConditions: any[] = [
        { applications: { some: { tutor_id: tutorProfile.tutor_id } } },
      ];
      if (tutorCode) matchOrConditions.push({ selected_tutor_code: { equals: tutorCode, mode: 'insensitive' } });
      if (tutorPhone) matchOrConditions.push({ selected_tutor_code: { equals: tutorPhone, mode: 'insensitive' } });

      const [requests, offlineClasses] = await Promise.all([
        (prisma as any).classRequest.findMany({
          where: { OR: matchOrConditions },
          orderBy: { created_at: 'desc' },
          include: {
            subject: { select: { name: true } },
            payments: true,
            applications: {
              where: { tutor_id: tutorProfile.tutor_id },
              select: { application_id: true, status: true, created_at: true },
            },
            _count: { select: { applications: true } },
          },
        }),
        (prisma as any).offlineClass.findMany({
          where: { tutor_id: tutorProfile.tutor_id },
          orderBy: { created_at: 'desc' },
          include: {
            payments: true,
            refund_tickets: {
              include: {
                requester: {
                  select: {
                    user_id: true,
                    email: true,
                    role: true,
                    student_profile: { select: { full_name: true, phone: true } },
                    tutor_profile: { select: { full_name: true, phone: true, tutor_code: true } },
                    admin_profile: { select: { full_name: true, phone: true } },
                  },
                },
              },
            },
          },
        }),
      ]);

      const formattedRequests = requests.map((cls: any) => {
        const myApp = cls.applications && cls.applications.length > 0 ? cls.applications[0] : null;
        const selCode = cls.selected_tutor_code ? String(cls.selected_tutor_code).trim().toLowerCase() : '';
        const isDirectedToMe = selCode !== '' && (
          (tutorCode && selCode.includes(tutorCode.toLowerCase())) ||
          (tutorPhone && selCode.includes(tutorPhone.toLowerCase()))
        );

        const payments = cls.payments || [];
        const tutorPayment = payments.find((p: any) => p.type === 'TUTOR_PLACEMENT_FEE' && p.status === 'PAID') || payments.find((p: any) => p.type === 'TUTOR_PLACEMENT_FEE' && p.status === 'PENDING') || payments.find((p: any) => p.type === 'TUTOR_PLACEMENT_FEE');

        return {
          ...formatClassRequestResponse(cls),
          is_active_offline_class: false,
          is_directed_to_me: !!isDirectedToMe,
          is_assigned_to_me: cls.status === 'WAITING_PAYMENT' && (myApp?.status === 'APPROVED' || isDirectedToMe),
          my_application_status: myApp ? myApp.status : null,
          tutor_payment_status: tutorPayment?.status || 'PENDING',
          fee_amount: tutorPayment ? Number(tutorPayment.required_amount) : Number(cls.class_salary) * 0.35,
          payment_deadline: cls.payment_deadline ? (cls.payment_deadline instanceof Date ? cls.payment_deadline.toISOString() : cls.payment_deadline) : undefined,
          payments: cls.payments || [],
        };
      });

      const formattedOfflineClasses = offlineClasses.map((cls: any) => ({
        ...formatOfflineClassResponse(cls),
        is_active_offline_class: true,
        is_directed_to_me: true,
        is_assigned_to_me: true,
        payments: cls.payments,
        refund_tickets: cls.refund_tickets || [],
      }));

      return res.json({ data: [...formattedRequests, ...formattedOfflineClasses] });
    } catch (error: any) {
      console.error('Error fetching tutor classes:', error);
      return res.status(500).json({ message: 'Lỗi khi lấy danh sách lớp học của gia sư.', error: error.message });
    }
  },

  // 14. Admin Chỉnh sửa thông tin Lớp yêu cầu
  async adminUpdateClassRequest(req: Request, res: Response) {
    try {
      const id = String(req.params.id || '').trim();
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      const isUuid = uuidRegex.test(id);

      const existingClass = await (prisma as any).classRequest.findFirst({
        where: isUuid ? { OR: [{ request_id: id }, { class_code: id }] } : { class_code: id },
      });

      if (!existingClass) return res.status(404).json({ message: 'Không tìm thấy lớp học.' });

      const {
        student_name,
        phone,
        email,
        address_detail,
        district,
        province,
        grade_level,
        grade_id: input_grade_id,
        subject_name,
        subject_id: input_subject_id,
        num_students,
        academic_level,
        sessions_per_week,
        study_time,
        tutor_requirement,
        selected_tutor_code,
        desired_price,
        class_salary,
        other_requirements,
        status,
      } = req.body;

      const updateData: any = {};
      if (student_name !== undefined) updateData.student_name = student_name;
      if (phone !== undefined) updateData.phone = phone;
      if (email !== undefined) updateData.email = email || null;
      if (address_detail !== undefined) updateData.address_detail = address_detail;
      if (district !== undefined) updateData.district = district || null;
      if (province !== undefined) updateData.province = province || null;
      if (num_students !== undefined) updateData.num_students = Number(num_students) || 1;
      if (academic_level !== undefined) updateData.academic_level = academic_level || null;
      if (sessions_per_week !== undefined) updateData.sessions_per_week = Number(sessions_per_week) || 2;
      if (study_time !== undefined) updateData.study_time = study_time || null;
      if (tutor_requirement !== undefined) updateData.tutor_requirement = tutor_requirement || null;
      if (selected_tutor_code !== undefined) updateData.selected_tutor_code = selected_tutor_code || null;
      if (other_requirements !== undefined) updateData.other_requirements = other_requirements || null;

      const priceInput = class_salary !== undefined ? class_salary : desired_price;
      if (priceInput !== undefined && priceInput !== null) {
        updateData.class_salary = typeof priceInput === 'number' ? priceInput : Number(String(priceInput || 0).replace(/[^0-9.]/g, '')) || 0;
      }

      if (status !== undefined && status !== null) {
        updateData.status = status;
      }

      const gEnum = mapToGradeLevel(grade_level || input_grade_id);
      if (gEnum) updateData.grade_level = gEnum;

      if (input_subject_id !== undefined) {
        updateData.subject_id = input_subject_id || null;
      } else if (subject_name) {
        const foundSub = await (prisma as any).subject.findFirst({
          where: { name: { equals: String(subject_name).trim(), mode: 'insensitive' } },
        });
        if (foundSub) updateData.subject_id = foundSub.subject_id;
      }

      const updatedClass = await (prisma as any).classRequest.update({
        where: { request_id: existingClass.request_id },
        data: updateData,
        include: { subject: { select: { name: true } } },
      });

      return res.json({
        message: 'Cập nhật thông tin lớp học thành công.',
        data: formatClassRequestResponse(updatedClass),
      });
    } catch (error: any) {
      console.error('Error in adminUpdateClassRequest:', error);
      return res.status(500).json({ message: 'Lỗi khi cập nhật thông tin lớp phía Admin.', error: error.message });
    }
  },
};
