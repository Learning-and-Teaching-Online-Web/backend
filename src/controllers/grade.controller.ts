import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export const gradeController = {
  async getAllGrades(_req: Request, res: Response) {
    try {
      let grades = await prisma.grade.findMany({
        where: { is_active: true },
        orderBy: { order_index: 'asc' }
      });

      // Nếu chưa có dữ liệu trong DB, bổ sung các lớp mặc định (an toàn, dùng upsert)
      if (grades.length === 0) {
        const defaultGrades = [
          { name: 'Lớp 1', order_index: 1 },
          { name: 'Lớp 2', order_index: 2 },
          { name: 'Lớp 3', order_index: 3 },
          { name: 'Lớp 4', order_index: 4 },
          { name: 'Lớp 5', order_index: 5 },
          { name: 'Lớp 6', order_index: 6 },
          { name: 'Lớp 7', order_index: 7 },
          { name: 'Lớp 8', order_index: 8 },
          { name: 'Lớp 9', order_index: 9 },
          { name: 'Lớp 10', order_index: 10 },
          { name: 'Lớp 11', order_index: 11 },
          { name: 'Lớp 12', order_index: 12 },
          { name: 'Ôn thi Đại Học', order_index: 13 }
        ];

        for (const item of defaultGrades) {
          await prisma.grade.upsert({
            where: { name: item.name },
            create: { name: item.name, order_index: item.order_index, is_active: true },
            update: {}
          });
        }

        grades = await prisma.grade.findMany({
          where: { is_active: true },
          orderBy: { order_index: 'asc' }
        });
      }

      return res.json({
        success: true,
        data: grades
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
