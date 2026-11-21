import { describe, it, expect, vi, beforeEach } from 'vitest';
import { courseService, calculateCourseProgress } from '../course.service';
import { prisma } from '../../config/prisma';

// Mock Prisma client theo quy định: dùng Mock, không đưa dữ liệu vào DB thật
vi.mock('../../config/prisma', () => ({
  prisma: {
    booking: {
      findFirst: vi.fn()
    },
    courseSchedule: {
      findMany: vi.fn()
    }
  }
}));

describe('courseService.calculateCourseProgress [BE-D04]', () => {
  const mockCourseId = 'mock-course-uuid-001';
  const mockStudentId = 'mock-student-uuid-001';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Test Case 1: Tổng 10 buổi, đã completed 3 buổi ➜ Trả về chính xác 30%
  // =========================================================================
  it('Test Case 1: Tổng 10 buổi, đã completed 3 buổi ➜ Trả về chính xác 30%', async () => {
    // 1. Mock student có booking hợp lệ
    (prisma.booking.findFirst as any).mockResolvedValue({
      booking_id: 'booking-001',
      student_id: mockStudentId,
      course_id: mockCourseId,
      status: 'confirmed'
    });

    // 2. Mock 10 buổi học: 3 buổi completed, 7 buổi upcoming
    const sessions = [
      ...Array(3).fill(null).map((_, i) => ({
        schedule_id: `schedule-completed-${i + 1}`,
        course_id: mockCourseId,
        session_number: i + 1,
        status: 'completed'
      })),
      ...Array(7).fill(null).map((_, i) => ({
        schedule_id: `schedule-upcoming-${i + 4}`,
        course_id: mockCourseId,
        session_number: i + 4,
        status: 'upcoming'
      }))
    ];
    (prisma.courseSchedule.findMany as any).mockResolvedValue(sessions);

    // 3. Thực thi hàm tính tiến độ qua courseService
    const progressViaService = await courseService.calculateCourseProgress(
      mockCourseId,
      mockStudentId
    );

    // 4. Kiểm tra kết quả: (3 / 10) * 100 = 30%
    expect(progressViaService).toBe(30);

    // 5. Kiểm tra kết quả khi gọi qua standalone function
    const progressViaFunction = await calculateCourseProgress(
      mockCourseId,
      mockStudentId
    );
    expect(progressViaFunction).toBe(30);
  });

  // =========================================================================
  // Test Case 2a: Khóa học 0 buổi ➜ Trả về 0%, không bị lỗi chia cho 0 (NaN)
  // =========================================================================
  it('Test Case 2a: Khóa học 0 buổi ➜ Trả về 0%, không bị lỗi chia cho 0 (NaN)', async () => {
    // Mock student có booking hợp lệ
    (prisma.booking.findFirst as any).mockResolvedValue({
      booking_id: 'booking-002',
      student_id: mockStudentId,
      course_id: mockCourseId,
      status: 'confirmed'
    });

    // Mock danh sách buổi học rỗng (0 buổi)
    (prisma.courseSchedule.findMany as any).mockResolvedValue([]);

    const result = await courseService.calculateCourseProgress(
      mockCourseId,
      mockStudentId
    );

    expect(result).toBe(0);
    expect(Number.isNaN(result)).toBe(false);
  });

  // =========================================================================
  // Test Case 2b: Chưa học buổi nào (0 completed) ➜ Trả về 0%, không bị NaN
  // =========================================================================
  it('Test Case 2b: Khóa học chưa học buổi nào ➜ Trả về 0%, không bị lỗi chia cho 0 (NaN)', async () => {
    // Mock student có booking hợp lệ
    (prisma.booking.findFirst as any).mockResolvedValue({
      booking_id: 'booking-003',
      student_id: mockStudentId,
      course_id: mockCourseId,
      status: 'confirmed'
    });

    // Mock 5 buổi học nhưng tất cả đều ở trạng thái 'upcoming'
    const sessions = Array(5).fill(null).map((_, i) => ({
      schedule_id: `schedule-${i + 1}`,
      course_id: mockCourseId,
      session_number: i + 1,
      status: 'upcoming'
    }));
    (prisma.courseSchedule.findMany as any).mockResolvedValue(sessions);

    const result = await courseService.calculateCourseProgress(
      mockCourseId,
      mockStudentId
    );

    expect(result).toBe(0);
    expect(Number.isNaN(result)).toBe(false);
  });

  // =========================================================================
  // Test Case 3: Học sinh chưa đăng ký hoặc không có booking ➜ Trả về 0%
  // =========================================================================
  it('Test Case 3: Học sinh chưa có booking hợp lệ ➜ Trả về 0%', async () => {
    (prisma.booking.findFirst as any).mockResolvedValue(null);

    const result = await courseService.calculateCourseProgress(
      mockCourseId,
      mockStudentId
    );

    expect(result).toBe(0);
    // Không cần gọi database courseSchedule nếu không có booking hợp lệ
    expect(prisma.courseSchedule.findMany).not.toHaveBeenCalled();
  });

  // =========================================================================
  // Test Case 4: Khóa học hoàn thành 100% ➜ Trả về 100%
  // =========================================================================
  it('Test Case 4: Tất cả 8/8 buổi đều đã completed ➜ Trả về chính xác 100%', async () => {
    (prisma.booking.findFirst as any).mockResolvedValue({
      booking_id: 'booking-004',
      student_id: mockStudentId,
      course_id: mockCourseId,
      status: 'completed'
    });

    const sessions = Array(8).fill(null).map((_, i) => ({
      schedule_id: `schedule-${i + 1}`,
      course_id: mockCourseId,
      session_number: i + 1,
      status: 'completed'
    }));
    (prisma.courseSchedule.findMany as any).mockResolvedValue(sessions);

    const result = await courseService.calculateCourseProgress(
      mockCourseId,
      mockStudentId
    );

    expect(result).toBe(100);
  });

  // =========================================================================
  // Test Case 5: Tỷ lệ phần trăm làm tròn 2 chữ số thập phân (1/3 buổi = 33.33%)
  // =========================================================================
  it('Test Case 5: Tỷ lệ lẻ (1/3 buổi completed) ➜ Làm tròn 2 chữ số thập phân thành 33.33%', async () => {
    (prisma.booking.findFirst as any).mockResolvedValue({
      booking_id: 'booking-005',
      student_id: mockStudentId,
      course_id: mockCourseId,
      status: 'confirmed'
    });

    const sessions = [
      { schedule_id: 's-1', course_id: mockCourseId, session_number: 1, status: 'completed' },
      { schedule_id: 's-2', course_id: mockCourseId, session_number: 2, status: 'upcoming' },
      { schedule_id: 's-3', course_id: mockCourseId, session_number: 3, status: 'upcoming' }
    ];
    (prisma.courseSchedule.findMany as any).mockResolvedValue(sessions);

    const result = await courseService.calculateCourseProgress(
      mockCourseId,
      mockStudentId
    );

    expect(result).toBe(33.33);
  });
});
