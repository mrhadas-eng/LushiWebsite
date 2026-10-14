# OfficeCRM change request: website lead intake (for the OfficeCRM workstream)

From: the website migration (`mrhadas-eng/LushiWebsite`, branch `cloudflare-migration`). Date: 2026-10-13, updated 2026-10-14 with the owner's final decisions on categories, duplicate protection and legacy labels.
Status: **REQUESTED, for assessment and implementation in the OfficeCRM repository.** No OfficeCRM code is changed from the website branch.
Basis: the owner's decisions of 2026-10-13 and 2026-10-14, and the OfficeCRM code report (`claude/website-lead-integration.md` in the OfficeCRM session). Background: `docs/OFFICECRM-INTEGRATION-CONTRACT.md`.

## 1. Owner requirements (decisions of 2026-10-13)

1. **Main-site leads have an appropriate, identifiable source.** They must never be labelled as Elementor landing-page leads.
2. **A dedicated renovation category.**
3. **The visitor's message is saved visibly on the lead before launch.**
4. **Privacy consent is recorded against landing-page leads before the landing-page cutover**, with the consent state and the available submission context. The exact consent wording is still subject to the owner's privacy-policy review.
5. **Only information the CRM demonstrably saves**, on the lead or in an associated record, counts as persisted. The 30-day raw `webhook-logs` don't count.
6. **(2026-10-14) Duplicate protection is mandatory before production cutover.** Repeated requests with the same submission ID must create exactly one lead, including when the first request saved the lead but its response was lost (§6).
7. **(2026-10-14) Explicit, stable category labels** (§4). Categories are **never** inferred from campaign query parameters or URLs.
8. **(2026-10-14) Legacy labels are preserved.** No relabelling of existing leads and no bulk relabelling. The WordPress/Elementor path and its Hebrew categorisation keep working unchanged until the lp cutover. Legacy and new labels coexist; any unified view is a read-only reporting mapping (§4a).
9. **Required before production cutover (owner, 2026-10-14):** idempotency, correct category mapping, visible message storage, and lp consent recording. **Order of priority:**
   - source and category handling
   - visible message storage
   - consent recording
   - validation
   - duplicate protection
   - safe error semantics
   - webhook security

## 2. Hard constraint: don't break the current Elementor intake

- The webhook was built for Elementor forms. The WordPress landing pages on `lp.hagarlushi.com` **very likely post to it today**. That is assumed; it still needs confirming in WordPress admin → Elementor → form → Actions After Submit.
- Those pages stay live until the lp cutover, so **the current form-urlencoded / `fields[...][value]` path must keep working unchanged** until the owner retires it.
- The new behaviour should apply to requests that identify themselves as the new website contract, e.g. JSON with `"contract": "website-v1"`.
- **(Owner, 2026-10-14)** The legacy path keeps its existing Hebrew categorisation unchanged. Existing leads are **not** relabelled, and there is **no** bulk relabelling. Legacy and new labels coexist (§4a).

## 3. Proposed request contract: `website-v1`

**Proposal for the OfficeCRM workstream to confirm or adjust.** The website will implement the payload only after this contract is confirmed in OfficeCRM code (owner decision 7).

```
POST /api/leads/webhook
Content-Type: application/json
Authorization: Bearer <LEADS_WEBHOOK_API_KEY>
Idempotency-Key: <submission_id>
```

| Field | Type | Required | Meaning | Website value |
|---|---|---|---|---|
| `contract` | string | yes | Selects this contract | `"website-v1"` |
| `submission_id` | string (UUID) | yes | One per form fill; the same value on resubmits of that fill. Must equal `Idempotency-Key` | browser-generated |
| `lead_source` | enum | yes | Where the lead came from; the CRM maps it to its category (§4) | `website-home`, `website-contact`, `lp-home`, `lp-architecture`, `lp-interior-design`, `lp-renovation` |
| `name` | string 1–200 | yes | | as typed, trimmed |
| `phone` | string ≤ 40 | yes | Stored as typed; normalisation optional (CRM decision) | as typed (validated by the website) |
| `email` | string ≤ 254 | yes | Taken **only** from this field, never inferred from other fields | as typed |
| `message` | string ≤ 5000 | no | **Shown on the lead** (requirement 3) | main-site forms only |
| `consent` | object | yes for `lp-*`; absent for `website-*` | **Stored on the lead** or an associated consent record (requirement 4) | see below |
| `context` | object | yes | Submission context, stored in a structured, visible associated record | see below |

