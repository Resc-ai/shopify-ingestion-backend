// routes/webhooks.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { saveCustomers, saveProducts, saveOrders } = require('../services/prismaService'); // update to Prisma-based service

// Verify Shopify Webhook
function verifyShopifyWebhook(req) {
  const hmacHeader = req.headers['x-shopify-hmac-sha256'];
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  const digest = crypto.createHmac('sha256', secret)
                       .update(req.body) // req.body is raw Buffer when using express.raw
                       .digest('base64');
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader || ''));
}

// Use express.raw for Shopify webhook routes
router.post(
  '/shopify/orders_create',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      if (!verifyShopifyWebhook(req)) return res.status(401).send('Invalid HMAC');

      const order = JSON.parse(req.body.toString('utf8'));
      const shop = req.headers['x-shopify-shop-domain'];

      const tenant = await prisma.tenants.findUnique({
        where: { shopify_store_url: shop },
      });

      if (!tenant) return res.status(404).send('Tenant not found');

      // Save order using Prisma-based service
      await saveOrders([order], tenant.id);

      res.status(200).send('OK');
    } catch (err) {
      console.error('Webhook error', err);
      res.status(500).send('err');
    }
  }
);
// Customer webhook
router.post(
  '/shopify/customers_create',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    if (!verifyShopifyWebhook(req)) return res.status(401).send('Invalid HMAC');
    const customer = JSON.parse(req.body.toString('utf8'));
    const shop = req.headers['x-shopify-shop-domain'];
    const tenant = await prisma.tenants.findUnique({ where: { shopify_store_url: shop } });
    if (!tenant) return res.status(404).send('Tenant not found');
    await saveCustomers([customer], tenant.id); // Prisma service
    res.status(200).send('OK');
  }
);

// Product webhook
router.post(
  '/shopify/products_create',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    if (!verifyShopifyWebhook(req)) return res.status(401).send('Invalid HMAC');
    const product = JSON.parse(req.body.toString('utf8'));
    const shop = req.headers['x-shopify-shop-domain'];
    const tenant = await prisma.tenants.findUnique({ where: { shopify_store_url: shop } });
    if (!tenant) return res.status(404).send('Tenant not found');
    await saveProducts([product], tenant.id); // Prisma service
    res.status(200).send('OK');
  }
);


router.post(
  '/shopify/checkouts_create',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      if (!verifyShopifyWebhook(req)) return res.status(401).send('Invalid HMAC');

      const checkout = JSON.parse(req.body.toString('utf8'));
      const shop = req.headers['x-shopify-shop-domain'];

      const tenant = await prisma.tenants.findUnique({
        where: { shopify_store_url: shop },
      });

      if (!tenant) return res.status(404).send('Tenant not found');

      // Save checkout data in Prisma (ensure you have a checkouts model in schema)
      await prisma.checkouts.create({
        data: {
          tenant_id: tenant.id,
          checkout_id: checkout.id,
          email: checkout.email,
          total_price: checkout.total_price,
          created_at: new Date(checkout.created_at),
          items: checkout.line_items, // store JSON directly
        },
      });

      res.status(200).send('OK');
    } catch (err) {
      console.error('Checkout webhook error', err);
      res.status(500).send('err');
    }
  }
);

module.exports = router;
