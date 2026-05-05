const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

router.post("/validate", async (req, res) => {
    const { licenseKey, serverIp } = req.body;

    if (!licenseKey) {
        return res.status(400).json({ valid: false, message: "Ingen nøgle sendt" });
    }

    const { data, error } = await supabase
        .from("license_keys")
        .select("*")
        .eq("key", licenseKey)
        .single();

    if (error || !data) {
        return res.status(403).json({ valid: false, message: "Ukendt nøgle" });
    }

    if (!data.active) {
        return res.status(403).json({ valid: false, message: "Nøgle er deaktiveret" });
    }

    if (!data.server_ip) {
        await supabase
            .from("license_keys")
            .update({ server_ip: serverIp })
            .eq("key", licenseKey);

        return res.status(200).json({ valid: true });
    }

    // Tjek IP matcher
    if (data.server_ip !== serverIp) {
        return res.status(403).json({ valid: false, message: "Nøgle allerede i brug på anden server" });
    }

    return res.status(200).json({ valid: true });
});

module.exports = router;