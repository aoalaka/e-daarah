# Recording fee payments

Each time a parent pays, record the payment in E-Daarah so balances stay current.

## Step 1: Find the student

1. Open **Fees** in the side nav.
2. Filter by class or by semester at the top to narrow the list.
3. Find the student in the table.

## Step 2: Click "Record Payment"

A modal opens. The student's name is pre-filled.

## Step 3: Fill in the payment details

- **Amount Paid** *(required)* — the amount paid in this transaction. Can be partial.
- **Payment Date** *(required)* — defaults to today.
- **Payment Method** — one of:
  - **Cash**
  - **Bank Transfer**
  - **Online**
  - **Other**
- **Payment Label** *(optional)* — what the payment is for. E.g. "Term 1 2026" or "Books fee".
- **Reference / Note** *(optional)* — receipt number, transaction ID, anything that helps reconcile later.

## Step 4: Save

The payment is added to the student's record. The Fees summary updates instantly:

- **Paid** column increases by the amount
- **Outstanding** column decreases
- **Status pill** flips to *Paid* if fully paid, *Partial* if some still owed.

## Editing or deleting a payment

In the **Payments** view (use the sub-tab toggle at the top of the Fees page), every payment is listed. Each row has Edit and Delete actions. Edits update the running total instantly.

## Generating a family fee statement

For families paying multiple children's fees:

1. Open **Reports → Fee Report**.
2. Filter by family (parent phone).
3. Click **Print statement**. A printable PDF-ready page opens with:
   - Madrasah name + logo at the top
   - Parent name + phone
   - Each child's expected fee, paid, outstanding
   - Grand total for the family
   - Footer: *"Powered by E-Daarah"*

Use your browser's Print → Save as PDF to send the statement to the parent.

## What parents see

Parents see their fee status on the parent portal:

- Total expected for the period
- Total paid
- Outstanding balance
- A list of recent payments with date, amount, method, and label

## Common pitfalls

- **Wrong amount stays on the record forever** — it doesn't. Open the **Payments** view, edit the row.
- **Payment recorded against the wrong student** — same fix. Edit or delete and re-record under the right student.
- **Status still says "Unpaid" after recording** — the student has no expected fee set. Set one (see [Setting up fees](/docs/admins/fees-setup)) or the system has nothing to compare against.
- **Family statement only shows one child** — siblings are matched by parent phone number. Make sure both students have the same `parent_guardian_phone` and country code.

## What's next?

- [Sending SMS to parents](/docs/admins/sms) — set up automatic fee reminders
- [Setting up fees](/docs/admins/fees-setup)

<!-- docs-meta
sources:
  - frontend/src/pages/admin/sections/FeesSection.jsx
  - frontend/src/pages/admin/sections/ReportsSection.jsx
  - backend/src/routes/admin.routes.js
last_audited: 2026-05-05
-->
