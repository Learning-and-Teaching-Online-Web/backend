"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classRequestController = void 0;
const prisma_1 = require("../config/prisma");
const client_1 = require("@prisma/client");
function mapToGradeLevel(val) {
    if (!val)
        return null;
    const str = String(val).trim();
    if (Object.values(client_1.GradeLevel).includes(str))
        return str;
    const match = str.match(/(\d+)/);
    if (match) {
        const key = `grade_${match[1]}`;
        if (key in client_1.GradeLevel)
            return client_1.GradeLevel[key];
    }
    return null;
}
function formatClassRequestResponse(cls) {
    if (!cls)
        return cls;
    return {
        ...cls,
        code: cls.class_code || cls.class_offline_code || cls.code || '',
        class_code: cls.class_code || cls.class_offline_code || cls.code || '',
        grade_level: cls.grade_level || 'Tất cả các lớp',
        subject_name: cls.subject?.name || cls.subject_name || '',
        desired_price: cls.class_salary ? Number(cls.class_salary) : Number(cls.desired_price || 0),
    };
}
// Helper: Kiểm tra nếu cả 2 khoản escrow (STUDENT_TUITION & TUTOR_PLACEMENT_FEE) đều đã PAID -> Tạo OfflineClass và XÓA ClassRequest
async function checkAndActivateOfflineClass(classRequestId) {
    const payments = await prisma_1.prisma.offlineClassPayment.findMany({
        where: { class_request_id: classRequestId },
    });
    const studentPayment = payments.find((p) => p.type === 'STUDENT_TUITION' && p.status === 'PAID');
    const tutorPayment = payments.find((p) => p.type === 'TUTOR_PLACEMENT_FEE' && p.status === 'PAID');
    if (!studentPayment || !tutorPayment) {
        return null; // Chưa đóng đủ cả 2 khoản
    }
    const classRequest = await prisma_1.prisma.classRequest.findUnique({
        where: { request_id: classRequestId },
    });
    if (!classRequest)
        return null;
    // Lấy tutor_id từ thông tin gia sư đã thanh toán hoặc application APPROVED
    const approvedApp = await prisma_1.prisma.classApplication.findFirst({
        where: { class_request_id: classRequestId, status: 'APPROVED' },
        select: { tutor_id: true },
    });
    let tutor_id = approvedApp?.tutor_id;
    if (!tutor_id && tutorPayment.payer_user_id) {
        const tutorProfile = await prisma_1.prisma.tutorProfile.findUnique({
            where: { user_id: tutorPayment.payer_user_id },
            select: { tutor_id: true },
        });
        tutor_id = tutorProfile?.tutor_id;
    }
    if (!tutor_id) {
        throw new Error('Không xác định được Gia sư nhận lớp để khởi tạo OfflineClass.');
    }
    // Khởi tạo OfflineClass ACTIVE và xóa ClassRequest trong 1 transaction
    const now = new Date();
    const refundDeadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // assigned_at + 7 days
    const offlineClass = await prisma_1.prisma.offlineClass.create({
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
    await prisma_1.prisma.offlineClassPayment.updateMany({
        where: { payment_id: { in: [studentPayment.payment_id, tutorPayment.payment_id] } },
        data: { class_id: offlineClass.class_id },
    });
    // Xóa ClassRequest (class_request_id tự động chuyển sang NULL ở OfflineClassPayment nhờ onDelete: SetNull)
    await prisma_1.prisma.classRequest.delete({
        where: { request_id: classRequestId },
    });
    return offlineClass;
}
exports.classRequestController = {
    // 1. Học viên tạo yêu cầu tìm gia sư
    async create(req, res) {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({ message: 'Vui lòng đăng nhập tài khoản Học viên để đăng bài tìm gia sư.' });
            }
            if (user.role === 'tutor') {
                return res.status(403).json({ message: 'Tài khoản Gia sư không thể tạo bài tìm gia sư. Vui lòng sử dụng tài khoản Học viên.' });
            }
            const { student_name, phone, email, address_detail, district, province, grade_level, grade_id: input_grade_id, subject_name, subject_id: input_subject_id, num_students, academic_level, sessions_per_week, study_time, tutor_requirement, selected_tutor_code, desired_price, class_salary, other_requirements, } = req.body;
            if (!student_name || !phone || !address_detail) {
                return res.status(400).json({
                    message: 'Vui lòng điền đầy đủ các thông tin bắt buộc (*)',
                });
            }
            const gEnum = mapToGradeLevel(grade_level || input_grade_id);
            let finalSubjectId = input_subject_id || null;
            if (!finalSubjectId && subject_name) {
                const foundSubject = await prisma_1.prisma.subject.findFirst({
                    where: { name: { equals: String(subject_name).trim(), mode: 'insensitive' } },
                });
                if (foundSubject) {
                    finalSubjectId = foundSubject.subject_id;
                }
            }
            const randomCode = `${Math.floor(80000 + Math.random() * 19999)}`;
            let student_id = undefined;
            const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
            if (user && user.user_id && uuidRegex.test(String(user.user_id))) {
                let studentProfile = await prisma_1.prisma.studentProfile.findUnique({
                    where: { user_id: user.user_id },
                });
                if (!studentProfile) {
                    try {
                        studentProfile = await prisma_1.prisma.studentProfile.create({
                            data: {
                                user_id: user.user_id,
                                full_name: student_name || user.user_metadata?.full_name || '',
                                phone: phone || null,
                            },
                        });
                    }
                    catch (_) {
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
            const classRequest = await prisma_1.prisma.classRequest.create({
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
        }
        catch (error) {
            console.error('Error creating class request:', error);
            return res.status(500).json({ message: 'Lỗi máy chủ khi tạo yêu cầu tìm gia sư.', error: error.message });
        }
    },
    // 2. Lấy danh sách Lớp học OPEN cho Gia sư & Công khai
    async getOpenClasses(req, res) {
        try {
            const { search, province, grade, page = 1, limit = 20 } = req.query;
            const where = { status: 'OPEN' };
            if (province && province !== '--Tất cả Tỉnh/Thành--' && province !== 'all') {
                where.province = { contains: String(province), mode: 'insensitive' };
            }
            if (grade && grade !== 'all') {
                const gEnum = mapToGradeLevel(grade);
                if (gEnum)
                    where.grade_level = gEnum;
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
                prisma_1.prisma.classRequest.count({ where }),
                prisma_1.prisma.classRequest.findMany({
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
            const formattedItems = items.map((cls) => formatClassRequestResponse(cls));
            return res.json({
                total,
                page: Number(page),
                limit: take,
                totalPages: Math.ceil(total / take),
                data: formattedItems,
            });
        }
        catch (error) {
            console.error('Error fetching open classes:', error);
            return res.status(500).json({ message: 'Lỗi khi lấy danh sách lớp chưa giao.', error: error.message });
        }
    },
    // 3. Lấy chi tiết 1 lớp học
    async getDetail(req, res) {
        try {
            const id = String(req.params.id || '').trim();
            const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
            const isUuid = uuidRegex.test(id);
            let classRequest = await prisma_1.prisma.classRequest.findFirst({
                where: isUuid
                    ? { OR: [{ request_id: id }, { class_code: id }] }
                    : { class_code: id },
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
                    payments: true,
                },
            });
            if (!classRequest) {
                const offlineClass = await prisma_1.prisma.offlineClass.findFirst({
                    where: isUuid
                        ? { OR: [{ class_id: id }, { class_offline_code: id }] }
                        : { class_offline_code: id },
                    include: {
                        tutor: { select: { tutor_id: true, full_name: true, phone: true, avatar_url: true } },
                        student: { select: { student_id: true, full_name: true, phone: true } },
                        payments: true,
                        refund_tickets: true,
                    },
                });
                if (offlineClass) {
                    return res.json({
                        data: {
                            ...formatClassRequestResponse(offlineClass),
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
            return res.json({
                data: {
                    ...formatClassRequestResponse(classRequest),
                    is_active_offline_class: false,
                    applications: classRequest.applications,
                    payments: classRequest.payments,
                },
            });
        }
        catch (error) {
            console.error('Error fetching class detail:', error);
            return res.status(500).json({ message: 'Lỗi khi lấy chi tiết lớp học.', error: error.message });
        }
    },
    // 4. Gia sư đăng ký ứng tuyển nhận lớp
    async apply(req, res) {
        try {
            const id = String(req.params.id || '').trim();
            const { applicant_phone, available_date, available_from, notes } = req.body;
            const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
            const isUuid = uuidRegex.test(id);
            const classRequest = await prisma_1.prisma.classRequest.findFirst({
                where: isUuid
                    ? { OR: [{ request_id: id }, { class_code: id }] }
                    : { class_code: id },
            });
            if (!classRequest) {
                return res.status(404).json({ message: 'Lớp học không tồn tại.' });
            }
            if (classRequest.status !== 'OPEN') {
                return res.status(400).json({ message: 'Lớp học này hiện không ở trạng thái mở ứng tuyển (OPEN).' });
            }
            const user = req.user;
            if (!user) {
                return res.status(401).json({ message: 'Vui lòng đăng nhập tài khoản Gia sư để ứng tuyển.' });
            }
            if (user.role !== 'tutor') {
                return res.status(403).json({ message: 'Chỉ tài khoản Gia sư mới có thể đăng ký nhận lớp dạy.' });
            }
            const tutorProfile = await prisma_1.prisma.tutorProfile.findUnique({
                where: { user_id: user.user_id },
            });
            const dateVal = available_from || available_date;
            const finalPhone = applicant_phone || tutorProfile?.phone || user.email || 'Chưa cập nhật SĐT';
            let validAvailableFrom = null;
            let finalNotes = notes || null;
            if (dateVal) {
                const parsed = new Date(dateVal);
                if (!isNaN(parsed.getTime())) {
                    validAvailableFrom = parsed;
                }
                else {
                    finalNotes = notes ? `[Thời gian nhận: ${dateVal}] ${notes}` : `[Thời gian nhận: ${dateVal}]`;
                }
            }
            const application = await prisma_1.prisma.classApplication.create({
                data: {
                    class_request_id: classRequest.request_id,
                    tutor_id: tutorProfile?.tutor_id || null,
                    applicant_phone: finalPhone,
                    available_from: validAvailableFrom,
                    notes: finalNotes,
                    status: 'PENDING',
                },
            });
            return res.status(201).json({
                message: 'Đăng ký ứng tuyển thành công! Trung tâm sẽ xem xét và giao lớp.',
                data: application,
            });
        }
        catch (error) {
            console.error('Error applying for class:', error);
            return res.status(500).json({ message: 'Lỗi khi đăng ký nhận lớp.', error: error.message });
        }
    },
    // 5. Admin Lấy danh sách bài yêu cầu
    async adminGetAll(req, res) {
        try {
            const { status, search, page = 1, limit = 50 } = req.query;
            const where = {};
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
                prisma_1.prisma.classRequest.count({ where }),
                prisma_1.prisma.classRequest.findMany({
                    where,
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
            const formattedItems = items.map((cls) => formatClassRequestResponse(cls));
            return res.json({
                total,
                page: Number(page),
                limit: take,
                totalPages: Math.ceil(total / take),
                data: formattedItems,
            });
        }
        catch (error) {
            console.error('Error admin get class requests:', error);
            return res.status(500).json({ message: 'Lỗi khi lấy danh sách yêu cầu lớp phía Admin.', error: error.message });
        }
    },
    // 6. Admin Duyệt mở lớp công khai (PENDING_ADMIN -> OPEN)
    async adminApproveOpen(req, res) {
        try {
            const id = String(req.params.id || '').trim();
            const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
            const isUuid = uuidRegex.test(id);
            const existingClass = await prisma_1.prisma.classRequest.findFirst({
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
            const updated = await prisma_1.prisma.classRequest.update({
                where: { request_id: existingClass.request_id },
                data: { status: 'OPEN' },
            });
            return res.json({
                message: 'Đã duyệt mở lớp công khai (OPEN) thành công!',
                data: formatClassRequestResponse(updated),
            });
        }
        catch (error) {
            console.error('Error admin approving class:', error);
            return res.status(500).json({ message: 'Lỗi khi duyệt mở lớp.', error: error.message });
        }
    },
    // 7. Admin Duyệt chọn Gia sư nhận lớp -> Giao lớp (chuyển sang WAITING_PAYMENT và TẠO 2 NGHĨA VỤ ESCROW PAYMENT)
    async adminAssignTutor(req, res) {
        try {
            const id = String(req.params.id || '').trim();
            const { tutor_id, tutor_code, application_id } = req.body;
            const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
            const isUuid = uuidRegex.test(id);
            const existingClass = await prisma_1.prisma.classRequest.findFirst({
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
            let selectedTutorProfile = null;
            if (tutor_id) {
                selectedTutorProfile = await prisma_1.prisma.tutorProfile.findUnique({ where: { tutor_id } });
            }
            else if (tutor_code) {
                selectedTutorProfile = await prisma_1.prisma.tutorProfile.findFirst({ where: { tutor_code: String(tutor_code).trim() } });
            }
            else if (application_id) {
                const app = await prisma_1.prisma.classApplication.findUnique({ where: { application_id } });
                if (app && app.tutor_id) {
                    selectedTutorProfile = await prisma_1.prisma.tutorProfile.findUnique({ where: { tutor_id: app.tutor_id } });
                }
            }
            if (!selectedTutorProfile) {
                return res.status(400).json({ message: 'Vui lòng chọn thông tin Gia sư hợp lệ để giao lớp.' });
            }
            let studentUserId = existingClass.student?.user_id || null;
            if (!studentUserId && existingClass.student_id) {
                const studentProfile = await prisma_1.prisma.studentProfile.findUnique({
                    where: { student_id: existingClass.student_id },
                    select: { user_id: true },
                });
                studentUserId = studentProfile?.user_id || null;
            }
            if (!studentUserId && existingClass.email) {
                const userByEmail = await prisma_1.prisma.user.findFirst({
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
            const [updatedClass] = await prisma_1.prisma.$transaction([
                prisma_1.prisma.classRequest.update({
                    where: { request_id: existingClass.request_id },
                    data: {
                        status: 'WAITING_PAYMENT',
                        selected_tutor_code: selectedTutorProfile.tutor_code,
                    },
                }),
                ...(application_id
                    ? [
                        prisma_1.prisma.classApplication.update({
                            where: { application_id },
                            data: { status: 'APPROVED' },
                        }),
                        prisma_1.prisma.classApplication.updateMany({
                            where: {
                                class_request_id: existingClass.request_id,
                                application_id: { not: application_id },
                            },
                            data: { status: 'REJECTED' },
                        }),
                    ]
                    : []),
                prisma_1.prisma.offlineClassPayment.create({
                    data: {
                        class_request_id: existingClass.request_id,
                        payer_user_id: studentUserId,
                        type: 'STUDENT_TUITION',
                        status: 'PENDING',
                        required_amount: salary,
                    },
                }),
                prisma_1.prisma.offlineClassPayment.create({
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
        }
        catch (error) {
            console.error('Error assigning tutor:', error);
            return res.status(500).json({ message: 'Lỗi khi giao lớp cho gia sư.', error: error.message });
        }
    },
    // 8. Gia sư thanh toán phí nhận lớp escrow (TUTOR_PLACEMENT_FEE)
    async payCommission(req, res) {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({ message: 'Vui lòng đăng nhập tài khoản Gia sư.' });
            }
            const id = String(req.params.id || '').trim();
            const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
            const isUuid = uuidRegex.test(id);
            const classRequest = await prisma_1.prisma.classRequest.findFirst({
                where: isUuid
                    ? { OR: [{ request_id: id }, { class_code: id }] }
                    : { class_code: id },
                include: { subject: { select: { name: true } } },
            });
            if (!classRequest) {
                return res.status(404).json({ message: 'Không tìm thấy thông tin lớp học.' });
            }
            let paymentRecord = await prisma_1.prisma.offlineClassPayment.findFirst({
                where: {
                    class_request_id: classRequest.request_id,
                    type: 'TUTOR_PLACEMENT_FEE',
                    status: 'PENDING',
                },
            });
            if (!paymentRecord) {
                const requiredAmount = Number(classRequest.class_salary || 0) * 0.35;
                paymentRecord = await prisma_1.prisma.offlineClassPayment.create({
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
            const tutorWallet = await prisma_1.prisma.wallet.findUnique({
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
            const [transaction] = await prisma_1.prisma.$transaction([
                prisma_1.prisma.transaction.create({
                    data: {
                        user_id: user.user_id,
                        amount: feeAmount,
                        payment_method: 'wallet',
                        description: `Phí nhận lớp escrow MS:${classRequest.class_code} — ${subjectName}`,
                        status: 'success',
                        paid_at: new Date(),
                    },
                }),
                prisma_1.prisma.wallet.update({
                    where: { user_id: user.user_id },
                    data: { balance: { decrement: feeAmount }, updated_at: new Date() },
                }),
            ]);
            await prisma_1.prisma.offlineClassPayment.update({
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
        }
        catch (error) {
            console.error('Error in payCommission:', error);
            return res.status(500).json({ message: 'Lỗi khi thanh toán phí nhận lớp.', error: error.message });
        }
    },
    // 9. Học viên thanh toán học phí tháng đầu escrow (STUDENT_TUITION)
    async payStudentTuition(req, res) {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({ message: 'Vui lòng đăng nhập tài khoản Học viên.' });
            }
            const id = String(req.params.id || '').trim();
            const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
            const isUuid = uuidRegex.test(id);
            const classRequest = await prisma_1.prisma.classRequest.findFirst({
                where: isUuid
                    ? { OR: [{ request_id: id }, { class_code: id }] }
                    : { class_code: id },
                include: { subject: { select: { name: true } } },
            });
            if (!classRequest) {
                return res.status(404).json({ message: 'Không tìm thấy thông tin lớp học.' });
            }
            let paymentRecord = await prisma_1.prisma.offlineClassPayment.findFirst({
                where: {
                    class_request_id: classRequest.request_id,
                    type: 'STUDENT_TUITION',
                    status: 'PENDING',
                },
            });
            if (!paymentRecord) {
                const requiredAmount = Number(classRequest.class_salary || 0);
                paymentRecord = await prisma_1.prisma.offlineClassPayment.create({
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
            const studentWallet = await prisma_1.prisma.wallet.upsert({
                where: { user_id: user.user_id },
                create: { user_id: user.user_id, balance: tuitionAmount },
                update: {},
            });
            const currentBalance = Number(studentWallet.balance);
            if (currentBalance < tuitionAmount) {
                await prisma_1.prisma.wallet.update({
                    where: { user_id: user.user_id },
                    data: { balance: { increment: tuitionAmount - currentBalance + 100000 } },
                });
            }
            const subjectName = classRequest.subject?.name || 'Lớp Offline';
            const [transaction] = await prisma_1.prisma.$transaction([
                prisma_1.prisma.transaction.create({
                    data: {
                        user_id: user.user_id,
                        amount: tuitionAmount,
                        payment_method: 'wallet',
                        description: `Học phí tháng đầu escrow MS:${classRequest.class_code} — ${subjectName}`,
                        status: 'success',
                        paid_at: new Date(),
                    },
                }),
                prisma_1.prisma.wallet.update({
                    where: { user_id: user.user_id },
                    data: { balance: { decrement: tuitionAmount }, updated_at: new Date() },
                }),
            ]);
            await prisma_1.prisma.offlineClassPayment.update({
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
        }
        catch (error) {
            console.error('Error in payStudentTuition:', error);
            return res.status(500).json({ message: 'Lỗi khi thanh toán học phí.', error: error.message });
        }
    },
    // 10. Xử lý Trễ hạn đóng tiền Escrow
    async handleEscrowExpiration(req, res) {
        try {
            const id = String(req.params.id || '').trim();
            const { fault_party } = req.body;
            const classRequest = await prisma_1.prisma.classRequest.findUnique({
                where: { request_id: id },
                include: { payments: true },
            });
            if (!classRequest) {
                return res.status(404).json({ message: 'Không tìm thấy lớp học.' });
            }
            const payments = classRequest.payments || [];
            const studentPayment = payments.find((p) => p.type === 'STUDENT_TUITION');
            const tutorPayment = payments.find((p) => p.type === 'TUTOR_PLACEMENT_FEE');
            if (fault_party === 'STUDENT') {
                if (studentPayment) {
                    await prisma_1.prisma.offlineClassPayment.update({
                        where: { payment_id: studentPayment.payment_id },
                        data: { status: 'EXPIRED' },
                    });
                }
                if (tutorPayment && tutorPayment.status === 'PAID') {
                    const refundAmt = Number(tutorPayment.paid_amount);
                    await prisma_1.prisma.offlineClassPayment.update({
                        where: { payment_id: tutorPayment.payment_id },
                        data: { status: 'REFUNDED', refunded_amount: refundAmt, refunded_at: new Date() },
                    });
                    await prisma_1.prisma.wallet.update({
                        where: { user_id: tutorPayment.payer_user_id },
                        data: { balance: { increment: refundAmt } },
                    });
                }
                const updated = await prisma_1.prisma.classRequest.update({
                    where: { request_id: id },
                    data: { status: 'EXPIRED' },
                });
                return res.json({ message: 'Đã xử lý trễ hạn phía Học viên. Lớp chuyển sang EXPIRED đóng vĩnh viễn.', data: updated });
            }
            else {
                if (tutorPayment) {
                    await prisma_1.prisma.offlineClassPayment.update({
                        where: { payment_id: tutorPayment.payment_id },
                        data: { status: 'EXPIRED' },
                    });
                }
                if (studentPayment && studentPayment.status === 'PAID') {
                    const refundAmt = Number(studentPayment.paid_amount);
                    await prisma_1.prisma.offlineClassPayment.update({
                        where: { payment_id: studentPayment.payment_id },
                        data: { status: 'REFUNDED', refunded_amount: refundAmt, refunded_at: new Date() },
                    });
                    await prisma_1.prisma.wallet.update({
                        where: { user_id: studentPayment.payer_user_id },
                        data: { balance: { increment: refundAmt } },
                    });
                }
                await prisma_1.prisma.classApplication.updateMany({
                    where: { class_request_id: id, status: 'APPROVED' },
                    data: { status: 'EXPIRED' },
                });
                const updated = await prisma_1.prisma.classRequest.update({
                    where: { request_id: id },
                    data: { status: 'OPEN', selected_tutor_code: null },
                });
                return res.json({ message: 'Đã xử lý trễ hạn phía Gia sư. Lớp quay lại trạng thái OPEN để tuyển gia sư khác.', data: updated });
            }
        }
        catch (error) {
            console.error('Error handling escrow expiration:', error);
            return res.status(500).json({ message: 'Lỗi khi xử lý trễ hạn đóng phí.', error: error.message });
        }
    },
    // 11. Học viên lấy danh sách các lớp của mình
    async getMyRequests(req, res) {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({ message: 'Vui lòng đăng nhập.' });
            }
            const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
            let studentProfile = null;
            if (user.user_id && uuidRegex.test(String(user.user_id))) {
                studentProfile = await prisma_1.prisma.studentProfile.findUnique({
                    where: { user_id: user.user_id },
                });
            }
            const matchCriteria = [];
            if (user.email)
                matchCriteria.push({ email: { equals: user.email, mode: 'insensitive' } });
            if (studentProfile?.phone)
                matchCriteria.push({ phone: studentProfile.phone });
            if (studentProfile && matchCriteria.length > 0) {
                await prisma_1.prisma.classRequest.updateMany({
                    where: { student_id: null, OR: matchCriteria },
                    data: { student_id: studentProfile.student_id },
                });
            }
            const whereConditions = [];
            if (studentProfile)
                whereConditions.push({ student_id: studentProfile.student_id });
            if (user.email)
                whereConditions.push({ email: { equals: user.email, mode: 'insensitive' } });
            const requests = whereConditions.length > 0
                ? await prisma_1.prisma.classRequest.findMany({
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
                ? await prisma_1.prisma.offlineClass.findMany({
                    where: { student_id: studentProfile.student_id },
                    orderBy: { created_at: 'desc' },
                    include: {
                        tutor: { select: { full_name: true, phone: true, avatar_url: true } },
                        payments: true,
                        refund_tickets: true,
                    },
                })
                : [];
            const formattedRequests = requests.map((cls) => ({
                ...formatClassRequestResponse(cls),
                is_active_offline_class: false,
            }));
            const formattedOfflineClasses = offlineClasses.map((cls) => ({
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
        }
        catch (error) {
            console.error('Error fetching my class requests:', error);
            return res.status(500).json({ message: 'Lỗi khi lấy danh sách lớp yêu cầu của học viên.', error: error.message });
        }
    },
    // 12. Học viên cập nhật yêu cầu
    async updateMyRequest(req, res) {
        try {
            const user = req.user;
            if (!user)
                return res.status(401).json({ message: 'Vui lòng đăng nhập.' });
            const id = String(req.params.id || '').trim();
            const { desired_price, class_salary, status } = req.body;
            const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
            const isUuid = uuidRegex.test(id);
            const existing = await prisma_1.prisma.classRequest.findFirst({
                where: isUuid ? { OR: [{ request_id: id }, { class_code: id }] } : { class_code: id },
            });
            if (!existing)
                return res.status(404).json({ message: 'Không tìm thấy yêu cầu lớp học.' });
            const updateData = {};
            const priceInput = class_salary !== undefined ? class_salary : desired_price;
            if (priceInput !== undefined && priceInput !== null) {
                updateData.class_salary = typeof priceInput === 'number' ? priceInput : Number(String(priceInput || 0).replace(/[^0-9.]/g, '')) || 0;
            }
            if (status && ['CANCELLED', 'OPEN', 'PENDING_ADMIN'].includes(status)) {
                updateData.status = status;
            }
            const updated = await prisma_1.prisma.classRequest.update({
                where: { request_id: existing.request_id },
                data: updateData,
                include: { subject: { select: { name: true } } },
            });
            return res.json({
                message: 'Cập nhật thông tin lớp yêu cầu thành công!',
                data: formatClassRequestResponse(updated),
            });
        }
        catch (error) {
            console.error('Error updating my class request:', error);
            return res.status(500).json({ message: 'Lỗi khi cập nhật yêu cầu lớp học.', error: error.message });
        }
    },
    // 13. Gia sư lấy danh sách lớp liên quan
    async getTutorClasses(req, res) {
        try {
            const user = req.user;
            if (!user)
                return res.status(401).json({ message: 'Vui lòng đăng nhập tài khoản Gia sư.' });
            const tutorProfile = await prisma_1.prisma.tutorProfile.findUnique({
                where: { user_id: user.user_id },
            });
            if (!tutorProfile)
                return res.json({ data: [] });
            const tutorCode = tutorProfile.tutor_code ? String(tutorProfile.tutor_code).trim() : null;
            const tutorPhone = tutorProfile.phone ? String(tutorProfile.phone).trim() : null;
            const matchOrConditions = [
                { applications: { some: { tutor_id: tutorProfile.tutor_id } } },
            ];
            if (tutorCode)
                matchOrConditions.push({ selected_tutor_code: { equals: tutorCode, mode: 'insensitive' } });
            if (tutorPhone)
                matchOrConditions.push({ selected_tutor_code: { equals: tutorPhone, mode: 'insensitive' } });
            const [requests, offlineClasses] = await Promise.all([
                prisma_1.prisma.classRequest.findMany({
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
                prisma_1.prisma.offlineClass.findMany({
                    where: { tutor_id: tutorProfile.tutor_id },
                    orderBy: { created_at: 'desc' },
                    include: {
                        payments: true,
                        refund_tickets: true,
                    },
                }),
            ]);
            const formattedRequests = requests.map((cls) => {
                const myApp = cls.applications && cls.applications.length > 0 ? cls.applications[0] : null;
                const selCode = cls.selected_tutor_code ? String(cls.selected_tutor_code).trim().toLowerCase() : '';
                const isDirectedToMe = selCode !== '' && ((tutorCode && selCode.includes(tutorCode.toLowerCase())) ||
                    (tutorPhone && selCode.includes(tutorPhone.toLowerCase())));
                const payments = cls.payments || [];
                const tutorPayment = payments.find((p) => p.type === 'TUTOR_PLACEMENT_FEE');
                return {
                    ...formatClassRequestResponse(cls),
                    is_active_offline_class: false,
                    is_directed_to_me: !!isDirectedToMe,
                    is_assigned_to_me: cls.status === 'WAITING_PAYMENT' && (myApp?.status === 'APPROVED' || isDirectedToMe),
                    my_application_status: myApp ? myApp.status : null,
                    tutor_payment_status: tutorPayment?.status || 'PENDING',
                    fee_amount: tutorPayment ? Number(tutorPayment.required_amount) : Number(cls.class_salary) * 0.35,
                };
            });
            const formattedOfflineClasses = offlineClasses.map((cls) => ({
                ...formatClassRequestResponse(cls),
                is_active_offline_class: true,
                is_directed_to_me: true,
                is_assigned_to_me: true,
                payments: cls.payments,
                refund_tickets: cls.refund_tickets,
            }));
            return res.json({ data: [...formattedRequests, ...formattedOfflineClasses] });
        }
        catch (error) {
            console.error('Error fetching tutor classes:', error);
            return res.status(500).json({ message: 'Lỗi khi lấy danh sách lớp học của gia sư.', error: error.message });
        }
    },
    // 14. Admin Chỉnh sửa thông tin Lớp yêu cầu
    async adminUpdateClassRequest(req, res) {
        try {
            const id = String(req.params.id || '').trim();
            const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
            const isUuid = uuidRegex.test(id);
            const existingClass = await prisma_1.prisma.classRequest.findFirst({
                where: isUuid ? { OR: [{ request_id: id }, { class_code: id }] } : { class_code: id },
            });
            if (!existingClass)
                return res.status(404).json({ message: 'Không tìm thấy lớp học.' });
            const { student_name, phone, email, address_detail, district, province, grade_level, grade_id: input_grade_id, subject_name, subject_id: input_subject_id, num_students, academic_level, sessions_per_week, study_time, tutor_requirement, selected_tutor_code, desired_price, class_salary, other_requirements, status, } = req.body;
            const updateData = {};
            if (student_name !== undefined)
                updateData.student_name = student_name;
            if (phone !== undefined)
                updateData.phone = phone;
            if (email !== undefined)
                updateData.email = email || null;
            if (address_detail !== undefined)
                updateData.address_detail = address_detail;
            if (district !== undefined)
                updateData.district = district || null;
            if (province !== undefined)
                updateData.province = province || null;
            if (num_students !== undefined)
                updateData.num_students = Number(num_students) || 1;
            if (academic_level !== undefined)
                updateData.academic_level = academic_level || null;
            if (sessions_per_week !== undefined)
                updateData.sessions_per_week = Number(sessions_per_week) || 2;
            if (study_time !== undefined)
                updateData.study_time = study_time || null;
            if (tutor_requirement !== undefined)
                updateData.tutor_requirement = tutor_requirement || null;
            if (selected_tutor_code !== undefined)
                updateData.selected_tutor_code = selected_tutor_code || null;
            if (other_requirements !== undefined)
                updateData.other_requirements = other_requirements || null;
            const priceInput = class_salary !== undefined ? class_salary : desired_price;
            if (priceInput !== undefined && priceInput !== null) {
                updateData.class_salary = typeof priceInput === 'number' ? priceInput : Number(String(priceInput || 0).replace(/[^0-9.]/g, '')) || 0;
            }
            if (status !== undefined && status !== null) {
                updateData.status = status;
            }
            const gEnum = mapToGradeLevel(grade_level || input_grade_id);
            if (gEnum)
                updateData.grade_level = gEnum;
            if (input_subject_id !== undefined) {
                updateData.subject_id = input_subject_id || null;
            }
            else if (subject_name) {
                const foundSub = await prisma_1.prisma.subject.findFirst({
                    where: { name: { equals: String(subject_name).trim(), mode: 'insensitive' } },
                });
                if (foundSub)
                    updateData.subject_id = foundSub.subject_id;
            }
            const updatedClass = await prisma_1.prisma.classRequest.update({
                where: { request_id: existingClass.request_id },
                data: updateData,
                include: { subject: { select: { name: true } } },
            });
            return res.json({
                message: 'Cập nhật thông tin lớp học thành công.',
                data: formatClassRequestResponse(updatedClass),
            });
        }
        catch (error) {
            console.error('Error in adminUpdateClassRequest:', error);
            return res.status(500).json({ message: 'Lỗi khi cập nhật thông tin lớp phía Admin.', error: error.message });
        }
    },
};