`consent` (landing pages):
```json
{ "given": true,
  "text": "קראתי ומאשר/ת את מדיניות הפרטיות",
  "policy_url": "https://lp.hagarlushi.com/privacy/",
  "given_at": "2026-10-13T12:00:00.000Z" }
```
`text` is the label exactly as displayed. It may change after the owner's privacy-policy review, so it must be stored per lead, not hard-coded.

`context`:
```json
{ "site": "lp.hagarlushi.com",
  "page_url": "https://lp.hagarlushi.com/architecture/",
  "form_name": "lp-architecture",
  "submitted_at": "2026-10-13T12:00:00.000Z",
  "landing_page": "/architecture/",
  "referrer": "https://www.google.com/",
  "utm_source": "google", "utm_medium": "cpc", "utm_campaign": "…", "utm_term": "…", "utm_content": "…",
  "gclid": "…", "fbclid": "…" }
```
`page_url` has no query string; campaign parameters are sent as separate fields.

## 4. Categories (owner decision, 2026-10-14: final)

The mapping is **explicit and stable**: `lead_source` → category label, exactly as below. For `website-v1` requests the CRM **must not** derive the category from `page_url`, `context`, UTM or other campaign parameters, or any URL keyword. An unknown `lead_source` is rejected with **400** (no fallback category, nothing saved).

| `lead_source` (sent by the website) | Category label in OfficeCRM (exact) |
|---|---|
| `website-home` | `Website – General Enquiry` |
| `website-contact` | `Website – General Enquiry` |
| `lp-home` | `Landing Page – General Enquiry` |
| `lp-architecture` | `Architecture` |
| `lp-interior-design` | `Interior Design` |
| `lp-renovation` | `Renovation` |

- The labels use an en dash (`–`, U+2013), with spaces around it.
- `lead_source` values are a fixed vocabulary. Adding a form means adding a row here, with the owner's approval.
- The website derives `lead_source` **only** from the form's fixed identifier, which the Worker validates against its own list. It never derives it from the URL or campaign data.
### 4a. Legacy and new labels coexist (owner decision, 2026-10-14)

| Rule | |
|---|---|
| **Existing leads** | **Not relabelled.** Every stored lead keeps its historical label. No bulk relabelling or data migration is part of this work |
| **Legacy WordPress/Elementor path** | **Unchanged** until the landing-page cutover, including its Hebrew keyword-based categorisation (`אדריכלות`, `עיצוב פנים`, `Elementor / דף נחיתה`). Neither broken nor silently changed |
| **New website path (`website-v1`)** | Only the five English labels above, from explicit `lead_source` identifiers |
| **During the transition** | Both label sets appear in OfficeCRM. After the lp cutover, new leads arrive only through `website-v1`; legacy labels remain on historical leads |

**Reporting-level mapping (read-only).** For reports that need one category per lead, apply this mapping **when reading or exporting**, e.g. in a report query, an export script or a computed display field. **Never write it back** to stored records.

| Stored label (legacy, Elementor path) | Report as (new category) | Confidence |
|---|---|---|
| `אדריכלות` | `Architecture` | Exact: the legacy rule assigns it to URLs containing "architect", i.e. lp `/architecture/` |
| `עיצוב פנים` | `Interior Design` | Exact for lp `/interior-design/`. The legacy rule also matches any URL containing "interior" or "design", so a few legacy leads may be mis-sorted at the source |
| `Elementor / דף נחיתה` | `Landing Page – General Enquiry` | **Approximate.** This legacy fallback also covers lp `/renovation/` and any page without a keyword. If the legacy lead stored its page URL, a URL containing `/renovation/` can be reported as `Renovation`; otherwise it stays `Landing Page – General Enquiry` |
| `Website – General Enquiry`, `Landing Page – General Enquiry`, `Architecture`, `Interior Design`, `Renovation` | unchanged | new path |
| anything else (manual entries, other channels) | shown as stored | not part of the website migration |

