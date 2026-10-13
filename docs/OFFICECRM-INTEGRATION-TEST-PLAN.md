# OfficeCRM integration test plan

Status: **2026-10-13, after the owner's decisions. Not runnable yet.** It needs the OfficeCRM changes (`docs/OFFICECRM-CHANGE-REQUEST.md`, orders 1–5) and the website payload changes (A1, A2, A4) built on the **confirmed** field contract.
Contract and findings: `docs/OFFICECRM-INTEGRATION-CONTRACT.md`.

- **No staging exists.** The integration test runs **locally**: the changed OfficeCRM (`npm run dev`, Firebase emulators, port 3000) with both website Workers (`wrangler dev`).
- The production CRM is touched once, at the end (§4), only with the owner's explicit approval.
- The website's automated tests use a **fake CRM** (`test/e2e/mock-office.mjs`, rebuilt to today's real behaviour). They prove the website's behaviour, **not** the integration.

## 0. Rules

- **Synthetic data only:**
  - Name: `TEST – website migration <run>-<n>`.
  - Email: an owner-controlled address with a tag, e.g. `lushi.office+crmtest-<run>-<n>@gmail.com`.
  - Phone: an owner-controlled number.
  - Message: `בדיקת אינטגרציה <run>-<n> – למחוק`. The number makes each message identifiable on the lead.
- **Campaign tag on every page URL:** `?utm_source=crmtest&utm_medium=qa&utm_campaign=TEST-<run>`.
- **One submission per action. Never auto-retry.**
- **Something counts as stored only if it is visible on the lead, or in its associated record, in the CRM UI or emulator data.** `webhook-logs` don't count (owner D9).
- **Record for every test:**
  - the `/api/lead` response (DevTools → Network)
  - the Worker log line, including the response time in ms
  - the `leadId`
  - the stored document (emulator UI `http://127.0.0.1:4000` → Firestore)
  - what the CRM lead screen shows
- **No deploy, DNS change, production secret or production lead**, except §4 with approval.

## 1. Prerequisites

| # | Item | How to verify |
|---|---|---|
| P1 | OfficeCRM has implemented and unit-tested CHANGE-REQUEST orders 1–5 (B1a category/source, B1b/B6 visible message, B2 consent and context, B5 validation, B4 safe errors). The Elementor regression test passes | OfficeCRM workstream report, with file references |
| P2 | **Final field contract confirmed** by the OfficeCRM workstream (CHANGE-REQUEST §3, or its adjusted version) | Written confirmation; CONTRACT §1 updated from "reported" to the confirmed contract |
| P3 | Website A1, A2, A4 implemented against P2; the fake CRM and tests switched to it; `npm test` and the e2e suites green | Commit on `cloudflare-migration` |
| P4 | B3 (idempotency) implemented, **or** the owner has explicitly accepted testing without it | Owner decision |
| P5 | **One machine runs both**: the owner's computer, or this session if it gets access to the OfficeCRM repo and the emulators (Java for Firestore) | `curl -s http://localhost:3000/api/leads/webhook` (GET **without** parameters) returns the status text. Never call GET with parameters |
| P6 | OfficeCRM: `LEADS_WEBHOOK_API_KEY=local-test npm run dev` | Emulator UI shows `leads` |
| P7 | Website `.dev.vars` (git-ignored): `CRM_WEBHOOK_URL=http://localhost:3000/api/leads/webhook`, `LEADS_WEBHOOK_API_KEY=local-test` | T0 |
| P8 | Both Workers: `npm run build`; `npx wrangler dev --port 8787 --inspector-port 9231`; `npx wrangler dev -c wrangler.lp.jsonc --port 8788 --inspector-port 9232 --persist-to <own folder>` | Both load |
| P9 | For §4 only: SHA-256 key fingerprints match (first 12 characters of `printf %s "$KEY" \| shasum -a 256`, from Secret Manager project `jassign` and from the value entered as the Worker secret); an admin who can delete leads | Fingerprints equal |

## 2. Acceptance criteria (owner, 2026-10-13)

Every form creates **exactly one** lead, and on that lead, visible in the CRM:

| Form | Category / source | Contact details | Message | Consent + context |
|---|---|---|---|---|
| www home `/` | **website category** (not Elementor) | name, phone, email as typed | ✅ visible | context ✅; no consent box on www |
| www contact `/יצירת-קשר` | website category | ✅ | ✅ visible | context ✅ |
| lp `/` | the agreed lp-home label (not "Elementor") | ✅ | (no message field) | consent ✅ (given, text, policy URL, time) + context ✅ |
| lp `/architecture/` | אדריכלות | ✅ | (none) | consent ✅ + context ✅ |
| lp `/interior-design/` | עיצוב פנים | ✅ | (none) | consent ✅ + context ✅ |
| lp `/renovation/` | **שיפוץ** (new) | ✅ | (none) | consent ✅ + context ✅ |

