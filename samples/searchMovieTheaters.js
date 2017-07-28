"use strict";
/**
 * 劇場検索サンプル
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
const sskts = require("./lib/sskts-api");
const debug = createDebug('sskts-api:samples');
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const auth = new sskts.auth.OAuth2('motionpicture', 'motionpicture', 'teststate', ['organizations.read-only']);
        const movieTheaters = yield sskts.service.organization.searchMovieTheaters({
            auth: auth
        });
        debug('movieTheaters are', movieTheaters);
    });
}
main().then(() => {
    debug('main processed.');
}).catch((err) => {
    console.error(err.message);
});
