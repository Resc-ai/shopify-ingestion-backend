const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// --------------------- CUSTOMERS ---------------------
async function saveCustomers(customers, tenantId) {
  for (let c of customers) {
    await prisma.customers.upsert({
      where: { id: c.id }, // Shopify ID is global unique
      update: {
        tenant_id: tenantId,
        first_name: c.first_name,
        last_name: c.last_name,
        email: c.email,
        phone: c.phone,
        tags: c.tags || null,
        created_at: c.created_at ? new Date(c.created_at) : null,
        updated_at: c.updated_at ? new Date(c.updated_at) : null,
      },
      create: {
        id: c.id,
        tenant_id: tenantId,
        first_name: c.first_name,
        last_name: c.last_name,
        email: c.email,
        phone: c.phone,
        tags: c.tags || null,
        created_at: c.created_at ? new Date(c.created_at) : null,
        updated_at: c.updated_at ? new Date(c.updated_at) : null,
      },
    });
  }
//   console.log(`✅ Saved ${customers.length} customers`);
}

// --------------------- PRODUCTS ---------------------
async function saveProducts(products, tenantId) {
  for (let p of products) {
    await prisma.products.upsert({
      where: { id: p.id },
      update: {
        tenant_id: tenantId,
        title: p.title,
        vendor: p.vendor,
        product_type: p.product_type,
        status: p.status,
        price: p.variants?.[0]?.price || null,
        created_at: p.created_at ? new Date(p.created_at) : null,
        updated_at: p.updated_at ? new Date(p.updated_at) : null,
      },
      create: {
        id: p.id,
        tenant_id: tenantId,
        title: p.title,
        vendor: p.vendor,
        product_type: p.product_type,
        status: p.status,
        price: p.variants?.[0]?.price || null,
        created_at: p.created_at ? new Date(p.created_at) : null,
        updated_at: p.updated_at ? new Date(p.updated_at) : null,
      },
    });
  }
  console.log(`✅ Saved ${products.length} products`);
}

// --------------------- ORDERS + ORDER ITEMS ---------------------
async function saveOrders(orders, tenantId) {
  console.log(`⚡ Processing ${orders.length} orders for tenant ${tenantId}`);

  for (let o of orders) {
    // Upsert order
    await prisma.orders.upsert({
      where: { id: o.id },
      update: {
        tenant_id: tenantId,
        customer_id: o.customer?.id || null,
        order_number: o.order_number,
        email: o.email,
        total_price: o.total_price,
        currency: o.currency,
        financial_status: o.financial_status,
        processed_at: o.processed_at ? new Date(o.processed_at) : null,
        created_at: o.created_at ? new Date(o.created_at) : null,
        updated_at: o.updated_at ? new Date(o.updated_at) : null,
      },
      create: {
        id: o.id,
        tenant_id: tenantId,
        customer_id: o.customer?.id || null,
        order_number: o.order_number,
        email: o.email,
        total_price: o.total_price,
        currency: o.currency,
        financial_status: o.financial_status,
        processed_at: o.processed_at ? new Date(o.processed_at) : null,
        created_at: o.created_at ? new Date(o.created_at) : null,
        updated_at: o.updated_at ? new Date(o.updated_at) : null,
      },
    });

    if (!o.line_items || o.line_items.length === 0) {
      console.warn(`⚠️ Order ${o.id} has no line_items`);
    } else {
      console.log(`✅ Order ${o.id} has ${o.line_items.length} line_items`);
    }

    // Upsert each order item
    for (let item of o.line_items || []) {
      // Fetch product title from Prisma
      let product = null;
      if (item.product_id) {
        product = await prisma.products.findUnique({
          where: { id: item.product_id },
          select: { title: true },
        });
      }

      await prisma.order_items.upsert({
        where: {
          order_id_product_id: {
            order_id: o.id,
            product_id: item.product_id,
          }, // ✅ composite unique key
        },
        update: {
          tenant_id: tenantId,
          quantity: item.quantity,
          price: item.price,
          title: product?.title || "N/A", // include title
        },
        create: {
          order_id: o.id,
          product_id: item.product_id,
          tenant_id: tenantId,
          quantity: item.quantity,
          price: item.price,
          title: product?.title || "N/A", // include title
        },
      });
    }
  }

  console.log(`✅ Inserted/updated ${orders.length} orders with items`);
}

module.exports = { saveCustomers, saveProducts, saveOrders };
