# Browser tests (optional, not part of `npm test`)

Run against the local Cloudflare runtime with a **mock** OfficeCRM; never the live CRM. Playwright is not a
project dependency: install it outside the repo (e.g. `npm i -g playwright` or in a scratch folder).

```bash
node test/e2e/mock-office.mjs &                        # mock OfficeCRM on 127.0.0.1:8799 (key local-test-key)
# .dev.vars: CRM_WEBHOOK_URL=http://127.0.0.1:8799/api/leads/webhook  LEADS_WEBHOOK_API_KEY=local-test-key
npm run build
npx wrangler dev --port 8787 --inspector-port 9231 &   # www
npx wrangler dev -c wrangler.lp.jsonc --port 8788 --inspector-port 9232 --persist-to <own folder> &   # lp. (own state folder, or the two Workers clash)
node test/e2e/forms.e2e.mjs       # validation, website-v1 payload, delivery outcomes, idempotency, WhatsApp — both sites (336 checks)
node test/e2e/main-site.e2e.mjs   # main-site OfficeCRM round trip (44 checks)
node test/e2e/preview-routing.e2e.mjs   # both previews route to the right Worker; lp /privacy/ on 8788 (6 checks)
node test/e2e/responsive.e2e.mjs        # every page of both sites at 9 phone/tablet sizes (315 page views): no sideways
                                         # scrolling, nothing off-screen, no distorted images, readable text, no iOS input
                                         # zoom, tap targets ≥ 40px on touch screens, main menu on one row
```
`npm run preview:cf` (8787) and `npm run preview:cf:lp` (8788, own state folder) use the same fixed ports, so
`preview-routing.e2e.mjs` also works against them.
The fake CRM models OfficeCRM's `website-v1` contract (request validation, idempotent saves with duplicate replays and revisions). Modes (`GET /mode/…`): `ok`, `not-configured`, `force-400`, `in-progress` (409), `500`, `500-after-save`, `slow-after-save`, `drop-after-save-once`, `hang`, `reset`, `malformed`, `missing-success`, `success-false`. `GET /leads` lists stored leads; `GET /reset` clears them. The request rules are the confirmed contract; the response bodies follow the proposed schema (CHANGE-REQUEST §5), not yet checked against OfficeCRM's code.

Lost-response test through the response-dropping proxy (test plan T10c):
```bash
node test/e2e/drop-response-proxy.mjs 8798 http://127.0.0.1:8799 &
npx wrangler dev -c wrangler.lp.jsonc --port 8786 --inspector-port 9233 --persist-to <own folder> \
  --var CRM_WEBHOOK_URL:http://127.0.0.1:8798/api/leads/webhook &
node test/e2e/lost-response.e2e.mjs   # 5 checks
```
The same proxy and script are used against a **local** OfficeCRM (`npm run dev` + emulators) for the real end-to-end test. Never point them at production.
