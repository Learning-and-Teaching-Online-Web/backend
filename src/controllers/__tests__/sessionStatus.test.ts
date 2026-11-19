import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Response } from 'express';
import { classroomController } from '../classroom.controller';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';

// 1. Mock Prisma hoàn toàn độc lập, không kết nối DB thật
vi.mock('../../config/prisma', () => ({
  prisma: {
    courseSchedule: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    tutorProfile: {
      findUnique: vi.fn()
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

const MOCK_SCHEDULE_UPCOMING = {
  schedule_id: MOCK_SCHEDULE_ID,
  course_id: MOCK_COURSE_ID,
  session_number: 1,
  start_time: new Date('2026-11-20T08:00:00.000Z'),
  end_time: new Date('2026-11-20T09:00:00.000Z'),
  status: 'upcoming',
  course: {
    course_id: MOCK_COURSE_ID,
    tutor_id: MOCK_TUTOR_ID,
    title: 'Khóa học Luyện thi THPT Toán'
  }
};

const MOCK_SCHEDULE_ONGOING = {
  ...MOCK_SCHEDULE_UPCOMING,
  status: 'ongoing'
};

const MOCK_SCHEDULE_COMPLETED = {
  ...MOCK_SCHEDULE_UPCOMING,
  status: 'completed'
};

describe('Session Status Update & State Transition Tests [BE-D03]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Test Case 1 (Hợp lệ): Gia sư bấm bắt đầu buổi ➜ Trạng thái đổi thành ongoing
  // =========================================================================
  describe('Test Case 1 (Hợp lệ): Gia sư bắt đầu buổi học (upcoming -> ongoing)', () => {
    it('Gia sư bấm bắt đầu buổi -> Trạng thái đổi thành ongoing và trả về 200 OK', async () => {
      // 1. Mock tìm thấy lịch học ở trạng thái 'upcoming'
      vi.mocked(prisma.courseSchedule.findUnique).mockResolvedValue(MOCK_SCHEDULE_UPCOMING as any);

      // 2. Mock thông tin gia sư sở hữu khóa học
      vi.mocked(prisma.tutorProfile.findUnique).mockResolvedValue({
        tutor_id: MOCK_TUTOR_ID,
        user_id: MOCK_TUTOR_USER_ID
      } as any);

      // 3. Mock hàm update thành công
      vi.mocked(prisma.courseSchedule.update).mockResolvedValue({
        ...MOCK_SCHEDULE_UPCOMING,
        status: 'ongoing'
      } as any);

      const req: Partial<AuthenticatedRequest> = {
        user: { id: MOCK_TUTOR_USER_ID, role: 'tutor' },
        params: { scheduleId: MOCK_SCHEDULE_ID },
        body: { status: 'ongoing' }
      };
      const res = createMockResponse();

      await classroomController.updateStatus(req as AuthenticatedRequest, res);

      // Assertions
      expect(res._status).toBe(200);
      expect(res._json.success).toBe(true);
      expect(res._json.message).toMatch(/thành công/i);
      expect(res._json.data).toBeDefined();
      expect(res._json.data.schedule_id).toBe(MOCK_SCHEDULE_ID);
      expect(res._json.data.course_id).toBe(MOCK_COURSE_ID);
      expect(res._json.data.previous_status).toBe('upcoming');
      expect(res._json.data.new_status).toBe('ongoing');

      // Đảm bảo prisma.courseSchedule.update được gọi với đúng dữ liệu
      expect(prisma.courseSchedule.update).toHaveBeenCalledWith({
        where: { schedule_id: MOCK_SCHEDULE_ID },
        data: { status: 'ongoing' }
      });
    });
  });

  // =========================================================================
  // Test Case 2 (Chặn học sinh): Học sinh cố tình gửi request ➜ Bị chặn 403
  // =========================================================================
  describe('Test Case 2 (Chặn học sinh): Học sinh cố tình gửi request đổi trạng thái', () => {
    it('Học sinh gửi request đổi trạng thái buổi học -> Bị chặn 403 Forbidden (Chỉ gia sư mới có quyền)', async () => {
      const req: Partial<AuthenticatedRequest> = {
        user: { id: MOCK_STUDENT_USER_ID, role: 'student' },
        params: { scheduleId: MOCK_SCHEDULE_ID },
        body: { status: 'ongoing' }
      };
      const res = createMockResponse();

      await classroomController.updateStatus(req as AuthenticatedRequest, res);

      // Assertions
      expect(res._status).toBe(403);
      expect(res._json.success).toBe(false);
      expect(res._json.error).toMatch(/chỉ gia sư mới có quyền/i);

      // Database KHÔNG được gọi update
      expect(prisma.courseSchedule.update).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Test Case State Transition: ongoing -> completed & các kịch bản chuyển trạng thái
  // =========================================================================
  describe('State Transition Logic (ongoing -> completed & invalid transitions)', () => {
    it('Gia sư kết thúc buổi học (ongoing -> completed) -> Thành công 200 OK', async () => {
      vi.mocked(prisma.courseSchedule.findUnique).mockResolvedValue(MOCK_SCHEDULE_ONGOING as any);

      vi.mocked(prisma.tutorProfile.findUnique).mockResolvedValue({
        tutor_id: MOCK_TUTOR_ID,
        user_id: MOCK_TUTOR_USER_ID
      } as any);

      vi.mocked(prisma.courseSchedule.update).mockResolvedValue({
        ...MOCK_SCHEDULE_ONGOING,
        status: 'completed'
      } as any);

      const req: Partial<AuthenticatedRequest> = {
        user: { id: MOCK_TUTOR_USER_ID, role: 'tutor' },
        params: { scheduleId: MOCK_SCHEDULE_ID },
        body: { status: 'completed' }
      };
      const res = createMockResponse();

      await classroomController.updateStatus(req as AuthenticatedRequest, res);

      expect(res._status).toBe(200);
      expect(res._json.success).toBe(true);
      expect(res._json.data.previous_status).toBe('ongoing');
      expect(res._json.data.new_status).toBe('completed');
      expect(prisma.courseSchedule.update).toHaveBeenCalledWith({
        where: { schedule_id: MOCK_SCHEDULE_ID },
        data: { status: 'completed' }
      });
    });

    it('Cố chuyển trực tiếp từ upcoming -> completed (bỏ qua ongoing) -> Bị chặn 400 Bad Request', async () => {
      vi.mocked(prisma.courseSchedule.findUnique).mockResolvedValue(MOCK_SCHEDULE_UPCOMING as any);

      vi.mocked(prisma.tutorProfile.findUnique).mockResolvedValue({
        tutor_id: MOCK_TUTOR_ID,
        user_id: MOCK_TUTOR_USER_ID
      } as any);

      const req: Partial<AuthenticatedRequest> = {
        user: { id: MOCK_TUTOR_USER_ID, role: 'tutor' },
        params: { scheduleId: MOCK_SCHEDULE_ID },
        body: { status: 'completed' }
      };
      const res = createMockResponse();

      await classroomController.updateStatus(req as AuthenticatedRequest, res);

      expect(res._status).toBe(400);
      expect(res._json.success).toBe(false);
      expect(res._json.error).toMatch(/không thể chuyển trạng thái từ "upcoming" sang "completed"/i);
      expect(prisma.courseSchedule.update).not.toHaveBeenCalled();
    });

    it('Cố chuyển từ completed -> ongoing (quay lại trạng thái cũ) -> Bị chặn 400 Bad Request', async () => {
      vi.mocked(prisma.courseSchedule.findUnique).mockResolvedValue(MOCK_SCHEDULE_COMPLETED as any);

      vi.mocked(prisma.tutorProfile.findUnique).mockResolvedValue({
        tutor_id: MOCK_TUTOR_ID,
        user_id: MOCK_TUTOR_USER_ID
      } as any);

      const req: Partial<AuthenticatedRequest> = {
        user: { id: MOCK_TUTOR_USER_ID, role: 'tutor' },
        params: { scheduleId: MOCK_SCHEDULE_ID },
        body: { status: 'ongoing' }
      };
      const res = createMockResponse();

      await classroomController.updateStatus(req as AuthenticatedRequest, res);

      expect(res._status).toBe(400);
      expect(res._json.success).toBe(false);
      expect(res._json.error).toMatch(/không thể chuyển trạng thái từ "completed" sang "ongoing"/i);
      expect(prisma.courseSchedule.update).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Test Case Edge Cases: Validation, Quyền sở hữu & Buổi học không tồn tại
  // =========================================================================
  describe('Edge Cases & Validation', () => {
    it('Thiếu field status trong body -> Trả về lỗi 400 Bad Request', async () => {
      const req: Partial<AuthenticatedRequest> = {
        user: { id: MOCK_TUTOR_USER_ID, role: 'tutor' },
        params: { scheduleId: MOCK_SCHEDULE_ID },
        body: {}
      };
      const res = createMockResponse();

      await classroomController.updateStatus(req as AuthenticatedRequest, res);

      expect(res._status).toBe(400);
      expect(res._json.success).toBe(false);
      expect(res._json.error).toMatch(/trường status là bắt buộc/i);
    });

    it('Gửi status không nằm trong danh sách cho phép (ongoing, completed) -> Trả về lỗi 400', async () => {
      const req: Partial<AuthenticatedRequest> = {
        user: { id: MOCK_TUTOR_USER_ID, role: 'tutor' },
        params: { scheduleId: MOCK_SCHEDULE_ID },
        body: { status: 'invalid_status' }
      };
      const res = createMockResponse();

      await classroomController.updateStatus(req as AuthenticatedRequest, res);

      expect(res._status).toBe(400);
      expect(res._json.success).toBe(false);
      expect(res._json.error).toMatch(/trạng thái không hợp lệ/i);
    });

    it('Gia sư khác (không sở hữu khóa học) cố thay đổi trạng thái -> Bị chặn 403 Forbidden', async () => {
      vi.mocked(prisma.courseSchedule.findUnique).mockResolvedValue(MOCK_SCHEDULE_UPCOMING as any);

      // Gia sư khác có tutor_id khác với course.tutor_id
      vi.mocked(prisma.tutorProfile.findUnique).mockResolvedValue({
        tutor_id: 'other-tutor-profile-uuid',
        user_id: 'user-other-tutor-uuid'
      } as any);

      const req: Partial<AuthenticatedRequest> = {
        user: { id: 'user-other-tutor-uuid', role: 'tutor' },
        params: { scheduleId: MOCK_SCHEDULE_ID },
        body: { status: 'ongoing' }
      };
      const res = createMockResponse();

      await classroomController.updateStatus(req as AuthenticatedRequest, res);

      expect(res._status).toBe(403);
      expect(res._json.success).toBe(false);
      expect(res._json.error).toMatch(/không phải gia sư của khóa học/i);
      expect(prisma.courseSchedule.update).not.toHaveBeenCalled();
    });

    it('scheduleId không tồn tại -> Trả về lỗi 404 Not Found', async () => {
      vi.mocked(prisma.courseSchedule.findUnique).mockResolvedValue(null);

      const req: Partial<AuthenticatedRequest> = {
        user: { id: MOCK_TUTOR_USER_ID, role: 'tutor' },
        params: { scheduleId: 'non-existing-schedule-id' },
        body: { status: 'ongoing' }
      };
      const res = createMockResponse();

      await classroomController.updateStatus(req as AuthenticatedRequest, res);

      expect(res._status).toBe(404);
      expect(res._json.success).toBe(false);
      expect(res._json.error).toMatch(/không tìm thấy lịch học này/i);
    });

    it('Người dùng chưa xác thực (thiếu userId / userRole) -> Trả về lỗi 401 Unauthorized', async () => {
      const req: Partial<AuthenticatedRequest> = {
        user: undefined,
        params: { scheduleId: MOCK_SCHEDULE_ID },
        body: { status: 'ongoing' }
      };
      const res = createMockResponse();

      await classroomController.updateStatus(req as AuthenticatedRequest, res);

      expect(res._status).toBe(401);
      expect(res._json.success).toBe(false);
      expect(res._json.error).toMatch(/unauthorized/i);
    });
  });
});
