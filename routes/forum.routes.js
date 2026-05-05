const express = require("express");
const { API_INSTANCE } = require("./index.routes");

const router = express.Router();

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CALLBACK_REDIRECT_URI = process.env.DISCORD_FORUM_CALLBACK_REDIRECT_URI;
const REDIRECT_URI = process.env.CLIENT_FORUM_REDIRECT_URI;

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

    // Sæt token i cookie
    res.cookie("token", access_token, {
      httpOnly: true,
      secure: true,      
      sameSite: "none",  
      maxAge: 7 * 24 * 60 * 60 * 1000, 
    });

    res.redirect(REDIRECT_URI);
  } catch (err) {
    console.error("OAuth2 callback error:", err.response?.data || err.message);
    res.status(400).json({ error: "OAuth failed" });
  }
});

router.get("/user/me", async (req, res) => {
  try {
    const { token } = req.cookies;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const response = await API_INSTANCE.get("/users/@me", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const { id, username, avatar, banner_color, email } = response.data;
    res.json({ id, username, avatar, banner_color, email });
  } catch (err) {
    console.error("User fetch error:", err.response?.data || err.message);
    res.status(401).json({ error: "Unauthorized" });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  res.json({ success: true, message: "Logged out successfully" });
});

router.get("/guilds/members/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const response = await API_INSTANCE.get(
      `/guilds/${GUILD_ID}/members/${userId}`,
      { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
    );
    res.json(response.data);
  } catch (err) {
    if (err.response?.status === 404) {
      return res.status(404).json({ message: "Unknown Member" });
    }
    console.error("Guild member fetch error:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/guilds/roles", async (req, res) => {
  try {
    const response = await API_INSTANCE.get(`/guilds/${GUILD_ID}/roles`, {
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
    });
    res.json(response.data);
  } catch (err) {
    if (err.response?.status === 403) {
      return res.status(403).json({ error: "Missing Permissions" });
    }
    console.error("Guild roles fetch error:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;