"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const express_1 = require("express");
let router = express_1.Router();
const film_1 = require("../../domain/default/repository/interpreter/film");
const master_1 = require("../../domain/default/service/interpreter/master");
router.get("/:id", (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    let validatorResult = yield req.getValidationResult();
    if (!validatorResult.isEmpty())
        return next(new Error(validatorResult.array()[0].msg));
    try {
        let option = yield master_1.default.findFilm({
            film_id: req.params.id
        })(film_1.default);
        option.match({
            Some: (film) => {
                res.json({
                    data: {
                        type: "films",
                        _id: film._id,
                        attributes: film
                    }
                });
            },
            None: () => {
                res.status(404);
                res.json({
                    data: null
                });
            }
        });
    }
    catch (error) {
        next(error);
    }
}));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = router;