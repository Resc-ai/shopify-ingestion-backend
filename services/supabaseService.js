const supabase = require('../utils/supabase');

async function saveCustomers(customers, tenantId) {
  const rows = customers.map(c => ({
    id: c.id,
    tenant_id: tenantId,
    first_name: c.first_name,
    last_name: c.last_name,
    email: c.email,
    phone: c.phone,
    // Shopify gives tags as a string, not array
    tags: c.tags || null,
    created_at: c.created_at,
    updated_at: c.updated_at
  }));

  return supabase.from('customers').upsert(rows);
}

async function saveProducts(products, tenantId) {
  const rows = products.map(p => ({
    id: p.id,
    tenant_id: tenantId,
    title: p.title,
    vendor: p.vendor,
    product_type: p.product_type,
    status: p.status,
    price: p.variants?.[0]?.price || null,
    created_at: p.created_at,
    updated_at: p.updated_at
  }));
  return supabase.from('products').upsert(rows);
}

async function saveOrders(orders, tenantId) {
  const orderRows = [];
  const orderItemRows = [];

  console.log(`⚡ Processing ${orders.length} orders for tenant ${tenantId}`);

  for (let o of orders) {
    orderRows.push({
      id: o.id,
      tenant_id: tenantId,
      customer_id: o.customer?.id || null,
      order_number: o.order_number,
      email: o.email,
      total_price: o.total_price,
      currency: o.currency,
      financial_status: o.financial_status,
      processed_at: o.processed_at,
      created_at: o.created_at,
      updated_at: o.updated_at,
    });

    if (!o.line_items || o.line_items.length === 0) {
      console.warn(`⚠️ Order ${o.id} has no line_items`);
    } else {
      console.log(`✅ Order ${o.id} has ${o.line_items.length} line_items`);
    }

    for (let item of o.line_items || []) {
      orderItemRows.push({
        order_id: o.id,
        product_id: item.product_id,
        tenant_id: tenantId,
        quantity: item.quantity,
        price: item.price,
      });
    }
  }

  // Save orders
  const { error: orderErr } = await supabase.from("orders").upsert(orderRows);
  if (orderErr) {
    console.error("❌ Error inserting orders:", orderErr);
  } else {
    console.log(`✅ Inserted/updated ${orderRows.length} orders`);
  }

  // Save order_items
  if (orderItemRows.length > 0) {
    console.log(`⚡ Inserting ${orderItemRows.length} order_items`);
    const { error: itemErr } = await supabase
      .from("order_items")
      .upsert(orderItemRows, { onConflict: ["order_id", "product_id"] }); // ✅ fix here

    if (itemErr) {
      console.error("❌ Error inserting order_items:", itemErr);
    } else {
      console.log(`✅ Inserted/updated ${orderItemRows.length} order_items`);
    }
  } else {
    console.warn("⚠️ No order_items to insert");
  }
}




module.exports = { saveCustomers, saveProducts, saveOrders };
