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
// Order webhook
router.post(
  '/shopify/orders_create',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    console.log('🚀 /orders_create webhook hit');

    try {
      console.log('Headers:', req.headers);

      if (!verifyShopifyWebhook(req)) {
        console.warn('❌ Invalid HMAC for orders_create');
        return res.status(401).send('Invalid HMAC');
      }
      console.log('✅ HMAC verified');

      const order = JSON.parse(req.body.toString('utf8'));
      console.log('Payload:', order);

      const shop = req.headers['x-shopify-shop-domain'];
      const tenant = await prisma.tenants.findFirst({ where: { shopify_store_url: shop } });

      if (!tenant) {
        console.warn(`❌ Tenant not found for shop ${shop}`);
        return res.status(404).send('Tenant not found');
      }
      console.log('Tenant found:', tenant.id);

      await saveOrders([order], tenant.id); // Prisma service
      console.log('✅ Order saved');

      res.status(200).send('OK');
    } catch (err) {
      console.error('Webhook error (orders_create):', err);
      res.status(500).send('err');
    }
  }
);
// Customer webhook
router.post(
  '/shopify/customers_create',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    console.log('🚀 /customers_create webhook hit');

    try {
      console.log('Headers:', req.headers);

      if (!verifyShopifyWebhook(req)) {
        console.warn('❌ Invalid HMAC for customers_create');
        return res.status(401).send('Invalid HMAC');
      }
      console.log('✅ HMAC verified');

      const customer = JSON.parse(req.body.toString('utf8'));
      console.log('Payload:', customer);

      const shop = req.headers['x-shopify-shop-domain'];
      const tenant = await prisma.tenants.findFirst({ where: { shopify_store_url: shop } });

      if (!tenant) {
        console.warn(`❌ Tenant not found for shop ${shop}`);
        return res.status(404).send('Tenant not found');
      }
      console.log('Tenant found:', tenant.id);

      await saveCustomers([customer], tenant.id); // Prisma service
      console.log('✅ Customer saved');

      res.status(200).send('OK');
    } catch (err) {
      console.error('Webhook error (customers_create):', err);
      res.status(500).send('err');
    }
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
    const tenant = await prisma.tenants.findFirst({ where: { shopify_store_url: shop } });
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
      console.log('✅ Webhook hit: /shopify/checkouts_create');
      console.log('👉 Headers:', req.headers);
      console.log('👉 Raw body:', req.body?.toString('utf8'));

      if (!verifyShopifyWebhook(req)) {
        console.warn('❌ Invalid HMAC signature');
        return res.status(401).send('Invalid HMAC');
      }
      console.log('✅ HMAC verified');

      const checkout = JSON.parse(req.body.toString('utf8'));
      console.log('✅ Parsed checkout payload:', checkout);

      const shop = req.headers['x-shopify-shop-domain'];
      console.log('👉 Shopify shop domain:', shop);

      const tenant = await prisma.tenants.findFirst({
        where: { shopify_store_url: shop },
      });

      if (!tenant) {
        console.warn(`❌ No tenant found for shop: ${shop}`);
        return res.status(404).send('Tenant not found');
      }
      console.log('✅ Tenant found:', tenant.id);

      // Save checkout data
      await prisma.checkouts.create({
        data: {
          tenant_id: tenant.id,
          checkout_id: checkout.id,
          email: checkout.email,
          total_price: checkout.total_price,
          created_at: new Date(checkout.created_at),
          items: checkout.line_items, // stored as JSON
        },
      });

      console.log(`✅ Checkout ${checkout.id} saved for tenant ${tenant.id}`);
      res.status(200).send('OK');
    } catch (err) {
      console.error('❌ Checkout webhook error:', err);
      res.status(500).send('err');
    }
  }
);


module.exports = router;
