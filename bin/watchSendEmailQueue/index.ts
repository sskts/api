import NotificationService from "../../domain/default/service/interpreter/notification";
import QueueRepository from "../../domain/default/repository/interpreter/queue";
import QueueStatus from "../../domain/default/model/queueStatus";

import mongoose = require("mongoose");
mongoose.set('debug', true); // TODO 本番でははずす
mongoose.connect(process.env.MONGOLAB_URI);

let count = 0;

setInterval(async () => {
    if (count > 10) return;
    count++;

    try {
        let queueRepository = QueueRepository(mongoose.connection);

        // 未実行のメール送信キューを取得
        // TODO try_count
        let option = await queueRepository.findOneSendEmailAndUpdate({
            status: QueueStatus.UNEXECUTED,
        }, {
                status: QueueStatus.RUNNING
            });

        if (!option.isEmpty) {
            let queue = option.get();
            console.log("queue is", queue);


            await NotificationService.sendEmail(queue.email)
                .then(async () => {
                    await queueRepository.findOneAndUpdate({
                        _id: queue._id
                    }, {
                            status: QueueStatus.EXECUTED
                        });
                })
                .catch(async (err: Error) => {
                    console.error(err);
                    await queueRepository.findOneAndUpdate({
                        _id: queue._id
                    }, {
                            status: QueueStatus.UNEXECUTED,
                        });

                });
        }
    } catch (error) {
        console.error(error.message);
    }

    count--;
}, 500);