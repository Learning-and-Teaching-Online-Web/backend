import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { tutorRepository } from '../repositories/tutor.repository';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const tutorController = {
  // GET /tutors - Lấy tất cả giảng viên
  async getAll(req: Request, res: Response) {
    try {
      const tutors = await tutorRepository.findAll(supabase);

      if (tutors && tutors.length > 0) {
        // Lấy tất cả khóa học của hệ thống
        const { data: courses } = await supabase
          .from('courses')
          .select('course_id, tutor_id');

        // Lấy tất cả đăng ký học hợp lệ (không bị hủy)
        const { data: bookings } = await supabase
          .from('bookings')
          .select('course_id, student_id')
          .neq('status', 'cancelled');

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
      const tutor = await tutorRepository.findById(supabase, tutorId);
      if (!tutor) {
        return res.status(404).json({ success: false, error: 'Tutor not found' });
      }

      // Đếm khóa học của giảng viên này
      const { data: courses } = await supabase
        .from('courses')
        .select('course_id')
        .eq('tutor_id', tutorId);

      const tutorCourses = courses || [];
      tutor.total_courses = tutorCourses.length;

      if (tutorCourses.length > 0) {
        const courseIds = tutorCourses.map((c: any) => c.course_id);
        const { data: bookings } = await supabase
          .from('bookings')
          .select('student_id')
          .in('course_id', courseIds)
          .neq('status', 'cancelled');

        tutor.total_students = new Set((bookings || []).map((b: any) => b.student_id)).size;
      } else {
        tutor.total_students = 0;
      }

      res.json({ success: true, data: tutor });
    } catch (error: any) {
      console.error('Error fetching tutor:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  }
};
