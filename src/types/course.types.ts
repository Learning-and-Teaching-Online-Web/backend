export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type SessionStatus = 'upcoming' | 'completed' | 'cancelled';

export interface GenerateSessionsInput {
  start_date: Date | string;
  total_sessions: number;
  schedules: (DayOfWeek | string | number)[];
  schedule_time?: string;
  duration_minutes?: number;
  max_students?: number;
  course_id?: string;
}

export interface SessionRecord {
  session_number: number;
  start_time: Date;
  end_time: Date;
  booked_count: number;
  max_slot: number;
  status: SessionStatus;
  course_id?: string;
}
