# OfficeCRM integration test plan

Status (2026-10-13): **not yet runnable. BLOCKED on the prerequisites in §1.**
Contract and risks: `docs/OFFICECRM-INTEGRATION-CONTRACT.md`.

The automated tests (`npm test`, `test/e2e/*.e2e.mjs`) use a **fake local CRM** (`test/e2e/mock-office.mjs`). They prove how the website behaves, **not** that the real OfficeCRM accepts its leads. This plan is for the real CRM, run in isolation first.

## 0. Rules for every test

- **Synthetic data only.** Never use a customer's details.
  - **Name:** `בדיקה אתר – TEST-<run>-<n>`, where `<run>` is the date, e.g. `TEST-1015-03`.
  - **Email:** an address the owner controls, with a tag, e.g. `lushi.office+crmtest-1015-03@gmail.com`. If OfficeCRM sends an automatic email, it reaches the owner, not a stranger.
  - **Phone:** a number the owner controls. Never invent a number: a valid-looking number may belong to someone, and the CRM might call or text it.
  - **Message (www):** `בדיקת אינטגרציה – למחוק`.
- **Campaign tag on every test URL:** `?utm_source=crmtest&utm_medium=qa&utm_campaign=TEST-<run>`. Every test lead then has source `… / crmtest / qa` and is easy to filter.
- **Record for each test:** time, page, the `/api/lead` response (browser DevTools → Network), the Worker log line (Cloudflare → Workers → *Worker* → Logs), and the OfficeCRM record ID.
- **No deploy, DNS change or secret change** except the owner-approved steps in §2.
- **Production CRM:** only in §4, with the owner's explicit go-ahead.

## 1. Prerequisites (all required before the first real test)

