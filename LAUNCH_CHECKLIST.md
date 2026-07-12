# Launch Checklist — Stripe Billing

This checklist covers production setup and verification for Stripe billing in Independent Minds EDU.

## 1) Stripe Dashboard Setup

### Products and prices

- [ ] Create product: Basic (monthly recurring)
- [ ] Create product: Plus (monthly recurring)
- [ ] Create product: Pro (monthly recurring)
- [ ] Copy each price ID and set Supabase secrets:
	- STRIPE_PRICE_BASIC
	- STRIPE_PRICE_PLUS
	- STRIPE_PRICE_PRO

### Webhook endpoint and events

- [ ] Create endpoint URL:
	- https://wkvattbvybvgaeobtidl.supabase.co/functions/v1/stripe-webhook
- [ ] Subscribe to exactly these 6 events:
	- checkout.session.completed
	- customer.subscription.created
	- customer.subscription.updated
	- customer.subscription.deleted
	- invoice.payment_failed
	- invoice.paid
- [ ] Copy webhook signing secret to Supabase secret:
	- STRIPE_WEBHOOK_SECRET

### Restricted server key

- [ ] Create restricted secret key in Stripe for checkout, subscriptions, invoices, customers, and billing portal usage
- [ ] Store as Supabase secret:
	- STRIPE_SECRET_KEY

### Customer portal

- [ ] Configure Stripe Customer Portal:
	- Allow payment method updates
	- Allow subscription cancellation/reactivation per policy
	- Set return URL: https://www.independentmindsedu.org/billing

### Client publishable key

- [ ] Set client key in Vercel environment:
	- VITE_STRIPE_PUBLISHABLE_KEY

## 2) Env Var Destinations (Do Not Commit Values)

### Supabase Edge Functions secrets

- [ ] STRIPE_SECRET_KEY
- [ ] STRIPE_WEBHOOK_SECRET
- [ ] STRIPE_PRICE_BASIC
- [ ] STRIPE_PRICE_PLUS
- [ ] STRIPE_PRICE_PRO

### Vercel client environment

- [ ] VITE_STRIPE_PUBLISHABLE_KEY

## 3) Post-Setup Smoke Test (Success Path)

Use Stripe test mode card:

- Card number: 4242 4242 4242 4242

Checklist:

- [ ] Start checkout from pricing page
- [ ] Complete checkout with test card
- [ ] Verify public.subscriptions row exists for user
- [ ] Verify webhook delivery shows HTTP 200 in Stripe event logs
- [ ] Verify public.billing_events row inserted for checkout/subscription event(s)
- [ ] Verify /billing page shows updated active or trialing status
- [ ] Verify SubscriptionGate unlocks premium features (AI Tutor + Weekly Reports)

## 4) Failure Smoke Test (Payment Failure Path)

Use Stripe test mode card:

- Card number: 4000 0000 0000 0341

Checklist:

- [ ] Trigger payment failure scenario
- [ ] Verify invoice.payment_failed event lands in public.billing_events
- [ ] Verify admin notification rule fires (hourly monitor payment-failure alert path)

## 5) Final Sign-Off

- [ ] Stripe setup complete
- [ ] All env vars set in correct destination
- [ ] Success smoke test passed
- [ ] Failure smoke test passed
- [ ] Billing launch approved
