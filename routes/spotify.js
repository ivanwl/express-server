var express = require("express");
var router = express.Router();
var fetch = require("node-fetch");
const { URLSearchParams } = require("url");
const path = require("path");
const fs = require("fs");
const spotifyConfig = require("../config/spotifyConfig");
var spotifyTokens = require("../assets/spotify");
require("../utils/statusCodes");

const CLIENT_ID = spotifyConfig.client_id;
const CLIENT_SECRET = spotifyConfig.client_secret;
const CLIENT_URL = spotifyConfig.client_url;
const REDIRECT_URL = spotifyConfig.redirect_url;
const CURRENT_URL = spotifyConfig.server_url;
const API_BASE_URI = spotifyConfig.api_uri;
const API_TOKEN_URI = spotifyConfig.api_token_uri;

let accessToken = spotifyTokens.access_token;
let refreshToken = spotifyTokens.refresh_token;

function constructHeader() {
  return {
    headers: {
      Authorization: "Bearer " + accessToken
    }
  };
}

function requestTokens(code) {
  console.log("Acquiring refreshTokens...");
  let params = new URLSearchParams();
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append("redirect_uri", REDIRECT_URL);
  params.append("client_id", CLIENT_ID);
  params.append("client_secret", CLIENT_SECRET);
  return fetch(API_TOKEN_URI, {
    method: "POST",
    body: params
  });
}

function refreshTokens() {
  console.log("Acquiring new access token...");
  let params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", refreshToken);
  params.append("client_id", CLIENT_ID);
  params.append("client_secret", CLIENT_SECRET);
  return fetch(API_TOKEN_URI, {
    method: "POST",
    body: params
  })
    .then(response => (response.ok ? response.json() : console.log(response)))
    .then(json => {
      accessToken = json.access_token;
      console.log("Access Token: " + accessToken);
      spotifyTokens.access_token = accessToken;
      saveTokens();
      return json;
    });
}

function saveTokens() {
  fs.writeFile(
    path.resolve(__dirname, "../assets/spotify.json"),
    JSON.stringify(spotifyTokens, null, 2),
    err => {
      if (err) console.error(err);
    }
  );
}

function getFetch(uri) {
  console.log("Request: " + uri);
  return fetch(uri, constructHeader()).then(response => {
    if (response.status === 401) {
      console.log("Access Token expired");
      return refreshTokens().then(() => getFetch(endpoint));
    } else return response.json();
  });
}

router.get("/", (req, res) => {
  console.log("Request: Spotify base");
  res.send("Spotify Service");
});

//authentication - first call for (authorization code)
router.get("/login", (req, res) => {
  console.log("Request: login");
  const scopes = encodeURIComponent(
    "user-read-private user-read-email playlist-read-private"
  );
  const authorizeURI = "https://accounts.spotify.com/authorize";
  console.log("Redirecting to Spotify login page...");
  res.send(
    authorizeURI +
      "?response_type=code" +
      "&client_id=" +
      CLIENT_ID +
      "&scope=" +
      scopes +
      "&redirect_uri=" +
      REDIRECT_URL
  );
});

//authentication - second call for (refresh token, access token)
router.get("/callback", (req, res) => {
  console.log("Request: Spotify callback");
  const code = req.query.code;
  if (!code) {
    console.error(req.query.error);
    return res.status(INTERNAL_SERVER_ERROR).send(req.query.error);
  }

  let response = requestTokens(code);
  response.then(result => {
    if (!result.ok) {
      console.warn(result.status + " " + result.statusText);
      return res.status(result.status).send(result.statusText);
    }
    return result.json().then(json => {
      accessToken = json.access_token;
      refreshToken = json.refresh_token;
      console.log("Access Token: " + accessToken);
      console.log("Refresh Token: " + refreshToken);
      spotifyTokens.access_token = accessToken;
      spotifyTokens.refresh_token = refreshToken;
      console.log("Saving tokens...");
      saveTokens();
      console.log("Redirecting to Spotify base...");
      res.redirect(CLIENT_URL);
    });
  });
});

//GET user playlists
router.get("/playlists", (req, res) => {
  return getFetch(API_BASE_URI + "/me/playlists").then(json => res.send(json));
});

//GET playlist by Id
router.get("/playlist/:id", (req, res) => {
  return getFetch(API_BASE_URI + "/playlists/" + req.params.id).then(json =>
    res.send(json)
  );
});

module.exports = router;
