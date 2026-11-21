import { courseRepository } from '../repositories/course.repository';
import { tutorRepository } from '../repositories/tutor.repository';
import { prisma } from '../config/prisma';
import {
  DayOfWeek,
  GenerateSessionsInput,
  SessionRecord
} from '../types/course.types';

export function normalizeDayOfWeek(day: DayOfWeek | string | number): number | null {
  if (typeof day === 'number') {
    if (day >= 0 && day <= 6) return day;
    if (day === 7) return 0;
    return null;
  }
  const str = String(day).trim().toLowerCase();
  switch (str) {
    case '0':
    case 'sun':
    case 'sunday':
    case 'cn':
    case 'chủ nhật':
    case 'chu nhat':
      return 0;
    case '1':
    case 'mon':
    case 'monday':
    case 't2':
    case 'thứ 2':
    case 'thu 2':
    case 'thứ hai':
    case 'thu hai':
      return 1;
    case '2':
    case 'tue':
    case 'tuesday':
    case 't3':
    case 'thứ 3':
    case 'thu 3':
    case 'thứ ba':
    case 'thu ba':
      return 2;
    case '3':
    case 'wed':
    case 'wednesday':
    case 't4':
    case 'thứ 4':
    case 'thu 4':
    case 'thứ tư':
    case 'thu tu':
      return 3;
    case '4':
    case 'thu':
    case 'thursday':
    case 't5':
    case 'thứ 5':
    case 'thu 5':
    case 'thứ năm':
    case 'thu nam':
      return 4;
    case '5':
    case 'fri':
    case 'friday':
    case 't6':
    case 'thứ 6':
    case 'thu 6':
    case 'thứ sáu':
    case 'thu sau':
      return 5;
    case '6':
    case 'sat':
    case 'saturday':
    case 't7':
    case 'thứ 7':
    case 'thu 7':
    case 'thứ bảy':
    case 'thu bay':
      return 6;
    case '7':
      return 0;
    default:
      return null;
  }
}

