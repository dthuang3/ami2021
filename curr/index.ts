import { weatherForecast } from "./services/weatherForecast";
import { weatherStation } from "./services/weatherStation";
import { promisify } from "util";
import * as express from "express";
const port = 3000;
const app = express();
import axios from "axios";
import * as config from "config";
import * as _ from "lodash";
import { isValidDate, isValidLat, isValidLng } from "./utils/utils";
import { BroadenStationSearch } from "./services/services";
import knex from "knex";
const myknex = knex({
  client: "pg",
  connection: {
    host: config.get("dbConfig.host"),
    user: config.get("dbConfig.user"),
    password: config.get("dbConfig.password"),
    database: config.get("dbConfig.database"),
  },
});
import * as geohash_ from "ngeohash";

import redis from "redis";
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
      isValidLat(request.query.lat) &&
      isValidLng(request.query.lng) &&
      !request.query.WeatherStationID;
    const weaStationOnly: boolean =
      !isValidLat(request.query.lat) &&
      !isValidLng(request.query.lng) &&
      !!request.query.WeatherStationID;
    if (!isValidDate(request.query.date) || !(latLngOnly || weaStationOnly)) {
      throw new Error("invalid parameters");
    }
    const date: string =
      request.query.date.toString().substring(0, 4) +
      "/" +
      request.query.date.toString().substring(4, 6) +
      "/" +
      request.query.date.toString().substring(6);

    // getting location and lat/lng
    let lat: number;
    let lng: number;
    let location: string;
    let station: weatherStation;
    let results: weatherForecast[];
    if (latLngOnly) {
      lat = _.round(request.query.lat, 4);
      lng = _.round(request.query.lng, 4);
      location = lat + "," + lng;
    } else if (weaStationOnly) {
      location = _.upperCase(request.query.WeatherStationID.toString());
      const stations = await myknex("WeatherStations")
        .select("*")
        .where("weaStationID", location);
      console.log(stations);
      station = stations[0];
      await myknex.raw(`SET TIME ZONE "${station.timezone}"`);
      const a = new Date(
        parseInt(date.substring(0, 5)),
        parseInt(date.substring(6, 7)) - 1,
        parseInt(date.substring(8))
      );
      console.log(a);
      console.log(a.toISOString());
      results = await myknex("Forecasts")
        .distinct(
          "weaStationID",
          "minTemp",
          "maxTemp",
          "avgTemp",
          "pop",
          "date",
          "source"
        )
        .where("weaStationID", location)
        .andWhere("date", ">=", a)
        .andWhere("source", station.country == "au" ? "BoM" : "AerisWeather")
        .orderBy([{ column: "source", order: "desc" }, "date"]);
      if (results) {
        response.send(JSON.stringify({ results }, null, "\t"));
        return;
      }
    }

    // getting aerisweather forecasts
    const url: string =
      config.get("url.aeris/forecasts") +
      `${location}?from=${date}&to=+7days&` +
      config.get("AerisClient.login");
    // typing AxiosResponse<object>
    const aeris_response = await axios.get(url);

    // getting aerisweather weatherstation
    const url2: string =
      config.get("url.aeris/observations/summary") +
      `?p=${location}&limit=20&` +
      config.get("AerisClient.login");
    const station_response = await axios.get(url2);

    // ensures valid response to parse
    if (station_response["data"]["error"] != null) {
      throw new Error("Invalid Station");
    }
    station = {
      weaStationID: station_response["data"]["response"][0]["id"],
      country: station_response["data"]["response"][0]["place"]["country"],
      latitude: _.round(
        station_response["data"]["response"][0]["loc"]["lat"],
        4
      ),
      longitude: _.round(
        station_response["data"]["response"][0]["loc"]["long"],
        4
      ),
      timezone: station_response["data"]["response"][0]["profile"]["tz"],
    };

    if (weaStationOnly) {
      lat = station.latitude;
      lng = station.longitude;
    }

    const aerisForecast: weatherForecast[] = [];
    _.forEach(aeris_response["data"]["response"][0]["periods"], (period) => {
      const forecast: weatherForecast = {
        weaStationID: station.weaStationID,
        minTemp: period.minTempC,
        maxTemp: period.maxTempC,
        avgTemp: period.avgTempC,
        pop: period.pop,
        date: period.dateTimeISO,
        source: "AerisWeather",
      };
      aerisForecast.push(forecast);
    });

    const bomForecast: weatherForecast[] = [];

    if (station.country === "au") {
      // call bom using geohash
      const geohash: string = geohash_.encode(lat, lng, 7);
      console.log(geohash);
      const url3: string =
        config.get("url.au/forecasts") + `${geohash}/forecasts/daily`;
      const bom_response = await axios.get(url3);
      _.forEach(bom_response["data"]["data"], (period) => {
        const forecast: weatherForecast = {
          weaStationID: station.weaStationID,
          minTemp: period.temp_min,
          maxTemp: period.temp_max,
          avgTemp: (period.temp_min + period.temp_max) / 2,
          pop: period.rain.chance,
          date: period.date,
          source: "BoM",
        };
        bomForecast.push(forecast);
      });

      // inserting avgTemp with aeris data
      for (let i = 0; i < 7; i++) {
        bomForecast[i].avgTemp = aerisForecast[i].avgTemp;
      }
    }

    // insert weatherstation into db
    await myknex("WeatherStations")
      .insert(station)
      .onConflict("weaStationID")
      .ignore();

    // combine all weatherforecasts
    const allForecasts: weatherForecast[] = _.concat(
      aerisForecast,
      bomForecast
    );
    // insert to db
    _.forEach(allForecasts, async (forecast: weatherForecast) => {
      await myknex("Forecasts").insert(forecast);
    });

    response.send(
      bomForecast.length >= 1
        ? JSON.stringify({ forecast: bomForecast }, null, "\t")
        : JSON.stringify({ forecast: aerisForecast }, null, "\t")
    );
  } catch (err) {
    console.error(err);
    response.status(404).send("something went wrong");
  }
});

// GET localhost:3000/getNearByWeatherStation?lat=xxxx.xxx&&lng=xx.xxx
// combining australia weather stations and aerisweather weather stations
app.get("/getNearByWeatherStation", async (request, response) => {
  try {
    // parameter validation
    if (!isValidLat(request.query.lat) || !isValidLng(request.query.lng)) {
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
      const station_info = await BroadenStationSearch(
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
