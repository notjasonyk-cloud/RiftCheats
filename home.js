const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  const shopId = process.env.SELLAUTH_SHOP_ID;
  const apiUrl = process.env.SELLAUTH_API_URL;

  if (!shopId || !apiUrl) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Server configuration error: missing SellAuth environment variables.');
    return;
  }

  let apiBaseUrl;
  try {
    apiBaseUrl = new URL(apiUrl).origin + '/';
  } catch {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Server configuration error: SELLAUTH_API_URL must be a valid URL.');
    return;
  }

  fs.readFile(path.join(process.cwd(), 'index.html'), 'utf8', (error, template) => {
    if (error) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Server configuration error: homepage template is missing.');
      return;
    }

    const output = template
      .replaceAll('__SELLAUTH_SHOP_ID__', String(shopId))
      .replaceAll('__SELLAUTH_API_BASE_URL__', apiBaseUrl);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.end(output);
  });
};
