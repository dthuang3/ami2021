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
var _this = this;
var AerisWeather = require("@aerisweather/javascript-sdk").AerisWeather;
var promisify = require("util").promisify;
var express = require("express");
var port = 3000;
var app = express();
var bodyParser = require("body-parser");
var axios = require("axios");
var got = require("got");
var config = require("config");
var _ = require("lodash");
var utils = require("./utils/utils.ts");
var knex = require("knex")({
    client: "pg",
    connection: {
        host: config.get("dbConfig.host"),
        user: config.get("dbConfig.user"),
        password: config.get("dbConfig.password"),
        database: config.get("dbConfig.database")
    }
});
var redis = require("redis");
var redis_port = 6379;
var client = redis.createClient(redis_port);
var getAsync = promisify(client.get).bind(client);
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));
// GET localhost:3000/weather?date="XXXXXXXX"&lat=xxx.xxx&lng=xxx.xxx?
// GET localhost:3000/weather?date="xxxxxxxx"&WeatherStationID="xxxxx"
app.get("/weather", function (request, response) { return __awaiter(_this, void 0, void 0, function () {
    var params, location_1, url, result, periods, pop_avg, min_tmp, max_tmp, avg_tmp, toInsert, err_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 4, , 5]);
                // protect input parameters w/ validation check at beginning
                // i.e. invalid date format, invalid latitude/longitude
                // adding validation - prevent crashing
                if (!utils.isValidDate(request.query.date) ||
                    (!utils.isValidLat(request.query.lat) &&
                        !utils.isValidLng(request.query.lng) &&
                        !request.query.WeatherStationID)) {
                    throw new Error("invalid parameters");
                }
                // parse query body for parameters
                console.log(request.query);
                return [4 /*yield*/, utils.parseQuery(request.query)];
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
                // if other queries are dependent on this knex call, use await
                // interface of typescript
                // knex<AAA>("aaa") ** important advantage for typescript
                return [4 /*yield*/, knex("AMI")
                        .insert(toInsert)
                        .then(function () { return console.log("inserted to db"); })["catch"](function (err) {
                        throw err;
                    })];
            case 3:
                // if other queries are dependent on this knex call, use await
                // interface of typescript
                // knex<AAA>("aaa") ** important advantage for typescript
                _a.sent();
                response.send("Interval: 14(Days), POP: " + pop_avg + ", Min: " + min_tmp + ", Max: " + max_tmp + ", Avg: " + avg_tmp);
                return [3 /*break*/, 5];
            case 4:
                err_1 = _a.sent();
                console.error(err_1);
                response.status(404).send("error");
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// GET localhost:3000/getNearByWeatherStation?lat=xxxx.xxx&&lng=xx.xxx
app.get("/getNearByWeatherStation", function (request, response) { return __awaiter(_this, void 0, void 0, function () {
    var _this = this;
    return __generator(this, function (_a) {
        try {
            // parameter validation
            if (!utils.isValidLat(request.query.lat) ||
                !utils.isValidLng(request.query.lng)) {
                throw new Error("invalid location");
            }
            /*
            console.log(`${request.query.lat},${request.query.lng}`);
            cache.forEach((value, key, cache) => {
              console.log("cache: " + key);
            });
            */
            // if lat/lng pair was recently called - pull station info from cache
            // qps - queries per second
            // redis
            client.get(request.query.lat + "," + request.query.lng, function (err, data) { return __awaiter(_this, void 0, void 0, function () {
                var url, json, station_info;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (err)
                                throw err;
                            if (!(data !== null)) return [3 /*break*/, 1];
                            console.log("fetching from cache");
                            response.json(data);
                            return [3 /*break*/, 3];
                        case 1:
                            url = "https://api.aerisapi.com/normals/stations/closest?p=" + request.query.lat + "," + request.query.lng + "&limit=20&&client_id=" + config.get("AerisClient.ID") + "&client_secret=" + config.get("AerisClient.SECRET");
                            return [4 /*yield*/, axios.get(url)];
                        case 2:
                            json = _a.sent();
                            station_info = _.map(json["data"]["response"], function (station) {
                                return {
                                    WeaStationID: station.id,
                                    country: station.place.country,
                                    isPWS: _.startsWith(station.id, "pws"),
                                    lat: station.loc.lat,
                                    lng: station.loc.long
                                };
                            });
                            // store to redis
                            client.setex(request.query.lat + "," + request.query.lng, 3600, JSON.stringify(station_info));
                            response.send(station_info);
                            _a.label = 3;
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
        }
        catch (err) {
            console.error(err);
            response.status(404).send("error");
        }
        return [2 /*return*/];
    });
}); });
app.listen(port);
