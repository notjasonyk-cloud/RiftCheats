# RiftCheats deployment

## 1. Rotate the exposed key

The original project contained a SellAuth API key in source code. Revoke that key in SellAuth and create a new one before deploying this corrected project.

## 2. Configure Vercel

In **Vercel > Project > Settings > Environment Variables**, add these variables for Production (and Preview if you use preview deployments):

- `SELLAUTH_API_KEY`: the newly generated SellAuth API key
- `SELLAUTH_API_URL`: `https://api.sellauth.com`
- `SELLAUTH_SHOP_ID`: `223549`

Do not prefix the API key with `NEXT_PUBLIC_` and do not paste it into any HTML or JavaScript file. It must remain server-side.

## 3. Deploy

Upload/import this folder as the Vercel project root, then redeploy after saving the variables. If Vercel is already connected to the project, replace the project files and trigger a fresh deployment.

## 4. Verify

1. Open the homepage and confirm its design still loads.
2. Open each `/product/...` page and confirm the product name, variants, and prices match your SellAuth dashboard.
3. Add an item and start checkout; confirm the checkout is for your shop.
4. If a product page says it was not found, update `SLUG_TO_PATH` in `api/index.js` so the website slug maps to that product's SellAuth `path` value.

The server accepts either a base URL or a full `/v1/shops/.../products` URL in `SELLAUTH_API_URL`; it always substitutes the configured `SELLAUTH_SHOP_ID`.

Catalog and checkout calls run through Vercel server functions so the API key is never sent to visitors. SellAuth's checkout API may require a plan that includes Checkout API access.
