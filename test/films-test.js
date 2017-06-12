"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * filmsルーターテスト
 *
 * @ignore
 */
const sskts = require("@motionpicture/sskts-domain");
const assert = require("assert");
const httpStatus = require("http-status");
const mongoose = require("mongoose");
const supertest = require("supertest");
const app = require("../app/app");
const theaterId = '118';
let connection;
let accessToken;
before(() => __awaiter(this, void 0, void 0, function* () {
    connection = mongoose.createConnection(process.env.MONGOLAB_URI);
    accessToken = yield supertest(app)
        .post('/oauth/token')
        .send({
        assertion: process.env.SSKTS_API_REFRESH_TOKEN,
        scope: 'admin'
    })
        .then((response) => {
        return response.body.access_token;
    });
    // 全て削除してからテスト開始
    const filmAdapter = sskts.adapter.film(connection);
    yield filmAdapter.model.remove({}).exec();
}));
describe('GET /films/:id', () => {
    it('アクセストークン必須', () => __awaiter(this, void 0, void 0, function* () {
        yield supertest(app)
            .get('/films/0000000000')
            .expect(httpStatus.UNAUTHORIZED)
            .then((response) => {
            assert.equal(response.text, 'Unauthorized');
        });
    }));
    it('not found', () => __awaiter(this, void 0, void 0, function* () {
        yield supertest(app)
            .get('/films/0000000000')
            .set('authorization', `Bearer ${accessToken}`)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(httpStatus.NOT_FOUND)
            .then((response) => {
            assert.equal(response.body.data, null);
        });
    }));
    it('found', () => __awaiter(this, void 0, void 0, function* () {
        // テストデータインポート
        const theaterAdapter = sskts.adapter.theater(connection);
        const filmAdapter = sskts.adapter.film(connection);
        yield sskts.service.master.importTheater(theaterId)(theaterAdapter);
        yield sskts.service.master.importFilms(theaterId)(theaterAdapter, filmAdapter);
        const filmDoc = yield filmAdapter.model.findOne().exec();
        yield supertest(app)
            .get(`/films/${filmDoc.get('id')}`)
            .set('authorization', `Bearer ${accessToken}`)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(httpStatus.OK)
            .then((response) => {
            assert.equal(response.body.data.type, 'films');
            assert.equal(response.body.data.id, filmDoc.get('id'));
            assert.equal(response.body.data.attributes.id, filmDoc.get('id'));
        });
    }));
});
