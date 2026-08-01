"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const review_controller_1 = require("../controllers/review.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const reviewRoutes = (0, express_1.Router)();
// Public route to fetch student feedbacks/reviews for homepage
reviewRoutes.get('/visible', review_controller_1.reviewController.getVisibleReviews);
// Protected route to create a new review for a booking
reviewRoutes.post('/', auth_middleware_1.verifyAuth, review_controller_1.reviewController.createReview);
exports.default = reviewRoutes;
