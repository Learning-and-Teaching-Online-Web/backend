"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.articleCategoryController = void 0;
const articleCategory_repository_1 = require("../repositories/articleCategory.repository");
exports.articleCategoryController = {
    async getAll(req, res) {
        try {
            const includeInactive = req.query.all === 'true';
            const categories = await articleCategory_repository_1.articleCategoryRepository.findAll(includeInactive);
            res.status(200).json({ success: true, data: categories });
        }
        catch (error) {
            console.error('Error in getAll article categories:', error);
            res.status(500).json({ success: false, error: error.message || error });
        }
    },
    async getById(req, res) {
        try {
            const { id } = req.params;
            const category = await articleCategory_repository_1.articleCategoryRepository.findById(id);
            if (!category) {
                res.status(404).json({ success: false, error: 'Không tìm thấy danh mục này' });
                return;
            }
            res.status(200).json({ success: true, data: category });
        }
        catch (error) {
            console.error('Error in getById article category:', error);
            res.status(500).json({ success: false, error: error.message || error });
        }
    },
    async create(req, res) {
        try {
            const { name, slug, description, order_index, is_active } = req.body;
            if (!name) {
                res.status(400).json({ success: false, error: 'Tên danh mục là bắt buộc' });
                return;
            }
            const newCategory = await articleCategory_repository_1.articleCategoryRepository.create({
                name,
                slug,
                description,
                order_index: order_index !== undefined ? Number(order_index) : 0,
                is_active: is_active !== undefined ? Boolean(is_active) : true
            });
            res.status(201).json({ success: true, message: 'Tạo danh mục thành công', data: newCategory });
        }
        catch (error) {
            console.error('Error in create article category:', error);
            res.status(400).json({ success: false, error: error.message || error });
        }
    },
    async update(req, res) {
        try {
            const { id } = req.params;
            const { name, slug, description, order_index, is_active } = req.body;
            const existing = await articleCategory_repository_1.articleCategoryRepository.findById(id);
            if (!existing) {
                res.status(404).json({ success: false, error: 'Không tìm thấy danh mục này' });
                return;
            }
            const updateData = {};
            if (name !== undefined)
                updateData.name = name;
            if (slug !== undefined)
                updateData.slug = slug;
            if (description !== undefined)
                updateData.description = description;
            if (order_index !== undefined)
                updateData.order_index = Number(order_index);
            if (is_active !== undefined)
                updateData.is_active = Boolean(is_active);
            const updated = await articleCategory_repository_1.articleCategoryRepository.update(id, updateData);
            res.status(200).json({ success: true, message: 'Cập nhật danh mục thành công', data: updated });
        }
        catch (error) {
            console.error('Error in update article category:', error);
            res.status(400).json({ success: false, error: error.message || error });
        }
    },
    async delete(req, res) {
        try {
            const { id } = req.params;
            const existing = await articleCategory_repository_1.articleCategoryRepository.findById(id);
            if (!existing) {
                res.status(404).json({ success: false, error: 'Không tìm thấy danh mục để xóa' });
                return;
            }
            await articleCategory_repository_1.articleCategoryRepository.delete(id);
            res.status(200).json({ success: true, message: 'Xóa danh mục thành công' });
        }
        catch (error) {
            console.error('Error in delete article category:', error);
            res.status(400).json({ success: false, error: error.message || error });
        }
    }
};
