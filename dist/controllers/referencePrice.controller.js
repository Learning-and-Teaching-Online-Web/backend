"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.referencePriceController = void 0;
const prisma_1 = require("../config/prisma");
exports.referencePriceController = {
    async getAll(req, res) {
        try {
            const prices = await prisma_1.prisma.referencePrice.findMany({
                orderBy: [
                    { grade_group: 'asc' },
                    { sessions_per_week: 'asc' },
                ],
            });
            return res.json({ data: prices });
        }
        catch (error) {
            console.error('Error fetching reference prices:', error);
            return res.status(500).json({ message: 'Lỗi khi lấy bảng giá tham khảo.', error: error.message });
        }
    },
};
