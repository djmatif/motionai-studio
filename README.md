# MotionAI Studio

A Next.js browser app starter for AI text-to-video creation, with Supabase authentication/database, fal.ai model queue integration, and Stripe subscriptions.

## What is included

- Dark responsive studio UI
- Email/password signup and login using Supabase Auth
- Server-side fal.ai queue submission and status/result polling
- Three server-configured model tiers (balanced, premium, fast)
- Credit balance and atomic credit reservation
- Stripe Checkout subscription flow and webhook starter
- Supabase SQL schema with row-level security

## Important launch status

This is a deployable **starter codebase**, not a live hosted service. It will not render videos until you create provider credentials and configure the integrations below. Model endpoint input schemas and output shapes can change; validate the selected endpoint schemas in your fal dashboard before production. The current adapter deliberately sends only `prompt` to avoid passing unsupported model-specific fields. Duration and aspect ratio are stored but not forwarded until the selected model adapters are verified.

Image-to-video is shown in the UI as a planned path but is not yet wired to an upload/storage provider. The current generation route supports text-to-video only.

## Requirements

- Node.js 20+
- A Supabase project
- A fal.ai account and API key
- A Stripe account and two recurring monthly prices (optional until paid plans are enabled)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `FAL_KEY`
   - `NEXT_PUBLIC_APP_URL`

3. In Supabase SQL Editor, run `supabase/schema.sql`.

4. In Supabase Auth settings, enable email/password and set the site URL plus redirect URL:
   - Local: `http://localhost:3000/auth/callback`
   - Production: `https://YOUR_DOMAIN/auth/callback`

5. Run locally:

   ```bash
   npm run dev
   ```

6. Open `http://localhost:3000`.

## Enable paid plans

1. Create Pro and Studio recurring monthly prices in Stripe.
2. Add their IDs to `STRIPE_PRICE_PRO_MONTHLY` and `STRIPE_PRICE_STUDIO_MONTHLY`.
3. Add `STRIPE_SECRET_KEY`.
4. Create a Stripe webhook endpoint pointing to `https://YOUR_DOMAIN/api/billing/webhook`.
5. Subscribe to `checkout.session.completed` and `customer.subscription.deleted`.
6. Set `STRIPE_WEBHOOK_SECRET`.

The sample pricing in the UI is illustrative. Confirm the prices and credit allowance against actual AI inference costs before selling subscriptions.

## AI model configuration

Model IDs live in `lib/models.ts`. Review each endpoint's current request schema and pricing in fal's model catalog before production. This starter uses fal's queue API so long-running generations do not block a request. Keep `FAL_KEY` server-side only.

References:
- fal text-to-video catalog: https://fal.ai/explore/text-to-video-apis
- fal queue submit: https://fal.ai/docs/api-reference/inference-api/queue/submit
- fal queue status: https://fal.ai/docs/api-reference/inference-api/queue/status
- Supabase Next.js Auth: https://supabase.com/docs/guides/auth/quickstarts/nextjs

## Production hardening required before public launch

- Use a server-only Supabase admin client for refund and webhook operations.
- Make refunds idempotent and verify provider failure state before refunding.
- Add rate limiting, CAPTCHA/abuse protection, prompt moderation and upload validation.
- Add webhook signature verification for provider callbacks if using webhooks.
- Persist provider output to your own object storage; provider result URLs may expire.
- Add subscription lifecycle handling for `updated`, `past_due`, `unpaid`, and `deleted`.
- Add billing portal, cancellation, receipts, tax handling, privacy policy and terms.
- Add usage limits, spend caps and model-specific credit pricing.
- Implement image uploads and model-specific image-to-video adapters.
- Add job retry/cancel controls, generation history UI, observability and backups.
- Review generated content and provider terms for commercial usage.

## Suggested deployment

Deploy the Next.js app to Vercel or another Node-compatible host. Add all environment variables in the host dashboard, then deploy. Use HTTPS in production.

