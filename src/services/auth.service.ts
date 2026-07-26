import { supabase, supabaseAdmin } from '../config/supabase';
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
    if (data.metadata !== undefined) updatePayload.metadata = data.metadata;

    if (data.avatarUrl) {
      let finalAvatarUrl = data.avatarUrl;
      if (data.avatarUrl.startsWith('data:image/')) {
        try {
          try {
            await supabaseAdmin.storage.createBucket('avatars', { public: true });
          } catch (_) {
            // Ignore if bucket already exists
          }

          let base64Data = data.avatarUrl;
          let contentType = 'image/png';
          if (base64Data.includes(';base64,')) {
            const parts = base64Data.split(';base64,');
            contentType = parts[0].replace('data:', '') || 'image/png';
            base64Data = parts[1];
          }

          const buffer = Buffer.from(base64Data, 'base64');
          const ext = contentType.split('/')[1] || 'png';
          const storagePath = `${userId}/avatar_${Date.now()}.${ext}`;

          const { error: uploadError } = await supabaseAdmin.storage
            .from('avatars')
            .upload(storagePath, buffer, { contentType, upsert: true });

          if (!uploadError) {
            const { data: urlData } = supabaseAdmin.storage
              .from('avatars')
              .getPublicUrl(storagePath);
            finalAvatarUrl = urlData.publicUrl;
          } else {
            console.error('Supabase avatar upload error:', uploadError);
          }
        } catch (err) {
          console.error('Error uploading avatar image:', err);
        }
      }
      updatePayload.avatar_url = finalAvatarUrl;
    }

    const updatedProfile = await userRepository.updateById(userId, updatePayload);
    return updatedProfile;
  }
};