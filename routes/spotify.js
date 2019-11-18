var express = require("express");
var router = express.Router();
var fetch = require("node-fetch");
const { URLSearchParams } = require("url");

const CLIENT_ID = "b9f0089017e4483b93e97380f0c26fd9";
const CLIENT_SECRET = "06037f9ab0e04905a1cd2d88a88e21f2";

const REDIRECT_URI = "http://localhost:3000/spotify/callback";
const BASE_URL = "http://localhost:3000/spotify";

const API_BASE_URI = "https://api.spotify.com/v1";

let accessToken = "";
let refreshToken = "";

function requestTokens(code) {
  const uri = "https://accounts.spotify.com/api/token";
  let params = new URLSearchParams();
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append("redirect_uri", REDIRECT_URI);
  params.append("client_id", CLIENT_ID);
  params.append("client_secret", CLIENT_SECRET);
  return fetch(uri, {
    method: "POST",
    body: params
  });
}

router.get("/", (req, res) => {
  res.send("Spotify Service");
});

router.get("/login", (req, res) => {
  const scopes = encodeURIComponent("user-read-private user-read-email");
  const authorizeURI = "https://accounts.spotify.com/authorize";
  res.redirect(
    authorizeURI +
      "?response_type=code" +
      "&client_id=" +
      CLIENT_ID +
      "&scope=" +
      scopes +
      "&redirect_uri=" +
      REDIRECT_URI
  );
});

router.get("/callback", (req, res) => {
  const code = req.query.code;
  if (!code) return console.log(req.query.error);

  let response = requestTokens(code);
  response
    .then(result => {
      if (!result.ok) return null;
      return result.json();
    })
    .then(json => {
      if (!json) return res.send("error");
      accessToken = json.accessToken;
      refreshToken = json.refreshToken;
      res.redirect(BASE_URL);
    });
});

module.exports = router;
