# Creating your madrasah account

Setting up a new E-Daarah account takes about 5 minutes. Here's exactly what to fill in.

## What you'll need

- An email you check regularly
- A name for your madrasah
- Your phone number (with country code)
- Your madrasah's address (street, city, region, country)

> **No credit card needed.** Most institution types start on a 14-day trial of the full feature set. Qur'an-focused institutions get the free plan with no expiry instead.

## Step 1: Open the registration form

Go to [e-daarah.com](https://www.e-daarah.com) and click **Get Started** in the top nav.

## Step 2: Fill in the form

The form is one long page. Here's what each field is for:

**Madrasah name** — what your school is called. The URL slug auto-fills from this; you can edit it below.

**Your URL** — the slug used in your madrasah's address (e.g. `e-daarah.com/junior-academy/...`). Lowercase letters, numbers, and hyphens only.

**Institution type** — pick the closest match. **Qur'an-focused** institutions land on the simpler Solo dashboard for free; the rest get the full Admin dashboard with a 14-day trial.

**Admin first/last name, email, password** — the first user account, automatically given the admin role. Password must be at least 8 characters.

**Phone** with country code — required.

**Street, city, region, country** — all four are required.

**Agree to terms** — must be ticked to submit.

## Step 3: Click "Create Madrasah"

You'll see a *"Madrasah registered successfully"* toast and be redirected:

- **Qur'an-focused institutions** → straight to the **Solo** dashboard
- **All other types** → the **Admin** dashboard, with a 14-day trial banner at the top

## Step 4: Verify your email

A verification email goes out automatically. Check your inbox for a mail from `noreply@e-daarah.com`.

While unverified, the dashboard shows a yellow banner reading **"Verify your email · Please check your inbox and verify your email address to unlock all features."** with **Resend Email** and dismiss buttons.

If you don't see the email after a couple of minutes, click **Resend Email** in the banner. Don't forget to check Spam.

## What's next?

- [Onboarding wizard walkthrough](/docs/getting-started/onboarding) — the questions you'll answer right after signup
- [Recording attendance](/docs/admins/attendance)

<!-- docs-meta
sources:
  - frontend/src/pages/MadrasahRegistration.jsx
  - backend/src/routes/auth.routes.js#L78-L180
  - frontend/src/components/EmailVerificationBanner.jsx
last_audited: 2026-05-04
-->
