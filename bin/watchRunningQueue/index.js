"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 実行中ステータスのキュー監視
 *
 * @ignore
 */
const sskts = require("@motionpicture/sskts-domain");
const createDebug = require("debug");
const moment = require("moment");
const mongoose = require("mongoose");
const util = require("util");
const debug = createDebug('sskts-api:*');
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGOLAB_URI);
let countRetry = 0;
let countAbort = 0;
const MAX_NUBMER_OF_PARALLEL_TASKS = 10;
const INTERVAL_MILLISECONDS = 500;
setInterval(() => __awaiter(this, void 0, void 0, function* () {
    if (countRetry > MAX_NUBMER_OF_PARALLEL_TASKS) {
        return;
    }
    countRetry += 1;
    try {
        yield retry();
    }
    catch (error) {
        console.error(error.message);
    }
    countRetry -= 1;
}), INTERVAL_MILLISECONDS);
setInterval(() => __awaiter(this, void 0, void 0, function* () {
    if (countAbort > MAX_NUBMER_OF_PARALLEL_TASKS) {
        return;
    }
    countAbort += 1;
    try {
        yield abort();
    }
    catch (error) {
        console.error(error.message);
    }
    countAbort -= 1;
}), INTERVAL_MILLISECONDS);
const RETRY_INTERVAL_MINUTES = 10;
/**
 * 最終試行から10分経過したキューのリトライ
 *
 * @ignore
 */
function retry() {
    return __awaiter(this, void 0, void 0, function* () {
        const queueRepository = sskts.createQueueRepository(mongoose.connection);
        yield queueRepository.findOneAndUpdate({
            status: sskts.model.QueueStatus.RUNNING,
            last_tried_at: { $lt: moment().add(-RETRY_INTERVAL_MINUTES, 'minutes').toISOString() },
            // tslint:disable-next-line:no-invalid-this space-before-function-paren
            $where: function () { return (this.max_count_try > this.count_tried); }
        }, {
            status: sskts.model.QueueStatus.UNEXECUTED // 実行中に変更
        });
    });
}
/**
 * 最大試行回数に達したキューを実行中止にする
 *
 * @ignore
 */
function abort() {
    return __awaiter(this, void 0, void 0, function* () {
        const queueRepository = sskts.createQueueRepository(mongoose.connection);
        const abortedQueue = yield queueRepository.findOneAndUpdate({
            status: sskts.model.QueueStatus.RUNNING,
            last_tried_at: { $lt: moment().add(-RETRY_INTERVAL_MINUTES, 'minutes').toISOString() },
            // tslint:disable-next-line:no-invalid-this space-before-function-paren
            $where: function () { return (this.max_count_try === this.count_tried); }
        }, {
            status: sskts.model.QueueStatus.ABORTED
        });
        debug('abortedQueue:', abortedQueue);
        if (abortedQueue.isDefined) {
            // メール通知
            yield sskts.service.notification.sendEmail(sskts.model.Notification.createEmail({
                from: 'noreply@localhost',
                to: 'hello@motionpicture.jp',
                subject: `sskts-api[${process.env.NODE_ENV}] queue aborted.`,
                content: `
aborted queue:\n
${util.inspect(abortedQueue, { showHidden: true, depth: 10 })}\n
`
            }))();
        }
    });
}