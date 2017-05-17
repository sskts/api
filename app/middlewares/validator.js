"use strict";
/**
 * バリデータミドルウェア
 *
 * リクエストのパラメータ(query strings or body parameters)に対するバリデーション
 * @module middlewares/validator
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_status_1 = require("http-status");
exports.default = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    const validatorResult = yield req.getValidationResult();
    if (!validatorResult.isEmpty()) {
        res.status(http_status_1.BAD_REQUEST);
        res.json({
            errors: validatorResult.array().map((mappedRrror) => {
                return {
                    source: { parameter: mappedRrror.param },
                    title: 'invalid parameter',
                    detail: mappedRrror.msg
                };
            })
        });
        return;
    }
    next();
});