**Website side, for every form:**
- The thank-you page and exactly one `generate_lead` appear only after a confirmed lead.
- No conversion on any failure.
- An uncertain outcome is never shown as success or as a definite failure.

## 3. Tests (local)

Each test lists: **Action** · **HTTP** · **CRM** · **Visitor** · **Analytics** · **Cleanup**.

### T0: Connectivity
- **Action:** submit the www home form (`-00`).
- **HTTP:** 200 `{"ok":true}`. Worker log `lead: created in OfficeCRM (leadId <id>, N ms)`.
- **CRM:** one lead with that id.
- **Visitor:** `/thankyou`.
- **Analytics:** one `generate_lead`.
- **Cleanup:** delete the lead.

### T1: Main-site forms (acceptance rows 1–2)
- **Action:** submit home (`-01`) and contact (`-02`), each once, with a message.
- **CRM:** one lead each, matching §2: website category; message visible; context (page, form, UTMs) stored. Check it in the **lead screen**, not only in the database.
- **Visitor:** `/thankyou`.
- **Analytics:** one `generate_lead` each.
- **Cleanup:** delete.

### T2: Landing-page forms (acceptance rows 3–6)
- **Action:** submit `/` (`-03`), `/architecture/` (`-04`), `/interior-design/` (`-05`) and `/renovation/` (`-06`), with consent ticked.
- **CRM:** one lead each, matching §2. Consent stored with `given: true`, the exact displayed text, the policy URL and the time. Context stored.
- **Visitor:** `/thankyou/`.
- **Analytics:** one `generate_lead` each (`lp-…`).
- **Cleanup:** delete.

### T2b: Category is independent of campaign tags
- **Action:** `/architecture/?utm_campaign=interior_design` (`-07`).
- **CRM:** category `אדריכלות` (from `lead_source`, not from the URL).
- **Cleanup:** delete.

### T3: Exactly one lead per accepted submission
- **Action:** after T1–T2b, count the leads with names starting `TEST – website migration <run>`.
- **Expected:** exactly 7 (plus T0 if not deleted). Each `leadId` matches its Worker log line, and each lead carries its `submission_id`.

### T4: Field fidelity
- **T4a:** Hebrew name with a geresh; phone `+972 52-431-7164`; mixed-case email.
  - **Expected:** stored exactly as sent, or as the confirmed contract defines normalisation. No mojibake.
- **T4b:** a www message containing a second address (`תחזרו אליי ל-other+crmtest@gmail.com`).
  - **Expected:** the lead's email is the form's email field; the message is shown intact.
- **T4c:** a 5,000-character message, with line breaks.
  - **Expected:** shown in full on the lead, or truncated exactly as the contract specifies.
- **Cleanup:** delete.

### T5: Invalid input (website and CRM both refuse)
- **Browser:** empty name; empty phone; phone `12345`; invalid email; lp consent unticked.
  - **Expected:** no request; inline messages; focus on the first invalid field.
- **API, bypassing the browser:** POST with `phone:''` → 400 `missing_phone`; with `phone:'123'` → 400 `invalid_phone`.
- **CRM directly** (local only, `curl` with the local key): a `website-v1` body missing `email` → **400** with a field list, and **no** lead.
- **Analytics:** no `generate_lead`.

### T6: Authentication
- **Wrong key:** set `.dev.vars` to a wrong key and restart; submit once.
  - **CRM:** 401, no lead.
  - **Worker:** 502 `crm_rejected` / `not_saved`. The visitor sees the **retry** message.
- **Missing key in the Worker:** 503 `not_configured`, nothing sent; retry message.
- **CRM without a key:** 503 "Webhook is not configured.", no lead; retry message.
- **Analytics:** no `generate_lead` in any case.
- **Cleanup:** restore the key; rerun T0.

### T7: CRM validation surfaces correctly
- **Action:** a `website-v1` request the CRM rejects but the website would accept, if any exists. Otherwise mark N/A.
- **Expected:** 400 from the CRM → 502 `not_saved` → retry message; no lead.

### T8: Network failure, timeout and response times (owner D6)
- **CRM stopped** (Ctrl-C), submit once.
  - **Worker:** `unreachable, unknown`. The visitor sees the **uncertain** message; no resubmit invited; no conversion.
