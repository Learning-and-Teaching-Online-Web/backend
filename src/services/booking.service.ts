import { SupabaseClient } from '@supabase/supabase-js';
import { bookingRepository } from '../repositories/booking.repository';
import { courseRepository } from '../repositories/course.repository';

export const bookingService = {
  // Create a new booking
  async createBooking(supabase: SupabaseClient, userId: string, courseId: string, scheduleId: string, notes?: string) {
    // 1. Get or create student profile
    let student = await bookingRepository.findStudentProfileByUserId(supabase, userId);
    if (!student) {
      student = await bookingRepository.createStudentProfile(supabase, userId);
    }

    // 2. Find course details to get the price
    const course = await courseRepository.findById(supabase, courseId);
    if (!course) {
      throw new Error('Không tìm thấy khóa học này');
    }

    // 3. Find schedule in course and validate it
    const schedules = course.schedules || [];
    const schedule = schedules.find((s: any) => s.schedule_id === scheduleId);
    if (!schedule) {
      throw new Error('Lịch học này không thuộc về khóa học đã chọn');
    }
    if (schedule.is_booked) {
      throw new Error('Lịch học này đã được học viên khác đăng ký');
    }

    // 4. Build payload with auto-confirmed & paid status
    const bookingPayload = {
      student_id: student.student_id,
      course_id: courseId,
      schedule_id: scheduleId,
      status: 'confirmed',
      payment_status: 'paid',
      total_amount: Number(course.price),
      currency: 'VND',
      notes: notes || ''
    };

    // 5. Insert booking
    const booking = await bookingRepository.insert(supabase, bookingPayload);

    // 6. Mark schedule as booked
    await bookingRepository.markScheduleBooked(supabase, scheduleId, true);

    return booking;
  },

  // Get bookings for currently logged-in student
  async getMyBookings(supabase: SupabaseClient, userId: string) {
    const student = await bookingRepository.findStudentProfileByUserId(supabase, userId);
    if (!student) {
      return [];
    }

    return await bookingRepository.findByStudentId(supabase, student.student_id);
  }
};
