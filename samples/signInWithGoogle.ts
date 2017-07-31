/**
 * Googleでサインインサンプル
 *
 * @ignore
 */

import * as createDebug from 'debug';

import * as sskts from './lib/sskts-api';

const debug = createDebug('sskts-api:samples');

async function main() {
    const auth = new sskts.auth.GoogleToken(
        // tslint:disable-next-line:max-line-length
        'eyJhbGciOiJSUzI1NiIsImtpZCI6IjY3MTYzZGFmY2ZjM2FmYWYwYmJmNTc5MTQzMWFlNzE5NDBiMmMwNGQifQ.eyJhenAiOiI5MzI5MzQzMjQ2NzEtNjZrYXN1am50ajJqYTdjNWs0azU1aWo2cGFrcHFpcjQuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI5MzI5MzQzMjQ2NzEtNjZrYXN1am50ajJqYTdjNWs0azU1aWo2cGFrcHFpcjQuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMDgwMTczNzA5ODQ2NDQ2NDkyODgiLCJlbWFpbCI6Imlsb3ZlZ2FkZEBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiYXRfaGFzaCI6IkFHMm8yTWlvUjJCYV81NnZBTmkxbFEiLCJpc3MiOiJhY2NvdW50cy5nb29nbGUuY29tIiwiaWF0IjoxNTAxNDU2NTMwLCJleHAiOjE1MDE0NjAxMzAsIm5hbWUiOiJUZXRzdSBZYW1hemFraSIsInBpY3R1cmUiOiJodHRwczovL2xoNi5nb29nbGV1c2VyY29udGVudC5jb20vLVRpM29LMmwxNmJzL0FBQUFBQUFBQUFJL0FBQUFBQUFBNjNNL01Dc0JlWWNpWnpJL3M5Ni1jL3Bob3RvLmpwZyIsImdpdmVuX25hbWUiOiJUZXRzdSIsImZhbWlseV9uYW1lIjoiWWFtYXpha2kiLCJsb2NhbGUiOiJlbiJ9.lNCPSrhP6zJMNNqu6USvpkB_j5ni48xnUuQZMHDDKNeKKKddyWW_hQSnpDCmeHb_P1z1gxVwUhK3Um9wUVtAnBZeow24CH_2k3GPgUKlgdtp1JvfJ2Xv0uIfY2poVWz4M1D1bxlnyfmi38I37b0hk-FWKuH6vJG2MImNT30Ua1JdR3nms44aHTgp-u2DWiD2hlQHN1rMs3SEtZpgCx3RbpqJYRi5OwofZmL8qD0Mk1AvIOT9KujPJEWZzIzkCORYpSRxrOGf1AqYlIdHyk0AiU3T_sCvBbK__tVa0h-Hc7QQ3eoYNviJvS415ZOhsLxuxbarw7Lk10x-Up3BDS64Ng',
        'teststate',
        ['organizations.read-only']
    );

    const accessToken = await auth.getAccessToken();
    debug('accessToken is', accessToken);
}

main().then(() => {
    debug('main processed.');
}).catch((err) => {
    console.error(err);
});
