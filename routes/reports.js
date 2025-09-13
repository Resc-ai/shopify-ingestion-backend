const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const linearForecast = require("../utils/forcast");
const authenticateTenant = require("../middleware/authenticateTenant");
const regression = require("regression");

// ------------------- Helpers -------------------
const sum = arr => arr.reduce((a, b) => a + b, 0);

const groupByDate = (data, dateField, valueField) => {
  const grouped = {};
  data.forEach(item => {
    const date = new Date(item[dateField]).toISOString().slice(0, 10);
    grouped[date] = (grouped[date] || 0) + Number(item[valueField] || 0);
  });
  return grouped;
};

// ------------------- Endpoints -------------------

// 1️⃣ Summary KPIs with insights
router.get("/summary", authenticateTenant, async (req, res) => {
  const tenantId = req.tenant.id;

  try {
    const [orders, customers] = await Promise.all([
      prisma.orders.findMany({
        where: { tenant_id: tenantId },
        select: { id: true, total_price: true, customer_id: true, processed_at: true },
      }),
      prisma.customers.findMany({
        where: { tenant_id: tenantId },
        select: { id: true, created_at: true },
      }),
    ]);

    const totalRevenue = sum(orders.map(o => Number(o.total_price)));
    const totalOrders = orders.length;
    const totalCustomers = customers.length;

    // Returning vs new customers
    const orderCounts = {};
    orders.forEach(o => (orderCounts[o.customer_id] = (orderCounts[o.customer_id] || 0) + 1));
    const returningCustomers = Object.values(orderCounts).filter(c => c > 1).length;
    const returningRate = totalCustomers ? ((returningCustomers / totalCustomers) * 100).toFixed(1) : 0;

    // High-value customers (top 20%)
    const spendMap = {};
    orders.forEach(o => (spendMap[o.customer_id] = (spendMap[o.customer_id] || 0) + Number(o.total_price)));
    const highValueCount = Math.floor(Object.values(spendMap).sort((a, b) => b - a).length * 0.2);

    // Churn risk (no order in last 30 days)
    const now = new Date();
    const churnRisk = customers.filter(c => {
      const custOrders = orders.filter(o => o.customer_id === c.id);
      if (!custOrders.length) return false;
      const lastOrder = new Date(Math.max(...custOrders.map(o => new Date(o.processed_at))));
      return (now - lastOrder) / (1000 * 60 * 60 * 24) > 30;
    }).length;

    // Projected ARR
    const revenueByMonth = {};
    orders.forEach(o => {
      const month = new Date(o.processed_at).toISOString().slice(0, 7);
      revenueByMonth[month] = (revenueByMonth[month] || 0) + Number(o.total_price);
    });
    const avgMonthly = Object.values(revenueByMonth).reduce((a, b) => a + b, 0) / Object.keys(revenueByMonth).length || 0;
    const projectedARR = Math.round(avgMonthly * 12);

    res.json({ totalRevenue, totalOrders, totalCustomers, returningRate, highValueCount, churnRisk, projectedARR });
  } catch (err) {
    console.error("❌ Error in /summary:", err);
    res.status(500).json({ error: err.message });
  }
});

// 2️⃣ Revenue forecast using regression
router.get("/revenue-forecast", authenticateTenant, async (req, res) => {
  try {
    const tenantId = req.tenant.id;
    const orders = await prisma.orders.findMany({
      where: { tenant_id: tenantId },
      select: { processed_at: true, total_price: true },
    });

    const grouped = {};
    orders.forEach(row => {
      const d = row.processed_at.toISOString().split("T")[0];
      grouped[d] = (grouped[d] || 0) + parseFloat(row.total_price || 0);
    });

    const sortedDates = Object.keys(grouped).sort();
    const series = sortedDates.map((date, i) => [i, grouped[date]]);
    const result = regression.linear(series);

    const forecast = [];
    for (let i = 0; i < series.length + 7; i++) {
      const [x, y] = result.predict(i);
      forecast.push({ date: i < sortedDates.length ? sortedDates[i] : `Day ${i - series.length + 1}`, revenue: y });
    }

    res.json({ actual: series, forecast });
  } catch (err) {
    console.error("Forecast error:", err);
    res.status(500).send("Error generating forecast");
  }
});

// 3️⃣ Orders over time
router.get("/orders-over-time", authenticateTenant, async (req, res) => {
  const tenantId = req.tenant.id;
  const { start, end } = req.query;

  try {
    const where = { tenant_id: tenantId };
    if (start || end) where.processed_at = {};
    if (start) where.processed_at.gte = new Date(start);
    if (end) where.processed_at.lte = new Date(end);

    const orders = await prisma.orders.findMany({
      where,
      select: { processed_at: true, total_price: true },
    });

    const grouped = {};
    orders.forEach(o => {
      const date = new Date(o.processed_at).toISOString().slice(0, 10);
      if (!grouped[date]) grouped[date] = { order_count: 0, total_revenue: 0 };
      grouped[date].order_count += 1;
      grouped[date].total_revenue += Number(o.total_price);
    });

    const result = Object.entries(grouped).map(([date, vals]) => ({ date, ...vals }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4️⃣ Top customers
router.get("/top-customers", authenticateTenant, async (req, res) => {
  const tenantId = req.tenant.id;
  try {
    const orders = await prisma.orders.findMany({
      where: { tenant_id: tenantId },
      select: { customer_id: true, total_price: true },
    });
    const customers = await prisma.customers.findMany({
      where: { tenant_id: tenantId },
      select: { id: true, first_name: true, last_name: true },
    });

    const spendMap = {};
    orders.forEach(o => (spendMap[o.customer_id] = (spendMap[o.customer_id] || 0) + Number(o.total_price)));

    const customerMap = {};
    customers.forEach(c => (customerMap[c.id] = `${c.first_name} ${c.last_name}`));

    const top5 = Object.entries(spendMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([customer_id, total_spent]) => ({ name: customerMap[customer_id] || "Unknown Customer", total_spent }));

    res.json(top5);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5️⃣ Top products
router.get("/top-products", authenticateTenant, async (req, res) => {
  const tenantId = req.tenant.id;

  try {
    const orderItems = await prisma.order_items.findMany({
      where: { tenant_id: tenantId },
      select: { product_id: true, quantity: true },
    });

    const productMap = {};
    orderItems.forEach(item => (productMap[item.product_id] = (productMap[item.product_id] || 0) + item.quantity));

    const top5 = Object.entries(productMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([product_id, qty]) => ({ product_id, qty }));

    if (!top5.length) return res.json([]);

    const products = await prisma.products.findMany({
      where: { id: { in: top5.map(p => Number(p.product_id)) } },
      select: { id: true, title: true },
    });

    const result = top5.map(p => {
      const prod = products.find(pr => pr.id === Number(p.product_id));
      return { ...p, title: prod?.title || "Unknown" };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
