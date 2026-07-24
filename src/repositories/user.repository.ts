import { prisma } from '../config/prisma';

export const userRepository = {

  // Tìm kiếm thông tin profile của user theo ID
  async findById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { user_id: userId }
    });

    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }

    return user;
  },

  // Cập nhật thông tin user theo ID
  async updateById(userId: string, data: { full_name?: string; phone?: string; avatar_url?: string; metadata?: any }) {
    const user = await prisma.user.update({
      where: { user_id: userId },
      data
    });

    return user;
  }

};