const express = require("express");
const router = express.Router();
const supabase = require("../utils/supabase");
const authenticateTenant = require("../middleware/authenticateTenant");

// Summary KPIs: total customers, orders, revenue
router.get("/summary", authenticateTenant, async (req, res) => {
  const tenantId = req.tenant.id;
  try {
    const { data: orders } = await supabase
      .from("orders")
      .select("total_price, processed_at")
      .eq("tenant_id", tenantId);

    const { data: customers } = await supabase
      .from("customers")
      .select("id")
      .eq("tenant_id", tenantId);

    const totalRevenue = orders.reduce((acc, o) => acc + Number(o.total_price), 0);
    const totalOrders = orders.length;
    const totalCustomers = customers.length;

    res.json({ totalRevenue, totalOrders, totalCustomers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// routes/reports.js
router.get("/orders-over-time", authenticateTenant, async (req, res) => {
  const tenantId = req.tenant.id;
  const { start, end } = req.query;

  try {
    let query = supabase
      .from("orders")
      .select("created_at,total_price")
      .eq("tenant_id", tenantId);

    if (start) query = query.gte("created_at", start);
    if (end) query = query.lte("created_at", end);

    const { data: orders, error } = await query;
    if (error) throw error;

    // group by date
    const grouped = {};
    orders.forEach(o => {
      const date = new Date(o.created_at).toISOString().slice(0, 10);
      if (!grouped[date]) {
        grouped[date] = { order_count: 0, total_revenue: 0 };
      }
      grouped[date].order_count += 1;
      grouped[date].total_revenue += Number(o.total_price);
    });

    const result = Object.entries(grouped).map(([date, vals]) => ({
      date,
      order_count: vals.order_count,
      total_revenue: vals.total_revenue
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// Top 5 customers by spend
router.get("/top-customers", authenticateTenant, async (req, res) => {
  const tenantId = req.tenant.id;
  try {
    // Fetch orders
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("customer_id,total_price")
      .eq("tenant_id", tenantId);

    if (ordersError) throw ordersError;

    // Fetch customers
    const { data: customers, error: customersError } = await supabase
      .from("customers")
      .select("id,first_name,last_name")
      .eq("tenant_id", tenantId);

    if (customersError) throw customersError;

    // Map customer_id -> total spend
    const spendMap = {};
    orders.forEach((o) => {
      if (!spendMap[o.customer_id]) spendMap[o.customer_id] = 0;
      spendMap[o.customer_id] += Number(o.total_price);
    });

    // Map customers for easy lookup
    const customerMap = {};
    customers.forEach((c) => {
      customerMap[c.id] = `${c.first_name} ${c.last_name}`;
    });

    // Get top 5 with names
    const top5 = Object.entries(spendMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([customer_id, total_spent]) => ({
        name: customerMap[customer_id] || "Unknown Customer",
        total_spent,
      }));

    res.json(top5);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/top-products", authenticateTenant, async (req, res) => {
  const tenantId = req.tenant.id;
  console.log("📡 Received request for top-products, tenantId:", tenantId);

  try {
    // 1️⃣ Fetch all order items for this tenant
    const { data: orderItems, error: orderItemsError } = await supabase
      .from("order_items")
      .select("product_id, quantity")
      .eq("tenant_id", tenantId);

    console.log("📦 orderItems fetched:", orderItems);
    if (orderItemsError) {
      console.error("❌ Error fetching order_items:", orderItemsError);
      throw orderItemsError;
    }

    // 2️⃣ Aggregate quantities per product
    const productMap = {};
    orderItems.forEach(item => {
      if (!productMap[item.product_id]) productMap[item.product_id] = 0;
      productMap[item.product_id] += item.quantity;
    });

    // 3️⃣ Sort and take top 5
    const top5 = Object.entries(productMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([product_id, qty]) => ({ product_id, qty }));

    console.log("🏆 Top 5 product IDs with qty:", top5);

    if (top5.length === 0) return res.json([]);

    // 4️⃣ Fetch product titles
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id,title")
      .in("id", top5.map(p => p.product_id));

    console.log("📦 Products fetched for top5:", products);
    if (productsError) {
      console.error("❌ Error fetching products:", productsError);
      throw productsError;
    }

    // 5️⃣ Merge quantities with titles
    const result = top5.map(p => {
      const product = products.find(prod => prod.id === Number(p.product_id));
      return { ...p, title: product?.title || "Unknown" };
    });

    console.log("✅ Result sent to frontend:", result);
    res.json(result);

  } catch (err) {
    console.error("❌ Error fetching top products:", err);
    res.status(500).json({ error: err.message, details: err });
  }
});



module.exports = router;
