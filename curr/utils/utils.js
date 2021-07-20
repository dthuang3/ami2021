var _ = require("lodash");
module.exports = {
    parseQuery: function (query) {
        var date_str = query.date.toString();
        var year = date_str.substring(0, 4);
        var month = date_str.substring(4, 6);
        var day = date_str.substring(6);
        var date = year + "/" + month + "/" + day;
        var lat = _.round(parseFloat(query.lat), 4);
        var lng = _.round(parseFloat(query.lng), 4);
        return { date: date, lat: lat, lng: lng };
    },
    isValidDate: function (date) {
        if (!date)
            return false;
        var today = new Date();
        var num_date = parseInt(date);
        console.log(today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate());
        console.log(num_date);
        return (num_date >=
            today.getFullYear() * 10000 + today.getMonth() * 100 + today.getDate());
    },
    isValidLat: function (lat) {
        var num = Number(lat);
        return !isNaN(num) && -90 <= num && num <= 90;
    },
    isValidLng: function (lng) {
        var num = Number(lng);
        return !isNaN(num) && -180 <= num && num <= 180;
    }
};
