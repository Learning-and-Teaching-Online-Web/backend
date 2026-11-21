import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { reviewController } from '../review.controller';

// 1. Mock Prisma hoàn toàn độc lập — không kết nối DB thật
vi.mock('../../config/prisma', () => ({
  prisma: {
    booking: { findUnique: vi.fn() },
    review: {
      findUnique: vi.fn(),
      create: vi.fn(),
      aggregate: vi.fn()
    },
    courseSchedule: { findUnique: vi.fn() },
    tutorProfile: { update: vi.fn() }
  }
}));

import { prisma } from '../../config/prisma';

// Helper: tạo mock Response
function createMockResponse() {
  const res: any = {};
  res.status = vi.fn().mockImplementation((code: number) => {
    res._status = code;
    return res;
  });
  res.json = vi.fn().mockImplementation((data: any) => {
    res._json = data;
    return res;
  });
  return res as Response & { _status: number; _json: any };
}

// Mock Data
const MOCK_BOOKING_ID = 'booking-uuid-001';
const MOCK_SCHEDULE_ID = 'schedule-uuid-001';
const MOCK_STUDENT_USER_ID = 'user-student-uuid-001';
const MOCK_STUDENT_ID = 'student-profile-uuid-001';
const MOCK_TUTOR_ID = 'tutor-profile-uuid-001';
const MOCK_COURSE_ID = 'course-uuid-001';

const MOCK_BOOKING = {
  booking_id: MOCK_BOOKING_ID,
  student_id: MOCK_STUDENT_ID,
  course_id: MOCK_COURSE_ID,
  status: 'confirmed',
  payment_status: 'paid',
  student: {
    student_id: MOCK_STUDENT_ID,
    user_id: MOCK_STUDENT_USER_ID
  },
  course: {
    course_id: MOCK_COURSE_ID,
    tutor_id: MOCK_TUTOR_ID,
    type: 'online'
  }
};

const MOCK_REVIEW = {
  review_id: 'review-uuid-001',
  booking_id: MOCK_BOOKING_ID,
  student_id: MOCK_STUDENT_ID,
  tutor_id: MOCK_TUTOR_ID,
  rating: 5,
  comment: 'Gia sư dạy rất dễ hiểu!',
  is_visible: true
};