## Admin account and free admin access

The login page is `/login` and supports Supabase email/password signup and sign-in. The admin dashboard is `/admin`.

1. Create your own user in Supabase Auth (or register through `/login`) using the email address you control.
2. Set that account's password in Supabase Auth or through the normal password-reset flow. **Do not put the password in source code, Git, or a public environment variable.**
3. Set `ADMIN_EMAIL` in `.env.local` and your hosting provider to that exact email address (lowercase is recommended).
4. Restart/redeploy. Sign in at `/login`; the matching account will see the Admin link and can open `/admin`.

The allow-list is checked on the server. Admin video generations bypass the app's credit deduction; they are not free to operate—the fal.ai provider still bills the account owner for inference. Regular free users retain the configured starter credits. Never expose `SUPABASE_SERVICE_ROLE_KEY` or `FAL_KEY` to the browser.

## AI video model research — 9 November 2026

- fal's current catalog lists Veo 3.1, Seedance 2.0, Sora 2/2 Pro and Kling 3 generation options with native audio or reference-based workflows depending on model. Its published examples include Kling 2.5 Turbo Pro at $0.07/sec, Seedance 2.0 720p with audio at $0.3034/sec, and Veo 3.1 720p/1080p with audio at $0.40/sec. These are provider-specific live catalog prices, not universal prices; re-check before setting customer credits.
- fal's image-to-video catalog lists distinct input fields by model (for example `image_url` for Seedance 2.0 and `start_image_url` for Kling 3.0 Pro), so a single generic request adapter is not sufficient for image-to-video.
- Google's Gemini API pricing page lists Veo 3.1 Standard at $0.40/sec with audio, Veo 3.1 Fast at $0.10/sec at 720p (and $0.12/sec at 1080p), and Veo 3.1 Lite at $0.05/sec at 720p. These rates are for Google's API, not fal's wrapper.
- Kling's official API update log reports Kling 4.0 available from 28 October 2026 with text-to-video, image-to-video and omni reference-to-video, up to 30 seconds, 720p/1080p, keyframes and audio; Kling 4.0 Flash was announced 4 November with 3–20 second 720p output.
- Runway's official developer changelog reports Kling 4.0 Flash on 5 November 2026 and Gemini Omni 1.2 Flash on 5 November, with text/image/video reference workflows and audio; Seedance 2.5 bitrate high mode was added 27 October without changing listed rates.

### Tier recommendation

- **Fast / low-cost:** compare Veo 3.1 Fast/Lite and Seedance 2.0 Fast against the exact target resolution/audio setting. Choose by measured cost and latency, not model name alone.
- **Balanced:** benchmark Seedance 2.0 and Kling 3.x/4.x for prompt adherence, motion and audio. Keep Veo 3.1 as an option where its audio/visual quality justifies its higher cost.
- **Premium:** evaluate Veo 3.1 Standard, Seedance 2.x and Kling 4.0 at the same resolution and duration. Kling 4.0's longer single-run duration and keyframe controls may be useful for more directed scenes.

### Required engineering follow-up

Do not silently swap the starter's model IDs based on catalog names. Validate each exact fal endpoint, request schema, response shape, duration/resolution limits and current price in the fal dashboard. Implement separate text-to-video and image-to-video adapters per model, then derive credit charges from provider cost plus margin. The current starter still only wires text-to-video and intentionally sends a minimal prompt payload.

Sources checked 9 November 2026:
- fal text-to-video catalog: https://fal.ai/explore/text-to-video-apis
- fal image-to-video catalog: https://fal.ai/explore/image-to-video-apis
- Google Gemini API pricing: https://ai.google.dev/gemini-api/docs/pricing
- Kling API updates: https://kling.ai/document-api/updates/api
- Runway developer changelog: https://docs.dev.runwayml.com/api-details/api_changelog/
