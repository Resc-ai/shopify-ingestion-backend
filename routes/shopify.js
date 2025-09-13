// routes/shopify.js
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const authenticateTenant = require("../middleware/authenticateTenant");
const {
  fetchCustomers,
  fetchProducts,
  fetchOrders,
} = require("../services/shopifyService");
const {
  saveCustomers,
  saveProducts,
  saveOrders,
} = require("../services/prismaService"); // renamed service layer

router.use(authenticateTenant);

// --------------------- CUSTOMERS ---------------------
router.get("/customers", async (req, res) => {
  try {
    const customers = await prisma.customers.findMany({
      where: { tenant_id: req.tenant.id },
    });
    res.json(customers);
  } catch (err) {
    console.error("❌ Error fetching customers:", err);
    res.status(500).send("Error fetching customers");
  }
});

// --------------------- PRODUCTS ---------------------
router.get("/products", async (req, res) => {
  try {
    const products = await prisma.products.findMany({
      where: { tenant_id: req.tenant.id },
    });
    res.json(products);
  } catch (err) {
    console.error("❌ Error fetching products:", err);
    res.status(500).send("Error fetching products");
  }
});

// --------------------- ORDERS ---------------------
router.get("/orders", async (req, res) => {
  try {
    const orders = await prisma.orders.findMany({
      include: {
        order_items: {
          include: {
            product: {  // assuming order_items has a relation 'product'
              select: { title: true }
            }
          }
        }
      }
    });
    res.json(orders);
  } catch (err) {
    console.error("❌ Error fetching orders:", err);
    res.status(500).send("Error fetching orders");
  }
});

// --------------------- SYNC ---------------------
router.post("/sync", async (req, res) => {
  try {
    const tenantId = req.tenant.id;

    // Fetch tenant details
    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    // Pass tenant-specific credentials
    const [customers, products, orders] = await Promise.all([
      fetchCustomers(tenant.shopify_store_url, tenant.shopify_access_token),
      fetchProducts(tenant.shopify_store_url, tenant.shopify_access_token),
      fetchOrders(tenant.shopify_store_url, tenant.shopify_access_token),
    ]);

    // Save data with Prisma
    await saveCustomers(customers.customers, tenantId);
    await saveProducts(products.products, tenantId);
    await saveOrders(orders.orders, tenantId);

    res.send("✅ Data synced successfully");
  } catch (err) {
    console.error("❌ Error syncing Shopify data:", err);
    res.status(500).send("Error syncing Shopify data");
  }
});

module.exports = router;
