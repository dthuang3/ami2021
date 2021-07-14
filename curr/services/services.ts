var config = require("config")
var axios = require("axios");
const isInAustralia = async (lat, lng) => {
    const url = `https://api.aerisapi.com/places/${lat},${lng}?client_id=${config.get(
      "AerisClient.ID"
    )}&client_secret=${config.get("AerisClient.SECRET")}`;
    const response = await axios.get(url);
    return (response["data"]["response"]["place"]["countryFull"] === "Australia");
}

module.exports = {
    isInAustralia
}
