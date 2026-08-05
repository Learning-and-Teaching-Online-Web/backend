"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.courseRepository = void 0;
const prisma_1 = require("../config/prisma");
function formatCourseUser(course) {
    if (!course)
        return course;
    if (course.tutor) {
        const displayName = (course.tutor.full_name && course.tutor.full_name !== 'Người dùng')
            ? course.tutor.full_name
            : (course.tutor.user?.email ? course.tutor.user.email.split('@')[0] : 'Giảng viên');
        course.tutor.full_name = displayName;
        if (course.tutor.user) {
            course.tutor.user.full_name = displayName;
            course.tutor.user.avatar_url = course.tutor.avatar_url || null;
        }
    }
    return course;
}
exports.courseRepository = {
    // Find course details including tutor, schedules, lessons, documents, and quizzes
    async findById(courseId) {
        const data = await prisma_1.prisma.course.findUnique({
            where: { course_id: courseId },
            include: {
                tutor: {
                    include: {
                        user: {
                            select: {
                                email: true
                            }
                        }
                    }
                },
                schedules: {
                    orderBy: { start_time: 'asc' }
                },
                lessons: {
                    orderBy: { order_index: 'asc' }
                },
                documents: {
                    orderBy: { created_at: 'asc' }
                },
                quizzes: true,
                bookings: {
                    where: { status: { in: ['confirmed', 'completed', 'pending'] } },
                    select: { student_id: true }
                }
            }
        });
        if (!data)
            return null;
        const formatted = formatCourseUser(data);
        const uniqueStudents = new Set(formatted.bookings?.map((b) => b.student_id));
        return {
            ...formatted,
            price: Number(formatted.price),
            studentsCount: uniqueStudents.size
        };
    },
    // Find all courses with pagination and filter support (including type: online | offline)
    async findAll(filters) {
        const page = parseInt(filters.page) || 1;
        const limit = parseInt(filters.limit) || 10;
        const skip = (page - 1) * limit;
        const whereClause = {};
        if (filters.type)
            whereClause.type = filters.type;
        if (filters.subject)
            whereClause.subject = filters.subject;
        if (filters.level)
            whereClause.level = filters.level;
        if (filters.min_price)
            whereClause.price = { ...whereClause.price, gte: parseFloat(filters.min_price) };
        if (filters.max_price)
            whereClause.price = { ...whereClause.price, lte: parseFloat(filters.max_price) };
        if (filters.tutor_id)
            whereClause.tutor_id = filters.tutor_id;
        if (filters.status)
            whereClause.status = filters.status;
        if (filters.is_public_api) {
            whereClause.tutor = {
                verified_status: 'approved',
                user: {
                    status: 'active'
                }
            };
        }
        if (filters.search) {
            whereClause.OR = [
                { title: { contains: filters.search, mode: 'insensitive' } },
                { description: { contains: filters.search, mode: 'insensitive' } }
            ];
        }
        const [data, count] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.course.findMany({
                where: whereClause,
                include: {
                    tutor: {
                        include: {
                            user: {
                                select: {
                                    email: true
                                }
                            }
                        },
                    },
                    schedules: {
                        orderBy: { start_time: 'asc' }
                    },
                    lessons: {
                        orderBy: { order_index: 'asc' }
                    },
                    documents: {
                        orderBy: { created_at: 'asc' }
                    },
                    bookings: {
                        where: { status: { in: ['confirmed', 'completed', 'pending'] } },
                        select: { student_id: true }
                    }
                },
                orderBy: { created_at: 'desc' },
                skip,
                take: limit
            }),
            prisma_1.prisma.course.count({ where: whereClause })
        ]);
        const mappedData = data.map((course) => {
            const formatted = formatCourseUser(course);
            const uniqueStudents = new Set(formatted.bookings?.map((b) => b.student_id));
            return {
                ...formatted,
                price: Number(formatted.price),
                studentsCount: uniqueStudents.size
            };
        });
        return { data: mappedData, count };
    },
    // Insert a new course (with type, start_date, end_date, duration_months)
    async insert(courseData) {
        const data = await prisma_1.prisma.course.create({
            data: courseData
        });
        return data;
    },
    // Update an existing course
    async update(courseId, courseData) {
        const data = await prisma_1.prisma.course.update({
            where: { course_id: courseId },
            data: courseData
        });
        return data;
    },
    // Delete a course (soft delete: status = 'archived')
    async delete(courseId) {
        const data = await prisma_1.prisma.course.update({
            where: { course_id: courseId },
            data: { status: 'archived' }
        });
        return data;
    },
    // Delete all schedules of a course
    async deleteCourseSchedules(courseId) {
        return await prisma_1.prisma.courseSchedule.deleteMany({
            where: { course_id: courseId }
        });
    },
    // Add schedule to a course
    async addSchedule(scheduleData) {
        const data = await prisma_1.prisma.courseSchedule.create({
            data: scheduleData
        });
        return data;
    },
    // Find all schedules of a tutor
    async findSchedulesByTutor(tutorId) {
        const schedules = await prisma_1.prisma.courseSchedule.findMany({
            where: {
                course: { tutor_id: tutorId, status: { in: ['published', 'draft'] } }
            },
            include: {
                course: { select: { title: true } }
            }
        });
        return schedules;
    },
    // CourseLesson CRUD
    async addLesson(lessonData) {
        const count = await prisma_1.prisma.courseLesson.count({
            where: { course_id: lessonData.course_id }
        });
        return await prisma_1.prisma.courseLesson.create({
            data: {
                course_id: lessonData.course_id,
                title: lessonData.title,
                description: lessonData.description || null,
                video_url: lessonData.video_url,
                order_index: lessonData.order_index || (count + 1)
            }
        });
    },
    async getLessonsByCourseId(courseId) {
        return await prisma_1.prisma.courseLesson.findMany({
            where: { course_id: courseId },
            orderBy: { order_index: 'asc' }
        });
    },
    async updateLesson(lessonId, lessonData) {
        return await prisma_1.prisma.courseLesson.update({
            where: { lesson_id: lessonId },
            data: lessonData
        });
    },
    async deleteLesson(lessonId) {
        return await prisma_1.prisma.courseLesson.delete({
            where: { lesson_id: lessonId }
        });
    }
};
