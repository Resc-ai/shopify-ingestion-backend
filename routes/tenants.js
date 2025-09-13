// routes/tenants.js
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const crypto = require("crypto");

// POST /tenants/onboard
router.post("/onboard", async (req, res) => {
  try {
    const { name, email, shopUrl, accessToken } = req.body;

    if (!name || !email || !shopUrl || !accessToken) {
      return res
        .status(400)
        .json({ error: "name, email, shopUrl, and accessToken are required" });
    }

    const apiKey = crypto.randomBytes(20).toString("hex");

    // ✅ Insert tenant into Postgres via Prisma
    const tenant = await prisma.tenants.create({
      data: {
        name,
        email,
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

module.exports = router;
