const express = require("express")
const router = express.Router()
const supabase = require("../lib/supabase/client")
const { API_INSTANCE } = require("./index.routes")

const GUILD_ID = process.env.DISCORD_GUILD_ID
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN

async function getDiscordUser(token) {
  const response = await API_INSTANCE.get("/users/@me", {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

function isValidType(type) {
  return ["unban", "staff", "officer"].includes(type)
}


async function sendDM(userId, payload) {
  try {
    const dmChannel = await API_INSTANCE.post(
      "/users/@me/channels",
      { recipient_id: userId },
      { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
    )

    await API_INSTANCE.post(
      `/channels/${dmChannel.data.id}/messages`,
      payload,
      { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
    )
  } catch (err) {
    console.error("Kunne ikke sende DM:", err.response?.data || err.message)
  }
}

function buildEmbed({ title, description, color }) {
  return {
    embeds: [
      {
        title,
        description,
        color,
        footer: { text: "LoreMC • Ansøgning" },
        timestamp: new Date().toISOString(),
      },
    ],
  }
}


router.get("/unban", async (req, res) => {
  const { data, error } = await supabase.from("unban applications").select()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.get("/unban/me", async (req, res) => {
  const { token } = req.cookies
  if (!token) return res.status(400).json({ error: "Auth required" })
  const user = await getDiscordUser(token)

  const { data, error } = await supabase
    .from("unban applications")
    .select()
    .eq("discord_id", user.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.post("/unban", async (req, res) => {
  const { token } = req.cookies
  if (!token) return res.status(400).json({ error: "Auth required" })
  const user = await getDiscordUser(token)

  const {
    minecraft_name,
    other_accounts,
    banned_at,
    ban_reason,
    unban_reason,
    had_previous_bans,
  } = req.body

  if (!minecraft_name || !ban_reason || !unban_reason) {
    return res.status(400).json({ error: "Missing required fields" })
  }

  const { data, error } = await supabase
    .from("unban applications")
    .insert({
      discord_id: user.id,
      discord_username: user.username,
      discord_avatar: user.avatar,
      minecraft_name,
      other_accounts,
      banned_at,
      ban_reason,
      unban_reason,
      had_previous_bans,
      status: "Afventer svar",
    })
    .select()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

router.get("/staff", async (req, res) => {
  const { data, error } = await supabase.from("staff applications").select()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.get("/staff/me", async (req, res) => {
  const { token } = req.cookies
  if (!token) return res.status(400).json({ error: "Auth required" })
  const user = await getDiscordUser(token)

  const { data, error } = await supabase
    .from("staff applications")
    .select()
    .eq("discord_id", user.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.post("/staff", async (req, res) => {
  const { token } = req.cookies
  if (!token) return res.status(400).json({ error: "Auth required" })
  const user = await getDiscordUser(token)

  const { name, age, minecraft, punishments, why_choose, activity, accept } =
    req.body
  if (!name || !age || !punishments || !why_choose || !activity || !accept) {
    return res.status(400).json({ error: "Missing required fields" })
  }

  const { data, error } = await supabase
    .from("staff applications")
    .insert({
      discord_id: user.id,
      discord_username: user.username,
      discord_avatar: user.avatar,
      name,
      age,
      minecraft,
      punishments,
      why_choose,
      activity,
      accept,
      status: "Afventer svar",
    })
    .select()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})


router.get("/officer", async (req, res) => {
  const { data, error } = await supabase.from("officer applications").select()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.get("/officer/me", async (req, res) => {
  const { token } = req.cookies
  if (!token) return res.status(400).json({ error: "Auth required" })
  const user = await getDiscordUser(token)

  const { data, error } = await supabase
    .from("officer applications")
    .select()
    .eq("discord_id", user.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.post("/officer", async (req, res) => {
  const { token } = req.cookies
  if (!token) return res.status(400).json({ error: "Auth required" })
  const user = await getDiscordUser(token)

  const {
    name,
    age,
    minecraft,
    warnings,
    stats,
    officer_question1,
    officer_question2,
    officer_question3,
    officer_question4,
    officer_question5,
    officer_question6,
    officer_question7,
  } = req.body

  if (!name || !age || !officer_question1 || !officer_question2 || !officer_question3) {
    return res.status(400).json({ error: "Missing required fields" })
  }

  const { data, error } = await supabase
    .from("officer applications")
    .insert({
      discord_id: user.id,
      discord_username: user.username,
      discord_avatar: user.avatar,
      name,
      age,
      minecraft,
      warnings,
      stats,
      officer_question1,
      officer_question2,
      officer_question3,
      officer_question4,
      officer_question5,
      officer_question6,
      officer_question7,
      status: "Afventer svar",
    })
    .select()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})


router.patch("/:type/:id/status", async (req, res) => {
  const { type, id } = req.params
  const { status } = req.body

  if (!isValidType(type)) return res.status(400).json({ error: "Invalid type" })
  if (!status) return res.status(400).json({ error: "Missing status" })

  const { data, error } = await supabase
    .from(`${type} applications`)
    .update({ status })
    .eq("id", id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })

  if (data && status !== "Afventer svar") {
    await sendDM(
      data.discord_id,
      buildEmbed({
        title: "📢 Din ansøgning er blevet opdateret",
        description: `Status på din ansøgning er nu: **${status}**`,
        color: status === "Accepteret" ? 0x2ecc71 : 0xe74c3c,
      })
    )
  }

  res.json(data)
})


router.get("/:type/:id/comments", async (req, res) => {
  const { type, id } = req.params
  if (!isValidType(type)) return res.status(400).json({ error: "Invalid type" })

  const { data, error } = await supabase
    .from("application comments")
    .select()
    .eq("application_id", Number(id))
    .eq("application_type", type)
    .order("createdAt", { ascending: true })

  if (error) {
    console.error("Supabase error (GET comments):", error.message)
    return res.status(500).json({ error: error.message })
  }

  res.json(data)
})

router.post("/:type/:id/comments", async (req, res) => {
  const { type, id } = req.params
  const { token } = req.cookies

  if (!isValidType(type)) return res.status(400).json({ error: "Invalid type" })
  if (!token) return res.status(400).json({ error: "Auth required" })

  const user = await getDiscordUser(token)
  if (!user) return res.status(401).json({ error: "Unauthorized" })

  const { text } = req.body
  if (!text) return res.status(400).json({ error: "Missing text" })

  const { data, error } = await supabase
    .from("application comments")
    .insert({
      application_id: Number(id),
      application_type: type,
      discord_id: user.id,
      discord_username: user.username,
      discord_avatar: user.avatar,
      text,
      createdAt: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error("Supabase error (POST comments):", error.message)
    return res.status(500).json({ error: error.message })
  }

  const { data: appData } = await supabase
    .from(`${type} applications`)
    .select("discord_id")
    .eq("id", id)
    .single()

  if (appData) {
    await sendDM(
      appData.discord_id,
      buildEmbed({
        title: "📝 Ny kommentar",
        description: text,
        color: 0x3498db,
      })
    )
  }

  res.json(data)
})

router.delete("/:type/:id/comments/:commentId", async (req, res) => {
  const { type, id, commentId } = req.params
  if (!isValidType(type)) return res.status(400).json({ error: "Invalid type" })

  const { error } = await supabase
    .from("application comments")
    .delete()
    .eq("id", Number(commentId))
    .eq("application_id", Number(id))
    .eq("application_type", type)

  if (error) {
    console.error("Supabase error (DELETE comment):", error.message)
    return res.status(500).json({ error: error.message })
  }

  res.status(204).send()
})


router.delete("/:type/:id", async (req, res) => {
  const { type, id } = req.params
  const { token } = req.cookies

  if (!isValidType(type)) return res.status(400).json({ error: "Invalid type" })
  if (!token) return res.status(400).json({ error: "Auth required" })

  const user = await getDiscordUser(token)
  if (!user) return res.status(401).json({ error: "Unauthorized" })

  const { data: existing, error: fetchError } = await supabase
    .from(`${type} applications`)
    .select("id, discord_id")
    .eq("id", id)
    .single()

  if (fetchError || !existing) {
    return res.status(404).json({ error: "Application not found" })
  }

  if (existing.discord_id !== user.id) {
    return res.status(403).json({ error: "You cannot delete this application" })
  }

  const { error } = await supabase
    .from(`${type} applications`)
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Supabase error (DELETE application):", error.message)
    return res.status(500).json({ error: error.message })
  }

  res.status(204).send()
})

module.exports = router