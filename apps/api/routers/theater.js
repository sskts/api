"use strict";
const express_1 = require("express");
let router = express_1.Router();
const theater_1 = require("../../domain/repository/interpreter/theater");
router.get("/theater/:code", (req, res, next) => {
    req.getValidationResult().then((result) => {
        if (!result.isEmpty())
            return next(new Error(result.array()[0].msg));
        theater_1.default.findById(req.params.code).then((theater) => {
            res.json({
                success: true,
                message: "",
                theater: theater
            });
        }).catch((err) => {
            res.json({
                success: false,
                message: err.message
            });
        });
    });
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = router;
