# Setting up fees

E-Daarah tracks expected fees per student and how much they've paid. Set it up once, then record payments as they come in.

## Two fee tracking modes

Set in **Settings → Features → Fee Calculation Mode**:

- **Manual** *(default, simpler)* — you set each student's expected fee yourself.
- **Automatic** — E-Daarah computes the expected fee per period from a fee schedule you define. Useful if all students in a class pay the same and you want auto-prorated joiners.

If unsure, start with Manual. You can switch later.

## Manual mode setup

### Option A — Set fees in bulk

1. Open **Fees**.
2. Click **Set Expected Fee**.
3. Filter to a class (or leave to apply to all students).
4. Enter the fee amount + an optional note (e.g. "Term 1 fees").
5. Click **Apply**. Every student in the filter gets that expected fee.

### Option B — Set fees one student at a time

1. Open **Students** → click a student.
2. Edit their record. Scroll to **Expected Fee** and **Fee Note**.
3. Save.

Or, in the Fees screen, click **Edit** on a student's row.

## Automatic mode setup

In Auto mode, the Fees tab has two sub-tabs: **Schedules** and **Summary**.

### Step 1: Create a fee schedule

1. **Fees → Schedules → + New Schedule**.
2. Pick the **Class** (or pick a single student for an individual override).
3. **Billing cycle**: *Per Semester · Per Term · Per Month*.
4. **Amount** in your madrasah's currency.
5. **Description** *(optional)*.
6. Save.

Repeat for each class with a different fee.

### Step 2: Enable proration *(optional)*

In **Settings → Fee Calculation Mode → Prorate fees for students who join mid-period**:

- **Yes, prorate fees** — joiners pay a partial fee based on weeks remaining in the period.
- **No, charge the full period fee** — every joiner pays the full amount regardless of join date.

### What auto mode computes

For each student, E-Daarah looks at:

- The active session/semester (or cohort period if cohort mode)
- Their enrollment date vs the period start
- The schedule that applies to their class
- The proration setting

…and computes their expected fee for the current period. Visible in **Fees → Summary**.

## What appears in Fees Summary

A row per student showing:

- Student name + class
- **Total fee** (expected)
- **Paid** so far this period
- **Outstanding balance**
- **Status pill**: Paid · Partial · Unpaid · No fee set

## Common pitfalls

- **"No fee data yet"** — you haven't set any expected fees. Use **Set Expected Fee** to assign one.
- **Auto mode showing zero fees** — no fee schedules exist for that class. Create a schedule under the Schedules sub-tab.
- **Switched manual → auto, but old fees still show** — manual `expected_fee` values stay on the student record. Auto mode ignores them and uses schedules instead.

## What's next?

- [Recording fee payments](/docs/admins/fees-payments)
- [Sending SMS to parents](/docs/admins/sms) — including auto fee reminders

<!-- docs-meta
sources:
  - frontend/src/pages/admin/sections/FeesSection.jsx
  - frontend/src/pages/admin/sections/SettingsSection.jsx
  - backend/src/routes/admin.routes.js
last_audited: 2026-05-05
-->
