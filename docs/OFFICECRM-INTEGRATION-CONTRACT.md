# OfficeCRM integration contract (website ↔ OfficeCRM)

Status: **2026-10-13 (afternoon). Contract established, with known mismatches. No website code has been changed for it yet.**
Companion: `docs/OFFICECRM-INTEGRATION-TEST-PLAN.md`.

## 0. Evidence levels

| Label | Meaning |
|---|---|
| **CRM-CODE (reported)** | From the code-based report written by the Claude session that built OfficeCRM (2026-10-13, saved in that session as `claude/website-lead-integration.md`). It read the code and ran the handler locally against a fake database. **This session still cannot open the OfficeCRM repository**, so these points are reported, not independently re-read here. |
| **WEBSITE-CODE (verified)** | Read in this repository, branch `cloudflare-migration`, commit `e37a8c0`. |
| **ASSUMPTION / UNKNOWN** | Not established by either code reading. To be settled in the local emulator test (test plan). |
| **DEPLOYMENT (unverified)** | What the live `office.` deployment actually runs. Nobody has called it, and nothing here has been sent to it. |

## 1. The OfficeCRM endpoint (CRM-CODE, reported)

| Item | Reported behaviour | Source in OfficeCRM (as reported) |
|---|---|---|
| Route | `POST /api/leads/webhook` | `src/app/api/leads/webhook/route.ts`, export `POST` |
| Host | The production app on the `office.` subdomain (also reachable at its Firebase App Hosting address). The full URL is kept out of this repo by project rule | `apphosting.yaml` |
| Auth redirect | `src/proxy.ts` skips `/api/*`, so the webhook is not redirected to login | `src/proxy.ts` |
| Content types | `application/json`, plus form-urlencoded and multipart (originally built for Elementor) | `route.ts` |
| Auth | `Authorization: Bearer <key>`. "Bearer " is stripped case-insensitively and the rest compared to `LEADS_WEBHOOK_API_KEY`. The comparison **is not constant-time**. A `?api_key=` query parameter is also accepted (don't use it) | `route.ts` |
| Secret | `LEADS_WEBHOOK_API_KEY` in Google Secret Manager (project `jassign`), injected via `apphosting.yaml`. If it's missing, every request gets **503** | `apphosting.yaml` |
| Also exists | `GET` on the same route: without parameters it returns a status text; **with parameters it calls `POST` with an empty body and creates an empty lead.** The website must never use GET | `route.ts` |
| Field extraction | **No schema, no validation, no required fields, no length limits.** Fields are found by matching words in the key names (fallback extractor) | `route.ts` |
| `name` | Used. If missing: the lead is saved as "ליד חדש מ-Elementor", gets a "partial match" warning note, and an alert email is sent | `route.ts` |
| `phone` | Stored exactly as sent, no normalisation | `route.ts` |
| `email` | Taken from **any** field whose value contains "@" and ".". A `notes` value containing an address became the lead's email when no `email` field was sent. Behaviour when **both** are sent: **UNKNOWN** | `route.ts` |
| `source` | **Ignored.** The source is derived from `page_url` (or `url`) plus `form_name`: a URL containing `interior` or `design` → `עיצוב פנים`; containing `architect` → `אדריכלות`; otherwise `Elementor / דף נחיתה` | `route.ts` |
| `notes` | **Dropped.** Only Elementor-style `fields[...][value]` text fields are read. The raw request survives only in `webhook-logs`, auto-deleted after 30 days | `route.ts` |
| CRM-written notes | The partial-match warning and consent are saved as notes with `type: 'NOTE_ADDED'`, which the lead screen **filters out**: nobody sees them | `lead-details-sheet.tsx` |
| Success | `200 {"success":true,"leadId":"<Firestore id>","message":"Lead created successfully"}`. The Firestore write (`addLead`) is **awaited**, so the lead is stored when this is returned | `src/lib/data.ts` `addLead` |
| Errors | `401 {"success":false,"error":"Unauthorized. Invalid API Key."}` · `503 {"success":false,"error":"Webhook is not configured."}` · `500 {"success":false,"error":"<message>"}`. **There is never a 400**: invalid or empty input returns 200 and creates a lead | `route.ts` |
| Saved-then-error | In the partial-match path, if adding the warning note fails **after** the lead is written, the response is **500**. Any timeout after the write leaves the caller without an answer | `route.ts` |
| Duplicates | **No idempotency key, no duplicate check.** Every POST creates a new lead | `addLead` |
| Environments | **No staging.** The only safe environment is local: `npm run dev` against the Firebase emulators, port 3000, with the key set by hand (`LEADS_WEBHOOK_API_KEY=local-test`). Emulator UI on `127.0.0.1:4000` | report §6 |
| Restrictions | No IP allowlist, no rate limit, no WAF; CORS `*`; at most 2 backend instances | `apphosting.yaml` |
| Finding a lead | The `leadId` is a document in the `leads` collection. It appears in the CRM's leads screen with status "חדש" | report §6 |

## 2. What the website does today (WEBSITE-CODE, verified)

| Aspect | Current implementation | Where |
|---|---|---|
| Browser → Worker | The forms send `full_name, phone, email, message (www), consent (lp), form, page_url (= location.href without #, **including the query string**), page_path, landing_page, utm_*, gclid, fbclid, referrer, submitted_at, site` | `ContactForm.astro` (lines ~125–140), `LpLeadForm.astro` (lines ~85–95) |
| Worker validation | Stricter than the CRM: name required; phone required and valid; email valid; lp consent required; known `form` ids only → 400 `{error, field}` | `validateLead()` in `worker/index.js`, `src/lib/lead-rules.js` |
| Worker → CRM body | `{ name, phone, email, source, notes }`. **`page_url` and `form_name` are not forwarded** | `toCrmPayload()` |
| `source` | `website / <channel>` or `landing-page / <channel>` | `leadSource()`: **ignored by the CRM** |
| `notes` | Hebrew text containing the visitor's **message** (www), form name, pages, UTMs, gclid/fbclid, referrer, host, the consent line and the time | `leadNotes()`: **dropped by the CRM** |
| Headers | `Content-Type: application/json`, `Accept: application/json`, `Authorization: Bearer <key>` | `forwardToCrm()` |
| Method | Always `POST`, never GET | `forwardToCrm()` |
| Timeout | 10 s | `CRM_TIMEOUT_MS` |
| Success rule | HTTP 2xx **and** JSON body **and** `success === true` → `{ok:true}` → thank-you page → one `generate_lead` | `forwardToCrm()`, `submitLead()`, `recordLeadConversion()` |
| Failure mapping | Thrown error (network/timeout) → 502 `crm_unreachable`; any non-2xx, non-JSON, or `success` ≠ true → 502 `crm_rejected`; missing secrets → 503 `not_configured` (nothing sent) | `forwardToCrm()`, `handleLead()` |
| Browser on failure | One message for every failure: "לא הצלחנו לשלוח את הפרטים כרגע. אפשר לנסות שוב או ליצור קשר בטלפון או בוואטסאפ." Values kept, button re-enabled, **retry invited** | `DELIVERY_FAILED_TEXT` in `lead-rules.js`; `ContactForm.astro` 157–158; `LpLeadForm.astro` 105–106 |
| Retries | No automatic retry anywhere. The visitor can resubmit | `handleLead()`, the forms |
| Duplicate guard | Button disabled while one request is in flight. No submission ID | the forms |
| Logs | Reason codes and `leadId` only; no personal data or secrets (tested) | `handleLead()` |

## 3. Which findings affect the website

| # | Finding (CRM-CODE) | Effect on the current website | Affected code | Status |
|---|---|---|---|---|
| F1 | `source` ignored; source derived from `page_url` + `form_name` | Every website lead would get the fallback source `Elementor / דף נחיתה`, because `page_url` is never forwarded. Architecture and interior-design leads lose their category | `toCrmPayload()`, `leadSource()` | **MISMATCH** |
| F2 | `notes` dropped | The visitor's **message** (main-site forms), campaign attribution (UTMs, gclid/fbclid, referrer, entry page) and the **lp consent record** are not stored on the lead. They survive only in `webhook-logs` for 30 days | `leadNotes()`, `toCrmPayload()` | **MISMATCH**: unresolved without a CRM change (§5) |
| F3 | `email` taken from any field with "@" and "." | We always send `email`, but `notes` (or a message) may contain another address. Which one wins when both exist is **UNKNOWN** | `toCrmPayload()` | **RISK**: test locally (TP T4b) |
| F4 | No validation; never 400 | No effect on correctness, because the website validates first and more strictly. A request that bypasses our validation can't reach the CRM: the Worker is the only caller with the key | `validateLead()` | **MATCH** (website compensates) |
| F5 | Success = 200 `{success:true, leadId, message}`, written synchronously | Our rule (2xx + `success === true`) recognises it; the extra `message` field is harmless | `forwardToCrm()` | **MATCH** |
| F6 | 401 / 503 / 500 with `success:false` | All correctly treated as "not confirmed"; no false success | `forwardToCrm()` | **MATCH** |
| F7 | 500 possible **after** the lead was saved; a timeout may also follow a save | The visitor is told it failed and invited to retry → a **duplicate lead** if they do. No conversion is recorded for a lead that does exist (under-count, not over-count) | `forwardToCrm()`, `DELIVERY_FAILED_TEXT`, the forms | **MISMATCH** (honesty and duplicates) |
| F8 | No idempotency | Any resubmission creates a second lead | the forms, `toCrmPayload()` | **NOT IMPLEMENTED** (both sides) |
| F9 | GET with parameters creates an empty lead | Not affected: the Worker only POSTs | `forwardToCrm()` | **MATCH** |
| F10 | Key accepted via `?api_key=` | Not affected: the website uses the header only | `forwardToCrm()` | **MATCH** |
| F11 | No staging; local emulators only | The test plan's staging steps don't apply. Testing is local first | test plan | **UPDATED** |
| F12 | Mock CRM differs from the real one | `test/e2e/mock-office.mjs` returns **400** for missing fields and needs `source`; the real CRM never returns 400 and ignores `source`. Unit tests assert `source`/`notes` content the CRM throws away | `test/e2e/mock-office.mjs`, `test/worker.test.mjs` | **GAP**: tests prove an outdated contract |
| F13 | CRM-written notes are hidden (`NOTE_ADDED`) | Even if the website's text were saved as a CRM note, staff would not see it | (CRM) | **CRM-side** |

## 4. `page_url` and `form_name` for each form

The CRM rule, as reported: the URL contains `interior` or `design` → `עיצוב פנים`; contains `architect` → `אדריכלות`; else `Elementor / דף נחיתה`.

**UNKNOWN in the reported rule** (settle in TP T2b before relying on it):
- whether the match is case-insensitive
- whether it uses the whole URL (host and query string) or only the path
- which rule wins when both match
- what `form_name` contributes

**Proposed `page_url`:** built by the Worker as `<request origin><page_path>`, with **no query string**. Today the browser's `page_url` includes the query string, so a campaign tag could change the category. For example, `/architecture/?utm_campaign=interior_design` contains "interior" and "design", which would flip it to `עיצוב פנים` if that rule is checked first. The origin is the Worker's own (`isSameOrigin()` already guarantees it). On a `workers.dev` preview, the host is the preview address; keywords in the path still decide.

**Proposed `form_name`:** the existing form id (below). Its effect on the source is unknown, so it is chosen to be harmless: it contains the same keyword as its page, or none.

| Form | Where | `form` id → `form_name` | `page_url` sent (production) | Category by the reported rule | Intended? |
|---|---|---|---|---|---|
| Main site, home | `www` `/` | `home` | `https://www.hagarlushi.com/` | `Elementor / דף נחיתה` (fallback) | **No**: it's not an Elementor landing page. Needs a CRM rule or owner acceptance (D1) |
| Main site, contact | `www` `/יצירת-קשר` | `contact` | `https://www.hagarlushi.com/%D7%99%D7%A6%D7%99%D7%A8%D7%AA-%D7%A7%D7%A9%D7%A8` | `Elementor / דף נחיתה` (fallback) | **No**, as above (D1) |
| lp, home | `lp` `/` | `lp-home` | `https://lp.hagarlushi.com/` | `Elementor / דף נחיתה` | Yes: same as today's WordPress form (assumed) |
| lp, architecture | `lp` `/architecture/` | `lp-architecture` | `https://lp.hagarlushi.com/architecture/` | `אדריכלות` | Yes |
| lp, interior design | `lp` `/interior-design/` | `lp-interior-design` | `https://lp.hagarlushi.com/interior-design/` | `עיצוב פנים` | Yes |
| lp, renovation | `lp` `/renovation/` | `lp-renovation` | `https://lp.hagarlushi.com/renovation/` | `Elementor / דף נחיתה` (fallback) | **Owner decision** (D2): the CRM has no renovation category |

What the WordPress Elementor form sends as `form_name` today is **UNKNOWN** (WordPress admin needed). If staff reports filter on it, match it.

## 5. The visitor's message (unresolved limitation)

- The main-site forms have a free-text **message** field ("במה אוכל לעזור?" / "הודעה"). The lp forms have none.
- With the current CRM, **no JSON shape is known that stores the message where staff can see it**:
  - `notes` is dropped (F2).
  - Elementor-style `fields[...][value]` text is read, but where it is stored is not stated. The only CRM-written notes we know of are `NOTE_ADDED`, which the lead screen hides (F13).
- **Honest status: the message is NOT saved in OfficeCRM today.** It only survives in the raw `webhook-logs` for 30 days, which staff don't see in the lead screen.
- The website must not claim otherwise and must not silently discard it. Options for the owner (D3):
  - **(a) Fix it in OfficeCRM (recommended):** read an explicit `message`/`notes` field and show it on the lead.
  - **(b) Launch the main-site forms knowing the message is lost:** the CRM lead exists, and staff must ask the visitor again.
  - **(c) Keep the main-site forms off OfficeCRM until (a)** (e.g. keep Wix, or email them). Requires a separate decision.
  - Local test T4c will check, with the emulator only, whether an Elementor-style field would be stored visibly. It informs (a); it is not a workaround to ship untested.
- **The same limitation applies to:**
  - campaign attribution (UTMs, gclid, fbclid, referrer, entry page)
  - the **lp privacy-consent record**, which is stored only as text the CRM drops or hides. The fact that consent was given is not recorded on the lead, which is a legal record-keeping gap (D4).

## 6. Confirmed vs failed vs uncertain

| Outcome | When | Lead in CRM? | Today's website behaviour | Correct? |
|---|---|---|---|---|
| **Confirmed** | 2xx + `success:true` | Yes, exactly one (synchronous write) | Thank-you page, one `generate_lead` | ✅ |
| **Definitely not saved** | Worker 503 `not_configured` (nothing sent); CRM 401; CRM 503 | No | Failure message, retry invited, no conversion | ✅ (retry is safe) |
| **Uncertain** | CRM 500 (may be after save); timeout (may be after save); network error mid-request; non-JSON; 2xx without `success:true` | **Maybe** | The same failure message, **retry invited**, no conversion | ❌ Retry may duplicate; the message implies "not sent" |
| Spam trap | Honeypot filled | No (nothing sent) | Thank-you page, no conversion | ✅ by design |

- **No path shows success, or fires `generate_lead`, without a confirmed lead.** Verified in code and covered by `test/worker.test.mjs` and the e2e tests.
- The only misrepresentation is the opposite one: an uncertain outcome is presented as a definite failure that invites resubmission.

## 7. Proposed changes (not implemented; for approval)

### A. Website-only (compatible with today's OfficeCRM)

| # | Change | Where | Why |
|---|---|---|---|
| A1 | Send `page_url` = `<origin><page_path>` (no query) and `form_name` = form id; stop sending `source` | `toCrmPayload()`, `handleLead()` (origin) | F1: correct category for architecture and interior-design; deterministic |
| A2 | Decide what, if anything, to send instead of `notes`. **Proposal:** send `message` (www) and `submission_id` as top-level fields. They are kept in `webhook-logs` for 30 days for manual recovery, and the lead itself is unaffected. **Don't** send the attribution and consent text block until the CRM stores it. Verify F3 (email hijack) locally first | `toCrmPayload()`, `leadNotes()` | F2/F3: stop pretending `notes` is stored, and minimise data the CRM can't use |
| A3 | Split failures into **definite** (Worker 503, CRM 401/503 → today's message, retry is fine) and **uncertain** (CRM 5xx/timeout/network/malformed/2xx-without-success). Uncertain shows a new message that doesn't invite resubmitting, and offers phone/WhatsApp. Proposed text (needs approval, D5): "לא קיבלנו אישור שהפרטים נקלטו. ייתכן שהם התקבלו בכל זאת, ולכן כדאי לא לשלוח שוב. אפשר ליצור קשר בטלפון או בוואטסאפ." | `forwardToCrm()` (reason codes), `handleLead()` (502 `crm_uncertain` vs `crm_rejected`), `lead-rules.js`, both forms | F7: honesty; prevents most duplicates |
| A4 | A `submission_id` (random UUID) per form fill, kept for that fill across resubmits. Sent as a field and as an `Idempotency-Key` header (ignored today, ready for B3). Logged by the Worker (not personal data) | both forms, `lead-client.js`, `forwardToCrm()` | F8: lets staff identify duplicates in `webhook-logs`; future-proof |
| A5 | Raise the CRM timeout from 10 s to 20 s (App Hosting cold starts; max 2 instances) | `CRM_TIMEOUT_MS` | Fewer uncertain outcomes (D6) |
| A6 | Rebuild the mock CRM and tests on the real contract: 200 for anything with a valid key, 401/503/500 shapes, a 500-after-save mode, source derivation from `page_url`, `notes` ignored; per-form `page_url`/`form_name` assertions; remove assertions on `source`/`notes` content | `test/e2e/mock-office.mjs`, `test/worker.test.mjs`, `test/e2e/forms.e2e.mjs` | F12 |
| A7 | Optional diagnostic event `lead_delivery_uncertain` (no personal data); never `generate_lead` | `lead-client.js`, `docs/ANALYTICS-EVENTS.md` | Visibility of uncertain outcomes |

### B. Need OfficeCRM development (not in this repository)

| # | Change | Closes |
|---|---|---|
| B1 | Read explicit `source` (or a website category), `message` and `notes`, and show them on the lead | F1 (main-site category), F2, §5 |
| B2 | Store consent explicitly (field or visible note) | D4 |
| B3 | Honour an `Idempotency-Key` header / `submission_id`: return the existing lead for a repeat | F7, F8 |
| B4 | Never return 500 after a successful write (make the warning note best-effort), or return the `leadId` with a distinct status | F7 |
| B5 | Validate required fields and return 400 | F4 (defence in depth) |
| B6 | Make CRM-written notes visible (fix `NOTE_ADDED` filtering) | F13 |
| B7 | Add a category for main-site leads and for renovation | D1, D2 |
| B8 | Constant-time key comparison; remove `?api_key=` and the GET-creates-lead path | security |

## 8. Decisions required from the owner

| # | Decision |
|---|---|
| D1 | Main-site leads will show source `Elementor / דף נחיתה` unless OfficeCRM changes (B7). Accept for now, or require B7 before launch? |
| D2 | Renovation leads fall back to `Elementor / דף נחיתה`. Accept, or add a CRM category? |
| D3 | The visitor's message is not stored in OfficeCRM today. Choose 5(a), (b) or (c) |
| D4 | lp consent isn't recorded on the lead. Accept temporarily, or require B2 before the lp cutover? |
| D5 | Approve the proposed "uncertain outcome" Hebrew text (A3) |
| D6 | Approve the 20 s timeout (A5) |
| D7 | Approve website changes A1–A6 (A7 optional) |
| D8 | Request OfficeCRM changes B1–B8 (which ones, and before or after launch) |
| D9 | Since `notes` is dropped, approve **not** sending attribution/consent text (A2), or keep sending it for the 30-day `webhook-logs` copy |

## 9. Recommendation

**BLOCKED** for production verification. Ready for an isolated **local** test once D3/D7 are decided and A1–A6 are implemented. Testing the current code would "pass" while silently losing `source`, `notes` and the message.
- **Evidence:** F1 and F2 mismatches; F7/F8 duplicate risk; no staging (F11); the mock-based tests prove an outdated contract (F12).
- **Also required:** OfficeCRM and the website must run on the **same machine** for the local test, because this cloud session can't reach another session's `localhost`. See test plan §1.
