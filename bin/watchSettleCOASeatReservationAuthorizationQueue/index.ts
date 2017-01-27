import StockService from "../../domain/default/service/interpreter/stock";
import QueueRepository from "../../domain/default/repository/interpreter/queue";
import AssetRepository from "../../domain/default/repository/interpreter/asset";
import QueueStatus from "../../domain/default/model/queueStatus";
import mongoose = require("mongoose");
// import COA = require("@motionpicture/coa-service");

mongoose.set('debug', true); // TODO 本番でははずす
mongoose.connect(process.env.MONGOLAB_URI);
let count = 0;
let queueRepository = QueueRepository(mongoose.connection);
let assetRepository = AssetRepository(mongoose.connection);

setInterval(async () => {
    if (count > 10) return;
    count++;


    // 未実行のメール送信キューを取得
    // TODO try_count
    let option = await queueRepository.findOneSettleCOASeatReservationAuthorizationAndUpdate({
        status: QueueStatus.UNEXECUTED,
        executed_at: { $lt: new Date() } // TODO 実行日時チェック
    }, { status: QueueStatus.RUNNING });

    if (!option.isEmpty) {
        let queue = option.get();
        console.log("queue is", queue);

        await StockService.transferCOASeatReservation(queue.authorization)(assetRepository)
            .then(async () => {
                await queueRepository.findOneAndUpdate({ _id: queue._id }, { status: QueueStatus.EXECUTED });
            })
            .catch(async (err: Error) => {
                console.error(err);
                await queueRepository.findOneAndUpdate({ _id: queue._id }, { status: QueueStatus.UNEXECUTED });
            });
    }

    count--;
}, 500);