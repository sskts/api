"use strict";
/**
 * 上映イベント検索サンプル
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
const createDebug = require("debug");
const moment = require("moment");
const Scenarios = require("./scenarios");
const debug = createDebug('sskts-api:examples');
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const auth = new Scenarios.OAuth2(process.env.SSKTS_API_REFRESH_TOKEN, ['admin']);
        const individualScreeningEvents = yield Scenarios.event.searchIndividualScreeningEvent({
            auth: auth,
            searchConditions: {
                theater: '118',
                day: moment().format('YYYYMMDD')
            }
        });
        debug('number of individualScreeningEvents is', individualScreeningEvents.length);
    });
}
main().then(() => {
    debug('main processed.');
}).catch((err) => {
    console.error(err.message);
});
