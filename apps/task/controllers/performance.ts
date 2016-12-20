import * as COA from "../../common/utils/coa";
import config = require('config');
import mongoose = require('mongoose');
let MONGOLAB_URI = config.get<string>('mongolab_uri');
import {performance as performanceModel, screen as screenModel} from "../../common/models";

/**
 * 劇場コード指定でパフォーマンス情報をCOAからインポートする
 */
export function importByTheaterCode(theaterCode: string): void {
    COA.findPerformancesByTheaterCode(theaterCode, (err, performances) => {
        if (err) return process.exit(0);

        mongoose.connect(MONGOLAB_URI);

        screenModel.find({theater: theaterCode}, 'name theater').populate('theater', 'name').exec((err, screens) => {
            // あれば更新、なければ追加
            let promises = performances.map((performance) => {
                return new Promise((resolve, reject) => {
                    if (!performance.title_code) return resolve();
                    if (!performance.title_branch_num) return resolve();
                    if (!performance.screen_code) return resolve();

                    // this.logger.debug('updating sponsor...');
                    let id = `${performance.date_jouei}${performance.title_code}${performance.title_branch_num}${performance.screen_code}${performance.time_begin}`;

                    // 劇場とスクリーン名称を追加
                    let _screen = screens.find((screen) => {
                        return (screen.get("_id").toString() === performance.screen_code);
                    });
                    if (!_screen) return reject("no screen.");

                    console.log("updating performance...");
                    performanceModel.findOneAndUpdate(
                        {
                            _id: id
                        },
                        {
                            screen: performance.screen_code,
                            screen_name: _screen.get("name"),
                            theater: _screen.get("theater").get("_id"),
                            theater_name: _screen.get("theater").get("name"),
                            film: performance.title_code + performance.title_branch_num,
                            day: performance.date_jouei,
                            time_start: performance.time_begin,
                            time_end: performance.time_end
                        },
                        {
                            new: true,
                            upsert: true
                        },
                        (err) => {
                            console.log('performance updated.', err);
                            // this.logger.debug('sponsor updated', err);
                            (err) ? reject(err) : resolve();
                        }
                    );
                });
            });

            Promise.all(promises).then(() => {
                // this.logger.info('promised.');
                mongoose.disconnect();
                process.exit(0);
            }, (err) => {
                console.error('promised.', err);
                mongoose.disconnect();
                process.exit(0);
            });
        });
    });
}
