"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewRepository = void 0;
const prisma_1 = require("../config/prisma");
exports.reviewRepository = {
    async findVisibleReviews() {
        const reviews = await prisma_1.prisma.review.findMany({
            where: { is_visible: true },
            include: {
                student: {
                    include: {
                        user: {
                            select: {
                                role: true,
                                user_profile: {
                                    select: {
                                        full_name: true,
                                        avatar_url: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        });
        return reviews.map((r) => {
            if (r.student?.user) {
                r.student.user.full_name = r.student.user.user_profile?.full_name || '';
                r.student.user.avatar_url = r.student.user.user_profile?.avatar_url || null;
            }
            return r;
        });
    },
    async findReviewByBookingId(bookingId) {
        return await prisma_1.prisma.review.findUnique({
            where: { booking_id: bookingId }
        });
    },
    async insert(data) {
        const review = await prisma_1.prisma.review.create({
            data
        });
        // Recalculate average rating & count for TutorProfile
        const stats = await prisma_1.prisma.review.aggregate({
            where: { tutor_id: data.tutor_id, is_visible: true },
            _avg: { rating: true },
            _count: { rating: true }
        });
        await prisma_1.prisma.tutorProfile.update({
            where: { tutor_id: data.tutor_id },
            data: {
                rating: stats._avg.rating ? Number(stats._avg.rating.toFixed(1)) : 0,
                review_count: stats._count.rating || 0
            }
        });
        return review;
    }
};
