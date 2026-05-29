const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");
const { givRoller, synkroniserRoller } = require("../discordBot");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

let players = [];
let chat = [];
let logs = [];


router.post("/players", (req, res) => {
  players = req.body;
  res.sendStatus(200);
});

router.get("/players", (req, res) => {
  res.json(players);
});


router.post("/players/staff", async (req, res) => {
  const incoming = req.body;
  const incomingUuids = incoming.map((p) => p.uuid);

  if (incomingUuids.length > 0) {
    const { error: deleteError } = await supabase
      .from("staff")
      .delete()
      .not("uuid", "in", `(${incomingUuids.map((u) => `"${u}"`).join(",")})`);
    if (deleteError) console.log("Slet fejl:", JSON.stringify(deleteError));
  } else {
    await supabase.from("staff").delete().neq("uuid", "");
  }

  for (const p of incoming) {
    const { error } = await supabase.from("staff").upsert({
      uuid: p.uuid,
      name: p.name,
      rank: p.rank,
      updated_at: new Date().toISOString(),
    });
    if (error) console.log("Supabase fejl:", JSON.stringify(error));
  }

  res.sendStatus(200);
});

router.get("/players/staff", async (req, res) => {
  const { data, error } = await supabase.from("staff").select("*");
  if (error) return res.status(500).json({ error });
  res.json(data);
});


router.post("/players/vagt", async (req, res) => {
  const incoming = req.body;
  const incomingUuids = incoming.map((p) => p.uuid);

  if (incomingUuids.length > 0) {
    const { error: deleteError } = await supabase
      .from("vagt")
      .delete()
      .not("uuid", "in", `(${incomingUuids.map((u) => `"${u}"`).join(",")})`);
    if (deleteError) console.log("Slet fejl:", JSON.stringify(deleteError));
  } else {
    await supabase.from("vagt").delete().neq("uuid", "");
  }

  for (const p of incoming) {
    const { error } = await supabase.from("vagt").upsert({
      uuid: p.uuid,
      name: p.name,
      rank: p.rank,
      updated_at: new Date().toISOString(),
    });
    if (error) console.log("Supabase fejl:", JSON.stringify(error));
  }

  res.sendStatus(200);
});

router.get("/players/vagt", async (req, res) => {
  const { data, error } = await supabase.from("vagt").select("*");
  if (error) return res.status(500).json({ error });
  res.json(data);
});


router.post("/players/donator", async (req, res) => {
  const incoming = req.body;
  const incomingUuids = incoming.map((p) => p.uuid);

  if (incomingUuids.length > 0) {
    const { error: deleteError } = await supabase
      .from("donator")
      .delete()
      .not("uuid", "in", `(${incomingUuids.map((u) => `"${u}"`).join(",")})`);
    if (deleteError) console.log("Slet fejl:", JSON.stringify(deleteError));
  } else {
    await supabase.from("donator").delete().neq("uuid", "");
  }

  for (const p of incoming) {
    const { error } = await supabase.from("donator").upsert({
      uuid: p.uuid,
      name: p.name,
      rank: p.rank,
      updated_at: new Date().toISOString(),
    });
    if (error) console.log("Supabase fejl:", JSON.stringify(error));
  }

  res.sendStatus(200);
});

router.get("/players/donator", async (req, res) => {
  const { data, error } = await supabase.from("donator").select("*");
  if (error) return res.status(500).json({ error });
  res.json(data);
});


router.post("/players/stats", async (req, res) => {
  const incoming = req.body;
  if (!Array.isArray(incoming)) return res.status(400).json({ message: "Expected array" });

  for (const p of incoming) {
    if (!p.uuid) continue;
    const { error } = await supabase.from("player_stats").upsert(
      {
        uuid:              p.uuid,
        name:              p.name,
        online:            p.online ?? false,
        first_join:        p.firstJoin ? new Date(p.firstJoin).toISOString() : null,
        last_seen:         p.lastSeen  ? new Date(p.lastSeen).toISOString()  : null,
        total_online_time: p.totalOnlineTime ?? 0,
        kills_vagt:        p.kills?.vagt      ?? 0,
        kills_officer:     p.kills?.officer   ?? 0,
        kills_inspektor:   p.kills?.inspektor ?? 0,
        kills_direktor:    p.kills?.direktor  ?? 0,
        kills_default:     p.kills?.default   ?? 0,
        updated_at:        new Date().toISOString(),
      },
      { onConflict: "uuid" }
    );
    if (error) console.error("[PlayerStats] Upsert fejl for", p.uuid, JSON.stringify(error));
  }

  res.sendStatus(200);
});

router.get("/players/stats/:uuid", async (req, res) => {
  const { uuid } = req.params;
  const { data, error } = await supabase
    .from("player_stats")
    .select("*")
    .eq("uuid", uuid)
    .single();

  if (error || !data) return res.status(404).json({ error: "Ikke fundet" });
  res.json(data);
});


