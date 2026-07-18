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
  }

};