Whether legacy leads store their page URL, and where, is **to be confirmed by the OfficeCRM workstream**. It decides whether legacy renovation leads can be separated in reports.


## 5. Responses (safe error semantics)

| Case | Status | Body | Lead saved? |
|---|---|---|---|
| Created | 200 (or 201) | `{"success":true,"leadId":"…","duplicate":false}` | yes, exactly one |
| Repeated `Idempotency-Key` (same `submission_id`) | 200 | `{"success":true,"leadId":"<existing>","duplicate":true}` | no new lead |
| Same key while the first request is still being processed | 200 once the first commits (preferred), or **409** `{"success":false,"error":"in_progress"}` | no second lead |
| Validation failed (including an unknown `lead_source`, or a missing or mismatched `Idempotency-Key`) | **400** | `{"success":false,"error":"validation","fields":["email",…]}` | **no** |
| Bad or missing key | 401 | unchanged | no |
| Webhook not configured | 503 | unchanged | no |
| Unexpected error | 500 | `{"success":false,"error":"…"}` | **only if nothing was written** |

**Rules:**
- A **500 is only allowed before any write.** Once the lead is written, secondary steps (warning notes, alert emails) are best-effort and logged. The response is still a success, with optional `"warnings": [...]`.
- The website treats 400, 401 and 503 as "not saved, retry is safe", and anything else that isn't a success (including 409 `in_progress`) as "unknown". That is already implemented on the website branch.
- `duplicate: true` is a **success** for the website: thank-you page and one `generate_lead`. This is correct, because the website only reuses an ID while the enquiry is unconfirmed (§6), so the first attempt never counted a conversion.

## 6. Duplicate protection (owner decision, 2026-10-14: **mandatory before production cutover**)

Requirement: repeated requests with the same submission ID create **exactly one** lead. That includes the case where the first request saved the lead but its response never reached the website. A generated ID on its own is not protection; OfficeCRM must enforce it.

**OfficeCRM (B3):**
- `website-v1` requests **must** carry `Idempotency-Key: <submission_id>`, equal to the body's `submission_id` (a UUID). If it's missing, malformed or mismatched → 400, nothing saved.
- **Atomic create-if-absent:** in one Firestore transaction, create an idempotency record whose document id is the key (e.g. `lead_submissions/<key>` → `{ leadId, createdAt, bodyHash }`) **together with** the lead. If the record already exists, create nothing.
- A repeat of a known key → 200 `{"success":true,"leadId":"<same>","duplicate":true}`.
- **Concurrent** requests with the same key (the second arrives while the first is still running) → still one lead. Preferably wait for the transaction and return the same `leadId`; otherwise 409 `in_progress`.
- **Same key, different body:**
  - Keep the original lead, create **no** second lead, and return its `leadId` with `duplicate: true`.
  - Store the later payload as a visible revision on that lead, e.g. a "resubmitted with changes" note shown in the lead screen, so a visitor's corrections aren't lost.
- **Retention:** at least 30 days.
- **Scope:** only the `website-v1` contract. The legacy Elementor path is unchanged (§2).
- **Optional (owner decision):** flag a *likely* duplicate when the same phone or email arrives within N minutes under a **different** key, e.g. the same person in a new browser tab. Flag only, never drop.

**Website (A4, implemented after the contract is confirmed):**
- **When an ID is created:** a new `submission_id` (`crypto.randomUUID()`) at the first send attempt of an enquiry, after browser validation passes. It is stored in `sessionStorage` under a per-form key (e.g. `hl_submission:<form id>`).
- **When it is reused:** every resend of that form, in that browser tab, until a **confirmed** success. That covers a resend after an "uncertain" or "not saved" outcome, a page reload, and a resend after the visitor edits a field (the CRM keeps the edit as a revision, see above).
- **When it is cleared:** only on a confirmed success (`ok: true`, including `duplicate: true`), before the thank-you redirect. The next enquiry on that form gets a new ID.
- **What counts as a genuinely new enquiry (new ID):** a new submission after a confirmed success; a different form; a new browser tab or session.
- **Accepted residual case:** a visitor gets "uncertain", closes the tab and later submits again in a new tab. This creates a new ID, and therefore a second lead. Only the optional likely-duplicate flag above catches it.
- The Worker forwards the ID as both the `Idempotency-Key` header and the `submission_id` field, and logs it (not personal data).
- **No automatic retry, ever.** A resend only happens when the visitor submits again.

