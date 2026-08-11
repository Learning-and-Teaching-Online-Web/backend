import { Request, Response } from 'express';
import { GradeLevel } from '@prisma/client';

export const GRADE_LEVEL_MAP: { grade_id: string; code: GradeLevel; name: string; order_index: number }[] = [
  { grade_id: GradeLevel.grade_1, code: GradeLevel.grade_1, name: 'Lớp 1', order_index: 1 },
  { grade_id: GradeLevel.grade_2, code: GradeLevel.grade_2, name: 'Lớp 2', order_index: 2 },
  { grade_id: GradeLevel.grade_3, code: GradeLevel.grade_3, name: 'Lớp 3', order_index: 3 },
  { grade_id: GradeLevel.grade_4, code: GradeLevel.grade_4, name: 'Lớp 4', order_index: 4 },
  { grade_id: GradeLevel.grade_5, code: GradeLevel.grade_5, name: 'Lớp 5', order_index: 5 },
  { grade_id: GradeLevel.grade_6, code: GradeLevel.grade_6, name: 'Lớp 6', order_index: 6 },
  { grade_id: GradeLevel.grade_7, code: GradeLevel.grade_7, name: 'Lớp 7', order_index: 7 },
  { grade_id: GradeLevel.grade_8, code: GradeLevel.grade_8, name: 'Lớp 8', order_index: 8 },
  { grade_id: GradeLevel.grade_9, code: GradeLevel.grade_9, name: 'Lớp 9', order_index: 9 },
  { grade_id: GradeLevel.grade_10, code: GradeLevel.grade_10, name: 'Lớp 10', order_index: 10 },
  { grade_id: GradeLevel.grade_11, code: GradeLevel.grade_11, name: 'Lớp 11', order_index: 11 },
  { grade_id: GradeLevel.grade_12, code: GradeLevel.grade_12, name: 'Lớp 12', order_index: 12 },
];

export const gradeController = {
  async getAllGrades(_req: Request, res: Response) {
    try {
      return res.json({
        success: true,
        data: GRADE_LEVEL_MAP
      });
    } catch (error: any) {
      console.error('Error fetching grades:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách khối lớp',
        error: error.message
      });
    }
  }
};

