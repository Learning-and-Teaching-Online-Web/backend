"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingService = void 0;
const booking_repository_1 = require("../repositories/booking.repository");
const course_repository_1 = require("../repositories/course.repository");
const user_repository_1 = require("../repositories/user.repository");
const prisma_1 = require("../config/prisma");
exports.bookingService = {
    // Create a new booking (Supports Online & Offline courses)
    async createBooking(userId, courseId, scheduleId, notes) {
        // 0. Check user role permissions
        const user = await user_repository_1.userRepository.findById(userId);
        if (user.role === 'admin') {
            throw new Error('Tài khoản Quản trị viên (Admin) không thể đăng ký khóa học');
        }
        if (user.role === 'tutor') {
            throw new Error('Tài khoản Giảng viên không thể đăng ký khóa học. Vui lòng sử dụng tài khoản Học viên');
        }
        // 1. Get or create student profile
        let student = await booking_repository_1.bookingRepository.findStudentProfileByUserId(userId);
        if (!student) {
            student = await booking_repository_1.bookingRepository.createStudentProfile(userId);
        }
        // 2. Find course details
        const course = await course_repository_1.courseRepository.findById(courseId);
        if (!course) {
            throw new Error('Không tìm thấy khóa học này');
        }
        let finalScheduleId = scheduleId || null;
        // 3. Resolve and validate schedule if passed
        if (finalScheduleId) {
            const schedules = course.schedules || [];
            const schedule = schedules.find((s) => s.schedule_id === finalScheduleId);
            if (schedule && (schedule.booked_count >= schedule.max_slot || schedule.status === 'completed')) {
                throw new Error('Lịch học này đã đủ số lượng học viên hoặc đã kết thúc');
            }
        }
        // 4. Check if already enrolled in course
        const existingBooking = await booking_repository_1.bookingRepository.findByStudentIdAndCourse(student.student_id, courseId);
        if (existingBooking) {
            throw new Error('Bạn đã đăng ký khóa học này rồi');
        }
        // 5. Build payload
        const bookingPayload = {
            student_id: student.student_id,
            course_id: courseId,
            status: 'pending', // MVP: Tutor must manually approve
            payment_status: 'unpaid', // MVP: Payment pending
            total_amount: Number(course.price),
            currency: 'VND',
            notes: notes || ''
        };
        // 6. Insert booking
        let booking;
        try {
            booking = await booking_repository_1.bookingRepository.insert(bookingPayload);
        }
        catch (insertError) {
            console.error("Failed to insert booking:", insertError);
            throw new Error(`Lỗi khi tạo đăng ký: ${insertError.message || insertError}`);
        }
        // 7. Mark schedule as booked if specific schedule was passed
        if (finalScheduleId) {
            try {
                await booking_repository_1.bookingRepository.markScheduleBooked(finalScheduleId, true);
            }
            catch (schedError) {
                console.error("Warning: Failed to mark schedule as booked:", schedError);
            }
        }
        return booking;
    },
    // Auto-generate ClassSessions for Online Course when Tutor approves booking
    async generateClassSessionsForBooking(bookingId) {
        const booking = await prisma_1.prisma.booking.findUnique({
            where: { booking_id: bookingId },
            include: {
                course: {
                    include: { schedules: { orderBy: { start_time: 'asc' } } }
                }
            }
        });
        if (!booking || !booking.course)
            return;
        const course = booking.course;
        if (course.type === 'online' && course.start_date) {
            const schedules = course.schedules || [];
            const classSessions = [];
            const startDate = new Date(course.start_date);
            const endTimes = schedules.map((s) => new Date(s.end_time).getTime());
            const endDate = endTimes.length > 0 ? new Date(Math.max(...endTimes)) : new Date(startDate);
            let curr = new Date(startDate);
            let sessionCount = 0;
            const totalSessions = course.total_sessions || 999;
            while (curr <= endDate && sessionCount < totalSessions) {
                const dayOfWeek = curr.getDay();
                const matchingSchedules = schedules.filter((s) => s.day_of_week === dayOfWeek && s.is_recurring);
                for (const sched of matchingSchedules) {
                    if (sessionCount >= totalSessions)
                        break;
                    const schedStart = new Date(sched.start_time);
                    const schedEnd = new Date(sched.end_time);
                    const actualStart = new Date(curr);
                    actualStart.setHours(schedStart.getHours(), schedStart.getMinutes(), 0, 0);
                    const actualEnd = new Date(curr);
                    actualEnd.setHours(schedEnd.getHours(), schedEnd.getMinutes(), 0, 0);
                    classSessions.push({
                        booking_id: booking.booking_id,
                        room_id: `room_${booking.booking_id}_${sessionCount + 1}`,
                        title: `Buổi ${sessionCount + 1}`,
                        scheduled_start: actualStart,
                        scheduled_end: actualEnd,
                        status: 'scheduled'
                    });
                    sessionCount++;
                }
                curr.setDate(curr.getDate() + 1);
            }
            if (classSessions.length > 0) {
                try {
                    await booking_repository_1.bookingRepository.insertClassSessions(classSessions);
                }
                catch (sessionError) {
                    console.error("Failed to generate class sessions:", sessionError);
                }
            }
        }
    },
    // Get bookings for currently logged-in student
    async getMyBookings(userId) {
        const student = await booking_repository_1.bookingRepository.findStudentProfileByUserId(userId);
        if (!student) {
            return [];
        }
        return await booking_repository_1.bookingRepository.findByStudentId(student.student_id);
    },
    // Get student wallet balance and transaction logs
    async getStudentWallet(userId) {
        // 1. Get or create wallet
        let wallet = await prisma_1.prisma.wallet.findUnique({
            where: { user_id: userId }
        });
        if (!wallet) {
            wallet = await prisma_1.prisma.wallet.create({
                data: { user_id: userId, balance: 0, currency: 'VND' }
            });
        }
        // 2. Fetch student transactions
        const transactions = await prisma_1.prisma.transaction.findMany({
            where: { user_id: userId },
            orderBy: { created_at: 'desc' }
        });
        const formattedTransactions = transactions.map((tx) => {
            const desc = tx.description || '';
            const isExpense = desc.toLowerCase().includes('thanh toán') || desc.toLowerCase().includes('khấu trừ') || desc.toLowerCase().includes('phí');
            return {
                transaction_id: tx.transaction_id,
                type: isExpense ? 'expense' : 'deposit',
                amount: Number(tx.amount),
                status: tx.status === 'success' ? 'success' : tx.status === 'pending' ? 'pending' : 'failed',
                description: tx.description || 'Nạp tiền vào tài khoản',
                created_at: tx.created_at
            };
        });
        return {
            balance: Number(wallet.balance),
            transactions: formattedTransactions
        };
    },
    // Mock deposit for student wallet
    async depositStudentWallet(userId, amount) {
        // 1. Upsert wallet
        const wallet = await prisma_1.prisma.wallet.upsert({
            where: { user_id: userId },
            create: { user_id: userId, balance: amount, currency: 'VND' },
            update: { balance: { increment: amount }, updated_at: new Date() }
        });
        // 2. Create transaction record
        await prisma_1.prisma.transaction.create({
            data: {
                user_id: userId,
                amount: amount,
                payment_method: 'mock',
                description: 'Nạp tiền giả lập vào ví học viên',
                status: 'success',
                paid_at: new Date()
            }
        });
        return {
            balance: Number(wallet.balance),
            amount_deposited: amount
        };
    },
    // Pay booking using wallet
    async payBooking(userId, bookingId) {
        // 1. Fetch booking with course details
        const booking = await prisma_1.prisma.booking.findUnique({
            where: { booking_id: bookingId },
            include: {
                course: {
                    include: {
                        tutor: {
                            include: {
                                user: true
                            }
                        }
                    }
                }
            }
        });
        if (!booking) {
            throw new Error('Không tìm thấy thông tin đăng ký khóa học');
        }
        // 2. Fetch student profile and authorize
        const student = await booking_repository_1.bookingRepository.findStudentProfileByUserId(userId);
        if (!student || booking.student_id !== student.student_id) {
            throw new Error('Bạn không có quyền thanh toán cho hóa đơn đăng ký này');
        }
        if (booking.payment_status === 'paid') {
            throw new Error('Đơn đăng ký này đã được thanh toán thành công.');
        }
        if (booking.status === 'cancelled') {
            throw new Error('Đơn đăng ký đã bị hủy, không thể tiến hành thanh toán.');
        }
        const totalAmount = Number(booking.total_amount);
        // 3. Check wallet balance
        const wallet = await prisma_1.prisma.wallet.findUnique({
            where: { user_id: userId }
        });
        if (!wallet || Number(wallet.balance) < totalAmount) {
            throw new Error('Số dư ví học viên không đủ. Vui lòng nạp thêm tiền.');
        }
        // 4. Calculate fees
        const platformFee = totalAmount * 0.1;
        const tutorShare = totalAmount * 0.9;
        // 5. Execute transaction
        const updatedBooking = await prisma_1.prisma.$transaction(async (tx) => {
            // Deduct student wallet
            await tx.wallet.update({
                where: { user_id: userId },
                data: { balance: { decrement: totalAmount }, updated_at: new Date() }
            });
            // Credit tutor wallet
            const tutorUserId = booking.course.tutor.user_id;
            await tx.wallet.upsert({
                where: { user_id: tutorUserId },
                create: { user_id: tutorUserId, balance: tutorShare, currency: 'VND' },
                update: { balance: { increment: tutorShare }, updated_at: new Date() }
            });
            // Create student transaction log
            await tx.transaction.create({
                data: {
                    user_id: userId,
                    booking_id: bookingId,
                    amount: totalAmount,
                    payment_method: 'wallet',
                    description: `Thanh toán học phí khóa học: ${booking.course.title}`,
                    status: 'success',
                    paid_at: new Date()
                }
            });
            // Create tutor transaction log
            await tx.transaction.create({
                data: {
                    user_id: tutorUserId,
                    booking_id: bookingId,
                    amount: tutorShare,
                    payment_method: 'wallet',
                    description: `Nhận học phí khóa học: ${booking.course.title} (đã khấu trừ 10% phí nền tảng)`,
                    status: 'success',
                    paid_at: new Date()
                }
            });
            // Update booking status to paid & confirmed
            return await tx.booking.update({
                where: { booking_id: bookingId },
                data: {
                    payment_status: 'paid',
                    status: 'confirmed',
                    platform_fee: platformFee,
                    updated_at: new Date()
                }
            });
        });
        // 6. Generate class sessions if it is an online class
        if (booking.course.type === 'online') {
            try {
                await this.generateClassSessionsForBooking(bookingId);
            }
            catch (sessionErr) {
                console.error('Error generating class sessions after payment:', sessionErr);
            }
        }
        return updatedBooking;
    }
};
