import { supabase } from '../config/supabase';

export const userRepository = {

  // Tìm kiếm thông tin profile của user theo ID
  async findById(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    
    return data;
  }

};