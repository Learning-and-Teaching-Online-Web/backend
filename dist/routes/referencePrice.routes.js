"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const referencePrice_controller_1 = require("../controllers/referencePrice.controller");
const referencePriceRoutes = (0, express_1.Router)();
referencePriceRoutes.get('/', referencePrice_controller_1.referencePriceController.getAll);
exports.default = referencePriceRoutes;
