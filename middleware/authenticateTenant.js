const supabase = require('../utils/supabase');

async function authenticateTenant(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).send('❌ Authorization required');

  const token = authHeader.split(' ')[1];
  console.log('🔑 Received token:', token);

  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('api_key', token)
    .single();

  if (error || !tenant) return res.status(401).send('❌ Invalid API key');

  req.tenant = tenant;
  next();
}

module.exports = authenticateTenant;
