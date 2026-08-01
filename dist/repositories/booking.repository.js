"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingRepository = void 0;
const prisma_1 = require("../config/prisma");
exports.bookingRepository = {
    // Find student profile by user_id
    async findStudentProfileByUserId(userId) {
        const data = await prisma_1.prisma.studentProfile.findUnique({
            where: { user_id: userId }
        });
        return data;
    },
    // Create student profile for user
    async createStudentProfile(userId) {
        const data = await prisma_1.prisma.studentProfile.create({
            data: { user_id: userId }
        });
        return data;
    },
    // Insert new booking
    async insert(bookingData) {
        const data = await prisma_1.prisma.booking.create({
            data: bookingData
        });
        return data;
    },
    // Find bookings by studentId, joining courses and tutor profile/user info
    async findByStudentId(studentId) {
        const bookings = await prisma_1.prisma.booking.findMany({
            where: { student_id: studentId },
            include: {
                course: {
                    include: {
                        tutor: {
                            include: {
                                user: {
                                    select: {
                                        user_profile: {
                                            select: { full_name: true, avatar_url: true }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                schedule: true
            },
            orderBy: { created_at: 'desc' }
        });
        return bookings.map((b) => {
            if (b.course?.tutor?.user) {
                b.course.tutor.user.full_name = b.course.tutor.user.user_profile?.full_name || '';
                b.course.tutor.user.avatar_url = b.course.tutor.user.user_profile?.avatar_url || null;
            }
            return b;
        });
    },
    // Check if student already enrolled in a specific course
    async findByStudentIdAndCourse(studentId, courseId) {
        const data = await prisma_1.prisma.booking.findFirst({
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
    async markScheduleBooked(scheduleId, isBooked) {
        const data = await prisma_1.prisma.courseSchedule.update({
            where: { schedule_id: scheduleId },
            data: { is_booked: isBooked }
        });
        return data;
    },
    // Insert multiple ClassSessions (Batch Insert)
    async insertClassSessions(sessions) {
        const data = await prisma_1.prisma.classSession.createMany({
            data: sessions
        });
        return data;
    }
};
