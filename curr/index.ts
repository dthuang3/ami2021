const { AerisWeather } = require("@aerisweather/javascript-sdk");
const { promisify } = require("util");
const express = require("express");
const port = 3000;
const app = express();
const bodyParser = require("body-parser");
const axios = require("axios");
const got = require("got");
const config = require("config");
const _ = require("lodash");
const utils = require("./utils/utils.ts");
const knex = require("knex")({
  client: "pg",
  connection: {
    host: config.get("dbConfig.host"),
    user: config.get("dbConfig.user"),
    password: config.get("dbConfig.password"),
    database: config.get("dbConfig.database"),
  },
});

const redis = require("redis");
const redis_port = 6379;

const client = redis.createClient(redis_port);
const getAsync = promisify(client.get).bind(client);

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);

// GET localhost:3000/weather?date="XXXXXXXX"&lat=xxx.xxx&lng=xxx.xxx?
// GET localhost:3000/weather?date="xxxxxxxx"&WeatherStationID="xxxxx"
app.get("/weather", async (request, response) => {
  try {
    // protect input parameters w/ validation check at beginning
    // i.e. invalid date format, invalid latitude/longitude
    // adding validation - prevent crashing
    if (
      !utils.isValidDate(request.query.date) ||
      (!utils.isValidLat(request.query.lat) &&
        !utils.isValidLng(request.query.lng) &&
        !request.query.WeatherStationID)
    ) {
      throw new Error("invalid parameters");
    }

    // parse query body for parameters
    console.log(request.query);
    const params = await utils.parseQuery(request.query);
    console.log(params);
    let location;
    if (request.query.WeatherStationID) {
      location = request.query.WeatherStationID;
    } else {
      location = params.lat + "," + params.lng;
    }

    // call aeris api
    // axios
    const url = `https://api.aerisapi.com/forecasts/${location}?from=${
      params.date
    }&limit=14&client_id=${config.get(
      "AerisClient.ID"
    )}&client_secret=${config.get("AerisClient.SECRET")}`;
    const result = await got(url);

    // parse aerisweather api response for pop, min, max, avg
    // show all days
    let periods: Object[] = JSON.parse(result.body)["response"][0]["periods"];
    _.forEach(periods, async (value, key) => {
      const weatherData = {
        date: request.query.date,
        latitude: request.query.lat,
        longitude: request.query.lng,
        pop: value.pop,
        minTempF: value.minTempF,
        maxTempF: value.maxTempF,
        avgTempF: value.avgTempF,
        weatherStationId: request.query.WeatherStationID,
      };
      // if other queries are dependent on this knex call, use await
      // interface of typescript
      // knex<AAA>("aaa") ** important advantage for typescript
      await knex("AMI")
        .insert(weatherData)
        .then(() => console.log("inserted to db"))
        .catch((err) => {
          throw err;
        });
    });
    response.json(periods);
  } catch (err) {
    console.error(err);
    response.status(404).send("error");
  }
});

// GET localhost:3000/getNearByWeatherStation?lat=xxxx.xxx&&lng=xx.xxx
app.get("/getNearByWeatherStation", async (request, response) => {
  try {
    // parameter validation
    if (
      !utils.isValidLat(request.query.lat) ||
      !utils.isValidLng(request.query.lng)
    ) {
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

    client.get(
      `${request.query.lat},${request.query.lng}`,
      async (err, data) => {
        if (err) throw err;
        if (data !== null) {
          console.log("fetching from cache");
          response.json(data);
        } else {
          const url = `https://api.aerisapi.com/normals/stations/closest?p=${
            request.query.lat
          },${request.query.lng}&limit=20&&client_id=${config.get(
            "AerisClient.ID"
          )}&client_secret=${config.get("AerisClient.SECRET")}`;

          // call aerisweather api
          const json = await axios.get(url);

          // parse for information
          const station_info = _.map(json["data"]["response"], (station) => {
            return {
              WeaStationID: station.id,
              country: station.place.country,
              isPWS: _.startsWith(station.id, "pws"),
              lat: station.loc.lat,
              lng: station.loc.long,
            };
          });

          // store to redis
          client.setex(
            `${request.query.lat},${request.query.lng}`,
            3600,
            JSON.stringify(station_info)
          );
          response.send(station_info);
        }
      }
    );
  } catch (err) {
    console.error(err);
    response.status(404).send("error");
  }
});

app.listen(port);
