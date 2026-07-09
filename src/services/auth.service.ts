import { supabase } from '../config/supabase';
import { userRepository } from '../repositories/user.repository';

export const authService = {


  // Logic Đăng ký tài khoản
  async signUp(body: any) {
    const { email, password, fullName, phone, gender, dateOfBirth, role } = body;
    console.log("SignUp User:", { email, fullName, phone, gender, dateOfBirth, role });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          gender,
          phone,
          date_of_birth: dateOfBirth,
          role,
        },
      }
    });

    if (error) throw JSON.stringify(error);
    return data.user;
  },

  // Logic Đăng nhập
  async signIn(body: any) {
    const { email, password } = body;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) throw error;
    return { session: data.session, user: data.user };
  },

  // Logic Đăng xuất
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Logic Lấy Profile của User hiện tại dựa trên Token gửi lên
  async getProfile(token: string) {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
    const profile = await userRepository.findById(user.id);

    return profile;
  }
};