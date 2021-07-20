import { weatherForecast } from "./services/weatherForecast";
const { AerisWeather } = require("@aerisweather/javascript-sdk");
const { promisify } = require("util");
const express = require("express");
const port = 3000;
const app = express();
var axios = require("axios");
const got = require("got");
var config = require("config");
var _ = require("lodash");
const utils = require("./utils/utils.ts");
const services = require("./services/services.ts");
const knex = require("knex")({
  client: "pg",
  connection: {
    host: config.get("dbConfig.host"),
    user: config.get("dbConfig.user"),
    password: config.get("dbConfig.password"),
    database: config.get("dbConfig.database"),
  },
});
var geohash_ = require("ngeohash");

const redis = require("redis");
const redis_port = 6379;

const client = redis.createClient(redis_port);
const getAsync = promisify(client.hget).bind(client);

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);

// GET localhost:3000/weather?date="XXXXXXXX"&lat=xxx.xxx&lng=xxx.xxx?
// GET localhost:3000/weather?date="xxxxxxxx"&WeatherStationID="xxxxx"
// TODO: validate api responses before continuing
app.get("/weather", async (request, response) => {
  try {
    // protect input parameters w/ validation check at beginning
    // e.g. invalid date format, invalid latitude/longitude
    // adding validation - prevent crashing
    // TTF or FFT
    const latLngOnly: boolean =
      utils.isValidLat(request.query.lat) &&
      utils.isValidLng(request.query.lng) &&
      !request.query.WeatherStationID;
    const weaStationOnly: boolean =
      !utils.isValidLat(request.query.lat) &&
      !utils.isValidLng(request.query.lng) &&
      request.query.WeatherStationID;
    if (
      !utils.isValidDate(request.query.date) ||
      !(latLngOnly || weaStationOnly)
    ) {
      // how to default?
      throw new Error("invalid parameters");
    }

    // getting location and lat/lng
    let lat: number;
    let lng: number;
    let location: string;
    if (latLngOnly) {
      lat = _.round(request.query.lat, 4);
      lng = _.round(request.query.lng, 4);
      location = lat + "," + lng;
    } else if (weaStationOnly) {
      location = request.query.WeatherStationID;
    }
    let date: string =
      request.query.date.substring(0, 4) +
      "/" +
      request.query.date.substring(4, 6) +
      "/" +
      request.query.date.substring(6);

    // getting aerisweather forecasts
    const url: string =
      config.get("url.aeris/forecasts") +
      `${location}?date=${date}&` +
      config.get("AerisClient.login");
    // typing AxiosResponse<object>
    const aeris_response = await axios.get(url);

    // getting aerisweather weatherstation
    const url2: string =
      config.get("url.aeris/observations/summary") +
      `?p=${location}&limit=20&` +
      config.get("AerisClient.login");
    const station_response = await axios.get(url2);
    const station_id: string = station_response["data"]["response"][0]["id"];
    const country: string =
      station_response["data"]["response"][0]["place"]["country"];
    const latlon = station_response["data"]["response"][0]["loc"];
    console.log(latlon);
    if (weaStationOnly) {
      lat = latlon.lat;
      lng = latlon.long;
    }

    // TODO: insert aerisweather information into db

    let bomForecast: weatherForecast[] = [];

    if (country === "au") {
      // call bom using geohash
      const geohash: string = geohash_.encode(lat, lng, 7);
      console.log(geohash);
      const url3: string =
        config.get("url.au/forecasts") + `${geohash}/forecasts/daily`;
      const bom_response = await axios.get(url3);
      _.forEach(bom_response["data"]["data"], (period) => {
        const forecast: weatherForecast = {
          weaStationID: station_id,
          minTemp: period.temp_min,
          maxTemp: period.temp_max,
          avgTemp: 0,
          pop: period.rain.chance,
          date: period.date,
          source: "BoM",
        };
        bomForecast.push(forecast);
      });

      // TODO: insert bom info into db
    }

    let aerisForecast: weatherForecast[] = [];
    _.forEach(aeris_response["data"]["response"][0]["periods"], (period) => {
      const forecast: weatherForecast = {
        weaStationID: station_id,
        minTemp: period.minTempC,
        maxTemp: period.maxTempC,
        avgTemp: period.avgTempC,
        pop: period.pop,
        date: period.validTime,
        source: "AerisWeather",
      };
      aerisForecast.push(forecast);
    });

    response.send(
      bomForecast.length >= 1
        ? JSON.stringify(bomForecast, null, "\t")
        : JSON.stringify(aerisForecast, null, "\t")
    );
  } catch (err) {
    console.error(err);
    response.status(404).send("broken");
  }
});

// GET localhost:3000/getNearByWeatherStation?lat=xxxx.xxx&&lng=xx.xxx
// combining australia weather stations and aerisweather weather stations
app.get("/getNearByWeatherStation", async (request, response) => {
  try {
    // parameter validation
    if (
      !utils.isValidLat(request.query.lat) ||
      !utils.isValidLng(request.query.lng)
    ) {
      throw new Error("invalid location");
    }

    // if lat/lng pair was recently called - retrieve station info from cache
    // qps - queries per second
    // TODO: use promise/aysnc await
    const foo = await getAsync(
      "stations",
      `${_.round(request.query.lat, 4)},${_.round(request.query.lng, 4)}`
    );
    console.log(foo);
    if (foo) {
      response.send(JSON.parse(foo));
      return;
    } else {
      // search for 20 closest weather stations
      const station_info = await services.BroadenStationSearch(
        _.round(request.query.lat, 4),
        _.round(request.query.lng, 4),
        20,
        null
      );
      // store to redis
      await client.hset(
        "stations",
        `${_.round(request.query.lat, 4)},${_.round(request.query.lng, 4)}`,
        JSON.stringify(station_info)
      );
      response.send(station_info);
    }
  } catch (err) {
    console.error(err);
    response.status(404).send("error");
  }
});

app.listen(port);
