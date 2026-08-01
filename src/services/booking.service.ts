import { bookingRepository } from '../repositories/booking.repository';
import { courseRepository } from '../repositories/course.repository';
import { userRepository } from '../repositories/user.repository';
import { prisma } from '../config/prisma';

export const bookingService = {
  // Create a new booking (Supports Online & Offline courses)
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

    // 2. Find course details
    const course = await courseRepository.findById(courseId);
    if (!course) {
      throw new Error('Không tìm thấy khóa học này');
    }

    let finalScheduleId = scheduleId || null;

    // 3. Resolve and validate schedule if passed
    if (finalScheduleId) {
      const schedules = course.schedules || [];
      const schedule = schedules.find((s: any) => s.schedule_id === finalScheduleId);
      if (schedule && schedule.is_booked) {
        throw new Error('Lịch học này đã được học viên khác đăng ký');
      }
    }

    // 4. Check if already enrolled in course
    const existingBooking = await bookingRepository.findByStudentIdAndCourse(student.student_id, courseId);
    if (existingBooking) {
      throw new Error('Bạn đã đăng ký khóa học này rồi');
    }

    // 5. Build payload
    const bookingPayload: any = {
      student_id: student.student_id,
      course_id: courseId,
      schedule_id: finalScheduleId,
      status: 'pending', // MVP: Tutor must manually approve
      payment_status: 'unpaid', // MVP: Payment pending
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

    // 7. Mark schedule as booked if specific schedule was passed
    if (finalScheduleId) {
      try {
        await bookingRepository.markScheduleBooked(finalScheduleId, true);
      } catch (schedError: any) {
        console.error("Warning: Failed to mark schedule as booked:", schedError);
      }
    }

    return booking;
  },

  // Auto-generate ClassSessions for Online Course when Tutor approves booking
  async generateClassSessionsForBooking(bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { booking_id: bookingId },
      include: {
        course: {
          include: { schedules: { orderBy: { start_time: 'asc' } } }
        }
      }
    });

    if (!booking || !booking.course) return;
    
    const course = booking.course;
    
    if (course.type === 'online' && course.start_date && course.end_date) {
      const schedules = course.schedules || [];
      const classSessions = [];
      const startDate = new Date(course.start_date);
      const endDate = new Date(course.end_date);
      
      let curr = new Date(startDate);
      let sessionCount = 0;
      const totalSessions = course.total_sessions || 999; 

      while (curr <= endDate && sessionCount < totalSessions) {
        const dayOfWeek = curr.getDay(); 
        
        const matchingSchedules = schedules.filter((s: any) => s.day_of_week === dayOfWeek && s.is_recurring);
        
        for (const sched of matchingSchedules) {
          if (sessionCount >= totalSessions) break;
          
          const schedStart = new Date(sched.start_time);
          const schedEnd = new Date(sched.end_time);
          
          const actualStart = new Date(curr);
          actualStart.setHours(schedStart.getHours(), schedStart.getMinutes(), 0, 0);
          
          const actualEnd = new Date(curr);
          actualEnd.setHours(schedEnd.getHours(), schedEnd.getMinutes(), 0, 0);
          
          classSessions.push({
            booking_id: booking.booking_id,
            room_id: `room_${booking.booking_id}_${sessionCount + 1}`,
            title: `Buổi ${sessionCount + 1}`,
            scheduled_start: actualStart,
            scheduled_end: actualEnd,
            status: 'scheduled'
          });
          
          sessionCount++;
        }
        curr.setDate(curr.getDate() + 1);
      }

      if (classSessions.length > 0) {
        try {
          await bookingRepository.insertClassSessions(classSessions);
        } catch (sessionError: any) {
          console.error("Failed to generate class sessions:", sessionError);
        }
      }
    }
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