- **Response times:** from the Worker log lines of T0–T4, record min / median / max ms, including the **first request after a cold start** of `npm run dev`. If the max is above ~10 s, revisit the 20 s timeout with the owner.
- **Timeout after save:** covered by the fake CRM's `slow-after-save` (the lead exists; the visitor sees "uncertain"; no conversion). Tested in `test/e2e/forms.e2e.mjs`.

### T9: No 500 after a write (B4)
- **Action (local CRM):** force a post-write secondary failure, e.g. make the warning-note write throw, in a local test build of OfficeCRM.
- **Expected:** the CRM returns success (with warnings), not 500. Exactly one lead.
- **Website:** thank-you page, one `generate_lead`.

### T10: Duplicates (B3)
- **Same fill resubmitted:** after an "uncertain" outcome (CRM stopped right after its write, or `slow-after-save` in a local CRM test build), submit again from the same, unreloaded form.
  - **Expected:** the same `submission_id` and `Idempotency-Key` on both requests. The CRM returns the **same** `leadId` with `duplicate: true`. **One** lead.
- **Double click:** one request; one lead.
- **A new fill with the same details:** a different `submission_id`, so a second lead, unless the owner chose B3's optional "likely duplicate" flag.
- **Without B3:** two leads. Record this as a failure of the duplicate requirement.

### T11: Conversions
Across T5–T10: no `generate_lead` except on confirmed leads. Opening or refreshing `/thankyou` directly adds none. With `?gtm=1` and GTM Preview, no GA4, Ads or Meta lead tag fires on failures or uncertain outcomes.

### T12: WhatsApp and phone clicks are not leads
- **Action:** click the floating WhatsApp button, the WhatsApp and phone links in both messages (retry and uncertain), the lp thank-you WhatsApp button, and the www phone and email links.
- **Expected:**
  - No `/api/lead` request; no CRM lead.
  - Only `whatsapp_click` / `phone_click` / `email_click`.
  - lp `972524317164` / `tel:+972524317164`; www `972505788634` / `tel:+972505788634`.

### T13: Logs
- **Worker:** only `created … (leadId, ms)` / `did not confirm … (reason, outcome, ms)`. No personal data, URL or key.
- **CRM:** check its request logging for `Authorization` headers.

### T14: Elementor regression (until the lp cutover)
- **Action:** POST an Elementor-style form-urlencoded payload to the **local** CRM.
- **Expected:** handled exactly as before the CRM changes (CHANGE-REQUEST §2).
- **Cleanup:** delete.

## 4. Production verification (only after §3 passes, with explicit owner approval)

1. Fingerprints match (P9). Set the production secrets on `hagarlushi` and `hagarlushi-lp`.
2. On each Worker's `workers.dev` address, submit **one** lead: `TEST – website migration PROD`, `utm_source=crmtest`. Use the lp `/architecture/` form; on www, the contact form with a message.
3. One POST each, no retries.
4. Confirm against §2 in the production lead screen, including the response time in the Worker log. An admin deletes both leads immediately.

## 5. Automated coverage today (fake CRM)

| Area | Status |
|---|---|
| Validation, inline messages, focus, no request on invalid input | ✅ |
| Confirmed → thank-you page + one `generate_lead`; none on failure | ✅ |
| Not saved (401/503/400…) → retry message; unknown (500, 500-after-save, slow-after-save, timeout, reset, malformed, browser offline) → uncertain message; never success | ✅ (`npm test` 79/79; e2e 240/240 and 44/44, 2026-10-13) |
| 20 s timeout and response-time logging | ✅ |
| Payload `{lead_source, message, consent, context, submission_id}` + `Idempotency-Key` | ⏸ waits for P2 (current tests still assert today's `{name, phone, email, source, notes}`) |
| Real CRM | ⏸ §3 |

## 6. Results log

| Test | Date | Environment | Result | leadIds | Response ms | Notes |
|---|---|---|---|---|---|---|
| T0 |  |  |  |  |  |  |
| T1 |  |  |  |  |  |  |
| T2 |  |  |  |  |  |  |
| T2b |  |  |  |  |  |  |
| T3 |  |  |  |  |  |  |
| T4a–c |  |  |  |  |  |  |
| T5 |  |  |  |  |  |  |
| T6 |  |  |  |  |  |  |
| T7 |  |  |  |  |  |  |
| T8 |  |  |  |  |  |  |
| T9 |  |  |  |  |  |  |
| T10 |  |  |  |  |  |  |
| T11 |  |  |  |  |  |  |
| T12 |  |  |  |  |  |  |
| T13 |  |  |  |  |  |  |
| T14 |  |  |  |  |  |  |
