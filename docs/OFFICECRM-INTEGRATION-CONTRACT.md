# OfficeCRM integration contract (website ↔ OfficeCRM)

Status: **2026-10-14. The website implements the confirmed `website-v1` request contract** (OfficeCRM branch `website-lead-contract-v2`, commit `76b99cc`, which passes its own unit and Firestore-emulator tests, as reported by the OfficeCRM workstream). It is verified against a **fake** CRM only. **The real local end-to-end test has not run yet** (§0b).

Companions: `docs/OFFICECRM-INTEGRATION-TEST-PLAN.md`, `docs/OFFICECRM-CHANGE-REQUEST.md` (for the OfficeCRM workstream).
Sections 1–5 below describe the **old** OfficeCRM behaviour that led to the change request. They are kept as history, because the legacy Elementor path still behaves that way until the lp cutover (D12).

## 0b. Current state: `website-v1` (website side implemented 2026-10-14)

**Request: confirmed by the owner from the OfficeCRM workstream (2026-10-14).** Implemented exactly:

| Item | Website implementation | Code |
|---|---|---|
| Headers | `Content-Type: application/json`, `Accept: application/json`, `Authorization: Bearer <key>`, **`Idempotency-Key: <submission_id>`** | `forwardToCrm()` |
| `contract` | `"website-v1"` | `CRM_CONTRACT` (`src/lib/lead-rules.js`) |
| `submission_id` | UUID v4, exactly equal to the header | `currentSubmission()` / `newSubmissionId()` (`src/lib/lead-client.js`); validated by `UUID_RE` in `validateLead()` |
| `lead_source` | One of `website-home`, `website-contact`, `lp-home`, `lp-architecture`, `lp-interior-design`, `lp-renovation`, from the validated form id only | `LEAD_SOURCES`, `toCrmPayload()` |
| `name` | Required, trimmed, ≤ 200 | `validateLead()` |
| `phone` | Required, ≤ 40, as typed. The website also requires a valid number (`isValidPhone`), which is stricter | `validateLead()` |
| `email` | Required, ≤ 254. The website also requires a valid format, which is stricter | `validateLead()` |
| `message` | Optional, ≤ 5,000; omitted when empty (main-site forms only) | `validateLead()`, `toCrmPayload()` |
| `context` | Required: `site` (the Worker's own host), `page_url` (origin + path, no query), `form_name` (= `lead_source`), `submitted_at`. Plus `landing_page`, `referrer`, `utm_source/medium/campaign/term/content`, `gclid`, `fbclid` when present | `toCrmPayload()` |
| `consent` | Landing-page forms only: `{ given: true, text: "קראתי ומאשר/ת את מדיניות הפרטיות", policy_url: "<site>/privacy/", given_at: <submitted_at> }`. The text equals the displayed label (tested) and stays subject to the owner's privacy-policy review | `CONSENT_TEXT`, `toCrmPayload()` |
| `source`, `notes`, `referrerName` | **Not sent** (tested) | `toCrmPayload()` |

**Idempotency (website side):**
- One `submission_id` per enquiry, stored per form in `sessionStorage` together with its `submitted_at`, so a pure resend is byte-identical (tested).
- **Reused** for every resend of the same enquiry: after "not saved", after "uncertain", after a reload, after editing.
- **Cleared only on a confirmed lead**, so a new enquiry gets a new ID.
- Falls back to in-memory storage if `sessionStorage` is blocked.
- **No automatic retry.**

**Responses: NOT read from OfficeCRM's code or documentation by this workstream.** The OfficeCRM repository isn't accessible to this session, and the owner's message didn't include the response bodies. So the website relies only on these rules, which hold whatever the exact body is:

| OfficeCRM answer | Website outcome | Visitor | Conversion |
|---|---|---|---|
| 2xx with `success: true` (with or without `duplicate: true`) | **confirmed** | thank-you page | exactly one `generate_lead` (the ID is cleared at this point) |
| 400, 401, 403, 404, 405, 415, 422, 503 | **not saved** (the CRM rejected it before writing) | retry message | none |
| 409, any 5xx, timeout (20 s), dropped connection, non-JSON, 2xx without `success: true` | **unknown** | approved uncertain message, no resubmit invited | none |

- A 4xx validation rejection is **never** treated as uncertain (tested).
- An unknown outcome is **never** shown as success or as a definite failure (tested).
- **To verify against OfficeCRM `76b99cc`** (needed before the real test):
  - the exact success and duplicate bodies
  - the exact 400 body and field names
  - whether a concurrent same-key request answers 409 or waits
  - how an edited resend is answered and stored
  - that no 500 follows a write
  - the email validation rule

  The fake CRM uses the proposed schema (CHANGE-REQUEST §5) for these.

**Verification (2026-10-14, fake CRM only; no real CRM contacted):**

| Check | Result |
|---|---|
| `npm test` | **89/89** pass |
| Browser, forms, both sites, desktop + mobile (`test/e2e/forms.e2e.mjs`) | **336/336** |
| Browser, main-site round trip (`test/e2e/main-site.e2e.mjs`) | **44/44** |
| Browser, lost response through the response-dropping proxy (`test/e2e/lost-response.e2e.mjs`) | **5/5** |
| `npm run build` | 35 pages |
| `npm run check-launch` | 1 item, by design: the privacy policy is pending the owner's review |
| `wrangler deploy --dry-run`, both Workers | valid (1,431 / 259 files) |

**What those tests cover:**
- all six form ids, with the right `lead_source` and category label
- consent wording, policy URL and time
- message and context mapping; no `source`/`notes`
- `Idempotency-Key` equal to `submission_id`
- website and CRM validation failures (CRM 400 → "not saved")
- 409 and 5xx → "uncertain"
- **duplicate replay after a lost response:** one lead, one conversion
- **edited resend:** one lead plus a revision
- lost response + reload; a new enquiry gets a new ID
- WhatsApp and phone clicks are never leads

**Still preventing the real local end-to-end test:**
1. **OfficeCRM `website-lead-contract-v2` (`76b99cc`) isn't reachable from this session**, so the response schema above can't be checked. Either give this session read access to the OfficeCRM repository, or send its contract documentation, i.e. the response bodies and validation rules.
2. **Both apps must run on one machine:** OfficeCRM `npm run dev` with the Firebase emulators (port 3000, `LEADS_WEBHOOK_API_KEY=local-test`), plus the two Workers via `wrangler dev`. This session can't reach another session's `localhost`. That means either the owner's computer, or this session once it can clone OfficeCRM (with Java for the Firestore emulator).
3. **Still owner-pending, not blocking the local test:** the privacy-policy review (consent wording).

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

## 2. What the website did before `website-v1` (WEBSITE-CODE, 2026-10-13; superseded by §0b)

| Aspect | Current implementation | Where |
|---|---|---|
| Browser → Worker | The forms send `full_name, phone, email, message (www), consent (lp), form, page_url (= location.href without #, **including the query string**), page_path, landing_page, utm_*, gclid, fbclid, referrer, submitted_at, site` | `ContactForm.astro` (lines ~125–140), `LpLeadForm.astro` (lines ~85–95) |
| Worker validation | Stricter than the CRM: name required; phone required and valid; email valid; lp consent required; known `form` ids only → 400 `{error, field}` | `validateLead()` in `worker/index.js`, `src/lib/lead-rules.js` |
| Worker → CRM body | `{ name, phone, email, source, notes }`. **`page_url` and `form_name` are not forwarded** | `toCrmPayload()` |
| `source` | `website / <channel>` or `landing-page / <channel>` | `leadSource()`: **ignored by the CRM** |
| `notes` | Hebrew text containing the visitor's **message** (www), form name, pages, UTMs, gclid/fbclid, referrer, host, the consent line and the time | `leadNotes()`: **dropped by the CRM** |
| Headers | `Content-Type: application/json`, `Accept: application/json`, `Authorization: Bearer <key>` | `forwardToCrm()` |
| Method | Always `POST`, never GET | `forwardToCrm()` |
| Timeout | **20 s** (owner, provisional, 2026-10-13). Each log line includes the CRM response time in ms | `CRM_TIMEOUT_MS`, `forwardToCrm()` |
| Success rule | HTTP 2xx **and** JSON body **and** `success === true` → `{ok:true}` → thank-you page → one `generate_lead` | `forwardToCrm()`, `submitLead()`, `recordLeadConversion()` |
| Failure mapping | Thrown error (network/timeout) → 502 `crm_unreachable`; any non-2xx, non-JSON, or `success` ≠ true → 502 `crm_rejected`; missing secrets → 503 `not_configured` (nothing sent) | `forwardToCrm()`, `handleLead()` |
| Browser on failure (**changed 2026-10-13**) | Two outcomes:
- **Not saved** (Worker refused before calling the CRM, or OfficeCRM answered 400/401/403/404/405/415/422/503): "לא הצלחנו לשלוח את הפרטים כרגע. אפשר לנסות שוב או ליצור קשר בטלפון או בוואטסאפ." Retrying is safe.
- **Unknown** (OfficeCRM 500 or other 5xx, timeout, dropped connection, unreadable or unconfirmed answer, or our own endpoint's answer lost): the owner-approved text "לא ניתן לוודא שהפרטים נקלטו. ייתכן שהם נשמרו בכל זאת, ולכן מומלץ לא לשלוח את הטופס שוב כרגע. אפשר ליצור קשר בטלפון או בוואטסאפ." No resubmit is invited.

Both keep the typed values, show this site's phone and WhatsApp, and record no conversion | `NOT_SAVED_STATUSES` + `forwardToCrm()` + `handleLead()` (502 `crm_rejected`/`not_saved` vs 502 `crm_uncertain`/`unknown`); `sendLead()`/`submitLead()` in `lead-client.js` ('failed' vs 'uncertain'); `DELIVERY_FAILED_TEXT`, `DELIVERY_UNCERTAIN_TEXT` in `lead-rules.js`; both forms |
| Retries | No automatic retry anywhere. The visitor can resubmit | `handleLead()`, the forms |
| Duplicate guard | Button disabled while one request is in flight. No submission ID | the forms |
| Logs | `lead: created in OfficeCRM (leadId …, N ms)` / `lead: OfficeCRM did not confirm the lead (<reason>, <not_saved\|unknown>, N ms)`; no personal data or secrets (tested) | `handleLead()` |

## 3. Which findings affect the website

| # | Finding (CRM-CODE) | Effect on the current website | Affected code | Status |
|---|---|---|---|---|
| F1 | `source` ignored; source derived from `page_url` + `form_name` | Every website lead would get the fallback source `Elementor / דף נחיתה`, because `page_url` is never forwarded. Architecture and interior-design leads lose their category | `toCrmPayload()`, `leadSource()` | **MISMATCH** |
| F2 | `notes` dropped | The visitor's **message** (main-site forms), campaign attribution (UTMs, gclid/fbclid, referrer, entry page) and the **lp consent record** are not stored on the lead. They survive only in `webhook-logs` for 30 days | `leadNotes()`, `toCrmPayload()` | **MISMATCH**: unresolved without a CRM change (§5) |
| F3 | `email` taken from any field with "@" and "." | We always send `email`, but `notes` (or a message) may contain another address. Which one wins when both exist is **UNKNOWN** | `toCrmPayload()` | **RISK**: test locally (TP T4b) |
| F4 | No validation; never 400 | No effect on correctness, because the website validates first and more strictly. A request that bypasses our validation can't reach the CRM: the Worker is the only caller with the key | `validateLead()` | **MATCH** (website compensates) |
| F5 | Success = 200 `{success:true, leadId, message}`, written synchronously | Our rule (2xx + `success === true`) recognises it; the extra `message` field is harmless | `forwardToCrm()` | **MATCH** |
| F6 | 401 / 503 / 500 with `success:false` | All correctly treated as "not confirmed"; no false success | `forwardToCrm()` | **MATCH** |
| F7 | 500 possible **after** the lead was saved; a timeout may also follow a save | **Website side fixed 2026-10-13:** these are now "unknown". The visitor sees the uncertain message, no resubmit is invited, and no conversion is recorded. Tested with the fake CRM's `500-after-save` and `slow-after-save` modes (the lead exists, the visitor sees no success). Remaining CRM side: B4 | `forwardToCrm()`, `NOT_SAVED_STATUSES`, `lead-client.js`, both forms | **WEBSITE DONE**, CRM B4 requested |
| F8 | No idempotency | Any resubmission creates a second lead | the forms, `toCrmPayload()` | **NOT IMPLEMENTED** (both sides) |
| F9 | GET with parameters creates an empty lead | Not affected: the Worker only POSTs | `forwardToCrm()` | **MATCH** |
| F10 | Key accepted via `?api_key=` | Not affected: the website uses the header only | `forwardToCrm()` | **MATCH** |
| F11 | No staging; local emulators only | The test plan's staging steps don't apply. Testing is local first | test plan | **UPDATED** |
| F12 | Mock CRM differs from the real one | **Fake CRM rebuilt 2026-10-13** to the reported real behaviour: no 400, real 401/503 bodies, `500-after-save`, `slow-after-save`, `source`/`notes` not stored, every POST saved. The remaining assertions on `source`/`notes` **content** describe today's payload and change with A1/A2 | `test/e2e/mock-office.mjs`, `test/worker.test.mjs`, `test/e2e/*.e2e.mjs` | **PARTLY DONE** |
| F13 | CRM-written notes are hidden (`NOTE_ADDED`) | Even if the website's text were saved as a CRM note, staff would not see it | (CRM) | **CRM-side** |

## 4. `page_url` and `form_name` for each form (today's CRM)

> **Superseded by D1/D2/D11:** OfficeCRM is asked to read an explicit `lead_source` and map it to fixed labels (`Website – General Enquiry`, `Landing Page – General Enquiry`, `Architecture`, `Interior Design`, `Renovation`; CHANGE-REQUEST §4). It must never infer the category from URLs or campaign parameters. This section describes how **today's** CRM categorises the forms, kept for the transition and for checking that the Elementor path is unchanged. Under D12 this legacy categorisation stays as it is for the WordPress/Elementor path until the lp cutover, and historical leads keep their labels.

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
| Main site, home | `www` `/` | `home` | `https://www.hagarlushi.com/` | `Elementor / דף נחיתה` (fallback) | **No**. Owner (D1): new website category in OfficeCRM (B1a/B7) |
| Main site, contact | `www` `/יצירת-קשר` | `contact` | `https://www.hagarlushi.com/%D7%99%D7%A6%D7%99%D7%A8%D7%AA-%D7%A7%D7%A9%D7%A8` | `Elementor / דף נחיתה` (fallback) | **No**, as above (D1) |
| lp, home | `lp` `/` | `lp-home` | `https://lp.hagarlushi.com/` | `Elementor / דף נחיתה` | Yes: same as today's WordPress form (assumed) |
| lp, architecture | `lp` `/architecture/` | `lp-architecture` | `https://lp.hagarlushi.com/architecture/` | `אדריכלות` | Yes |
| lp, interior design | `lp` `/interior-design/` | `lp-interior-design` | `https://lp.hagarlushi.com/interior-design/` | `עיצוב פנים` | Yes |
| lp, renovation | `lp` `/renovation/` | `lp-renovation` | `https://lp.hagarlushi.com/renovation/` | `Elementor / דף נחיתה` (fallback) | **No**. Owner (D2): new renovation category (B7) |

What the WordPress Elementor form sends as `form_name` today is **UNKNOWN** (WordPress admin needed). If staff reports filter on it, match it.

## 5. The visitor's message (unresolved today; owner D3: must be fixed in OfficeCRM before launch)

- The main-site forms have a free-text **message** field ("במה אוכל לעזור?" / "הודעה"). The lp forms have none.
- With the current CRM, **no JSON shape is known that stores the message where staff can see it**:
  - `notes` is dropped (F2).
  - Elementor-style `fields[...][value]` text is read, but where it is stored is not stated. The only CRM-written notes we know of are `NOTE_ADDED`, which the lead screen hides (F13).
- **Honest status: the message is NOT saved in OfficeCRM today.** It only survives in the raw `webhook-logs` for 30 days, which staff don't see in the lead screen.
- The website must not claim otherwise and must not silently discard it.
- **Owner decision D3 (2026-10-13): option (a).** OfficeCRM stores the message visibly on the lead (CHANGE-REQUEST B1b/B6) **before launch**. Launching with the message discarded is ruled out.
  - Local test T4c checks, against the changed OfficeCRM on the emulators, that the message is visible on the lead.
- **The same limitation applies to:**
  - campaign attribution (UTMs, gclid, fbclid, referrer, entry page)
  - the **lp privacy-consent record**, which is stored only as text the CRM drops or hides. The fact that consent was given is not recorded on the lead, which is a legal record-keeping gap (D4).

## 6. Confirmed vs failed vs uncertain (website side implemented 2026-10-13)

| Outcome | When | Lead in CRM? | Website behaviour now | Correct? |
|---|---|---|---|---|
| **Confirmed** | 2xx + `success:true` | Yes, exactly one (synchronous write) | Thank-you page, one `generate_lead` | ✅ |
| **Not saved** | Worker refused (validation 400, 403/413/415, 503 `not_configured`); OfficeCRM 400/401/403/404/405/415/422/503 | No | "לא הצלחנו לשלוח…", retry allowed, no conversion | ✅ |
| **Unknown** | OfficeCRM 500 or other 5xx; timeout (20 s); dropped connection; malformed body; 2xx without `success:true`; the browser lost our endpoint's answer | **Maybe** | "לא ניתן לוודא שהפרטים נקלטו…", no resubmit invited, no conversion | ✅ never shown as success or as a definite failure |
| Spam trap | Honeypot filled | No (nothing sent) | Thank-you page, no conversion | ✅ by design |

**Remaining risk until B3 is live:** the visitor may still resubmit after an "unknown" message, which creates a duplicate today. **Owner D10 (2026-10-14): CRM idempotency is mandatory before production cutover.** The website will reuse the same `submission_id` for resends of an unconfirmed enquiry and create a new one only for a genuinely new enquiry (CHANGE-REQUEST §6).

## 7. Changes and their status

### A. Website-only (compatible with today's OfficeCRM)

| # | Change | Where | Why |
|---|---|---|---|
| A1 ✅ **done 2026-10-14** as `website-v1` (`lead_source`, `context.page_url` = origin + path) | Send `page_url` = `<origin><page_path>` (no query) and `form_name` = form id; stop sending `source` | `toCrmPayload()`, `handleLead()` (origin) | F1: correct category for architecture and interior-design; deterministic |
| A2 ✅ **done 2026-10-14**: `message`, `consent`, `context`; no `source`/`notes` | Decide what, if anything, to send instead of `notes`. **Proposal:** send `message` (www) and `submission_id` as top-level fields. They are kept in `webhook-logs` for 30 days for manual recovery, and the lead itself is unaffected. **Don't** send the attribution and consent text block until the CRM stores it. Verify F3 (email hijack) locally first | `toCrmPayload()`, `leadNotes()` | F2/F3: stop pretending `notes` is stored, and minimise data the CRM can't use |
| A3 ✅ **done 2026-10-13** | Split failures into **definite** (Worker 503, CRM 401/503 → today's message, retry is fine) and **uncertain** (CRM 5xx/timeout/network/malformed/2xx-without-success). Uncertain shows a new message that doesn't invite resubmitting, and offers phone/WhatsApp. Approved text: "לא ניתן לוודא שהפרטים נקלטו. ייתכן שהם נשמרו בכל זאת, ולכן מומלץ לא לשלוח את הטופס שוב כרגע. אפשר ליצור קשר בטלפון או בוואטסאפ." | `forwardToCrm()` (reason codes), `handleLead()` (502 `crm_uncertain` vs `crm_rejected`), `lead-rules.js`, both forms | F7: honesty; prevents most duplicates |
| A4 ✅ **done 2026-10-14** (CHANGE-REQUEST §6); effective together with OfficeCRM B3 (D10) | `submission_id` (`crypto.randomUUID()`), created at the first send of an enquiry, kept in `sessionStorage` per form and **reused** for every resend until a confirmed success (including after uncertain/not-saved outcomes, reloads and edits). **Cleared only on confirmed success**, so the next enquiry gets a new ID. Sent as the `Idempotency-Key` header and the `submission_id` field; logged (not personal data). No automatic retry | both forms, `lead-client.js`, `forwardToCrm()` | Exactly one lead per enquiry, together with B3 |
| A5 ✅ **done** (provisional) | Raise the CRM timeout from 10 s to 20 s (App Hosting cold starts; max 2 instances) | `CRM_TIMEOUT_MS` | Fewer uncertain outcomes (D6) |
| A6 ✅ **done 2026-10-14**: fake CRM on `website-v1` (validation, idempotency, revisions, lost response); proxy tool | Rebuild the mock CRM and tests on the real contract: 200 for anything with a valid key, 401/503/500 shapes, a 500-after-save mode, source derivation from `page_url`, `notes` ignored; per-form `page_url`/`form_name` assertions; remove assertions on `source`/`notes` content | `test/e2e/mock-office.mjs`, `test/worker.test.mjs`, `test/e2e/forms.e2e.mjs` | F12 |
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

## 8. Owner decisions (2026-10-13)

| # | Decision |
|---|---|
| D1 | Main-site leads must have an appropriate, identifiable source, **never** "Elementor / דף נחיתה". OfficeCRM to add it (B1a/B7). |
| D2 | A dedicated **renovation** category in OfficeCRM (B7). |
| D3 | The visitor's message must be **saved visibly on the lead before launch**. Not launching with it discarded (B1b/B6). |
| D4 | Privacy **consent must be recorded** against lp leads **before the lp cutover**, with consent state and submission context (B2). The consent wording stays subject to the owner's privacy-policy review, which is **pending, not done**. |
| D5 | Uncertain-outcome text approved (implemented): "לא ניתן לוודא שהפרטים נקלטו. ייתכן שהם נשמרו בכל זאת, ולכן מומלץ לא לשלוח את הטופס שוב כרגע. אפשר ליצור קשר בטלפון או בוואטסאפ." |
| D6 | 20 s timeout approved **provisionally**: test real response times. An uncertain result must never be shown as success or as a definite failure (implemented and tested). |
| D7 | A1–A6 approved in principle. **Don't assume the CRM saves fields it ignores.** Confirm the final field contract before changing the payload. A submission ID alone is not duplicate protection. |
| D8 | OfficeCRM changes B1–B8 requested for the OfficeCRM workstream, prioritised: source/category, visible message, consent, validation, duplicate protection, safe error semantics, security. CRM code stays out of this branch (`docs/OFFICECRM-CHANGE-REQUEST.md`). |
| D10 (2026-10-14) | **Duplicate protection is mandatory before production cutover.** OfficeCRM enforces idempotency (B3): repeated requests with the same submission ID create exactly one lead. The website reuses the ID for resends of the same enquiry and creates a new ID for a genuinely new one. The lost-response case (the first request saves, its response is lost) must be tested. |
| D11 (2026-10-14) | **Explicit, stable category labels:** main website → `Website – General Enquiry`; lp homepage → `Landing Page – General Enquiry`; architecture → `Architecture`; interior design → `Interior Design`; renovation → `Renovation`. Never inferred from campaign query parameters; the mapping is fixed (`lead_source` → label). |
| D12 (2026-10-14) | **Legacy labels preserved; labels coexist.** Existing OfficeCRM leads are **not** relabelled, and there is no bulk relabelling in this migration. The WordPress/Elementor integration keeps working, with its Hebrew categorisation unchanged, until the lp cutover. Only leads from the new website integration use the five English labels with explicit form identifiers. A unified view, if needed, is a **read-only reporting mapping** (CHANGE-REQUEST §4a) that never modifies stored records. |
| D9 | Stop relying on `webhook-logs` or discarded text. Information counts as persisted **only** when the CRM demonstrably saves it on the lead or an associated record. |

## 9. Recommendation (2026-10-14)

**READY FOR ISOLATED (LOCAL) TEST** on the website side, once the two prerequisites in §0b are met: the OfficeCRM response schema checked, and both apps on one machine.
- **Not** ready for production verification. That needs a passing local end-to-end test, the OfficeCRM changes deployed, and the owner's approval.
- Requirements before production cutover (owner): idempotency, correct category mapping, visible message, lp consent recording. All are implemented on the website side and must be shown in the real local test.
