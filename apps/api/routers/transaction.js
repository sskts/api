"use strict";
const express = require("express");
let router = express.Router();
const authentication4transaction_1 = require("../middlewares/authentication4transaction");
const TransactionController = require("../controllers/transaction");
const AuthorizationController = require("../controllers/authorization");
router.get("/transactions", (req, res, next) => {
    req.getValidationResult().then((result) => {
        TransactionController.find({}).then((transactions) => {
            res.json({
                success: true,
                message: null,
                transactions: transactions
            });
        }, (err) => {
            res.json({
                success: false,
                message: err.message
            });
        });
    });
});
router.all("/transaction/start", (req, res, next) => {
    req.getValidationResult().then((result) => {
        if (!result.isEmpty())
            return next(new Error(result.useFirstErrorOnly().array().pop().msg));
        // TODO ownersの型チェック
        // let owners = ["5868e16789cc75249cdbfa4b", "5869c2c316aaa805d835f94a"];
        TransactionController.create(req.body.owners).then((transaction) => {
            res.json({
                success: true,
                message: null,
                transaction: transaction
            });
        }, (err) => {
            res.json({
                success: false,
                message: err.message
            });
        });
    });
});
router.all("/transaction/:id/publishPaymentNo", authentication4transaction_1.default, (req, res, next) => {
    req.getValidationResult().then((result) => {
        if (!result.isEmpty())
            return next(new Error(result.useFirstErrorOnly().array().pop().msg));
        TransactionController.publishPaymentNo(req.params.id).then((paymentNo) => {
            res.json({
                success: true,
                message: null,
                payment_no: paymentNo
            });
        }, (err) => {
            res.json({
                success: false,
                message: err.message
            });
        });
    });
});
router.all("/transaction/:id/close", authentication4transaction_1.default, (req, res, next) => {
    req.getValidationResult().then((result) => {
        if (!result.isEmpty())
            return next(new Error(result.useFirstErrorOnly().array().pop().msg));
        TransactionController.close(req.params.id).then((transaction) => {
            res.json({
                success: true,
                message: null,
                transaction: transaction
            });
        }, (err) => {
            res.json({
                success: false,
                message: err.message
            });
        });
    });
});
router.all("/transaction/:id/authorize", authentication4transaction_1.default, (req, res, next) => {
    // TODO validations
    req.getValidationResult().then((result) => {
        if (!result.isEmpty())
            return next(new Error(result.useFirstErrorOnly().array().pop().msg));
        AuthorizationController.create4reservation({
            transaction: req.params.id,
            assets: req.body.assets,
        }).then((authorizations) => {
            res.json({
                success: true,
                message: null,
                authorizations: authorizations
            });
        }, (err) => {
            res.json({
                success: false,
                message: err.message
            });
        });
    });
});
router.all("/transaction/:id/authorize/coaSeatReservation", authentication4transaction_1.default, (req, res, next) => {
    // TODO validations
    req.getValidationResult().then((result) => {
        if (!result.isEmpty())
            return next(new Error(result.useFirstErrorOnly().array().pop().msg));
        AuthorizationController.create4coaSeatReservation({
            transaction: req.params.id,
            authorizations: req.body.authorizations,
        }).then((results) => {
            res.json({
                success: true,
                message: null,
                results: results
            });
        }, (err) => {
            res.json({
                success: false,
                message: err.message
            });
        });
    });
});
router.all("/transaction/:id/unauthorize", authentication4transaction_1.default, (req, res, next) => {
    // TODO validations
    req.getValidationResult().then((result) => {
        if (!result.isEmpty())
            return next(new Error(result.useFirstErrorOnly().array().pop().msg));
        AuthorizationController.removeByCoaTmpReserveNum({
            transaction_id: req.params.id,
            tmp_reserve_num: req.body.coa_tmp_reserve_num,
        }).then(() => {
            res.json({
                success: true,
                message: null
            });
        }, (err) => {
            res.json({
                success: false,
                message: err.message
            });
        });
    });
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = router;