export function generateSessions(input: GenerateSessionsInput): SessionRecord[];
export function generateSessions(
  startDate: Date | string,
  schedules: (DayOfWeek | string | number)[],
  totalSessions: number,
  durationMinutes?: number,
  scheduleTime?: string,
  maxStudents?: number,
  courseId?: string
): SessionRecord[];
export function generateSessions(
  inputOrStartDate: GenerateSessionsInput | Date | string,
  schedulesArg?: (DayOfWeek | string | number)[],
  totalSessionsArg?: number,
  durationMinutesArg?: number,
  scheduleTimeArg?: string,
  maxStudentsArg?: number,
  courseIdArg?: string
): SessionRecord[] {
  let startDateRaw: Date | string | undefined;
  let totalSessions: number | undefined;
  let schedulesRaw: (DayOfWeek | string | number)[] | undefined;
  let durationMinutes = 60;
  let scheduleTime: string | undefined;
  let maxStudents = 1;
  let courseId: string | undefined;

  if (
    typeof inputOrStartDate === 'object' &&
    inputOrStartDate !== null &&
    !(inputOrStartDate instanceof Date)
  ) {
    const input = inputOrStartDate as GenerateSessionsInput;
    startDateRaw = input.start_date;
    totalSessions = input.total_sessions;
    schedulesRaw = input.schedules;
    durationMinutes = input.duration_minutes ?? 60;
    scheduleTime = input.schedule_time;
    maxStudents = input.max_students ?? 1;
    courseId = input.course_id;
  } else {
    startDateRaw = inputOrStartDate as Date | string;
    schedulesRaw = schedulesArg;
    totalSessions = totalSessionsArg;
    durationMinutes = durationMinutesArg ?? 60;
    scheduleTime = scheduleTimeArg;
    maxStudents = maxStudentsArg ?? 1;
    courseId = courseIdArg;
  }

  // 1. Validate total_sessions
  if (
    totalSessions === undefined ||
    totalSessions === null ||
    typeof totalSessions !== 'number' ||
    isNaN(totalSessions) ||
    totalSessions <= 0
  ) {
    throw new Error('Khóa học phải có tổng số buổi (total_sessions) lớn hơn 0');
  }

  // 2. Validate schedules
  if (!Array.isArray(schedulesRaw) || schedulesRaw.length === 0) {
    throw new Error('Danh sách các thứ trong tuần (schedules) không được để trống');
  }

  const normalizedDays = new Set<number>();
  for (const day of schedulesRaw) {
    const normalized = normalizeDayOfWeek(day);
    if (normalized !== null) {
      normalizedDays.add(normalized);
    }
  }

  if (normalizedDays.size === 0) {
    throw new Error('Không tìm thấy thứ trong tuần hợp lệ trong danh sách schedules');
  }

  // 3. Validate start_date
  if (!startDateRaw) {
    throw new Error('Ngày bắt đầu khóa học (start_date) là bắt buộc');
  }

  let startYear: number;
  let startMonth: number;
  let startDay: number;
  let startHour = 0;
  let startMinute = 0;

  if (typeof startDateRaw === 'string') {
    const trimmed = startDateRaw.trim();
    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (dateOnlyMatch) {
      startYear = parseInt(dateOnlyMatch[1], 10);
      startMonth = parseInt(dateOnlyMatch[2], 10) - 1;
      startDay = parseInt(dateOnlyMatch[3], 10);
    } else {
      const parsed = new Date(trimmed);
      if (isNaN(parsed.getTime())) {
        throw new Error('Ngày bắt đầu khóa học (start_date) không hợp lệ');
      }
      startYear = parsed.getFullYear();
      startMonth = parsed.getMonth();
      startDay = parsed.getDate();
      startHour = parsed.getHours();
      startMinute = parsed.getMinutes();
    }
  } else if (startDateRaw instanceof Date) {
    if (isNaN(startDateRaw.getTime())) {
      throw new Error('Ngày bắt đầu khóa học (start_date) không hợp lệ');
    }
    startYear = startDateRaw.getFullYear();
    startMonth = startDateRaw.getMonth();
    startDay = startDateRaw.getDate();
    startHour = startDateRaw.getHours();
    startMinute = startDateRaw.getMinutes();
  } else {
    throw new Error('Ngày bắt đầu khóa học (start_date) không hợp lệ');
  }

  // Parse schedule_time if provided
  if (scheduleTime && typeof scheduleTime === 'string') {
    const parts = scheduleTime.trim().split(':');
    if (parts.length >= 2) {
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(h) && !isNaN(m)) {
        startHour = h;
        startMinute = m;
      }
    }
  }

  if (durationMinutes <= 0) {
    throw new Error('Thời lượng buổi học (duration_minutes) phải lớn hơn 0');
  }

  const currentDate = new Date(startYear, startMonth, startDay, startHour, startMinute, 0, 0);

  const sessions: SessionRecord[] = [];
  const maxIterations = 365 * 5;
  let iterations = 0;

  while (sessions.length < totalSessions && iterations < maxIterations) {
    iterations++;
    const currentDayOfWeek = currentDate.getDay();

    if (normalizedDays.has(currentDayOfWeek)) {
      const sessionStart = new Date(currentDate);
      const sessionEnd = new Date(sessionStart.getTime() + durationMinutes * 60 * 1000);

      sessions.push({
        session_number: sessions.length + 1,
        start_time: sessionStart,
        end_time: sessionEnd,
        booked_count: 0,
        max_slot: maxStudents,
        status: 'upcoming',
        ...(courseId ? { course_id: courseId } : {})
      });
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  if (sessions.length < totalSessions) {
    throw new Error('Không thể sinh đủ số buổi học trong khoảng thời gian cho phép');
  }

  return sessions;
}

async function getOrCreateSubjectId(subjectName: string): Promise<string> {
  const name = subjectName.trim();
  let subject = await prisma.subject.findUnique({
    where: { name }
  });
  if (!subject) {
    subject = await prisma.subject.create({
      data: { name }
    });
  }
  return subject.subject_id;
}

const syncGeneratedCourseSchedules = async (
  courseId: string,
  startDate: Date,
  courseDays: unknown,
  totalSessions: number,
  durationMinutes: number,
  maxStudents: number,
  scheduleTime?: string
) => {
  if (!Array.isArray(courseDays) || courseDays.length === 0 || totalSessions <= 0) {
    return;
  }

  const generated = generateSessions({
    course_id: courseId,
    start_date: startDate,
    schedules: courseDays,
    total_sessions: totalSessions,
    duration_minutes: durationMinutes || 60,
    schedule_time: scheduleTime,
    max_students: maxStudents || 1
  });

  const schedulesPayload = generated.map((s) => ({
    course_id: courseId,
    session_number: s.session_number,
    title: `Buổi ${s.session_number}`,
    room_id: `room_${courseId}_s${s.session_number}`,
    start_time: s.start_time,
    end_time: s.end_time,
    max_slot: s.max_slot,
    booked_count: 0,
    status: 'upcoming'
  }));

  await courseRepository.createManySchedules(schedulesPayload);
};

export const courseService = {
  // Create a new course
  async createCourse(userId: string, courseData: any) {
    const tutor = await tutorRepository.findByUserId(userId);
    if (!tutor) {
      throw new Error('Gia sư chưa thiết lập hồ sơ. Vui lòng tạo hồ sơ gia sư trước.');
    }

    const {
      title,
      subject,
      description,
      price,
      type,
      start_date,
      duration_minutes,
      max_students,
      total_sessions,
      level,
      thumbnail_url
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

    const subjectId = await getOrCreateSubjectId(subject);

    const payload = {
      tutor_id: tutor.tutor_id,
      title,
      subject_id: subjectId,
      description,
      price: Number(price),
      type: type || 'online',
      start_date: start_date ? new Date(start_date) : null,
      duration_minutes: Number(duration_minutes) || 60,
      max_students: Number(max_students) || 1,
      total_sessions: Number(total_sessions) || 1,
      level,
      thumbnail_url
    };

    const createdCourse = await courseRepository.insert(payload);

    const courseDays = courseData.course_days || courseData.courseDays;
    if (Array.isArray(courseDays)) {
      await courseRepository.syncCourseDays(createdCourse.course_id, courseDays);
    }

    if (payload.type === 'online' && payload.start_date) {
      await syncGeneratedCourseSchedules(
        createdCourse.course_id,
        payload.start_date,
        courseDays,
        payload.total_sessions,
        payload.duration_minutes,
        payload.max_students,
        courseData.schedule_time || courseData.start_time
      );
    }

    return await courseRepository.findById(createdCourse.course_id);
  },

  // Update a course details
  async updateCourse(userId: string, courseId: string, courseData: any) {
    const tutor = await tutorRepository.findByUserId(userId);
    if (!tutor) {
      throw new Error('Hồ sơ gia sư không tồn tại');
    }

    const course = await courseRepository.findById(courseId);
    if (!course) {
      throw new Error('Không tìm thấy khóa học');
    }

    if (course.tutor_id !== tutor.tutor_id) {
      throw new Error('Bạn không có quyền chỉnh sửa khóa học này');
    }

    // Filter fields to update
    const updatePayload: any = {};
    const allowedFields = [
      'title', 'description', 'price', 'type', 'start_date',
      'duration_minutes', 'max_students', 'total_sessions',
      'level', 'status', 'thumbnail_url'
    ];

    if (courseData.subject !== undefined) {
      updatePayload.subject_id = await getOrCreateSubjectId(courseData.subject);
    }

    allowedFields.forEach(field => {
      if (courseData[field] !== undefined) {
        if (field === 'price' && Number(courseData[field]) < 0) {
          throw new Error('Giá tiền không được nhỏ hơn 0');
        }
        if (field === 'start_date') {
          updatePayload[field] = courseData[field] ? new Date(courseData[field]) : null;
        } else if (['duration_minutes', 'max_students', 'total_sessions'].includes(field)) {
          updatePayload[field] = courseData[field] ? Number(courseData[field]) : null;
        } else {
          updatePayload[field] = courseData[field];
        }
      }
    });

    const updated = await courseRepository.update(courseId, updatePayload);

    const courseDays = courseData.course_days || courseData.courseDays;
    if (courseDays !== undefined && Array.isArray(courseDays)) {
      await courseRepository.syncCourseDays(courseId, courseDays);
    }

    const effectiveType = updatePayload.type ?? course.type;
    const effectiveStartDate = updatePayload.start_date ?? course.start_date;
    const effectiveTotalSessions = updatePayload.total_sessions ?? course.total_sessions;
    const effectiveDuration = updatePayload.duration_minutes ?? course.duration_minutes;
    const effectiveMaxStudents = updatePayload.max_students ?? course.max_students;
    const scheduleTime = courseData.schedule_time || courseData.start_time;

    if (
      course.status !== 'published' &&
      effectiveType === 'online' &&
      effectiveStartDate &&
      Array.isArray(courseDays) &&
      courseDays.length > 0 &&
      effectiveTotalSessions > 0 &&
      scheduleTime
    ) {
      await courseRepository.deleteCourseSchedules(courseId);
      await syncGeneratedCourseSchedules(
        courseId,
        effectiveStartDate,
        courseDays,
        Number(effectiveTotalSessions),
        Number(effectiveDuration) || 60,
        Number(effectiveMaxStudents) || 1,
        scheduleTime
      );
    }

    return await courseRepository.findById(courseId);
  },

  // Soft delete / archive a course
  async deleteCourse(userId: string, courseId: string) {
    const tutor = await tutorRepository.findByUserId(userId);
    if (!tutor) {
      throw new Error('Hồ sơ gia sư không tồn tại');
    }

    const course = await courseRepository.findById(courseId);
    if (!course) {
      throw new Error('Không tìm thấy khóa học');
    }

    if (course.tutor_id !== tutor.tutor_id) {
      throw new Error('Bạn không có quyền xóa khóa học này');
    }

    return await courseRepository.delete(courseId);
  },

  // Add a schedule slot to a course
  async addSchedule(userId: string, courseId: string, scheduleData: any) {
    const tutor = await tutorRepository.findByUserId(userId);
    if (!tutor) {
      throw new Error('Hồ sơ gia sư không tồn tại');
    }

    const course = await courseRepository.findById(courseId);
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
    const existingSchedules = await courseRepository.findSchedulesByTutor(tutor.tutor_id);
    
    const newStartDate = new Date(start_time);
    const newEndDate = new Date(end_time);
    const newStartMins = newStartDate.getHours() * 60 + newStartDate.getMinutes();
    const newEndMins = newEndDate.getHours() * 60 + newEndDate.getMinutes();

    for (const s of existingSchedules) {
      // If it's recurring and on the same day
      if (s.is_recurring && is_recurring && s.day_of_week === day_of_week) {
        const existStartDate = new Date(s.start_time);
        const existEndDate = new Date(s.end_time);
        const existStartMins = existStartDate.getHours() * 60 + existStartDate.getMinutes();
        const existEndMins = existEndDate.getHours() * 60 + existEndDate.getMinutes();
        
        if (existStartMins < newEndMins && existEndMins > newStartMins) {
          throw new Error(`Khung giờ này đã bị trùng với khóa học: "${s.course.title}"`);
        }
      }
    }

    const payload = {
      course_id: courseId,
      start_time: new Date(start_time),
      end_time: new Date(end_time),
      max_slot: max_slot || course.max_students || 1,
      booked_count: 0
    };

    return await courseRepository.addSchedule(payload);
  },

  // Delete all schedules of a course
  async deleteCourseSchedules(userId: string, courseId: string) {
    const tutor = await tutorRepository.findByUserId(userId);
    if (!tutor) throw new Error('Hồ sơ gia sư không tồn tại');

    const course = await courseRepository.findById(courseId);
    if (!course) throw new Error('Không tìm thấy khóa học');
    
    if (course.tutor_id !== tutor.tutor_id) {
      throw new Error('Bạn không có quyền quản lý lịch của khóa học này');
    }

    if (course.status === 'published') {
      throw new Error('Không thể xóa lịch của khóa học đã xuất bản');
    }

    return await courseRepository.deleteCourseSchedules(courseId);
  },

  // CourseLesson methods
  async addLesson(userId: string, courseId: string, lessonData: any) {
    const tutor = await tutorRepository.findByUserId(userId);
    if (!tutor) throw new Error('Hồ sơ gia sư không tồn tại');

    const course = await courseRepository.findById(courseId);
    if (!course) throw new Error('Không tìm thấy khóa học');
    if (course.tutor_id !== tutor.tutor_id) throw new Error('Bạn không có quyền quản lý bài học cho khóa học này');

    if (!lessonData.title || !lessonData.video_url) {
      throw new Error('Tiêu đề bài học và đường dẫn video là bắt buộc');
    }

    return await courseRepository.addLesson({
      course_id: courseId,
      title: lessonData.title,
      description: lessonData.description,
      video_url: lessonData.video_url,
      order_index: lessonData.order_index ? Number(lessonData.order_index) : undefined
    });
  },

  async updateLesson(userId: string, courseId: string, lessonId: string, lessonData: any) {
    const tutor = await tutorRepository.findByUserId(userId);
    if (!tutor) throw new Error('Hồ sơ gia sư không tồn tại');

    const course = await courseRepository.findById(courseId);
    if (!course) throw new Error('Không tìm thấy khóa học');
    if (course.tutor_id !== tutor.tutor_id) throw new Error('Bạn không có quyền sửa bài học này');

    return await courseRepository.updateLesson(lessonId, {
      title: lessonData.title,
      description: lessonData.description,
      video_url: lessonData.video_url,
      order_index: lessonData.order_index ? Number(lessonData.order_index) : undefined
    });
  },

  async deleteLesson(userId: string, courseId: string, lessonId: string) {
    const tutor = await tutorRepository.findByUserId(userId);
    if (!tutor) throw new Error('Hồ sơ gia sư không tồn tại');

    const course = await courseRepository.findById(courseId);
    if (!course) throw new Error('Không tìm thấy khóa học');
    if (course.tutor_id !== tutor.tutor_id) throw new Error('Bạn không có quyền xóa bài học này');

    return await courseRepository.deleteLesson(lessonId);
  },

  // List all courses with filtering
  async listCourses(query: any) {
    const filters = {
      type: query.type,
      subject: query.subject,
      level: query.level,
      min_price: query.min_price ? Number(query.min_price) : undefined,
      max_price: query.max_price ? Number(query.max_price) : undefined,
      tutor_id: query.tutor_id,
      status: 'published',
      is_public_api: true,
      search: query.search,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 10
    };

    const { data, count } = await courseRepository.findAll(filters);
    return { data, total: count, page: filters.page, limit: filters.limit };
  },

  // List courses for a specific tutor
  async listMyCourses(userId: string, query: any) {
    const tutor = await tutorRepository.findByUserId(userId);
    if (!tutor) {
      throw new Error('Hồ sơ gia sư không tồn tại');
    }

    const filters = {
      type: query.type,
      subject: query.subject,
      level: query.level,
      min_price: query.min_price ? Number(query.min_price) : undefined,
      max_price: query.max_price ? Number(query.max_price) : undefined,
      tutor_id: tutor.tutor_id,
      status: query.status,
      search: query.search,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 10
    };

    const { data, count } = await courseRepository.findAll(filters);

    return { data, total: count, page: filters.page, limit: filters.limit };
  },

  // Get detailed course by id
  async getCourseDetail(courseId: string) {
    return await courseRepository.findById(courseId);
  },

  // Generate teaching sessions
  generateSessions(
    inputOrStartDate: GenerateSessionsInput | Date | string,
    schedulesArg?: (DayOfWeek | string | number)[],
    totalSessionsArg?: number,
    durationMinutesArg?: number,
    scheduleTimeArg?: string,
    maxStudentsArg?: number,
    courseIdArg?: string
  ): SessionRecord[] {
    if (typeof inputOrStartDate === 'object' && !(inputOrStartDate instanceof Date)) {
      return generateSessions(inputOrStartDate);
    }
    return generateSessions(
      inputOrStartDate,
      schedulesArg ?? [],
      totalSessionsArg ?? 0,
      durationMinutesArg,
      scheduleTimeArg,
      maxStudentsArg,
      courseIdArg
    );
  },

  // Calculate course progress
  async calculateCourseProgress(courseId: string, studentId?: string): Promise<number> {
    return calculateCourseProgress(courseId, studentId);
  }
};

/**
 * Tính phần trăm tiến độ học thật của học sinh trong khóa học
 * Công thức: (buổi đã học / tổng số buổi) * 100
 * @param courseId ID của khóa học
 * @param studentId ID của học sinh (tùy chọn)
 * @returns Tỷ lệ phần trăm tiến độ hoàn thành (0 - 100)
 */
export async function calculateCourseProgress(
  courseId: string,
  studentId?: string
): Promise<number> {
  if (!courseId) return 0;

  // 1. Nếu có studentId và prisma.booking hỗ trợ findFirst, kiểm tra đơn đăng ký hợp lệ
  if (studentId && (prisma as any)?.booking?.findFirst) {
    const booking = await (prisma as any).booking.findFirst({
      where: {
        course_id: courseId,
        student_id: studentId,
        status: { in: ['confirmed', 'completed'] }
      }
    });

    if (!booking) {
      return 0; // Học sinh chưa đăng ký hoặc booking chưa hợp lệ
    }
  }

  // 2. Lấy danh sách các buổi học của khóa học từ course_schedules
  const sessions = await (prisma as any).courseSchedule.findMany({
    where: { course_id: courseId }
  });

  const totalSessions = Array.isArray(sessions) ? sessions.length : 0;

  // 3. Xử lý trường hợp khóa học 0 buổi (tránh lỗi chia cho 0 -> NaN)
  if (totalSessions === 0) {
    return 0;
  }

  // 4. Đếm số buổi đã học (status = 'completed')
  const completedSessions = sessions.filter(
    (s: any) => s.status === 'completed'
  ).length;

  if (completedSessions === 0) {
    return 0;
  }

  // 5. Tính theo công thức (buổi đã học / tổng số buổi) * 100
  const progress = (completedSessions / totalSessions) * 100;

  return Math.round(progress * 100) / 100;
}