| # | Item | Who | How to check |
|---|---|---|---|
| P1 | **OfficeCRM source accessible** (the real repo `owner/name`) so the contract in CONTRACT §2 can be checked in code: route, auth, fields, responses, idempotency, sync vs async | Owner grants access; Claude verifies | CONTRACT §4 rows move from UNVERIFIED to MATCH/MISMATCH, with file references |
| P2 | **A test environment of OfficeCRM**: a staging instance with its own database and its own `LEADS_WEBHOOK_API_KEY`, reachable over https | Owner (or confirm one exists in the CRM's deployment config) | Its URL is different from production; a lead created there does not appear in the production CRM |
| P3 | Fallback if P2 isn't possible: owner approval to run §4 against production, with a deletable-test-lead procedure confirmed in OfficeCRM | Owner | Written approval; delete permission confirmed (P8) |
| P4 | Any **CRM code changes** found under P1 (e.g. a fixed `source` list, a phone format, a missing `success` field) agreed and made **in OfficeCRM's repo**, not here | Owner decides | CONTRACT §4 has no MISMATCH left |
| P5 | **Isolated website Workers** for the test: deploy the branch as `hagarlushi-staging` and `hagarlushi-lp-staging` (separate Worker names). The real `hagarlushi` and `hagarlushi-lp` Workers then never hold test secrets. Commands, for the owner to run or approve: `npx wrangler deploy --name hagarlushi-staging` and `npx wrangler deploy -c wrangler.lp.jsonc --name hagarlushi-lp-staging` | Owner approval needed (it is a deployment, though not to the real domains) | Both show a `*.workers.dev` URL; no custom domain attached |
| P6 | **Secrets on both staging Workers**: `CRM_WEBHOOK_URL` = the **staging** CRM webhook URL (`https://…/api/leads/webhook`), `LEADS_WEBHOOK_API_KEY` = the **staging** key (bare, no `Bearer`). Set in Cloudflare → Workers → *Worker* → Settings → Variables and Secrets → Add → type **Secret** | Owner (copy straight from the CRM; never paste it in chat) | Secrets can't be read back, so check with T0 and T1: the lead appears in **staging**, and the Worker log shows the same `leadId` |
| P7 | **Network path**: OfficeCRM doesn't block Cloudflare's IPs (no IP allowlist), and the hostname resolves publicly | Owner / P1 code review | T1 succeeds; a failure with log reason `unreachable` or `http_403` points here |
| P8 | **OfficeCRM user** who can search, inspect and delete leads (and see an audit log, if one exists) | Owner | Can find a lead by name `TEST-` and delete it |
| P9 | **Browser with DevTools**, to see `/api/lead` responses and `dataLayer`. Use `?gtm=1` only when GTM should load (it doesn't load on workers.dev otherwise) | Tester | none |

**Unknown until P1:**
- the exact error codes
- whether duplicates are detected
- whether `success:true` means the lead is stored
- the phone and `source` rules
- the rate limits
- where the key is stored and how it is rotated

Each of these changes the "Expected result in OfficeCRM" lines below. Update them after P1.

## 2. Environment setup (isolated)

1. Complete P1 and P2. Note the staging CRM URL and record how a lead is looked up there (list view, search by name).
2. With approval, deploy the two staging Workers (P5) and set their secrets (P6).
3. Open `https://hagarlushi-staging.<account>.workers.dev/` and `https://hagarlushi-lp-staging.<account>.workers.dev/architecture/`. Both pages should load.
4. Cloudflare → Workers → each staging Worker → **Logs** → start live tail. Keep it open during the tests.
5. Run **T0** first. If it fails, stop: the secrets or network path are wrong.

## 3. Tests

Each test lists: **Setup** · **Action** · **HTTP** (the `/api/lead` response in DevTools) · **OfficeCRM** · **Visitor sees** · **Analytics** (`dataLayer`) · **Cleanup**.

### T0: Connectivity smoke test (www)
- **Setup:** §2 done.
- **Action:** on `…hagarlushi-staging…/?utm_source=crmtest&utm_medium=qa&utm_campaign=TEST-<run>`, fill the home form with synthetic data (name `…-00`) and submit.
- **HTTP:** 200 `{"ok":true}`. Worker log: `lead: created in OfficeCRM (leadId <id>)`.
- **OfficeCRM:** exactly one new lead **in staging** with that `<id>`, and none in production.
- **Visitor sees:** the `/thankyou` page.
- **Analytics:** one `generate_lead` (`form_location: home`).
- **Cleanup:** delete the lead in staging.

### T1: Valid lead, main site, each form
- **Action:** submit the **home** form (`/`) and the **contact** form (`/יצירת-קשר`) once each, with name suffixes `-01` and `-02`.
- **HTTP:** 200 `{"ok":true}` for each.
- **OfficeCRM:** exactly **one** lead per submission:
  - `name` and `email` as typed.
  - `phone` as typed (formatting kept).
  - `source` = `website / crmtest / qa`.
  - `notes` contains `טופס: דף הבית` or `טופס: דף יצירת קשר`, `נשלח מהדף: /…`, `קמפיין: utm_source=crmtest, …`, `אתר: hagarlushi-staging…` and the message.
- **Visitor sees:** `/thankyou`.
- **Analytics:** one `generate_lead` each (`home` / `contact`); a refresh of `/thankyou` adds none.
- **Cleanup:** delete both leads.

### T2: Valid lead, each landing-page form
- **Action:** on the lp staging Worker, submit once each on `/`, `/architecture/`, `/interior-design/` and `/renovation/`, with the privacy box ticked (suffixes `-03` to `-06`).
- **HTTP:** 200 `{"ok":true}`.
- **OfficeCRM:** one lead each:
  - `source` = `landing-page / crmtest / qa`.
  - `notes` contains the right form name (`דף נחיתה – ראשי` / `אדריכלות` / `עיצוב פנים` / `שיפוץ`), the page path and `אישור מדיניות פרטיות: כן`.
- **Visitor sees:** `/thankyou/`.
- **Analytics:** one `generate_lead` each (`lp-home`, `lp-architecture`, `lp-interior-design`, `lp-renovation`).
- **Cleanup:** delete all four.

### T3: Exactly one record per accepted submission
- **Action:** after T1 and T2, search OfficeCRM for `TEST-<run>`.
- **Expected:** exactly **6** leads (T1 ×2, T2 ×4), plus T0's lead if it wasn't deleted yet. Each has a distinct `leadId` that matches the Worker log line for that submission. If the CRM has an audit log, it shows one create per lead.
- **Cleanup:** none extra.

### T4: Field mapping and value preservation
- **Action:** one lp submission (suffix `-07`) with:
  - a Hebrew name with a geresh (`בדיקה צ׳ אתר – TEST-<run>-07`)
  - phone `+972 52-431-7164`, or the owner's own number in that format
  - email in mixed case (`Lushi.Office+CRMTEST-07@gmail.com`)
  - a long `utm_campaign` (100 characters)
- **HTTP:** 200.
- **OfficeCRM:**
  - Hebrew characters are intact (no `?` or mojibake).
  - Phone and email are stored exactly as sent. Note whether the CRM normalises them.
  - `notes` keeps its line breaks and isn't cut off.
- **Visitor sees:** `/thankyou/`.
- **Analytics:** one `generate_lead`.
- **Cleanup:** delete. **Record** the CRM's normalisation behaviour; it decides risk R5.

### T5: Missing and invalid required fields (no CRM traffic expected)
- **Action, browser:** on each site, submit with:
  - an empty name
  - an empty phone
  - phone `12345`
  - an empty email
  - email `not-an-email`
  - (lp) the privacy box unticked
- **Action, server:** in DevTools Console, `fetch('/api/lead',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({full_name:'x',phone:'',email:'a@b.co',form:'home'})})`, then repeat with `phone:'123'`.
- **HTTP:**
  - Browser cases: **no request** is made.
  - Server cases: 400 `{"ok":false,"error":"missing_phone","field":"phone"}` and `invalid_phone`.
- **OfficeCRM:** **no** new lead. The Worker log shows nothing, because validation happens before any CRM call.
- **Visitor sees:** the Hebrew message beside the field (`יש להזין שם מלא`, `יש להזין מספר טלפון`, `יש להזין מספר טלפון תקין`, `נא להזין כתובת אימייל תקינה`, `יש לאשר את מדיניות הפרטיות`). Focus moves to the first invalid field.
- **Analytics:** no `generate_lead`.
- **Cleanup:** none.

### T6: Invalid or missing authentication (staging only)
- **Setup:** on **one staging Worker only**, temporarily set `LEADS_WEBHOOK_API_KEY` to a wrong value, e.g. `wrong-key-test`. Then, as a second step, delete the secret.
- **Action:** submit one valid lp form (`-08`) in each state.
- **HTTP:**
  - Wrong key: 502 `{"ok":false,"error":"crm_rejected"}`; Worker log `http_401` (or the CRM's actual code, per P1).
  - Missing secret: 503 `{"ok":false,"error":"not_configured"}`; log `CRM_WEBHOOK_URL / LEADS_WEBHOOK_API_KEY missing or invalid`. **Nothing is sent.**
- **OfficeCRM:** **no** lead.
- **Visitor sees:** the separate failure message (`לא הצלחנו לשלוח את הפרטים כרגע…`) with the site's phone and WhatsApp links. The typed values are kept.
- **Analytics:** no `generate_lead`.
- **Cleanup:** restore the correct staging key, then rerun T0 to confirm.

### T7: CRM validation rejection
- **Setup:** from the P1 code review, pick an input the website accepts but the CRM rejects (e.g. a `source` outside an allowed list, or a too-long field). If none exists, mark this test N/A: the website's rules are then at least as strict as the CRM's.
- **Action:** submit it (`-09`).
- **HTTP:** 502 `crm_rejected`; log `http_4xx`, or `not_confirmed` if the CRM answers 200 with `success:false`.
- **OfficeCRM:** no lead, or exactly as the code says.
- **Visitor sees:** the failure message; values kept; the visitor can retry.
- **Analytics:** no `generate_lead`.
- **Cleanup:** delete anything that was created, and report it. A created lead together with a failure response is a duplicate risk (R1).

### T8: CRM timeout and network failure
- **Timeout:** can't be induced on a real CRM without changing it. It is covered by the automated mock tests (`hang` mode in `test/e2e/mock-office.mjs`: 502 `crm_unreachable`, failure message, no conversion).
- **In the real environment, record the latency** of T1 and T2: in the Worker logs, use wall time per request. If any request is above ~5 s, raise it as R2.
- **Network failure (safe; no data leaves Cloudflare):**
  - **Setup:** on one staging Worker, set `CRM_WEBHOOK_URL` to `https://crm-unreachable.invalid/api/leads/webhook`. The `.invalid` domain never resolves.
  - **Action:** submit one form (`-10`).
  - **HTTP:** 502 `crm_unreachable`; log `unreachable`.
  - **OfficeCRM:** nothing.
  - **Visitor sees:** the failure message; values kept.
  - **Analytics:** no `generate_lead`.
  - **Cleanup:** restore the staging URL; rerun T0.

### T9: Unexpected HTTP responses and malformed bodies
- **Real CRM:** only by observation. Note any non-JSON or 3xx response seen during T0–T7.
- **Automated (mock):** already proven for HTTP 500, `success:false`, a missing `success`, and malformed JSON. Each gives 502 with no conversion (`test/worker.test.mjs`; e2e `success-false` / `500` / `malformed`).
- **Expected:** a body without `"success": true` is **never** treated as a lead, even with HTTP 200.

### T10: Duplicate submissions and retries
- **Double click:** double-click submit on one form (`-11`).
  - **HTTP:** one request.
  - **OfficeCRM:** exactly one lead.
  - **Analytics:** one `generate_lead`.
- **Deliberate resubmission:** submit the same details twice, 30 s apart (`-12`).
  - **OfficeCRM:** record what happens: two leads, a merge, or a rejection with `success:false`.
  - If the second is rejected as a duplicate, the visitor **sees a failure message for a lead that exists**. Report this (CONTRACT R1).
- **Retry after failure:** not testable against the real CRM without a slow CRM. Risk R1 stays open until idempotency is agreed.
- **Cleanup:** delete all.

### T11: Failed submissions never count as conversions
- **Check:** across T5–T9, `dataLayer` shows **no** `generate_lead`, and opening `/thankyou` directly or refreshing it adds none.
- **With GTM:** repeat T6 with `?gtm=1` and GTM Preview. No GA4, Google Ads or Meta lead tag fires.

### T12: WhatsApp and phone clicks are not leads
- **Action:** on both staging Workers, click:
  - the floating WhatsApp button
  - the WhatsApp and phone links in the failure message (triggered by T8 setup)
  - the lp thank-you WhatsApp button
  - (www) the phone and email links
- **HTTP:** **no** `/api/lead` request.
- **OfficeCRM:** no lead.
- **Visitor sees:** WhatsApp opens with the right number: lp `972524317164` with "היי הגר! יש לי פרוייקט…", www `972505788634`. The phone link dials lp `052-431-7164` / www `050-578-8634`.
- **Analytics:** `whatsapp_click` / `phone_click` / `email_click` only; **no** `generate_lead`.
- **Cleanup:** none.

### T13: Logs contain no personal data or secrets
- **Action:** after T0–T10, export or scroll the staging Workers' logs.
- **Expected:**
  - Only lines like `lead: created in OfficeCRM (leadId …)` and `lead: OfficeCRM did not confirm the lead (<reason>)`.
  - **No** name, phone, email, notes, webhook URL or key.
  - Also check the OfficeCRM side's request logs, if any, for logged `Authorization` headers.

### T14: Both Workers point at the same, intended environment
- **Action:** compare T1's and T2's leads: both must be in **staging**, none in production.
- **Before cutover:** repeat T0 once on each **production** Worker (`hagarlushi`, `hagarlushi-lp`) after their production secrets are set. That is §4.

## 4. Production verification (only after §3 passes, with explicit owner approval)

1. Set the production secrets on `hagarlushi` and `hagarlushi-lp` (CLOUDFLARE-PLAN O3/O3b).
2. On each Worker's `workers.dev` address, before any DNS change, submit **one** synthetic lead: `TEST-PROD-<date>`, `utm_source=crmtest`.
3. Confirm one production lead each, with the correct `source` and notes, and a `leadId` that matches the log.
4. Delete both leads at once.
5. Result: **READY FOR PRODUCTION VERIFICATION → verified.**

## 5. Results log (fill in)

| Test | Date | Environment | Result | leadIds | Notes |
|---|---|---|---|---|---|
| T0 |  |  |  |  |  |
| T1 |  |  |  |  |  |
| T2 |  |  |  |  |  |
| T3 |  |  |  |  |  |
| T4 |  |  |  |  |  |
| T5 |  |  |  |  |  |
| T6 |  |  |  |  |  |
| T7 |  |  |  |  |  |
| T8 |  |  |  |  |  |
| T9 |  |  |  |  |  |
| T10 |  |  |  |  |  |
| T11 |  |  |  |  |  |
| T12 |  |  |  |  |  |
| T13 |  |  |  |  |  |
| T14 |  |  |  |  |  |
