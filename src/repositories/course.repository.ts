import { prisma } from '../config/prisma';

function formatCourseUser(course: any) {
  if (!course) return course;
  if (course.tutor?.user) {
    course.tutor.user.full_name = course.tutor.user.user_profile?.full_name || '';
    course.tutor.user.avatar_url = course.tutor.user.user_profile?.avatar_url || null;
  }
  return course;
}

export const courseRepository = {
  // Find course details including tutor, schedules, lessons, documents, and quizzes
  async findById(courseId: string) {
    const data = await (prisma.course as any).findUnique({
      where: { course_id: courseId },
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

    if (!data) return null;

    const formatted = formatCourseUser(data);
    const uniqueStudents = new Set(formatted.bookings?.map((b: any) => b.student_id));
    return {
      ...formatted,
      price: Number(formatted.price),
      studentsCount: uniqueStudents.size
    };
  },

  // Find all courses with pagination and filter support (including type: online | offline)
  async findAll(filters: any) {
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const skip = (page - 1) * limit;
    const whereClause: any = {};

    if (filters.type) whereClause.type = filters.type;
    if (filters.subject) whereClause.subject = filters.subject;
    if (filters.level) whereClause.level = filters.level;
    if (filters.min_price) whereClause.price = { ...whereClause.price, gte: parseFloat(filters.min_price) };
    if (filters.max_price) whereClause.price = { ...whereClause.price, lte: parseFloat(filters.max_price) };
    if (filters.tutor_id) whereClause.tutor_id = filters.tutor_id;
    if (filters.status) whereClause.status = filters.status;
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

    const [data, count] = await (prisma as any).$transaction([
      (prisma.course as any).findMany({
        where: whereClause,
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
      (prisma.course as any).count({ where: whereClause })
    ]);

    const mappedData = data.map((course: any) => {
      const formatted = formatCourseUser(course);
      const uniqueStudents = new Set(formatted.bookings?.map((b: any) => b.student_id));
      return {
        ...formatted,
        price: Number(formatted.price),
        studentsCount: uniqueStudents.size
      };
    });

    return { data: mappedData, count };
  },

  // Insert a new course (with type, start_date, end_date, duration_months)
  async insert(courseData: any) {
    const data = await (prisma.course as any).create({
      data: courseData
    });

    return data;
  },

  // Update an existing course
  async update(courseId: string, courseData: any) {
    const data = await (prisma.course as any).update({
      where: { course_id: courseId },
      data: courseData
    });

    return data;
  },

  // Delete a course (soft delete: status = 'archived')
  async delete(courseId: string) {
    const data = await (prisma.course as any).update({
      where: { course_id: courseId },
      data: { status: 'archived' }
    });

    return data;
  },

  // Add schedule to a course
  async addSchedule(scheduleData: any) {
    const data = await (prisma.courseSchedule as any).create({
      data: scheduleData
    });

    return data;
  },

  // Find existing schedules to prevent overlap
  async findOverlappingSchedules(tutorId: string, startTime: string, endTime: string) {
    const overlaps = await (prisma.courseSchedule as any).findMany({
      where: {
        course: { tutor_id: tutorId },
        OR: [
          { start_time: { lte: new Date(startTime) }, end_time: { gt: new Date(startTime) } },
          { start_time: { lt: new Date(endTime) }, end_time: { gte: new Date(endTime) } },
          { start_time: { gte: new Date(startTime) }, end_time: { lte: new Date(endTime) } }
        ]
      },
      include: {
        course: { select: { tutor_id: true } }
      }
    });

    return overlaps;
  },

  // CourseLesson CRUD
  async addLesson(lessonData: { course_id: string; title: string; description?: string; video_url: string; order_index?: number }) {
    const count = await (prisma.courseLesson as any).count({
      where: { course_id: lessonData.course_id }
    });

    return await (prisma.courseLesson as any).create({
      data: {
        course_id: lessonData.course_id,
        title: lessonData.title,
        description: lessonData.description || null,
        video_url: lessonData.video_url,
        order_index: lessonData.order_index || (count + 1)
      }
    });
  },

  async getLessonsByCourseId(courseId: string) {
    return await (prisma.courseLesson as any).findMany({
      where: { course_id: courseId },
      orderBy: { order_index: 'asc' }
    });
  },

  async updateLesson(lessonId: string, lessonData: { title?: string; description?: string; video_url?: string; order_index?: number }) {
    return await (prisma.courseLesson as any).update({
      where: { lesson_id: lessonId },
      data: lessonData
    });
  },

  async deleteLesson(lessonId: string) {
    return await (prisma.courseLesson as any).delete({
      where: { lesson_id: lessonId }
    });
  }
};
