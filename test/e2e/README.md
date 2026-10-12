# Browser tests (optional, not part of `npm test`)

Run against the local Cloudflare runtime with a **mock** OfficeCRM; never the live CRM. Playwright is not a
project dependency: install it outside the repo (e.g. `npm i -g playwright` or in a scratch folder).

```bash
node test/e2e/mock-office.mjs &                        # mock OfficeCRM on 127.0.0.1:8799 (key local-test-key)
# .dev.vars: CRM_WEBHOOK_URL=http://127.0.0.1:8799/api/leads/webhook  LEADS_WEBHOOK_API_KEY=local-test-key
npm run build
npx wrangler dev --port 8787 --inspector-port 9231 &   # www
npx wrangler dev -c wrangler.lp.jsonc --port 8788 --inspector-port 9232 &   # lp.
node test/e2e/forms.e2e.mjs       # validation, delivery failures, conversions, WhatsApp — both sites (188 checks)
node test/e2e/main-site.e2e.mjs   # main-site OfficeCRM round trip (40 checks)
```
Mock modes: `GET /mode/ok|success-false|missing-success|malformed|500|hang|reset`.