router.post("/chat", (req, res) => {
  chat.push(req.body);
  res.sendStatus(200);
});

router.get("/chat", (req, res) => {
  res.json(chat);
});


router.post("/logs", (req, res) => {
  logs.push(req.body);
  res.sendStatus(200);
});

router.get("/logs", (req, res) => {
  res.json(logs);
});


let lastCommand = null;

router.post("/command", (req, res) => {
  lastCommand = req.body.cmd;
  res.sendStatus(200);
});

router.get("/command", (req, res) => {
  const cmd = lastCommand;
  lastCommand = null;
  res.json({ cmd });
});


const linkCodes = new Map();
const linkTokens = new Map();

const CODE_EXPIRY_MS = 5 * 60 * 1000;
const TOKEN_EXPIRY_MS = 10 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of linkCodes.entries()) if (v.expiresAt < now) linkCodes.delete(k);
  for (const [k, v] of linkTokens.entries()) if (v.expiresAt < now) linkTokens.delete(k);
}, 60_000);

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  } while (linkCodes.has(code));
  return code;
}

router.post("/generate-code", (req, res) => {
  const { minecraftUuid, minecraftName, ingameRang } = req.body;
  if (!minecraftUuid || !minecraftName) {
    return res.status(400).json({ message: "Mangler uuid eller name." });
  }

  for (const [code, data] of linkCodes.entries()) {
    if (data.minecraftUuid === minecraftUuid) linkCodes.delete(code);
  }

  const code = generateCode();
  const token = crypto.randomBytes(32).toString("hex");

  // Gem ingameRang med i koden så vi kan bruge den ved link
  linkCodes.set(code, { minecraftUuid, minecraftName, ingameRang: ingameRang ?? null, expiresAt: Date.now() + CODE_EXPIRY_MS, token });
  linkTokens.set(token, { minecraftUuid, minecraftName, ingameRang: ingameRang ?? null, expiresAt: Date.now() + TOKEN_EXPIRY_MS });

  console.log(`[Link] Kode ${code} genereret for ${minecraftName} (rang: ${ingameRang ?? "ingen"})`);
  res.json({ code, token });
});

router.post("/link", async (req, res) => {
  const { code, discordId } = req.body;
  if (!code || !discordId) {
    return res.status(400).json({ message: "Mangler kode eller Discord ID." });
  }

  const entry = linkCodes.get(code.toUpperCase());
  if (!entry) {
    return res.status(404).json({ message: "Ugyldig eller udløbet kode. Brug /link igen i Minecraft." });
  }
  if (entry.expiresAt < Date.now()) {
    linkCodes.delete(code.toUpperCase());
    return res.status(410).json({ message: "Koden er udløbet. Brug /link igen i Minecraft." });
  }

  const { data: existingMC } = await supabase
    .from("linked_accounts")
    .select("discord_id")
    .eq("minecraft_uuid", entry.minecraftUuid)
    .single();

  if (existingMC) {
    return res.status(409).json({ message: "Denne Minecraft konto er allerede linket til en Discord bruger." });
  }

  try {
    const { error } = await supabase
      .from("linked_accounts")
      .insert({
        discord_id: discordId,
        minecraft_uuid: entry.minecraftUuid,
        minecraft_name: entry.minecraftName,
        linked_at: new Date().toISOString(),
      });
    if (error) throw error;

    linkCodes.delete(code.toUpperCase());
    console.log(`[Link] Discord ${discordId} <-> Minecraft ${entry.minecraftName}`);

    // Giv Discord roller automatisk
    givRoller(discordId, entry.ingameRang).then(result => {
      if (!result.success) console.warn(`[Link] Kunne ikke give roller til ${discordId}: ${result.reason}`);
    });

    res.json({ success: true, minecraftName: entry.minecraftName, minecraftUuid: entry.minecraftUuid });
  } catch (err) {
    console.error("[Link] DB fejl:", err);
    res.status(500).json({ message: "Database fejl." });
  }
});

router.post("/link/auto", async (req, res) => {
  const { token, discordId } = req.body;
  if (!token || !discordId) {
    return res.status(400).json({ message: "Mangler token eller Discord ID." });
  }

  const entry = linkTokens.get(token);
  if (!entry) {
    return res.status(404).json({ message: "Ugyldigt eller udløbet link. Brug /link igen i Minecraft." });
  }
  if (entry.expiresAt < Date.now()) {
    linkTokens.delete(token);
    return res.status(410).json({ message: "Linket er udløbet. Brug /link igen i Minecraft." });
  }

  const { data: existingMC } = await supabase
    .from("linked_accounts")
    .select("discord_id")
    .eq("minecraft_uuid", entry.minecraftUuid)
    .single();

  if (existingMC) {
    return res.status(409).json({ message: "Denne Minecraft konto er allerede linket til en Discord bruger." });
  }

  try {
    const { error } = await supabase
      .from("linked_accounts")
      .insert({
        discord_id: discordId,
        minecraft_uuid: entry.minecraftUuid,
        minecraft_name: entry.minecraftName,
        linked_at: new Date().toISOString(),
      });
    if (error) throw error;

    linkTokens.delete(token);
    for (const [code, data] of linkCodes.entries()) {
      if (data.minecraftUuid === entry.minecraftUuid) linkCodes.delete(code);
    }

    console.log(`[Auto-link] Discord ${discordId} <-> Minecraft ${entry.minecraftName}`);

    // Giv Discord roller automatisk
    givRoller(discordId, entry.ingameRang).then(result => {
      if (!result.success) console.warn(`[Auto-link] Kunne ikke give roller til ${discordId}: ${result.reason}`);
    });

    res.json({ success: true, minecraftName: entry.minecraftName, minecraftUuid: entry.minecraftUuid });
  } catch (err) {
    console.error("[Auto-link] DB fejl:", err);
    res.status(500).json({ message: "Database fejl." });
  }
});

