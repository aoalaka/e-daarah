# Frequently asked questions

Quick answers to common questions. If yours isn't here, open a support ticket from your dashboard.

## Account & billing

### Do I need a credit card to sign up?

No. Most institutions start on a 14-day trial of the full feature set. Qur'an-focused institutions get the free plan permanently. No card asked for at signup either way.

### Can I change plans later?

Yes — **Settings → Billing → Choose a Plan**. We auto-cancel your old subscription so you're never charged twice.

### What happens when my trial ends?

If you haven't subscribed by then, your access becomes restricted (read-only). Your data is safe — you just need to subscribe to keep recording new attendance, exams, etc.

### How do I cancel my subscription?

**Settings → Billing → Manage Billing** opens the Stripe customer portal where you can cancel any time. Your account stays active until the end of the period you've already paid for.

## Students & classes

### Can a student be in multiple classes?

No — each student belongs to one class. If a student moves between classes during the year, edit their record and change the class.

### How do I move a student to a different class?

**Students → click the student → change Class → Save.** Their attendance, exam, and Qur'an history stays attached to them, not the old class.

### Can I import students from a spreadsheet?

Yes. **Students → Bulk Upload** accepts CSV or Excel (`.csv`, `.xlsx`, `.xls`). You can optionally assign all uploaded students to a class.

## Attendance

### Why can't I record attendance for today?

Two common causes:

- The class has zero students assigned to it
- Your active session/semester hasn't been set up yet (or has ended)

The attendance screen shows which condition isn't met.

### Can I edit attendance from a previous day?

Yes — pick the date at the top of the page, change rows, save. Editing past records overwrites the original.

## Fees

### How does fee tracking work?

Two modes — **Manual** (you set each student's expected fee) or **Automatic** (computed from your active period). Pick one in **Settings → Fee Calculation Mode**.

### Can parents pay through the app?

Not yet. E-Daarah tracks who has paid and who owes — actual payment still happens through whatever channel you use today (cash, bank transfer, mobile money). You record the payment in the Fees screen.

## Parents

### How do parents log in?

Parents go to your madrasah's parent login URL (e.g. `e-daarah.com/your-madrasah/parent-login`).

- **First time:** click **Register**, enter phone + a **6-digit PIN** they pick, optionally their name. Done.
- **Returning:** enter phone + PIN.

There's no SMS code — the PIN is the password.

### Can a parent see multiple children?

Yes — students whose parent phone number matches all show up in that parent's portal as a child selector at the top.

## SMS

### How much do SMS messages cost?

It depends on message length. A standard SMS (≤160 characters) is one credit. Each credit costs around 5–10 cents depending on the recipient's country. See **SMS → Buy credits** for current pricing.

### Why didn't a parent receive my SMS?

Common causes:
- Wrong phone number on the student record (or missing the country code)
- The parent's network rejected the message (some networks block international SMS)
- The parent has previously opted out

Check **SMS → History** to see the delivery status of every message.

## Exporting data

### Can I export my data?

Yes for the lists that have an Export button — currently **Students** and **Reports**. They export as CSV. Other lists are export-on-request — open a support ticket.

## Technical

### Does E-Daarah work offline?

Partially — dashboards cache data so you can read most things offline. Recording attendance and other writes need a connection.

### Is my data backed up?

Yes — daily database snapshots, retained for 30 days. If anything goes wrong, contact support.

### Where is my data stored?

In a managed MySQL database hosted by Railway (a US-based cloud platform). Encrypted at rest and in transit.

## Still stuck?

Open a **Support ticket** from your dashboard. We aim to respond within 24 hours.

<!-- docs-meta
sources:
  - frontend/src/pages/ParentLogin.jsx
  - frontend/src/pages/admin/sections/StudentsSection.jsx
  - backend/src/routes/auth.routes.js#L78-L180
last_audited: 2026-05-04
-->
