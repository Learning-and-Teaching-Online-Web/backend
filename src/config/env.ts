import dotenv from "dotenv";

dotenv.config();

export const env = {
    port: Number(process.env.PORT) || 5000,

    supabaseUrl: process.env.SUPABASE_URL!,

    supabaseServiceKey:
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
};