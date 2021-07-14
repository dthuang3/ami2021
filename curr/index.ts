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
    const params = await utils.parseQuery(request.query);
    console.log(params);
    let location;
    if (request.query.WeatherStationID) {
      location = request.query.WeatherStationID;
    } else {
      location = params.lat + "," + params.lng;
    }

    // checking if location is in australia
    // takes in a lat/lng, finds location name with aerisweather api
    const url2 = `https://api.aerisapi.com/places/${_.round(
      params.lat,
      4
    )},${_.round(params.lng, 4)}?client_id=${config.get(
      "AerisClient.ID"
    )}&client_secret=${config.get("AerisClient.SECRET")}`;
    let resp = await axios.get(url2);
    if (resp["data"]["response"]["place"]["countryFull"] === "Australia") {
      // finding geohash with place name
      console.log(resp["data"]["response"]["place"]["name"]);
      const url3 = `https://api.weather.bom.gov.au/v1/locations?search=${resp["data"]["response"]["place"]["name"]}`;
      resp = await axios.get(url3);
      const geohash = resp["data"]["data"][0].geohash;

      // calling forecast with geohash
      const url4 = `https://api.weather.bom.gov.au/v1/locations/${geohash}/forecasts/daily`;
      resp = await axios.get(url4);

      let obj = { periods: [] };
      _.forEach(resp["data"]["data"], async (value) => {
        obj.periods.push(
          `date: ${value.date.substring(0, 10)}, pop: ${
            value.rain.chance
          }, maxTempF: ${value.temp_max}, minTempF: ${value.temp_min}`
        );
      });
      console.log(JSON.stringify(obj));
      response.send(JSON.stringify(obj, null, 2));
      return;
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
    client.get(
      `${_.round(request.query.lat, 4)},${_.round(request.query.lng, 4)}`,
      async (err, data) => {
        if (err) throw err;
        if (data !== null) {
          console.log("fetching from cache");
          response.send(JSON.parse(data));
        } else {
          // TODO: move to curr/services/
          // move from here
          const BroadenStationSearch = async (
            location: string,
            radius: number,
            station_info_response
          ) => {
            // base case: if contains a station in search
            // TODO: add limitation range 100? miles
            if (station_info_response && station_info_response.length) {
              return station_info_response;
            }

            // call aerisweather api
            const url = `https://api.aerisapi.com//observations/summary/closest?p=${_.round(
              request.query.lat,
              4
            )},${_.round(
              request.query.lng,
              4
            )}&limit=20&radius=${radius}&client_id=kMSjcZ18CGSlSqPbuBpi2&client_secret=q2vrQeLYpHr53Lgu7KmexxDnAdR3gHbXeeiJIE1K`;

            console.log(`searching at ${radius} miles`);
            const json = await axios.get(url);
            console.log(json["data"]["response"]);
            const station_info = _.map(json["data"]["response"], (station) => {
              return {
                WeaStationID: station.id,
                country: station.place.country,
                isPWS: _.startsWith(station.id, "pws"),
                lat: _.round(station.loc.lat, 4),
                lng: _.round(station.loc.long, 4),
              };
            });
            return BroadenStationSearch(location, radius + 10, station_info);
          };

          const station_info = await BroadenStationSearch(
            `${_.round(request.query.lat, 4)},${_.round(request.query.lng)}`,
            20,
            null
          );

          // store to redis
          // TODO: restrict lat/lng to 4 digits
          client.setex(
            `${_.round(request.query.lat, 4)},${_.round(request.query.lng, 4)}`,
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
