"use strict";
const mongoose = require("mongoose");
const TheaterModel = require("./theater");
exports.schema = new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    theater: {
        type: String,
        ref: TheaterModel.default.modelName,
        required: true
    },
    code: String,
    name: {
        type: {
            ja: String,
            en: String
        },
    },
    name_kana: String,
}, {
    collection: "tickets",
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at",
    }
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = mongoose.model("Ticket", exports.schema);
