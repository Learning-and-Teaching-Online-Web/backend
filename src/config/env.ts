import dotenv from "dotenv";

dotenv.config();

export const env = {
    port: Number(process.env.PORT) || 5000,

    supabaseUrl: process.env.SUPABASE_URL!,

    supabaseServiceKey:
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,

    smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: Number(process.env.SMTP_PORT) || 587,
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    smtpFrom: process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@giasuonline.com',

    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',

    escrowPaymentDeadlineHours: Number(process.env.ESCROW_PAYMENT_DEADLINE_HOURS) || 48,
    escrowPaymentDeadlineMinutes: process.env.ESCROW_PAYMENT_DEADLINE_MINUTES
        ? Number(process.env.ESCROW_PAYMENT_DEADLINE_MINUTES)
        : (Number(process.env.ESCROW_PAYMENT_DEADLINE_HOURS) || 48) * 60,
    escrowExpirationCheckIntervalMinutes: Number(process.env.ESCROW_EXPIRATION_CHECK_INTERVAL_MINUTES) || 15,
};