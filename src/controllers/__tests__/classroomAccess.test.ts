import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Response, Request } from 'express';
import { classroomController } from '../classroom.controller';
import { verifyAuth, AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { jwtUtil } from '../../utils/jwt.util';

// 1. Mock Prisma hoàn toàn độc lập, không kết nối DB thật
vi.mock('../../config/prisma', () => ({
  prisma: {
    courseSchedule: {
      findUnique: vi.fn()
    },
    tutorProfile: {
      findUnique: vi.fn()
    },
    studentProfile: {
      findUnique: vi.fn()
    },
    booking: {
      findFirst: vi.fn()
    }
  }
}));

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
  return res as Response & { _status: number; _json: any };
}

// Mock Data
const MOCK_SCHEDULE_ID = 'schedule-uuid-1111';
const MOCK_COURSE_ID = 'course-uuid-2222';
const MOCK_TUTOR_USER_ID = 'user-tutor-uuid-3333';
const MOCK_TUTOR_ID = 'tutor-profile-uuid-4444';
const MOCK_STUDENT_USER_ID = 'user-student-uuid-5555';
const MOCK_STUDENT_ID = 'student-profile-uuid-6666';

const MOCK_SCHEDULE = {
  schedule_id: MOCK_SCHEDULE_ID,
  course_id: MOCK_COURSE_ID,
  session_number: 1,
  start_time: new Date('2026-11-20T08:00:00.000Z'),
  end_time: new Date('2026-11-20T09:00:00.000Z'),
  max_slot: 5,
  booked_count: 1,
  status: 'upcoming',
  course: {
    course_id: MOCK_COURSE_ID,
    tutor_id: MOCK_TUTOR_ID,
    title: 'Khóa học Luyện thi THPT Toán'
  }
};

