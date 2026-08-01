"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const auth_service_1 = require("../services/auth.service");
exports.authController = {
    async signUp(req, res) {
        try {
            const result = await auth_service_1.authService.signUp(req.body);
            res.status(201).json({ success: true, message: 'Đăng ký thành công', data: result });
        }
        catch (error) {
            console.error('Error in signUp:', error);
            res.status(400).json({ success: false, error: error.message || 'Đăng ký thất bại' });
        }
    },
    async signIn(req, res) {
        try {
            const result = await auth_service_1.authService.signIn(req.body);
            res.status(200).json({ success: true, message: 'Đăng nhập thành công', data: result });
        }
        catch (error) {
            console.error('Error in signIn:', error);
            res.status(400).json({ success: false, error: error.message || 'Đăng nhập thất bại' });
        }
    },
    async refreshToken(req, res) {
        try {
            const { refreshToken } = req.body;
            const result = await auth_service_1.authService.refreshAccessToken(refreshToken);
            res.status(200).json({ success: true, message: 'Cấp mới access token thành công', data: result });
        }
        catch (error) {
            console.error('Error in refreshToken:', error);
            res.status(401).json({ success: false, error: error.message || 'Refresh token không hợp lệ' });
        }
    },
    async signOut(req, res) {
        try {
            const { refreshToken } = req.body;
            const userId = req.user?.userId || req.user?.id;
            await auth_service_1.authService.signOut(refreshToken, userId);
            res.status(200).json({ success: true, message: 'Đăng xuất thành công' });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message || 'Đăng xuất thất bại' });
        }
    },
    async getProfile(req, res) {
        try {
            const userId = req.user?.userId || req.user?.id;
            if (!userId) {
                const authHeader = req.headers.authorization;
                if (!authHeader) {
                    res.status(401).json({ success: false, error: 'Thiếu token xác thực' });
                    return;
                }
                const token = authHeader.split(' ')[1];
                const profile = await auth_service_1.authService.getProfile(token);
                res.status(200).json({ success: true, data: profile });
                return;
            }
            const profile = await auth_service_1.authService.getProfile(userId);
            res.status(200).json({ success: true, data: profile });
        }
        catch (error) {
            res.status(401).json({ success: false, error: error.message || 'Lỗi khi lấy thông tin người dùng' });
        }
    },
    async updateProfile(req, res) {
        try {
            const userId = req.user?.userId || req.user?.id;
            if (!userId) {
                res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
                return;
            }
            const updatedProfile = await auth_service_1.authService.updateProfile(userId, req.body);
            res.status(200).json({ success: true, message: 'Cập nhật hồ sơ thành công', data: updatedProfile });
        }
        catch (error) {
            res.status(400).json({ success: false, error: error.message || error });
        }
    }
};
