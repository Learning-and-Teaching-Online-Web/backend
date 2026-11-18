import { prisma } from '../config/prisma';
import { ClassroomAccessResult } from '../types/classroom.types';

export class ClassroomAccessError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 403) {
    super(message);
    this.name = 'ClassroomAccessError';
    this.statusCode = statusCode;
  }
}

export const classroomService = {
  /**
   * Kiểm tra quyền truy cập vào phòng học của học sinh hoặc gia sư
   * @param scheduleId ID của buổi học (CourseSchedule)
   * @param userId ID của người dùng (User)
   * @param userRole Vai trò người dùng ('student' | 'tutor' | 'admin')
   */
  async checkClassroomAccess(
    scheduleId: string,
    userId: string,
    userRole: string
  ): Promise<ClassroomAccessResult> {
    if (!scheduleId) {
      throw new ClassroomAccessError('Mã buổi học (scheduleId) là bắt buộc', 400);
    }
    if (!userId) {
      throw new ClassroomAccessError('Mã người dùng (userId) là bắt buộc', 401);
    }

    // 1. Tìm thông tin buổi học và khóa học liên quan
    const schedule = await prisma.courseSchedule.findUnique({
      where: { schedule_id: scheduleId },
      include: {
        course: {
          select: {
            course_id: true,
            tutor_id: true,
            title: true
          }
        }
      }
    });

    if (!schedule) {
      throw new ClassroomAccessError('Không tìm thấy lịch học này', 404);
    }

    const roomId = `room_${schedule.schedule_id}`;

    // 2. Phân quyền theo vai trò Gia sư
    if (userRole === 'tutor') {
      const tutor = await prisma.tutorProfile.findUnique({
        where: { user_id: userId },
        select: { tutor_id: true }
      });

      if (!tutor) {
        throw new ClassroomAccessError('Hồ sơ gia sư không tồn tại', 403);
      }

      if (schedule.course.tutor_id !== tutor.tutor_id) {
        throw new ClassroomAccessError('Bạn không có quyền vào phòng học này (không phải gia sư của khóa học)', 403);
      }

      return {
        can_access: true,
        schedule_id: schedule.schedule_id,
        course_id: schedule.course_id,
        course_title: schedule.course.title,
        room_id: roomId,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        user_role: 'tutor',
        user_id: userId
      };
    }

    // 3. Phân quyền theo vai trò Học sinh
    if (userRole === 'student') {
      const student = await prisma.studentProfile.findUnique({
        where: { user_id: userId },
        select: { student_id: true }
      });

      if (!student) {
        throw new ClassroomAccessError('Học sinh chưa tạo hồ sơ học viên', 403);
      }

      // Kiểm tra đơn đăng ký hợp lệ: đã thanh toán (paid) và đã xác nhận (confirmed hoặc completed)
      const validBooking = await prisma.booking.findFirst({
        where: {
          student_id: student.student_id,
          course_id: schedule.course_id,
          payment_status: 'paid',
          status: { in: ['confirmed', 'completed'] }
        },
        select: { booking_id: true }
      });

      if (!validBooking) {
        throw new ClassroomAccessError('Học sinh chưa mua hoặc chưa thanh toán khóa học', 403);
      }

      return {
        can_access: true,
        schedule_id: schedule.schedule_id,
        course_id: schedule.course_id,
        course_title: schedule.course.title,
        room_id: roomId,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        user_role: 'student',
        user_id: userId
      };
    }

    // 4. Các role khác không được phép truy cập
    throw new ClassroomAccessError('Vai trò người dùng không có quyền truy cập vào phòng học', 403);
  }
};
