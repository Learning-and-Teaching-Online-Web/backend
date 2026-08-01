"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAll = findAll;
const supabase_1 = require("../config/supabase");
async function findAll() {
    return await supabase_1.supabase
        .from("subjects")
        .select("*");
}
