import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export const referencePriceController = {
  async getAll(req: Request, res: Response) {
    try {
      const prices = await (prisma as any).referencePrice.findMany({
        orderBy: [
          { grade_group: 'asc' },
          { sessions_per_week: 'asc' },
        ],
      });

      return res.json({ data: prices });
    } catch (error: any) {
      console.error('Error fetching reference prices:', error);
      return res.status(500).json({ message: 'Lỗi khi lấy bảng giá tham khảo.', error: error.message });
    }
  },
};
