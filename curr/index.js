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
app.get("/weather", function (request, response) { return __awaiter(_this, void 0, void 0, function () {
    var parameters, location_1, place_1, geohash_id, _a, place_geohash, bom_api, bom_info, obj_1, fields, url, result, periods, err_1;
    var _this = this;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 11, , 12]);
                // protect input parameters w/ validation check at beginning
                // i.e. invalid date format, invalid latitude/longitude
                // adding validation - prevent crashing
                if (!utils.isValidDate(request.query.date) ||
                    (!utils.isValidLat(request.query.lat) &&
                        !utils.isValidLng(request.query.lng) &&
                        !request.query.WeatherStationID)) {
                    throw new Error("invalid parameters");
                }
                return [4 /*yield*/, utils.parseQuery(request.query)];
            case 1:
                parameters = _b.sent();
                console.log(parameters);
                if (request.query.WeatherStationID) {
                    location_1 = request.query.WeatherStationID;
                }
                else {
                    location_1 = parameters.lat + "," + parameters.lng;
                }
                return [4 /*yield*/, services.placeInAustralia(_.round(parameters.lat, 4), _.round(parameters.lng, 4))];
            case 2:
                place_1 = _b.sent();
                _a = Number;
                return [4 /*yield*/, getAsync("geohashes", place_1)];
            case 3:
                geohash_id = _a.apply(void 0, [_b.sent()]);
                if (!(place_1 && geohash_id)) return [3 /*break*/, 5];
                return [4 /*yield*/, knex("australia locations")
                        .select("geohash")
                        .where("id", "=", Number(geohash_id))
                        .then(function (gh) {
                        response.send(gh);
                    })];
            case 4:
                _b.sent();
                return [2 /*return*/];
            case 5:
                if (!place_1) return [3 /*break*/, 9];
                return [4 /*yield*/, services.findGeohash(place_1)];
            case 6:
                place_geohash = _b.sent();
                bom_api = config.get("au/forecast") + place_geohash + "forecasts/daily";
                return [4 /*yield*/, axios.get(bom_api)];
            case 7:
                bom_info = _b.sent();
                // storing geohash info into db
                // camel style table name
                // australiaLocations
                return [4 /*yield*/, knex("australia locations")
                        .returning("id")
                        .insert({
                        geohash: place_geohash,
                        latitude: _.round(parameters.lat, 4),
                        longitude: _.round(parameters.lng, 4),
                        name: place_1
                    })
                        .then(function (id) {
                        console.log("inserted geohash into db \n id: " + id);
                        // storing into redis with (place, id) pairs
                        client.hset("geohashes", place_1, id.toString());
                    })["catch"](function (err) {
                        throw err;
                    })];
            case 8:
                // storing geohash info into db
                // camel style table name
                // australiaLocations
                _b.sent();
                obj_1 = { periods: [] };
                _.forEach(bom_info["data"]["data"], function (value) { return __awaiter(_this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        obj_1.periods.push("date: " + value.date.substring(0, 10) + ", pop: " + value.rain.chance + ", maxTempF: " + value.temp_max + ", minTempF: " + value.temp_min);
                        return [2 /*return*/];
                    });
                }); });
                response.send(JSON.stringify(obj_1, null, 2));
                return [2 /*return*/];
            case 9:
                fields = location_1 + "?from=" + parameters.date + "&limit=14&";
                url = config.get("aeris/forecasts") + fields + config.get("AerisClient.login");
                return [4 /*yield*/, got(url)];
            case 10:
                result = _b.sent();
                periods = JSON.parse(result.body)["response"][0]["periods"];
                _.forEach(periods, function (value, key) { return __awaiter(_this, void 0, void 0, function () {
                    var weatherData;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                weatherData = {
                                    date: value.validTime.substring(0, 10),
                                    latitude: _.round(request.query.lat, 4),
                                    longitude: _.round(request.query.lng, 4),
                                    pop: value.pop,
                                    minTempF: value.minTempF,
                                    maxTempF: value.maxTempF,
                                    avgTempF: value.avgTempF,
                                    weatherStationId: request.query.WeatherStationID
                                };
                                // if other queries are dependent on this knex call, use await
                                // interface of typescript
                                // knex<AAA>("aaa") ** important advantage for typescript
                                return [4 /*yield*/, knex("AMI")
                                        .insert(weatherData)
                                        .then(function () { return console.log("inserted to db"); })["catch"](function (err) {
                                        throw err;
                                    })];
                            case 1:
                                // if other queries are dependent on this knex call, use await
                                // interface of typescript
                                // knex<AAA>("aaa") ** important advantage for typescript
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                response.json(periods);
                return [3 /*break*/, 12];
            case 11:
                err_1 = _b.sent();
                console.error(err_1);
                response.status(404).send("error");
                return [3 /*break*/, 12];
            case 12: return [2 /*return*/];
        }
    });
}); });
// GET localhost:3000/getNearByWeatherStation?lat=xxxx.xxx&&lng=xx.xxx
// combining australia weather stations and aerisweather weather stations
app.get("/getNearByWeatherStation", function (request, response) { return __awaiter(_this, void 0, void 0, function () {
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
