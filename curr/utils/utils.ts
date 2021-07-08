module.exports = {
  parseQuery: (query) => {
    const date_str = query.date.toString();
    const year = date_str.substring(0, 4);
    const month = date_str.substring(4, 6);
    const day = date_str.substring(6);
    const date = year + "/" + month + "/" + day;
    const lat = parseFloat(query.lat);
    const lng = parseFloat(query.lng);
    return { date, lat, lng };
  },
};
