import { supabase } from '../config/supabase';
import { userRepository } from '../repositories/user.repository';

export const authService = {

  // Logic Đăng ký tài khoản
  async signUp(body: any) {
    const { email, password, fullName, phone, gender, dateOfBirth, role } = body;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          gender,
          phone: phone,
          date_of_birth: dateOfBirth,
          role,
        },
      }
    });

    if (error) {
      console.error("Supabase auth signUp error details:", error);
      throw new Error(error.message || `AuthError: ${error.status || 'unknown'}`);
    }
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

  // Logic Lấy Profile của User dựa trên UserId hoặc Token
  async getProfile(userIdOrToken: string) {
    let userId = userIdOrToken;

    // Check if passed string is a token (contains dot for JWT) or UUID
    if (userIdOrToken.includes('.')) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(userIdOrToken);
      if (authError || !user) throw new Error('Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
      userId = user.id;
    }

    const profile = await userRepository.findById(userId);
    return profile;
  },

  // Logic Cập nhật thông tin Profile
  async updateProfile(userId: string, data: { fullName?: string; phone?: string; avatarUrl?: string; metadata?: any }) {
    const updatePayload: any = {};
    if (data.fullName !== undefined) updatePayload.full_name = data.fullName;
    if (data.phone !== undefined) updatePayload.phone = data.phone;
    if (data.avatarUrl !== undefined) updatePayload.avatar_url = data.avatarUrl;
    if (data.metadata !== undefined) updatePayload.metadata = data.metadata;

    const updatedProfile = await userRepository.updateById(userId, updatePayload);
    return updatedProfile;
  }
};