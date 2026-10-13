# OfficeCRM integration contract (website ↔ OfficeCRM)

Status: **2026-10-13. The CRM side is NOT verified from code.** The OfficeCRM source was not available to this session (see §1).
Everything under "CRM implementation" below is the contract the owner specified on 2026-10-11, not something read from OfficeCRM's code.
The website side was read from the code on branch `cloudflare-migration`, commit `0664780`.

Companion: `docs/OFFICECRM-INTEGRATION-TEST-PLAN.md`.

## 1. What was inspected

| Repository | Result |
|---|---|
| `mrhadas-eng/OfficeCRM` | **Not accessible.** `add_repo` reports "not found on github.com, or this session's GitHub credential doesn't have access to it". It isn't among the repositories this session can list. Its real name or owner is unknown. |
| `mrhadas-eng/guyhadas` (commit `53ca86a`) | **Not OfficeCRM.** It is a Hebrew advisory landing page plus Firebase Functions for SEO and visibility analysis, meetings and email (`functions/index.js`: `createMeetingDirect`, `getAvailableSlots`, `sendEmailDirect`, …). It contains no `/api/leads/webhook`, no `LEADS_WEBHOOK_API_KEY` and no lead-intake endpoint. `hagarlushi.com` appears there only as test-fixture data (`functions/test/helpers/m7Fixture.js`). |
| `mrhadas-eng/LushiWebsite`, branch `cloudflare-migration` (commit `0664780`) | Inspected: `worker/index.js`, `src/lib/lead-client.js`, `src/lib/lead-rules.js`, `src/lib/form-ui.js`, `src/components/ContactForm.astro`, `src/components/lp/LpLeadForm.astro`, `src/components/lp/LpWhatsApp.astro`, `src/components/Tracking.astro`, `wrangler.jsonc`, `wrangler.lp.jsonc`, `test/worker.test.mjs`, `test/e2e/mock-office.mjs`. |
| Live deployment `office.hagarlushi.com` | **Not contacted.** Its DNS record (A 35.219.200.106) was observed on 2026-10-11. No request was sent to the endpoint, because the safety rules forbid touching the live CRM. |

**To verify the CRM side:**
- Give this session access to the OfficeCRM repository (GitHub → Settings → Applications → Claude → repository access), or tell me its exact `owner/name`.
- Then the "CRM implementation" column below gets checked against the code, with file and function references.

## 2. Contract as specified by the owner (unverified)

| Item | Owner-specified value | Verified? |
|---|---|---|
| Endpoint | Path `/api/leads/webhook` on the OfficeCRM host (the `office` subdomain of hagarlushi.com), over https. The full address isn't written in this repo (project rule); it lives only in the `CRM_WEBHOOK_URL` secret | No: not checked in code or the live config |
| Method / content type | `POST`, `application/json` | No |
| Authentication | `Authorization: Bearer <LEADS_WEBHOOK_API_KEY>`. The key is the value of OfficeCRM's own `LEADS_WEBHOOK_API_KEY` setting | No: the comparison method (constant-time?), where the key is stored, and rotation are unknown |
| Required fields | `name`, `phone`, `email`, `source` | No: types, lengths, formats and allowed `source` values unknown |
| Optional fields | `notes`, `referrerName` | No: maximum `notes` length and character set unknown |
| Success | HTTP 200, JSON `{ "success": true, "leadId": … }` | No: `leadId`'s type is unknown |
| Errors | Not specified. Unknown for bad auth, invalid payload, duplicates, rate limits and server errors | **Unknown** |
| Synchronous? | Not specified. Does `success: true` mean the lead is already stored, or only queued? | **Unknown** |
| Idempotency | Not specified. No submission ID or idempotency key is known | **Unknown** |
| Rate limits, IP allowlist, CORS | Not specified | **Unknown**. CORS doesn't apply (server-to-server). An IP allowlist would block Cloudflare, whose egress IPs vary |
| Audit trail / how to find a lead | Not specified | **Unknown** |

## 3. What the website sends and expects (verified from code)

