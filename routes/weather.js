var express = require("express");
var router = express.Router();
var fetch = require("node-fetch");

const API_KEY = "22aa1081fb63818961d445287d7a2b9c";

router.get("/", (req, res) => {
  res.send("Weather Service");
});

router.get("/example", (req, res) => {
  fetch(
    "https://samples.openweathermap.org/data/2.5/weather?q=London,uk&appid=b6907d289e10d714a6e88b30761fae22"
  )
    .then(response => response.json())
    .then(json => {
      console.log(json);
      res.send(json);
    });
});

module.exports = router;
