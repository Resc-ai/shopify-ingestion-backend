require('dotenv').config();
const express = require('express');
const app = express();
const shopifyRoutes = require('./routes/shopify');
const reportsRouter = require("./routes/reports");
const supabase = require('./utils/supabase');
const profileRoutes = require("./routes/profile");
const cors = require("cors");
const webhooksRouter = require("./routes/webhooks");
const tenantRoutes = require("./routes/tenants");
const { fetchCustomers, fetchProducts, fetchOrders } = require("./services/shopifyService");
const { saveCustomers, saveProducts, saveOrders } = require("./services/supabaseService");
const cron = require("node-cron");

app.use(cors({
  origin: "*", // your frontend URL
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Webhooks need raw body, so mount with express.raw()
app.use('/webhooks', webhooksRouter); 

app.use(express.json());

app.use('/shopify', shopifyRoutes);
app.use("/shopify/reports", reportsRouter);
app.use("/shopify/profile", profileRoutes);
app.use("/tenants", tenantRoutes);
// Convert all BigInt to string automatically when JSON.stringify is called
BigInt.prototype.toJSON = function () {
  return this.toString();
};

//Scheduling to fetch and ingest every hour 
cron.schedule("0 * * * *", async () => { // ⏰ every hour
  console.log("🔄 Running scheduled sync...");

  // Fetch tenants
  const { data: tenants, error } = await supabase.from("tenants").select("*");
  if (error) {
    console.error("❌ Error fetching tenants:", error);
    return;
  }

  // Loop through tenants
  for (const tenant of tenants) {
    try {
      console.log(`⚡ Syncing for tenant ${tenant.id} (${tenant.name})`);

      const [customers, products, orders] = await Promise.all([
      fetchCustomers(tenant.shopify_store_url, tenant.shopify_access_token),
      fetchProducts(tenant.shopify_store_url, tenant.shopify_access_token),
      fetchOrders(tenant.shopify_store_url, tenant.shopify_access_token)
    ]);


      await saveCustomers(customers.customers, tenant.id);
      await saveProducts(products.products, tenant.id);
      await saveOrders(orders.orders, tenant.id);

      console.log(`✅ Finished sync for tenant ${tenant.id}`);
    } catch (err) {
      console.error(`❌ Error syncing for tenant ${tenant.id}:`, err);
    }
  }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
