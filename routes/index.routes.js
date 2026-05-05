const axios = require("axios")

const API_INSTANCE = axios.create({ baseURL: "https://discord.com/api/v10" })

module.exports = { API_INSTANCE }
