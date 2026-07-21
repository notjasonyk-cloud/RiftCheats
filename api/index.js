const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.SELLAUTH_API_KEY;
const SHOP_ID = process.env.SELLAUTH_SHOP_ID;
let cachedProducts = null;
let lastFetchTime = 0;
async function fetchProductsFromSellAuth() {
  const now = Date.now();

  if (cachedProducts && (now - lastFetchTime < 60000)) {
    return cachedProducts;
  }

  if (!API_KEY) {
    throw new Error('Missing SELLAUTH_API_KEY environment variable.');
  }

  if (!SHOP_ID) {
    throw new Error('Missing SELLAUTH_SHOP_ID environment variable.');
  }

  const endpoint =
    `https://api.sellauth.com/v1/shops/${encodeURIComponent(SHOP_ID)}/products?perPage=100`;

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      Accept: 'application/json'
    }
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      `SellAuth returned HTTP ${response.status}: ${body.slice(0, 500)}`
    );
  }

  let json;

  try {
    json = JSON.parse(body);
  } catch {
    throw new Error(
      `SellAuth returned invalid JSON: ${body.slice(0, 500)}`
    );
  }

  if (!json || !Array.isArray(json.data)) {
    throw new Error(
      `Unexpected SellAuth response: ${body.slice(0, 500)}`
    );
  }

  cachedProducts = json.data;
  lastFetchTime = Date.now();

  return cachedProducts;
}

module.exports = (req, res) => {
  let slug = req.query.slug;

  if (!slug) {
    const urlParts = req.url.split('?')[0].split('/');
    slug = urlParts[urlParts.length - 1];
  }

  slug = (slug || '').toLowerCase();

  const sellauthPath = SLUG_TO_PATH[slug];

  if (!sellauthPath) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Product path configuration missing.');
    return;
  }

  (async () => {
    let products;

    try {
      products = await fetchProductsFromSellAuth();
    } catch (err) {
      console.error(
        'SellAuth API Error:',
        err instanceof Error ? err.message : err
      );

      res.statusCode = 502;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end(
        `SellAuth API error: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`
      );
      return;
    }

    const liveProd = products.find(
      (product) => product.path === sellauthPath
    );

    if (!liveProd) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Product not found in SellAuth dashboard.');
      return;
    }

    const templatePath = path.join(
      process.cwd(),
      'product_detail.html'
    );

    fs.readFile(templatePath, 'utf8', (err, data) => {
      if (err) {
        console.error(
          'Failed to read product_detail.html:',
          err
        );

        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain');
        res.end(
          'Server configuration error: product template file missing.'
        );
        return;
      }

      const localAsset = PRODUCT_ASSETS[slug] || {
        image: liveProd.images?.[0]?.url || '',
        desc: liveProd.description || ''
      };

      const variants = Array.isArray(liveProd.variants)
        ? liveProd.variants
        : [];

      const firstVariant = variants[0];
      const lastVariant = variants[variants.length - 1];

      const productJson = {
        id: liveProd.id,
        path: liveProd.path,
        unique_id: liveProd.salt,
        name: liveProd.name,
        description: localAsset.desc,
        meta_title: `${liveProd.name} - RiftCheats`,
        meta_description:
          'Information: Windows 10 & 11 Supported, Intel & AMD Processors.',
        meta_image_url: localAsset.image,
        meta_twitter_card: 'summary_large_image',
        product_tabs: [],
        price: firstVariant?.price || '0.00',
        min_price: firstVariant?.price || '0.00',
        max_price: lastVariant?.price || '0.00',
        min_price_slash: null,
        max_price_slash: null,
        min_price_with_discount: parseFloat(
          firstVariant?.price || 0
        ),
        max_price_with_discount: parseFloat(
          lastVariant?.price || 0
        ),
        currency: liveProd.currency || 'USD',
        image_url: null,
        image_urls: [localAsset.image],
        sort_priority: 0,
        deliverables: null,
        stock: -1,
        hide_stock_count: false,
        group_id: liveProd.group_id,
        category_id: null,
        category: null,
        type: 'variant',
        visibility: 'public',
        variants: variants.map((variant) => ({
          id: variant.id,
          name: variant.name,
          description: null,
          price: variant.price,
          price_slash: null,
          quantity_min: variant.quantity_min,
          quantity_max: variant.quantity_max,
          volume_discounts: [],
          deliverables: 0,
          stock: variant.stock,
          disabled_payment_method_ids: null
        })),
        products_sold: liveProd.products_sold,
        quantity_min: null,
        quantity_max: null,
        status_color: '#2ecc71',
        status_text: 'Undetected',
        custom_fields: [],
        product_badges: {
          card: [],
          page: []
        },
        discord_required: false,
        discord_guild_id: null,
        show_views_count: false,
        show_sales_count: false,
        show_sales_notifications: false,
        sales_count_hours: null,
        created_at:
          liveProd.created_at ||
          '2026-06-30T04:09:09.000000Z',
        is_mandatory: false,
        metadata: null
      };

      let output = data;

      output = output.replace(
        /<title>.*?<\/title>/g,
        `<title>${liveProd.name} - RiftCheats</title>`
      );

      output = output.replace(
        /<meta property="og:title" content=".*?"/g,
        `<meta property="og:title" content="${liveProd.name}"`
      );

      output = output.replace(
        /<meta name="twitter:title" content=".*?"/g,
        `<meta name="twitter:title" content="${liveProd.name}"`
      );

      output = output.replace(
        /<meta property="og:image" content=".*?"/g,
        `<meta property="og:image" content="${localAsset.image}"`
      );

      output = output.replace(
        /<meta name="twitter:image" content=".*?"/g,
        `<meta name="twitter:image" content="${localAsset.image}"`
      );

      const productPattern =
        /product:\s*\{"id":774973,[\s\S]*?\}\s*,\s*productAddons/g;

      output = output.replace(
        productPattern,
        `product: ${JSON.stringify(productJson)}, productAddons`
      );

      output = output.replace(
        /R6 Exodus Lite/g,
        liveProd.name
      );

      output = output.replace(
        /External Rust/g,
        liveProd.name
      );

      output = output.replace(
        /Apex Internal/g,
        liveProd.name
      );

      res.statusCode = 200;
      res.setHeader(
        'Content-Type',
        'text/html; charset=utf-8'
      );
      res.end(output);
    });
  })();
};
