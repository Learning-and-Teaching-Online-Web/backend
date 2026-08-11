import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { GradeLevel } from '@prisma/client';

function mapToGradeLevel(val: any): GradeLevel | null {
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

function formatClassRequestResponse(cls: any) {
  if (!cls) return cls;
  return {
    ...cls,
    code: cls.class_code || cls.code || '',
    class_code: cls.class_code || cls.code || '',
    grade_level: cls.grade_level || 'Tất cả các lớp',
    subject_name: cls.subject?.name || '',
  };
}

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

      // Resolve subject_id if string subject_name is provided
      let finalSubjectId: string | null = input_subject_id || null;
      if (!finalSubjectId && subject_name) {
        const foundSubject = await (prisma as any).subject.findFirst({
          where: { name: { equals: String(subject_name).trim(), mode: 'insensitive' } },
        });
        if (foundSubject) {
          finalSubjectId = foundSubject.subject_id;
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

      // Safe numeric parsing for price / salary
      const priceInput = class_salary !== undefined ? class_salary : desired_price;
      const numericPrice = typeof priceInput === 'number'
        ? priceInput
        : Number(String(priceInput || 0).replace(/[^0-9.]/g, '')) || 0;

      // If user provided selected_tutor_code -> WAITING_TUTOR_CONFIRM, else PENDING_ADMIN
      const initialStatus = selected_tutor_code ? 'WAITING_TUTOR_CONFIRM' : 'PENDING_ADMIN';

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
          status: initialStatus,
        },
        include: {
          subject: { select: { name: true } },
        },
      });

      return res.status(201).json({
        message: 'Đăng ký tìm gia sư thành công! Trung tâm sẽ sớm liên hệ xác nhận.',
        data: formatClassRequestResponse(classRequest),
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
        const gEnum = mapToGradeLevel(grade);
        if (gEnum) {
          where.grade_level = gEnum;
        }
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
            _count: {
              select: { applications: true },
            },
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

  // 3. Lấy chi tiết 1 lớp học (Ảnh 2 - Chi tiết Lớp học)
  async getDetail(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const trimmedId = String(id || '').trim();

      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      const isUuid = uuidRegex.test(trimmedId);

      const where: any = isUuid
        ? { OR: [{ request_id: trimmedId }, { class_code: trimmedId }] }
        : { class_code: trimmedId };

      const classRequest = await (prisma as any).classRequest.findFirst({
        where,
        include: {
          subject: { select: { name: true } },
          applications: {
            orderBy: { created_at: 'desc' },
            include: {
              tutor: {
                select: { tutor_id: true, full_name: true, avatar_url: true, phone: true },
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

      let isOwnerStudentAndAssigned = false;
      if (user && user.role === 'student' && classRequest.student_id) {
        const studentProfile = await (prisma as any).studentProfile.findUnique({
          where: { user_id: user.user_id },
        });
        if (studentProfile && studentProfile.student_id === classRequest.student_id) {
          isOwnerStudentAndAssigned = true;
        }
      }

      let viewerTutorId: string | null = null;
      if (user && user.role === 'tutor') {
        const tutorProfile = await (prisma as any).tutorProfile.findUnique({
          where: { user_id: user.user_id },
        });
        if (tutorProfile) viewerTutorId = tutorProfile.tutor_id;
      }

      const sanitizedApplications = classRequest.applications?.map((app: any) => {
        const isSelfTutor = viewerTutorId && app.tutor_id && app.tutor_id === viewerTutorId;
        const canSeePhone = isAdmin || isOwnerStudentAndAssigned || isSelfTutor;
        return {
          ...app,
          applicant_phone: canSeePhone ? app.applicant_phone : null,
        };
      });

      const formattedData = {
        ...formatClassRequestResponse(classRequest),
        applications: sanitizedApplications,
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
        ? { OR: [{ request_id: trimmedId }, { class_code: trimmedId }] }
        : { class_code: trimmedId };

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
      const { status, search, page = 1, limit = 50 } = req.query;

      const where: any = {};
      if (status && status !== 'all') {
        where.status = String(status);
      }

      if (search) {
        const searchStr = String(search).trim().replace(/^MS:\s*/i, '');
        where.OR = [
          { class_code: { contains: searchStr, mode: 'insensitive' } },
          { student_name: { contains: searchStr, mode: 'insensitive' } },
          { phone: { contains: searchStr, mode: 'insensitive' } },
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
      console.error('Error admin get class requests:', error);
      return res.status(500).json({ message: 'Lỗi khi lấy danh sách yêu cầu lớp phía Admin.', error: error.message });
    }
  },

  // 6. Admin Duyệt mở lớp (Status -> OPEN)
  async adminApproveOpen(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const trimmedId = String(id || '').trim();
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      const isUuid = uuidRegex.test(trimmedId);

      let targetRequestId = trimmedId;
      if (!isUuid) {
        const found = await (prisma as any).classRequest.findFirst({ where: { class_code: trimmedId } });
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
        },
      });

      return res.json({
        message: 'Đã duyệt mở lớp công khai thành công.',
        data: formatClassRequestResponse(updated),
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
      const { tutor_id, tutor_code, application_id } = req.body;

      const trimmedId = String(id || '').trim();
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      const isUuid = uuidRegex.test(trimmedId);

      let targetRequestId = trimmedId;
      if (!isUuid) {
        const found = await (prisma as any).classRequest.findFirst({ where: { class_code: trimmedId } });
        if (!found) return res.status(404).json({ message: 'Không tìm thấy lớp học.' });
        targetRequestId = found.request_id;
      }

      const existingClass = await (prisma as any).classRequest.findUnique({
        where: { request_id: targetRequestId },
        select: { status: true, class_salary: true },
      });
      if (!existingClass) {
        return res.status(404).json({ message: 'Không tìm thấy thông tin lớp học.' });
      }
      if (existingClass.status === 'CANCELLED') {
        return res.status(400).json({ message: 'Lớp học này đã bị học viên HỦY YÊU CẦU, không thể giao cho gia sư.' });
      }

      let selectedCode = tutor_code || null;
      if (!selectedCode && tutor_id) {
        const tutor = await (prisma as any).tutorProfile.findUnique({ where: { tutor_id } });
        if (tutor) selectedCode = tutor.tutor_code;
      }

      // Update class request: status → WAITING_TUTOR_CONFIRM
      const updatedClass = await (prisma as any).classRequest.update({
        where: { request_id: targetRequestId },
        data: {
          status: 'WAITING_TUTOR_CONFIRM',
          selected_tutor_code: selectedCode,
        },
      });

      if (application_id) {
        await (prisma as any).classApplication.update({
          where: { application_id },
          data: { status: 'APPROVED' },
        });

        await (prisma as any).classApplication.updateMany({
          where: {
            class_request_id: targetRequestId,
            application_id: { not: application_id },
          },
          data: { status: 'REJECTED' },
        });
      }

      return res.json({
        message: `Giao lớp cho gia sư thành công!`,
        data: formatClassRequestResponse(updatedClass),
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
          subject: { select: { name: true } },
          applications: {
            where: { status: 'APPROVED' },
            select: { applicant_phone: true, tutor: { select: { full_name: true, phone: true } } }
          },
          _count: { select: { applications: true } },
        },
      });

      const formattedItems = items.map((cls: any) => formatClassRequestResponse(cls));

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
      const { desired_price, class_salary, status } = req.body;

      const trimmedId = String(id || '').trim();
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      const isUuid = uuidRegex.test(trimmedId);

      const where: any = isUuid
        ? { OR: [{ request_id: trimmedId }, { class_code: trimmedId }] }
        : { class_code: trimmedId };

      const existing = await (prisma as any).classRequest.findFirst({ where });
      if (!existing) {
        return res.status(404).json({ message: 'Không tìm thấy yêu cầu lớp học.' });
      }

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

      const priceInput = class_salary !== undefined ? class_salary : desired_price;
      if (priceInput !== undefined && priceInput !== null) {
        const numericPrice = typeof priceInput === 'number'
          ? priceInput
          : Number(String(priceInput || 0).replace(/[^0-9.]/g, '')) || 0;
        updateData.class_salary = numericPrice;
      }

      if (status && ['CANCELLED', 'OPEN', 'PENDING_ADMIN'].includes(status)) {
        updateData.status = status;
      }

      const updated = await (prisma as any).classRequest.update({
        where: { request_id: existing.request_id },
        data: updateData,
        include: {
          subject: { select: { name: true } },
        },
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

  // 10. Gia sư lấy danh sách lớp học được chỉ định / giao riêng hoặc ứng tuyển
  async getTutorClasses(req: Request, res: Response) {
    try {
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

      const matchOrConditions: any[] = [
        { applications: { some: { tutor_id: tutorProfile.tutor_id } } },
      ];

      if (tutorCode) {
        matchOrConditions.push({ selected_tutor_code: { equals: tutorCode, mode: 'insensitive' } });
      }
      if (tutorPhone) {
        matchOrConditions.push({ selected_tutor_code: { equals: tutorPhone, mode: 'insensitive' } });
      }

      const items = await (prisma as any).classRequest.findMany({
        where: { OR: matchOrConditions },
        orderBy: { created_at: 'desc' },
        include: {
          subject: { select: { name: true } },
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
        
        const isDirectedToMe = selCode !== '' && (
          (tutorCode && selCode.includes(tutorCode.toLowerCase())) ||
          (tutorPhone && selCode.includes(tutorPhone.toLowerCase()))
        );

        return {
          ...formatClassRequestResponse(cls),
          is_directed_to_me: !!isDirectedToMe,
          is_assigned_to_me: !!isDirectedToMe,
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
        ? { OR: [{ request_id: trimmedId }, { class_code: trimmedId }] }
        : { class_code: trimmedId };

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
            status: 'WAITING_TUTOR_CONFIRM',
            selected_tutor_code: tutorProfile.tutor_code,
          },
        });

        return res.json({
          message: 'Bạn đã đồng ý nhận lớp dạy thành công! Trung tâm sẽ liên hệ để trao đổi thông tin chi tiết.',
          data: formatClassRequestResponse(updated),
        });
      } else if (action === 'DECLINE') {
        const updated = await (prisma as any).classRequest.update({
          where: { request_id: classRequest.request_id },
          data: {
            status: 'OPEN',
            selected_tutor_code: null,
          },
        });

        return res.json({
          message: 'Đã từ chối nhận lớp. Lớp học này đã được chuyển về trạng thái công khai để tuyển gia sư khác.',
          data: formatClassRequestResponse(updated),
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
      const where: any = isUuid ? { request_id: trimmedId } : { class_code: trimmedId };

      const classRequest = await (prisma as any).classRequest.findFirst({
        where,
        include: {
          subject: { select: { name: true } },
        },
      });
      if (!classRequest) {
        return res.status(404).json({ message: 'Không tìm thấy thông tin lớp học.' });
      }

      const tutorProfile = await (prisma as any).tutorProfile.findUnique({
        where: { user_id: user.user_id },
      });
      if (!tutorProfile) {
        return res.status(403).json({ message: 'Không tìm thấy hồ sơ gia sư.' });
      }

      const feeAmount = Number(classRequest.class_salary || 0) * 0.35;

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

      const adminUser = await (prisma as any).user.findFirst({
        where: { role: 'admin' },
        select: { user_id: true },
      });

      const subjectName = classRequest.subject?.name || 'Lớp Offline';

      // Tạo OfflineClass khi gia sư đóng phí thành công và XÓA classRequest gốc
      const [offlineClass, transaction] = await (prisma as any).$transaction([
        (prisma as any).offlineClass.create({
          data: {
            tutor_id: tutorProfile.tutor_id,
            student_id: classRequest.student_id,
            class_offline_code: classRequest.class_code,
            student_name: classRequest.student_name,
            phone: classRequest.phone,
            email: classRequest.email,
            address_detail: classRequest.address_detail,
            district: classRequest.district,
            province: classRequest.province,
            grade_level: classRequest.grade_level,
            num_students: classRequest.num_students,
            academic_level: classRequest.academic_level,
            sessions_per_week: classRequest.sessions_per_week,
            study_time: classRequest.study_time,
            class_salary: classRequest.class_salary,
            commission_rate: 35,
            fee_amount: feeAmount,
            paid_at: new Date(),
            status: 'ACTIVE',
          },
        }),
        (prisma as any).transaction.create({
          data: {
            user_id: user.user_id,
            amount: feeAmount,
            payment_method: 'wallet',
            description: `Phí nhận lớp MS:${classRequest.class_code} — ${subjectName}`,
            status: 'success',
            paid_at: new Date(),
          },
        }),
        (prisma as any).wallet.update({
          where: { user_id: user.user_id },
          data: { balance: { decrement: feeAmount }, updated_at: new Date() },
        }),
        (prisma as any).wallet.upsert({
          where: { user_id: adminUser?.user_id || user.user_id },
          create: { user_id: adminUser?.user_id || user.user_id },
          update: { balance: { increment: feeAmount }, updated_at: new Date() },
        }),
        (prisma as any).classRequest.delete({
          where: { request_id: classRequest.request_id },
        }),
      ]);

      return res.json({
        message: 'Đã hoàn tất thủ tục thanh toán phí nhận lớp thành công!',
        data: {
          offline_class: offlineClass,
          transaction,
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
        ? { OR: [{ request_id: trimmedId }, { class_code: trimmedId }] }
        : { class_code: trimmedId };

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
        status
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
        const numericPrice = typeof priceInput === 'number'
          ? priceInput
          : Number(String(priceInput || 0).replace(/[^0-9.]/g, '')) || 0;
        updateData.class_salary = numericPrice;
      }

      if (status !== undefined && status !== null) {
        updateData.status = status;
      }

      const gEnum = mapToGradeLevel(grade_level || input_grade_id);
      if (gEnum) {
        updateData.grade_level = gEnum;
      }

      if (input_subject_id !== undefined) {
        updateData.subject_id = input_subject_id || null;
      } else if (subject_name) {
        const foundSub = await (prisma as any).subject.findFirst({
          where: { name: { equals: String(subject_name).trim(), mode: 'insensitive' } }
        });
        if (foundSub) {
          updateData.subject_id = foundSub.subject_id;
        }
      }

      const updatedClass = await (prisma as any).classRequest.update({
        where: { request_id: existingClass.request_id },
        data: updateData,
        include: {
          subject: { select: { name: true } },
        }
      });

      return res.json({
        message: 'Cập nhật thông tin lớp học thành công.',
        data: formatClassRequestResponse(updatedClass)
      });
    } catch (error: any) {
      console.error('Error in adminUpdateClassRequest:', error);
      return res.status(500).json({ message: 'Lỗi khi cập nhật thông tin lớp phía Admin.', error: error.message });
    }
  },
};
