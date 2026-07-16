import { SupabaseClient } from '@supabase/supabase-js';
import { bookingRepository } from '../repositories/booking.repository';
import { courseRepository } from '../repositories/course.repository';
import { supabaseAdmin } from '../config/supabase-admin';

export const bookingService = {
  // Create a new booking
  async createBooking(supabase: SupabaseClient, userId: string, courseId: string, scheduleId?: string, notes?: string) {
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

    const isFree = Number(course.price) === 0;

    let finalScheduleId = scheduleId;

    // 3. Resolve and validate schedule
    if (finalScheduleId) {
      const schedules = course.schedules || [];
      const schedule = schedules.find((s: any) => s.schedule_id === finalScheduleId);
      if (!schedule) {
        throw new Error('Lịch học này không thuộc về khóa học đã chọn');
      }
      if (schedule.is_booked) {
        throw new Error('Lịch học này đã được học viên khác đăng ký');
      }
    } else {
      if (!isFree) {
        // Khóa học có phí bắt buộc phải chọn lịch học
        throw new Error('Khóa học có phí yêu cầu chọn lịch học và thanh toán');
      }

      // Đối với khóa học free, nếu không gửi scheduleId lên:
      // Tìm xem có schedule nào chưa bị booked không
      const schedules = course.schedules || [];
      const availableSchedule = schedules.find((s: any) => !s.is_booked);
      if (availableSchedule) {
        finalScheduleId = availableSchedule.schedule_id;
      } else {
        // Tự động tạo 1 schedule giả lập (ngày mai) cho khóa học free này
        const now = new Date();
        const start = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h sau
        const end = new Date(start.getTime() + (course.duration_minutes || 60) * 60 * 1000);
        
        const newSched = await courseRepository.addSchedule(supabaseAdmin, {
          course_id: courseId,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          is_booked: false,
          max_slot: 1
        });
        finalScheduleId = newSched.schedule_id;
      }
    }

    // 4. Check if already enrolled
    const existingBookings = await bookingRepository.findByStudentIdAndCourse(supabase, student.student_id, courseId);
    if (existingBookings && existingBookings.length > 0) {
      throw new Error('Bạn đã đăng ký khóa học này rồi');
    }

    // 5. Build payload
    const bookingPayload: any = {
      student_id: student.student_id,
      course_id: courseId,
      schedule_id: finalScheduleId,
      status: 'confirmed',
      payment_status: 'paid',
      total_amount: Number(course.price),
      currency: 'VND',
      notes: notes || ''
    };

    // 6. Insert booking
    let booking;
    try {
      console.log("Inserting booking payload:", bookingPayload);
      booking = await bookingRepository.insert(supabase, bookingPayload);
    } catch (insertError: any) {
      console.error("Failed to insert booking. Payload was:", bookingPayload, "Error:", insertError);
      throw new Error(`Lỗi khi tạo đăng ký: ${insertError.message || insertError}`);
    }

    // 7. Mark schedule as booked
    if (finalScheduleId) {
      try {
        console.log("Marking schedule as booked using admin client. Schedule ID:", finalScheduleId);
        await bookingRepository.markScheduleBooked(supabaseAdmin, finalScheduleId, true);
      } catch (schedError: any) {
        console.error("Warning: Failed to mark schedule as booked:", schedError);
        // We do not throw here to allow the student to still see their booking even if schedule status update fails
      }
    }

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
