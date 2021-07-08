const { AerisWeather } = require("@aerisweather/javascript-sdk");
const express = require("express");
const port = 3000;
const app = express();
const bodyParser = require("body-parser");
const axios = require("axios");
const got = require("got");
const config = require("config");
var _ = require("lodash");
var util = require("./utils/utils.ts");
var knex = require("knex");

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);

// GET localhost:3000/weather?date="XXXXXXXX"&lat=xxx.xxx&lng=xxx.xxx
app.get("/weather", async (request, response) => {
  try {
    // TODO: checking for valid params
    // protect input parameters w/ validation check at beginning
    // i.e. invalid date format, invalid latitude/longitude
    // adding validation - prevent crashing

    // parse query body for parameters
    console.log(request.query);
    const params = await util.parseQuery(request.query);
    console.log(params);

    // call aeris api
    // axios
    const url = `https://api.aerisapi.com/forecasts/${params.lat},${
      params.lng
    }?from=${params.date}&limit=14&client_id=${config.get(
      "AerisClient.ID"
    )}&client_secret=${config.get("AerisClient.SECRET")}`;
    const result = await got(url);

    // parse aerisweather api response for pop, min, max, avg
    let periods: Object[] = JSON.parse(result.body)["response"][0]["periods"];
    const pop_avg: number = _.meanBy(periods, (obj) => obj.pop);
    const min_tmp: number = _.minBy(periods, (obj) => obj.minTempF).minTempF;
    const max_tmp: number = _.maxBy(periods, (obj) => obj.maxTempF).maxTempF;
    const avg_tmp: number = _.meanBy(periods, (obj) => obj.avgTempF);

    response.send(
      `Interval: 14(Days), POP: ${pop_avg}, Min: ${min_tmp}, Max: ${max_tmp}, Avg: ${avg_tmp}`
    );

    // TODO: insert into db
  } catch (err) {
    console.error(err);
    response.status(404).send("error");
  }
});

app.listen(port);
