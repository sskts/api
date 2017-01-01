import {film as filmModel} from "../../common/models";
import * as COA from "../../common/utils/coa";

/**
 * 作品詳細
 */
export function findById(id: string) {
    interface film {
        _id: string,
        name: {
            ja: string,
            en: string
        }
        name_kana: string
    }

    return new Promise((resolve: (result: film) => void, reject: (err: Error) => void) => {
        filmModel.findOne({
            _id: id
        }, (err, film) => {
            if (err) return reject(err);
            if (!film) return reject(new Error("Not Found."));

            resolve({
                _id: film.get("_id"),
                name: film.get("name"),
                name_kana: film.get("name_kana")
            });
        })
    });
}

/**
 * 劇場コード指定で作品情報をCOAからインポートする
 */
export function importByTheaterCode(theaterCode: string) {
    return new Promise((resolveAll, rejectAll) => {
        COA.findFilmsByTheaterCodeInterface.call({
            theater_code: theaterCode
        }, (err, films) => {
            if (err) return rejectAll(err);

            // あれば更新、なければ追加
            let promises = films.map((film) => {
                return new Promise((resolve, reject) => {
                    if (!film.title_code) return resolve();
                    if (!film.title_branch_num) return resolve();

                    // this.logger.debug('updating sponsor...');
                    filmModel.findOneAndUpdate(
                        {
                            _id: film.title_code + film.title_branch_num
                        },
                        {
                            film_group: film.title_code,
                            name: {
                                ja: film.title_name,
                                en: film.title_name_eng
                            },
                            name_kana: film.title_name_kana, // 作品タイトル名（カナ）
                            name_short: film.title_name_short, // 作品タイトル名省略
                            name_original: film.title_name_orig, // 原題
                            minutes: film.show_time, // 上映時間
                            date_start: film.date_begin, // 公演開始予定日※日付は西暦8桁 "YYYYMMDD"
                            date_end: film.date_end // 公演終了予定日※日付は西暦8桁 "YYYYMMDD"
                        },
                        {
                            new: true,
                            upsert: true
                        },
                        (err) => {
                            console.log('film updated.', err);
                            // this.logger.debug('sponsor updated', err);
                            (err) ? reject(err) : resolve();
                        }
                    );
                });
            });

            Promise.all(promises).then(() => {
                resolveAll();
            }, (err) => {
                rejectAll(err);
            });
        });
    });
}