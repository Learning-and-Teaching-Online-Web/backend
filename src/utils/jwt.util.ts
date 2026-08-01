import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'default_access_secret_key_vct_learning_2026';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default_refresh_secret_key_vct_learning_2026';

export interface JwtUserPayload {
  userId: string;
  email: string;
  role: string;
  full_name?: string;
}

export const jwtUtil = {
  generateAccessToken(payload: JwtUserPayload): string {
    return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '2h' });
  },

  generateRefreshToken(payload: JwtUserPayload): string {
    return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
  },

  verifyAccessToken(token: string): JwtUserPayload {
    return jwt.verify(token, ACCESS_SECRET) as JwtUserPayload;
  },

  verifyRefreshToken(token: string): JwtUserPayload {
    return jwt.verify(token, REFRESH_SECRET) as JwtUserPayload;
  }
};
