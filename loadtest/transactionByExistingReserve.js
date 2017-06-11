"use strict";
/**
 * すでに存在している座席予約を使った取引フローテストスクリプト
 * 運用ではありえない状況
 * シナリオテストに使うためのものです
 *
 * @ignore
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
const httpStatus = require("http-status");
const moment = require("moment");
const request = require("request-promise-native");
const winston = require("winston");
const processOneTransaction_1 = require("./scenarios/processOneTransaction");
const repeatGMOAuthUntilSuccess_1 = require("./scenarios/repeatGMOAuthUntilSuccess");
const wait_1 = require("./scenarios/wait");
const debug = createDebug('sskts-api:loadtest:transactionByExistingReserve');
const logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            timestamp: true,
            level: 'info'
        }),
        new (winston.transports.File)({
            filename: `logs/transactionByExistingReserve-${moment().format('YYYYMMDDHHmmss')}.log`,
            timestamp: true,
            level: 'info',
            json: false
        })
    ]
});
const API_ENDPOINT = process.env.TEST_API_ENDPOINT;
const TEST_THEATER_ID = '118';
const TEST_GMO_SHOP_ID = 'tshop00026096';
const TEST_GMO_SHOP_PASS = 'xbxmkaa6';
// tslint:disable-next-line:max-func-body-length
function main(coaSeatAuthorization, makeInrquiryResult) {
    return __awaiter(this, void 0, void 0, function* () {
        let response;
        // アクセストークン取得
        response = yield request.post({
            url: `${API_ENDPOINT}/oauth/token`,
            body: {
                assertion: process.env.SSKTS_API_REFRESH_TOKEN,
                scope: 'admin'
            },
            json: true,
            simple: false,
            resolveWithFullResponse: true
        });
        debug('oauth token result:', response.statusCode, response.body);
        const accessToken = response.body.access_token;
        const reserveNum = makeInrquiryResult.attributes.inquiry_key.reserve_num;
        const tel = '09012345678';
        const totalPrice = coaSeatAuthorization.price;
        // 取引開始
        debug('starting transaction...');
        response = yield request.post({
            url: `${API_ENDPOINT}/transactions/startIfPossible`,
            auth: { bearer: accessToken },
            body: {
                expires_at: moment().add(15, 'minutes').unix() // tslint:disable-line:no-magic-numbers
            },
            json: true,
            simple: false,
            resolveWithFullResponse: true
        });
        debug('transaction start result:', response.statusCode, response.body);
        if (response.statusCode === httpStatus.NOT_FOUND) {
            throw new Error('please try later');
        }
        if (response.statusCode !== httpStatus.OK) {
            throw new Error(response.body.message);
        }
        const transactionId = response.body.data.id;
        const owners = response.body.data.attributes.owners;
        const promoterOwner = owners.find((owner) => {
            return (owner.group === 'PROMOTER');
        });
        const promoterOwnerId = (promoterOwner) ? promoterOwner.id : null;
        const anonymousOwner = owners.find((owner) => {
            return (owner.group === 'ANONYMOUS');
        });
        const anonymousOwnerId = (anonymousOwner) ? anonymousOwner.id : null;
        // tslint:disable-next-line:no-magic-numbers
        yield wait_1.default(2000);
        // COAオーソリ追加
        debug('adding authorizations coaSeatReservation...');
        const coaSeatAuthorizationNow = Object.assign({}, coaSeatAuthorization, { owner_to: anonymousOwnerId });
        response = yield request.post({
            url: `${API_ENDPOINT}/transactions/${transactionId}/authorizations/coaSeatReservation`,
            auth: { bearer: accessToken },
            body: coaSeatAuthorizationNow,
            json: true,
            simple: false,
            resolveWithFullResponse: true
        });
        debug('addCOASeatReservationAuthorization result:', response.statusCode, response.body);
        if (response.statusCode !== httpStatus.OK) {
            throw new Error(response.body.message);
        }
        // tslint:disable-next-line:no-magic-numbers
        yield wait_1.default(2000);
        // GMOオーソリ取得(できるまで続ける)
        const gmoAuthResult = yield repeatGMOAuthUntilSuccess_1.default({
            gmoShopId: TEST_GMO_SHOP_ID,
            gmoShopPass: TEST_GMO_SHOP_PASS,
            amount: totalPrice,
            orderIdPrefix: `${moment().format('YYYYMMDD')}${TEST_THEATER_ID}${moment().format('HHmmssSS')}`
        });
        logger.info('gmo auth countTry:', gmoAuthResult.countTry);
        // GMOオーソリ追加
        debug('adding authorizations gmo...');
        response = yield request.post({
            url: `${API_ENDPOINT}/transactions/${transactionId}/authorizations/gmo`,
            auth: { bearer: accessToken },
            body: {
                owner_from: anonymousOwnerId,
                owner_to: promoterOwnerId,
                gmo_shop_id: TEST_GMO_SHOP_ID,
                gmo_shop_pass: TEST_GMO_SHOP_PASS,
                gmo_order_id: gmoAuthResult.orderId,
                gmo_amount: totalPrice,
                gmo_access_id: gmoAuthResult.accessId,
                gmo_access_pass: gmoAuthResult.accessPass,
                gmo_job_cd: GMO.Util.JOB_CD_AUTH,
                gmo_pay_type: GMO.Util.PAY_TYPE_CREDIT
            },
            json: true,
            simple: false,
            resolveWithFullResponse: true
        });
        debug('addGMOAuthorization result:', response.statusCode, response.body);
        if (response.statusCode !== httpStatus.OK) {
            throw new Error(response.body.message);
        }
        // 購入者情報登録
        debug('updating anonymous...');
        response = yield request.patch({
            url: `${API_ENDPOINT}/transactions/${transactionId}/anonymousOwner`,
            auth: { bearer: accessToken },
            body: {
                name_first: 'Tetsu',
                name_last: 'Yamazaki',
                tel: tel,
                email: process.env.SSKTS_DEVELOPER_EMAIL
            },
            json: true,
            resolveWithFullResponse: true
        });
        debug('anonymousOwner updated.', response.statusCode, response.body);
        if (response.statusCode !== httpStatus.NO_CONTENT) {
            throw new Error(response.body.message);
        }
        // 照会情報登録(購入番号と電話番号で照会する場合)
        debug('enabling inquiry...');
        response = yield request.patch({
            url: `${API_ENDPOINT}/transactions/${transactionId}/enableInquiry`,
            auth: { bearer: accessToken },
            body: {
                inquiry_theater: TEST_THEATER_ID,
                inquiry_id: reserveNum,
                inquiry_pass: '00000000000' // 購入取消されないようにあえて間違った値
            },
            json: true,
            simple: false,
            resolveWithFullResponse: true
        });
        debug('enableInquiry result:', response.statusCode, response.body);
        if (response.statusCode !== httpStatus.NO_CONTENT) {
            throw new Error(response.body.message);
        }
        // メール追加
        const content = `
sskts-api:examples:transactionByExistingReserve 様\n
\n
-------------------------------------------------------------------\n
この度はご購入いただき誠にありがとうございます。\n
\n
※チケット発券時は、自動発券機に下記チケットQRコードをかざしていただくか、購入番号と電話番号を入力していただく必要があります。\n
-------------------------------------------------------------------\n
\n
◆購入番号 ：${reserveNum}\n
◆電話番号 ${tel}\n
◆合計金額 ：${totalPrice}円\n
\n
※このアドレスは送信専用です。返信はできませんのであらかじめご了承下さい。\n
-------------------------------------------------------------------\n
シネマサンシャイン\n
http://www.cinemasunshine.co.jp/\n
-------------------------------------------------------------------\n
`;
        debug('adding email...');
        response = yield request.post({
            url: `${API_ENDPOINT}/transactions/${transactionId}/notifications/email`,
            auth: { bearer: accessToken },
            body: {
                from: 'noreply@example.com',
                to: process.env.SSKTS_DEVELOPER_EMAIL,
                subject: '購入完了',
                content: content
            },
            json: true,
            simple: false,
            resolveWithFullResponse: true
        });
        debug('addEmail result:', response.statusCode, response.body);
        if (response.statusCode !== httpStatus.OK) {
            throw new Error(response.body.message);
        }
        // tslint:disable-next-line:no-magic-numbers
        yield wait_1.default(2000);
        // 取引成立
        debug('closing transaction...');
        response = yield request.patch({
            url: `${API_ENDPOINT}/transactions/${transactionId}/close`,
            auth: { bearer: accessToken },
            body: {},
            json: true,
            simple: false,
            resolveWithFullResponse: true
        });
        debug('close result:', response.statusCode, response.body);
        if (response.statusCode !== httpStatus.NO_CONTENT) {
            throw new Error(response.body.message);
        }
    });
}
let count = 0;
let numberOfClosedTransactions = 0;
let numberOfProcessedTransactions = 0;
const MAX_NUBMER_OF_PARALLEL_TASKS = 1800;
const INTERVAL_MILLISECONDS = 500;
// まず普通にひとつの取引プロセス
processOneTransaction_1.default({
    apiEndpoint: API_ENDPOINT,
    theaterId: TEST_THEATER_ID,
    gmoShopId: TEST_GMO_SHOP_ID,
    gmoShopPass: TEST_GMO_SHOP_PASS
}).then((processTransactionResult) => {
    logger.info('processTransaction success!', processTransactionResult);
    const timer = setInterval(() => __awaiter(this, void 0, void 0, function* () {
        if (count >= MAX_NUBMER_OF_PARALLEL_TASKS) {
            clearTimeout(timer);
            return;
        }
        count += 1;
        const countNow = count;
        try {
            logger.info('starting...', countNow);
            yield main(processTransactionResult.coaSeatAuthorization, processTransactionResult.makeInrquiryResult);
            numberOfClosedTransactions += 1;
            logger.info('end', countNow);
        }
        catch (error) {
            logger.error('main failed', error, countNow);
        }
        numberOfProcessedTransactions += 1;
        logger.info('numberOfProcessedTransactions:', numberOfProcessedTransactions);
    }), INTERVAL_MILLISECONDS);
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
process.on('exit', () => {
    logger.info('numberOfClosedTransactions:', numberOfClosedTransactions);
});
