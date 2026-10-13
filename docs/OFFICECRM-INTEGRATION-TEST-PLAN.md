# OfficeCRM integration test plan

Status: **2026-10-13 (afternoon). Updated for the OfficeCRM code report. No test has been run against a real OfficeCRM yet.**
Contract, evidence levels and findings F1–F13: `docs/OFFICECRM-INTEGRATION-CONTRACT.md`.

- **No staging exists**, so the first real test runs **locally**: OfficeCRM (`npm run dev`, Firebase emulators, port 3000) together with the website Workers (`wrangler dev`).
- The production CRM is touched **once**, at the end (§4), only with explicit approval.
- The website's automated tests use a fake CRM (`test/e2e/mock-office.mjs`). That fake still models the **old** contract (F12). The tests prove the website's own behaviour, **not** the integration.

## 0. Rules

- **Synthetic data only:**
  - Name: `TEST – website migration <run>-<n>`.
  - Email: an address the owner controls, with a tag, e.g. `lushi.office+crmtest-<run>-<n>@gmail.com`.
  - Phone: a number the owner controls.
  - Message: `בדיקת אינטגרציה – למחוק`.
  - Never use a customer's details.
- **Campaign tag on every page URL:** `?utm_source=crmtest&utm_medium=qa&utm_campaign=TEST-<run>`.
- **One submission per action.** Never auto-retry. Every POST creates a lead (F8).
- **Record for each test:**
  - the `/api/lead` response (DevTools → Network)
  - the `wrangler dev` log line
  - the CRM response, if visible
  - the `leadId` and the document in the emulator UI (`http://127.0.0.1:4000` → Firestore → `leads`)
- **No deploy, DNS change, production secret or production lead**, except §4 with approval.

## 1. Prerequisites

| # | Item | How to verify |
|---|---|---|
| P1 | **OfficeCRM findings accepted as the contract** (CONTRACT §1). Ideally this session also gets read access to the OfficeCRM repository, to cross-check `route.ts` | CONTRACT §1 rows marked CRM-CODE; any re-read confirms the file references |
| P2 | **Owner decisions D1–D9** (CONTRACT §8), at least D3 and D7 | Recorded in CONTRACT §8 |
| P3 | **Website changes A1–A6 implemented and passing** on `cloudflare-migration`. Without them the test "passes" while losing `source` and the message | `npm test` green with the rebuilt mock (A6) |
| P4 | **One machine runs both.** OfficeCRM and the website in the same environment: the owner's computer, or this session if it's given access to the OfficeCRM repo and the emulators install here (they need Java for Firestore). A cloud session can't reach another session's `localhost` | `curl -s http://localhost:3000/api/leads/webhook` (GET **without** parameters) returns the status text. Never call GET with parameters (it creates an empty lead) |
| P5 | **Local OfficeCRM running:** `LEADS_WEBHOOK_API_KEY=local-test npm run dev` (emulators), port 3000, emulator UI on 4000 | The emulator UI shows an empty or known `leads` collection |
| P6 | **Website `.dev.vars`** (git-ignored): `CRM_WEBHOOK_URL=http://localhost:3000/api/leads/webhook` and `LEADS_WEBHOOK_API_KEY=local-test`. `crmConfig()` allows http only for `localhost`/`127.0.0.1` | T0 succeeds |
| P7 | **Both Workers running:** `npm run build`; `npx wrangler dev --port 8787 --inspector-port 9231`; `npx wrangler dev -c wrangler.lp.jsonc --port 8788 --inspector-port 9232 --persist-to <own folder>` (separate state folder, or the two collide) | `http://127.0.0.1:8787/` and `http://127.0.0.1:8788/architecture/` load |
| P8 | **Keyword check on host names:** a local or preview host must not contain `design`, `interior` or `architect`, because the CRM matches on the whole URL (unknown, F1). `127.0.0.1` is safe. Check any `workers.dev` account subdomain before §4 | Visual check |
| P9 | **For §4 only:** the key fingerprint. Compute `printf %s "$KEY" \| shasum -a 256 \| cut -c1-12` on the value from Secret Manager (project `jassign`) and on the value about to go into the Worker secret, and compare only those 12 characters. **Admin access to delete one lead** in the production leads screen | Fingerprints match; delete permission confirmed |

## 2. Tests (local: OfficeCRM on emulators + `wrangler dev`)

**Expected results assume A1–A6 are implemented.** Where today's code would behave differently, it is noted as "today:".

### T0: Connectivity
- **Action:** submit the www home form once (`-00`).
- **HTTP:** `/api/lead` → 200 `{"ok":true}`. Worker log: `lead: created in OfficeCRM (leadId <id>)`.
- **CRM:** one document in `leads` with that id, status "חדש".
- **Visitor:** `/thankyou`.
- **Analytics:** one `generate_lead` (`home`).
- **Cleanup:** delete the document in the emulator UI (or restart the emulators).

