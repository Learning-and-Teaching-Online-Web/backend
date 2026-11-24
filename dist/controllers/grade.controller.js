"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gradeController = exports.GRADE_LEVEL_MAP = void 0;
const client_1 = require("@prisma/client");
exports.GRADE_LEVEL_MAP = [
    { grade_id: client_1.GradeLevel.grade_1, code: client_1.GradeLevel.grade_1, name: 'Lớp 1', order_index: 1 },
    { grade_id: client_1.GradeLevel.grade_2, code: client_1.GradeLevel.grade_2, name: 'Lớp 2', order_index: 2 },
    { grade_id: client_1.GradeLevel.grade_3, code: client_1.GradeLevel.grade_3, name: 'Lớp 3', order_index: 3 },
    { grade_id: client_1.GradeLevel.grade_4, code: client_1.GradeLevel.grade_4, name: 'Lớp 4', order_index: 4 },
    { grade_id: client_1.GradeLevel.grade_5, code: client_1.GradeLevel.grade_5, name: 'Lớp 5', order_index: 5 },
    { grade_id: client_1.GradeLevel.grade_6, code: client_1.GradeLevel.grade_6, name: 'Lớp 6', order_index: 6 },
    { grade_id: client_1.GradeLevel.grade_7, code: client_1.GradeLevel.grade_7, name: 'Lớp 7', order_index: 7 },
    { grade_id: client_1.GradeLevel.grade_8, code: client_1.GradeLevel.grade_8, name: 'Lớp 8', order_index: 8 },
    { grade_id: client_1.GradeLevel.grade_9, code: client_1.GradeLevel.grade_9, name: 'Lớp 9', order_index: 9 },
    { grade_id: client_1.GradeLevel.grade_10, code: client_1.GradeLevel.grade_10, name: 'Lớp 10', order_index: 10 },
    { grade_id: client_1.GradeLevel.grade_11, code: client_1.GradeLevel.grade_11, name: 'Lớp 11', order_index: 11 },
    { grade_id: client_1.GradeLevel.grade_12, code: client_1.GradeLevel.grade_12, name: 'Lớp 12', order_index: 12 },
];
exports.gradeController = {
    async getAllGrades(_req, res) {
        try {
            return res.json({
                success: true,
                data: exports.GRADE_LEVEL_MAP
            });
        }
        catch (error) {
            console.error('Error fetching grades:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi khi lấy danh sách khối lớp',
                error: error.message
            });
        }
    }
};
