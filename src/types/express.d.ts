export {};

declare global {
  namespace Express {
    interface User {
      id?: string;
      userId?: string;
      user_id?: string;
      email?: string;
      role?: string;
      full_name?: string;
      user_metadata?: {
        role: string;
        full_name?: string;
      };
      [key: string]: any;
    }
  }
}