// Endpoint kaldt af /opdater ingame kommando
router.post("/opdater/:minecraftUuid", async (req, res) => {
  const { minecraftUuid } = req.params;

  // Find discord ID fra linked_accounts
  const { data: account } = await supabase
    .from("linked_accounts")
    .select("discord_id")
    .eq("minecraft_uuid", minecraftUuid)
    .single();

  if (!account) {
    return res.status(404).json({ success: false, reason: "Ingen linket Discord konto fundet" });
  }

  const result = await synkroniserRoller(account.discord_id);
  res.json(result);
});


router.get("/serverstats", async (req, res) => {
  const { data, error } = await supabase
    .from("server_stats")
    .select("stat_key, value, updated_at");

  if (error) return res.status(500).json({ error });

  const result = {};
  for (const row of data) {
    result[row.stat_key] = row.value;
    result[row.stat_key + "_updated"] = row.updated_at;
  }

  res.json(result);
});

router.post("/serverstats", async (req, res) => {
  const { daily_joins, total_joins } = req.body;

  if (daily_joins === undefined || total_joins === undefined) {
    return res.status(400).json({ error: "Mangler daily_joins eller total_joins" });
  }

  const now = new Date().toISOString();

  const { error: e1 } = await supabase
    .from("server_stats")
    .upsert({ stat_key: "daily_joins", value: daily_joins, updated_at: now }, { onConflict: "stat_key" });

  const { error: e2 } = await supabase
    .from("server_stats")
    .upsert({ stat_key: "total_joins", value: total_joins, updated_at: now }, { onConflict: "stat_key" });

  if (e1 || e2) {
    console.error("[ServerStats] Supabase fejl:", e1 || e2);
    return res.status(500).json({ error: "Kunne ikke gemme stats" });
  }

  res.status(204).send();
});


router.post("/players/streak", async (req, res) => {
  const incoming = req.body;
  if (!Array.isArray(incoming)) return res.status(400).json({ message: "Expected array" });

  for (const p of incoming) {
    if (!p.uuid) continue;

    const iso = new Date().toISOString().slice(0, 10);

    const { data: existing } = await supabase
      .from("login_streak")
      .select("claimed_dates, online_by_date, total_claims")
      .eq("uuid", p.uuid)
      .single();

    const claimedDates = existing?.claimed_dates ?? [];
    const onlineByDate = existing?.online_by_date ?? {};
    const totalClaims = existing?.total_claims ?? 0;

    const newClaimed = claimedDates.includes(iso)
      ? claimedDates
      : [...claimedDates, iso].slice(-180);

    const prevMs = onlineByDate[iso] ?? 0;
    onlineByDate[iso] = prevMs + (p.sessionOnlineMs ?? 0);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 180);
    for (const key of Object.keys(onlineByDate)) {
      if (new Date(key) < cutoff) delete onlineByDate[key];
    }

    const { error } = await supabase.from("login_streak").upsert({
      uuid: p.uuid,
      name: p.name,
      streak: p.streak ?? 0,
      last_claim: p.lastClaim ?? null,
      total_claims: p.streak > totalClaims ? p.streak : totalClaims,
      claimed_dates: newClaimed,
      online_by_date: onlineByDate,
      updated_at: new Date().toISOString(),
    }, { onConflict: "uuid" });

    if (error) console.error("[LoginStreak] Upsert fejl for", p.uuid, JSON.stringify(error));
  }

  res.sendStatus(200);
});

router.get("/players/streak/:uuid", async (req, res) => {
  const { uuid } = req.params;
  const { data, error } = await supabase
    .from("login_streak")
    .select("*")
    .eq("uuid", uuid)
    .single();

  if (error || !data) return res.status(404).json({ error: "Ikke fundet" });

  res.json({
    streak: data.streak,
    lastClaim: data.last_claim,
    totalClaims: data.total_claims,
    totalOnlineTime: Object.values(data.online_by_date ?? {}).reduce((a, b) => a + b, 0),
    claimedDates: data.claimed_dates ?? [],
    onlineByDate: data.online_by_date ?? {},
  });
});

module.exports = router;