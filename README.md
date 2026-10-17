# Verdant & Co.

A full-stack paint and specialist-coatings storefront built with Express, vanilla HTML/CSS/JavaScript, and SQLite.

For a nontechnical client walkthrough and agent restart/testing procedures, see [AGENT_HANDOFF.md](AGENT_HANDOFF.md).

## Run locally

Requires Node.js 22.5 or newer and npm.

```powershell
npm.cmd install
npm.cmd start
```

Open [http://localhost:3000](http://localhost:3000). Set `PORT` to use a different port.

The SQLite database is created as `shop.sqlite` in the project directory on first run. The starter catalog is inserted automatically. Accounts, password hashes, orders, and inventory changes persist across restarts.

For local development, the app has a fallback cookie-signing secret. Set a private secret before deploying:

```powershell
$env:COOKIE_SECRET = 'a-long-random-value'
$env:NODE_ENV = 'production'
npm.cmd start
```

Use HTTPS in production so the session cookie is marked secure. Back up `shop.sqlite` as part of deployment operations.

## Included

- Searchable, filterable, sortable product catalog and product detail pages
- Persistent basket and server-validated order placement
- Stock-aware checkout with server-calculated delivery, tax, and totals
- Account creation, sign-in, sign-out, and order history
- About page and responsive mobile navigation

Checkout currently records confirmed orders in SQLite; it does not charge a payment method or send fulfillment emails. Connect a payment processor and email/shipping provider before accepting live orders. Product photography is served from Unsplash image URLs and requires an internet connection.

## Production deployment notes

This app is suitable for basic local or small-scale hosting, but not for public production commerce without additional operational setup.

### Required environment variables

```powershell
$env:NODE_ENV = 'production'
$env:COOKIE_SECRET = 'replace-with-a-long-random-secret'
$env:PORT = '3000'
```

### Recommended hosting pattern

Use a Node host such as Render, Railway, or Koyeb for the app itself and map a custom domain through Cloudflare or your domain provider.

Important: SQLite is a local file database, so the app should only be treated as a demo or low-scale deployment unless the host provides persistent storage or you move the database to a hosted Postgres service.

### Free hosting workflow

1. Push the project to GitHub.
2. Create a new Web Service on Render or Railway.
3. Select the repository and set the start command to `npm install && npm start`.
4. Add `NODE_ENV=production` and `COOKIE_SECRET=<long-random-secret>` in the environment settings.
5. Deploy and keep the generated HTTPS URL.
6. In Cloudflare, add your custom domain and create the DNS record to point to the host.
7. Update your hosting provider's custom domain settings to match.
8. Test the site, then confirm that session cookies and order flow work on the live URL.

### Domain guidance

- Free domain: use a free subdomain from the host or a free DNS provider.
- Custom domain: connect through Cloudflare and point the A/AAAA or CNAME record to the hosting provider.
- HTTPS is usually auto-issued by the hosting platform after domain setup.
