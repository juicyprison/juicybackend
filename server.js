require("dotenv/config");
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
require("./Discordbot");

const PORT = process.env.PORT || 8080;

const app = express();

app.use(cors({
  origin: [
    "https://juicymc.dk",
    "http://localhost:3000"
  ],
  credentials: true
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/forum", require("./routes/forum.routes"));
app.use("/api/forum/applications", require("./routes/applications.routes"));
app.use("/api/dashboard", require("./routes/dashboard.routes"));
app.use("/api/staff", require("./routes/staff.routes"));
app.use("/api/minecraft", require("./routes/minecraft.routes"));
app.use("/api/keys", require("./routes/keys.routes"));
app.use("/api/hjemmeside", require("./routes/hjemmeside.routes"));


// Logout
app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,     
    sameSite: "none", 
    path: "/",
  });
  return res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  setInterval(() => {
    fetch("https://juicybackend-f76r.onrender.com/api/minecraft/players")
      .catch(() => {});
  }, 10 * 60 * 1000);
});