/**
 * 上映イベント在庫仕入れ
 */
import * as sskts from '@motionpicture/sskts-domain';

import { connectMongo } from '../../../connectMongo';

export default async () => {
    const connection = await connectMongo({ defaultConnection: false });

    let count = 0;

    const MAX_NUBMER_OF_PARALLEL_TASKS = 0; // 処理としてCPU使用量が多めなので、並列実行数は少なめにセット
    const INTERVAL_MILLISECONDS = 100;
    const taskRepo = new sskts.repository.Task(connection);

    setInterval(
        async () => {
            if (count > MAX_NUBMER_OF_PARALLEL_TASKS) {
                return;
            }

            count += 1;

            try {
                await sskts.service.task.executeByName(
                    sskts.factory.taskName.ImportScreeningEvents
                )({
                    taskRepo: taskRepo,
                    connection: connection
                });
            } catch (error) {
                // tslint:disable-next-line:no-console
                console.error(error);
            }

            count -= 1;
        },
        INTERVAL_MILLISECONDS
    );
};
