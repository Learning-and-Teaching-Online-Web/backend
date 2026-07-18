import { Request, Response } from 'express';
import { articleRepository } from '../repositories/article.repository';

export const articleController = {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const articles = await articleRepository.findAll();
      res.status(200).json({ success: true, data: articles });
    } catch (error: any) {
      console.error('Error in getAll articles:', error);
      res.status(500).json({ success: false, error: error.message || error });
    }
  },

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const article = await articleRepository.findById(id as string);
      if (!article) {
        res.status(404).json({ success: false, error: 'Không tìm thấy bài viết này' });
        return;
      }
      res.status(200).json({ success: true, data: article });
    } catch (error: any) {
      console.error('Error in getById article:', error);
      res.status(500).json({ success: false, error: error.message || error });
    }
  }
};
