import monapt = require("monapt");
import { default as Owner } from "../../model/owner";
import OwnerRepository from "../owner";
import * as OwnerFactory from "../../factory/owner";
import OwnerModel from "./mongoose/model/owner";

namespace interpreter {
    export async function find(conditions: Object) {
        let docs = await OwnerModel.find({ $and: [conditions] }).exec();
        return docs.map((doc) => {
            return OwnerFactory.create({
                _id: doc.get("_id"),
                group: doc.get("group")
            });
        });
    }

    export async function findById(id: string) {
        let doc = await OwnerModel.findOne({ _id: id }).exec();
        if (!doc) return monapt.None;

        let owner = OwnerFactory.create({
            _id: doc.get("_id"),
            group: doc.get("group")
        });

        return monapt.Option(owner);
    }

    export async function findOneAndUpdate(conditions: Object, update: Object) {
        let doc = await OwnerModel.findOneAndUpdate({ $and: [conditions] }, update, {
            new: true,
            upsert: false
        }).exec();
        if (!doc) return monapt.None;

        let owner = OwnerFactory.create({
            _id: doc.get("_id"),
            group: doc.get("group")
        });

        return monapt.Option(owner);
    }

    export async function store(owner: Owner) {
        await OwnerModel.findOneAndUpdate({ _id: owner._id }, owner, {
            new: true,
            upsert: true
        }).lean().exec();
    }
}

let i: OwnerRepository = interpreter;
export default i;