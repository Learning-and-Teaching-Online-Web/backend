import { SupabaseClient } from '@supabase/supabase-js';

export const bookingRepository = {
  // Find student profile by user_id
  async findStudentProfileByUserId(supabase: SupabaseClient, userId: string) {
    const { data, error } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is no rows found
      throw error;
    }
    return data;
  },

  // Create student profile for user
  async createStudentProfile(supabase: SupabaseClient, userId: string) {
    const { data, error } = await supabase
      .from('student_profiles')
      .insert({ user_id: userId })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Insert new booking
  async insert(supabase: SupabaseClient, bookingData: any) {
    const { data, error } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Find bookings by studentId, joining courses and tutor profile/user info
  async findByStudentId(supabase: SupabaseClient, studentId: string) {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, course:courses(*, tutor:tutor_profiles(*, user:users(full_name, avatar_url))), schedule:course_schedules(*)')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Check if student already enrolled in a specific course
  async findByStudentIdAndCourse(supabase: SupabaseClient, studentId: string, courseId: string) {
    const { data, error } = await supabase
      .from('bookings')
      .select('booking_id')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .neq('status', 'cancelled');

    if (error) throw error;
    return data;
  },

  // Mark schedule as booked
  async markScheduleBooked(supabase: SupabaseClient, scheduleId: string, isBooked: boolean) {
    const { data, error } = await supabase
      .from('course_schedules')
      .update({ is_booked: isBooked })
      .eq('schedule_id', scheduleId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
