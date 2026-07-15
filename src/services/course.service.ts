import { SupabaseClient } from '@supabase/supabase-js';
import { courseRepository } from '../repositories/course.repository';
import { tutorRepository } from '../repositories/tutor.repository';

export const courseService = {
  // Create a new course
  async createCourse(supabase: SupabaseClient, userId: string, courseData: any) {
    const tutor = await tutorRepository.findByUserId(supabase, userId);
    if (!tutor) {
      throw new Error('Gia sư chưa thiết lập hồ sơ. Vui lòng tạo hồ sơ gia sư trước.');
    }

    const {
      title,
      subject,
      description,
      price,
      duration_minutes,
      max_students,
      total_sessions,
      level,
      thumbnail_url,
      tags
    } = courseData;

    // Validations
    if (!title || !subject || price === undefined) {
      throw new Error('Tiêu đề, môn học và giá tiền không được để trống');
    }
    if (Number(price) < 0) {
      throw new Error('Giá tiền không được nhỏ hơn 0');
    }
    if (duration_minutes && Number(duration_minutes) <= 0) {
      throw new Error('Thời lượng buổi học phải lớn hơn 0');
    }
    if (total_sessions && Number(total_sessions) <= 0) {
      throw new Error('Tổng số buổi học phải lớn hơn 0');
    }

    const payload = {
      tutor_id: tutor.tutor_id,
      title,
      subject,
      description,
      price: Number(price),
      duration_minutes: Number(duration_minutes) || 60,
      max_students: Number(max_students) || 1,
      total_sessions: Number(total_sessions) || 1,
      level,
      thumbnail_url,
      tags: tags || []
    };

    return await courseRepository.insert(supabase, payload);
  },

  // Update a course details
  async updateCourse(supabase: SupabaseClient, userId: string, courseId: string, courseData: any) {
    const tutor = await tutorRepository.findByUserId(supabase, userId);
    if (!tutor) {
      throw new Error('Hồ sơ gia sư không tồn tại');
    }

    const course = await courseRepository.findById(supabase, courseId);
    if (!course) {
      throw new Error('Không tìm thấy khóa học');
    }

    if (course.tutor_id !== tutor.tutor_id) {
      throw new Error('Bạn không có quyền chỉnh sửa khóa học này');
    }

    // Filter fields to update
    const updatePayload: any = {};
    const allowedFields = [
      'title', 'subject', 'description', 'price', 'duration_minutes',
      'max_students', 'total_sessions', 'level', 'status', 'thumbnail_url', 'tags'
    ];

    allowedFields.forEach(field => {
      if (courseData[field] !== undefined) {
        if (field === 'price' && Number(courseData[field]) < 0) {
          throw new Error('Giá tiền không được nhỏ hơn 0');
        }
        updatePayload[field] = courseData[field];
      }
    });

    return await courseRepository.update(supabase, courseId, updatePayload);
  },

  // Soft delete / archive a course
  async deleteCourse(supabase: SupabaseClient, userId: string, courseId: string) {
    const tutor = await tutorRepository.findByUserId(supabase, userId);
    if (!tutor) {
      throw new Error('Hồ sơ gia sư không tồn tại');
    }

    const course = await courseRepository.findById(supabase, courseId);
    if (!course) {
      throw new Error('Không tìm thấy khóa học');
    }

    if (course.tutor_id !== tutor.tutor_id) {
      throw new Error('Bạn không có quyền xóa khóa học này');
    }

    return await courseRepository.delete(supabase, courseId);
  },

  // Add a schedule slot to a course
  async addSchedule(supabase: SupabaseClient, userId: string, courseId: string, scheduleData: any) {
    const tutor = await tutorRepository.findByUserId(supabase, userId);
    if (!tutor) {
      throw new Error('Hồ sơ gia sư không tồn tại');
    }

    const course = await courseRepository.findById(supabase, courseId);
    if (!course) {
      throw new Error('Không tìm thấy khóa học');
    }

    if (course.tutor_id !== tutor.tutor_id) {
      throw new Error('Bạn không có quyền quản lý lịch học cho khóa học này');
    }

    const { start_time, end_time, is_recurring, day_of_week, recurrence_end, max_slot } = scheduleData;

    // Time validation
    const start = new Date(start_time).getTime();
    const end = new Date(end_time).getTime();

    if (isNaN(start) || isNaN(end)) {
      throw new Error('Thời gian học bắt đầu hoặc kết thúc không hợp lệ');
    }
    if (start <= Date.now()) {
      throw new Error('Thời gian bắt đầu học phải ở trong tương lai');
    }
    if (end <= start) {
      throw new Error('Thời gian kết thúc phải lớn hơn thời gian bắt đầu');
    }

    // Check duration matches course duration
    const diffMinutes = Math.round((end - start) / 60000);
    if (diffMinutes !== course.duration_minutes) {
      throw new Error(`Thời lượng lịch học (${diffMinutes} phút) phải khớp với thời lượng của khóa học (${course.duration_minutes} phút)`);
    }

    // Check overlap with existing schedules of this tutor
    const overlaps = await courseRepository.findOverlappingSchedules(supabase, tutor.tutor_id, start_time, end_time);
    if (overlaps.length > 0) {
      throw new Error('Thời gian này đã bị trùng lịch với lịch dạy khác của bạn');
    }

    const payload = {
      course_id: courseId,
      start_time,
      end_time,
      is_recurring: is_recurring || false,
      day_of_week,
      recurrence_end,
      max_slot: max_slot || course.max_students || 1,
      is_booked: false
    };

    return await courseRepository.addSchedule(supabase, payload);
  },

  // List all courses with filtering (public view)
  async listCourses(supabase: SupabaseClient, query: any) {
    const filters = {
      subject: query.subject,
      level: query.level,
      min_price: query.min_price ? Number(query.min_price) : undefined,
      max_price: query.max_price ? Number(query.max_price) : undefined,
      tutor_id: query.tutor_id,
      status: 'published', // Force published for public API
      search: query.search,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 10
    };

    const { data, count } = await courseRepository.findAll(supabase, filters);
    return { data, total: count, page: filters.page, limit: filters.limit };
  },

  // List courses for a specific tutor (tutor view)
  async listMyCourses(supabase: SupabaseClient, userId: string, query: any) {
    const tutor = await tutorRepository.findByUserId(supabase, userId);
    if (!tutor) {
      throw new Error('Hồ sơ gia sư không tồn tại');
    }

    const filters = {
      subject: query.subject,
      level: query.level,
      min_price: query.min_price ? Number(query.min_price) : undefined,
      max_price: query.max_price ? Number(query.max_price) : undefined,
      tutor_id: tutor.tutor_id, // Force tutor_id to current tutor
      status: query.status, // Allow filtering by any status
      search: query.search,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 10
    };

    const { data, count } = await courseRepository.findAll(supabase, filters);
    return { data, total: count, page: filters.page, limit: filters.limit };
  },

  // Get detailed course by id
  async getCourseDetail(supabase: SupabaseClient, courseId: string) {
    return await courseRepository.findById(supabase, courseId);
  }
};
