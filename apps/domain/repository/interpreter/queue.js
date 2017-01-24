"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const mongoose = require("mongoose");
const monapt = require("monapt");
const QueueFactory = require("../../factory/queue");
const queue_1 = require("./mongoose/model/queue");
let db = mongoose.createConnection(process.env.MONGOLAB_URI);
let queueModel = db.model(queue_1.default.modelName, queue_1.default.schema);
var interpreter;
(function (interpreter) {
    function find(conditions) {
        return __awaiter(this, void 0, void 0, function* () {
            let docs = yield queueModel.find(conditions).exec();
            yield docs.map((doc) => {
                console.log(doc);
            });
            return [];
        });
    }
    interpreter.find = find;
    function findById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            let doc = yield queueModel.findOne({ _id: id }).exec();
            if (!doc)
                return monapt.None;
            return monapt.None;
        });
    }
    interpreter.findById = findById;
    function findOneAndUpdate(conditions, update) {
        return __awaiter(this, void 0, void 0, function* () {
            let doc = yield queueModel.findOneAndUpdate(conditions, update, {
                new: true,
                upsert: false
            }).exec();
            if (!doc)
                return monapt.None;
            return monapt.Option(QueueFactory.create({
                _id: doc.get("_id"),
                group: doc.get("group"),
                status: doc.get("status"),
                executed_at: doc.get("executed_at"),
                count_try: doc.get("count_try")
            }));
        });
    }
    interpreter.findOneAndUpdate = findOneAndUpdate;
    function store(queue) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queueModel.findOneAndUpdate({ _id: queue._id }, queue, {
                new: true,
                upsert: true
            }).lean().exec();
        });
    }
    interpreter.store = store;
})(interpreter || (interpreter = {}));
let i = interpreter;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = i;
