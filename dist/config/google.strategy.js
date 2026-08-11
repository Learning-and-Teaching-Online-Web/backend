"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const env_1 = require("./env");
if (env_1.env.googleClientId && env_1.env.googleClientSecret) {
    passport_1.default.use(new passport_google_oauth20_1.Strategy({
        clientID: env_1.env.googleClientId,
        clientSecret: env_1.env.googleClientSecret,
        callbackURL: env_1.env.googleCallbackUrl,
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            // Pass profile to controller handler
            return done(null, profile);
        }
        catch (error) {
            return done(error, undefined);
        }
    }));
}
else {
    console.warn('[Google OAuth] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing in environment variables.');
}
passport_1.default.serializeUser((user, done) => {
    done(null, user);
});
passport_1.default.deserializeUser((obj, done) => {
    done(null, obj);
});
exports.default = passport_1.default;
