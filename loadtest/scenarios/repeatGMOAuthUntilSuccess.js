"use strict";
/**
 * 成功するまでGMOオーソリをたてにいくシナリオ
 *
 * @namespace loadtest/scenarios/repeatGMOAuthUntilSuccess
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
const GMO = require("@motionpicture/gmo-service");
const createDebug = require("debug");
const wait_1 = require("./wait");
const debug = createDebug('sskts-api:loadtest:scenarios:repeatGMOAuthUntilSuccess');
const TEST_CARD_NO = '4111111111111111';
const TEST_EXPIRE = '2012';
const TEST_SECURITY_CODE = '123';
const RETRY_INTERVAL_IN_MILLISECONDS = 2000;
exports.default = (config) => __awaiter(this, void 0, void 0, function* () {
    let result = null;
    let countTry = 0;
    while (result === null) {
        try {
            countTry += 1;
            // {RETRY_INTERVAL_IN_MILLISECONDS}後にリトライ
            yield wait_1.default(RETRY_INTERVAL_IN_MILLISECONDS);
            // GMOオーソリ取得
            // tslint:disable-next-line:no-magic-numbers
            const orderId = `${config.orderIdPrefix}${`00${countTry}`.slice(-2)}`;
            const entryTranResult = yield GMO.CreditService.entryTran({
                shopId: config.gmoShopId,
                shopPass: config.gmoShopPass,
                orderId: orderId,
                jobCd: GMO.Util.JOB_CD_AUTH,
                amount: config.amount
            });
            const execTranResult = yield GMO.CreditService.execTran({
                accessId: entryTranResult.accessId,
                accessPass: entryTranResult.accessPass,
                orderId: orderId,
                method: '1',
                cardNo: TEST_CARD_NO,
                expire: TEST_EXPIRE,
                securityCode: TEST_SECURITY_CODE
            });
            debug(execTranResult);
            result = {
                countTry: countTry,
                orderId: orderId,
                accessId: entryTranResult.accessId,
                accessPass: entryTranResult.accessPass
            };
        }
        catch (error) {
            debug(error);
        }
    }
    return result;
});
