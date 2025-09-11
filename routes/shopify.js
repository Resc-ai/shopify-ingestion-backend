const express = require('express');
const router = express.Router();
const authenticateTenant = require('../middleware/authenticateTenant');
const { fetchCustomers, fetchProducts, fetchOrders } = require('../services/shopifyService');
const { saveCustomers, saveProducts, saveOrders } = require('../services/supabaseService');
const supabase = require('../utils/supabase'); 

router.use(authenticateTenant);
// --------------------- CUSTOMERS ---------------------
router.get('/customers', authenticateTenant, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('tenant_id', req.tenant.id);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('❌ Error fetching customers:', err);
    res.status(500).send('Error fetching customers');
  }
});

// --------------------- PRODUCTS ---------------------
router.get('/products', authenticateTenant, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('tenant_id', req.tenant.id);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('❌ Error fetching products:', err);
    res.status(500).send('Error fetching products');
  }
});

// Get all orders for the tenant
router.get("/orders", authenticateTenant, async (req, res) => {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      order_items:order_items(*, product:products(*))
    `)
    .eq("tenant_id", req.tenant.id);

  if (error) return res.status(500).json(error);
  res.json(data);
});


router.post('/sync', async (req, res) => {
  try {
    const tenantId = req.tenant.id;

    const [customers, products, orders] = await Promise.all([
      fetchCustomers(),
      fetchProducts(),
      fetchOrders()
    ]);

    await saveCustomers(customers.customers, tenantId);
    await saveProducts(products.products, tenantId);
    await saveOrders(orders.orders, tenantId);

    res.send('✅ Data synced successfully');
  } catch (err) {
    console.error(err);
    res.status(500).send('❌ Error syncing Shopify data');
  }
});

module.exports = router;
