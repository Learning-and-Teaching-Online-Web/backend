export interface ClassroomAccessResult {
  can_access: boolean;
  schedule_id: string;
  course_id: string;
  course_title?: string;
  room_id: string;
  start_time: Date;
  end_time: Date;
  user_role: 'student' | 'tutor';
  user_id: string;
}

export interface ClassroomAccessResponse {
  success: boolean;
  message?: string;
  data?: ClassroomAccessResult;
  error?: string;
}

export type SessionStatusInput = 'ongoing' | 'completed';

export interface UpdateSessionStatusResult {
  schedule_id: string;
  course_id: string;
  previous_status: string;
  new_status: string;
  updated_at: Date;
}

export interface UpdateSessionStatusResponse {
  success: boolean;
  message?: string;
  data?: UpdateSessionStatusResult;
  error?: string;
}


