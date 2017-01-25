"use strict";
const express = require("express");
let router = express.Router();
const mongoose = require("mongoose");
const conf = require("config");
let MONGOLAB_URI = conf.get("mongolab_uri");
router.get("/environmentVariables", (req, res) => {
    console.log("ip:", req.ip);
    res.json({
        data: {
            type: "envs",
            attributes: process.env
        }
    });
});
router.get("/mongoose/connect", (req, res, next) => {
    console.log("ip:", req.ip);
    mongoose.connect(MONGOLAB_URI, (err) => {
        if (err)
            return next(err);
        res.status(204).end();
    });
});
router.get("/mongoose/disconnect", (req, res, next) => {
    console.log("ip:", req.ip);
    mongoose.disconnect((err) => {
        if (err)
            return next(err);
        res.status(204).end();
    });
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = router;