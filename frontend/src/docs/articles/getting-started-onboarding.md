# Onboarding wizard walkthrough

The first time an admin logs into a brand-new account, E-Daarah shows the **onboarding wizard** — five short questions that configure your madrasah. Total time: under 2 minutes.

> **Every answer can be changed later** in **Settings → Features**.

## Question 1 — How do you organise your academic year?

Two cards:

- **Academic year with semesters** — one active session at a time (e.g. 2025–26), split into terms or halves. Best for madrasahs with fixed term dates.
- **Rolling cohorts** — multiple cohorts run in parallel. Students join anytime and are tracked individually from their start date. Best for online or year-round schools.

Pick whichever matches your real-world setup, then **Continue**.

## Question 2 — Which features do you need?

Tap each one to toggle it on. All four default to off:

- **Learning Tracker** — Qur'an memorisation + course progress per student. Visible in the parent report.
- **Grade Tracking** — record behaviour, dress, and punctuality alongside attendance.
- **Fee Tracking** — manage student payments, balances, and reminders.
- **Teacher Availability** — teachers mark days they're unavailable in the next 2 weeks.

Anything you skip just hides the related tab. **Continue**.

## Question 3 — How do you want to calculate fees? *(only if Fee Tracking is on)*

- **Manual** — you set each student's expected fee yourself.
- **Automatic** — E-Daarah computes fees based on your active session/semester.

If you choose Automatic, you'll see a sub-question: **"Should we prorate fees for students who join mid-period?"** with two answers — *Yes, prorate fees* / *No, charge the full period fee*.

## Question 4 — How should availability link to your Planner? *(only if Teacher Availability is on)*

- **Planner-aware** *(Recommended)* — availability is tied into the planner so admins know who's off when scheduling.
- **Independent** — availability is informational only; doesn't affect the planner.

## Question 5 — What currency do you use? *(only if Fee Tracking is on)*

A dropdown with 22 supported currencies (GBP, USD, NZD, AUD, EUR, NGN, ZAR, KES, GHS, EGP, MYR, IDR, PKR, INR, BDT, SAR, AED, QAR, SGD, TRY, CHF, plus more).

## Done

After the last question you'll see a "Setup complete" screen and land on the dashboard. The wizard never returns once finished.

## Made a mistake?

Open **Settings → Features** to flip any toggle. **Settings → Scheduling Mode** changes the academic vs cohort answer. **Settings → Fee Calculation Mode** changes fees.

## What's next?

- [Recording attendance](/docs/admins/attendance)
- [FAQ](/docs/help/faq)

<!-- docs-meta
sources:
  - frontend/src/pages/admin/OnboardingWizard.jsx
  - backend/src/routes/admin.routes.js#L2495-L2630
last_audited: 2026-05-04
-->
