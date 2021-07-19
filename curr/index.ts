const { AerisWeather } = require("@aerisweather/javascript-sdk");
const { promisify } = require("util");
const express = require("express");
const port = 3000;
const app = express();
const bodyParser = require("body-parser");
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
app.get("/weather", async (request, response) => {
  try {
    // protect input parameters w/ validation check at beginning
    // e.g. invalid date format, invalid latitude/longitude
    // adding validation - prevent crashing
    if (
      !utils.isValidDate(request.query.date) ||
      (!utils.isValidLat(request.query.lat) && !utils.isValidLng(request.query.lng) && !request.query.WeatherStationID)
    ) {
      throw new Error("invalid parameters");
    }

    // parse query body for parameters
    const parameters = await utils.parseQuery(request.query);
    console.log(parameters);
    let location;
    if (request.query.WeatherStationID) {
      location = request.query.WeatherStationID;
    } else {
      location = parameters.lat + "," + parameters.lng;
    }

    // checking if location is in australia
    // takes in a lat/lng, finds location name with aerisweather api
    const place = await services.placeInAustralia(
      _.round(parameters.lat, 4),
      _.round(parameters.lng, 4)
    );

    if (place) {
      // global placement
      const place_geohash = await services.findGeohash(place);
      console.log(geohash_.encode(_.round(parameters.lat, 4), _.round(parameters.lng, 4), 7));
      console.log(place_geohash);
      const bom_api = config.get("url.au/forecasts") + place_geohash + "/forecasts/daily";
      const bom_info = await axios.get(bom_api);
      // storing geohash info into db
      // camel style table name
      // australiaLocations
      await knex("australia locations")
        .returning("id")
        .insert({
          geohash: place_geohash,
          latitude: _.round(parameters.lat, 4),
          longitude: _.round(parameters.lng, 4),
          name: place,
        })
        .then((id) => {
          console.log("inserted geohash into db \n id: " + id);
          // storing into redis with (place, id) pairs
        })
        .catch((err) => {
          throw err;
        });

      let obj = { periods: [] };
      _.forEach(bom_info["data"]["data"], async (value) => {
        obj.periods.push(
          `date: ${value.date.substring(0, 10)}, pop: ${
            value.rain.chance
          }, maxTempF: ${value.temp_max}, minTempF: ${value.temp_min}`
        );
      });
      response.send(JSON.stringify(obj, null, 2));
      return;
    }

    // call aeris api
    // TODO: switch from got to axios
    const fields = `${location}?from=${parameters.date}&limit=14&`;
    const url = config.get("url.aeris/forecasts") + fields + config.get("AerisClient.login");
    const result = await got(url);

    // parse aerisweather api response for pop, min, max, avg
    // show all days
    const periods: Object[] = JSON.parse(result.body)["response"][0]["periods"];
    _.forEach(periods, async (value, key) => {
      const weatherData = {
        date: value.validTime.substring(0, 10),
        latitude: _.round(request.query.lat, 4),
        longitude: _.round(request.query.lng, 4),
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
