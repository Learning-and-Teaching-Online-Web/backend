import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export const passwordUtil = {
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  },

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
};
