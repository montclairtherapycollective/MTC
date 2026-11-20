# montclairtherapycollective.com

Static site for Montclair Therapy Collective, hosted on Cloudflare Pages from this repo (`main` deploys automatically). No build step: the HTML in this repo is the site. Pages Functions live in `functions/`.

## How it fits together

- **Pages** are plain HTML. Styles in `assets/site.css`, behavior in `assets/site.js`.
- **Events** come from the MTC Luma calendar through `functions/api/events.js` (GET `/api/events`, cached 10 minutes). Add an event in Luma and it appears on the site on its own.
- **Forms** (contact, get listed, present a workshop) post to `functions/api/contact.js` (POST `/api/contact`), which emails Jen through Resend and sends the person a confirmation.
- **Email list** boxes post to Kit. Set the form ID in `assets/site.js` (`KIT_FORM_ID`) once the Kit form exists.

## Environment variables (Cloudflare Pages > Settings > Variables and secrets)

| Name | Value |
| --- | --- |
| `RESEND_API_KEY` | Secret. Resend API key (sending access) |
| `TO_EMAIL` | `montclairtherapycollective@gmail.com` |
| `FROM_EMAIL` | `website@notify.montclairtherapycollective.com` (verified Resend sender) |
| `HEALTH_TOKEN` | Secret. Random string for the health check |
| `HEALTH_TO` | Where health checks go (not Jen's inbox) |

Health check: POST `/api/contact` with header `x-health-token: <HEALTH_TOKEN>` and JSON `{"form":"contact","name":"Health check","email":"<HEALTH_TO>","message":"ok"}`. It emails only `HEALTH_TO` and skips the confirmation.

## Accounts

Everything runs under the shared Google account `montclairtherapycollective@gmail.com`: GitHub (`montclairtherapycollective/MTC`), Cloudflare (hosting and, after launch, DNS), Resend (form email), Kit (email list). Luma stays on Jen's own login. The domain is registered at Bluehost.