## 7. Change list and order of work

| Order | ID | Change (OfficeCRM) | Blocks |
|---|---|---|---|
| 1 | B1a | Accept `website-v1`: read `lead_source` and map it **exactly** per §4 (`Website – General Enquiry`, `Landing Page – General Enquiry`, `Architecture`, `Interior Design`, `Renovation`). No URL or campaign inference; unknown value → 400. Take `email` **only** from `email` | Main-site launch, lp cutover |
| 2 | B1b + B6 | Store `message` **visibly** on the lead; make CRM-written notes visible (fix the `NOTE_ADDED` filtering in `lead-details-sheet.tsx`, or store the message as a lead field) | **Main-site launch** (requirement 3) |
| 3 | B2 | Store `consent` (given, text, policy URL, time) and `context` as structured data on, or associated with, the lead, visible to staff | **lp cutover** (requirement 4) |
| 4 | B5 | Validate `website-v1` requests (required fields, types, lengths, `lead_source` enum, consent for `lp-*`) → 400 with field list; nothing saved | Launch (with B4) |
| 5 | B4 | Safe error semantics: no 500 after a write; secondary failures become warnings | Launch |
| 6 | B3 | Idempotency (§6): atomic create-if-absent on `Idempotency-Key`; same `leadId` with `duplicate: true` on repeats; safe under concurrency and lost responses | **Production cutover (mandatory, owner 2026-10-14)** |
| 7 | B8 | Webhook security: constant-time key comparison; remove the `?api_key=` query parameter and the GET-with-parameters → POST path (once nothing uses them); restrict CORS (server-to-server needs none); keep the key in Secret Manager; a documented rotation procedure | Before launch (recommended) |
| 8 | (none) | Tests in OfficeCRM for all of the above, plus a regression test that the Elementor form-urlencoded path is unchanged, **including its Hebrew category labels**, and that no existing lead is modified | with each step |
| 9 | (optional) | A **read-only** reporting mapping from legacy to new categories (§4a), applied at read or export time only. Never written to stored leads | not blocking |

## 8. What the website does once the contract is confirmed

These are the website changes A1, A2 and A4, deferred until the OfficeCRM workstream confirms the field names above or its own version of them:
- `toCrmPayload()` sends the confirmed fields: `lead_source`, `message`, `consent`, `context`, `submission_id`.
- The browser creates, reuses and clears `submission_id` exactly as in §6 (website A4).
- The Worker sends the `Idempotency-Key` header and stops sending `source` and `notes`.
- The fake CRM and the tests are switched to the confirmed contract.

**Already done on the website branch**, because it doesn't depend on the field names:
- definite vs uncertain outcomes, with the owner-approved uncertain message
- the 20 s timeout
- response-time logging
- a fake CRM that matches today's real behaviour

## 9. Verification (joint, local first)

1. OfficeCRM: `LEADS_WEBHOOK_API_KEY=local-test npm run dev` (Firebase emulators, port 3000).
2. Website: `wrangler dev` for both Workers with `.dev.vars` pointing at `http://localhost:3000/api/leads/webhook`, on the **same machine**.
3. Every form creates **exactly one** lead with the exact §4 category, contact details and message, plus consent and context for lp forms. Campaign parameters never change the category.
4. Resubmitting with the same `submission_id` creates no second lead. That includes the **lost-response case**: the first request saves the lead, its response is dropped, and the visitor resubmits. Result: one lead, `duplicate: true`, one conversion. Also concurrent same-key requests: one lead.
5. Validation errors return 400 with nothing saved; a forced post-write failure doesn't return 500.
6. The Elementor regression path still works.
7. Production: one approved, marked test lead per Worker, deleted straight afterwards (test plan §4).
