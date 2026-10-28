# Analytics event inventory (2026-10-11)

These are the events the website pushes to the Google Tag Manager `dataLayer`. They apply to both sites: `www.hagarlushi.com` and `lp.hagarlushi.com`.
- **Container:** `GTM-KJRR2DNT` on both sites. The landing pages also load the Site Kit Google tag `GT-TQKZV73G`.
- **Where tags run:** GTM and the Google tag load only on `*.hagarlushi.com` (or with `?gtm=1`). The events are pushed everywhere, so local tests can check them.
- **Privacy:** no event carries a name, phone number, email or message.

**What "Implemented" means:** the website already pushes the event. Nothing reaches GA4, Google Ads or Meta until someone adds a **trigger and tag in GTM**. Today's GTM container (v9) has no trigger for any of these events.

## Lead and contact events

| Event | Status in code | Fires when | Parameters | GTM configuration needed | Conversion? |
|---|---|---|---|---|---|
| `generate_lead` | **Implemented** (`src/lib/lead-client.js`) | Once, on the thank-you page (`/thankyou` on www, `/thankyou/` on lp), **only** after OfficeCRM confirmed the lead (`success: true`). Never fires on a refresh, a direct visit, a validation error, a delivery failure, an **uncertain outcome** (OfficeCRM 500, timeout, dropped connection: the lead may exist but isn't confirmed), a bot submission or a WhatsApp click. | `form_location`: `home`, `contact`, `lp-home`, `lp-architecture`, `lp-interior-design`, `lp-renovation` | **Required:** Custom Event trigger `generate_lead` → GA4 event tag `generate_lead` (send `form_location`) → mark it as a Key event in GA4. **Recommended:** Google Ads conversion `AW-16872313549` on this event instead of the lp `/thankyou/` page view (D6). **Optional:** Meta Pixel `Lead`. | **Yes**: the only lead conversion |
| `whatsapp_click` | **Implemented** (`src/components/Tracking.astro`, every `wa.me` / `whatsapp.com` link on both sites) | A visitor clicks a WhatsApp link. That opens the chat; it is **not a lead**. Nothing goes to OfficeCRM, and there is no thank-you page and no `generate_lead`. | `link_url` (www: `wa.me/972505788634`; lp: `api.whatsapp.com/send/?phone=972544317164`), `link_location` (`floating_button`, `thankyou`, `form_error`, `header`, `footer`, `page`; lp: `lp_float`, `lp_thankyou`, `lp_form_error`), `page_path` | **Required:** Custom Event trigger → GA4 event tag `whatsapp_click`. | **No.** Do not link it to Google Ads or Meta `Lead` (owner decision 2026-10-11). It may be a secondary GA4 event. |
| `phone_click` | **Implemented** (every `tel:` link) | A visitor taps a phone number: www 050-578-8634; lp only in the delivery-failure message (052-594-9682) | `link_url`, `link_location`, `page_path` | **Required:** trigger + GA4 event tag | No (secondary) |
| `email_click` | **Implemented** (every `mailto:` link) | A visitor clicks an email address (main site) | `link_url`, `link_location`, `page_path` | **Required:** trigger + GA4 event tag | No (secondary) |

## Proposed diagnostic form events (optional, not implemented)

These would explain *why* a form didn't produce a lead. They are not conversions and carry no personal data. Each is a few lines in the two form scripts, added only if the owner wants them; each also needs its own GTM trigger and GA4 tag.

| Event (proposed) | Would fire when | Parameters | Use |
|---|---|---|---|
| `form_validation_error` | Submit was blocked in the browser by missing or invalid fields | `form_location`, `fields` (e.g. `phone,consent`) | Find fields that confuse visitors |
| `lead_submit` | A valid form was sent to `/api/lead` (an attempt, before confirmation) | `form_location` | Attempts vs confirmed leads |
| `lead_delivery_failed` | The lead was valid but OfficeCRM didn't confirm it | `form_location`, `outcome` (`not_saved` / `unknown`), `reason` (`crm_rejected`, `crm_uncertain`, `network`, `not_configured`) | Alert on CRM or integration problems; `unknown` may mean an unconfirmed lead exists |

## Existing tags in the GTM container (unchanged by the migration)

| Tag | Fires on | Note |
|---|---|---|
| GA4 `G-4QMWQY3565` | All pages; blocked on lp | |
| Google Ads conversion `AW-16872313549` / `-2jHCIbIu50aEM2lrO0-` | Page view of `lp.hagarlushi.com/thankyou/` | Still fires (URL kept). It counts refreshes and direct visits; D6 recommends moving it to `generate_lead` |
| Meta Pixel `629224152313207` | All pages | |
| Microsoft Clarity `qc82doh8lz` | All pages; blocked on lp | |
| Site Kit Google tag `GT-TQKZV73G` | All lp pages (in the page itself, not in GTM) | Kept with the same ID |

## Verification

**Done locally** (Playwright against the local Cloudflare runtime and a mock OfficeCRM):
- One `generate_lead` per confirmed lead, and none on a refresh.
- None on a validation error or a CRM failure.
- `whatsapp_click` (and no `generate_lead`, and no CRM request) when clicking WhatsApp.
- GTM is not loaded off-domain.

**Not verified:** live firing in GA4, Google Ads or Meta. That needs GTM preview on the workers.dev address, using `?gtm=1`.