### T1: Main-site forms
- **Action:** submit the home form (`-01`) and the contact form (`-02`), each once, with a message.
- **HTTP:** 200 `{"ok":true}` each.
- **CRM:**
  - Exactly one lead each.
  - name, email and phone as typed.
  - Source = `Elementor / דף נחיתה` (D1 accepted) or the B7 category.
  - The **message is not on the lead** (§5 limitation). Confirm it is visible only in `webhook-logs`.
- **Visitor:** `/thankyou`.
- **Analytics:** one `generate_lead` each (`home`, `contact`).
- **Cleanup:** delete both.
- **Today:** source is the fallback anyway, but for the wrong reason (no `page_url`).

### T2: Each landing-page form
- **Action:** submit on lp `/` (`-03`), `/architecture/` (`-04`), `/interior-design/` (`-05`) and `/renovation/` (`-06`), with consent ticked.
- **HTTP:** 200 each.
- **CRM sources:**
  - `/`: `Elementor / דף נחיתה`
  - `/architecture/`: `אדריכלות`
  - `/interior-design/`: `עיצוב פנים`
  - `/renovation/`: `Elementor / דף נחיתה` (D2)
- **Visitor:** `/thankyou/`.
- **Analytics:** one `generate_lead` each (`lp-…`).
- **Cleanup:** delete all four.
- **Today:** every lp lead gets the fallback source (F1).

