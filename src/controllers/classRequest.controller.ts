import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export const classRequestController = {
  // 1. Học viên đăng ký tìm gia sư (Form Ảnh 1)
  async create(req: Request, res: Response) {
    try {
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

      const formattedData = {
        ...classRequest,
        grade_level: classRequest.grade?.name || 'Tất cả các lớp',
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

      if (!applicant_phone) {
        return res.status(400).json({ message: 'Vui lòng nhập số điện thoại của bạn.' });
      }

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

      let tutor_id: string | undefined = undefined;
      const user = (req as any).user;
      if (user && user.role === 'tutor') {
        const tutorProfile = await (prisma as any).tutorProfile.findUnique({
          where: { user_id: user.user_id },
        });
        if (tutorProfile) {
          tutor_id = tutorProfile.tutor_id;
        }
      }

      const dateVal = available_from || available_date;

      const application = await (prisma as any).classApplication.create({
        data: {
          class_request_id: classRequest.request_id,
          tutor_id: tutor_id || null,
          applicant_phone,
          available_from: dateVal ? new Date(dateVal) : null,
          notes: notes || null,
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
      const { status, page = 1, limit = 20 } = req.query;

      const where: any = {};
      if (status && status !== 'all') {
        where.status = String(status);
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

  // 7. Admin Duyệt chọn Gia sư nhận lớp (ASSIGNED)
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

      // Update class request
      const updatedClass = await (prisma as any).classRequest.update({
        where: { request_id: targetRequestId },
        data: {
          status: 'ASSIGNED',
          assigned_tutor_id: tutor_id || null,
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
        message: 'Giao lớp cho gia sư thành công!',
        data: updatedClass,
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
          _count: { select: { applications: true } },
        },
      });

      const formattedItems = items.map((cls: any) => ({
        ...cls,
        grade_level: cls.grade?.name || 'Tất cả các lớp',
      }));

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
};

