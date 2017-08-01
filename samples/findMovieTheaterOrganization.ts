/**
 * 枝番号で劇場組織取得サンプル
 *
 * @ignore
 */

import * as createDebug from 'debug';

import * as sskts from './lib/sskts-api';

const debug = createDebug('sskts-api:samples');

async function main() {
    const auth = new sskts.auth.OAuth2(
        'motionpicture',
        'motionpicture',
        'teststate',
        ['organizations.read-only']
    );

    // 劇場情報取得
    const movieTheater = await sskts.service.organization.findMovieTheaterByBranchCode({
        auth: auth,
        branchCode: '118'
    });
    debug('movieTheater is', movieTheater);
}

main().then(() => {
    debug('main processed.');
}).catch((err) => {
    console.error(err.message);
});
