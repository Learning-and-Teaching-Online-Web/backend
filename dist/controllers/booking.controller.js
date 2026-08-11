"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingController = void 0;
const booking_service_1 = require("../services/booking.service");
exports.bookingController = {
    // Create a new booking
    async create(req, res) {
        try {
            const userId = req.user?.id;
            const { courseId, scheduleId, notes } = req.body;
            if (!userId) {
                res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
                return;
            }
            if (!courseId) {
                res.status(400).json({ success: false, error: 'Thiếu thông tin khóa học' });
                return;
            }
            const result = await booking_service_1.bookingService.createBooking(userId, courseId, scheduleId, notes);
            res.status(201).json({ success: true, message: 'Đăng ký khóa học thành công', data: result });
        }
        catch (error) {
            console.error('Error in createBooking controller:', error);
            res.status(400).json({ success: false, error: error.message || error });
        }
    },
    // List student bookings
    async listMyBookings(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
                return;
            }
            const result = await booking_service_1.bookingService.getMyBookings(userId);
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            console.error('Error in listMyBookings controller:', error);
            res.status(500).json({ success: false, error: error.message || error });
        }
    },
    // Get student wallet details and history
    async getStudentWallet(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
                return;
            }
            const data = await booking_service_1.bookingService.getStudentWallet(userId);
            res.status(200).json({ success: true, data });
        }
        catch (error) {
            console.error('Error in getStudentWallet controller:', error);
            res.status(500).json({ success: false, error: error.message || error });
        }
    },
    // Mock deposit for student wallet
    async depositStudentWallet(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
                return;
            }
            const { amount } = req.body;
            const numericAmount = Number(amount);
            if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
                res.status(400).json({ success: false, error: 'Số tiền nạp phải lớn hơn 0' });
                return;
            }
            if (numericAmount > 100_000_000) {
                res.status(400).json({ success: false, error: 'Số tiền nạp tối đa là 100.000.000 VNĐ' });
                return;
            }
            const data = await booking_service_1.bookingService.depositStudentWallet(userId, numericAmount);
            res.status(200).json({ success: true, message: `Nạp ${numericAmount.toLocaleString('vi-VN')} VNĐ thành công`, data });
        }
        catch (error) {
            console.error('Error in depositStudentWallet controller:', error);
            res.status(400).json({ success: false, error: error.message || error });
        }
    },
    // Pay booking using wallet
    async payBooking(req, res) {
        try {
            const userId = req.user?.id;
            const bookingId = req.params.id;
            if (!userId) {
                res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
                return;
            }
            if (!bookingId) {
                res.status(400).json({ success: false, error: 'Thiếu mã đơn đăng ký' });
                return;
            }
            const result = await booking_service_1.bookingService.payBooking(userId, bookingId);
            res.status(200).json({ success: true, message: 'Thanh toán khóa học thành công', data: result });
        }
        catch (error) {
            console.error('Error in payBooking controller:', error);
            res.status(400).json({ success: false, error: error.message || error });
        }
    }
};
