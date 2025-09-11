// routes/profile.js
const express = require("express");
const router = express.Router();
const supabase = require("../utils/supabase");
const authenticateTenant = require("../middleware/authenticateTenant");

// GET /shopify/profile
router.get("/", authenticateTenant, async (req, res) => {
  try {
    const { data: tenant, error } = await supabase
      .from("tenants")
      .select("id, name, api_key, created_at")
      .eq("id", req.tenant.id)
      .single();

    if (error) throw error;
    res.json(tenant);
  } catch (err) {
    console.error("❌ Error fetching tenant profile:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /shopify/profile/api-key
router.post("/api-key", authenticateTenant, async (req, res) => {
  const { api_key } = req.body;
  if (!api_key) return res.status(400).json({ error: "API key required" });

  try {
    const { data, error } = await supabase
      .from("tenants")
      .update({ api_key })
      .eq("id", req.tenant.id)
      .select("id, api_key");

    if (error) throw error;
    res.json({ message: "API key updated", api_key: data[0].api_key });
  } catch (err) {
    console.error("❌ Error updating API key:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
