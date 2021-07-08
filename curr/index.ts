const { AerisWeather } = require("@aerisweather/javascript-sdk");
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
    let periods: Object[] = JSON.parse(result.body)["response"][0]["periods"];
    const pop_avg: number = _.meanBy(periods, (obj) => obj.pop);
    const min_tmp: number = _.minBy(periods, (obj) => obj.minTempF).minTempF;
    const max_tmp: number = _.maxBy(periods, (obj) => obj.maxTempF).maxTempF;
    const avg_tmp: number = _.meanBy(periods, (obj) => obj.avgTempF);

    const toInsert = {
      date: request.query.date,
      latitude: request.query.lat,
      longitude: request.query.lng,
      pop: pop_avg,
      minTempF: min_tmp,
      maxTempF: max_tmp,
      avgTempF: avg_tmp,
      weatherStationId: request.query.WeatherStationID,
    };
    knex("AMI")
      .insert(toInsert)
      .then(() => console.log("inserted to db"))
      .catch((err) => {
        throw err;
      });

    response.send(
      `Interval: 14(Days), POP: ${pop_avg}, Min: ${min_tmp}, Max: ${max_tmp}, Avg: ${avg_tmp}`
    );
  } catch (err) {
    console.error(err);
    response.status(404).send("error");
  }
});

app.listen(port);
