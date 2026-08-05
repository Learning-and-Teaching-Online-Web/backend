"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const course_controller_1 = require("../controllers/course.controller");
const courseComment_controller_1 = require("../controllers/courseComment.controller");
const document_controller_1 = require("../controllers/document.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const courseRoutes = (0, express_1.Router)();
// Public routes
courseRoutes.get('/', course_controller_1.courseController.list);
// Tutor specific course fetch (must be before /:id)
courseRoutes.get('/my-courses', auth_middleware_1.verifyAuth, (0, auth_middleware_1.requireRole)('tutor'), course_controller_1.courseController.myCourses);
// Comment routes
courseRoutes.get('/:courseId/comments', courseComment_controller_1.courseCommentController.getByCourse);
courseRoutes.post('/:courseId/comments', auth_middleware_1.verifyAuth, courseComment_controller_1.courseCommentController.create);
courseRoutes.delete('/comments/:commentId', auth_middleware_1.verifyAuth, courseComment_controller_1.courseCommentController.delete);
// Document routes
courseRoutes.get('/:courseId/documents', document_controller_1.documentController.getByCourse);
courseRoutes.post('/:courseId/documents', auth_middleware_1.verifyAuth, auth_middleware_1.requireApprovedTutor, document_controller_1.documentController.create);
courseRoutes.patch('/documents/:docId', auth_middleware_1.verifyAuth, auth_middleware_1.requireApprovedTutor, document_controller_1.documentController.update);
courseRoutes.delete('/documents/:docId', auth_middleware_1.verifyAuth, auth_middleware_1.requireApprovedTutor, document_controller_1.documentController.delete);
// Lesson routes (CourseLesson video lectures for Offline courses)
courseRoutes.post('/:id/lessons', auth_middleware_1.verifyAuth, auth_middleware_1.requireApprovedTutor, course_controller_1.courseController.addLesson);
courseRoutes.patch('/:id/lessons/:lessonId', auth_middleware_1.verifyAuth, auth_middleware_1.requireApprovedTutor, course_controller_1.courseController.updateLesson);
courseRoutes.delete('/:id/lessons/:lessonId', auth_middleware_1.verifyAuth, auth_middleware_1.requireApprovedTutor, course_controller_1.courseController.deleteLesson);
courseRoutes.get('/:id', course_controller_1.courseController.detail);
// Tutor protected routes
courseRoutes.post('/', auth_middleware_1.verifyAuth, auth_middleware_1.requireApprovedTutor, course_controller_1.courseController.create);
courseRoutes.patch('/:id', auth_middleware_1.verifyAuth, auth_middleware_1.requireApprovedTutor, course_controller_1.courseController.update);
courseRoutes.delete('/:id', auth_middleware_1.verifyAuth, auth_middleware_1.requireApprovedTutor, course_controller_1.courseController.delete);
// Schedule routes
courseRoutes.post('/:id/schedules', auth_middleware_1.verifyAuth, auth_middleware_1.requireApprovedTutor, course_controller_1.courseController.addSchedule);
courseRoutes.delete('/:id/schedules', auth_middleware_1.verifyAuth, auth_middleware_1.requireApprovedTutor, course_controller_1.courseController.deleteSchedules);
exports.default = courseRoutes;
