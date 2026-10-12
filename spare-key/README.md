# Spare Key — Lost-Phone & Family Plan

`/spare-key/` · tool id `spare-key` · consumer · category "Safety & family"

A planning checklist for two bad moments: **you lose your phone**, or **you die or can't speak for yourself**. You tap the accounts that matter, answer three taps each (how you sign in, what backup you have, whether family could act), and get:

- a **Lockout Score** ("If you lost your phone today: 3 of 5 key accounts would lock you out. If you died: your family could reach 1 of 5.")
- a **fix list**, most important first, with general steps and a link to each platform's official page; tapping what you fixed updates the score ("Up from 2/5")
- a **Protect your phone number** card (carrier PIN, number lock, SIM-change alerts) with the official carrier pages for your country
- a one-page **Lost-Phone Sheet** to print or save as PDF
- an **encrypted plan file** and an **encrypted save on the device**, a **yearly review reminder** (.ics), a numbers-only **score card** to share and a plain **invite link** for a parent
- with the **Family Pack**: up to 6 people, the **For My Family** letter, wallet cards, a print-ready binder and document-expiry reminders

English and Spanish (auto from the browser language, switch at top right). Single static page, no libraries, ~153 KB.

Working name: trademark search still to do before launch (see "Not done"). Fallback name from the memo: "Lost-Phone & Legacy Plan".

## Free vs Family Pack

| | Free (one person) | Family Pack, $4.99 once |
|---|---|---|
| Pick accounts, three taps, Lockout Score | Yes | Yes |
| Fix list with official links, quick "I did this" buttons | Yes | Yes |
| Protect-your-number card | Yes | Yes |
| Lost-Phone Sheet (print / PDF), handwriting box for backup codes | Yes | Yes |
| Encrypted save on this device, encrypted plan file (export / open) | Yes | Yes |
| Yearly review reminder (.ics) | Yes | Yes |
| Score card share, invite link, sit-down guide | Yes | Yes |
| English and Spanish, on screen and in print | Yes | Yes |
| People in one plan | 1 | Up to 6 |
| For My Family letter (contacts, where documents are, legacy status per account, wishes, subscriptions to cancel, family code word line, notes) | Can print one received in a plan file | Write and print |
| Wallet cards (85.6 × 54 mm), whole binder | | Yes |
| Document-expiry reminders (90 days before + on the day) | | Yes |

Fixing one person's lockout is never paywalled. The upsell appears only on the results screen, states the price and "one payment, no subscription, no renewal, no trial to cancel", and has no timers or pop-ups. Someone who **receives** a plan file can open it and print everything in it without buying.

**Before checkout**, if the plan isn't saved yet, the page asks the buyer to lock it on the device with a passphrase, so it's waiting when Stripe sends them back (`?session_id=…` replaces the page). It never stashes the plan unencrypted.

## Billing

The page loads `/js/pro.js` and calls `Studio.init({ tool: 'spare-key', onChange })`. The buy button calls `Studio.upgrade('family', 'once')`. Checkout returns to `/spare-key/?session_id=…`; `/api/access` verifies it and the token is kept by `pro.js` (one-time purchases re-check the original checkout). Until the catalog entry and price exist, the button shows "The Family Pack opens for purchase very soon. Everything free works now."

### Catalog entry (add to `catalog/tools.json` → `tools`)

```json
{
  "id": "spare-key",
  "name": "Spare Key",
  "tagline": "If you lost your phone tonight, could you get back into your bank, email and WhatsApp? Make a plan in 10 minutes. Nothing leaves your phone.",
  "audience": "consumer",
  "category": "Safety & family",
  "plans": [
    { "id": "family", "once": true }
  ]
}
```

`audience` and `category` are extra metadata from the build spec; the billing server reads only `id` and `plans`, so drop them if the home page doesn't use them.

### Stripe product and price (not created — no Stripe calls were made)

