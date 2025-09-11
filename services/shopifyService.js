const axios = require('axios');

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

async function fetchShopifyData(endpoint) {
  const url = `https://${SHOPIFY_STORE_URL}/admin/api/2023-10/${endpoint}.json`;
  const res = await axios.get(url, {
    headers: { 'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN }
  });
  return res.data;
}

module.exports = {
  fetchCustomers: () => fetchShopifyData('customers'),
  fetchProducts: () => fetchShopifyData('products'),
  fetchOrders: () => fetchShopifyData('orders')
};
