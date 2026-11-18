import { describe, it, expect } from 'vitest';
import { courseService, generateSessions } from '../course.service';

describe('courseService.generateSessions Integration Test', () => {
  it('Khóa học Thứ 2 & Thứ 4 bắt đầu 16/11/2026 sinh đủ 4 buổi chính xác', () => {
    const sessions = courseService.generateSessions({
      start_date: new Date(2026, 10, 16),
      schedules: ['mon', 'wed'],
      total_sessions: 4,
      schedule_time: '08:00',
      duration_minutes: 60,
      max_students: 2,
    });

    expect(sessions).toHaveLength(4);
    expect(sessions[0].session_number).toBe(1);
    expect(sessions[0].start_time.getDay()).toBe(1);
    expect(sessions[1].session_number).toBe(2);
    expect(sessions[1].start_time.getDay()).toBe(3);
    expect(sessions[2].session_number).toBe(3);
    expect(sessions[2].start_time.getDay()).toBe(1);
    expect(sessions[3].session_number).toBe(4);
    expect(sessions[3].start_time.getDay()).toBe(3);
  });

  it('Ném exception khi total_sessions = 0 hoặc rỗng schedules', () => {
    expect(() =>
      courseService.generateSessions({
        start_date: new Date(2026, 10, 16),
        schedules: ['mon'],
        total_sessions: 0,
      })
    ).toThrowError();

    expect(() =>
      courseService.generateSessions({
        start_date: new Date(2026, 10, 16),
        schedules: [],
        total_sessions: 4,
      })
    ).toThrowError();
  });
});

