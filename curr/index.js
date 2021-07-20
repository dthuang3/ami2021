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
var promisify = require("util").promisify;
var express = require("express");
var port = 3000;
var app = express();
var axios = require("axios");
var got = require("got");
var config = require("config");
var _ = require("lodash");
var utils = require("./utils/utils.ts");
var services = require("./services/services.ts");
var knex = require("knex")({
    client: "pg",
    connection: {
        host: config.get("dbConfig.host"),
        user: config.get("dbConfig.user"),
        password: config.get("dbConfig.password"),
        database: config.get("dbConfig.database")
    }
});
var geohash_ = require("ngeohash");
var redis = require("redis");
var redis_port = 6379;
var client = redis.createClient(redis_port);
var getAsync = promisify(client.hget).bind(client);
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));
// GET localhost:3000/weather?date="XXXXXXXX"&lat=xxx.xxx&lng=xxx.xxx?
// GET localhost:3000/weather?date="xxxxxxxx"&WeatherStationID="xxxxx"
// TODO: validate api responses before continuing
app.get("/weather", function (request, response) { return __awaiter(void 0, void 0, void 0, function () {
    var latLngOnly, weaStationOnly, lat, lng, location_1, date, url, aeris_response, url2, station_response, station_id_1, country, latlon, bomForecast_1, geohash, url3, bom_response, aerisForecast_1, err_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 5, , 6]);
                latLngOnly = utils.isValidLat(request.query.lat) &&
                    utils.isValidLng(request.query.lng) &&
                    !request.query.WeatherStationID;
                weaStationOnly = !utils.isValidLat(request.query.lat) &&
                    !utils.isValidLng(request.query.lng) &&
                    request.query.WeatherStationID;
                if (!utils.isValidDate(request.query.date) ||
                    !(latLngOnly || weaStationOnly)) {
                    // how to default?
                    throw new Error("invalid parameters");
                }
                lat = void 0;
                lng = void 0;
                if (latLngOnly) {
                    lat = _.round(request.query.lat, 4);
                    lng = _.round(request.query.lng, 4);
                    location_1 = lat + "," + lng;
                }
                else if (weaStationOnly) {
                    location_1 = request.query.WeatherStationID;
                }
                date = request.query.date.substring(0, 4) +
                    "/" +
                    request.query.date.substring(4, 6) +
                    "/" +
                    request.query.date.substring(6);
                url = config.get("url.aeris/forecasts") +
                    (location_1 + "?date=" + date + "&") +
                    config.get("AerisClient.login");
                return [4 /*yield*/, axios.get(url)];
            case 1:
                aeris_response = _a.sent();
                url2 = config.get("url.aeris/observations/summary") +
                    ("?p=" + location_1 + "&limit=20&") +
                    config.get("AerisClient.login");
                return [4 /*yield*/, axios.get(url2)];
            case 2:
                station_response = _a.sent();
                station_id_1 = station_response["data"]["response"][0]["id"];
                country = station_response["data"]["response"][0]["place"]["country"];
                latlon = station_response["data"]["response"][0]["loc"];
                console.log(latlon);
                if (weaStationOnly) {
                    lat = latlon.lat;
                    lng = latlon.long;
                }
                bomForecast_1 = [];
                if (!(country === "au")) return [3 /*break*/, 4];
                geohash = geohash_.encode(lat, lng, 7);
                console.log(geohash);
                url3 = config.get("url.au/forecasts") + (geohash + "/forecasts/daily");
                return [4 /*yield*/, axios.get(url3)];
            case 3:
                bom_response = _a.sent();
                _.forEach(bom_response["data"]["data"], function (period) {
                    var forecast = {
                        weaStationID: station_id_1,
                        minTemp: period.temp_min,
                        maxTemp: period.temp_max,
                        avgTemp: 0,
                        pop: period.rain.chance,
                        date: period.date,
                        source: "BoM"
                    };
                    bomForecast_1.push(forecast);
                });
                _a.label = 4;
            case 4:
                aerisForecast_1 = [];
                _.forEach(aeris_response["data"]["response"][0]["periods"], function (period) {
                    var forecast = {
                        weaStationID: station_id_1,
                        minTemp: period.minTempC,
                        maxTemp: period.maxTempC,
                        avgTemp: period.avgTempC,
                        pop: period.pop,
                        date: period.validTime,
                        source: "AerisWeather"
                    };
                    aerisForecast_1.push(forecast);
                });
                response.send(bomForecast_1.length >= 1
                    ? JSON.stringify(bomForecast_1, null, "\t")
                    : JSON.stringify(aerisForecast_1, null, "\t"));
                return [3 /*break*/, 6];
            case 5:
                err_1 = _a.sent();
                console.error(err_1);
                response.status(404).send("broken");
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// GET localhost:3000/getNearByWeatherStation?lat=xxxx.xxx&&lng=xx.xxx
// combining australia weather stations and aerisweather weather stations
app.get("/getNearByWeatherStation", function (request, response) { return __awaiter(void 0, void 0, void 0, function () {
    var foo, station_info, err_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 6, , 7]);
                // parameter validation
                if (!utils.isValidLat(request.query.lat) ||
                    !utils.isValidLng(request.query.lng)) {
                    throw new Error("invalid location");
                }
                return [4 /*yield*/, getAsync("stations", _.round(request.query.lat, 4) + "," + _.round(request.query.lng, 4))];
            case 1:
                foo = _a.sent();
                console.log(foo);
                if (!foo) return [3 /*break*/, 2];
                response.send(JSON.parse(foo));
                return [2 /*return*/];
            case 2: return [4 /*yield*/, services.BroadenStationSearch(_.round(request.query.lat, 4), _.round(request.query.lng, 4), 20, null)];
            case 3:
                station_info = _a.sent();
                // store to redis
                return [4 /*yield*/, client.hset("stations", _.round(request.query.lat, 4) + "," + _.round(request.query.lng, 4), JSON.stringify(station_info))];
            case 4:
                // store to redis
                _a.sent();
                response.send(station_info);
                _a.label = 5;
            case 5: return [3 /*break*/, 7];
            case 6:
                err_2 = _a.sent();
                console.error(err_2);
                response.status(404).send("error");
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
app.listen(port);
