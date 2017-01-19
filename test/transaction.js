"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const request = require("request-promise-native");
const GMO = require("@motionpicture/gmo-service");
GMO.initialize({
    endpoint: "https://pt01.mul-pay.jp",
});
const COA = require("@motionpicture/coa-service");
COA.initialize({
    endpoint: "http://coacinema.aa0.netvolante.jp",
    refresh_token: "eyJhbGciOiJIUzI1NiJ9.eyJjcmVhdGVkX2F0IjoxNDc5MjYwODQ4LCJhdXRoX2lkIjoiMzMxNSJ9.jx-w7D3YLP7UbY4mzJYC9xr368FiKWcpR2_L9mZfehQ"
});
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        let body;
        body = yield request.post({
            url: "http://localhost:8080/owner/anonymous/create",
            body: {
                group: "ANONYMOUS",
            },
            json: true,
            simple: false,
        });
        if (!body.success)
            throw new Error(body.message);
        let owner = body.owner;
        console.log("owner:", owner);
        let ownerId4administrator = "5868e16789cc75249cdbfa4b";
        body = yield request.post({
            url: "http://localhost:8080/transaction/start",
            body: {
                owners: [ownerId4administrator, owner._id]
            },
            json: true,
            simple: false,
        });
        if (!body.success)
            throw new Error(body.message);
        let transaction = body.transaction;
        console.log("transaction:", transaction);
        let getStateReserveSeatResult = yield COA.getStateReserveSeatInterface.call({
            theater_code: "001",
            date_jouei: "20170120",
            title_code: "8513",
            title_branch_num: "0",
            time_begin: "1010",
            screen_code: "2"
        });
        let sectionCode = getStateReserveSeatResult.list_seat[0].seat_section;
        let freeSeatCodes = getStateReserveSeatResult.list_seat[0].list_free_seat.map((freeSeat) => {
            return freeSeat.seat_num;
        });
        console.log(freeSeatCodes);
        let reserveSeatsTemporarilyResult = yield COA.reserveSeatsTemporarilyInterface.call({
            theater_code: "001",
            date_jouei: "20170120",
            title_code: "8513",
            title_branch_num: "0",
            time_begin: "1010",
            screen_code: "2",
            list_seat: [{
                    seat_section: sectionCode,
                    seat_num: freeSeatCodes[0]
                }, {
                    seat_section: sectionCode,
                    seat_num: freeSeatCodes[1]
                }]
        });
        console.log(reserveSeatsTemporarilyResult);
        body = yield request.post({
            url: `http://localhost:8080/transaction/${transaction._id}/addCOAAuthorization`,
            body: {
                owner_id: ownerId4administrator,
                coa_tmp_reserve_num: reserveSeatsTemporarilyResult.tmp_reserve_num,
                seats: reserveSeatsTemporarilyResult.list_tmp_reserve.map((tmpReserve) => {
                    return {
                        performance: "001201701208513021010",
                        section: tmpReserve.seat_section,
                        seat_code: tmpReserve.seat_num,
                        ticket_code: "",
                    };
                })
            },
            json: true,
            simple: false,
        });
        if (!body.success)
            throw new Error(body.message);
        let coaAuthorization = body.authorization;
        console.log("coaAuthorization:", coaAuthorization);
        yield COA.deleteTmpReserveInterface.call({
            theater_code: "001",
            date_jouei: "20170120",
            title_code: "8513",
            title_branch_num: "0",
            time_begin: "1010",
            tmp_reserve_num: reserveSeatsTemporarilyResult.tmp_reserve_num.toString()
        });
        console.log("deleteTmpReserveResult:", true);
        body = yield request.post({
            url: `http://localhost:8080/transaction/${transaction._id}/removeAuthorization`,
            body: {
                owner_id: ownerId4administrator,
                authorization_id: coaAuthorization._id
            },
            json: true,
            simple: false,
        });
        if (!body.success)
            throw new Error(body.message);
        console.log("removeAuthorization result:", body);
        let orderId = Date.now().toString();
        let amount = 1800;
        let entryTranResult = yield GMO.CreditService.entryTranInterface.call({
            shop_id: "tshop00024015",
            shop_pass: "hf3wsuyy",
            order_id: orderId,
            job_cd: GMO.Util.JOB_CD_AUTH,
            amount: amount,
        });
        let execTranResult = yield GMO.CreditService.execTranInterface.call({
            access_id: entryTranResult.access_id,
            access_pass: entryTranResult.access_pass,
            order_id: orderId,
            method: "1",
            card_no: "4111111111111111",
            expire: "2012",
            security_code: "123",
        });
        console.log(execTranResult);
        body = yield request.post({
            url: `http://localhost:8080/transaction/${transaction._id}/addGMOAuthorization`,
            body: {
                owner_id: owner._id,
                gmo_shop_id: "tshop00024015",
                gmo_shop_pass: "hf3wsuyy",
                gmo_order_id: orderId,
                gmo_amount: amount,
                gmo_access_id: entryTranResult.access_id,
                gmo_access_pass: entryTranResult.access_pass,
                gmo_job_cd: GMO.Util.JOB_CD_SALES,
                gmo_pay_type: GMO.Util.PAY_TYPE_CREDIT,
            },
            json: true
        });
        if (!body.success)
            throw new Error(body.message);
        let gmoAuthorization = body.authorization;
        console.log("gmoAuthorization:", gmoAuthorization);
        let alterTranResult = yield GMO.CreditService.alterTranInterface.call({
            shop_id: "tshop00024015",
            shop_pass: "hf3wsuyy",
            access_id: entryTranResult.access_id,
            access_pass: entryTranResult.access_pass,
            job_cd: GMO.Util.JOB_CD_VOID
        });
        console.log("alterTranResult:", alterTranResult);
        body = yield request.post({
            url: `http://localhost:8080/transaction/${transaction._id}/removeAuthorization`,
            body: {
                owner_id: ownerId4administrator,
                authorization_id: gmoAuthorization._id
            },
            json: true,
            simple: false,
        });
        if (!body.success)
            throw new Error(body.message);
        console.log("removeAuthorization result:", body);
        let reserveSeatsTemporarilyResult2 = yield COA.reserveSeatsTemporarilyInterface.call({
            theater_code: "001",
            date_jouei: "20170120",
            title_code: "8513",
            title_branch_num: "0",
            time_begin: "1010",
            screen_code: "2",
            list_seat: [{
                    seat_section: sectionCode,
                    seat_num: freeSeatCodes[0]
                }, {
                    seat_section: sectionCode,
                    seat_num: freeSeatCodes[1]
                }]
        });
        console.log("reserveSeatsTemporarilyResult2:", reserveSeatsTemporarilyResult2);
        body = yield request.post({
            url: `http://localhost:8080/transaction/${transaction._id}/addCOAAuthorization`,
            body: {
                owner_id: ownerId4administrator,
                coa_tmp_reserve_num: reserveSeatsTemporarilyResult2.tmp_reserve_num,
                seats: reserveSeatsTemporarilyResult2.list_tmp_reserve.map((tmpReserve) => {
                    return {
                        performance: "001201701208513021010",
                        section: tmpReserve.seat_section,
                        seat_code: tmpReserve.seat_num,
                        ticket_code: "",
                    };
                })
            },
            json: true,
            simple: false,
        });
        if (!body.success)
            throw new Error(body.message);
        let coaAuthorization2 = body.authorization;
        console.log("coaAuthorization2:", coaAuthorization2);
        orderId = Date.now().toString();
        amount = 1500;
        let entryTranResult2 = yield GMO.CreditService.entryTranInterface.call({
            shop_id: "tshop00024015",
            shop_pass: "hf3wsuyy",
            order_id: orderId,
            job_cd: GMO.Util.JOB_CD_AUTH,
            amount: amount,
        });
        let execTranResult2 = yield GMO.CreditService.execTranInterface.call({
            access_id: entryTranResult2.access_id,
            access_pass: entryTranResult2.access_pass,
            order_id: orderId,
            method: "1",
            card_no: "4111111111111111",
            expire: "2012",
            security_code: "123",
        });
        console.log("execTranResult2:", execTranResult2);
        body = yield request.post({
            url: `http://localhost:8080/transaction/${transaction._id}/addGMOAuthorization`,
            body: {
                owner_id: owner._id,
                gmo_shop_id: "tshop00024015",
                gmo_shop_pass: "hf3wsuyy",
                gmo_order_id: orderId,
                gmo_amount: amount,
                gmo_access_id: entryTranResult2.access_id,
                gmo_access_pass: entryTranResult2.access_pass,
                gmo_job_cd: GMO.Util.JOB_CD_SALES,
                gmo_pay_type: GMO.Util.PAY_TYPE_CREDIT,
            },
            json: true
        });
        if (!body.success)
            throw new Error(body.message);
        let gmoAuthorization2 = body.authorization;
        console.log("gmoAuthorization2:", gmoAuthorization2);
        let salesTicketResult = yield COA.salesTicketInterface.call({
            theater_code: "001",
            date_jouei: "20170120",
            title_code: "8513",
            title_branch_num: "0",
            time_begin: "1010",
        });
        console.log("salesTicketResult:", salesTicketResult);
        let tel = "09012345678";
        let updateReserveResult = yield COA.updateReserveInterface.call({
            theater_code: "001",
            date_jouei: "20170120",
            title_code: "8513",
            title_branch_num: "0",
            time_begin: "1010",
            tmp_reserve_num: reserveSeatsTemporarilyResult2.tmp_reserve_num.toString(),
            reserve_name: "山崎 哲",
            reserve_name_jkana: "ヤマザキ テツ",
            tel_num: "09012345678",
            mail_addr: "yamazaki@motionpicture.jp",
            reserve_amount: 1800,
            list_ticket: reserveSeatsTemporarilyResult2.list_tmp_reserve.map((tmpReserve) => {
                return {
                    ticket_code: salesTicketResult.list_ticket[0].ticket_code,
                    std_price: salesTicketResult.list_ticket[0].std_price,
                    add_price: salesTicketResult.list_ticket[0].add_price,
                    dis_price: 0,
                    sale_price: salesTicketResult.list_ticket[0].sale_price,
                    ticket_count: 1,
                    seat_num: tmpReserve.seat_num
                };
            })
        });
        console.log("updateReserveResult:", updateReserveResult);
        body = yield request.post({
            url: `http://localhost:8080/transaction/${transaction._id}/enableInquiry`,
            body: {
                inquiry_id: updateReserveResult.reserve_num,
                inquiry_pass: tel
            },
            json: true,
            simple: false,
        });
        if (!body.success)
            throw new Error(body.message);
        console.log("enableInquiry result:", body);
        body = yield request.post({
            url: `http://localhost:8080/transaction/${transaction._id}/close`,
            body: {},
            json: true,
            simple: false,
        });
        if (!body.success)
            throw new Error(body.message);
        console.log("close result:", body);
    });
}
main().then(() => {
    console.log("main processed.");
}).catch((err) => {
    console.error(err.message);
});