| Aspect | Website implementation | Where |
|---|---|---|
| Secrets | `CRM_WEBHOOK_URL` (full webhook address) and `LEADS_WEBHOOK_API_KEY` (bare key) are Worker secrets, set on **both** Workers (`hagarlushi`, `hagarlushi-lp`). Neither appears in the repo; `test/site.test.mjs` fails if the address is committed or built into the site | `worker/index.js` header comment, `crmConfig()` |
| URL check | Must be `https:`. `http:` is allowed only for `localhost`/`127.0.0.1` (local mock). Otherwise the result is 503 `not_configured` and **nothing is sent** | `crmConfig()` |
| Key handling | A pasted `Bearer ` prefix is stripped; the header is always `Authorization: Bearer <key>` | `crmConfig()`, `forwardToCrm()` |
| Request | `POST`, headers `Content-Type: application/json`, `Accept: application/json`, `Authorization: Bearer …`; timeout **10 s** (`AbortSignal.timeout`) | `forwardToCrm()`, `CRM_TIMEOUT_MS` |
| Body | Exactly `{ name, phone, email, source, notes }`. `referrerName` is **never** sent | `toCrmPayload()` |
| `name` | Trimmed, 1–200 chars | `validateLead()`, `FIELDS.full_name` |
| `phone` | **As typed** (formatting kept, e.g. `052-431-7164` or `+972 52 431 7164`), ≤ 40 chars. It must be a valid Israeli number, or `+`/`00` plus a foreign country code | `isValidPhone()` in `src/lib/lead-rules.js` |
| `email` | Trimmed, ≤ 254, `^[^\s@]+@[^\s@]+\.[^\s@]{2,}$` | `EMAIL_RE` |
| `source` | Free text ≤ 200: `website / <channel>` (www) or `landing-page / <channel>` (lp), e.g. `landing-page / google / cpc`, `website / google-ads`, `website / direct` | `leadSource()` |
| `notes` | Hebrew multi-line text ≤ 4,000 chars. Contains: the message (www), the form name (e.g. `דף נחיתה – אדריכלות`), the page path, the entry page, UTMs, gclid/fbclid, the referrer, the site host, `אישור מדיניות פרטיות: כן` (lp) and the submit time | `leadNotes()` |
| Success rule | Lead confirmed **only if** HTTP 2xx **and** the body parses as JSON **and** `success === true`. `leadId` is optional to the website (only logged) | `forwardToCrm()` |
| Failure mapping | Network error → `crm_unreachable`. Timeout → `crm_unreachable`. Non-2xx → `crm_rejected`. Non-JSON → `crm_rejected`. `success` missing or false → `crm_rejected`. All return **502** to the browser | `forwardToCrm()`, `handleLead()` |
| Retries | **None** in the Worker. The browser retries only if the visitor presses submit again | `handleLead()` |
| Duplicate protection | Submit button disabled while a request is in flight. **No idempotency key / submission ID is sent** | `ContactForm.astro`, `LpLeadForm.astro` |
| Logs | Only reason codes, or `leadId` on success. No name, phone, email, notes, URL or key. Tested by `test/worker.test.mjs` ("logs never contain lead data…"). Workers observability is enabled on both Workers | `handleLead()`, `wrangler*.jsonc` |
| Browser contract | `/api/lead` accepts only same-origin `POST` JSON ≤ 10 KB. 400 `{error, field}` for invalid fields; 200 `{ok:true}` only after OfficeCRM confirmed. A filled honeypot returns 200 `{ok:true}` but **sends nothing** | `handleLead()`, `isSameOrigin()` |
| Conversion | `generate_lead` is pushed once on the thank-you page, only after `{ok:true}` | `submitLead()`, `recordLeadConversion()` |
| WhatsApp / phone clicks | Plain links. They push `whatsapp_click` / `phone_click` only. No `/api/lead` call, no `generate_lead` | `LpWhatsApp.astro`, `Tracking.astro` |

**Both Workers are identical on the integration side.** `wrangler.jsonc` and `wrangler.lp.jsonc` both use `main: worker/index.js` and `run_worker_first: ["/api/*"]`. They differ only in the `form` value (and therefore the `source` prefix and notes). Each Worker has its **own** copy of the two secrets, so both must be set, and set to the same environment.

## 4. Comparison

