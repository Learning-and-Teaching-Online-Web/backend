import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export const classRequestController = {
  // 1. Học viên đăng ký tìm gia sư (Form Ảnh 1)
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
        subject_id,
        num_students,
        academic_level,
        sessions_per_week,
        study_time,
        tutor_requirement,
        selected_tutor_id,
        desired_price,
        other_requirements,
      } = req.body;

      if (!student_name || !phone || !address_detail || (!grade_level && !input_grade_id) || !subject_name) {
        return res.status(400).json({
          message: 'Vui lòng điền đầy đủ các thông tin bắt buộc (*)',
        });
      }

      // Resolve grade_id if string grade_level is provided
      let grade_id: string | null = input_grade_id || null;
      if (!grade_id && grade_level) {
        const foundGrade = await (prisma as any).grade.findFirst({
          where: { name: { equals: String(grade_level).trim(), mode: 'insensitive' } },
        });
        if (foundGrade) {
          grade_id = foundGrade.grade_id;
        }
      }

      // Generate random unique Code MS: XXXXX
      const randomCode = `${Math.floor(80000 + Math.random() * 19999)}`;

      // Check if student profile exists if authenticated or create one
      let student_id: string | undefined = undefined;
      const currentUser = (req as any).user;
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      if (currentUser && currentUser.user_id && uuidRegex.test(String(currentUser.user_id))) {
        let studentProfile = await (prisma as any).studentProfile.findUnique({
          where: { user_id: currentUser.user_id },
        });
        if (!studentProfile) {
          try {
            studentProfile = await (prisma as any).studentProfile.create({
              data: {
                user_id: currentUser.user_id,
                full_name: student_name || currentUser.user_metadata?.full_name || '',
                phone: phone || null,
              },
            });
          } catch {
            // Ignore if user record does not exist
          }
        }
        if (studentProfile) {
          student_id = studentProfile.student_id;
        }
      }

      // Safe UUID vs Text Code parsing
      let validTutorUuid: string | null = null;
      let textTutorCode: string | null = null;

      if (selected_tutor_id && typeof selected_tutor_id === 'string' && selected_tutor_id.trim() !== '') {
        const trimmed = selected_tutor_id.trim();
        const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
        if (uuidRegex.test(trimmed)) {
          validTutorUuid = trimmed;
        } else {
          textTutorCode = trimmed;
          try {
            const foundTutor = await (prisma as any).tutorProfile.findFirst({
              where: {
                OR: [
                  { tutor_code: { equals: trimmed, mode: 'insensitive' } },
                  { phone: { equals: trimmed, mode: 'insensitive' } }
                ]
              }
            });
            if (foundTutor) {
              validTutorUuid = foundTutor.tutor_id;
            }
          } catch {
            // Ignore search error
          }
        }
      }

      // Safe numeric parsing for price
      const numericPrice = typeof desired_price === 'number'
        ? desired_price
        : Number(String(desired_price || 0).replace(/[^0-9.]/g, '')) || 0;

      // If user provided selected_tutor_id or code -> WAITING_TUTOR_CONFIRM, else PENDING_ADMIN
      const initialStatus = (validTutorUuid || textTutorCode) ? 'WAITING_TUTOR_CONFIRM' : 'PENDING_ADMIN';

      const classRequest = await (prisma as any).classRequest.create({
        data: {
          code: randomCode,
          student_id: student_id || null,
          student_name,
          phone,
          email: email || null,
          address_detail,
          district: district || null,
          province: province || null,
          grade_id: grade_id || null,
          subject_name,
          subject_id: subject_id || null,
          num_students: num_students ? Number(num_students) : 1,
          academic_level: academic_level || null,
          sessions_per_week: sessions_per_week ? Number(sessions_per_week) : 2,
          study_time: study_time || null,
          tutor_requirement: tutor_requirement || null,
          selected_tutor_id: validTutorUuid,
          selected_tutor_code: textTutorCode,
          desired_price: numericPrice,
          commission_rate: 35,
          other_requirements: other_requirements || null,
          status: initialStatus,
        },
        include: {
          grade: { select: { name: true } },
        },
      });

      const responseData = {
        ...classRequest,
        grade_level: classRequest.grade?.name || grade_level || 'Tất cả các lớp',
      };

      return res.status(201).json({
        message: 'Đăng ký tìm gia sư thành công! Trung tâm sẽ sớm liên hệ xác nhận.',
        data: responseData,
      });
    } catch (error: any) {
      console.error('Error creating class request:', error);
      return res.status(500).json({ message: 'Lỗi máy chủ khi tạo yêu cầu tìm gia sư.', error: error.message });
    }
  },

  // 2. Lấy danh sách Lớp học chưa giao (OPEN) cho Gia sư & Công khai (Ảnh 1 - LỚP DẠY KÈM MỚI)
  async getOpenClasses(req: Request, res: Response) {
    try {
      const { search, province, grade, page = 1, limit = 20 } = req.query;

      const where: any = {
        status: 'OPEN',
      };

      if (province && province !== '--Tất cả Tỉnh/Thành--' && province !== 'all') {
        where.province = { contains: String(province), mode: 'insensitive' };
      }

      if (grade && grade !== 'all') {
        where.grade = { name: { contains: String(grade), mode: 'insensitive' } };
      }

      if (search) {
        const searchStr = String(search).trim();
        where.OR = [
          { code: { contains: searchStr, mode: 'insensitive' } },
          { subject_name: { contains: searchStr, mode: 'insensitive' } },
          { grade: { name: { contains: searchStr, mode: 'insensitive' } } },
          { address_detail: { contains: searchStr, mode: 'insensitive' } },
          { district: { contains: searchStr, mode: 'insensitive' } },
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
            grade: { select: { name: true } },
            _count: {
              select: { applications: true },
            },
          },
        }),
      ]);

      const formattedItems = items.map((cls: any) => ({
        ...cls,
        grade_level: cls.grade?.name || 'Tất cả các lớp',
      }));

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

  // 3. Lấy chi tiết 1 lớp học (Ảnh 2 - Chi tiết Lớp học)
  async getDetail(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const trimmedId = String(id || '').trim();

      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      const isUuid = uuidRegex.test(trimmedId);

      const where: any = isUuid
        ? { OR: [{ request_id: trimmedId }, { code: trimmedId }] }
        : { code: trimmedId };

      // Match either request_id or code (MS)
      const classRequest = await (prisma as any).classRequest.findFirst({
        where,
        include: {
          grade: { select: { name: true } },
          selected_tutor: {
            select: { tutor_id: true, full_name: true, phone: true, avatar_url: true },
          },
          assigned_tutor: {
            select: { tutor_id: true, full_name: true, phone: true, avatar_url: true },
          },
          applications: {
            orderBy: { created_at: 'desc' },
            include: {
              tutor: {
                select: { tutor_id: true, full_name: true, avatar_url: true },
              },
            },
          },
        },
      });

      if (!classRequest) {
        return res.status(404).json({ message: 'Không tìm thấy thông tin lớp học.' });
      }

      // Check viewer permissions for Tutor Phone Number Privacy
      const user = (req as any).user;
      const isAdmin = user && user.role === 'admin';

      // Check if user is the student owner of this request (when assigned)
      let isOwnerStudentAndAssigned = false;
      if (user && user.role === 'student' && classRequest.student_id && classRequest.status === 'ASSIGNED') {
        const studentProfile = await (prisma as any).studentProfile.findUnique({
          where: { user_id: user.user_id },
        });
        if (studentProfile && studentProfile.student_id === classRequest.student_id) {
          isOwnerStudentAndAssigned = true;
        }
      }

      // Check if user is a tutor and get tutor_id
      let viewerTutorId: string | null = null;
      if (user && user.role === 'tutor') {
        const tutorProfile = await (prisma as any).tutorProfile.findUnique({
          where: { user_id: user.user_id },
        });
        if (tutorProfile) viewerTutorId = tutorProfile.tutor_id;
      }

      // Sanitize phone numbers in applications
      const sanitizedApplications = classRequest.applications?.map((app: any) => {
        const isSelfTutor = viewerTutorId && app.tutor_id && app.tutor_id === viewerTutorId;
        const canSeePhone = isAdmin || isOwnerStudentAndAssigned || isSelfTutor;
        return {
          ...app,
          applicant_phone: canSeePhone ? app.applicant_phone : null,
        };
      });

      // Sanitize phone numbers in selected_tutor
      let sanitizedSelectedTutor = classRequest.selected_tutor;
      if (sanitizedSelectedTutor) {
        const isSelfTutor = viewerTutorId && sanitizedSelectedTutor.tutor_id === viewerTutorId;
        const canSeePhone = isAdmin || isOwnerStudentAndAssigned || isSelfTutor;
        if (!canSeePhone) {
          sanitizedSelectedTutor = { ...sanitizedSelectedTutor, phone: null };
        }
      }

      // Sanitize phone numbers in assigned_tutor
      let sanitizedAssignedTutor = classRequest.assigned_tutor;
      if (sanitizedAssignedTutor) {
        const isSelfTutor = viewerTutorId && sanitizedAssignedTutor.tutor_id === viewerTutorId;
        const canSeePhone = isAdmin || isOwnerStudentAndAssigned || isSelfTutor;
        if (!canSeePhone) {
          sanitizedAssignedTutor = { ...sanitizedAssignedTutor, phone: null };
        }
      }

      const formattedData = {
        ...classRequest,
        grade_level: classRequest.grade?.name || 'Tất cả các lớp',
        applications: sanitizedApplications,
        selected_tutor: sanitizedSelectedTutor,
        assigned_tutor: sanitizedAssignedTutor,
      };

      return res.json({ data: formattedData });
    } catch (error: any) {
      console.error('Error fetching class detail:', error);
      return res.status(500).json({ message: 'Lỗi khi lấy chi tiết lớp học.', error: error.message });
    }
  },

  // 4. Gia sư Đăng ký nhanh / Ứng tuyển nhận lớp (Ảnh 2 - Form Đăng Ký Nhanh)
  async apply(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { applicant_phone, available_date, available_from, notes } = req.body;

      const trimmedId = String(id || '').trim();
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      const isUuid = uuidRegex.test(trimmedId);

      const where: any = isUuid
        ? { OR: [{ request_id: trimmedId }, { code: trimmedId }] }
        : { code: trimmedId };

      // Check class existence
      const classRequest = await (prisma as any).classRequest.findFirst({
        where,
      });

      if (!classRequest) {
        return res.status(404).json({ message: 'Lớp học không tồn tại.' });
      }

      if (classRequest.status !== 'OPEN') {
        return res.status(400).json({ message: 'Lớp học này hiện không ở trạng thái mở ứng tuyển.' });
      }

      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ message: 'Vui lòng đăng nhập tài khoản Gia sư để ứng tuyển nhận lớp.' });
      }
      if (user.role !== 'tutor') {
        return res.status(403).json({ message: 'Chỉ tài khoản Gia sư mới có thể đăng ký nhận lớp dạy.' });
      }

      let tutor_id: string | undefined = undefined;
      const tutorProfile = await (prisma as any).tutorProfile.findUnique({
        where: { user_id: user.user_id },
      });
      if (tutorProfile) {
        tutor_id = tutorProfile.tutor_id;
      }

      const dateVal = available_from || available_date;
      const finalPhone = applicant_phone || tutorProfile?.phone || user.email || 'Chưa cập nhật SĐT';

      let validAvailableFrom: Date | null = null;
      let finalNotes = notes || null;

      if (dateVal) {
        const parsed = new Date(dateVal);
        if (!isNaN(parsed.getTime())) {
          validAvailableFrom = parsed;
        } else {
          finalNotes = notes ? `[Thời gian nhận: ${dateVal}] ${notes}` : `[Thời gian nhận: ${dateVal}]`;
        }
      }

      const application = await (prisma as any).classApplication.create({
        data: {
          class_request_id: classRequest.request_id,
          tutor_id: tutor_id || null,
          applicant_phone: finalPhone,
          available_from: validAvailableFrom,
          notes: finalNotes,
          status: 'PENDING',
        },
      });

      return res.status(201).json({
        message: 'Đăng ký nhận lớp thành công! Trung tâm sẽ xem xét duyệt ứng tuyển của bạn.',
        data: application,
      });
    } catch (error: any) {
      console.error('Error applying for class:', error);
      return res.status(500).json({ message: 'Lỗi khi đăng ký nhận lớp.', error: error.message });
    }
  },

  // 5. Admin Lấy toàn bộ danh sách lớp yêu cầu
  async adminGetAll(req: Request, res: Response) {
    try {
      await checkAndExpireAssignments();
      const { status, search, page = 1, limit = 50 } = req.query;

      const where: any = {};
      if (status && status !== 'all') {
        where.status = String(status);
      }

      if (search) {
        const searchStr = String(search).trim().replace(/^MS:\s*/i, '');
        where.OR = [
          { code: { contains: searchStr, mode: 'insensitive' } },
          { student_name: { contains: searchStr, mode: 'insensitive' } },
          { phone: { contains: searchStr, mode: 'insensitive' } },
          { subject_name: { contains: searchStr, mode: 'insensitive' } },
          { address_detail: { contains: searchStr, mode: 'insensitive' } },
          { district: { contains: searchStr, mode: 'insensitive' } },
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
            grade: { select: { name: true } },
            selected_tutor: { select: { full_name: true, phone: true } },
            assigned_tutor: { select: { full_name: true, phone: true } },
            _count: { select: { applications: true } },
          },
        }),
      ]);

      const formattedItems = items.map((cls: any) => ({
        ...cls,
        grade_level: cls.grade?.name || 'Tất cả các lớp',
      }));

      return res.json({
        total,
        page: Number(page),
        limit: take,
        totalPages: Math.ceil(total / take),
        data: formattedItems,
      });
    } catch (error: any) {
      console.error('Error admin get class requests:', error);
      return res.status(500).json({ message: 'Lỗi khi lấy danh sách yêu cầu lớp phía Admin.', error: error.message });
    }
  },

  // 6. Admin Duyệt mở lớp (Status -> OPEN)
  async adminApproveOpen(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { commission_rate } = req.body;

      const trimmedId = String(id || '').trim();
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      const isUuid = uuidRegex.test(trimmedId);

      let targetRequestId = trimmedId;
      if (!isUuid) {
        const found = await (prisma as any).classRequest.findFirst({ where: { code: trimmedId } });
        if (!found) return res.status(404).json({ message: 'Không tìm thấy lớp học.' });
        targetRequestId = found.request_id;
      }

      const existingClass = await (prisma as any).classRequest.findUnique({
        where: { request_id: targetRequestId },
        select: { status: true },
      });
      if (!existingClass) {
        return res.status(404).json({ message: 'Không tìm thấy thông tin lớp học.' });
      }
      if (existingClass.status === 'CANCELLED') {
        return res.status(400).json({ message: 'Lớp học này đã bị học viên HỦY YÊU CẦU, không thể thực hiện thao tác.' });
      }

      const updated = await (prisma as any).classRequest.update({
        where: { request_id: targetRequestId },
        data: {
          status: 'OPEN',
          commission_rate: commission_rate ? Number(commission_rate) : 35,
        },
      });

      return res.json({
        message: 'Đã duyệt mở lớp công khai thành công.',
        data: updated,
      });
    } catch (error: any) {
      console.error('Error admin approving class:', error);
      return res.status(500).json({ message: 'Lỗi khi duyệt mở lớp.', error: error.message });
    }
  },

  // 7. Admin Duyệt chọn Gia sư nhận lớp (WAITING_TUTOR_CONFIRM — chờ gia sư thanh toán phí)
  async adminAssignTutor(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { tutor_id, application_id } = req.body;

      const trimmedId = String(id || '').trim();
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      const isUuid = uuidRegex.test(trimmedId);

      let targetRequestId = trimmedId;
      if (!isUuid) {
        const found = await (prisma as any).classRequest.findFirst({ where: { code: trimmedId } });
        if (!found) return res.status(404).json({ message: 'Không tìm thấy lớp học.' });
        targetRequestId = found.request_id;
      }

      const existingClass = await (prisma as any).classRequest.findUnique({
        where: { request_id: targetRequestId },
        select: { status: true, desired_price: true, commission_rate: true },
      });
      if (!existingClass) {
        return res.status(404).json({ message: 'Không tìm thấy thông tin lớp học.' });
      }
      if (existingClass.status === 'CANCELLED') {
        return res.status(400).json({ message: 'Lớp học này đã bị học viên HỦY YÊU CẦU, không thể giao cho gia sư.' });
      }

      // Tính phí nhận lớp và hạn thanh toán 48 giờ
      const desiredPrice = Number(existingClass.desired_price) || 0;
      const commissionRate = Number(existingClass.commission_rate) || 35;
      const feeAmount = desiredPrice * commissionRate / 100;
      const paymentDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000); // +48 giờ

      // Update class request: status → WAITING_TUTOR_CONFIRM
      const updatedClass = await (prisma as any).classRequest.update({
        where: { request_id: targetRequestId },
        data: {
          status: 'WAITING_TUTOR_CONFIRM',
          assigned_tutor_id: tutor_id || null,
          payment_deadline: paymentDeadline,
          fee_amount: feeAmount,
        },
      });

      // Update application status if application_id is provided
      if (application_id) {
        await (prisma as any).classApplication.update({
          where: { application_id },
          data: { status: 'APPROVED' },
        });

        // Mark other applications for this class as REJECTED
        await (prisma as any).classApplication.updateMany({
          where: {
            class_request_id: targetRequestId,
            application_id: { not: application_id },
          },
          data: { status: 'REJECTED' },
        });
      }

      return res.json({
        message: `Giao lớp cho gia sư thành công! Gia sư có 48 giờ để thanh toán phí nhận lớp ${feeAmount.toLocaleString('vi-VN')} VNĐ.`,
        data: { ...updatedClass, fee_amount: feeAmount, payment_deadline: paymentDeadline },
      });
    } catch (error: any) {
      console.error('Error assigning tutor to class:', error);
      return res.status(500).json({ message: 'Lỗi khi giao lớp cho gia sư.', error: error.message });
    }
  },

  // 8. Học viên lấy danh sách các lớp tìm gia sư do chính mình đăng ký
  async getMyRequests(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ message: 'Vui lòng đăng nhập.' });
      }

      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

      // Find or create student profile if user_id is a valid UUID
      let studentProfile: any = null;
      if (user.user_id && uuidRegex.test(String(user.user_id))) {
        studentProfile = await (prisma as any).studentProfile.findUnique({
          where: { user_id: user.user_id },
        });
        if (!studentProfile) {
          try {
            studentProfile = await (prisma as any).studentProfile.create({
              data: {
                user_id: user.user_id,
                full_name: user.user_metadata?.full_name || '',
              },
            });
          } catch {
            // Ignore if user record does not exist in database
          }
        }
      }

      // Auto link unlinked class requests matching email or phone
      const matchCriteria: any[] = [];
      if (user.email) {
        matchCriteria.push({ email: { equals: user.email, mode: 'insensitive' } });
      }
      if (studentProfile?.phone) {
        matchCriteria.push({ phone: studentProfile.phone });
      }

      if (studentProfile && matchCriteria.length > 0) {
        await (prisma as any).classRequest.updateMany({
          where: {
            student_id: null,
            OR: matchCriteria,
          },
          data: {
            student_id: studentProfile.student_id,
          },
        });
      }

      const whereConditions: any[] = [];
      if (studentProfile) {
        whereConditions.push({ student_id: studentProfile.student_id });
      }
      if (user.email) {
        whereConditions.push({ email: { equals: user.email, mode: 'insensitive' } });
      }
      if (studentProfile?.phone) {
        whereConditions.push({ phone: studentProfile.phone });
      }

      if (whereConditions.length === 0) {
        return res.json({ data: [] });
      }

      const items = await (prisma as any).classRequest.findMany({
        where: { OR: whereConditions },
        orderBy: { created_at: 'desc' },
        include: {
          grade: { select: { name: true } },
          selected_tutor: { select: { tutor_id: true, full_name: true, phone: true, avatar_url: true } },
          assigned_tutor: { select: { tutor_id: true, full_name: true, phone: true, avatar_url: true } },
          applications: {
            where: { status: 'APPROVED' },
            select: { applicant_phone: true, tutor: { select: { full_name: true, phone: true } } }
          },
          _count: { select: { applications: true } },
        },
      });

      const formattedItems = items.map((cls: any) => {
        const approvedApp = cls.applications && cls.applications.length > 0 ? cls.applications[0] : null;
        const assignedPhone = cls.assigned_tutor?.phone || approvedApp?.applicant_phone || approvedApp?.tutor?.phone || null;
        return {
          ...cls,
          grade_level: cls.grade?.name || 'Tất cả các lớp',
          assigned_tutor: cls.assigned_tutor ? {
            ...cls.assigned_tutor,
            phone: assignedPhone || cls.assigned_tutor.phone,
          } : (approvedApp ? {
            full_name: approvedApp.tutor?.full_name || 'Gia sư',
            phone: assignedPhone,
          } : null),
        };
      });

      return res.json({ data: formattedItems });
    } catch (error: any) {
      console.error('Error fetching my class requests:', error);
      return res.status(500).json({ message: 'Lỗi khi lấy danh sách lớp yêu cầu của học viên.', error: error.message });
    }
  },

  // 9. Học viên cập nhật thông tin (mức lương / trạng thái hủy) cho lớp đã yêu cầu
  async updateMyRequest(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ message: 'Vui lòng đăng nhập.' });
      }

      const { id } = req.params;
      const { desired_price, status } = req.body;

      const trimmedId = String(id || '').trim();
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      const isUuid = uuidRegex.test(trimmedId);

      const where: any = isUuid
        ? { OR: [{ request_id: trimmedId }, { code: trimmedId }] }
        : { code: trimmedId };

      const existing = await (prisma as any).classRequest.findFirst({ where });
      if (!existing) {
        return res.status(404).json({ message: 'Không tìm thấy yêu cầu lớp học.' });
      }

      // Check ownership (by student_id or email)
      let studentProfile: any = null;
      if (user.user_id && uuidRegex.test(String(user.user_id))) {
        studentProfile = await (prisma as any).studentProfile.findUnique({
          where: { user_id: user.user_id },
        });
      }

      const isOwner = (studentProfile && existing.student_id === studentProfile.student_id)
        || (existing.email && user.email && existing.email.toLowerCase() === user.email.toLowerCase())
        || user.role === 'admin';

      if (!isOwner) {
        return res.status(403).json({ message: 'Bạn không có quyền chỉnh sửa yêu cầu lớp học này.' });
      }

      const updateData: any = {};

      if (desired_price !== undefined && desired_price !== null) {
        const numericPrice = typeof desired_price === 'number'
          ? desired_price
          : Number(String(desired_price || 0).replace(/[^0-9.]/g, '')) || 0;
        updateData.desired_price = numericPrice;
      }

      if (status && ['CANCELLED', 'OPEN', 'PENDING_ADMIN'].includes(status)) {
        updateData.status = status;
      }

      const updated = await (prisma as any).classRequest.update({
        where: { request_id: existing.request_id },
        data: updateData,
        include: {
          grade: { select: { name: true } },
          selected_tutor: { select: { full_name: true } },
          assigned_tutor: { select: { full_name: true } },
        },
      });

      const formatted = {
        ...updated,
        grade_level: updated.grade?.name || 'Tất cả các lớp',
      };

      return res.json({
        message: 'Cập nhật thông tin lớp yêu cầu thành công!',
        data: formatted,
      });
    } catch (error: any) {
      console.error('Error updating my class request:', error);
      return res.status(500).json({ message: 'Lỗi khi cập nhật yêu cầu lớp học.', error: error.message });
    }
  },

  // 10. Gia sư lấy danh sách lớp học được chỉ định / giao riêng hoặc ứng tuyển
  async getTutorClasses(req: Request, res: Response) {
    try {
      await checkAndExpireAssignments();
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ message: 'Vui lòng đăng nhập tài khoản Gia sư.' });
      }

      const tutorProfile = await (prisma as any).tutorProfile.findUnique({
        where: { user_id: user.user_id },
      });

      if (!tutorProfile) {
        return res.json({ data: [] });
      }

      const tutorCode = tutorProfile.tutor_code ? String(tutorProfile.tutor_code).trim() : null;
      const tutorPhone = tutorProfile.phone ? String(tutorProfile.phone).trim() : null;
      const tutorShortCode = tutorProfile.tutor_id ? tutorProfile.tutor_id.slice(0, 8) : null;

      const matchOrConditions: any[] = [
        { selected_tutor_id: tutorProfile.tutor_id },
        { assigned_tutor_id: tutorProfile.tutor_id },
        { applications: { some: { tutor_id: tutorProfile.tutor_id } } },
      ];

      if (tutorCode) {
        matchOrConditions.push({ selected_tutor_code: { equals: tutorCode, mode: 'insensitive' } });
        matchOrConditions.push({ selected_tutor_code: { contains: tutorCode, mode: 'insensitive' } });
      }
      if (tutorPhone) {
        matchOrConditions.push({ selected_tutor_code: { equals: tutorPhone, mode: 'insensitive' } });
      }
      if (tutorShortCode) {
        matchOrConditions.push({ selected_tutor_code: { contains: tutorShortCode, mode: 'insensitive' } });
      }

      const items = await (prisma as any).classRequest.findMany({
        where: { OR: matchOrConditions },
        orderBy: { created_at: 'desc' },
        include: {
          grade: { select: { name: true } },
          applications: {
            where: { tutor_id: tutorProfile.tutor_id },
            select: { application_id: true, status: true, created_at: true },
          },
          _count: { select: { applications: true } },
        },
      });

      const formattedItems = items.map((cls: any) => {
        const myApp = cls.applications && cls.applications.length > 0 ? cls.applications[0] : null;
        const selCode = cls.selected_tutor_code ? String(cls.selected_tutor_code).trim().toLowerCase() : '';
        
        // A class is strictly DIRECTED TO ME if the student specified this tutor when creating the request
        const isDirectedToMe = (cls.selected_tutor_id === tutorProfile.tutor_id)
          || (selCode !== '' && (
              (tutorCode && selCode.includes(tutorCode.toLowerCase())) ||
              (tutorPhone && selCode.includes(tutorPhone.toLowerCase())) ||
              (tutorShortCode && selCode.includes(tutorShortCode.toLowerCase()))
             ));

        // Hide student phone completely if class is not yet ASSIGNED
        const isAssigned = cls.status === 'ASSIGNED';
        const phoneDisplay = isAssigned ? cls.phone : null;

        return {
          ...cls,
          phone: phoneDisplay,
          grade_level: cls.grade?.name || 'Tất cả các lớp',
          is_directed_to_me: !!isDirectedToMe,
          is_assigned_to_me: cls.assigned_tutor_id === tutorProfile.tutor_id,
          my_application_status: myApp ? myApp.status : null,
        };
      });

      return res.json({ data: formattedItems });
    } catch (error: any) {
      console.error('Error fetching tutor classes:', error);
      return res.status(500).json({ message: 'Lỗi khi lấy danh sách lớp học của gia sư.', error: error.message });
    }
  },

  // 11. Gia sư Phản hồi nhận / Từ chối lớp học viên chỉ định
  async respondTutorClass(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ message: 'Vui lòng đăng nhập tài khoản Gia sư.' });
      }

      const { id } = req.params;
      const { action } = req.body; // 'ACCEPT' | 'DECLINE'

      const trimmedId = String(id || '').trim();
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      const isUuid = uuidRegex.test(trimmedId);

      const where: any = isUuid
        ? { OR: [{ request_id: trimmedId }, { code: trimmedId }] }
        : { code: trimmedId };

      const classRequest = await (prisma as any).classRequest.findFirst({ where });
      if (!classRequest) {
        return res.status(404).json({ message: 'Không tìm thấy thông tin lớp học.' });
      }

      const tutorProfile = await (prisma as any).tutorProfile.findUnique({
        where: { user_id: user.user_id },
      });

      if (!tutorProfile) {
        return res.status(403).json({ message: 'Không tìm thấy hồ sơ gia sư của bạn.' });
      }

      if (action === 'ACCEPT') {
        const updated = await (prisma as any).classRequest.update({
          where: { request_id: classRequest.request_id },
          data: {
            status: 'ASSIGNED',
            assigned_tutor_id: tutorProfile.tutor_id,
          },
        });

        return res.json({
          message: 'Bạn đã đồng ý nhận lớp dạy thành công! Trung tâm sẽ liên hệ để trao đổi thông tin chi tiết.',
          data: updated,
        });
      } else if (action === 'DECLINE') {
        const updated = await (prisma as any).classRequest.update({
          where: { request_id: classRequest.request_id },
          data: {
            status: 'OPEN',
            selected_tutor_id: null,
            selected_tutor_code: null,
          },
        });

        return res.json({
          message: 'Đã từ chối nhận lớp. Lớp học này đã được chuyển về trạng thái công khai để tuyển gia sư khác.',
          data: updated,
        });
      } else {
        return res.status(400).json({ message: 'Hành động không hợp lệ. Chỉ chấp nhận ACCEPT hoặc DECLINE.' });
      }
    } catch (error: any) {
      console.error('Error responding tutor class:', error);
      return res.status(500).json({ message: 'Lỗi khi phản hồi nhận lớp dạy.', error: error.message });
    }
  },

  // 12. Gia sư thanh toán phí nhận lớp offline từ ví nội bộ
  async payCommission(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ message: 'Vui lòng đăng nhập tài khoản Gia sư.' });
      }

      const { id } = req.params;
      const trimmedId = String(id || '').trim();
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      const isUuid = uuidRegex.test(trimmedId);
      const where: any = isUuid ? { request_id: trimmedId } : { code: trimmedId };

      // 1. Lấy thông tin lớp
      const classRequest = await (prisma as any).classRequest.findFirst({
        where,
        include: { grade: { select: { name: true } } },
      });
      if (!classRequest) {
        return res.status(404).json({ message: 'Không tìm thấy thông tin lớp học.' });
      }

      // 2. Lấy hồ sơ gia sư
      const tutorProfile = await (prisma as any).tutorProfile.findUnique({
        where: { user_id: user.user_id },
      });
      if (!tutorProfile) {
        return res.status(403).json({ message: 'Không tìm thấy hồ sơ gia sư.' });
      }

      // 3. Validate trạng thái lớp
      if (classRequest.status !== 'WAITING_TUTOR_CONFIRM') {
        return res.status(400).json({
          message: classRequest.status === 'ASSIGNED'
            ? 'Lớp học này đã được xác nhận (phí đã được thanh toán).'
            : `Không thể thanh toán phí. Trạng thái lớp hiện tại: ${classRequest.status}`,
        });
      }

      // 4. Validate gia sư được giao
      if (classRequest.assigned_tutor_id !== tutorProfile.tutor_id) {
        return res.status(403).json({ message: 'Bạn không phải gia sư được giao lớp này.' });
      }

      // 5. Kiểm tra hạn thanh toán
      if (classRequest.payment_deadline && new Date() > new Date(classRequest.payment_deadline)) {
        // Lazy expire: cập nhật trạng thái EXPIRED
        await (prisma as any).classRequest.update({
          where: { request_id: classRequest.request_id },
          data: { status: 'EXPIRED', assigned_tutor_id: null, payment_deadline: null, fee_amount: null },
        });
        return res.status(400).json({ message: 'Thời hạn thanh toán phí đã hết. Lớp đã được chuyển trở lại trạng thái hết hạn.' });
      }

      const feeAmount = Number(classRequest.fee_amount) || 0;
      if (feeAmount <= 0) {
        return res.status(400).json({ message: 'Không xác định được số tiền phí nhận lớp.' });
      }

      // 6. Kiểm tra số dư ví gia sư
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

      // 7. Tìm admin user để cộng tiền vào ví admin
      const adminUser = await (prisma as any).user.findFirst({
        where: { role: 'admin' },
        select: { user_id: true },
      });

      // 8. Thực hiện giao dịch atomic
      const [, , transaction, updatedClass] = await (prisma as any).$transaction([
        // Trừ tiền khỏi ví gia sư
        (prisma as any).wallet.update({
          where: { user_id: user.user_id },
          data: { balance: { decrement: feeAmount }, updated_at: new Date() },
        }),
        // Cộng tiền vào ví Admin
        (prisma as any).wallet.upsert({
          where: { user_id: adminUser?.user_id || user.user_id },
          create: { user_id: adminUser?.user_id || user.user_id, balance: feeAmount, currency: 'VND' },
          update: { balance: { increment: feeAmount }, updated_at: new Date() },
        }),
        // Tạo Transaction record
        (prisma as any).transaction.create({
          data: {
            user_id: user.user_id,
            amount: feeAmount,
            payment_method: 'wallet',
            description: `Phí nhận lớp MS:${classRequest.code} — ${classRequest.subject_name}`,
            status: 'success',
            paid_at: new Date(),
          },
        }),
        // Cập nhật trạng thái lớp → ASSIGNED (đã xác nhận)
        (prisma as any).classRequest.update({
          where: { request_id: classRequest.request_id },
          data: { status: 'ASSIGNED' },
        }),
      ]);

      return res.json({
        message: 'Đã hoàn tất thủ tục thanh toán phí nhận lớp thành công!',
        data: {
          class_request: updatedClass,
          transaction: transaction,
        },
      });
    } catch (error: any) {
      console.error('Error in payCommission:', error);
      return res.status(500).json({ message: 'Lỗi khi thanh toán phí nhận lớp.', error: error.message });
    }
  },

  // 15. Admin Chỉnh sửa toàn bộ thuộc tính của Lớp học Offline
  async adminUpdateClassRequest(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const trimmedId = String(id || '').trim();
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      const isUuid = uuidRegex.test(trimmedId);

      const where: any = isUuid
        ? { OR: [{ request_id: trimmedId }, { code: trimmedId }] }
        : { code: trimmedId };

      const existingClass = await (prisma as any).classRequest.findFirst({ where });
      if (!existingClass) {
        return res.status(404).json({ message: 'Không tìm thấy lớp học.' });
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
        subject_id,
        num_students,
        academic_level,
        sessions_per_week,
        study_time,
        tutor_requirement,
        desired_price,
        commission_rate,
        other_requirements,
        status
      } = req.body;

      const updateData: any = {};

      if (student_name !== undefined) updateData.student_name = student_name;
      if (phone !== undefined) updateData.phone = phone;
      if (email !== undefined) updateData.email = email || null;
      if (address_detail !== undefined) updateData.address_detail = address_detail;
      if (district !== undefined) updateData.district = district || null;
      if (province !== undefined) updateData.province = province || null;
      if (subject_name !== undefined) updateData.subject_name = subject_name;
      if (subject_id !== undefined) updateData.subject_id = subject_id || null;
      if (num_students !== undefined) updateData.num_students = Number(num_students) || 1;
      if (academic_level !== undefined) updateData.academic_level = academic_level || null;
      if (sessions_per_week !== undefined) updateData.sessions_per_week = Number(sessions_per_week) || 2;
      if (study_time !== undefined) updateData.study_time = study_time || null;
      if (tutor_requirement !== undefined) updateData.tutor_requirement = tutor_requirement || null;
      if (other_requirements !== undefined) updateData.other_requirements = other_requirements || null;

      if (desired_price !== undefined && desired_price !== null) {
        const numericPrice = typeof desired_price === 'number'
          ? desired_price
          : Number(String(desired_price || 0).replace(/[^0-9.]/g, '')) || 0;
        updateData.desired_price = numericPrice;
      }

      if (commission_rate !== undefined && commission_rate !== null) {
        updateData.commission_rate = Number(commission_rate) || 35;
      }

      if (status !== undefined && status !== null) {
        updateData.status = status;
      }

      // Resolve grade_id if grade_level string provided
      if (input_grade_id !== undefined) {
        updateData.grade_id = input_grade_id || null;
      } else if (grade_level) {
        const foundGrade = await (prisma as any).grade.findFirst({
          where: { name: { equals: String(grade_level).trim(), mode: 'insensitive' } }
        });
        if (foundGrade) {
          updateData.grade_id = foundGrade.grade_id;
        }
      }

      const updatedClass = await (prisma as any).classRequest.update({
        where: { request_id: existingClass.request_id },
        data: updateData,
        include: {
          grade: { select: { name: true } },
          selected_tutor: { select: { full_name: true, phone: true } },
          assigned_tutor: { select: { full_name: true, phone: true } }
        }
      });

      const responseData = {
        ...updatedClass,
        grade_level: updatedClass.grade?.name || grade_level || 'Tất cả các lớp'
      };

      return res.json({
        message: 'Cập nhật thông tin lớp học thành công.',
        data: responseData
      });
    } catch (error: any) {
      console.error('Error in adminUpdateClassRequest:', error);
      return res.status(500).json({ message: 'Lỗi khi cập nhật thông tin lớp phía Admin.', error: error.message });
    }
  },
};

// Helper: Lazy check và expire các lớp WAITING_TUTOR_CONFIRM quá hạn thanh toán
export async function checkAndExpireAssignments(): Promise<void> {
  try {
    await (prisma as any).classRequest.updateMany({
      where: {
        status: 'WAITING_TUTOR_CONFIRM',
        payment_deadline: { lt: new Date() },
      },
      data: {
        status: 'EXPIRED',
        assigned_tutor_id: null,
        payment_deadline: null,
        fee_amount: null,
      },
    });
  } catch (err) {
    console.error('Error in checkAndExpireAssignments:', err);
  }
}
