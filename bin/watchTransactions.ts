import mongoose = require("mongoose");
mongoose.set('debug', true); // TODO 本番でははずす
mongoose.connect(process.env.MONGOLAB_URI);

import TransactionService from "../domain/default/service/interpreter/transaction";
import TransactionRepository from "../domain/default/repository/interpreter/transaction";
import QueueRepository from "../domain/default/repository/interpreter/queue";

import TransactionStatus from "../domain/default/model/transactionStatus";
import TransactionQueuesStatus from "../domain/default/model/transactionQueuesStatus";

let count = 0;

setInterval(async () => {
    if (count > 10) return;
    count++;

    try {
        let transactionRepository = TransactionRepository(mongoose.connection);

        let option = await transactionRepository.findOneAndUpdate({
            status: { $in: [TransactionStatus.CLOSED, TransactionStatus.EXPIRED] },
            queues_status: TransactionQueuesStatus.UNEXPORTED
        }, {
                queues_status: TransactionQueuesStatus.EXPORTING
            });
        if (!option.isEmpty) {
            let transaction = option.get();
            console.log("transaction is", transaction);
            console.log("transaction.queues.length is", transaction.queues.length);

            await TransactionService.exportQueues({
                transaction_id: transaction._id
            })(transactionRepository, QueueRepository(mongoose.connection))
                .then(async () => {
                    await transactionRepository.findOneAndUpdate({
                        _id: transaction._id
                    }, {
                            queues_status: TransactionQueuesStatus.EXPORTED
                        });
                })
                .catch(async (err: Error) => {
                    console.error(err);
                    await transactionRepository.findOneAndUpdate({
                        _id: transaction._id
                    }, {
                            queues_status: TransactionQueuesStatus.EXPORTED
                        });

                });
        }
    } catch (error) {
        console.error(error.message);
    }

    count--;
}, 500);