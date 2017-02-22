"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/**
 * 取引照会無効化
 *
 * @ignore
 */
const COA = require("@motionpicture/coa-service");
const SSKTS = require("@motionpicture/sskts-domain");
const createDebug = require("debug");
const mongoose = require("mongoose");
const debug = createDebug('sskts-api:*');
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGOLAB_URI);
let count = 0;
const MAX_NUBMER_OF_PARALLEL_TASKS = 10;
const INTERVAL_MILLISECONDS = 500;
setInterval(() => __awaiter(this, void 0, void 0, function* () {
    if (count > MAX_NUBMER_OF_PARALLEL_TASKS) {
        return;
    }
    count += 1;
    try {
        yield execute();
    }
    catch (error) {
        console.error(error.message);
    }
    count -= 1;
}), INTERVAL_MILLISECONDS);
function execute() {
    return __awaiter(this, void 0, void 0, function* () {
        const queueRepository = SSKTS.createQueueRepository(mongoose.connection);
        const option = yield queueRepository.findOneDisableTransactionInquiryAndUpdate({
            status: SSKTS.QueueStatus.UNEXECUTED,
            run_at: { $lt: new Date() }
        }, {
            status: SSKTS.QueueStatus.RUNNING,
            last_tried_at: new Date(),
            $inc: { count_tried: 1 } // トライ回数増やす
        });
        if (!option.isEmpty) {
            const queue = option.get();
            debug('queue is', queue);
            try {
                // 失敗してもここでは戻さない(RUNNINGのまま待機)
                yield SSKTS.StockService.disableTransactionInquiry({
                    transaction_id: queue.transaction_id.toString()
                })(SSKTS.createTransactionRepository(mongoose.connection), COA);
                // 実行済みに変更
                yield queueRepository.findOneAndUpdate({ _id: queue._id }, { status: SSKTS.QueueStatus.EXECUTED });
            }
            catch (error) {
                // 実行結果追加
                yield queueRepository.findOneAndUpdate({ _id: queue._id }, {
                    $push: {
                        results: error.stack
                    }
                });
            }
        }
    });
}
