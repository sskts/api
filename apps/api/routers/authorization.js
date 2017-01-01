"use strict";
const express = require("express");
let router = express.Router();
// import authentication4transaction from "../middlewares/authentication4transaction";
// import * as authorizationController from "../controllers/authorization";
// router.post("/transactionItem/create/reservation", authentication4transaction, (req, res, next) => {
//     req.checkBody("reservations").notEmpty();
//     req.getValidationResult().then((result) => {
//         if (!result.isEmpty()) return next(new Error(result.useFirstErrorOnly().array().pop().msg));
//         // 座席予約パラメータの型をチェック
//         if (!Array.isArray(req.body.reservations)) return next(new Error("parameter \"reservations\" must be an array."));
//         if (req.body.reservations.length === 0) return next(new Error("reservations length must be over 0."));
//         let reservations4args = (<Array<any>>req.body.reservations).map((reservation: any) => {
//             return {
//                 performance: (reservation.performance) ? reservation.performance : null,
//                 seat_code: (reservation.seat_code) ? reservation.seat_code : null
//             }
//         });
//         transactionItemController.create4reservation({
//             transaction_id: req.body.transaction_id,
//             reservations: reservations4args
//         }).then((results) => {
//             res.json({
//                 success: true,
//                 message: null,
//                 results: results
//             });
//         }, (err) => {
//             res.json({
//                 success: false,
//                 message: err.message
//             });
//         });
//     });
// });
router.all("/authorization/issue", (req, res, next) => {
    req.getValidationResult().then((result) => {
        res.json({
            success: false,
            message: "now coding..."
        });
    });
});
router.all("/authorization/revoke", (req, res, next) => {
    req.getValidationResult().then((result) => {
        res.json({
            success: false,
            message: "now coding..."
        });
    });
});
router.all("/authorization/reissue", (req, res, next) => {
    req.getValidationResult().then((result) => {
        res.json({
            success: false,
            message: "now coding..."
        });
    });
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = router;
