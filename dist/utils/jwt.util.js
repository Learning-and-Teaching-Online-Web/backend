"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtUtil = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'default_access_secret_key_vct_learning_2026';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default_refresh_secret_key_vct_learning_2026';
exports.jwtUtil = {
    generateAccessToken(payload) {
        return jsonwebtoken_1.default.sign(payload, ACCESS_SECRET, { expiresIn: '2h' });
    },
    generateRefreshToken(payload) {
        return jsonwebtoken_1.default.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
    },
    verifyAccessToken(token) {
        return jsonwebtoken_1.default.verify(token, ACCESS_SECRET);
    },
    verifyRefreshToken(token) {
        return jsonwebtoken_1.default.verify(token, REFRESH_SECRET);
    }
};
