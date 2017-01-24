import mongoose = require("mongoose");
import monapt = require("monapt");
import Queue from "../../model/queue";
import * as QueueFactory from "../../factory/queue";
import QueueRepository from "../queue";
import QueueModel from "./mongoose/model/queue";

let db = mongoose.createConnection(process.env.MONGOLAB_URI);
let queueModel = db.model(QueueModel.modelName, QueueModel.schema);

namespace interpreter {
    export async function find(conditions: Object) {
        let docs = await queueModel.find(conditions).exec();
        await docs.map((doc) => {
            console.log(doc);
        });
        return [];
    }
    export async function findById(id: string) {
        let doc = await queueModel.findOne({ _id: id }).exec();
        if (!doc) return monapt.None;

        return monapt.None;
    }

    export async function findOneAndUpdate(conditions: Object, update: Object) {
        let doc = await queueModel.findOneAndUpdate(conditions, update, {
            new: true,
            upsert: false
        }).exec();
        if (!doc) return monapt.None;

        return monapt.Option(QueueFactory.create({
            _id: doc.get("_id"),
            group: doc.get("group"),
            status: doc.get("status"),
            executed_at: doc.get("executed_at"),
            count_try: doc.get("count_try")
        }));
    }

    export async function store(queue: Queue) {
        await queueModel.findOneAndUpdate({ _id: queue._id }, queue, {
            new: true,
            upsert: true
        }).lean().exec();
    }
}

let i: QueueRepository = interpreter;
export default i;