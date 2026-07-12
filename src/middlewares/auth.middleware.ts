import { Request, Response, NextFunction } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { createUserClient } from '../config/supabase';

export interface AuthenticatedRequest extends Request {
  user?: any;
  supabase?: SupabaseClient;
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
    const userSupabase = createUserClient(token);

    const { data: { user }, error } = await userSupabase.auth.getUser();
    if (error || !user) {
      res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
      return;
    }

    // Attach user, scoped supabase client, and token to request object
    authReq.user = user; // { id, email, user_metadata: { role, full_name, ... }, ... }
    authReq.supabase = userSupabase;
    authReq.token = token;

    next();
  } catch (err: any) {
    console.error('Error in verifyAuth middleware:', err);
    res.status(401).json({ success: false, error: 'Unauthorized: Auth failed' });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not authenticated' });
      return;
    }

    const userRole = authReq.user.user_metadata?.role || authReq.user.role;
    if (!roles.includes(userRole)) {
      res.status(403).json({ success: false, error: 'Forbidden: Insufficient permissions' });
      return;
    }

    next();
  };
};