describe('Classroom Access Guard Tests [BE-D02]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Xác thực token (verifyAuth middleware)
  // =========================================================================
  describe('Xác thực Token (verifyAuth middleware)', () => {
    it('Thiếu Authorization Header -> Trả về lỗi 401 Unauthorized', async () => {
      const req: Partial<Request> = {
        headers: {}
      };
      const res = createMockResponse();
      const next = vi.fn();

      await verifyAuth(req as Request, res, next);

      expect(res._status).toBe(401);
      expect(res._json.success).toBe(false);
      expect(res._json.error).toMatch(/unauthorized/i);
      expect(next).not.toHaveBeenCalled();
    });

    it('Token không đúng định dạng Bearer -> Trả về lỗi 401', async () => {
      const req: Partial<Request> = {
        headers: { authorization: 'Basic invalidtoken123' }
      };
      const res = createMockResponse();
      const next = vi.fn();

      await verifyAuth(req as Request, res, next);

      expect(res._status).toBe(401);
      expect(res._json.success).toBe(false);
      expect(next).not.toHaveBeenCalled();
    });

    it('Token hết hạn hoặc không hợp lệ -> Trả về lỗi 401', async () => {
      const req: Partial<Request> = {
        headers: { authorization: 'Bearer invalid.token.format' }
      };
      const res = createMockResponse();
      const next = vi.fn();

      await verifyAuth(req as Request, res, next);

      expect(res._status).toBe(401);
      expect(res._json.error).toMatch(/expired or invalid/i);
      expect(next).not.toHaveBeenCalled();
    });

    it('Token hợp lệ -> Gắn req.user và gọi next()', async () => {
      const validToken = jwtUtil.generateAccessToken({
        userId: MOCK_STUDENT_USER_ID,
        email: 'student@example.com',
        role: 'student'
      });

      const req: Partial<AuthenticatedRequest> = {
        headers: { authorization: `Bearer ${validToken}` }
      };
      const res = createMockResponse();
      const next = vi.fn();

      await verifyAuth(req as Request, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(MOCK_STUDENT_USER_ID);
      expect(req.user.role).toBe('student');
    });
  });

  // =========================================================================
  // Test Case 1 (Học sinh hợp lệ): Đã thanh toán -> 200 OK + room_id
  // =========================================================================
  describe('Test Case 1 (Học sinh hợp lệ): Học sinh đã thanh toán khóa học', () => {
    it('Học sinh đã thanh toán khóa học -> Trả về status 200 kèm room_id', async () => {
      // Mock schedule tìm thấy
      vi.mocked(prisma.courseSchedule.findUnique).mockResolvedValue(MOCK_SCHEDULE as any);

      // Mock student profile tìm thấy
      vi.mocked(prisma.studentProfile.findUnique).mockResolvedValue({
        student_id: MOCK_STUDENT_ID,
        user_id: MOCK_STUDENT_USER_ID
      } as any);

      // Mock booking hợp lệ: đã thanh toán (paid) và đã xác nhận (confirmed)
      vi.mocked(prisma.booking.findFirst).mockResolvedValue({
        booking_id: 'booking-uuid-7777',
        student_id: MOCK_STUDENT_ID,
        course_id: MOCK_COURSE_ID,
        payment_status: 'paid',
        status: 'confirmed'
      } as any);

      const req: Partial<AuthenticatedRequest> = {
        user: { id: MOCK_STUDENT_USER_ID, role: 'student' },
        params: { scheduleId: MOCK_SCHEDULE_ID }
      };
      const res = createMockResponse();

      await classroomController.checkAccess(req as AuthenticatedRequest, res);

      // 1. Phải trả về HTTP status 200
      expect(res._status).toBe(200);

      // 2. Response phải có success: true và room_id
      expect(res._json.success).toBe(true);
      expect(res._json.data).toBeDefined();
      expect(res._json.data.can_access).toBe(true);
      expect(res._json.data.room_id).toBe(`room_${MOCK_SCHEDULE_ID}`);
      expect(res._json.data.schedule_id).toBe(MOCK_SCHEDULE_ID);
      expect(res._json.data.course_id).toBe(MOCK_COURSE_ID);
      expect(res._json.data.user_role).toBe('student');
    });
  });

  // =========================================================================
  // Test Case 2 (Từ chối truy cập): Học sinh chưa mua hoặc chưa thanh toán -> 403 Forbidden
  // =========================================================================
  describe('Test Case 2 (Từ chối truy cập): Học sinh chưa mua hoặc chưa thanh toán', () => {
    it('Học sinh chưa từng đăng ký khóa học -> Bắt buộc trả về mã lỗi 403 Forbidden', async () => {
      vi.mocked(prisma.courseSchedule.findUnique).mockResolvedValue(MOCK_SCHEDULE as any);

      vi.mocked(prisma.studentProfile.findUnique).mockResolvedValue({
        student_id: MOCK_STUDENT_ID,
        user_id: MOCK_STUDENT_USER_ID
      } as any);

      // Không tìm thấy booking hợp lệ
      vi.mocked(prisma.booking.findFirst).mockResolvedValue(null);

      const req: Partial<AuthenticatedRequest> = {
        user: { id: MOCK_STUDENT_USER_ID, role: 'student' },
        params: { scheduleId: MOCK_SCHEDULE_ID }
      };
      const res = createMockResponse();

      await classroomController.checkAccess(req as AuthenticatedRequest, res);

      // Phải trả về mã lỗi 403 Forbidden
      expect(res._status).toBe(403);
      expect(res._json.success).toBe(false);
      expect(res._json.error).toMatch(/chưa mua hoặc chưa thanh toán/i);
    });

    it('Học sinh có booking nhưng chưa thanh toán (unpaid) -> Bắt buộc trả về mã lỗi 403 Forbidden', async () => {
      vi.mocked(prisma.courseSchedule.findUnique).mockResolvedValue(MOCK_SCHEDULE as any);

      vi.mocked(prisma.studentProfile.findUnique).mockResolvedValue({
        student_id: MOCK_STUDENT_ID,
        user_id: MOCK_STUDENT_USER_ID
      } as any);

      // Prisma findFirst kiểm tra payment_status: 'paid', nếu unpaid thì trả về null
      vi.mocked(prisma.booking.findFirst).mockResolvedValue(null);

      const req: Partial<AuthenticatedRequest> = {
        user: { id: MOCK_STUDENT_USER_ID, role: 'student' },
        params: { scheduleId: MOCK_SCHEDULE_ID }
      };
      const res = createMockResponse();

      await classroomController.checkAccess(req as AuthenticatedRequest, res);

      expect(res._status).toBe(403);
      expect(res._json.success).toBe(false);
      expect(res._json.error).toMatch(/chưa mua hoặc chưa thanh toán/i);
    });

    it('Học sinh chưa tạo hồ sơ học viên -> Trả về lỗi 403 Forbidden', async () => {
      vi.mocked(prisma.courseSchedule.findUnique).mockResolvedValue(MOCK_SCHEDULE as any);

      // studentProfile không tìm thấy
      vi.mocked(prisma.studentProfile.findUnique).mockResolvedValue(null);

      const req: Partial<AuthenticatedRequest> = {
        user: { id: 'unknown-student-id', role: 'student' },
        params: { scheduleId: MOCK_SCHEDULE_ID }
      };
      const res = createMockResponse();

      await classroomController.checkAccess(req as AuthenticatedRequest, res);

      expect(res._status).toBe(403);
      expect(res._json.success).toBe(false);
    });
  });

  // =========================================================================
  // Test Case 3 (Gia sư hợp lệ): Gia sư sở hữu khóa học -> 200 OK
  // =========================================================================
  describe('Test Case 3 (Gia sư hợp lệ): Gia sư sở hữu khóa học', () => {
    it('Gia sư sở hữu khóa học -> Trả về status 200 kèm room_id', async () => {
      vi.mocked(prisma.courseSchedule.findUnique).mockResolvedValue(MOCK_SCHEDULE as any);

      // Tutor profile có tutor_id khớp với course.tutor_id
      vi.mocked(prisma.tutorProfile.findUnique).mockResolvedValue({
        tutor_id: MOCK_TUTOR_ID,
        user_id: MOCK_TUTOR_USER_ID
      } as any);

      const req: Partial<AuthenticatedRequest> = {
        user: { id: MOCK_TUTOR_USER_ID, role: 'tutor' },
        params: { scheduleId: MOCK_SCHEDULE_ID }
      };
      const res = createMockResponse();

      await classroomController.checkAccess(req as AuthenticatedRequest, res);

      expect(res._status).toBe(200);
      expect(res._json.success).toBe(true);
      expect(res._json.data.can_access).toBe(true);
      expect(res._json.data.room_id).toBe(`room_${MOCK_SCHEDULE_ID}`);
      expect(res._json.data.user_role).toBe('tutor');
    });

    it('Gia sư khác KHÔNG sở hữu khóa học -> Bắt buộc trả về lỗi 403 Forbidden', async () => {
      vi.mocked(prisma.courseSchedule.findUnique).mockResolvedValue(MOCK_SCHEDULE as any);

      // Gia sư khác có tutor_id khác với course.tutor_id
      vi.mocked(prisma.tutorProfile.findUnique).mockResolvedValue({
        tutor_id: 'other-tutor-uuid-9999',
        user_id: 'user-other-tutor-9999'
      } as any);

      const req: Partial<AuthenticatedRequest> = {
        user: { id: 'user-other-tutor-9999', role: 'tutor' },
        params: { scheduleId: MOCK_SCHEDULE_ID }
      };
      const res = createMockResponse();

      await classroomController.checkAccess(req as AuthenticatedRequest, res);

      expect(res._status).toBe(403);
      expect(res._json.success).toBe(false);
      expect(res._json.error).toMatch(/không phải gia sư của khóa học/i);
    });
  });

  // =========================================================================
  // Test Case Phụ: Buổi học không tồn tại -> 404 Not Found
  // =========================================================================
  describe('Test Case Edge: Lịch học không tồn tại (404)', () => {
    it('scheduleId không tồn tại -> Trả về mã lỗi 404 Not Found', async () => {
      vi.mocked(prisma.courseSchedule.findUnique).mockResolvedValue(null);

      const req: Partial<AuthenticatedRequest> = {
        user: { id: MOCK_STUDENT_USER_ID, role: 'student' },
        params: { scheduleId: 'non-existing-schedule' }
      };
      const res = createMockResponse();

      await classroomController.checkAccess(req as AuthenticatedRequest, res);

      expect(res._status).toBe(404);
      expect(res._json.success).toBe(false);
      expect(res._json.error).toMatch(/không tìm thấy lịch học/i);
    });
  });
});
