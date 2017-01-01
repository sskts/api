import request = require("request");
import config = require("config");

/**
 * API認証情報
 */
let credentials = {
    access_token: "",
    expired_at: ""
}

/**
 * アクセストークンを発行する
 */
function publishAccessToken(cb: (err: Error) => void): void {
    // TODO アクセストークン有効期限チェック
    if (credentials.access_token) {
        return cb(null);
    }

    request.post({
        url: `${config.get<string>("coa_api_endpoint")}/token/access_token`,
        form: {
            refresh_token: config.get<string>("coa_api_refresh_token")
        },
        json: true
    }, (error, response, body) => {
        if (error) return cb(error);
        if (typeof body === "string")  return cb(new Error(body));
        if (body.message) return cb(new Error(body.message));

        credentials = body;

        cb(null);
    });
}

/**
 * 施設マスター抽出
 */
export namespace findTheaterInterface {
    export interface Args {
        /** 劇場コード */
        theater_code: string
    }
    export interface Theater {
        theater_code: string,
        theater_name: string,
        theater_name_eng: string,
        theater_name_kana: string
    }
    export function call(args: Args, cb: (err: Error, theater: Theater) => void): void {
        publishAccessToken((err) => {
            request.get({
                url: `${config.get<string>("coa_api_endpoint")}/api/v1/theater/${args.theater_code}/theater/`,
                auth: {bearer: credentials.access_token},
                json: true
            }, (error, response, body) => {
                if (error) return cb(error, null);
                if (typeof body === "string")  return cb(new Error(body), null);
                if (body.message) return cb(new Error(body.message), null);
                if (body.status !== 0) return cb(new Error(body.status), null);

                cb(null, {
                    theater_code: body.theater_code,
                    theater_name: body.theater_name,
                    theater_name_eng: body.theater_name_eng,
                    theater_name_kana: body.theater_name_kana,
                });
            });
        });
    }
}

/**
 * 作品マスター抽出
 */
export namespace findFilmsByTheaterCodeInterface {
    export interface Args {
        /** 劇場コード */
        theater_code: string
    }
    export interface Film {
        title_code: string,
        title_branch_num: string,
        title_name: string,
        title_name_kana: string,
        title_name_eng: string,
        title_name_short: string,
        title_name_orig: string,
        kbn_eirin: string,
        kbn_eizou: string,
        kbn_joueihousiki: string,
        kbn_jimakufukikae: string,
        show_time: number,
        date_begin: string,
        date_end: string
    };
    export function call(args: Args, cb: (err: Error, films: Array<Film>) => void): void {
        publishAccessToken((err) => {
            request.get({
                url: `${config.get<string>("coa_api_endpoint")}/api/v1/theater/${args.theater_code}/title/`,
                auth: {bearer: credentials.access_token},
                json: true
            }, (error, response, body) => {
                if (error) return cb(error, null);
                if (typeof body === "string")  return cb(new Error(body), null);
                if (body.message) return cb(new Error(body.message), null);
                if (body.status !== 0) return cb(new Error(body.status), null);

                cb(null, body.list_title);
            });
        });
    }
}

/**
 * スクリーンマスター抽出
 */
export namespace findScreensByTheaterCodeInterface {
    export interface Args {
        /** 劇場コード */
        theater_code: string
    }
    export interface Screen {
        screen_code: string,
        screen_name: string,
        screen_name_eng: string,
        list_seat: Array<{
            seat_num: string,
            flg_special: string,
            flg_hc: string,
            flg_pair: string,
            flg_free: string,
            flg_spare: string
        }>
    };
    export function call(args: Args, cb: (err: Error, screens: Array<Screen>) => void): void {
        publishAccessToken((err) => {
            request.get({
                url: `${config.get<string>("coa_api_endpoint")}/api/v1/theater/${args.theater_code}/screen/`,
                auth: {bearer: credentials.access_token},
                json: true
            }, (error, response, body) => {
                if (error) return cb(error, null);
                if (typeof body === "string")  return cb(new Error(body), null);
                if (body.message) return cb(new Error(body.message), null);
                if (body.status !== 0) return cb(new Error(body.status), null);

                cb(null, body.list_screen);
            });
        });
    }
}

/**
 * スケジュールマスター抽出
 */
export namespace findPerformancesByTheaterCodeInterface {
    export interface Args {
        /** 劇場コード */
        theater_code: string,
        /** スケジュールを抽出する上映日の開始日　　※日付は西暦8桁 "YYYYMMDD" */
        begin: string,
        /** スケジュールを抽出する上映日の終了日　　※日付は西暦8桁 "YYYYMMDD" */
        end: string,
    }
    export interface Performance {
        date_jouei: string,
        title_code: string,
        title_branch_num: string,
        time_begin: string,
        time_end: string,
        screen_code: string,
        trailer_time: number,
        kbn_service: string,
        kbn_acoustic: string,
        name_service_day: string,
    }
    export function call(args: Args, cb: (err: Error, screens: Array<Performance>) => void): void {
        publishAccessToken((err) => {
            request.get({
                url: `${config.get<string>("coa_api_endpoint")}/api/v1/theater/${args.theater_code}/schedule/`,
                auth: {bearer: credentials.access_token},
                json: true,
                qs: {
                    begin: args.begin,
                    end: args.end
                }
            }, (error, response, body) => {
                if (error) return cb(error, null);
                if (typeof body === "string")  return cb(new Error(body), null);
                if (body.message) return cb(new Error(body.message), null);
                if (body.status !== 0) return cb(new Error(body.status), null);

                cb(null, body.list_schedule);
            });
        });
    }
}