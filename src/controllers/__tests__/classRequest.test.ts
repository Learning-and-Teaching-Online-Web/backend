import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Response, Request } from 'express';
import { classRequestController } from '../classRequest.controller';
import { requireApprovedTutor } from '../../middlewares/auth.middleware';

// 1. Mock Prisma hoàn toàn độc lập, không kết nối DB thật
vi.mock('@prisma/client', () => {
  const GradeLevel = {
    grade_1: 'grade_1',
    grade_2: 'grade_2',
    grade_3: 'grade_3',
    grade_4: 'grade_4',
    grade_5: 'grade_5',
    grade_6: 'grade_6',
    grade_7: 'grade_7',
    grade_8: 'grade_8',
    grade_9: 'grade_9',
    grade_10: 'grade_10',
    grade_11: 'grade_11',
    grade_12: 'grade_12',
  };
  return {
    GradeLevel,
    PrismaClient: vi.fn(),
  };
});

vi.mock('../../config/prisma', () => {
  const mockPrisma: any = {
    classRequest: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    tutorProfile: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    studentProfile: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    subject: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    classApplication: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    offlineClass: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    offlineClassPayment: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
    wallet: {
      upsert: vi.fn(),
    },
    transaction: {
      create: vi.fn(),
    },
    $transaction: vi.fn().mockImplementation(async (arg: any) => {
      if (typeof arg === 'function') {
        return arg(mockPrisma);
      }
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      return arg;
    }),
  };
  return { prisma: mockPrisma };
});

import { prisma } from '../../config/prisma';

// Helper tạo mock Response
function createMockResponse() {
  const res: Partial<Response> & { _status?: number; _json?: any } = {};
  res.status = vi.fn().mockImplementation((status: number) => {
    res._status = status;
    return res;
  });
  res.json = vi.fn().mockImplementation((body: any) => {
    res._json = body;
    return res;
  });
  return res as Response & { _status?: number; _json?: any };
}

// Mock ID chuẩn UUID & mã lớp
const MOCK_STUDENT_USER_ID = '11111111-1111-1111-1111-111111111111';
const MOCK_STUDENT_ID = '22222222-2222-2222-2222-222222222222';
const MOCK_TUTOR_A_USER_ID = '33333333-3333-3333-3333-333333333333';
const MOCK_TUTOR_A_ID = '44444444-4444-4444-4444-444444444444';
const MOCK_TUTOR_B_USER_ID = '55555555-5555-5555-5555-555555555555';
const MOCK_ADMIN_USER_ID = '66666666-6666-6666-6666-666666666666';
const MOCK_REQUEST_ID = '77777777-7777-7777-7777-777777777777';
const MOCK_CLASS_CODE = '85432';

