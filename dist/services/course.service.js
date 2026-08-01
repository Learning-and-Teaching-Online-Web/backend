"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.courseService = void 0;
const course_repository_1 = require("../repositories/course.repository");
const tutor_repository_1 = require("../repositories/tutor.repository");
exports.courseService = {
    // Create a new course
    async createCourse(userId, courseData) {
        const tutor = await tutor_repository_1.tutorRepository.findByUserId(userId);
        if (!tutor) {
            throw new Error('Gia sư chưa thiết lập hồ sơ. Vui lòng tạo hồ sơ gia sư trước.');
        }
        const { title, subject, description, price, type, start_date, end_date, duration_months, duration_minutes, max_students, total_sessions, level, thumbnail_url, tags } = courseData;
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
        const payload = {
            tutor_id: tutor.tutor_id,
            title,
            subject,
            description,
            price: Number(price),
            type: type || 'online',
            start_date: start_date ? new Date(start_date) : null,
            end_date: end_date ? new Date(end_date) : null,
            duration_months: duration_months ? Number(duration_months) : null,
            duration_minutes: Number(duration_minutes) || 60,
            max_students: Number(max_students) || 1,
            total_sessions: Number(total_sessions) || 1,
            level,
            thumbnail_url,
            tags: tags || []
        };
        return await course_repository_1.courseRepository.insert(payload);
    },
    // Update a course details
    async updateCourse(userId, courseId, courseData) {
        const tutor = await tutor_repository_1.tutorRepository.findByUserId(userId);
        if (!tutor) {
            throw new Error('Hồ sơ gia sư không tồn tại');
        }
        const course = await course_repository_1.courseRepository.findById(courseId);
        if (!course) {
            throw new Error('Không tìm thấy khóa học');
        }
        if (course.tutor_id !== tutor.tutor_id) {
            throw new Error('Bạn không có quyền chỉnh sửa khóa học này');
        }
        // Filter fields to update
        const updatePayload = {};
        const allowedFields = [
            'title', 'subject', 'description', 'price', 'type', 'start_date', 'end_date',
            'duration_months', 'duration_minutes', 'max_students', 'total_sessions',
            'level', 'status', 'thumbnail_url', 'tags'
        ];
        allowedFields.forEach(field => {
            if (courseData[field] !== undefined) {
                if (field === 'price' && Number(courseData[field]) < 0) {
                    throw new Error('Giá tiền không được nhỏ hơn 0');
                }
                if (['start_date', 'end_date'].includes(field)) {
                    updatePayload[field] = courseData[field] ? new Date(courseData[field]) : null;
                }
                else if (['duration_months', 'duration_minutes', 'max_students', 'total_sessions'].includes(field)) {
                    updatePayload[field] = courseData[field] ? Number(courseData[field]) : null;
                }
                else {
                    updatePayload[field] = courseData[field];
                }
            }
        });
        return await course_repository_1.courseRepository.update(courseId, updatePayload);
    },
    // Soft delete / archive a course
    async deleteCourse(userId, courseId) {
        const tutor = await tutor_repository_1.tutorRepository.findByUserId(userId);
        if (!tutor) {
            throw new Error('Hồ sơ gia sư không tồn tại');
        }
        const course = await course_repository_1.courseRepository.findById(courseId);
        if (!course) {
            throw new Error('Không tìm thấy khóa học');
        }
        if (course.tutor_id !== tutor.tutor_id) {
            throw new Error('Bạn không có quyền xóa khóa học này');
        }
        return await course_repository_1.courseRepository.delete(courseId);
    },
    // Add a schedule slot to a course
    async addSchedule(userId, courseId, scheduleData) {
        const tutor = await tutor_repository_1.tutorRepository.findByUserId(userId);
        if (!tutor) {
            throw new Error('Hồ sơ gia sư không tồn tại');
        }
        const course = await course_repository_1.courseRepository.findById(courseId);
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
        const existingSchedules = await course_repository_1.courseRepository.findSchedulesByTutor(tutor.tutor_id);
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
            is_recurring: is_recurring || false,
            day_of_week,
            recurrence_end: recurrence_end ? new Date(recurrence_end) : null,
            max_slot: max_slot || course.max_students || 1,
            is_booked: false
        };
        return await course_repository_1.courseRepository.addSchedule(payload);
    },
    // CourseLesson methods
    async addLesson(userId, courseId, lessonData) {
        const tutor = await tutor_repository_1.tutorRepository.findByUserId(userId);
        if (!tutor)
            throw new Error('Hồ sơ gia sư không tồn tại');
        const course = await course_repository_1.courseRepository.findById(courseId);
        if (!course)
            throw new Error('Không tìm thấy khóa học');
        if (course.tutor_id !== tutor.tutor_id)
            throw new Error('Bạn không có quyền quản lý bài học cho khóa học này');
        if (!lessonData.title || !lessonData.video_url) {
            throw new Error('Tiêu đề bài học và đường dẫn video là bắt buộc');
        }
        return await course_repository_1.courseRepository.addLesson({
            course_id: courseId,
            title: lessonData.title,
            description: lessonData.description,
            video_url: lessonData.video_url,
            order_index: lessonData.order_index ? Number(lessonData.order_index) : undefined
        });
    },
    async updateLesson(userId, courseId, lessonId, lessonData) {
        const tutor = await tutor_repository_1.tutorRepository.findByUserId(userId);
        if (!tutor)
            throw new Error('Hồ sơ gia sư không tồn tại');
        const course = await course_repository_1.courseRepository.findById(courseId);
        if (!course)
            throw new Error('Không tìm thấy khóa học');
        if (course.tutor_id !== tutor.tutor_id)
            throw new Error('Bạn không có quyền sửa bài học này');
        return await course_repository_1.courseRepository.updateLesson(lessonId, {
            title: lessonData.title,
            description: lessonData.description,
            video_url: lessonData.video_url,
            order_index: lessonData.order_index ? Number(lessonData.order_index) : undefined
        });
    },
    async deleteLesson(userId, courseId, lessonId) {
        const tutor = await tutor_repository_1.tutorRepository.findByUserId(userId);
        if (!tutor)
            throw new Error('Hồ sơ gia sư không tồn tại');
        const course = await course_repository_1.courseRepository.findById(courseId);
        if (!course)
            throw new Error('Không tìm thấy khóa học');
        if (course.tutor_id !== tutor.tutor_id)
            throw new Error('Bạn không có quyền xóa bài học này');
        return await course_repository_1.courseRepository.deleteLesson(lessonId);
    },
    // List all courses with filtering
    async listCourses(query) {
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
        const { data, count } = await course_repository_1.courseRepository.findAll(filters);
        return { data, total: count, page: filters.page, limit: filters.limit };
    },
    // List courses for a specific tutor
    async listMyCourses(userId, query) {
        const tutor = await tutor_repository_1.tutorRepository.findByUserId(userId);
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
        const { data, count } = await course_repository_1.courseRepository.findAll(filters);
        return { data, total: count, page: filters.page, limit: filters.limit };
    },
    // Get detailed course by id
    async getCourseDetail(courseId) {
        return await course_repository_1.courseRepository.findById(courseId);
    }
};
