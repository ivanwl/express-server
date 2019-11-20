var express = require("express");
var router = express.Router();
var fetch = require("node-fetch");
const { URLSearchParams } = require("url");
const path = require("path");
const fs = require("fs");
var spotifyJSON = require("../assets/spotify.json");

const CLIENT_ID = spotifyJSON.clientId;
const CLIENT_SECRET = spotifyJSON.clientSecret;

const CLIENT_URL = "http://localhost:3000/spotify/";
const REDIRECT_URI = "http://localhost:3001/spotify/callback";
const BASE_URL = "http://localhost:3001/spotify";

const API_BASE_URI = "https://api.spotify.com/v1";

let accessToken = spotifyJSON.accessToken;
let refreshToken = spotifyJSON.refreshToken;

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

function refreshTokens() {
  const uri = "https://accounts.spotify.com/api/token";
  let params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", refreshToken);
  params.append("client_id", CLIENT_ID);
  params.append("client_secret", CLIENT_SECRET);
  return fetch(uri, {
    method: "POST",
    body: params
  })
    .then(response => response.json())
    .then(json => {
      accessToken = json.access_token;
      console.log("Access Token: " + accessToken);
      return json;
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
      REDIRECT_URI
  );
});

//authentication - second call for (refresh token, access token)
router.get("/callback", (req, res) => {
  console.log("Request: Spotify callback");
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
      accessToken = json.access_token;
      refreshToken = json.refresh_token;
      spotifyJSON.accessToken = accessToken;
      spotifyJSON.refreshToken = refreshToken;
      fs.writeFile(
        path.resolve(__dirname, "../public/json/spotify.json"),
        JSON.stringify(spotifyJSON, null, 2),
        err => {
          if (err) console.log(err);
        }
      );
      console.log("Access Token: " + accessToken);
      console.log("Refresh Token: " + refreshToken);
      console.log("Redirecting to Spotify base...");
      res.redirect(CLIENT_URL);
    });
});

//GET user playlist
router.get("/playlist", (req, res) => {
  console.log("Request: user playlists");
  return fetch(API_BASE_URI + "/me/playlists", {
    headers: {
      Authorization: "Bearer " + accessToken
    }
  })
    .then(response => {
      res.status(response.status);
      return response.json();
    })
    .then(json => {
      console.log("Sent: user playlists");
      return res.send(json);
    });
});

module.exports = router;
