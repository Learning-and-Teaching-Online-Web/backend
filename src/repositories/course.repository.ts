import { SupabaseClient } from '@supabase/supabase-js';
import { prisma } from '../config/prisma';

export const courseRepository = {
  // Find course details including tutor, schedules, documents, and quizzes
  async findById(supabase: SupabaseClient, courseId: string) {
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
        quizzes: true,
      }
    });

    return data;
  },

  // Find all courses with pagination and filter support
  async findAll(supabase: SupabaseClient, filters: any) {
    const where: any = {};

    if (filters.subject) where.subject = filters.subject;
    if (filters.level) where.level = filters.level;

    if (filters.min_price || filters.max_price) {
      where.price = {};
      if (filters.min_price) where.price.gte = filters.min_price;
      if (filters.max_price) where.price.lte = filters.max_price;
    }

    if (filters.tutor_id) where.tutor_id = filters.tutor_id;
    if (filters.status) where.status = filters.status;

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const skip = (page - 1) * limit;

    const [data, count] = await Promise.all([
      prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          tutor: {
            include: {
              user: {
                select: { full_name: true, avatar_url: true }
              }
            }
          }
        }
      }),
      prisma.course.count({ where })
    ]);

    const formattedData = data.map((course: any) => ({
      ...course,
      price: Number(course.price)
    }));

    return { data: formattedData, count };
  },

  // Insert a new course
  async insert(supabase: SupabaseClient, courseData: any) {
    const data = await prisma.course.create({
      data: courseData
    });
    return data;
  },

  // Update an existing course
  async update(supabase: SupabaseClient, courseId: string, courseData: any) {
    const data = await prisma.course.update({
      where: { course_id: courseId },
      data: courseData
    });
    return data;
  },

  // Delete a course (e.g. by setting status to archived or deleting it)
  async delete(supabase: SupabaseClient, courseId: string) {
    const data = await prisma.course.update({
      where: { course_id: courseId },
      data: { status: 'archived' }
    });
    return data;
  },

  // Add schedule to a course
  async addSchedule(supabase: SupabaseClient, scheduleData: any) {
    const data = await prisma.courseSchedule.create({
      data: scheduleData
    });
    return data;
  },

  // Find existing schedules to prevent overlap
  async findOverlappingSchedules(supabase: SupabaseClient, tutorId: string, startTime: string, endTime: string) {
    const start = new Date(startTime);
    const end = new Date(endTime);

    const data = await prisma.courseSchedule.findMany({
      where: {
        course: {
          tutor_id: tutorId
        },
        OR: [
          { start_time: { lte: start }, end_time: { gt: start } },
          { start_time: { lt: end }, end_time: { gte: end } },
          { start_time: { gte: start }, end_time: { lte: end } }
        ]
      },
      include: {
        course: {
          select: { tutor_id: true }
        }
      }
    });

    return data;
  }
};
