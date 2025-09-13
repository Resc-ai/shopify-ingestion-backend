const axios = require('axios');

async function fetchShopifyData(endpoint, storeUrl, accessToken) {
  const url = `https://${storeUrl}/admin/api/2023-10/${endpoint}.json`;
  const res = await axios.get(url, {
    headers: { 'X-Shopify-Access-Token': accessToken }
  });
  return res.data;
}

module.exports = {
  fetchCustomers: (storeUrl, accessToken) => fetchShopifyData('customers', storeUrl, accessToken),
  fetchProducts: (storeUrl, accessToken) => fetchShopifyData('products', storeUrl, accessToken),
  fetchOrders: (storeUrl, accessToken) => fetchShopifyData('orders', storeUrl, accessToken)
};
