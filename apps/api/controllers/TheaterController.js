"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
const BaseController_1 = require("./BaseController");
const routing_controllers_1 = require("routing-controllers");
const request = require("request");
const config = require("config");
let TheaterController = class TheaterController extends BaseController_1.BaseController {
    /**
     * 劇場詳細をコードから取得する
     */
    findByCode(code) {
        let theater;
        return new Promise((resolve, reject) => {
            this.publishAccessToken((err, accessToken) => {
                if (err)
                    return reject(err);
                request.get({
                    url: `${config.get("coa_api_endpoint")}/api/v1/theater/${code}/theater/`,
                    auth: { bearer: accessToken },
                    json: true
                }, (error, response, body) => {
                    this.logger.debug("request processed.", error, body);
                    if (error)
                        return reject(error);
                    if (typeof body === "string")
                        return reject(new Error(body));
                    if (body.message)
                        return reject(new Error(body.message));
                    if (body.status !== 0)
                        return reject(new Error(body.status));
                    theater = {
                        theater_code: body.theater_code,
                        theater_name: body.theater_name,
                        theater_name_eng: body.theater_name_eng,
                        theater_name_kana: body.theater_name_kana,
                    };
                    resolve(theater);
                });
            });
        }).then((result) => {
            return {
                success: true,
                message: null,
                theater: result
            };
        }, (err) => {
            return {
                success: false,
                message: err.message
            };
        });
    }
};
__decorate([
    routing_controllers_1.Get("/theater/:code"),
    __param(0, routing_controllers_1.Param("code")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TheaterController.prototype, "findByCode", null);
TheaterController = __decorate([
    routing_controllers_1.JsonController(),
    __metadata("design:paramtypes", [])
], TheaterController);
exports.TheaterController = TheaterController;
