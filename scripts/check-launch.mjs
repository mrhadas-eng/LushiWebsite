// Pre-launch check: run `npm run check-launch` before pointing the domain at Firebase.
// Exits with an error if anything that loses leads or statistics is still missing.
import fs from 'node:fs';
import { site } from '../src/data/content.mjs';

const results = [];
const check = (ok, label, fix) => results.push({ ok, label, fix });

check(/^https:\/\//.test(site.leadWebhook?.url || ''), 'Contact forms send to the CRM webhook (leadWebhook.url)',
  'Paste the CRM webhook URL (https://...) into site.leadWebhook.url in src/data/content.mjs');
check(['json', 'form'].includes(site.leadWebhook?.format) && ['cors', 'no-cors'].includes(site.leadWebhook?.mode),
  'Webhook format and mode are valid', 'leadWebhook.format must be "json" or "form"; leadWebhook.mode "cors" or "no-cors"');
check(fs.existsSync('src/pages/thankyou.astro'), 'Thank-you page exists (/thankyou)', 'Restore src/pages/thankyou.astro');
check(/^GTM-[A-Z0-9]+$/.test(site.gtmId || ''), 'Google Tag Manager container is set (gtmId)',
  'Set site.gtmId in src/data/content.mjs (the Wix site uses GTM-KJRR2DNT)');
check(/^\d{10,15}$/.test(site.whatsapp?.number || ''), 'WhatsApp number is set',
  'Set site.whatsapp.number in international format without "+", e.g. 972505788634');

const fb = JSON.parse(fs.readFileSync('firebase.json', 'utf8'));
const redirects = fb.hosting?.redirects || [];
check(redirects.some((r) => r.source === '/home'), 'Old Wix pages redirect (firebase.json)',
  'Restore the redirects list in firebase.json');

const media = fs.existsSync('public/media') ? fs.readdirSync('public/media').length : 0;
check(media > 100, `Images are stored locally (${media} files in public/media)`,
  'Run "npm run fetch-media" or the "Copy images from Wix" GitHub Action');

let failed = 0;
for (const r of results) {
  console.log(`${r.ok ? '✔' : '✘'} ${r.label}`);
  if (!r.ok) { failed++; console.log(`    → ${r.fix}`); }
}
console.log(failed ? `\n${failed} item(s) to fix before launch. See LAUNCH.md.` : '\nCode is ready. Remaining steps outside the code are in LAUNCH.md.');
process.exit(failed ? 1 : 0);
