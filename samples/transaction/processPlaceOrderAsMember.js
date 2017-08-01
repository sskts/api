"use strict";
/**
 * 会員としての注文取引プロセスサンプル
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
const sskts_domain_1 = require("@motionpicture/sskts-domain");
const createDebug = require("debug");
const moment = require("moment");
const util = require("util");
const sskts = require("../lib/sskts-api");
const debug = createDebug('sskts-api:samples');
// tslint:disable-next-line:max-func-body-length
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const auth = new sskts.auth.OAuth2('motionpicture', '', 'teststate', [
            'transactions',
            'events.read-only',
            'organizations.read-only',
            'people.creditCards',
            'people.profile'
        ]);
        // Googleから受け取ったid_tokenを使ってサインイン
        yield auth.signInWithGoogle(
        // tslint:disable-next-line:max-line-length
        'eyJhbGciOiJSUzI1NiIsImtpZCI6IjU2NjE5YWRiMjJkMWE1NDU2MjAzNmJmNTEwODBmZjZjZjdjZTNjZjIifQ.eyJhenAiOiI5MzI5MzQzMjQ2NzEtNjZrYXN1am50ajJqYTdjNWs0azU1aWo2cGFrcHFpcjQuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI5MzI5MzQzMjQ2NzEtNjZrYXN1am50ajJqYTdjNWs0azU1aWo2cGFrcHFpcjQuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMDgwMTczNzA5ODQ2NDQ2NDkyODgiLCJlbWFpbCI6Imlsb3ZlZ2FkZEBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiYXRfaGFzaCI6ImFlRGE3b0xlTDg3dlZJOFY5SmdfTkEiLCJpc3MiOiJhY2NvdW50cy5nb29nbGUuY29tIiwiaWF0IjoxNTAxNTQ4NDQwLCJleHAiOjE1MDE1NTIwNDAsIm5hbWUiOiJUZXRzdSBZYW1hemFraSIsInBpY3R1cmUiOiJodHRwczovL2xoNi5nb29nbGV1c2VyY29udGVudC5jb20vLVRpM29LMmwxNmJzL0FBQUFBQUFBQUFJL0FBQUFBQUFBNjNNL01Dc0JlWWNpWnpJL3M5Ni1jL3Bob3RvLmpwZyIsImdpdmVuX25hbWUiOiJUZXRzdSIsImZhbWlseV9uYW1lIjoiWWFtYXpha2kiLCJsb2NhbGUiOiJlbiJ9.xm1QwEQ0BRXYSyoVzKWE90Smhcnc5Y1nSX_SNDODf6l0hqcbp7FDfJWwxvgQXAJpOL0wD2idggY4smWrwgeaW_R6mwxkYt20dLdHz_ZOzDBeHg9C3LEc_e5P9w_X5wOMT2j4S6u4WLE9IGJ9utUoW5PsFonhYnmisdRxOxymth-SXkuBK84uDBmtysK19oidD-ZdFmwnHvi1AP8qHrAzg-rG9GdbovcI9XyW1OkweVLIDfQLk_Fn7IP7X5b_1m41M-Evjahn9RCsYwbhqsiLtka1UdTO2leIJLntCb6EhU6iAB1GePk5l4UO6YwX9KCo8w_CruG2f7bwBtWMD2-Pxg');
        // プロフィールを取得
        const profile = yield sskts.service.person.getProfile({
            auth: auth,
            personId: 'me'
        });
        debug('プロフィールは', profile);
        // 新規会員であればプロフィール登録(登録されていないと注文取引確定できない)
        if (profile.telephone === '') {
            debug('プロフィールを更新します...');
            yield sskts.service.person.updateProfile({
                auth: auth,
                personId: 'me',
                profile: {
                    familyName: 'せい',
                    givenName: 'めい',
                    email: 'ilovegadd@gmail.com',
                    telephone: '09012345678'
                }
            });
            debug('プロフィールを更新しました');
        }
        // 上映イベント検索
        const individualScreeningEvents = yield sskts.service.event.searchIndividualScreeningEvent({
            auth: auth,
            searchConditions: {
                theater: '118',
                day: moment().add(1, 'day').format('YYYYMMDD')
            }
        });
        // イベント情報取得
        const individualScreeningEvent = yield sskts.service.event.findIndividualScreeningEvent({
            auth: auth,
            identifier: individualScreeningEvents[0].identifier
        });
        if (individualScreeningEvent === null) {
            throw new Error('指定された上映イベントが見つかりません');
        }
        // 劇場ショップ検索
        const movieTheaterOrganization = yield sskts.service.organization.findMovieTheaterByBranchCode({
            auth: auth,
            branchCode: individualScreeningEvent.coaInfo.theaterCode
        });
        if (movieTheaterOrganization === null) {
            throw new Error('劇場ショップがオープンしていません');
        }
        const theaterCode = individualScreeningEvent.coaInfo.theaterCode;
        const dateJouei = individualScreeningEvent.coaInfo.dateJouei;
        const titleCode = individualScreeningEvent.coaInfo.titleCode;
        const titleBranchNum = individualScreeningEvent.coaInfo.titleBranchNum;
        const timeBegin = individualScreeningEvent.coaInfo.timeBegin;
        const screenCode = individualScreeningEvent.coaInfo.screenCode;
        // 取引開始
        // 1分後のunix timestampを送信する場合
        // https://ja.wikipedia.org/wiki/UNIX%E6%99%82%E9%96%93
        debug('注文取引を開始します...');
        const transaction = yield sskts.service.transaction.placeOrder.start({
            auth: auth,
            expires: moment().add(1, 'minutes').toDate(),
            sellerId: movieTheaterOrganization.id
        });
        // 販売可能チケット検索
        const salesTicketResult = yield sskts_domain_1.COA.services.reserve.salesTicket({
            theaterCode: theaterCode,
            dateJouei: dateJouei,
            titleCode: titleCode,
            titleBranchNum: titleBranchNum,
            timeBegin: timeBegin,
            flgMember: sskts_domain_1.COA.services.reserve.FlgMember.NonMember
        });
        debug('販売可能チケットは', salesTicketResult);
        // COA空席確認
        const getStateReserveSeatResult = yield sskts_domain_1.COA.services.reserve.stateReserveSeat({
            theaterCode: theaterCode,
            dateJouei: dateJouei,
            titleCode: titleCode,
            titleBranchNum: titleBranchNum,
            timeBegin: timeBegin,
            screenCode: screenCode
        });
        debug('空席情報は', getStateReserveSeatResult);
        const sectionCode = getStateReserveSeatResult.listSeat[0].seatSection;
        const freeSeatCodes = getStateReserveSeatResult.listSeat[0].listFreeSeat.map((freeSeat) => {
            return freeSeat.seatNum;
        });
        if (getStateReserveSeatResult.cntReserveFree === 0) {
            throw new Error('空席がありません');
        }
        // 座席仮予約
        debug('座席を仮予約します...');
        let seatReservationAuthorization = yield sskts.service.transaction.placeOrder.createSeatReservationAuthorization({
            auth: auth,
            transactionId: transaction.id,
            eventIdentifier: individualScreeningEvent.identifier,
            offers: [
                {
                    seatSection: sectionCode,
                    seatNumber: freeSeatCodes[0],
                    ticket: {
                        ticketCode: salesTicketResult[0].ticketCode,
                        stdPrice: salesTicketResult[0].stdPrice,
                        addPrice: salesTicketResult[0].addPrice,
                        disPrice: 0,
                        salePrice: salesTicketResult[0].salePrice,
                        mvtkAppPrice: 0,
                        ticketCount: 1,
                        seatNum: freeSeatCodes[0],
                        addGlasses: 0,
                        kbnEisyahousiki: '00',
                        mvtkNum: '',
                        mvtkKbnDenshiken: '00',
                        mvtkKbnMaeuriken: '00',
                        mvtkKbnKensyu: '00',
                        mvtkSalesPrice: 0
                    }
                }
            ]
        });
        debug('座席を仮予約しました', seatReservationAuthorization);
        // 座席仮予約取消
        debug('座席仮予約を取り消します...');
        yield sskts.service.transaction.placeOrder.cancelSeatReservationAuthorization({
            auth: auth,
            transactionId: transaction.id,
            authorizationId: seatReservationAuthorization.id
        });
        // 再度座席仮予約
        debug('座席を仮予約します...');
        seatReservationAuthorization = yield sskts.service.transaction.placeOrder.createSeatReservationAuthorization({
            auth: auth,
            transactionId: transaction.id,
            eventIdentifier: individualScreeningEvent.identifier,
            offers: [
                {
                    seatSection: sectionCode,
                    seatNumber: freeSeatCodes[0],
                    ticket: {
                        ticketCode: salesTicketResult[1].ticketCode,
                        stdPrice: salesTicketResult[1].stdPrice,
                        addPrice: salesTicketResult[1].addPrice,
                        disPrice: 0,
                        salePrice: salesTicketResult[1].salePrice,
                        mvtkAppPrice: 0,
                        ticketCount: 1,
                        seatNum: freeSeatCodes[0],
                        addGlasses: 0,
                        kbnEisyahousiki: '00',
                        mvtkNum: '',
                        mvtkKbnDenshiken: '00',
                        mvtkKbnMaeuriken: '00',
                        mvtkKbnKensyu: '00',
                        mvtkSalesPrice: 0
                    }
                }
            ]
        });
        debug('座席を仮予約しました', seatReservationAuthorization);
        // クレジットカード検索
        let creditCards = yield sskts.service.person.findCreditCards({
            auth: auth,
            personId: 'me'
        });
        debug('使用できるクレジットカードは', creditCards);
        // なければクレジットカード追加
        if (creditCards.length === 0) {
            debug('クレジットカードを登録します...');
            const addCreditCardResult = yield sskts.service.person.addCreditCard({
                auth: auth,
                personId: 'me',
                creditCard: {
                    cardNo: '4111111111111111',
                    cardPass: '',
                    expire: '2012',
                    holderName: 'AA BB'
                }
            });
            debug('クレジットカードを登録しました', addCreditCardResult);
            // 再度クレジットカード検索
            creditCards = yield sskts.service.person.findCreditCards({
                auth: auth,
                personId: 'me'
            });
            debug('使用できるクレジットカードは', creditCards);
        }
        const amount = seatReservationAuthorization.price;
        // クレジットカードオーソリ取得
        let orderId = util.format('%s%s%s%s', moment().format('YYYYMMDD'), theaterCode, 
        // tslint:disable-next-line:no-magic-numbers
        `00000000${seatReservationAuthorization.result.tmpReserveNum}`.slice(-8), '01');
        debug('クレジットカードのオーソリをとります...');
        let creditCardAuthorization = yield sskts.service.transaction.placeOrder.createCreditCardAuthorization({
            auth: auth,
            transactionId: transaction.id,
            orderId: orderId,
            amount: amount,
            method: sskts_domain_1.GMO.utils.util.Method.Lump,
            creditCard: {
                memberId: 'me',
                // tslint:disable-next-line:no-magic-numbers
                cardSeq: parseInt(creditCards[0].cardSeq, 10)
                // cardPass: undefined
            }
        });
        debug('クレジットカードのオーソリがとれました', creditCardAuthorization);
        // クレジットカードオーソリ取消
        debug('クレジットカードのオーソリを取り消します...');
        yield sskts.service.transaction.placeOrder.cancelCreditCardAuthorization({
            auth: auth,
            transactionId: transaction.id,
            authorizationId: creditCardAuthorization.id
        });
        // 再度クレジットカードオーソリ
        orderId = util.format('%s%s%s%s', moment().format('YYYYMMDD'), theaterCode, 
        // tslint:disable-next-line:no-magic-numbers
        `00000000${seatReservationAuthorization.result.tmpReserveNum}`.slice(-8), '02');
        debug('クレジットカードのオーソリをとります...');
        creditCardAuthorization = yield sskts.service.transaction.placeOrder.createCreditCardAuthorization({
            auth: auth,
            transactionId: transaction.id,
            orderId: orderId,
            amount: amount,
            method: sskts_domain_1.GMO.utils.util.Method.Lump,
            creditCard: {
                memberId: 'me',
                // tslint:disable-next-line:no-magic-numbers
                cardSeq: parseInt(creditCards[0].cardSeq, 10)
                // cardPass: undefined
            }
        });
        debug('クレジットカードのオーソリがとれました', creditCardAuthorization);
        // 取引確定
        debug('注文取引を確定します...');
        const order = yield sskts.service.transaction.placeOrder.confirm({
            auth: auth,
            transactionId: transaction.id
        });
        debug('注文が作成されました', order);
        // メール追加
        const content = `
${order.customer.name} 様
-------------------------------------------------------------------
この度はご購入いただき誠にありがとうございます。
-------------------------------------------------------------------
◆購入番号 ：${order.orderInquiryKey.orderNumber}
◆電話番号 ${order.orderInquiryKey.telephone}
◆合計金額 ：${order.price}円
-------------------------------------------------------------------
`;
        debug('メール通知を実行します...', content);
        yield sskts.service.transaction.placeOrder.sendEmailNotification({
            auth: auth,
            transactionId: transaction.id,
            emailNotification: {
                from: 'noreply@example.com',
                to: transaction.agent.email,
                subject: '購入完了',
                content: content
            }
        });
        debug('メール通知が実行されました');
    });
}
main().then(() => {
    debug('main processed.');
}).catch((err) => {
    console.error(err.message);
});
