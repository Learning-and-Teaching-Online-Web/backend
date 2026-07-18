import { prisma } from '../config/prisma';

export const courseRepository = {
  // Find course details including tutor, schedules, documents, and quizzes
  async findById(courseId: string) {
    const data = await prisma.course.findUnique({
      where: { course_id: courseId },
      include: {
        tutor: {
          include: {
            user: {
              select: { full_name: true, avatar_url: true }
            }
          }
        },
        schedules: true,
        documents: true,
        quizzes: true
      }
    });

    return data;
  },

  // Find all courses with pagination and filter support
  async findAll(filters: any) {
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const skip = (page - 1) * limit;
    const whereClause: any = {};

    if (filters.subject) whereClause.subject = filters.subject;
    if (filters.level) whereClause.level = filters.level;
    if (filters.min_price) whereClause.price = { ...whereClause.price, gte: parseFloat(filters.min_price) };
    if (filters.max_price) whereClause.price = { ...whereClause.price, lte: parseFloat(filters.max_price) };
    if (filters.tutor_id) whereClause.tutor_id = filters.tutor_id;
    if (filters.status) whereClause.status = filters.status;
    if (filters.search) {
      whereClause.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    const [data, count] = await prisma.$transaction([
      prisma.course.findMany({
        where: whereClause,
        include: {
          tutor: {
            include: {
              user: {
                select: { full_name: true, avatar_url: true }
              }
            },
          },
          schedules: true
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit

      }),
      prisma.course.count({ where: whereClause })
    ]);

    return { data, count };
  },

  // Insert a new course
  async insert(courseData: any) {
    const data = await prisma.course.create({
      data: courseData
    });

    return data;
  },

  // Update an existing course
  async update(courseId: string, courseData: any) {
    const data = await prisma.course.update({
      where: { course_id: courseId },
      data: courseData
    });

    return data;
  },

  // Delete a course (e.g. by setting status to archived or deleting it)
  async delete(courseId: string) {
    // Soft delete: update status to 'archived'
    const data = await prisma.course.update({
      where: { course_id: courseId },
      data: { status: 'archived' }
    });

    return data;
  },

  // Add schedule to a course

  async addSchedule(scheduleData: any) {
    const data = await prisma.courseSchedule.create({
      data: scheduleData
    });

    return data;
  },

  // Find existing schedules to prevent overlap

  async findOverlappingSchedules(tutorId: string, startTime: string, endTime: string) {
    const overlaps = await prisma.courseSchedule.findMany({
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
  }
};

