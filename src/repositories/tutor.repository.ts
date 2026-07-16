import { SupabaseClient } from '@supabase/supabase-js';

export const tutorRepository = {
  async findByUserId(supabase: SupabaseClient, userId: string) {
    const { data, error } = await supabase
      .from('tutor_profiles')
      .select('*, user:users(full_name, avatar_url, email)')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is the PostgREST code for "No rows found"
      throw error;
    }
    return data;
  },

  async findAll(supabase: SupabaseClient) {
    const { data, error } = await supabase
      .from('tutor_profiles')
      .select('*, user:users(full_name, avatar_url, email)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async findById(supabase: SupabaseClient, tutorId: string) {
    const { data, error } = await supabase
      .from('tutor_profiles')
      .select('*, user:users(full_name, avatar_url, email)')
      .eq('tutor_id', tutorId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }
};
