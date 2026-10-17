# Deployment guide

This project is a small Express storefront with a local SQLite database. It can be hosted on a free Node service, but it is best treated as a lightweight demo or low-scale deployment unless you use a persistent database service.

## Recommended free deployment option

Use Render or Railway:

1. Push the project to GitHub.
2. Open Render or Railway and create a new web service from the repository.
3. Set the start command to:

   ```bash
   npm install
   npm start
   ```

4. Add environment variables:

   ```bash
   NODE_ENV=production
   PORT=3000
   COOKIE_SECRET=<a-long-random-secret>
   ```

5. Deploy the app.
6. Connect the generated HTTPS URL to your custom domain if desired.

## Custom domain setup

For a custom domain, use Cloudflare or your registrar:

1. In Cloudflare, add your domain.
2. Create a DNS CNAME or A record pointing to the host URL.
3. Add the domain in the hosting provider's custom-domain section.
4. Wait for DNS propagation and verify HTTPS is active.

## Important production notes

- SQLite persists only on the local filesystem of the host. Many free hosts do not keep filesystem data stable across deploys or restarts.
- If you need normal production reliability, move the database to a hosted PostgreSQL or MySQL service.
- Use a real secret for `COOKIE_SECRET`; never leave the default development fallback active.
- Keep the app behind HTTPS in production.
- Add a proper payment provider, email sending, and fulfillment system before running real commerce.

## Quick local production check

```bash
NODE_ENV=production COOKIE_SECRET='your-secret' PORT=3000 npm start
```

Then open:

```text
http://localhost:3000
```
