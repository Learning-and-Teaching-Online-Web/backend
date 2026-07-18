import { prisma } from '../config/prisma';

export const bookingRepository = {
  // Find student profile by user_id
  async findStudentProfileByUserId(userId: string) {
    const data = await prisma.studentProfile.findUnique({
      where: { user_id: userId }
    });

    return data;
  },

  // Create student profile for user
  async createStudentProfile(userId: string) {
    const data = await prisma.studentProfile.create({
      data: { user_id: userId }
    });

    return data;
  },

  // Insert new booking
  async insert(bookingData: any) {
    const data = await prisma.booking.create({
      data: bookingData
    });

    return data;
  },

  // Find bookings by studentId, joining courses and tutor profile/user info
  async findByStudentId(studentId: string) {
    const data = await prisma.booking.findMany({
      where: { student_id: studentId },
      include: {
        course: {
          include: {
            tutor: {
              include: {
                user: {
                  select: { full_name: true, avatar_url: true }
                }
              }
            }
          }
        },
        schedule: true
      },
      orderBy: { created_at: 'desc' }
    });

    return data;
  },

  // Check if student already enrolled in a specific course
  async findByStudentIdAndCourse(studentId: string, courseId: string) {
    const data = await prisma.booking.findFirst({
      where: {
        student_id: studentId,
        course_id: courseId,
        status: { not: 'cancelled' }
      },
      select: { booking_id: true }
    });

    return data;
  },

  // Mark schedule as booked
  async markScheduleBooked(scheduleId: string, isBooked: boolean) {
    const data = await prisma.courseSchedule.update({
      where: { schedule_id: scheduleId },
      data: { is_booked: isBooked }
    });

    return data;
  }
};
