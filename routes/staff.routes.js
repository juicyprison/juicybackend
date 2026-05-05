const express = require("express")

const GUILD_ID = process.env.DISCORD_GUILD_ID
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN

const router = express.Router()
router.get("/users", async (req, res) => {
    
})

module.exports = router