| Integration item | CRM implementation | Website implementation | Status | Required action |
|---|---|---|---|---|
| Endpoint URL | Owner: `/api/leads/webhook` on the `office.` host | Whatever `CRM_WEBHOOK_URL` holds (https only) | UNVERIFIED DEPLOYMENT | Confirm the route in the OfficeCRM code and that it is deployed at that host |
| Method / content type | Owner: POST JSON | POST, `application/json` | UNVERIFIED DEPLOYMENT | Confirm in code |
| Auth header | Owner: `Authorization: Bearer <LEADS_WEBHOOK_API_KEY>` | `Authorization: Bearer <LEADS_WEBHOOK_API_KEY>` | UNVERIFIED DEPLOYMENT | Confirm the header name and scheme, and how the key is compared and rotated |
| Required fields | Owner: name, phone, email, source | Always sends all four, validated non-empty | UNVERIFIED DEPLOYMENT | Confirm names, types and length limits |
| `phone` format | Unknown (normalisation? E.164?) | Sent **as typed**, formatting kept | UNVERIFIED DEPLOYMENT | Check whether the CRM rejects `+972 52-431-7164` or dedups on a normalised number; normalise in `toCrmPayload()` if needed |
| `source` values | Unknown (free text or a fixed list?) | Free text, e.g. `landing-page / google / cpc` | UNVERIFIED DEPLOYMENT | If it's a fixed list, map to it in `leadSource()` |
| `notes` | Owner: optional | Up to 4,000 chars, Hebrew, multi-line | UNVERIFIED DEPLOYMENT | Confirm the length limit and Unicode handling |
| `referrerName` | Owner: optional | Never sent | MATCH (optional) | none |
| Success response | Owner: 200 `{success:true, leadId}` | Requires 2xx + `success === true`; `leadId` optional | MATCH with the spec, UNVERIFIED DEPLOYMENT | Confirm in code that `success:true` is returned only after the lead is stored |
| Error responses | Unknown | Any non-2xx or non-confirmation is treated as failure | UNVERIFIED DEPLOYMENT | List the codes in the CRM code. The website handles all of them as failures already |
| Duplicate / retry | Unknown; no idempotency key known | Single in-flight request; no idempotency key; no automatic retry | NOT IMPLEMENTED (both sides) | See risk R1 |
| Async vs sync | Unknown | Assumes `success:true` means stored | UNVERIFIED DEPLOYMENT | Confirm in code |
| Rate limit / IP allowlist | Unknown | Requests come from Cloudflare's network, varying IPs | UNVERIFIED DEPLOYMENT | Confirm there's no allowlist, or that it allows Cloudflare |
| Timeout | Unknown typical latency | 10 s, then failure | UNVERIFIED DEPLOYMENT | Measure CRM latency in the isolated test |
| Secrets location | Owner: OfficeCRM env `LEADS_WEBHOOK_API_KEY` | Worker secrets on both Workers | UNVERIFIED DEPLOYMENT | Confirm where OfficeCRM reads the key and whether a test key or environment exists |
| Logging of personal data | Unknown on the CRM side | None in the Worker (tested) | MATCH (website side) | Check that the CRM doesn't log request bodies or headers |
| main vs lp Worker | n/a | Same code and contract; separate secrets | MATCH | Set the secrets on both Workers |

## 5. Risks found in the website implementation (no code changed)

- **R1, duplicate leads after a slow CRM (medium).** If OfficeCRM stores the lead but answers after 10 s, the Worker reports failure. The visitor sees "לא הצלחנו לשלוח…" and may submit again, which creates a second lead. The same happens if the CRM stores a lead and then answers non-2xx, or `success:false` for a duplicate. **Proposed** (needs owner approval and, for full protection, CRM support):
  1. The browser generates a `submission_id` (UUID) per form fill and keeps it across retries.
  2. The Worker adds it to `notes`, which works today, and sends it as an idempotency field or `Idempotency-Key` header if OfficeCRM supports one.
  3. OfficeCRM ignores repeats of the same ID.
- **R2, timeout value (low).** 10 s is a guess. Measure real latency in the isolated test; if p95 is close, raise it to 15 s.
- **R3, secrets drift between the two Workers (medium, operational).** Each Worker has its own secrets. If one points at a test environment and the other at production, leads split silently. The test plan checks both explicitly.
- **R4, response semantics (unknown).** If OfficeCRM returns `success:true` before the lead is durably stored (queued), a later failure would be invisible to the website. Confirm in code.
- **R5, phone format (unknown).** The website keeps the visitor's formatting. If OfficeCRM matches or deduplicates on raw strings, `052-431-7164` and `0524317164` would look different.
- **No path reports a CRM failure as success**, except the deliberate honeypot path, which sends nothing. Covered by `test/worker.test.mjs` ("success only for HTTP 2xx with success: true", timeout, network failure, malformed JSON).

## 6. Recommendation

**BLOCKED** for a real integration test. Evidence:
- The OfficeCRM code is not accessible, so §2 is unverified.
- No test or staging CRM environment is known.
- Neither Worker is deployed with secrets yet.

The website side is ready for an isolated test as soon as these are resolved. Its behaviour is fully covered with a **mock** CRM (`npm test` 74/74; browser e2e 188/188 and 40/40), which does **not** prove the real integration works. The prerequisites list is in `docs/OFFICECRM-INTEGRATION-TEST-PLAN.md` §1.
