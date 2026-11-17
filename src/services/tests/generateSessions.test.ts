import { describe, it, expect } from 'vitest';
import { generateSessions, normalizeDayOfWeek, courseService } from '../course.service';
import type { GenerateSessionsInput } from '../../types/course.types';

describe('generateSessions Service Test', () => {

  // =========================================================================
  // Test Case 1 (Thành công): Khóa học bắt đầu ngày Thứ 2, tổng 4 buổi (học T2 & T4)
  // =========================================================================
  describe('Test Case 1 (Thành công): Sinh lịch 4 buổi học T2 & T4', () => {
    it('Khóa học bắt đầu ngày Thứ 2, tổng 4 buổi (học Thứ 2 & Thứ 4) -> Sinh đúng 4 bản ghi với ngày giờ chính xác', () => {
      // 2026-11-16 là ngày Thứ 2 (Monday)
      const startDate = new Date(2026, 10, 16, 8, 0, 0); // Month 10 = November in JS Date
      expect(startDate.getDay()).toBe(1); // Kiểm tra chính xác là Thứ 2

      const input: GenerateSessionsInput = {
        start_date: startDate,
        schedules: ['mon', 'wed'],
        total_sessions: 4,
        schedule_time: '08:00',
        duration_minutes: 60,
        max_students: 5,
        course_id: 'mock-course-id-123'
      };

      const result = generateSessions(input);

      // 1. Kiểm tra số lượng bản ghi trả về
      expect(result).toBeDefined();
      expect(result).toHaveLength(4);

      // 2. Buổi 1: Thứ 2 (16/11/2026)
      expect(result[0].session_number).toBe(1);
      expect(result[0].start_time.getFullYear()).toBe(2026);
      expect(result[0].start_time.getMonth()).toBe(10);
      expect(result[0].start_time.getDate()).toBe(16);
      expect(result[0].start_time.getDay()).toBe(1); // Thứ 2
      expect(result[0].start_time.getHours()).toBe(8);
      expect(result[0].start_time.getMinutes()).toBe(0);
      expect(result[0].end_time.getHours()).toBe(9);
      expect(result[0].end_time.getMinutes()).toBe(0);
      expect(result[0].max_slot).toBe(5);
      expect(result[0].booked_count).toBe(0);
      expect(result[0].status).toBe('upcoming');
      expect(result[0].course_id).toBe('mock-course-id-123');

      // 3. Buổi 2: Thứ 4 (18/11/2026)
      expect(result[1].session_number).toBe(2);
      expect(result[1].start_time.getFullYear()).toBe(2026);
      expect(result[1].start_time.getMonth()).toBe(10);
      expect(result[1].start_time.getDate()).toBe(18);
      expect(result[1].start_time.getDay()).toBe(3); // Thứ 4
      expect(result[1].start_time.getHours()).toBe(8);
      expect(result[1].end_time.getHours()).toBe(9);

      // 4. Buổi 3: Thứ 2 tuần kế tiếp (23/11/2026)
      expect(result[2].session_number).toBe(3);
      expect(result[2].start_time.getFullYear()).toBe(2026);
      expect(result[2].start_time.getMonth()).toBe(10);
      expect(result[2].start_time.getDate()).toBe(23);
      expect(result[2].start_time.getDay()).toBe(1); // Thứ 2
      expect(result[2].start_time.getHours()).toBe(8);
      expect(result[2].end_time.getHours()).toBe(9);

      // 5. Buổi 4: Thứ 4 tuần kế tiếp (25/11/2026)
      expect(result[3].session_number).toBe(4);
      expect(result[3].start_time.getFullYear()).toBe(2026);
      expect(result[3].start_time.getMonth()).toBe(10);
      expect(result[3].start_time.getDate()).toBe(25);
      expect(result[3].start_time.getDay()).toBe(3); // Thứ 4
      expect(result[3].start_time.getHours()).toBe(8);
      expect(result[3].end_time.getHours()).toBe(9);

      // 6. Kiểm tra thời lượng mỗi buổi đều chính xác 60 phút
      result.forEach((session) => {
        const diffMs = session.end_time.getTime() - session.start_time.getTime();
        expect(diffMs).toBe(60 * 60 * 1000);
      });
    });

    it('Hỗ trợ gọi hàm thông qua courseService.generateSessions', () => {
      const startDate = new Date(2026, 10, 16);
      const result = courseService.generateSessions({
        start_date: startDate,
        schedules: ['mon', 'wed'],
        total_sessions: 4,
        schedule_time: '14:30',
        duration_minutes: 90,
      });

      expect(result).toHaveLength(4);
      expect(result[0].start_time.getHours()).toBe(14);
      expect(result[0].start_time.getMinutes()).toBe(30);
      expect(result[0].end_time.getHours()).toBe(16);
      expect(result[0].end_time.getMinutes()).toBe(0);
    });

    it('Hỗ trợ truyền định dạng tiếng Việt: ["Thứ 2", "Thứ 4"]', () => {
      const startDate = new Date(2026, 10, 16);
      const result = generateSessions({
        start_date: startDate,
        schedules: ['Thứ 2', 'Thứ 4'],
        total_sessions: 4,
        schedule_time: '09:00',
        duration_minutes: 60
      });

      expect(result).toHaveLength(4);
      expect(result[0].start_time.getDay()).toBe(1);
      expect(result[1].start_time.getDay()).toBe(3);
      expect(result[2].start_time.getDay()).toBe(1);
      expect(result[3].start_time.getDay()).toBe(3);
    });

    it('Hỗ trợ gọi hàm theo kiểu positional arguments', () => {
      const startDate = new Date(2026, 10, 16);
      const result = generateSessions(startDate, ['mon', 'wed'], 4, 60, '08:00', 3);

      expect(result).toHaveLength(4);
      expect(result[0].max_slot).toBe(3);
      expect(result[0].start_time.getDate()).toBe(16);
      expect(result[1].start_time.getDate()).toBe(18);
    });

    it('Khi start_date không rơi vào ngày học, tự động tìm buổi học hợp lệ đầu tiên tiếp theo', () => {
      // 2026-11-17 là Thứ 3 (Tuesday), trong khi lịch chỉ học Thứ 2 & Thứ 4
      const startDate = new Date(2026, 10, 17);
      expect(startDate.getDay()).toBe(2);

      const result = generateSessions({
        start_date: startDate,
        schedules: ['mon', 'wed'],
        total_sessions: 2,
        schedule_time: '08:00',
      });

      expect(result).toHaveLength(2);
      // Buổi 1 phải là Thứ 4 ngày 18/11
      expect(result[0].start_time.getDay()).toBe(3);
      expect(result[0].start_time.getDate()).toBe(18);
      // Buổi 2 phải là Thứ 2 ngày 23/11
      expect(result[1].start_time.getDay()).toBe(1);
      expect(result[1].start_time.getDate()).toBe(23);
    });
  });

  // =========================================================================
  // Test Case 2 (Edge cases): total_sessions = 0 hoặc rỗng schedules -> Bắt lỗi ném ra Exception
  // =========================================================================
  describe('Test Case 2 (Edge cases): Bắt lỗi Exception và tránh lặp vô tận', () => {
    it('total_sessions = 0 -> Ném ra Exception hợp lệ', () => {
      expect(() => {
        generateSessions({
          start_date: new Date(2026, 10, 16),
          schedules: ['mon', 'wed'],
          total_sessions: 0,
        });
      }).toThrowError(/total_sessions/i);
    });

    it('total_sessions < 0 (số âm) -> Ném ra Exception hợp lệ', () => {
      expect(() => {
        generateSessions({
          start_date: new Date(2026, 10, 16),
          schedules: ['mon', 'wed'],
          total_sessions: -5,
        });
      }).toThrowError(/total_sessions/i);
    });

    it('total_sessions không phải là số hợp lệ -> Ném ra Exception', () => {
      expect(() => {
        generateSessions({
          start_date: new Date(2026, 10, 16),
          schedules: ['mon', 'wed'],
          total_sessions: NaN,
        });
      }).toThrowError(/total_sessions/i);
    });

    it('schedules rỗng [] -> Ném ra Exception hợp lệ, không crash vòng lặp vô tận', () => {
      expect(() => {
        generateSessions({
          start_date: new Date(2026, 10, 16),
          schedules: [],
          total_sessions: 4,
        });
      }).toThrowError(/schedules/i);
    });

    it('schedules không chứa thứ hợp lệ nào -> Ném ra Exception, không lặp vô tận', () => {
      expect(() => {
        generateSessions({
          start_date: new Date(2026, 10, 16),
          schedules: ['invalid_day_1', 'xyz'],
          total_sessions: 4,
        });
      }).toThrowError(/hợp lệ/i);
    });

    it('start_date thiếu hoặc không hợp lệ -> Ném ra Exception hợp lệ', () => {
      expect(() => {
        generateSessions({
          start_date: '',
          schedules: ['mon'],
          total_sessions: 4,
        });
      }).toThrowError(/start_date/i);

      expect(() => {
        generateSessions({
          start_date: 'ngay-khong-hop-le',
          schedules: ['mon'],
          total_sessions: 4,
        });
      }).toThrowError(/start_date/i);
    });

    it('duration_minutes <= 0 -> Ném ra Exception hợp lệ', () => {
      expect(() => {
        generateSessions({
          start_date: new Date(2026, 10, 16),
          schedules: ['mon'],
          total_sessions: 4,
          duration_minutes: 0,
        });
      }).toThrowError(/duration_minutes/i);
    });
  });

  // =========================================================================
  // Test Case Helper: normalizeDayOfWeek
  // =========================================================================
  describe('Helper normalizeDayOfWeek', () => {
    it('Chuyển đổi đúng các thứ tiếng Anh và tiếng Việt', () => {
      expect(normalizeDayOfWeek('mon')).toBe(1);
      expect(normalizeDayOfWeek('Monday')).toBe(1);
      expect(normalizeDayOfWeek('t2')).toBe(1);
      expect(normalizeDayOfWeek('Thứ 2')).toBe(1);

      expect(normalizeDayOfWeek('wed')).toBe(3);
      expect(normalizeDayOfWeek('Wednesday')).toBe(3);
      expect(normalizeDayOfWeek('t4')).toBe(3);
      expect(normalizeDayOfWeek('Thứ 4')).toBe(3);

      expect(normalizeDayOfWeek('sun')).toBe(0);
      expect(normalizeDayOfWeek('chủ nhật')).toBe(0);
      expect(normalizeDayOfWeek('CN')).toBe(0);

      expect(normalizeDayOfWeek('khong-hop-le')).toBeNull();
    });
  });

  // =========================================================================
  // Test Case: Mock data độc lập - không tương tác Database thật
  // =========================================================================
  describe('Tính độc lập của hàm generateSessions', () => {
    it('Hàm thuần túy (pure function) hoạt động độc lập không cần kết nối DB', () => {
      const result = generateSessions({
        start_date: '2026-11-16',
        schedules: ['mon', 'wed'],
        total_sessions: 4,
        schedule_time: '10:00',
        duration_minutes: 45,
        max_students: 10,
      });

      expect(result).toHaveLength(4);
      expect(result.every(r => r.max_slot === 10)).toBe(true);
      expect(result.every(r => r.status === 'upcoming')).toBe(true);
    });
  });

});
