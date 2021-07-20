import * as config from "config";
import axios from "axios";
import * as _ from "lodash";

export const BroadenStationSearch = async (
  lat: number,
  lng: number,
  radius: number,
  station_info_response: any
): Promise<any[]> => {
  // base case: too many searches
  // base case: station_info_response is not empty
  if (
    radius >= 100 ||
    (station_info_response && station_info_response.length)
  ) {
    return station_info_response;
  }

  const params = `?p=${_.round(lat, 4)},${_.round(lng,4)}&limit=20&radius=${radius}&`;
  const url = config.get("url.aeris/observations/summary") + params + config.get("AerisClient.login");
  console.log("searching at " + radius + "miles");
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
  return BroadenStationSearch(lat, lng, radius + 10, station_info);
};