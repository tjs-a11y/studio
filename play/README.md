# Quickwell Play

Three daily brain games at `/play/`: **Echo** (memory), **Swift** (focus), **Linkr** (logic). Static files only, phone first, installable (PWA), works offline after the first visit. Progress lives in `localStorage` on the player's device.

## Billing: one product, "brain-pass"

Every game page loads `/js/pro.js` and calls `Studio.init({ tool: 'brain-pass' })` (see `js/ui.mjs`, `initPass`). The Pass unlocks premium in all three games at once.

| Plan | Call | Price |
|---|---|---|
| Monthly | `Studio.upgrade('pass', 'month')` | $2.99/month, 7-day free trial |
| Yearly | `Studio.upgrade('pass', 'year')` | $19.99/year, 7-day free trial |
| Lifetime | `Studio.upgrade('lifetime', 'once')` | $29.99 one time |
| Manage / cancel | `Studio.manage()` | Stripe customer portal |

**Catalog entry to add to `catalog/tools.json`** (not added yet; the owner adds it together with the Stripe prices):

```json
{
  "id": "brain-pass",
  "name": "Brain Pass",
  "tagline": "Unlimited play in Echo, Swift and Linkr: every difficulty, extra modes, full stats and streak freezes. Daily challenges are always free.",
  "plans": [
    { "id": "pass", "trialDays": 7 },
    { "id": "lifetime", "once": true }
  ]
}
```

Stripe prices need these lookup keys (the checkout server builds `<tool>__<plan>__<interval>`):

- `brain-pass__pass__month` — $2.99 USD, recurring monthly
- `brain-pass__pass__year` — $19.99 USD, recurring yearly
- `brain-pass__lifetime__once` — $29.99 USD, one time

Checkout returns to `/brain-pass/` (success: `?session_id=…`, cancel: `?checkout=cancelled`). That page verifies the session through `/api/access`, saves the token, and sends the player back to the game they came from. Once the catalog entry exists, the home page also lists Brain Pass as a card (it is rendered from the catalog) and `scripts/sitemap.mjs` dedupes `/brain-pass/`.

Until the catalog entry and prices exist, the buy buttons show a polite "not available" message and everything free keeps working.

## What is free and what the Pass adds

| | Free forever | Brain Pass |
|---|---|---|
| Daily challenge in each game (same for everyone, resets at local midnight) | Yes | Yes |
| Practice | 3 runs per game per day | Unlimited |
| Difficulty tiers | Easy, Normal | + Hard, Expert (and Linkr Hard/Expert dailies) |
| Extra modes | | Echo Mirror and Dual (n-back lite), Swift Zen and Sudden death, Linkr Blind total |
| Stats | 7-day chart, personal bests | 30-day chart, full run history |
| Colour themes | | 5 extra |
| Streak freeze | | 1 token a week (hold up to 2); one token covers a missed day for every game |

Upgrade prompts appear only when a player taps something the Pass unlocks or has used today's free practice runs. No timers, no pop-ups on arrival; "Not now" always closes it. Gifting is mentioned as "coming later" and is not built.

## Honesty

No claim that the games raise IQ, prevent decline or improve real-world performance (FTC v. Lumosity, 2016). Every page carries an "About the science" note. `test/honesty.test.mjs` fails on banned phrases.

## Files

- `index.html` hub; `echo/`, `swift/`, `linkr/` game pages; `../brain-pass/` checkout return page
- `js/core.mjs` seeded RNG, day keys, streaks and freezes, practice limit, levels, share text (pure, tested)
- `js/echo.mjs`, `js/swift.mjs`, `js/linkr.mjs` game logic (pure, tested)
- `js/ui.mjs` storage, sound, haptics, sheets, Brain Pass, stats, tutorial, settings, service-worker registration
- `js/*-app.mjs` page controllers
- `sw.js` offline worker, scope `/play/`; never handles `/api/*`, other origins or non-GET requests; network first
- `manifest.webmanifest`, `icons/`, `og.png` per page (1200×630)

## Tests

- `npm test` runs `test/*.test.mjs` and `play/test/*.test.mjs` (determinism, solvability, scoring, streaks across midnight and time zones, honesty).
- `play/test/smoke.e2e.mjs` is a Playwright smoke test (not part of `npm test`; needs a Playwright install):
  `PLAYWRIGHT=/path/to/node_modules/playwright CHROMIUM=/path/to/chromium node play/test/smoke.e2e.mjs`

## Ideas not built yet

- Restoring a Pass on a second device (today the access token is saved in the browser that paid).
- Gifting a Pass. Localised prices. More languages.
