const { Client, GatewayIntentBits } = require("discord.js");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

const GUILD_ID = "1243589598630907914";

const ROLLER = {
  verificeret: "1411086768316612650",
  vagt:        "1243589598655942843",
  officer:     "1243589598655942844",
  inspektør:   "1243589598655942846",
  direktør:    "1243589598706139218",
};

const RANG_TIL_ROLLE = {
  "vagt":       ROLLER.vagt,
  "officer":    ROLLER.officer,
  "inspektør":  ROLLER.inspektør,
  "inspektor":  ROLLER.inspektør,
  "direktør":   ROLLER.direktør,
  "direktor":   ROLLER.direktør,
};

client.once("ready", () => {
  console.log(`[Discord Bot] Logget ind som ${client.user.tag}`);
});


async function givRoller(discordId, ingameRang) {
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const member = await guild.members.fetch(discordId).catch(() => null);
    if (!member) return { success: false, reason: "Ikke fundet på Discord serveren" };

    const rollerAtGive = [ROLLER.verificeret];

    if (ingameRang) {
      const rangLower = ingameRang.toLowerCase();
      const roleId = RANG_TIL_ROLLE[rangLower];
      if (roleId) rollerAtGive.push(roleId);
    }

    await member.roles.add(rollerAtGive);
    console.log(`[Discord Bot] Gav roller til ${discordId}: ${rollerAtGive.join(", ")}`);
    return { success: true };
  } catch (err) {
    console.error("[Discord Bot] Fejl ved givRoller:", err);
    return { success: false, reason: err.message };
  }
}


async function synkroniserRoller(discordId) {
  try {
    const { data: account } = await supabase
      .from("linked_accounts")
      .select("minecraft_uuid, minecraft_name")
      .eq("discord_id", discordId)
      .order("linked_at", { ascending: true })
      .limit(1)
      .single();

    if (!account) return { success: false, reason: "Ingen linket konto fundet" };

    const { data: vagtData } = await supabase
      .from("vagt")
      .select("rank")
      .eq("uuid", account.minecraft_uuid)
      .single();

    const ingameRang = vagtData?.rank ?? null;
    return await givRoller(discordId, ingameRang);
  } catch (err) {
    console.error("[Discord Bot] Fejl ved synkroniserRoller:", err);
    return { success: false, reason: err.message };
  }
}

client.login(process.env.DISCORD_BOT_TOKEN);

module.exports = { client, givRoller, synkroniserRoller };