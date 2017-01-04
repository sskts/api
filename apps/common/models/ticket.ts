import mongoose = require("mongoose");
import * as TheaterModel from "./theater";

/** model name */
export var name = "Ticket";

/**
 * 券種スキーマ
 */
export var schema = new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    theater: {
        type: String,
        ref: TheaterModel.name,
        required: true
    },
    code: String, // チケットコード
    name: { // チケット名
        type: {
            ja: String,
            en: String
        },
    },
    name_kana: String, // チケット名(カナ)
},{
    collection: "tickets",
    timestamps: { 
        createdAt: "created_at",
        updatedAt: "updated_at",
    }
});

export default mongoose.model(name, schema);