| | Value |
|---|---|
| Product name | `Spare Key Family Pack` |
| Product description | `One-time unlock for Spare Key: up to 6 people, the For My Family letter, wallet cards, binder and document reminders.` |
| Product metadata | `tool=spare-key`, `plan=family` |
| Price | one-time (`type: one_time`), `unit_amount: 499`, `currency: usd` |
| `lookup_key` | `spare-key__family__once` (the checkout server builds `<tool>__<plan>__once`) |
| `currency_options` | `gbp: 399` (£3.99), `eur: 449` (€4.49) — from the memo |
| Price metadata | `tool=spare-key`, `plan=family` |
| Suggested tax code | `txcd_10103000` (Software as a service, personal use) **(unverified tonight: the Stripe docs connection failed to connect; check Stripe's tax code list before use)**. Fallback: the account's preset `txcd_10000000`. |
| `tax_behavior` | suggest `inclusive`, so the coffee price shown is the price paid; CEO / tax advisor to confirm (no tax registrations exist yet, so $0 tax is collected either way) |
| Trial / renewal | none |

Not wired: the memo's **USD $1.99 lower-income price by country**. The checkout server sells one lookup key per plan, so it needs a server change (e.g. a second key `spare-key__family__once_low` chosen by country) outside this folder. NGN waits for CEO confirmation per the memo.

## Privacy and safety (by design)

- **Never asks for or stores** passwords, PINs, passcodes, recovery/backup codes or seed phrases. The data model has no field for them (unit-tested). Backup codes and the family code word go on **paper, by hand**: the printouts have blank handwriting boxes and lines. (The memo's "print-only typed fields" were replaced by handwriting boxes, which is stricter: nothing secret is ever typed.)
- **Secret guard:** every free-text field (places, names, wishes, notes) refuses text that looks like a code, PIN, labelled password, long random string or a 12–24-word recovery phrase, shows a warning, and never puts it in the plan. Imported files are cut down to known fields and pass the same guard.
- **Everything stays on the device.** Nothing about the plan is written to browser storage unless the user locks it with a passphrase. `localStorage` holds only `spare-key:vault` (encrypted envelope) and `spare-key:lang` (language). Every storage access is wrapped in try/catch; in private mode the page still works and suggests downloading a file instead.
- **Encryption:** WebCrypto AES-GCM-256; key from PBKDF2-SHA-256, 600,000 iterations, random 16-byte salt; random 12-byte IV per save. File `family-plan.sparekey` = JSON `{app, v, kdf, cipher, iter, salt, iv, ct}` (base64). The header is bound to the ciphertext as AES-GCM additional data; iteration counts below 100,000 are refused. Wrong passphrase: "That passphrase doesn't open this plan. We can't reset it, by design." The derived key is non-extractable; while the page is open, re-saves reuse it so the passphrase itself is never kept. Generated passphrases are 6 words from a 207-word list (about 46 bits) and are shown once, then wiped from the page; typed ones need 12+ characters. The dialog warns: give the passphrase in person or a separate message, never in the same email.
- **Network:** the page loads only itself and `/js/pro.js`, and calls only `/api/event` (one anonymous `check` count per page load when a score is first shown — same as Vendor Check; no names, accounts or answers), `/api/access` and `/api/checkout`. Strict page CSP (meta tag, on top of the site header): `default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-src 'none'; object-src 'none'; form-action 'self' https://*.stripe.com; …`. Outbound links to official help pages open in a new tab with `noopener noreferrer`. No third-party scripts, fonts or images; no logos (plain-text names only).
- **Wording rules:** never "secure", "guaranteed" or "protects you" (a test checks both languages). Exact honesty lines from the spec are on the page. The letter says it is not a will or power of attorney and names **no laws** (none could be verified tonight). Children: not aimed at under-13s; nothing is collected.
- `beforeunload` warns only when there are unsaved, unlocked changes.

On-page privacy note (exact, from the spec): "Your plan stays on this device. We never see your accounts, and we never ask for passwords or codes. If you save it, it's encrypted with a passphrase only you know. We can't read it or recover it. If you buy the Family Pack, Stripe processes the payment, and we keep only the record that you bought it."

## Platform library and what was verified

77 entries across Email, Phone number & carrier (US, UK, Canada, Nigeria, Kenya, India, Philippines), Banking & cards, Mobile money, Messaging, Photos & cloud, Social, Government logins (US, UK, CA, NG, KE, IN, EU), Work, Password managers and Crypto. Each entry has `checked` / `checkedBy` / `steps` fields; steps are shown only when `checked` holds a date.

**Verified platforms: none.** On 2026-10-12 we tried to open each official help page from our network:

- `curl` through the session proxy: every host returned **403 at the proxy (policy denial)** — support.google.com, support.apple.com, faq.whatsapp.com, support.signal.org, telegram.org, facebook.com, help.instagram.com, help.x.com, linkedin.com, bitwarden.com, support.1password.com, support.microsoft.com, help.yahoo.com, verizon.com, t-mobile.com, att.com, login.gov, help.coinbase.com, paypal.com, amazon.com, plus consumer.ftc.gov, fcc.gov, gov.uk, ncsc.gov.uk, usa.gov, cisa.gov. TLS checks were never disabled.
- WebFetch: `getaddrinfo ENOTFOUND` for bitwarden.com, support.google.com and support.apple.com.

So, as instructed, **every entry ships link-only**: the platform name, a link to its official help center (or official website where we don't know a stable help URL; labelled "Official website"), and "Steps for this service: not yet checked by us, so we show general steps." The general steps are our own platform-neutral wording ("open the account's security settings… add a recovery email… if it offers backup codes, print them…"), not taken from any help page.

The links point at help-center **roots** (e.g. `https://support.google.com/accounts`, `https://faq.whatsapp.com`) rather than deep articles, because deep URLs could not be checked; **the links themselves are unverified** and need the pre-launch 200-OK check from a network that can reach them.

To verify an entry later: open its official page, write 3–6 step lines in our own words into `steps`, set `checked: 'YYYY-MM-DD'` and `checkedBy`. The fix card then shows those steps and "Last checked by us: date". Re-check quarterly; anything older than 6 months should go back to link-only.

## Sources

From the O-025 memo (`research/2026-10-12/O-025-…md`, internal). These were search-result citations in the memo **[S]** and were **not reopened tonight** (the proxy blocked them); nothing from them is stated as fact on the page.

- Which?: most people have no plan for digital death — https://www.which.co.uk/news/article/most-people-have-no-plan-for-digital-death-which-finds-aCp2c3o0NHXT
- Cifas: SIM swaps — https://www.cifas.org.uk/newsroom/huge-surge-see-sim-swaps-hit-telco-and-mobile
- Lost phone with 2FA guidance — https://ente.com/articles/what-happens-if-you-lose-your-phone-with-2fa/ ; https://www.howtogeek.com/358803/what-to-do-if-you-lose-your-two-factor-phone/
- Legacy contacts overview — https://www.nolo.com/legal-encyclopedia/how-to-add-legacy-contacts-to-your-accounts.html
- Bitwarden emergency access — https://bitwarden.com/help/emergency-access/

The page makes no statistical claims and states no laws. Its only factual hook ("If you lost your phone tonight, could you get back into your bank, email and WhatsApp?") is a question.

## Files

- `index.html` — the page. Scripts: `#sk-core` (pure engine: library, scoring, fix list, secret guard, sanitizer, .ics, encryption; runs in Node for tests), `#sk-i18n` (English + Spanish), `/js/pro.js`, `#sk-ui` (page).
- `og.png` — 1200 × 630 share image.
- `test/core.test.mjs` — engine unit tests (17).
- `test/page.test.mjs` — static page checks (9): search tags, JSON-LD offers `0` / `4.99`, CSP, only `/api/*` calls, billing wiring, exact honesty and privacy wording, banned words, Spanish completeness, internal links, size.
- `test/page.e2e.mjs` — Playwright, 6 flows (not part of `node --test`).

## Tests

```
node --test spare-key/test/*.test.mjs                 # 26 pass
PLAYWRIGHT_DIR=<dir with node_modules/playwright> CHROMIUM=/opt/pw-browsers/chromium SHOT_DIR=<dir> node spare-key/test/page.e2e.mjs   # 6 pass
```

The e2e test serves the studio root with the site CSP header. `/api/*` returns 404 there, except where the test routes `/api/access` (Family Pack unlock) or `/api/checkout` (not on sale, 409) in the browser. It covers: the free flow at 375 px (score 2/5 → 3/5 after a quick fix), the secret guard, the printed sheet (recovery order email → number → bank → messaging) plus a PDF, the sit-down guide, the yearly .ics, encrypted export → open on a fresh browser context (wrong passphrase refused), encrypted device save → reload → unlock, the buy flow asking to lock first, the Family Pack via routed `/api/access` (2 people, letter, refused secret, cards, 5-page binder, passport reminder in the .ics), Spanish, light and dark, phone and desktop. It also checks for no horizontal scroll, that every request went only to `/spare-key/`, `/js/pro.js` or `/api/*`, and that there were zero console errors apart from the known `/api` 404/409.

**Integration note:** the repo's `npm test` glob doesn't include `spare-key/test/*.test.mjs`; add it if you want these in CI. Once the catalog entry exists, `test/seo.test.mjs` will also cover this page (it needs the sitemap entry). You could add `assert.deepEqual(offers['spare-key/index.html'], ['0', '4.99'])` there.

## Not done / deviations from the build spec

- **Platform steps: 0 of ~60 verified** (network policy; see above). The 30-entry spot check and the "every link 200 OK" check are still open.
- **Trademark search** on "Spare Key", and the **launch-week white-space re-check**: not done (no web access).
- **Storage:** `localStorage` (per this assignment) instead of IndexedDB.
- **PWA / installable:** no manifest or service worker. This keeps the page to the agreed files and to no extra network fetches. Adding `manifest.webmanifest` and a scoped `sw.js` is a small follow-up.
- **Lower-income $1.99 price and NGN:** need a checkout-server change and a CEO decision (see Billing).
- **Spanish** text is our own translation and has not had a native-speaker review. French, Portuguese, Hindi and Swahili are not started.
- **Cheap-Android 3G throttled render check, screen-reader pass and RTL layout:** not run. There are labels, roles, focus styles and `aria-live` on the score, but no audit with a real screen reader.
- **Printouts in all launch languages** are free, not Family-Pack-only. That's fairer, and the spec's paywall line here was small.
- **Pass-mark counters:** only "plans started" is counted, via the existing `/api/event` `check` event. Sheets printed and share taps would need new event types in `api/event.js` (outside this folder).

## Changelog

- **2026-10-12 — v1.0** First build: scoring, fix list, phone-number card, Lost-Phone Sheet, encrypted save and file, yearly .ics, score card and invite link, sit-down guide. Family Pack: people, letter, wallet cards, binder, document reminders. English and Spanish. 77-entry platform library, link-only (none verifiable from our network tonight). Tests: 26 unit/static and 6 browser.
