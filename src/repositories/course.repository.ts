import { SupabaseClient } from '@supabase/supabase-js';

export const courseRepository = {
  // Find course details including tutor, schedules, documents, and quizzes
  async findById(supabase: SupabaseClient, courseId: string) {
    const { data, error } = await supabase
      .from('courses')
      .select('*, tutor:tutor_profiles(*, user:users(full_name, avatar_url)), schedules:course_schedules(*), documents(*), quizzes(*)')
      .eq('course_id', courseId)
      .single();

    if (error) throw error;
    return data;
  },

  // Find all courses with pagination and filter support
  async findAll(supabase: SupabaseClient, filters: any) {
    let query = supabase
      .from('courses')
      .select('*, tutor:tutor_profiles(*, user:users(full_name, avatar_url))', { count: 'exact' });

    if (filters.subject) {
      query = query.eq('subject', filters.subject);
    }
    if (filters.level) {
      query = query.eq('level', filters.level);
    }
    if (filters.min_price) {
      query = query.gte('price', filters.min_price);
    }
    if (filters.max_price) {
      query = query.lte('price', filters.max_price);
    }
    if (filters.tutor_id) {
      query = query.eq('tutor_id', filters.tutor_id);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { data, count: count || 0 };
  },

  // Insert a new course
  async insert(supabase: SupabaseClient, courseData: any) {
    const { data, error } = await supabase
      .from('courses')
      .insert(courseData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update an existing course
  async update(supabase: SupabaseClient, courseId: string, courseData: any) {
    const { data, error } = await supabase
      .from('courses')
      .update(courseData)
      .eq('course_id', courseId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete a course (e.g. by setting status to archived or deleting it)
  async delete(supabase: SupabaseClient, courseId: string) {
    // If we want a soft delete, we can update status to 'archived'
    const { data, error } = await supabase
      .from('courses')
      .update({ status: 'archived' })
      .eq('course_id', courseId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Add schedule to a course
  async addSchedule(supabase: SupabaseClient, scheduleData: any) {
    const { data, error } = await supabase
      .from('course_schedules')
      .insert(scheduleData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Find existing schedules to prevent overlap
  async findOverlappingSchedules(supabase: SupabaseClient, tutorId: string, startTime: string, endTime: string) {
    const { data, error } = await supabase
      .from('course_schedules')
      .select('*, courses(tutor_id)')
      .eq('courses.tutor_id', tutorId)
      .or(`and(start_time.lte.${startTime},end_time.gt.${startTime}),and(start_time.lt.${endTime},end_time.gte.${endTime}),and(start_time.gte.${startTime},end_time.lte.${endTime})`);

    if (error) throw error;
    // PostgREST doesn't support joins filtering in standard select, so let's filter in code to be 100% correct
    const filtered = data ? data.filter((s: any) => s.courses && s.courses.tutor_id === tutorId) : [];
    return filtered;
  }
};
