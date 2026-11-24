"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const article_controller_1 = require("../controllers/article.controller");
const articleComment_controller_1 = require("../controllers/articleComment.controller");
const articleCategory_controller_1 = require("../controllers/articleCategory.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const articleRoutes = (0, express_1.Router)();
// Category routes (Must be registered before /:id)
articleRoutes.get('/categories', articleCategory_controller_1.articleCategoryController.getAll);
articleRoutes.get('/categories/:id', articleCategory_controller_1.articleCategoryController.getById);
articleRoutes.post('/categories', auth_middleware_1.verifyAuth, (0, auth_middleware_1.requireRole)('admin'), articleCategory_controller_1.articleCategoryController.create);
articleRoutes.put('/categories/:id', auth_middleware_1.verifyAuth, (0, auth_middleware_1.requireRole)('admin'), articleCategory_controller_1.articleCategoryController.update);
articleRoutes.delete('/categories/:id', auth_middleware_1.verifyAuth, (0, auth_middleware_1.requireRole)('admin'), articleCategory_controller_1.articleCategoryController.delete);
// Article CRUD
articleRoutes.get('/', article_controller_1.articleController.getAll);
articleRoutes.get('/:id', article_controller_1.articleController.getById);
// Comment routes
articleRoutes.get('/:articleId/comments', articleComment_controller_1.articleCommentController.getByArticle);
articleRoutes.post('/:articleId/comments', auth_middleware_1.verifyAuth, articleComment_controller_1.articleCommentController.create);
articleRoutes.delete('/comments/:commentId', auth_middleware_1.verifyAuth, articleComment_controller_1.articleCommentController.delete);
// Protected routes for Admin and Approved Tutor to manage articles
articleRoutes.post('/', auth_middleware_1.verifyAuth, auth_middleware_1.requireApprovedTutor, article_controller_1.articleController.create);
articleRoutes.put('/:id', auth_middleware_1.verifyAuth, auth_middleware_1.requireApprovedTutor, article_controller_1.articleController.update);
articleRoutes.delete('/:id', auth_middleware_1.verifyAuth, auth_middleware_1.requireApprovedTutor, article_controller_1.articleController.delete);
exports.default = articleRoutes;
