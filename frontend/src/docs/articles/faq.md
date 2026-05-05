# Frequently asked questions

Quick answers to the questions we hear most often. If yours isn't here, open a support ticket from your dashboard.

## Account & billing

### Do I need a credit card to sign up?

No. Every new madrasah starts on a 14-day free trial of the Plus plan. No card asked for until you decide to subscribe.

### Can I change plans later?

Yes — Settings → Billing → choose another plan. We auto-cancel your old subscription so you're never charged twice.

### What happens when my trial ends?

If you haven't subscribed by then, your account moves to the Free tier. Your data is safe — you just lose access to Plus-only features (reports, advanced rankings, etc).

### How do I cancel my subscription?

Settings → Billing → **Manage Billing** opens the Stripe customer portal where you can cancel at any time. Your account stays active until the end of the period you've already paid for.

## Students & classes

### Can a student be in multiple classes?

Currently no — each student belongs to one class. If a student moves between classes during the year, edit their record and change the class.

### How do I move a student to a different class?

Students → click the student → change **Class** → save. Their attendance, exam, and Qur'an history stays attached to them, not the old class.

### Can I import students from a spreadsheet?

Not yet — students are added one at a time. Bulk import is on the roadmap.

## Attendance

### Why can't I record attendance for today?

A few possible causes:
- Today is set as a **holiday** in the planner
- The class has **0 students** assigned to it
- Your session/semester has ended (or hasn't started)

The attendance screen will tell you which of these applies.

### Can I edit attendance from a previous day?

Yes — just pick the date at the top. Editing past records overwrites the original.

## Fees

### How does fee tracking work?

Two modes — **Manual** (you set each student's expected fee) or **Automatic** (computed from your active period). Pick one in Settings → Features → Fee Calculation Mode.

### Can parents pay through the app?

Not yet. E-Daarah tracks who has paid and who owes — actual payment still happens through whatever channel you currently use (cash, bank transfer, etc.). You record the payment in the Fees screen.

## Parents

### How do parents log in?

They go to your madrasah's URL (e.g. `e-daarah.com/your-madrasah/parent/login`) and enter their phone number. They get a one-time code via SMS to confirm. From then on they're remembered on that device.

### Can two parents share one student?

Yes — a parent's phone number is the key. Whoever has the phone gets access. If both parents need access on different phones, both can log in with the same number.

### Can a parent see multiple children?

Yes — if multiple students share the same parent phone number, they all show up in the parent's portal as a child selector at the top.

## SMS

### How much do SMS messages cost?

It depends on how long the message is. A standard message (≤160 characters) is one credit. Each credit costs roughly 5–10c depending on the country. See **SMS → Buy credits** in your dashboard for current pricing.

### Why didn't a parent receive my SMS?

Common causes:
- The parent's phone number on the student record is wrong or missing the country code
- The parent's network rejected the message (some networks block international SMS by default)
- The parent has opted out of receiving SMS from you

Check **SMS → History** to see the delivery status.

## Technical

### Does E-Daarah work offline?

Partially — the dashboards cache data so you can read most things offline. Recording attendance and other writes need a connection.

### Is my data backed up?

Yes — daily database snapshots, retained for 30 days. If anything goes wrong, contact us.

### Where is my data stored?

In a managed MySQL database hosted by Railway (a US-based cloud platform). Data is encrypted at rest and in transit.

### Can I export my data?

Yes — every list (students, attendance, exams, payments) has a CSV export button. For a full database dump, open a support ticket.

## Still stuck?

Open a **Support ticket** from your dashboard. We aim to respond within 24 hours.
