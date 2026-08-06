import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { jwtUtil } from '../utils/jwt.util';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    userId: string;
    user_id: string;
    email: string;
    role: string;
    user_metadata?: {
      role: string;
      full_name?: string;
    };
  };
  token?: string;
}

export const verifyAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const authHeader = authReq.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'Unauthorized: Missing or invalid token format' });
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      res.status(401).json({ success: false, error: 'Unauthorized: Missing token' });
      return;
    }

    // Verify JWT Access Token
    let decoded;
    try {
      decoded = jwtUtil.verifyAccessToken(token);
    } catch (err) {
      res.status(401).json({ success: false, error: 'Unauthorized: Token expired or invalid' });
      return;
    }

    // Attach user information to request object
    authReq.user = {
      id: decoded.userId,
      userId: decoded.userId,
      user_id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      user_metadata: {
        role: decoded.role,
        full_name: decoded.full_name || (decoded.email ? decoded.email.split('@')[0] : '')
      }
    };
    authReq.token = token;

    next();
  } catch (err: any) {
    console.error('Error in verifyAuth middleware:', err);
    res.status(401).json({ success: false, error: 'Unauthorized: Auth failed' });
  }
};

export const optionalAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const authHeader = authReq.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        try {
          const decoded = jwtUtil.verifyAccessToken(token);
          authReq.user = {
            id: decoded.userId,
            userId: decoded.userId,
            user_id: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            user_metadata: {
              role: decoded.role,
              full_name: decoded.full_name || (decoded.email ? decoded.email.split('@')[0] : '')
            }
          };
          authReq.token = token;
        } catch {
          // Token invalid/expired, continue without user
        }
      }
    }
    next();
  } catch {
    next();
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not authenticated' });
      return;
    }

    const userRole = authReq.user.role || authReq.user.user_metadata?.role;
    if (!userRole || !roles.includes(userRole)) {
      res.status(403).json({ success: false, error: 'Forbidden: Insufficient permissions' });
      return;
    }

    next();
  };
};

export const requireApprovedTutor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user) {
    res.status(401).json({ success: false, error: 'Unauthorized: User not authenticated' });
    return;
  }

  const userRole = authReq.user.role || authReq.user.user_metadata?.role;

  // Admin is always allowed
  if (userRole === 'admin') {
    return next();
  }

  if (userRole !== 'tutor') {
    res.status(403).json({ success: false, error: 'Forbidden: Yêu cầu quyền Gia sư hoặc Admin' });
    return;
  }

  try {
    const userId = authReq.user.user_id || authReq.user.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User ID not found' });
      return;
    }

    const profile = await prisma.tutorProfile.findUnique({
      where: { user_id: userId }
    });

    if (!profile || profile.verified_status !== 'approved') {
      res.status(403).json({
        success: false,
        error: 'Forbidden: Hồ sơ gia sư của bạn chưa được duyệt bởi Quản trị viên'
      });
      return;
    }

    next();
  } catch (err: any) {
    console.error('Error in requireApprovedTutor middleware:', err);
    res.status(500).json({ success: false, error: 'Internal server error while checking tutor verification status' });
  }
};
