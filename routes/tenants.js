// routes/tenants.js
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const crypto = require("crypto");

const bcrypt = require("bcrypt");

router.post("/onboard", async (req, res) => {
  try {
    const { name, email, shopUrl, accessToken, password } = req.body;
    if (!name || !email || !shopUrl || !accessToken || !password) {
      return res.status(400).json({ error: "All fields required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const apiKey = crypto.randomBytes(20).toString("hex");

    const tenant = await prisma.tenants.create({
      data: {
        name,
        email,
        password: hashedPassword,
        shopify_store_url: shopUrl,
        shopify_access_token: accessToken,
        api_key: apiKey,
      },
      select: {
        id: true,
        name: true,
        email: true,
        created_at: true,
      },
    });

    res.json({
      tenant,
      api_key: apiKey,
    });
  } catch (err) {
    console.error("❌ Onboard error", err);
    res.status(500).json({ error: err.message || err });
  }
});
// POST /login
router.post("/login", async (req, res) => {
  try {
    const { apiKey, email, password } = req.body;

    if (apiKey) {
      // Login via API Key
      const tenant = await prisma.tenants.findFirst({ where: { api_key: apiKey } });
      if (!tenant) return res.status(401).json({ error: "Invalid API key" });
      return res.json({ tenant });
    }

    if (email && password) {
      // Login via Email+Password
      const tenant = await prisma.tenants.findFirst({ where: { email } });
      if (!tenant) return res.status(401).json({ error: "Invalid email or password" });

      const valid = await bcrypt.compare(password, tenant.password);
      if (!valid) return res.status(401).json({ error: "Invalid email or password" });

      return res.json({ tenant });
    }

    res.status(400).json({ error: "Provide apiKey or email+password" });
  } catch (err) {
    console.error("❌ Login error", err);
    res.status(500).json({ error: err.message || err });
  }
});

module.exports = router;