describe('[TEST-OFFLINE-P1] Kiểm thử End-to-End Nghiệp vụ Lớp học Offline (Module 12)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // KỊCH BẢN 1: HỌC VIÊN ĐĂNG KÝ MỞ LỚP OFFLINE
  // ===========================================================================
  describe('Kịch bản 1: Học viên đăng ký mở lớp Offline', () => {
    describe('Case 1.1: Đăng ký mở lớp tự do không chỉ định gia sư (POST /api/class-requests)', () => {
      it('Đăng ký hợp lệ -> Trạng thái ban đầu BẮT BUỘC là PENDING_ADMIN, selected_tutor_code là null', async () => {
        const req: Partial<Request> = {
          user: { user_id: MOCK_STUDENT_USER_ID, role: 'student' } as any,
          body: {
            student_name: 'Nguyễn Văn Học Sinh',
            phone: '0901234567',
            email: 'student@vct.edu.vn',
            address_detail: '123 Lê Lợi, Phường Bến Nghé',
            district: 'Quận 1',
            province: 'Hồ Chí Minh',
            grade_level: 'grade_10',
            subject_id: 'sub-toan-uuid',
            sessions_per_week: 2,
            study_time: 'Thứ 2 - Thứ 4: 18h - 19h30',
            class_salary: 500000,
          },
        };
        const res = createMockResponse();

        (prisma.studentProfile.findUnique as any).mockResolvedValue({
          student_id: MOCK_STUDENT_ID,
          user_id: MOCK_STUDENT_USER_ID,
        });

        (prisma.classRequest.create as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          class_code: MOCK_CLASS_CODE,
          student_id: MOCK_STUDENT_ID,
          student_name: 'Nguyễn Văn Học Sinh',
          phone: '0901234567',
          status: 'PENDING_ADMIN',
          selected_tutor_code: null,
          grade_level: 'grade_10',
          class_salary: 500000,
        });

        await classRequestController.create(req as Request, res);

        expect(res._status).toBe(201);
        expect(res._json.data.status).toBe('PENDING_ADMIN');
        expect(res._json.data.selected_tutor_code).toBeNull();
        expect(prisma.classRequest.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              status: 'PENDING_ADMIN',
              selected_tutor_code: null,
            }),
          })
        );
      });

      it('Chặn tài khoản Gia sư (role: tutor) không được phép tạo bài tìm gia sư -> Trả về 403', async () => {
        const req: Partial<Request> = {
          user: { user_id: MOCK_TUTOR_A_USER_ID, role: 'tutor' } as any,
          body: {
            student_name: 'Gia sư test',
            phone: '0909999999',
            address_detail: '123 Test',
          },
        };
        const res = createMockResponse();

        await classRequestController.create(req as Request, res);

        expect(res._status).toBe(403);
        expect(res._json.message).toContain('Tài khoản Gia sư không thể tạo bài tìm gia sư');
      });

      it('Chưa đăng nhập (không có req.user) -> Trả về 401', async () => {
        const req: Partial<Request> = {
          user: undefined,
          body: {
            student_name: 'Nguyễn Văn A',
            phone: '0901234567',
            address_detail: '123 Test',
          },
        };
        const res = createMockResponse();

        await classRequestController.create(req as Request, res);

        expect(res._status).toBe(401);
        expect(res._json.message).toContain('Vui lòng đăng nhập');
      });

      it('Thiếu thông tin bắt buộc (student_name, phone hoặc address_detail) -> Trả về 400', async () => {
        const req: Partial<Request> = {
          user: { user_id: MOCK_STUDENT_USER_ID, role: 'student' } as any,
          body: {
            student_name: '',
            phone: '0901234567',
            address_detail: '123 Lê Lợi',
          },
        };
        const res = createMockResponse();

        await classRequestController.create(req as Request, res);

        expect(res._status).toBe(400);
        expect(res._json.message).toContain('Vui lòng điền đầy đủ các thông tin bắt buộc');
      });
    });

    describe('Case 1.2: Đăng ký mở lớp có chỉ định gia sư yêu thích (POST /api/class-requests)', () => {
      it('Có selected_tutor_code -> Lưu đúng mã gia sư nhưng trạng thái ban đầu VẪN LÀ PENDING_ADMIN (chờ Admin duyệt)', async () => {
        const req: Partial<Request> = {
          user: { user_id: MOCK_STUDENT_USER_ID, role: 'student' } as any,
          body: {
            student_name: 'Trần Thị Học Sinh',
            phone: '0912345678',
            address_detail: '456 Nguyễn Trãi, Quận 5',
            grade_level: 'grade_11',
            class_salary: 600000,
            selected_tutor_code: 'GS-8888',
          },
        };
        const res = createMockResponse();

        (prisma.studentProfile.findUnique as any).mockResolvedValue({
          student_id: MOCK_STUDENT_ID,
          user_id: MOCK_STUDENT_USER_ID,
        });

        (prisma.classRequest.create as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          class_code: '85433',
          student_id: MOCK_STUDENT_ID,
          student_name: 'Trần Thị Học Sinh',
          phone: '0912345678',
          status: 'PENDING_ADMIN',
          selected_tutor_code: 'GS-8888',
          grade_level: 'grade_11',
          class_salary: 600000,
        });

        await classRequestController.create(req as Request, res);

        expect(res._status).toBe(201);
        expect(res._json.data.status).toBe('PENDING_ADMIN');
        expect(res._json.data.selected_tutor_code).toBe('GS-8888');
        expect(prisma.classRequest.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              status: 'PENDING_ADMIN',
              selected_tutor_code: 'GS-8888',
            }),
          })
        );
      });
    });

    describe('Case 1.3: Học viên xem danh sách và cập nhật yêu cầu', () => {
      it('GET /api/class-requests/my-requests -> Trả về danh sách lớp của học viên', async () => {
        const req: Partial<Request> = {
          user: { user_id: MOCK_STUDENT_USER_ID, role: 'student', email: 'student@vct.edu.vn' } as any,
        };
        const res = createMockResponse();

        (prisma.studentProfile.findUnique as any).mockResolvedValue({
          student_id: MOCK_STUDENT_ID,
          user_id: MOCK_STUDENT_USER_ID,
        });

        (prisma.classRequest.findMany as any).mockResolvedValue([
          {
            request_id: MOCK_REQUEST_ID,
            class_code: MOCK_CLASS_CODE,
            status: 'PENDING_ADMIN',
            student_name: 'Nguyễn Văn Học Sinh',
            class_salary: 500000,
          },
        ]);

        (prisma.offlineClass.findMany as any).mockResolvedValue([]);

        await classRequestController.getMyRequests(req as Request, res);

        expect(res._json.data).toBeDefined();
        expect(Array.isArray(res._json.data)).toBe(true);
        expect(res._json.data[0].request_id).toBe(MOCK_REQUEST_ID);
        expect(res._json.data[0].status).toBe('PENDING_ADMIN');
      });

      it('PATCH /api/class-requests/my-requests/:id -> Chủ sở hữu cập nhật thành công', async () => {
        const req: Partial<Request> = {
          user: { user_id: MOCK_STUDENT_USER_ID, role: 'student', email: 'student@vct.edu.vn' } as any,
          params: { id: MOCK_REQUEST_ID },
          body: {
            study_time: 'Thứ 3 - Thứ 5: 19h - 20h30',
            class_salary: 550000,
          },
        };
        const res = createMockResponse();

        (prisma.classRequest.findFirst as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          student_id: MOCK_STUDENT_ID,
          email: 'student@vct.edu.vn',
          status: 'PENDING_ADMIN',
        });

        (prisma.studentProfile.findUnique as any).mockResolvedValue({
          student_id: MOCK_STUDENT_ID,
          user_id: MOCK_STUDENT_USER_ID,
        });

        (prisma.classRequest.update as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          status: 'PENDING_ADMIN',
          study_time: 'Thứ 3 - Thứ 5: 19h - 20h30',
          class_salary: 550000,
        });

        await classRequestController.updateMyRequest(req as Request, res);

        expect(res._json.message).toContain('Cập nhật thông tin lớp yêu cầu thành công');
        expect(prisma.classRequest.update).toHaveBeenCalled();
      });

      it('PATCH /api/class-requests/my-requests/:id -> Không phải chủ sở hữu bị từ chối 403', async () => {
        const req: Partial<Request> = {
          user: { user_id: 'stranger-user-id', role: 'student', email: 'stranger@vct.edu.vn' } as any,
          params: { id: MOCK_REQUEST_ID },
          body: { study_time: 'Giờ khác' },
        };
        const res = createMockResponse();

        (prisma.classRequest.findFirst as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          student_id: MOCK_STUDENT_ID,
          email: 'student@vct.edu.vn',
          status: 'PENDING_ADMIN',
        });

        (prisma.studentProfile.findUnique as any).mockResolvedValue({
          student_id: 'stranger-profile-id',
          user_id: 'stranger-user-id',
        });

        await classRequestController.updateMyRequest(req as Request, res);

        expect(res._status).toBe(403);
        expect(res._json.message).toContain('Bạn không có quyền');
      });
    });
  });

  // ===========================================================================
  // KỊCH BẢN 2: ADMIN KIỂM DUYỆT & MỞ LỚP
  // ===========================================================================
  describe('Kịch bản 2: Admin kiểm duyệt & Mở lớp', () => {
    describe('Case 2.1: Admin xem danh sách tất cả yêu cầu mở lớp (GET /api/admin/class-requests)', () => {
      it('Trả về danh sách yêu cầu mở lớp kèm phân trang', async () => {
        const req: Partial<Request> = {
          query: { status: 'PENDING_ADMIN', page: '1', limit: '10' },
        };
        const res = createMockResponse();

        (prisma.classRequest.count as any).mockResolvedValue(1);
        (prisma.classRequest.findMany as any).mockResolvedValue([
          {
            request_id: MOCK_REQUEST_ID,
            class_code: MOCK_CLASS_CODE,
            status: 'PENDING_ADMIN',
            student_name: 'Nguyễn Văn Học Sinh',
            subject: { name: 'Toán học' },
          },
        ]);

        await classRequestController.adminGetAll(req as Request, res);

        expect(res._json.total).toBe(1);
        expect(res._json.page).toBe(1);
        expect(res._json.data).toHaveLength(1);
        expect(res._json.data[0].status).toBe('PENDING_ADMIN');
      });
    });

    describe('Case 2.2: Admin duyệt mở lớp công khai (PATCH /api/admin/class-requests/:id/approve-open)', () => {
      it('Duyệt lớp tự do (không chỉ định gia sư) -> Trạng thái chuyển thành OPEN', async () => {
        const req: Partial<Request> = {
          params: { id: MOCK_REQUEST_ID },
        };
        const res = createMockResponse();

        (prisma.classRequest.findFirst as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          class_code: MOCK_CLASS_CODE,
          status: 'PENDING_ADMIN',
          selected_tutor_code: null,
        });

        (prisma.classRequest.update as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          class_code: MOCK_CLASS_CODE,
          status: 'OPEN',
          selected_tutor_code: null,
        });

        await classRequestController.adminApproveOpen(req as Request, res);

        expect(res._json.message).toContain('Đã duyệt mở lớp công khai (OPEN) thành công');
        expect(res._json.data.status).toBe('OPEN');
        expect(prisma.classRequest.update).toHaveBeenCalledWith({
          where: { request_id: MOCK_REQUEST_ID },
          data: { status: 'OPEN' },
        });
      });

      it('Duyệt lớp có chỉ định gia sư hợp lệ -> Trạng thái chuyển thành WAITING_TUTOR_CONFIRM', async () => {
        const req: Partial<Request> = {
          params: { id: MOCK_REQUEST_ID },
        };
        const res = createMockResponse();

        (prisma.classRequest.findFirst as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          class_code: MOCK_CLASS_CODE,
          status: 'PENDING_ADMIN',
          selected_tutor_code: 'GS-001',
        });

        (prisma.tutorProfile.findFirst as any).mockResolvedValue({
          tutor_id: MOCK_TUTOR_A_ID,
          tutor_code: 'GS-001',
        });

        (prisma.classRequest.update as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          status: 'WAITING_TUTOR_CONFIRM',
          selected_tutor_code: 'GS-001',
        });

        await classRequestController.adminApproveOpen(req as Request, res);

        expect(res._json.message).toContain('gửi lời mời trực tiếp đến Gia sư');
        expect(res._json.data.status).toBe('WAITING_TUTOR_CONFIRM');
      });

      it('Lớp không tồn tại -> Trả về lỗi 404', async () => {
        const req: Partial<Request> = {
          params: { id: 'non-existing-id' },
        };
        const res = createMockResponse();

        (prisma.classRequest.findFirst as any).mockResolvedValue(null);

        await classRequestController.adminApproveOpen(req as Request, res);

        expect(res._status).toBe(404);
        expect(res._json.message).toContain('Không tìm thấy lớp học');
      });
    });

    describe('Case 2.3: Admin từ chối yêu cầu mở lớp (PATCH /api/admin/class-requests/:id/reject)', () => {
      it('Từ chối thành công kèm lý do -> Trạng thái chuyển thành REJECTED', async () => {
        const req: Partial<Request> = {
          params: { id: MOCK_REQUEST_ID },
          body: { admin_note: 'Địa chỉ nhà không rõ ràng, yêu cầu cập nhật lại' },
        };
        const res = createMockResponse();

        (prisma.classRequest.findFirst as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          status: 'PENDING_ADMIN',
        });

        (prisma.classRequest.update as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          status: 'REJECTED',
          admin_note: 'Địa chỉ nhà không rõ ràng, yêu cầu cập nhật lại',
        });

        await classRequestController.adminRejectClass(req as Request, res);

        expect(res._json.message).toContain('Đã từ chối bài đăng tìm gia sư thành công');
        expect(res._json.data.status).toBe('REJECTED');
        expect(prisma.classRequest.update).toHaveBeenCalledWith({
          where: { request_id: MOCK_REQUEST_ID },
          data: {
            status: 'REJECTED',
            admin_note: 'Địa chỉ nhà không rõ ràng, yêu cầu cập nhật lại',
          },
        });
      });

      it('Lớp đã ở trạng thái CANCELLED/EXPIRED/REJECTED -> Không cho từ chối lại (400)', async () => {
        const req: Partial<Request> = {
          params: { id: MOCK_REQUEST_ID },
          body: { admin_note: 'Lý do' },
        };
        const res = createMockResponse();

        (prisma.classRequest.findFirst as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          status: 'REJECTED',
        });

        await classRequestController.adminRejectClass(req as Request, res);

        expect(res._status).toBe(400);
        expect(res._json.message).toContain('không thể từ chối');
      });
    });
  });

  // ===========================================================================
  // KỊCH BẢN 3: GIA SƯ XEM LỚP, ỨNG TUYỂN & PHẢN HỒI LỜI MỜI
  // ===========================================================================
  describe('Kịch bản 3: Gia sư xem lớp, ứng tuyển & Phản hồi lời mời', () => {
    describe('Case 3.1: Gia sư xem danh sách lớp mở và chi tiết lớp', () => {
      it('GET /api/class-requests/open -> Chỉ trả về các lớp có status OPEN', async () => {
        const req: Partial<Request> = {
          query: {},
        };
        const res = createMockResponse();

        (prisma.classRequest.count as any).mockResolvedValue(1);
        (prisma.classRequest.findMany as any).mockResolvedValue([
          {
            request_id: MOCK_REQUEST_ID,
            class_code: MOCK_CLASS_CODE,
            status: 'OPEN',
            student_name: 'Nguyễn Văn Học Sinh',
          },
        ]);

        await classRequestController.getOpenClasses(req as Request, res);

        expect(res._json.data).toHaveLength(1);
        expect(res._json.data[0].status).toBe('OPEN');
        expect(prisma.classRequest.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ status: 'OPEN' }),
          })
        );
      });

      it('GET /api/class-requests/:id -> Trả về chi tiết lớp học', async () => {
        const req: Partial<Request> = {
          params: { id: MOCK_REQUEST_ID },
        };
        const res = createMockResponse();

        (prisma.classRequest.findFirst as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          class_code: MOCK_CLASS_CODE,
          status: 'OPEN',
          student_name: 'Nguyễn Văn Học Sinh',
          applications: [],
          payments: [],
        });

        await classRequestController.getDetail(req as Request, res);

        expect(res._json.data).toBeDefined();
        expect(res._json.data.code).toBe(MOCK_CLASS_CODE);
        expect(res._json.data.status).toBe('OPEN');
      });
    });

    describe('Case 3.2: Gia sư ứng tuyển lớp (POST /api/class-requests/:id/apply)', () => {
      it('Gia sư hợp lệ ứng tuyển -> Tạo ClassApplication thành công với status PENDING', async () => {
        const req: Partial<Request> = {
          user: { user_id: MOCK_TUTOR_A_USER_ID, role: 'tutor' } as any,
          params: { id: MOCK_REQUEST_ID },
          body: {
            applicant_phone: '0987654321',
            available_from: '2026-12-01T08:00:00.000Z',
            notes: 'Gia sư có kinh nghiệm 3 năm luyện thi',
          },
        };
        const res = createMockResponse();

        (prisma.classRequest.findFirst as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          status: 'OPEN',
        });

        (prisma.tutorProfile.findUnique as any).mockResolvedValue({
          tutor_id: MOCK_TUTOR_A_ID,
          user_id: MOCK_TUTOR_A_USER_ID,
          phone: '0987654321',
        });

        (prisma.classApplication.create as any).mockResolvedValue({
          application_id: 'app-uuid-1111',
          class_request_id: MOCK_REQUEST_ID,
          tutor_id: MOCK_TUTOR_A_ID,
          status: 'PENDING',
        });

        await classRequestController.apply(req as Request, res);

        expect(res._status).toBe(201);
        expect(res._json.message).toContain('Đăng ký ứng tuyển thành công');
        expect(res._json.data.status).toBe('PENDING');
        expect(prisma.classApplication.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            class_request_id: MOCK_REQUEST_ID,
            tutor_id: MOCK_TUTOR_A_ID,
            status: 'PENDING',
          }),
        });
      });

      it('Lớp không ở trạng thái OPEN -> Bị từ chối 400', async () => {
        const req: Partial<Request> = {
          user: { user_id: MOCK_TUTOR_A_USER_ID, role: 'tutor' } as any,
          params: { id: MOCK_REQUEST_ID },
          body: { available_from: '2026-12-01' },
        };
        const res = createMockResponse();

        (prisma.classRequest.findFirst as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          status: 'WAITING_PAYMENT',
        });

        await classRequestController.apply(req as Request, res);

        expect(res._status).toBe(400);
        expect(res._json.message).toContain('không ở trạng thái mở ứng tuyển (OPEN)');
      });

      it('Thiếu ngày có thể nhận lớp (available_date/available_from) -> Trả về 400', async () => {
        const req: Partial<Request> = {
          user: { user_id: MOCK_TUTOR_A_USER_ID, role: 'tutor' } as any,
          params: { id: MOCK_REQUEST_ID },
          body: { notes: 'Không gửi ngày' },
        };
        const res = createMockResponse();

        (prisma.classRequest.findFirst as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          status: 'OPEN',
        });

        (prisma.tutorProfile.findUnique as any).mockResolvedValue({
          tutor_id: MOCK_TUTOR_A_ID,
          user_id: MOCK_TUTOR_A_USER_ID,
        });

        await classRequestController.apply(req as Request, res);

        expect(res._status).toBe(400);
        expect(res._json.message).toContain('Vui lòng chọn thời gian có thể nhận lớp hợp lệ');
      });
    });

    describe('Kiểm tra Middleware requireApprovedTutor (Bảo vệ ứng tuyển & phản hồi)', () => {
      it('Gia sư đã duyệt (verified_status: approved) -> Được phép đi tiếp (next được gọi)', async () => {
        const req: Partial<Request> = {
          user: { user_id: MOCK_TUTOR_A_USER_ID, role: 'tutor' } as any,
        };
        const res = createMockResponse();
        const next = vi.fn();

        (prisma.tutorProfile.findUnique as any).mockResolvedValue({
          tutor_id: MOCK_TUTOR_A_ID,
          user_id: MOCK_TUTOR_A_USER_ID,
          verified_status: 'approved',
        });

        await requireApprovedTutor(req as Request, res, next);

        expect(next).toHaveBeenCalled();
        expect(res._status).toBeUndefined();
      });

      it('Gia sư chưa duyệt (verified_status: pending) -> Bị chặn 403 Forbidden', async () => {
        const req: Partial<Request> = {
          user: { user_id: MOCK_TUTOR_B_USER_ID, role: 'tutor' } as any,
        };
        const res = createMockResponse();
        const next = vi.fn();

        (prisma.tutorProfile.findUnique as any).mockResolvedValue({
          tutor_id: 'tutor-b-profile-id',
          user_id: MOCK_TUTOR_B_USER_ID,
          verified_status: 'pending',
        });

        await requireApprovedTutor(req as Request, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res._status).toBe(403);
        expect(res._json.error).toContain('Hồ sơ gia sư của bạn chưa được duyệt');
      });

      it('User không phải role Gia sư (role: student) -> Bị chặn 403 Forbidden', async () => {
        const req: Partial<Request> = {
          user: { user_id: MOCK_STUDENT_USER_ID, role: 'student' } as any,
        };
        const res = createMockResponse();
        const next = vi.fn();

        await requireApprovedTutor(req as Request, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res._status).toBe(403);
        expect(res._json.error).toContain('Yêu cầu quyền Gia sư hoặc Admin');
      });
    });

    describe('Case 3.3: Gia sư phản hồi lời mời trực tiếp (PATCH /api/class-requests/tutor-respond/:id)', () => {
      it('Gia sư chọn ACCEPT -> Chuyển lớp sang WAITING_PAYMENT và tạo 2 nghĩa vụ Escrow Payment', async () => {
        const req: Partial<Request> = {
          user: { user_id: MOCK_TUTOR_A_USER_ID, role: 'tutor' } as any,
          params: { id: MOCK_REQUEST_ID },
          body: { action: 'ACCEPT' },
        };
        const res = createMockResponse();

        (prisma.classRequest.findFirst as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          status: 'WAITING_TUTOR_CONFIRM',
          selected_tutor_code: 'GS-001',
          class_salary: 1000000,
          student: { user_id: MOCK_STUDENT_USER_ID },
        });

        (prisma.tutorProfile.findUnique as any).mockResolvedValue({
          tutor_id: MOCK_TUTOR_A_ID,
          user_id: MOCK_TUTOR_A_USER_ID,
          tutor_code: 'GS-001',
          phone: '0987654321',
        });

        (prisma.classApplication.findFirst as any).mockResolvedValue(null);
        (prisma.classApplication.create as any).mockResolvedValue({
          application_id: 'app-assigned-id',
          status: 'APPROVED',
        });

        (prisma.classRequest.update as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          status: 'WAITING_PAYMENT',
          selected_tutor_code: 'GS-001',
        });

        (prisma.offlineClassPayment.create as any).mockResolvedValue({
          payment_id: 'payment-mock-id',
          status: 'PENDING',
        });

        await classRequestController.tutorRespondDirectClass(req as Request, res);

        expect(res._json.message).toContain('Bạn đã đồng ý nhận lớp chỉ định');
        expect(res._json.data.status).toBe('WAITING_PAYMENT');
        expect(prisma.$transaction).toHaveBeenCalled();
      });

      it('Gia sư chọn DECLINE -> Lớp trả về trạng thái OPEN, selected_tutor_code đặt về null', async () => {
        const req: Partial<Request> = {
          user: { user_id: MOCK_TUTOR_A_USER_ID, role: 'tutor' } as any,
          params: { id: MOCK_REQUEST_ID },
          body: { action: 'DECLINE' },
        };
        const res = createMockResponse();

        (prisma.classRequest.findFirst as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          status: 'WAITING_TUTOR_CONFIRM',
          selected_tutor_code: 'GS-001',
        });

        (prisma.tutorProfile.findUnique as any).mockResolvedValue({
          tutor_id: MOCK_TUTOR_A_ID,
          user_id: MOCK_TUTOR_A_USER_ID,
          tutor_code: 'GS-001',
        });

        (prisma.classRequest.update as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          status: 'OPEN',
          selected_tutor_code: null,
        });

        await classRequestController.tutorRespondDirectClass(req as Request, res);

        expect(res._json.message).toContain('chuyển sang bài đăng công khai (OPEN)');
        expect(res._json.data.status).toBe('OPEN');
        expect(prisma.classRequest.update).toHaveBeenCalledWith({
          where: { request_id: MOCK_REQUEST_ID },
          data: {
            status: 'OPEN',
            selected_tutor_code: null,
          },
        });
      });

      it('Gia sư không phải người được chỉ định -> Bị từ chối 403', async () => {
        const req: Partial<Request> = {
          user: { user_id: MOCK_TUTOR_B_USER_ID, role: 'tutor' } as any,
          params: { id: MOCK_REQUEST_ID },
          body: { action: 'ACCEPT' },
        };
        const res = createMockResponse();

        (prisma.classRequest.findFirst as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          status: 'WAITING_TUTOR_CONFIRM',
          selected_tutor_code: 'GS-001',
        });

        (prisma.tutorProfile.findUnique as any).mockResolvedValue({
          tutor_id: 'tutor-b-profile-id',
          user_id: MOCK_TUTOR_B_USER_ID,
          tutor_code: 'GS-999', // Mã khác với GS-001
        });

        await classRequestController.tutorRespondDirectClass(req as Request, res);

        expect(res._status).toBe(403);
        expect(res._json.message).toContain('Bạn không phải Gia sư được chỉ định trực tiếp');
      });

      it('Hành động không hợp lệ (không phải ACCEPT hoặc DECLINE) -> Trả về 400', async () => {
        const req: Partial<Request> = {
          user: { user_id: MOCK_TUTOR_A_USER_ID, role: 'tutor' } as any,
          params: { id: MOCK_REQUEST_ID },
          body: { action: 'MAYBE' },
        };
        const res = createMockResponse();

        await classRequestController.tutorRespondDirectClass(req as Request, res);

        expect(res._status).toBe(400);
        expect(res._json.message).toContain('Hành động không hợp lệ');
      });
    });
  });
});
