import { Request, Response } from 'express';
import { tutorRepository } from '../repositories/tutor.repository';
import { prisma } from '../config/prisma';

export const tutorController = {
  // GET /tutors - Lấy tất cả giảng viên
  async getAll(req: Request, res: Response) {
    try {
      const tutors = await tutorRepository.findAll();

      if (tutors && tutors.length > 0) {
        // Lấy tất cả khóa học của hệ thống
        const courses = await prisma.course.findMany({
          select: { course_id: true, tutor_id: true }
        });

        // Lấy tất cả đăng ký học hợp lệ (không bị hủy)
        const bookings = await prisma.booking.findMany({
          where: { status: { not: 'cancelled' } },
          select: { course_id: true, student_id: true }
        });

        const courseMap = courses || [];
        const bookingMap = bookings || [];

        tutors.forEach((tutor: any) => {
          // Đếm số khóa học của giảng viên này
          const tutorCourses = courseMap.filter((c: any) => c.tutor_id === tutor.tutor_id);
          tutor.total_courses = tutorCourses.length;

          // Danh sách các course_id của giảng viên này
          const tutorCourseIds = new Set(tutorCourses.map((c: any) => c.course_id));

          // Đọc danh sách học viên đăng ký các khóa học này
          const tutorBookings = bookingMap.filter((b: any) => tutorCourseIds.has(b.course_id));

          // Số học viên độc nhất (unique student_id)
          tutor.total_students = new Set(tutorBookings.map((b: any) => b.student_id)).size;
        });
      }

      res.json({ success: true, data: tutors });
    } catch (error: any) {
      console.error('Error fetching tutors:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },

  // GET /tutors/:tutorId - Lấy chi tiết một giảng viên
  async getById(req: Request, res: Response) {
    try {
      const tutorId = req.params.tutorId as string;
      const tutor = await tutorRepository.findById(tutorId);
      if (!tutor) {
        return res.status(404).json({ success: false, error: 'Tutor not found' });
      }

      // Đếm khóa học của giảng viên này
      const courses = await prisma.course.findMany({
        where: { tutor_id: tutorId },
        select: { course_id: true }
      });

      const tutorCourses = courses || [];
      (tutor as any).total_courses = tutorCourses.length;

      if (tutorCourses.length > 0) {
        const courseIds = tutorCourses.map((c: any) => c.course_id);
        const bookings = await prisma.booking.findMany({
          where: {
            course_id: { in: courseIds },
            status: { not: 'cancelled' }
          },
          select: { student_id: true }
        });

        (tutor as any).total_students = new Set((bookings || []).map((b: any) => b.student_id)).size;
      } else {
        (tutor as any).total_students = 0;
      }

      res.json({ success: true, data: tutor });
    } catch (error: any) {
      console.error('Error fetching tutor:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  }
};
