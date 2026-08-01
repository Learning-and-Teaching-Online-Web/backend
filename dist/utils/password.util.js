"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.passwordUtil = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const SALT_ROUNDS = 10;
exports.passwordUtil = {
    async hashPassword(password) {
        return bcryptjs_1.default.hash(password, SALT_ROUNDS);
    },
    async comparePassword(password, hash) {
        return bcryptjs_1.default.compare(password, hash);
    }
};