### T2b: Source-rule edge cases (settles the UNKNOWNs in CONTRACT §4)
Submit once each and record the source the CRM stores:
- `/architecture/?utm_campaign=interior_design` (does the query string change the category? It shouldn't, after A1)
- a `form_name` containing `design` on the lp home page (does `form_name` affect the category?)
- an upper-case path, e.g. `/Architecture/`, sent as a direct API request with a crafted `page_path` (is matching case-sensitive?)

Delete all. Update CONTRACT §4 with the results.

### T3: One record per accepted submission
- **Action:** after T1 and T2, count the documents named `TEST – website migration <run>`.
- **Expected:** exactly 6 (plus T0, if not deleted). Each `leadId` matches its Worker log line, and the `submission_id` (A4) is in `webhook-logs`.

### T4: Field mapping
- **T4a, values:** Hebrew name with a geresh; phone `+972 52-431-7164`; mixed-case email.
  - **Expected:** stored exactly as sent (the CRM doesn't normalise phone, as reported); no mojibake.
- **T4b, email hijack (F3):** a www message containing a second address, e.g. `תחזרו אליי ל-other+crmtest@gmail.com`.
  - **Expected:** the lead's email is the form's email field, not the one in the message.
  - **If not:** A2 must stop sending the message, or B1 is required. Record the result in CONTRACT F3.
- **T4c, message storage probe (§5, informs B1, not a workaround):** one direct POST to the **local** CRM with an Elementor-style field, e.g. `fields[message][value]`.
  - **Record:** whether it appears anywhere staff can see on the lead screen.
- **Cleanup:** delete everything.

### T5: Missing or invalid fields (the website rejects them; the CRM would accept them)
- **Browser:** empty name; empty phone; phone `12345`; empty or invalid email; lp consent unticked.
  - **Expected:** no request; the Hebrew inline message; focus on the first invalid field.
- **API:** `fetch('/api/lead', …)` with `phone:''`, then `phone:'123'`.
  - **Expected:** 400 `missing_phone` / `invalid_phone`.
- **CRM:** **no** new document (essential, because the CRM itself would create a junk lead).
- **Analytics:** no `generate_lead`.
- **Cleanup:** none.

### T6: Authentication
- **Wrong key:** set `.dev.vars` `LEADS_WEBHOOK_API_KEY=wrong`, restart `wrangler dev`, submit once (`-07`).
  - **CRM:** 401, **no** document.
  - **Worker:** 502 (`crm_rejected`, a **definite** failure after A3). Log `http_401`.
  - **Visitor:** the definite-failure message, retry allowed.
  - **Analytics:** no `generate_lead`.
- **Missing key:** remove it from `.dev.vars`, submit once.
  - **Worker:** 503 `not_configured`, **nothing sent**.
  - Same visitor and analytics behaviour.
- **CRM not configured:** run OfficeCRM **without** `LEADS_WEBHOOK_API_KEY`, submit once.
  - **CRM:** 503 `{"success":false,"error":"Webhook is not configured."}`, no document.
  - **Worker:** definite failure.
- **Cleanup:** restore both keys; rerun T0.

### T7: CRM validation rejection
**N/A.** The CRM never returns 400 (CONTRACT F4). Keep T5 as the guard.

### T8: Timeout and network failure
- **Network failure:** stop OfficeCRM (Ctrl-C) and submit once (`-08`).
  - **Worker:** 502, log `unreachable`.
  - **CRM:** nothing (it's down).
  - **Visitor (after A3):** the **uncertain** message, because a mid-request drop can't be told apart from "not sent". It does not invite resubmitting; phone and WhatsApp are offered.
  - **Analytics:** no `generate_lead`.
- **Timeout after save:** can't be produced with the unmodified CRM. Covered by the mock's new `slow-after-save` mode (A6): the lead is stored, the answer comes after the timeout. The Worker reports uncertain; the visitor doesn't resubmit; no conversion.
- **Latency:** record the CRM response times seen in T0–T2. If any is above ~5 s, revisit D6.

### T9: Error after save and malformed responses
- **500 after save:** the real path (the warning-note write failing) can't be triggered safely. Covered by the mock's `500-after-save` mode (A6).
  - **Expected:** the mock stores the lead and returns 500; the Worker reports **uncertain**; no thank-you page; no `generate_lead`; the visitor isn't invited to retry. Staff can find the lead by `submission_id`.
- **Malformed or empty 2xx body:** mock only (`malformed`, `missing-success`). **Expected:** uncertain, never success.

### T10: Duplicates and retries
- **Double click** (`-09`): one request, one document, one `generate_lead`.
- **Deliberate resubmission:** the same details twice, 30 s apart (`-10`).
  - **Expected today and after A1–A6:** **two** documents (no CRM idempotency, F8). Both carry **different** `submission_id`s, because each is a new form fill after the thank-you page.
  - **After B3:** one document.
- **Resubmission after an uncertain outcome:** stop OfficeCRM right after it writes (mock mode, A6), then submit again from the same, unreloaded form.
  - **Expected:** the **same** `submission_id` on both requests (A4).
  - **Without B3:** two leads with the same `submission_id` in `webhook-logs`.
  - **After B3:** one lead.
- **Cleanup:** delete all.

### T11: Failures never count as conversions
Across T5–T10: no `generate_lead`. Opening or refreshing `/thankyou` directly adds none. With `?gtm=1` and GTM Preview, no GA4, Ads or Meta lead tag fires.

### T12: WhatsApp and phone clicks are not leads
- **Action:** click the floating WhatsApp button, the failure-message WhatsApp and phone links, the lp thank-you WhatsApp button, and the www phone and email links.
- **Expected:**
  - **No** `/api/lead` request.
  - **No** CRM document.
  - Only `whatsapp_click` / `phone_click` / `email_click`.
  - Numbers: lp `972524317164` / `tel:+972524317164`; www `972505788634` / `tel:+972505788634`.

### T13: Logs
- **Worker logs:** only `lead: created in OfficeCRM (leadId …)` and `lead: OfficeCRM did not confirm the lead (<reason>)`, plus `submission_id` after A4. No personal data, no URL, no key.
- **Note for the owner:** the CRM's `webhook-logs` hold the **full raw request**, with personal data, for 30 days. That is the CRM's own retention, not the website's.

### T14: Both Workers, same environment
T1 and T2 leads all land in the same local emulator. Before §4, compute the key fingerprint (P9) for **both** production Workers.

## 3. What the automated tests do and don't cover (gaps)

| Area | Covered by `npm test` / e2e today | Gap |
|---|---|---|
| Website validation, inline messages, focus, no request on invalid input | ✅ | none |
| Success only on 2xx + `success:true`; failures → no conversion | ✅ | none |
| WhatsApp and phone never leads | ✅ | none |
| Payload shape | Asserts `{name, phone, email, source, notes}` | ❌ asserts fields the CRM ignores or drops; no `page_url`/`form_name` (F1, F12) |
| Mock CRM behaviour | Returns 400 for missing fields; needs `source` | ❌ the real CRM never returns 400 and ignores `source`; no 500-after-save; no slow-after-save (F12) |
| Uncertain vs definite failure | Not distinguished | ❌ (A3) |
| Duplicate identification | none | ❌ (A4) |
| Real CRM | none | ❌ needs §2 locally |

## 4. Production verification (only after §2 passes, with explicit owner approval)

1. Fingerprints match (P9). Set the production secrets on `hagarlushi` and `hagarlushi-lp`.
2. On each Worker's `workers.dev` address (P8 host check first), submit **one** lead:
   - name `TEST – website migration PROD`
   - `page_url` path `/architecture/` for lp, `/` for www
   - `utm_source=crmtest`
3. One POST each, **no retries**.
4. Confirm one lead each in the production leads screen (status "חדש", the expected source). An admin deletes both immediately.

## 5. Results log

| Test | Date | Environment | Result | leadIds | Notes |
|---|---|---|---|---|---|
| T0 |  |  |  |  |  |
| T1 |  |  |  |  |  |
| T2 |  |  |  |  |  |
| T2b |  |  |  |  |  |
| T3 |  |  |  |  |  |
| T4a–c |  |  |  |  |  |
| T5 |  |  |  |  |  |
| T6 |  |  |  |  |  |
| T8 |  |  |  |  |  |
| T9 |  |  |  |  |  |
| T10 |  |  |  |  |  |
| T11 |  |  |  |  |  |
| T12 |  |  |  |  |  |
| T13 |  |  |  |  |  |
| T14 |  |  |  |  |  |
