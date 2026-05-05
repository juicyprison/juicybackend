const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

router.get("/linked", async (req, res) => {
  const uuids = req.query.uuids?.split(",") ?? [];
  if (uuids.length === 0) return res.json([]);

  const { data, error } = await supabase
    .from("linked_accounts")
    .select("minecraft_uuid")
    .in("minecraft_uuid", uuids);

  if (error) return res.status(500).json({ error });
  res.json(data);
});

router.get("/linked/account/:uuid", async (req, res) => {
  const { uuid } = req.params;

  const { data, error } = await supabase
    .from("linked_accounts")
    .select("*")
    .eq("minecraft_uuid", uuid)
    .single();

  if (error || !data) return res.status(404).json({ error: "Ikke fundet" });
  res.json(data);
});

router.get("/linked/discord/:discord_id", async (req, res) => {
  const { discord_id } = req.params;

  const { data, error } = await supabase
    .from("linked_accounts")
    .select("*")
    .eq("discord_id", discord_id)
    .order("linked_at", { ascending: false });

  if (error) return res.status(500).json({ error });
  res.json(data ?? []);
});

module.exports = router;