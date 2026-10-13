# OfficeCRM change request: website lead intake (for the OfficeCRM workstream)

From: the website migration (`mrhadas-eng/LushiWebsite`, branch `cloudflare-migration`). Date: 2026-10-13.
Status: **REQUESTED, for assessment and implementation in the OfficeCRM repository.** No OfficeCRM code is changed from the website branch.
Basis: the owner's decisions of 2026-10-13, and the OfficeCRM code report (`claude/website-lead-integration.md` in the OfficeCRM session). Background: `docs/OFFICECRM-INTEGRATION-CONTRACT.md`.

## 1. Owner requirements (decisions of 2026-10-13)

1. **Main-site leads have an appropriate, identifiable source.** They must never be labelled as Elementor landing-page leads.
2. **A dedicated renovation category.**
3. **The visitor's message is saved visibly on the lead before launch.**
4. **Privacy consent is recorded against landing-page leads before the landing-page cutover**, with the consent state and the available submission context. The exact consent wording is still subject to the owner's privacy-policy review.
5. **Only information the CRM demonstrably saves**, on the lead or in an associated record, counts as persisted. The 30-day raw `webhook-logs` don't count.
6. **Priorities:**
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

## 4. Categories (requirements 1 and 2)

| `lead_source` | Category (label is the owner's/CRM's choice) | Note |
|---|---|---|
| `website-home`, `website-contact` | **new**: e.g. `אתר` / "אתר הבית" | Never "Elementor / דף נחיתה" |
| `lp-architecture` | `אדריכלות` | existing |
| `lp-interior-design` | `עיצוב פנים` | existing |
| `lp-renovation` | **new**: `שיפוץ` | requirement 2 |
| `lp-home` | existing landing-page label, or a new "דף נחיתה – כללי" | owner's choice; **not** "Elementor" once WordPress is gone |

## 5. Responses (safe error semantics)

| Case | Status | Body | Lead saved? |
|---|---|---|---|
| Created | 200 (or 201) | `{"success":true,"leadId":"…","duplicate":false}` | yes, exactly one |
| Repeated `Idempotency-Key` (same `submission_id`) | 200 | `{"success":true,"leadId":"<existing>","duplicate":true}` | no new lead |
| Validation failed | **400** | `{"success":false,"error":"validation","fields":["email",…]}` | **no** |
| Bad or missing key | 401 | unchanged | no |
| Webhook not configured | 503 | unchanged | no |
| Unexpected error | 500 | `{"success":false,"error":"…"}` | **only if nothing was written** |

**Rules:**
- A **500 is only allowed before any write.** Once the lead is written, secondary steps (warning notes, alert emails) are best-effort and logged. The response is still a success, with optional `"warnings": [...]`.
- The website treats 400, 401 and 503 as "not saved, retry is safe", and anything else that isn't a success as "unknown". That is already implemented on the website branch.

## 6. Duplicate protection (requirement 7: "a generated submission ID alone is not duplicate protection")

- Store `submission_id` with the lead, plus a unique index or record keyed by `Idempotency-Key`, for at least 7 days.
- The first request with a key creates the lead.
- Later requests with the same key return the **same** `leadId` with `duplicate: true` and create nothing.
- Two concurrent requests with the same key must still produce one lead: use a Firestore transaction or create-if-absent on a document whose id is the key.
- A request with the same key but a different body: return the existing lead, and log a warning. Don't create a second lead.
- (Optional, owner decision) Flag a *likely* duplicate when the same phone or email arrives within N minutes **without** a matching key. Flag only, never drop.

## 7. Change list and order of work

| Order | ID | Change (OfficeCRM) | Blocks |
|---|---|---|---|
| 1 | B1a | Accept `website-v1`: read `lead_source` and map it to categories, including **new website and renovation categories** (B7). Take `email` **only** from `email` | Main-site launch, lp cutover |
| 2 | B1b + B6 | Store `message` **visibly** on the lead; make CRM-written notes visible (fix the `NOTE_ADDED` filtering in `lead-details-sheet.tsx`, or store the message as a lead field) | **Main-site launch** (requirement 3) |
| 3 | B2 | Store `consent` (given, text, policy URL, time) and `context` as structured data on, or associated with, the lead, visible to staff | **lp cutover** (requirement 4) |
| 4 | B5 | Validate `website-v1` requests (required fields, types, lengths, `lead_source` enum, consent for `lp-*`) → 400 with field list; nothing saved | Launch (with B4) |
| 5 | B4 | Safe error semantics: no 500 after a write; secondary failures become warnings | Launch |
| 6 | B3 | Idempotency (§6) | Recommended before launch: owner to confirm whether it blocks |
| 7 | B8 | Webhook security: constant-time key comparison; remove the `?api_key=` query parameter and the GET-with-parameters → POST path (once nothing uses them); restrict CORS (server-to-server needs none); keep the key in Secret Manager; a documented rotation procedure | Before launch (recommended) |
| 8 | (none) | Tests in OfficeCRM for all of the above, plus a regression test that the Elementor form-urlencoded path is unchanged | with each step |

## 8. What the website does once the contract is confirmed

These are the website changes A1, A2 and A4, deferred until the OfficeCRM workstream confirms the field names above or its own version of them:
- `toCrmPayload()` sends the confirmed fields: `lead_source`, `message`, `consent`, `context`, `submission_id`.
- The browser generates `submission_id` per form fill and keeps it on resubmits.
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
3. Every form creates **exactly one** lead with the right category, contact details and message, plus consent and context for lp forms.
4. Resubmitting with the same `submission_id` creates no second lead.
5. Validation errors return 400 with nothing saved; a forced post-write failure doesn't return 500.
6. The Elementor regression path still works.
7. Production: one approved, marked test lead per Worker, deleted straight afterwards (test plan §4).
