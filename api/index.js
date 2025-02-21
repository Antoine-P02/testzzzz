require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");

const passport = require("passport");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");

const PORT = process.env.PORT || 4040;
const app = express();

function formatDateWithOffset(isoDateString) {
  const date = new Date(isoDateString);
  date.setHours(date.getHours() + 1); // Add 1 hour for France timezone

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const year = date.getFullYear();

  return `${hours}:${minutes} ${day}/${month}/${year}`;
}

app.use(
  bodyParser.json({
    limit: "50mb",
    verify: (req, _, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use(passport.initialize());

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    (accessToken, refreshToken, profile, done) => {
      console.log("Access Token: ", accessToken);
      console.log("Refresh Token: ", refreshToken);
      console.log("Profile: ", profile);
      done(null, profile);
    }
  )
);

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: [
      "profile",
      "email",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/gmail.labels",
    ],
  })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    res.redirect("/");
  }
);

app.get("/", (req, res) => {
  console.log("User: ", req.user);
});

app.post("/webhook/gmail", (req, res) => {
  console.log("Gmail Webhook Received");
  res.status(200).send("ok");

  console.log("Mail received at: ", formatDateWithOffset(req.body.message.publishTime));

  const { message } = req.body;

  if (!message || !message.data) {
    console.log("No message data found");
    return;
  }

  // Decode the Base64 encoded message data
  const encodedMessage = message.data;
  const decodedMessage = JSON.parse(
    Buffer.from(encodedMessage, "base64").toString("utf-8")
  );
  console.log("Decoded Message: ", decodedMessage, "\n\n");
});

module.exports = app;
