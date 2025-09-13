// routes/profile.js
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();   // ✅ initialize Prisma
const authenticateTenant = require("../middleware/authenticateTenant");

// GET /shopify/profile
router.get("/", authenticateTenant, async (req, res) => {
  try {
    const tenant = await prisma.tenants.findUnique({
      where: { id: req.tenant.id },
      select: {
        id: true,
        name: true,
        api_key: true,
        created_at: true,
      },
    });

    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

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
    const tenant = await prisma.tenants.update({
      where: { id: req.tenant.id },
      data: { api_key },
      select: { id: true, api_key: true },
    });

    res.json({ message: "API key updated", api_key: tenant.api_key });
  } catch (err) {
    console.error("❌ Error updating API key:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