describe('Review Validation Guard Tests [BE-D05]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Test Case 1: Học sinh gửi đánh giá (1-5 sao) cho buổi đã completed ➜ Lưu thành công, mã 200
  // =========================================================================
  it('Test Case 1: Học sinh gửi đánh giá (1-5 sao) cho buổi đã completed ➜ Lưu thành công, mã 200', async () => {
    // 1. Mock chưa có đánh giá nào cho booking
    vi.mocked(prisma.review.findUnique).mockResolvedValue(null);

    // 2. Mock booking hợp lệ
    vi.mocked(prisma.booking.findUnique).mockResolvedValue(MOCK_BOOKING as any);

    // 3. Mock buổi học ở trạng thái 'completed'
    vi.mocked(prisma.courseSchedule.findUnique).mockResolvedValue({
      schedule_id: MOCK_SCHEDULE_ID,
      course_id: MOCK_COURSE_ID,
      status: 'completed'
    } as any);

    // 4. Mock lưu review thành công và cập nhật tutorProfile
    vi.mocked(prisma.review.create).mockResolvedValue(MOCK_REVIEW as any);
    vi.mocked(prisma.review.aggregate).mockResolvedValue({
      _avg: { rating: 5 },
      _count: { rating: 1 }
    } as any);
    vi.mocked(prisma.tutorProfile.update).mockResolvedValue({} as any);

    const req: Partial<Request> & { user?: any } = {
      body: {
        booking_id: MOCK_BOOKING_ID,
        schedule_id: MOCK_SCHEDULE_ID,
        rating: 5,
        comment: 'Gia sư dạy rất dễ hiểu!'
      },
      user: { user_id: MOCK_STUDENT_USER_ID }
    };
    const res = createMockResponse();

    await reviewController.createReview(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res._json.success).toBe(true);
    expect(res._json.message).toBe('Gửi đánh giá chất lượng giảng dạy thành công!');
    expect(res._json.data).toBeDefined();
    expect(res._json.data.rating).toBe(5);
  });

  // =========================================================================
  // Test Case 2: Học sinh gửi đánh giá cho buổi chưa học (upcoming) ➜ Bị từ chối mã 400 kèm thông báo "Chưa thể đánh giá buổi học chưa diễn ra"
  // =========================================================================
  it('Test Case 2: Học sinh gửi đánh giá cho buổi chưa học (upcoming) ➜ Bị từ chối mã 400 kèm thông báo "Chưa thể đánh giá buổi học chưa diễn ra"', async () => {
    vi.mocked(prisma.review.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.booking.findUnique).mockResolvedValue(MOCK_BOOKING as any);

    // Mock buổi học ở trạng thái 'upcoming'
    vi.mocked(prisma.courseSchedule.findUnique).mockResolvedValue({
      schedule_id: MOCK_SCHEDULE_ID,
      course_id: MOCK_COURSE_ID,
      status: 'upcoming'
    } as any);

    const req: Partial<Request> & { user?: any } = {
      body: {
        booking_id: MOCK_BOOKING_ID,
        schedule_id: MOCK_SCHEDULE_ID,
        rating: 5,
        comment: 'Buổi học sắp tới'
      },
      user: { user_id: MOCK_STUDENT_USER_ID }
    };
    const res = createMockResponse();

    await reviewController.createReview(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res._json.success).toBe(false);
    expect(res._json.error).toBe('Chưa thể đánh giá buổi học chưa diễn ra.');
    // Không được gọi lưu review vào database
    expect(prisma.review.create).not.toHaveBeenCalled();
  });

  // =========================================================================
  // Test Case 3: Buổi học đang diễn ra (ongoing) ➜ Bị từ chối mã 400 kèm thông báo "Chưa thể đánh giá buổi học chưa diễn ra"
  // =========================================================================
  it('Test Case 3: Buổi học đang diễn ra (ongoing) ➜ Bị từ chối mã 400', async () => {
    vi.mocked(prisma.review.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.booking.findUnique).mockResolvedValue(MOCK_BOOKING as any);

    // Mock buổi học ở trạng thái 'ongoing'
    vi.mocked(prisma.courseSchedule.findUnique).mockResolvedValue({
      schedule_id: MOCK_SCHEDULE_ID,
      course_id: MOCK_COURSE_ID,
      status: 'ongoing'
    } as any);

    const req: Partial<Request> & { user?: any } = {
      body: {
        booking_id: MOCK_BOOKING_ID,
        schedule_id: MOCK_SCHEDULE_ID,
        rating: 4
      },
      user: { user_id: MOCK_STUDENT_USER_ID }
    };
    const res = createMockResponse();

    await reviewController.createReview(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res._json.success).toBe(false);
    expect(res._json.error).toBe('Chưa thể đánh giá buổi học chưa diễn ra.');
    expect(prisma.review.create).not.toHaveBeenCalled();
  });

  // =========================================================================
  // Test Case 4: Thiếu booking_id hoặc rating ➜ Trả về 400
  // =========================================================================
  it('Test Case 4: Thiếu booking_id hoặc rating ➜ Trả về 400', async () => {
    const req: Partial<Request> = {
      body: {
        comment: 'Thiếu cả booking_id và rating'
      }
    };
    const res = createMockResponse();

    await reviewController.createReview(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res._json.success).toBe(false);
    expect(res._json.error).toContain('Mã đặt lớp (booking_id) và số sao đánh giá (rating) là bắt buộc');
  });

  // =========================================================================
  // Test Case 5: Số sao ngoài khoảng 1 đến 5 ➜ Trả về 400
  // =========================================================================
  it('Test Case 5: Số sao đánh giá = 6 hoặc 0 ➜ Trả về 400', async () => {
    const req: Partial<Request> = {
      body: {
        booking_id: MOCK_BOOKING_ID,
        rating: 6
      }
    };
    const res = createMockResponse();

    await reviewController.createReview(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res._json.success).toBe(false);
    expect(res._json.error).toBe('Số sao đánh giá phải từ 1 đến 5 sao.');
  });

  // =========================================================================
  // Test Case 6: schedule_id không tồn tại trong hệ thống ➜ Trả về 404
  // =========================================================================
  it('Test Case 6: schedule_id không tồn tại ➜ Trả về 404', async () => {
    vi.mocked(prisma.review.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.booking.findUnique).mockResolvedValue(MOCK_BOOKING as any);
    // Mock không tìm thấy schedule
    vi.mocked(prisma.courseSchedule.findUnique).mockResolvedValue(null);

    const req: Partial<Request> & { user?: any } = {
      body: {
        booking_id: MOCK_BOOKING_ID,
        schedule_id: 'non-existent-schedule',
        rating: 5
      },
      user: { user_id: MOCK_STUDENT_USER_ID }
    };
    const res = createMockResponse();

    await reviewController.createReview(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res._json.success).toBe(false);
    expect(res._json.error).toBe('Không tìm thấy thông tin buổi học.');
  });

  // =========================================================================
  // Test Case 7: Đã gửi review cho booking trước đó ➜ Trả về 400
  // =========================================================================
  it('Test Case 7: Đã gửi đánh giá cho đơn đặt lớp này rồi ➜ Trả về 400', async () => {
    vi.mocked(prisma.review.findUnique).mockResolvedValue(MOCK_REVIEW as any);

    const req: Partial<Request> = {
      body: {
        booking_id: MOCK_BOOKING_ID,
        rating: 5
      }
    };
    const res = createMockResponse();

    await reviewController.createReview(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res._json.success).toBe(false);
    expect(res._json.error).toContain('Bạn đã gửi đánh giá cho đơn đặt lớp này rồi');
  });
});
