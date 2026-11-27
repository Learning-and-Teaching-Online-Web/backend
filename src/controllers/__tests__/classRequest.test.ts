import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Response, Request } from 'express';
import {
  classRequestController,
  resolveEscrowExpiration,
  determineFaultParty,
} from '../classRequest.controller';
import { refundTicketController } from '../refundTicket.controller';
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
      findUnique: vi.fn(),
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
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    offlineClass: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    offlineClassPayment: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    refundTicket: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
    wallet: {
      findUnique: vi.fn(),
      update: vi.fn(),
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

// Mock IDs bổ sung cho P2
const MOCK_TUTOR_A_TUTOR_CODE = 'GS-001';
const MOCK_APPLICATION_ID = '88888888-8888-8888-8888-888888888888';
const MOCK_OFFLINE_CLASS_ID = '99999999-9999-9999-9999-999999999999';
const MOCK_PAYMENT_TUTOR_ID = 'aaaa1111-1111-1111-1111-111111111111';
const MOCK_PAYMENT_STUDENT_ID = 'bbbb2222-2222-2222-2222-222222222222';
const MOCK_TRANSACTION_ID = 'cccc3333-3333-3333-3333-333333333333';
const MOCK_TICKET_ID = 'dddd4444-4444-4444-4444-444444444444';

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

// =============================================================================
// [TEST-OFFLINE-P2] GIAI ĐOẠN 4 -> 7
// =============================================================================
describe('[TEST-OFFLINE-P2] Kiểm thử End-to-End Nghiệp vụ Lớp học Offline (Module 12) — Giai đoạn 4-7', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // KỊCH BẢN 4: ADMIN CHỌN GIA SƯ & GIAO LỚP (KHỞI TẠO ESCROW 48H)
  // ===========================================================================
  describe('Kịch bản 4: Admin chọn Gia sư & Giao lớp (Khởi tạo Escrow 48h)', () => {
    describe('Case 4.1: Admin giao lớp (PATCH /api/admin/class-requests/:id/assign-tutor)', () => {
      it('Giao lớp thành công -> Chuyển WAITING_PAYMENT, thiết lập payment_deadline = now + 48h, sinh 2 bản ghi Escrow Payment', async () => {
        const req: Partial<Request> = {
          user: { user_id: MOCK_ADMIN_USER_ID, role: 'admin' } as any,
          params: { id: MOCK_REQUEST_ID },
          body: { tutor_id: MOCK_TUTOR_A_ID },
        };
        const res = createMockResponse();

        (prisma.classRequest.findFirst as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          class_code: MOCK_CLASS_CODE,
          status: 'OPEN',
          class_salary: 1000000,
          student_id: MOCK_STUDENT_ID,
          student: { user_id: MOCK_STUDENT_USER_ID },
        });

        (prisma.tutorProfile.findUnique as any).mockResolvedValue({
          tutor_id: MOCK_TUTOR_A_ID,
          user_id: MOCK_TUTOR_A_USER_ID,
          tutor_code: MOCK_TUTOR_A_TUTOR_CODE,
        });

        (prisma.classApplication.findFirst as any).mockResolvedValue({
          application_id: MOCK_APPLICATION_ID,
          tutor_id: MOCK_TUTOR_A_ID,
        });

        const futureDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000);
        (prisma.classRequest.update as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          class_code: MOCK_CLASS_CODE,
          status: 'WAITING_PAYMENT',
          payment_deadline: futureDeadline,
          selected_tutor_code: MOCK_TUTOR_A_TUTOR_CODE,
        });
        (prisma.offlineClassPayment.updateMany as any).mockResolvedValue({ count: 0 });
        (prisma.classApplication.update as any).mockResolvedValue({
          application_id: MOCK_APPLICATION_ID,
          status: 'APPROVED',
        });
        (prisma.offlineClassPayment.create as any).mockResolvedValue({
          payment_id: 'payment-id',
          status: 'PENDING',
        });

        await classRequestController.adminAssignTutor(req as Request, res);

        expect(res._json.message).toContain('Giao lớp thành công');
        expect(res._json.data.status).toBe('WAITING_PAYMENT');
        expect(res._json.data.selected_tutor_code).toBe(MOCK_TUTOR_A_TUTOR_CODE);
        expect(prisma.$transaction).toHaveBeenCalled();

        // Kiểm tra sinh 2 bản ghi thanh toán giữ chỗ (STUDENT_TUITION = 1.000.000 và TUTOR_PLACEMENT_FEE = 350.000)
        expect(prisma.offlineClassPayment.create).toHaveBeenCalledTimes(2);
        expect(prisma.offlineClassPayment.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            class_request_id: MOCK_REQUEST_ID,
            payer_user_id: MOCK_STUDENT_USER_ID,
            type: 'STUDENT_TUITION',
            status: 'PENDING',
            required_amount: 1000000,
          }),
        });
        expect(prisma.offlineClassPayment.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            class_request_id: MOCK_REQUEST_ID,
            payer_user_id: MOCK_TUTOR_A_USER_ID,
            type: 'TUTOR_PLACEMENT_FEE',
            status: 'PENDING',
            required_amount: 350000,
          }),
        });
      });

      it('Lớp không tồn tại -> Trả về lỗi 404', async () => {
        const req: Partial<Request> = {
          params: { id: 'non-existing-id' },
          body: { tutor_id: MOCK_TUTOR_A_ID },
        };
        const res = createMockResponse();

        (prisma.classRequest.findFirst as any).mockResolvedValue(null);

        await classRequestController.adminAssignTutor(req as Request, res);

        expect(res._status).toBe(404);
        expect(res._json.message).toContain('Không tìm thấy thông tin lớp học');
      });

      it('Lớp đã CANCELLED hoặc EXPIRED -> Trả về lỗi 400', async () => {
        const req: Partial<Request> = {
          params: { id: MOCK_REQUEST_ID },
          body: { tutor_id: MOCK_TUTOR_A_ID },
        };
        const res = createMockResponse();

        (prisma.classRequest.findFirst as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          status: 'EXPIRED',
        });

        await classRequestController.adminAssignTutor(req as Request, res);

        expect(res._status).toBe(400);
        expect(res._json.message).toContain('không thể giao gia sư');
      });

      it('Không tìm thấy thông tin Gia sư hợp lệ -> Trả về lỗi 400', async () => {
        const req: Partial<Request> = {
          params: { id: MOCK_REQUEST_ID },
          body: { tutor_id: 'invalid-tutor-id' },
        };
        const res = createMockResponse();

        (prisma.classRequest.findFirst as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          status: 'OPEN',
        });
        (prisma.tutorProfile.findUnique as any).mockResolvedValue(null);

        await classRequestController.adminAssignTutor(req as Request, res);

        expect(res._status).toBe(400);
        expect(res._json.message).toContain('Vui lòng chọn thông tin Gia sư hợp lệ');
      });

      it('Lớp chưa có tài khoản Học viên liên kết -> Trả về lỗi 400', async () => {
        const req: Partial<Request> = {
          params: { id: MOCK_REQUEST_ID },
          body: { tutor_id: MOCK_TUTOR_A_ID },
        };
        const res = createMockResponse();

        (prisma.classRequest.findFirst as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          status: 'OPEN',
          student_id: null,
          email: null,
          student: null,
        });
        (prisma.tutorProfile.findUnique as any).mockResolvedValue({
          tutor_id: MOCK_TUTOR_A_ID,
          user_id: MOCK_TUTOR_A_USER_ID,
          tutor_code: MOCK_TUTOR_A_TUTOR_CODE,
        });
        (prisma.classApplication.findFirst as any).mockResolvedValue(null);

        await classRequestController.adminAssignTutor(req as Request, res);

        expect(res._status).toBe(400);
        expect(res._json.message).toContain('chưa có tài khoản Học viên liên kết');
      });
    });
  });

  // ===========================================================================
  // KỊCH BẢN 5: QUY TRÌNH KÝ QUỸ GIỮ CHỖ 2 BÊN (TWO-SIDED ESCROW)
  // ===========================================================================
  describe('Kịch bản 5: Quy trình Ký quỹ giữ chỗ 2 bên (Two-sided Escrow)', () => {
    describe('Case 5.1: Gia sư đóng phí nhận lớp (POST /api/class-requests/:id/pay-commission)', () => {
      it('Gia sư đủ số dư -> Trừ tiền ví gia sư, payment thành PAID, lớp vẫn ở WAITING_PAYMENT (chờ Học viên)', async () => {
        const req: Partial<Request> = {
          user: { user_id: MOCK_TUTOR_A_USER_ID, role: 'tutor' } as any,
          params: { id: MOCK_REQUEST_ID },
        };
        const res = createMockResponse();

        (prisma.classRequest.findFirst as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          class_code: MOCK_CLASS_CODE,
          class_salary: 1000000,
          subject: { name: 'Toán học' },
        });

        (prisma.offlineClassPayment.findFirst as any).mockResolvedValue({
          payment_id: MOCK_PAYMENT_TUTOR_ID,
          class_request_id: MOCK_REQUEST_ID,
          type: 'TUTOR_PLACEMENT_FEE',
          status: 'PENDING',
          required_amount: 350000,
        });

        (prisma.wallet.findUnique as any).mockResolvedValue({
          user_id: MOCK_TUTOR_A_USER_ID,
          balance: 500000,
        });

        (prisma.transaction.create as any).mockResolvedValue({
          transaction_id: MOCK_TRANSACTION_ID,
          amount: 350000,
          status: 'success',
        });

        (prisma.wallet.update as any).mockResolvedValue({
          user_id: MOCK_TUTOR_A_USER_ID,
          balance: 150000,
        });

        (prisma.offlineClassPayment.update as any).mockResolvedValue({
          payment_id: MOCK_PAYMENT_TUTOR_ID,
          status: 'PAID',
          paid_amount: 350000,
        });

        // Học viên chưa nộp học phí -> checkAndActivateOfflineClass trả về null
        (prisma.offlineClassPayment.findMany as any).mockResolvedValue([
          { payment_id: MOCK_PAYMENT_TUTOR_ID, type: 'TUTOR_PLACEMENT_FEE', status: 'PAID' },
          { payment_id: MOCK_PAYMENT_STUDENT_ID, type: 'STUDENT_TUITION', status: 'PENDING' },
        ]);

        await classRequestController.payCommission(req as Request, res);

        expect(res._json.message).toContain('Đã hoàn tất đóng phí nhận lớp');
        expect(res._json.data.activated).toBe(false);
        expect(res._json.data.offline_class).toBeNull();
        expect(prisma.wallet.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { user_id: MOCK_TUTOR_A_USER_ID },
            data: expect.objectContaining({ balance: { decrement: 350000 } }),
          })
        );
        expect(prisma.offlineClassPayment.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { payment_id: MOCK_PAYMENT_TUTOR_ID },
            data: expect.objectContaining({
              status: 'PAID',
              paid_amount: 350000,
            }),
          })
        );
      });

      it('Số dư ví Gia sư không đủ -> Trả về 400 insufficient_balance', async () => {
        const req: Partial<Request> = {
          user: { user_id: MOCK_TUTOR_A_USER_ID, role: 'tutor' } as any,
          params: { id: MOCK_REQUEST_ID },
        };
        const res = createMockResponse();

        (prisma.classRequest.findFirst as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          class_code: MOCK_CLASS_CODE,
          class_salary: 1000000,
        });

        (prisma.offlineClassPayment.findFirst as any).mockResolvedValue({
          payment_id: MOCK_PAYMENT_TUTOR_ID,
          type: 'TUTOR_PLACEMENT_FEE',
          status: 'PENDING',
          required_amount: 350000,
        });

        (prisma.wallet.findUnique as any).mockResolvedValue({
          user_id: MOCK_TUTOR_A_USER_ID,
          balance: 100000, // Thiếu 250.000
        });

        await classRequestController.payCommission(req as Request, res);

        expect(res._status).toBe(400);
        expect(res._json.error).toBe('insufficient_balance');
        expect(res._json.shortage).toBe(250000);
        expect(prisma.wallet.update).not.toHaveBeenCalled();
      });
    });

    describe('Case 5.2: Học viên nộp học phí tháng đầu (POST /api/class-requests/:id/pay-tuition)', () => {
      it('Học viên đóng học phí khi Gia sư đã PAID -> Trừ ví học viên, KÍCH HOẠT THÀNH CÔNG OfflineClass (ACTIVE), thiết lập refund_deadline = now + 7 days', async () => {
        const req: Partial<Request> = {
          user: { user_id: MOCK_STUDENT_USER_ID, role: 'student' } as any,
          params: { id: MOCK_REQUEST_ID },
        };
        const res = createMockResponse();

        (prisma.classRequest.findFirst as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          class_code: MOCK_CLASS_CODE,
          class_salary: 1000000,
          subject: { name: 'Toán học' },
        });

        (prisma.offlineClassPayment.findFirst as any).mockResolvedValue({
          payment_id: MOCK_PAYMENT_STUDENT_ID,
          class_request_id: MOCK_REQUEST_ID,
          type: 'STUDENT_TUITION',
          status: 'PENDING',
          required_amount: 1000000,
        });

        (prisma.wallet.findUnique as any).mockResolvedValue({
          user_id: MOCK_STUDENT_USER_ID,
          balance: 1500000,
        });

        (prisma.transaction.create as any).mockResolvedValue({
          transaction_id: MOCK_TRANSACTION_ID,
          amount: 1000000,
          status: 'success',
        });

        (prisma.wallet.update as any).mockResolvedValue({
          user_id: MOCK_STUDENT_USER_ID,
          balance: 500000,
        });

        (prisma.offlineClassPayment.update as any).mockResolvedValue({
          payment_id: MOCK_PAYMENT_STUDENT_ID,
          status: 'PAID',
          paid_amount: 1000000,
        });

        // Cả 2 bên đã PAID trong checkAndActivateOfflineClass
        (prisma.offlineClassPayment.findMany as any).mockResolvedValue([
          {
            payment_id: MOCK_PAYMENT_STUDENT_ID,
            type: 'STUDENT_TUITION',
            status: 'PAID',
            payer_user_id: MOCK_STUDENT_USER_ID,
          },
          {
            payment_id: MOCK_PAYMENT_TUTOR_ID,
            type: 'TUTOR_PLACEMENT_FEE',
            status: 'PAID',
            payer_user_id: MOCK_TUTOR_A_USER_ID,
          },
        ]);

        (prisma.classApplication.findFirst as any).mockResolvedValue({
          tutor_id: MOCK_TUTOR_A_ID,
        });

        (prisma.classApplication.updateMany as any).mockResolvedValue({ count: 0 });

        (prisma.classRequest.delete as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          class_code: MOCK_CLASS_CODE,
          student_id: MOCK_STUDENT_ID,
          student_name: 'Nguyễn Văn Học Sinh',
          phone: '0901234567',
          email: 'student@vct.edu.vn',
          address_detail: '123 Lê Lợi',
          district: 'Quận 1',
          province: 'Hồ Chí Minh',
          grade_level: 'grade_10',
          subject_id: 'sub-toan-uuid',
          num_students: 1,
          academic_level: 'Khá',
          sessions_per_week: 2,
          study_time: 'Tối 2-4',
          class_salary: 1000000,
        });

        const now = Date.now();
        const mockRefundDeadline = new Date(now + 7 * 24 * 60 * 60 * 1000);
        (prisma.offlineClass.create as any).mockResolvedValue({
          class_id: MOCK_OFFLINE_CLASS_ID,
          class_offline_code: MOCK_CLASS_CODE,
          tutor_id: MOCK_TUTOR_A_ID,
          student_id: MOCK_STUDENT_ID,
          status: 'ACTIVE',
          refund_deadline: mockRefundDeadline,
        });

        (prisma.offlineClassPayment.updateMany as any).mockResolvedValue({ count: 2 });

        await classRequestController.payStudentTuition(req as Request, res);

        expect(res._json.message).toContain('Lớp học chính thức được kích hoạt (ACTIVE)');
        expect(res._json.data.activated).toBe(true);
        expect(res._json.data.offline_class.status).toBe('ACTIVE');
        expect(prisma.wallet.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { user_id: MOCK_STUDENT_USER_ID },
            data: expect.objectContaining({ balance: { decrement: 1000000 } }),
          })
        );
        expect(prisma.offlineClass.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              tutor_id: MOCK_TUTOR_A_ID,
              student_id: MOCK_STUDENT_ID,
              status: 'ACTIVE',
              commission_rate: 35,
              refund_deadline: expect.any(Date),
            }),
          })
        );
      });

      it('Số dư ví Học viên không đủ -> Trả về 400 insufficient_balance', async () => {
        const req: Partial<Request> = {
          user: { user_id: MOCK_STUDENT_USER_ID, role: 'student' } as any,
          params: { id: MOCK_REQUEST_ID },
        };
        const res = createMockResponse();

        (prisma.classRequest.findFirst as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          class_code: MOCK_CLASS_CODE,
          class_salary: 1000000,
        });

        (prisma.offlineClassPayment.findFirst as any).mockResolvedValue({
          payment_id: MOCK_PAYMENT_STUDENT_ID,
          type: 'STUDENT_TUITION',
          status: 'PENDING',
          required_amount: 1000000,
        });

        (prisma.wallet.findUnique as any).mockResolvedValue({
          user_id: MOCK_STUDENT_USER_ID,
          balance: 200000,
        });

        await classRequestController.payStudentTuition(req as Request, res);

        expect(res._status).toBe(400);
        expect(res._json.error).toBe('insufficient_balance');
        expect(res._json.shortage).toBe(800000);
      });
    });

    describe('Case 5.3: Gia sư chủ động hủy nhận lớp khi đang WAITING_PAYMENT (POST /api/class-requests/:id/cancel-assignment)', () => {
      it('Gia sư hủy nhận lớp -> Hoàn tiền 100% ví cho Học viên đã nộp, đưa lớp về OPEN', async () => {
        const req: Partial<Request> = {
          user: { user_id: MOCK_TUTOR_A_USER_ID, role: 'tutor' } as any,
          params: { id: MOCK_REQUEST_ID },
        };
        const res = createMockResponse();

        (prisma.classRequest.findFirst as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          class_code: MOCK_CLASS_CODE,
          status: 'WAITING_PAYMENT',
          selected_tutor_code: MOCK_TUTOR_A_TUTOR_CODE,
          applications: [{ application_id: MOCK_APPLICATION_ID, tutor_id: MOCK_TUTOR_A_ID, status: 'APPROVED' }],
        });

        (prisma.tutorProfile.findUnique as any).mockResolvedValue({
          tutor_id: MOCK_TUTOR_A_ID,
          user_id: MOCK_TUTOR_A_USER_ID,
          tutor_code: MOCK_TUTOR_A_TUTOR_CODE,
        });

        // Mock cho resolveEscrowExpiration(request_id, 'TUTOR')
        (prisma.classRequest.findUnique as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          class_code: MOCK_CLASS_CODE,
          status: 'WAITING_PAYMENT',
          student_id: MOCK_STUDENT_ID,
          payments: [
            {
              payment_id: MOCK_PAYMENT_STUDENT_ID,
              type: 'STUDENT_TUITION',
              status: 'PAID',
              paid_amount: 1000000,
              payer_user_id: MOCK_STUDENT_USER_ID,
            },
            {
              payment_id: MOCK_PAYMENT_TUTOR_ID,
              type: 'TUTOR_PLACEMENT_FEE',
              status: 'PENDING',
            },
          ],
        });

        (prisma.offlineClassPayment.update as any).mockResolvedValue({});
        (prisma.wallet.upsert as any).mockResolvedValue({});
        (prisma.transaction.create as any).mockResolvedValue({});
        (prisma.classApplication.updateMany as any).mockResolvedValue({ count: 1 });
        (prisma.classRequest.update as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          status: 'OPEN',
          selected_tutor_code: null,
        });

        await classRequestController.cancelTutorAssignment(req as Request, res);

        expect(res._json.message).toContain('Đã hủy nhận lớp thành công');
        expect(res._json.data.status).toBe('OPEN');
        expect(res._json.data.selected_tutor_code).toBeNull();
        expect(prisma.wallet.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { user_id: MOCK_STUDENT_USER_ID },
            update: expect.objectContaining({ balance: { increment: 1000000 } }),
          })
        );
      });

      it('Lớp không ở trạng thái WAITING_PAYMENT -> Trả về lỗi 400', async () => {
        const req: Partial<Request> = {
          user: { user_id: MOCK_TUTOR_A_USER_ID, role: 'tutor' } as any,
          params: { id: MOCK_REQUEST_ID },
        };
        const res = createMockResponse();

        (prisma.classRequest.findFirst as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          status: 'OPEN',
        });

        await classRequestController.cancelTutorAssignment(req as Request, res);

        expect(res._status).toBe(400);
        expect(res._json.message).toContain('không ở trạng thái chờ thanh toán');
      });

      it('Gia sư không phải người được gán cho lớp -> Trả về lỗi 403', async () => {
        const req: Partial<Request> = {
          user: { user_id: MOCK_TUTOR_B_USER_ID, role: 'tutor' } as any,
          params: { id: MOCK_REQUEST_ID },
        };
        const res = createMockResponse();

        (prisma.classRequest.findFirst as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          status: 'WAITING_PAYMENT',
          selected_tutor_code: MOCK_TUTOR_A_TUTOR_CODE,
          applications: [{ tutor_id: MOCK_TUTOR_A_ID, status: 'APPROVED' }],
        });

        (prisma.tutorProfile.findUnique as any).mockResolvedValue({
          tutor_id: 'tutor-b-id',
          user_id: MOCK_TUTOR_B_USER_ID,
          tutor_code: 'GS-999',
        });

        await classRequestController.cancelTutorAssignment(req as Request, res);

        expect(res._status).toBe(403);
        expect(res._json.message).toContain('Bạn không phải gia sư được chọn cho lớp này');
      });
    });
  });

  // ===========================================================================
  // KỊCH BẢN 6: CƠ CHẾ QUÁ HẠN THANH TOÁN 48H (AUTO-EXPIRATION)
  // ===========================================================================
  describe('Kịch bản 6: Cơ chế Quá hạn thanh toán 48h (Auto-expiration)', () => {
    describe('Case 6.1: Quét hết hạn (POST /api/class-requests/:id/check-expiration)', () => {
      it('Quá hạn lỗi phía Gia sư (Học viên đã nộp, Gia sư chưa nộp) -> Hủy tư cách gia sư, hoàn 100% học phí cho Học viên, đưa lớp về OPEN', async () => {
        const req: Partial<Request> = {
          user: { user_id: MOCK_ADMIN_USER_ID, role: 'admin' } as any,
          params: { id: MOCK_REQUEST_ID },
          body: {}, // Không override, tự xác định faultParty = TUTOR vì studentPayment PAID
        };
        const res = createMockResponse();

        (prisma.classRequest.findUnique as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          class_code: MOCK_CLASS_CODE,
          status: 'WAITING_PAYMENT',
          student_id: MOCK_STUDENT_ID,
          payments: [
            {
              payment_id: MOCK_PAYMENT_STUDENT_ID,
              type: 'STUDENT_TUITION',
              status: 'PAID',
              paid_amount: 1000000,
              payer_user_id: MOCK_STUDENT_USER_ID,
            },
            {
              payment_id: MOCK_PAYMENT_TUTOR_ID,
              type: 'TUTOR_PLACEMENT_FEE',
              status: 'PENDING',
            },
          ],
        });

        (prisma.offlineClassPayment.update as any).mockResolvedValue({});
        (prisma.wallet.upsert as any).mockResolvedValue({});
        (prisma.transaction.create as any).mockResolvedValue({});
        (prisma.classApplication.updateMany as any).mockResolvedValue({ count: 1 });
        (prisma.classRequest.update as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          status: 'OPEN',
          selected_tutor_code: null,
        });

        await classRequestController.handleEscrowExpiration(req as Request, res);

        expect(res._json.message).toContain('Lớp quay lại trạng thái OPEN');
        expect(res._json.data.status).toBe('OPEN');
        expect(prisma.wallet.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { user_id: MOCK_STUDENT_USER_ID },
            update: expect.objectContaining({ balance: { increment: 1000000 } }),
          })
        );
        expect(prisma.offlineClassPayment.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { payment_id: MOCK_PAYMENT_STUDENT_ID },
            data: expect.objectContaining({ status: 'REFUNDED', refunded_amount: 1000000 }),
          })
        );
      });

      it('Quá hạn lỗi phía Học viên (Gia sư đã nộp, Học viên chưa nộp) -> Hoàn 100% phí nhận lớp cho Gia sư, lớp chuyển EXPIRED', async () => {
        const req: Partial<Request> = {
          user: { user_id: MOCK_ADMIN_USER_ID, role: 'admin' } as any,
          params: { id: MOCK_REQUEST_ID },
          body: {},
        };
        const res = createMockResponse();

        (prisma.classRequest.findUnique as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          class_code: MOCK_CLASS_CODE,
          status: 'WAITING_PAYMENT',
          payments: [
            {
              payment_id: MOCK_PAYMENT_STUDENT_ID,
              type: 'STUDENT_TUITION',
              status: 'PENDING',
            },
            {
              payment_id: MOCK_PAYMENT_TUTOR_ID,
              type: 'TUTOR_PLACEMENT_FEE',
              status: 'PAID',
              paid_amount: 350000,
              payer_user_id: MOCK_TUTOR_A_USER_ID,
            },
          ],
        });

        (prisma.offlineClassPayment.update as any).mockResolvedValue({});
        (prisma.wallet.upsert as any).mockResolvedValue({});
        (prisma.transaction.create as any).mockResolvedValue({});
        (prisma.classApplication.updateMany as any).mockResolvedValue({ count: 1 });
        (prisma.classRequest.update as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          status: 'EXPIRED',
        });

        await classRequestController.handleEscrowExpiration(req as Request, res);

        expect(res._json.message).toContain('Lớp chuyển sang EXPIRED đóng vĩnh viễn');
        expect(res._json.data.status).toBe('EXPIRED');
        expect(prisma.wallet.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { user_id: MOCK_TUTOR_A_USER_ID },
            update: expect.objectContaining({ balance: { increment: 350000 } }),
          })
        );
      });

      it('Lớp không tồn tại hoặc không ở trạng thái WAITING_PAYMENT -> Trả về 400', async () => {
        const req: Partial<Request> = {
          params: { id: MOCK_REQUEST_ID },
          body: {},
        };
        const res = createMockResponse();

        (prisma.classRequest.findUnique as any).mockResolvedValue({
          request_id: MOCK_REQUEST_ID,
          status: 'OPEN',
        });

        await classRequestController.handleEscrowExpiration(req as Request, res);

        expect(res._status).toBe(400);
        expect(res._json.message).toContain('Không thể xử lý trễ hạn');
      });

      it('Helper determineFaultParty xác định đúng bên có lỗi', async () => {
        expect(await determineFaultParty({ status: 'PAID' }, { status: 'PENDING' })).toBe('TUTOR');
        expect(await determineFaultParty({ status: 'PENDING' }, { status: 'PAID' })).toBe('STUDENT');
      });
    });
  });

  // ===========================================================================
  // KỊCH BẢN 7: KHIẾU NẠI & HOÀN TIỀN TRONG 7 NGÀY (REFUND TICKET)
  // ===========================================================================
  describe('Kịch bản 7: Khiếu nại & Hoàn tiền trong 7 ngày (Refund Ticket)', () => {
    describe('Case 7.1: Tạo khiếu nại trong 7 ngày (POST /api/class-requests/offline-classes/:classId/refund-tickets)', () => {
      it('Tạo khiếu nại hợp lệ trong hạn 7 ngày -> Tạo RefundTicket (PENDING) thành công (201)', async () => {
        const req: Partial<Request> = {
          user: { user_id: MOCK_STUDENT_USER_ID, role: 'student' } as any,
          params: { classId: MOCK_OFFLINE_CLASS_ID },
          body: { reason: 'Gia sư không đến dạy buổi đầu tiên theo lịch hẹn' },
        };
        const res = createMockResponse();

        (prisma.offlineClass.findFirst as any).mockResolvedValue({
          class_id: MOCK_OFFLINE_CLASS_ID,
          status: 'ACTIVE',
          class_salary: 1000000,
          commission_rate: 35,
          refund_deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // Còn 5 ngày
          payments: [
            { type: 'STUDENT_TUITION', status: 'PAID', paid_amount: 1000000 },
            { type: 'TUTOR_PLACEMENT_FEE', status: 'PAID', paid_amount: 350000 },
          ],
          refund_tickets: [],
        });

        (prisma.refundTicket.create as any).mockResolvedValue({
          ticket_id: MOCK_TICKET_ID,
          class_id: MOCK_OFFLINE_CLASS_ID,
          requested_by: MOCK_STUDENT_USER_ID,
          reason: 'Gia sư không đến dạy buổi đầu tiên theo lịch hẹn',
          status: 'PENDING',
          student_tuition_amount: 1000000,
          tutor_fee_amount: 350000,
        });

        await refundTicketController.createTicket(req as Request, res);

        expect(res._status).toBe(201);
        expect(res._json.message).toContain('Đã gửi yêu cầu hủy lớp thành công');
        expect(res._json.data.status).toBe('PENDING');
        expect(prisma.refundTicket.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              class_id: MOCK_OFFLINE_CLASS_ID,
              requested_by: MOCK_STUDENT_USER_ID,
              status: 'PENDING',
              student_tuition_amount: 1000000,
              tutor_fee_amount: 350000,
            }),
          })
        );
      });

      it('Lớp không ở trạng thái ACTIVE -> Trả về lỗi 400', async () => {
        const req: Partial<Request> = {
          user: { user_id: MOCK_STUDENT_USER_ID, role: 'student' } as any,
          params: { classId: MOCK_OFFLINE_CLASS_ID },
          body: { reason: 'Muốn hủy lớp' },
        };
        const res = createMockResponse();

        (prisma.offlineClass.findFirst as any).mockResolvedValue({
          class_id: MOCK_OFFLINE_CLASS_ID,
          status: 'CANCELLED',
        });

        await refundTicketController.createTicket(req as Request, res);

        expect(res._status).toBe(400);
        expect(res._json.message).toContain('không ở trạng thái ACTIVE');
      });

      it('Thiếu lý do yêu cầu hoàn tiền -> Trả về lỗi 400', async () => {
        const req: Partial<Request> = {
          user: { user_id: MOCK_STUDENT_USER_ID, role: 'student' } as any,
          params: { classId: MOCK_OFFLINE_CLASS_ID },
          body: { reason: '   ' },
        };
        const res = createMockResponse();

        await refundTicketController.createTicket(req as Request, res);

        expect(res._status).toBe(400);
        expect(res._json.message).toContain('Vui lòng điền lý do');
      });
    });

    describe('Case 7.2: Chặn tạo khiếu nại khi đã quá 7 ngày (refund_deadline < now)', () => {
      it('Đã quá hạn 7 ngày -> Báo lỗi 400', async () => {
        const req: Partial<Request> = {
          user: { user_id: MOCK_STUDENT_USER_ID, role: 'student' } as any,
          params: { classId: MOCK_OFFLINE_CLASS_ID },
          body: { reason: 'Khiếu nại trễ hạn' },
        };
        const res = createMockResponse();

        (prisma.offlineClass.findFirst as any).mockResolvedValue({
          class_id: MOCK_OFFLINE_CLASS_ID,
          status: 'ACTIVE',
          refund_deadline: new Date(Date.now() - 24 * 60 * 60 * 1000), // Quá hạn 1 ngày
          payments: [],
          refund_tickets: [],
        });

        await refundTicketController.createTicket(req as Request, res);

        expect(res._status).toBe(400);
        expect(res._json.message).toContain('Đã quá thời hạn 7 ngày');
        expect(prisma.refundTicket.create).not.toHaveBeenCalled();
      });
    });

    describe('Case 7.3: Admin duyệt hoàn tiền APPROVED (PATCH /api/admin/refund-tickets/:ticketId/process)', () => {
      it('Duyệt lỗi Gia sư (TUTOR_FAULT) -> Học viên nhận 100% (1.000.000), Gia sư bị phạt 20% nhận 80% (280.000), lớp chuyển CANCELLED', async () => {
        const req: Partial<Request> = {
          user: { user_id: MOCK_ADMIN_USER_ID, role: 'admin' } as any,
          params: { ticketId: MOCK_TICKET_ID },
          body: {
            status: 'APPROVED',
            fault_type: 'TUTOR_FAULT',
            admin_note: 'Xác minh gia sư vắng mặt không lý do',
          },
        };
        const res = createMockResponse();

        (prisma.refundTicket.findUnique as any).mockResolvedValue({
          ticket_id: MOCK_TICKET_ID,
          class_id: MOCK_OFFLINE_CLASS_ID,
          status: 'PENDING',
          student_tuition_amount: 1000000,
          tutor_fee_amount: 350000,
          offline_class: {
            class_id: MOCK_OFFLINE_CLASS_ID,
            class_offline_code: MOCK_CLASS_CODE,
            tutor: { tutor_id: MOCK_TUTOR_A_ID, user_id: MOCK_TUTOR_A_USER_ID },
            student: { student_id: MOCK_STUDENT_ID, user_id: MOCK_STUDENT_USER_ID },
            payments: [
              { payment_id: MOCK_PAYMENT_STUDENT_ID, type: 'STUDENT_TUITION' },
              { payment_id: MOCK_PAYMENT_TUTOR_ID, type: 'TUTOR_PLACEMENT_FEE' },
            ],
          },
        });

        (prisma.refundTicket.update as any).mockResolvedValue({
          ticket_id: MOCK_TICKET_ID,
          status: 'COMPLETED',
          fault_type: 'TUTOR_FAULT',
          student_refund_amount: 1000000,
          tutor_penalty_amount: 70000,
          tutor_refund_amount: 280000,
        });
        (prisma.offlineClass.update as any).mockResolvedValue({ status: 'CANCELLED' });
        (prisma.offlineClassPayment.update as any).mockResolvedValue({});
        (prisma.wallet.upsert as any).mockResolvedValue({});
        (prisma.transaction.create as any).mockResolvedValue({});

        await refundTicketController.adminProcessTicket(req as Request, res);

        expect(res._json.message).toContain('Đã xử lý chốt hủy lớp và hoàn tiền thành công');
        expect(res._json.data.status).toBe('COMPLETED');
        expect(prisma.$transaction).toHaveBeenCalled();

        // Kiểm tra biến động hoàn tiền vào ví 2 bên: Student +1.000.000, Tutor +280.000
        expect(prisma.wallet.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { user_id: MOCK_STUDENT_USER_ID },
            update: expect.objectContaining({ balance: { increment: 1000000 } }),
          })
        );
        expect(prisma.wallet.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { user_id: MOCK_TUTOR_A_USER_ID },
            update: expect.objectContaining({ balance: { increment: 280000 } }),
          })
        );
        expect(prisma.offlineClass.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { class_id: MOCK_OFFLINE_CLASS_ID },
            data: expect.objectContaining({ status: 'CANCELLED' }),
          })
        );
      });

      it('Duyệt lỗi Học viên (STUDENT_FAULT) -> Học viên bị phạt 10% nhận 90% (900.000), Gia sư nhận 100% (350.000), lớp chuyển CANCELLED', async () => {
        const req: Partial<Request> = {
          user: { user_id: MOCK_ADMIN_USER_ID, role: 'admin' } as any,
          params: { ticketId: MOCK_TICKET_ID },
          body: {
            status: 'APPROVED',
            fault_type: 'STUDENT_FAULT',
            admin_note: 'Học viên đơn phương hủy lớp không lý do chính đáng',
          },
        };
        const res = createMockResponse();

        (prisma.refundTicket.findUnique as any).mockResolvedValue({
          ticket_id: MOCK_TICKET_ID,
          class_id: MOCK_OFFLINE_CLASS_ID,
          status: 'PENDING',
          student_tuition_amount: 1000000,
          tutor_fee_amount: 350000,
          offline_class: {
            class_id: MOCK_OFFLINE_CLASS_ID,
            class_offline_code: MOCK_CLASS_CODE,
            tutor: { tutor_id: MOCK_TUTOR_A_ID, user_id: MOCK_TUTOR_A_USER_ID },
            student: { student_id: MOCK_STUDENT_ID, user_id: MOCK_STUDENT_USER_ID },
            payments: [
              { payment_id: MOCK_PAYMENT_STUDENT_ID, type: 'STUDENT_TUITION' },
              { payment_id: MOCK_PAYMENT_TUTOR_ID, type: 'TUTOR_PLACEMENT_FEE' },
            ],
          },
        });

        (prisma.refundTicket.update as any).mockResolvedValue({
          ticket_id: MOCK_TICKET_ID,
          status: 'COMPLETED',
          fault_type: 'STUDENT_FAULT',
          student_penalty_amount: 100000,
          student_refund_amount: 900000,
          tutor_refund_amount: 350000,
        });
        (prisma.offlineClass.update as any).mockResolvedValue({ status: 'CANCELLED' });
        (prisma.offlineClassPayment.update as any).mockResolvedValue({});
        (prisma.wallet.upsert as any).mockResolvedValue({});
        (prisma.transaction.create as any).mockResolvedValue({});

        await refundTicketController.adminProcessTicket(req as Request, res);

        expect(res._json.data.status).toBe('COMPLETED');
        expect(prisma.wallet.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { user_id: MOCK_STUDENT_USER_ID },
            update: expect.objectContaining({ balance: { increment: 900000 } }),
          })
        );
        expect(prisma.wallet.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { user_id: MOCK_TUTOR_A_USER_ID },
            update: expect.objectContaining({ balance: { increment: 350000 } }),
          })
        );
      });
    });

    describe('Case 7.4: Admin từ chối hoàn tiền REJECTED', () => {
      it('Admin từ chối -> Ticket chuyển REJECTED, không hoàn tiền, lớp giữ nguyên trạng thái ACTIVE', async () => {
        const req: Partial<Request> = {
          user: { user_id: MOCK_ADMIN_USER_ID, role: 'admin' } as any,
          params: { ticketId: MOCK_TICKET_ID },
          body: {
            status: 'REJECTED',
            admin_note: 'Không đủ bằng chứng xác thực',
          },
        };
        const res = createMockResponse();

        (prisma.refundTicket.findUnique as any).mockResolvedValue({
          ticket_id: MOCK_TICKET_ID,
          class_id: MOCK_OFFLINE_CLASS_ID,
          status: 'PENDING',
        });

        (prisma.refundTicket.update as any).mockResolvedValue({
          ticket_id: MOCK_TICKET_ID,
          status: 'REJECTED',
          admin_note: 'Không đủ bằng chứng xác thực',
        });

        await refundTicketController.adminProcessTicket(req as Request, res);

        expect(res._json.message).toContain('Đã từ chối yêu cầu hủy lớp. Lớp học tiếp tục duy trì trạng thái ACTIVE');
        expect(res._json.data.status).toBe('REJECTED');
        expect(prisma.offlineClass.update).not.toHaveBeenCalled();
        expect(prisma.wallet.upsert).not.toHaveBeenCalled();
      });

      it('Ticket đã được xử lý trước đó (COMPLETED/REJECTED) -> Trả về lỗi 400', async () => {
        const req: Partial<Request> = {
          user: { user_id: MOCK_ADMIN_USER_ID, role: 'admin' } as any,
          params: { ticketId: MOCK_TICKET_ID },
          body: { status: 'REJECTED' },
        };
        const res = createMockResponse();

        (prisma.refundTicket.findUnique as any).mockResolvedValue({
          ticket_id: MOCK_TICKET_ID,
          status: 'COMPLETED',
        });

        await refundTicketController.adminProcessTicket(req as Request, res);

        expect(res._status).toBe(400);
        expect(res._json.message).toContain('đã được xử lý ở trạng thái COMPLETED');
      });
    });
  });
});
