# Verdant & Co. Client Testing and Agent Handoff

This document is the operating guide for sharing, starting, and testing Verdant & Co. on a Windows PC. It is written for a nontechnical client and for a future coding agent who may be asked to restart or verify the project. It is for local evaluation only; deployment planning is intentionally deferred.

## Choose a preview

There are two different ways to view this project:

| Option | What it demonstrates | Installation | Data behavior |
| --- | --- | --- | --- |
| `client-preview.html` | A presentation mockup with sample catalogue, account, bag, and confirmation screens | None; open the file in Chrome | Demo-only; it does not save or send account or order data |
| Full storefront | The actual Node.js and SQLite app, including persistent accounts, inventory, and orders | Install Node.js, then run the setup commands below | Writes `shop.sqlite` beside `server.js` |

The mockup is useful for a quick design review. Use the full storefront when the client wants to test account creation and database-backed order history. The mockup must not be presented as a real checkout.

## Share the project folder

Send the complete project folder or a ZIP containing these items:

- `AGENT_HANDOFF.md`, `README.md`, `package.json`, and `package-lock.json`
- `server.js`
- The complete `public` folder
- `client-preview.html`

Do not include `node_modules`; it is recreated during setup and makes the ZIP much larger. Do not send a `shop.sqlite` containing real account or order details. Each copy of the app creates its own database and starter catalogue the first time it runs.

## Client: open the visual mockup

This path needs no software installation:

1. Extract the project ZIP if it was sent as a ZIP.
2. Open the project folder in File Explorer.
3. Double-click `client-preview.html` to open it in the default browser. If needed, right-click it and choose Google Chrome.
4. Use Shop, Our story, Account, and Bag to explore. Add a colour to the bag, choose **Create account**, and submit the sample delivery form to see the sample confirmation.

The mockup is not connected to the database. Its account and checkout details are temporary and are not saved or sent. Product photographs and typefaces load from online services, so those visual assets need an internet connection.

## Client: run the full local storefront

### Install Node.js

Install Node.js 22.5 or newer from [nodejs.org](https://nodejs.org/en/download). The current Node.js LTS release is recommended. Use the standard Windows installer options; administrator access may be requested by the installer. Restart File Explorer or open a new terminal after installation so Windows can find Node.

### Start the storefront

1. Extract the project folder to a writable location, such as Documents. Avoid `Program Files` or other protected folders.
2. In File Explorer, open the project folder. Confirm that `package.json` and `server.js` are visible and that the `public` folder is present.
3. Click the File Explorer address bar, type `powershell`, then press Enter. This opens PowerShell in the project folder.
4. Check that Node is installed by entering:

   ```powershell
   node --version
   ```

   The version must be `v22.5.0` or newer.

5. Install the app dependency:

   ```powershell
   npm.cmd install
   ```

   Wait for the command to finish and return to the prompt. This requires an internet connection the first time.

6. Start the app:

   ```powershell
   npm.cmd start
   ```

7. Leave the PowerShell window open. Open Chrome and visit [http://localhost:3000](http://localhost:3000).

The app runs only on that PC. `localhost` is not a public link and cannot be opened from the client's phone or another computer. Closing the PowerShell window stops the server. To stop it normally, focus the window and press `Ctrl+C`.

### Test the storefront

Use fictional information only. The local database stores names, email addresses, delivery addresses, and orders; passwords are stored as hashes, but this evaluation build is not a production service.

1. Confirm the home page loads and the product catalogue contains six starter products.
2. Search for a colour, select a category, and change the sort order.
3. Open a product, change its quantity, and add it to the bag.
4. Open Account, choose **Create account**, and use a test email and a password of at least eight characters.
5. Return to the bag, enter a fictional delivery address, and place a test order.
6. Visit Account and confirm the order appears in order history.
7. Stop the app with `Ctrl+C`, start it again with `npm.cmd start`, and confirm the account and order still exist.

Checkout records a confirmed order and decrements local inventory. It does not charge a card, create a shipping label, or send email. Use test information and a disposable project copy if the client wants to test order creation.

## Restart and verification procedure for an agent

When asked to restart or test the project on a client's PC:

1. Confirm the working folder contains `server.js`, `package.json`, `package-lock.json`, and `public`.
2. Run `node --version`. Require Node.js 22.5 or newer because the app uses Node's built-in SQLite module.
3. In Windows PowerShell, use `npm.cmd` rather than `npm` for npm commands. Some PCs block the `npm.ps1` script through PowerShell execution policy; do not change that policy just to run this project.
4. If `node_modules` is absent, run `npm.cmd ci` from the project folder. Use `npm.cmd install` only if there is no lockfile or `npm ci` cannot complete for a documented reason.
5. Start one server with `npm.cmd start`. Keep the terminal attached so its logs remain visible. Do not kill an unknown process to free a port.
6. Confirm `http://localhost:3000/` responds and `http://localhost:3000/api/products` returns six seeded products on a fresh database.
7. Exercise account and order flows only with explicit permission and fictional information. Do not delete, replace, or reset an existing `shop.sqlite`. If a test order is needed, prefer a disposable copy of the project/database; document test records and any stock changes.
8. Report the Node version, command results, URL/port, test steps, and any errors. Keep deployment, payment-provider setup, and public hosting out of scope unless separately requested.

## Troubleshooting

| Symptom | What to do |
| --- | --- |
| `'node' is not recognized` | Install Node.js, close old terminals, open a new PowerShell window in the project folder, and retry `node --version`. |
| `npm.ps1 cannot be loaded` or scripts are disabled | Use `npm.cmd install`, `npm.cmd ci`, and `npm.cmd start`. Do not change the machine execution policy. |
| `npm.cmd install` fails | Check internet access, then retry once. Include the full error text when asking for help. Do not remove the lockfile as a first step. |
| Port 3000 is already in use | Do not terminate an unknown process. Open a new PowerShell window in the project folder and run `$env:PORT = '3001'; npm.cmd start`, then visit `http://localhost:3001`. |
| The browser cannot connect | Confirm the PowerShell window still shows the running server and has not returned to a prompt. Use the same PC and port shown in that window. |
| Images or fonts are missing | Check internet access; the app uses remote Unsplash images and Google Fonts. The layout still works without them. |
| SQLite reports an unavailable module | Check `node --version`; install a supported Node.js release (22.5+), then open a new terminal. |
| Permission or database write error | Move the project to a user-writable folder such as Documents. Do not delete the database to try to clear the error. |

## Current scope and data notes

- The full app uses Express and Node's built-in SQLite database. The `shop.sqlite` file is created automatically beside `server.js`; the starter catalogue is inserted when the database is first initialized.
- Accounts, orders, and stock changes persist in that database. The database file is ignored by Git, but it is not encrypted. Do not put real customer data in a demo copy or share a database that contains personal data.
- Prices use USD. Demo checkout estimates delivery at $9.95 below $75, free delivery at $75 or more, and tax at a fixed 8%. These are sample values, not validated business rules.
- `COOKIE_SECRET` has a development fallback. Do not deploy with that fallback.
- No payment capture, order email, shipping integration, product administration, or public hosting is configured.
- Local testing on a client's PC is not deployment. For public access, use a separately planned hosting, security, data, backup, payment, tax, shipping, and domain/HTTPS setup.

## Later deployment planning

Do not expose this local test server to the internet. Before any real commerce launch, confirm the business's shipping regions, tax rules, prices, and inventory; choose and integrate payment, transactional email, and fulfillment providers; provision production hosting and a durable database with backups; configure strong secrets, HTTPS, security controls, and monitoring; and test operational recovery. Plan these choices with the project owner before changing the local evaluation setup.
