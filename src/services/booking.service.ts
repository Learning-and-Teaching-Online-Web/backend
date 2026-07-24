import { bookingRepository } from '../repositories/booking.repository';
import { courseRepository } from '../repositories/course.repository';
import { userRepository } from '../repositories/user.repository';

export const bookingService = {
  // Create a new booking
  async createBooking(userId: string, courseId: string, scheduleId?: string, notes?: string) {
    // 0. Check user role permissions
    const user = await userRepository.findById(userId);
    if (user.role === 'admin') {
      throw new Error('Tài khoản Quản trị viên (Admin) không thể đăng ký khóa học');
    }
    if (user.role === 'tutor') {
      throw new Error('Tài khoản Giảng viên không thể đăng ký khóa học. Vui lòng sử dụng tài khoản Học viên');
    }

    // 1. Get or create student profile
    let student = await bookingRepository.findStudentProfileByUserId(userId);
    if (!student) {
      student = await bookingRepository.createStudentProfile(userId);
    }

    // 2. Find course details to get the price
    const course = await courseRepository.findById(courseId);
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
        
        const newSched = await courseRepository.addSchedule({
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
    const existingBooking = await bookingRepository.findByStudentIdAndCourse(student.student_id, courseId);
    if (existingBooking) {
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
      booking = await bookingRepository.insert(bookingPayload);
    } catch (insertError: any) {
      console.error("Failed to insert booking:", insertError);
      throw new Error(`Lỗi khi tạo đăng ký: ${insertError.message || insertError}`);
    }

    // 7. Mark schedule as booked
    if (finalScheduleId) {
      try {
        await bookingRepository.markScheduleBooked(finalScheduleId, true);
      } catch (schedError: any) {
        console.error("Warning: Failed to mark schedule as booked:", schedError);
        // We do not throw here to allow the student to still see their booking even if schedule status update fails
      }
    }

    return booking;
  },

  // Get bookings for currently logged-in student
  async getMyBookings(userId: string) {
    const student = await bookingRepository.findStudentProfileByUserId(userId);
    if (!student) {
      return [];
    }

    return await bookingRepository.findByStudentId(student.student_id);
  }
};
