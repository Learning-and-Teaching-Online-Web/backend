"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.favoriteController = void 0;
const favorite_repository_1 = require("../repositories/favorite.repository");
exports.favoriteController = {
    async toggleFavorite(req, res) {
        try {
            const userId = req.user?.id;
            const { tutorId } = req.body;
            if (!userId) {
                res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
                return;
            }
            if (!tutorId) {
                res.status(400).json({ success: false, error: 'Thiếu thông tin ID giảng viên' });
                return;
            }
            let student = await favorite_repository_1.favoriteRepository.findStudentProfileByUserId(userId);
            if (!student) {
                student = await favorite_repository_1.favoriteRepository.createStudentProfile(userId);
            }
            const existing = await favorite_repository_1.favoriteRepository.findFavorite(student.student_id, tutorId);
            if (existing) {
                await favorite_repository_1.favoriteRepository.remove(student.student_id, tutorId);
                res.status(200).json({ success: true, message: 'Đã xóa khỏi danh sách yêu thích', isFavorite: false });
            }
            else {
                await favorite_repository_1.favoriteRepository.add(student.student_id, tutorId);
                res.status(201).json({ success: true, message: 'Đã thêm vào danh sách yêu thích', isFavorite: true });
            }
        }
        catch (error) {
            console.error('Error in toggleFavorite:', error);
            res.status(500).json({ success: false, error: error.message || error });
        }
    },
    async listMyFavorites(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
                return;
            }
            const student = await favorite_repository_1.favoriteRepository.findStudentProfileByUserId(userId);
            if (!student) {
                res.status(200).json({ success: true, data: [] });
                return;
            }
            const favorites = await favorite_repository_1.favoriteRepository.getFavoritesByStudentId(student.student_id);
            res.status(200).json({ success: true, data: favorites });
        }
        catch (error) {
            console.error('Error in listMyFavorites:', error);
            res.status(500).json({ success: false, error: error.message || error });
        }
    }
};
