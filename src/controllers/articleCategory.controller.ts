import { Request, Response } from 'express';
import { articleCategoryRepository } from '../repositories/articleCategory.repository';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export const articleCategoryController = {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const includeInactive = req.query.all === 'true';
      const categories = await articleCategoryRepository.findAll(includeInactive);
      res.status(200).json({ success: true, data: categories });
    } catch (error: any) {
      console.error('Error in getAll article categories:', error);
      res.status(500).json({ success: false, error: error.message || error });
    }
  },

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const category = await articleCategoryRepository.findById(id as string);
      if (!category) {
        res.status(404).json({ success: false, error: 'Không tìm thấy danh mục này' });
        return;
      }
      res.status(200).json({ success: true, data: category });
    } catch (error: any) {
      console.error('Error in getById article category:', error);
      res.status(500).json({ success: false, error: error.message || error });
    }
  },

  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { name, slug, description, order_index, is_active } = req.body;
      if (!name) {
        res.status(400).json({ success: false, error: 'Tên danh mục là bắt buộc' });
        return;
      }

      const newCategory = await articleCategoryRepository.create({
        name,
        slug,
        description,
        order_index: order_index !== undefined ? Number(order_index) : 0,
        is_active: is_active !== undefined ? Boolean(is_active) : true
      });

      res.status(201).json({ success: true, message: 'Tạo danh mục thành công', data: newCategory });
    } catch (error: any) {
      console.error('Error in create article category:', error);
      res.status(400).json({ success: false, error: error.message || error });
    }
  },

  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, slug, description, order_index, is_active } = req.body;

      const existing = await articleCategoryRepository.findById(id as string);
      if (!existing) {
        res.status(404).json({ success: false, error: 'Không tìm thấy danh mục này' });
        return;
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (slug !== undefined) updateData.slug = slug;
      if (description !== undefined) updateData.description = description;
      if (order_index !== undefined) updateData.order_index = Number(order_index);
      if (is_active !== undefined) updateData.is_active = Boolean(is_active);

      const updated = await articleCategoryRepository.update(id as string, updateData);
      res.status(200).json({ success: true, message: 'Cập nhật danh mục thành công', data: updated });
    } catch (error: any) {
      console.error('Error in update article category:', error);
      res.status(400).json({ success: false, error: error.message || error });
    }
  },

  async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const existing = await articleCategoryRepository.findById(id as string);
      if (!existing) {
        res.status(404).json({ success: false, error: 'Không tìm thấy danh mục để xóa' });
        return;
      }

      await articleCategoryRepository.delete(id as string);
      res.status(200).json({ success: true, message: 'Xóa danh mục thành công' });
    } catch (error: any) {
      console.error('Error in delete article category:', error);
      res.status(400).json({ success: false, error: error.message || error });
    }
  }
};
