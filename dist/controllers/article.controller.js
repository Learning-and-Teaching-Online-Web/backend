"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.articleController = void 0;
const article_repository_1 = require("../repositories/article.repository");
exports.articleController = {
    async getAll(req, res) {
        try {
            const articles = await article_repository_1.articleRepository.findAll();
            res.status(200).json({ success: true, data: articles });
        }
        catch (error) {
            console.error('Error in getAll articles:', error);
            res.status(500).json({ success: false, error: error.message || error });
        }
    },
    async getById(req, res) {
        try {
            const { id } = req.params;
            const article = await article_repository_1.articleRepository.findById(id);
            if (!article) {
                res.status(404).json({ success: false, error: 'Không tìm thấy bài viết này' });
                return;
            }
            res.status(200).json({ success: true, data: article });
        }
        catch (error) {
            console.error('Error in getById article:', error);
            res.status(500).json({ success: false, error: error.message || error });
        }
    },
    async create(req, res) {
        try {
            const { title, excerpt, content, category, imageType, tags, author: inputAuthor } = req.body;
            if (!title || !excerpt || !content || !category) {
                res.status(400).json({ success: false, error: 'Vui lòng điền đầy đủ các trường bắt buộc (Tiêu đề, Tóm tắt, Thể loại, Nội dung)' });
                return;
            }
            // Format date as 'Month DD, YYYY' (e.g. 'July 24, 2026')
            const dateStr = new Date().toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            });
            const userRole = req.user?.user_metadata?.role || req.user?.role;
            let authorName = req.user?.user_metadata?.full_name || req.user?.email || 'Gia sư';
            if (userRole === 'admin' && inputAuthor) {
                authorName = inputAuthor;
            }
            const newArticle = await article_repository_1.articleRepository.create({
                title,
                excerpt,
                content: Array.isArray(content) ? content : [content],
                published_at: new Date(),
                author: authorName,
                category,
                imageType: imageType || 'globe',
                tags: Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(',').map((t) => t.trim()) : [])
            });
            res.status(201).json({ success: true, message: 'Tạo bài viết thành công', data: newArticle });
        }
        catch (error) {
            console.error('Error in create article:', error);
            res.status(400).json({ success: false, error: error.message || error });
        }
    },
    async update(req, res) {
        try {
            const { id } = req.params;
            const { title, excerpt, content, category, imageType, tags, author } = req.body;
            const existing = await article_repository_1.articleRepository.findById(id);
            if (!existing) {
                res.status(404).json({ success: false, error: 'Không tìm thấy bài viết này' });
                return;
            }
            // Ownership check for non-admin users
            const userRole = req.user?.user_metadata?.role || req.user?.role;
            if (userRole !== 'admin') {
                const userFullName = (req.user?.user_metadata?.full_name || '').toLowerCase().trim();
                const userEmail = (req.user?.email || '').toLowerCase().trim();
                const articleAuthor = existing.author.toLowerCase().trim();
                if (articleAuthor !== userFullName && articleAuthor !== userEmail) {
                    res.status(403).json({ success: false, error: 'Bạn chỉ có quyền chỉnh sửa bài viết của chính mình' });
                    return;
                }
            }
            const updatePayload = {};
            if (title !== undefined)
                updatePayload.title = title;
            if (excerpt !== undefined)
                updatePayload.excerpt = excerpt;
            if (content !== undefined)
                updatePayload.content = Array.isArray(content) ? content : [content];
            if (category !== undefined)
                updatePayload.category = category;
            if (imageType !== undefined)
                updatePayload.imageType = imageType;
            if (tags !== undefined)
                updatePayload.tags = Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(',').map((t) => t.trim()) : []);
            if (author !== undefined && userRole === 'admin')
                updatePayload.author = author;
            const updatedArticle = await article_repository_1.articleRepository.update(id, updatePayload);
            res.status(200).json({ success: true, message: 'Cập nhật bài viết thành công', data: updatedArticle });
        }
        catch (error) {
            console.error('Error in update article:', error);
            res.status(400).json({ success: false, error: error.message || error });
        }
    },
    async delete(req, res) {
        try {
            const { id } = req.params;
            const existing = await article_repository_1.articleRepository.findById(id);
            if (!existing) {
                res.status(404).json({ success: false, error: 'Không tìm thấy bài viết để xóa' });
                return;
            }
            // Ownership check for non-admin users
            const userRole = req.user?.user_metadata?.role || req.user?.role;
            if (userRole !== 'admin') {
                const userFullName = (req.user?.user_metadata?.full_name || '').toLowerCase().trim();
                const userEmail = (req.user?.email || '').toLowerCase().trim();
                const articleAuthor = existing.author.toLowerCase().trim();
                if (articleAuthor !== userFullName && articleAuthor !== userEmail) {
                    res.status(403).json({ success: false, error: 'Bạn chỉ có quyền xóa bài viết của chính mình' });
                    return;
                }
            }
            await article_repository_1.articleRepository.delete(id);
            res.status(200).json({ success: true, message: 'Xóa bài viết thành công' });
        }
        catch (error) {
            console.error('Error in delete article:', error);
            res.status(400).json({ success: false, error: error.message || error });
        }
    }
};
