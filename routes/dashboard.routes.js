const express = require("express");
const { API_INSTANCE } = require("./index.routes");

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const CALLBACK_REDIRECT_URI = process.env.DISCORD_DASHBOARD_CALLBACK_REDIRECT_URI;
const REDIRECT_URI = process.env.CLIENT_DASHBOARD_REDIRECT_URI;

const router = express.Router();

router.get("/login", (req, res) => {
  res.redirect(
    `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(
      CALLBACK_REDIRECT_URI
    )}&scope=identify+email+guilds.members.read`
  );
});

router.get("/callback", async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: "No code provided" });

    const response = await API_INSTANCE.post(
      "/oauth2/token",
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        redirect_uri: CALLBACK_REDIRECT_URI, 
        code,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { access_token } = response.data;

    res.cookie("token", access_token, {
      httpOnly: true,    
      secure: true,       
      sameSite: "none",   
      maxAge: 7 * 24 * 60 * 60 * 1000, 
    });

    res.redirect(REDIRECT_URI);

  } catch (err) {
    console.error("Dashboard OAuth2 callback error:", err.response?.data || err.message);
    res.status(400).json({ error: "OAuth failed" });
  }
});

module.exports = router;