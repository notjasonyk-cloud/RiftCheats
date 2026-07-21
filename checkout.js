function buildCheckoutUrl(apiUrl, shopId) {
  const url = new URL(apiUrl);
  const cleanPath = url.pathname.replace(/\/$/, '');
  const apiRoot = cleanPath.replace(/\/v1(?:\/shops\/[^/]+\/products)?$/, '');
  url.pathname = `${apiRoot}/v1/shops/${shopId}/checkout`.replace(/\/+/g, '/');
  url.search = '';
  return url;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    res.end('Method Not Allowed');
    return;
  }

  const apiKey = process.env.SELLAUTH_API_KEY;
  const shopId = process.env.SELLAUTH_SHOP_ID;
  const apiUrl = process.env.SELLAUTH_API_URL;
  if (!apiKey || !shopId || !apiUrl) {
    res.statusCode = 500;
    res.json({ message: 'Server configuration error: missing SellAuth environment variables.' });
    return;
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch {
    res.statusCode = 400;
    res.json({ message: 'Invalid checkout request.' });
    return;
  }
  if (!Array.isArray(body.cart) || body.cart.length === 0) {
    res.statusCode = 400;
    res.json({ message: 'Your cart is empty.' });
    return;
  }

  const checkoutBody = {
    cart: body.cart,
    currency: body.currency,
    email: body.email,
    affiliate: body.affiliate,
    coupon: body.coupon,
    ip: (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || undefined,
    user_agent: req.headers['user-agent'] || undefined,
  };

  try {
    const response = await fetch(buildCheckoutUrl(apiUrl, shopId), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(checkoutBody),
    });
    const data = await response.json();
    res.statusCode = response.status;
    res.json(data);
  } catch (error) {
    console.error('SellAuth checkout error:', error);
    res.statusCode = 502;
    res.json({ message: 'Unable to start checkout. Please try again.' });
  }
};
