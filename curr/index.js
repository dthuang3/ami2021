"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var AerisWeather = require("@aerisweather/javascript-sdk").AerisWeather;
var express = require("express");
var port = 3000;
var app = express();
var bodyParser = require("body-parser");
var axios = require("axios");
var got = require("got");
var config = require("config");
var _ = require("lodash");
var util = require("./utils/utils.ts");
var knex = require("knex")({
    client: "pg",
    connection: {
        host: "35.197.106.97",
        user: "postgres",
        password: "AmiIntern2021!",
        database: "postgres"
    }
});
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));
// GET localhost:3000/weather?date="XXXXXXXX"&lat=xxx.xxx&lng=xxx.xxx?
// GET localhost:3000/weather?date="xxxxxxxx"&WeatherStationID="xxxxx"
app.get("/weather", function (request, response) { return __awaiter(void 0, void 0, void 0, function () {
    var params, location_1, url, result, periods, pop_avg, min_tmp, max_tmp, avg_tmp, toInsert, err_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                // protect input parameters w/ validation check at beginning
                // i.e. invalid date format, invalid latitude/longitude
                // adding validation - prevent crashing
                if (!util.isValidDate(request.query.date) ||
                    (!util.isValidLat(request.query.lat) &&
                        !util.isValidLng(request.query.lng) &&
                        !request.query.WeatherStationID)) {
                    throw new Error("invalid parameters");
                }
                // parse query body for parameters
                console.log(request.query);
                return [4 /*yield*/, util.parseQuery(request.query)];
            case 1:
                params = _a.sent();
                console.log(params);
                if (request.query.WeatherStationID) {
                    location_1 = request.query.WeatherStationID;
                }
                else {
                    location_1 = params.lat + "," + params.lng;
                }
                url = "https://api.aerisapi.com/forecasts/" + location_1 + "?from=" + params.date + "&limit=14&client_id=" + config.get("AerisClient.ID") + "&client_secret=" + config.get("AerisClient.SECRET");
                return [4 /*yield*/, got(url)];
            case 2:
                result = _a.sent();
                periods = JSON.parse(result.body)["response"][0]["periods"];
                pop_avg = _.meanBy(periods, function (obj) { return obj.pop; });
                min_tmp = _.minBy(periods, function (obj) { return obj.minTempF; }).minTempF;
                max_tmp = _.maxBy(periods, function (obj) { return obj.maxTempF; }).maxTempF;
                avg_tmp = _.meanBy(periods, function (obj) { return obj.avgTempF; });
                toInsert = {
                    date: request.query.date,
                    latitude: request.query.lat,
                    longitude: request.query.lng,
                    pop: pop_avg,
                    minTempF: min_tmp,
                    maxTempF: max_tmp,
                    avgTempF: avg_tmp,
                    weatherStationId: request.query.WeatherStationID
                };
                knex("AMI")
                    .insert(toInsert)
                    .then(function () { return console.log("inserted to db"); })["catch"](function (err) {
                    throw err;
                });
                response.send("Interval: 14(Days), POP: " + pop_avg + ", Min: " + min_tmp + ", Max: " + max_tmp + ", Avg: " + avg_tmp);
                return [3 /*break*/, 4];
            case 3:
                err_1 = _a.sent();
                console.error(err_1);
                response.status(404).send("error");
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
app.listen(port);
