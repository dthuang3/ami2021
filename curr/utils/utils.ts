var _ = require("lodash")
module.exports = {
  parseQuery: (query) => {
    const date_str = query.date.toString();
    const year = date_str.substring(0, 4);
    const month = date_str.substring(4, 6);
    const day = date_str.substring(6);
    const date = year + "/" + month + "/" + day;
    const lat = _.round(parseFloat(query.lat), 4);
    const lng = _.round(parseFloat(query.lng), 4);
    return { date, lat, lng };
  },
  isValidDate: (date) => {
    if (!date) return false;
    const today = new Date();
    const num_date = parseInt(date);
    console.log(
      today.getFullYear() * 10000 + today.getMonth() * 100 + today.getDate()
    );
    console.log(num_date);
    return (
      num_date >=
      today.getFullYear() * 10000 + today.getMonth() * 100 + today.getDate()
    );
  },
  isValidLat: (lat) => {
      const num = Number(lat);
      return !isNaN(num) && -90 <= num && num <= 90;
  },
  isValidLng: (lng) => {
      const num = Number(lng);
      return !isNaN(num) && -180 <= num && num <= 180;
  }
};
