## Introduction

This is a skeleton implementation of the inclusion of local Australia weather data for the AMI weather service. This document will be a guide to using this API.

## Requests

There are two GET requests from this API: /weather and /getNearByWeatherStation.

### `GET /weather`

Returns a 7-day forecast for a given location.

### Parameters

Must be a valid combination of date and location. 

(date & lat & lng) 

OR 

(date & weatherStationID)

Parameter | Description
:-- | ---
lat | Geographic location north/south of the equator (min: -90.00, max: 90.00)
lng | Geographic location east/west of the prime meridian (min: -180.00, max: 180.00)
weatherStationID | AerisWeather Weatherstation ID
date | yyyymmdd (e.g. 20210725)

### Response Properties
Property | Type | Description
:-- | :--- | ---
forecast | (array) | forecasts for given location and date
forecast[].weaStationID | (string) |  AerisWeather station ID
forecast[].minTemp | (number) | minimum temperature for the day
forecast[].maxTemp | (number) | maximum temperature for the day
forecast[].avgTemp | (number) | average temperature for the day
forecast[].pop | (number) | probability of precipitation
forecast[]. source | (string) | weather information source ("AerisWeather" or "BoM")
forecast[].date | (string) | iso string of date in time local to the weather station.

### Example  Response

```javascript
{
    {
        "forecast": [
            {
                "weaStationID": "KC83",
                "minTemp": 16,
                "maxTemp": 34,
                "avgTemp": 25,
                "pop": 0,
                "source": "AerisWeather",
                "timezone": "2021-07-25T07:00:00.000Z"
            },
            {
                "weaStationID": "KC83",
                "minTemp": 17,
                "maxTemp": 33,
                "avgTemp": 25,
                "pop": 0,
                "source": "AerisWeather",
                "timezone": "2021-07-26T07:00:00.000Z"
            },
            {
                "weaStationID": "KC83",
                "minTemp": 20,
                "maxTemp": 35,
                "avgTemp": 27,
                "pop": 15,
                "source": "AerisWeather",
                "timezone": "2021-07-27T07:00:00.000Z"
            },
            {
                "weaStationID": "KC83",
                "minTemp": 20,
                "maxTemp": 37,
                "avgTemp": 28,
                "pop": 0,
                "source": "AerisWeather",
                "timezone": "2021-07-28T07:00:00.000Z"
            },
            {
                "weaStationID": "KC83",
                "minTemp": 19,
                "maxTemp": 38,
                "avgTemp": 29,
                "pop": 0,
                "source": "AerisWeather",
                "timezone": "2021-07-29T07:00:00.000Z"
            },
            {
                "weaStationID": "KC83",
                "minTemp": 19,
                "maxTemp": 37,
                "avgTemp": 28,
                "pop": 0,
                "source": "AerisWeather",
                "timezone": "2021-07-30T07:00:00.000Z"
            },
            {
                "weaStationID": "KC83",
                "minTemp": 17,
                "maxTemp": 34,
                "avgTemp": 26,
                "pop": 0,
                "source": "AerisWeather",
                "timezone": "2021-07-31T07:00:00.000Z"
            }
        ]
    }
}
```


### `GET /getNearByWeatherStation`

Returns a list of closest weather stations within 20 miles. If no weather stations are found, it will continue increasing the search radius by 10 miles until a weather station is found or when the radius reaches 100 miles.

### Parameters

Name | Description
:-- | ---
lat | Geographic location north/south of the equator (min: -90.00, max: 90.00)
lng | Geographic location east/west of the prime meridian (min: -180.00, max: 180.00)

### Response Properties

Property | Type | Description
:--  | :--- | ---
stations | (array) | closest stations to given location
stations[].weaStationID | (string) | AerisWeather weatherstation id
stations[].country | (string) | abbreviation of country weatherstation is located in
stations[].isPWS | (boolean) | whether the weather station is a *personal weather station*
stations[].lat | (number) | latitude
stations[].lng | (number) | longitude
### Example Response

```javascript
{
    "stations" : [
        {
            "WeaStationID": "MID_D9278",
            "country": "us",
            "isPWS": false,
            "lat": 37.9676,
            "lng": -121.721
        },
        {
            "WeaStationID": "PWS_ROSEGARDEN",
            "country": "us",
            "isPWS": true,
            "lat": 37.9675,
            "lng": -121.721
        },
        {
            "WeaStationID": "MID_E9135",
            "country": "us",
            "isPWS": false,
            "lat": 37.967,
            "lng": -121.7245
        },
        {
            "WeaStationID": "PWS_PPGBTW",
            "country": "us",
            "isPWS": true,
            "lat": 37.9639,
            "lng": -121.7046
        },
        {
            "WeaStationID": "PWS_JAMSTATION",
            "country": "us",
            "isPWS": true,
            "lat": 37.9571,
            "lng": -121.7649
        },
        {
            "WeaStationID": "PWS_KCAANTI0119",
            "country": "us",
            "isPWS": true,
            "lat": 37.9791,
            "lng": -121.775
        },
        {
            "WeaStationID": "PWS_SUNCRESTESTATES",
            "country": "us",
            "isPWS": true,
            "lat": 37.9883,
            "lng": -121.7736
        },
        {
            "WeaStationID": "PWS_HOTRWEATHERCAM",
            "country": "us",
            "isPWS": true,
            "lat": 37.9917,
            "lng": -121.7934
        },
        {
            "WeaStationID": "MID_D3588",
            "country": "us",
            "isPWS": false,
            "lat": 37.8989,
            "lng": -121.723
        },
        {
            "WeaStationID": "PWS_TRIOLGY1",
            "country": "us",
            "isPWS": true,
            "lat": 37.8989,
            "lng": -121.723
        }
    ]
}
```