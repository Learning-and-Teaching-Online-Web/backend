"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseAdmin = exports.createUserClient = exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const env_1 = require("./env");
exports.supabase = (0, supabase_js_1.createClient)(env_1.env.supabaseUrl, env_1.env.supabaseAnonKey);
const createUserClient = (jwt) => {
    return (0, supabase_js_1.createClient)(env_1.env.supabaseUrl, env_1.env.supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${jwt}` } },
        auth: { autoRefreshToken: false, persistSession: false }
    });
};
exports.createUserClient = createUserClient;
exports.supabaseAdmin = (0, supabase_js_1.createClient)(env_1.env.supabaseUrl, env_1.env.supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});
