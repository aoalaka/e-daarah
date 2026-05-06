# Sending SMS to parents

E-Daarah sends SMS via prepaid credits. The **SMS** tab has four sub-sections: **Buy Credits · Auto Reminders · Custom Message · History**.

## Buy credits first

Open **SMS → Buy Credits**. Pick a credit pack and pay via Stripe. Credits are debited automatically when SMS go out.

> **One credit ≈ one SMS segment.** A short message (≤160 chars in plain English) is one credit. Long messages or non-Latin alphabets cost more.

Plus plan and above includes 25 free credits on first subscription.

## Auto reminders — set up once, runs forever

The Auto Reminders sub-tab has two cards:

### 💸 Fee Reminder

- **Toggle**: tap the green **Enable** pill (top right of the card) to turn it on.
- **When to send**: *Specific day of month* (1–28) or *Start of each semester*.
- **Message template**: free text with placeholders `{madrasah_name}`, `{student_name}`, `{first_name}`. A default template is auto-filled when you enable.

### 📋 Attendance Alert

- **Toggle**: amber **Enable** pill.
- **Period**: *Weekly* (every Monday for last week) · *Monthly* (1st of next month) · *End of semester* · *End of cohort period* (cohort mode only).
- **Threshold**: alert when a student misses **N or more** classes in the period (default 3).
- **Message template**: placeholders include `{absences_per_child}` which renders as e.g. *"Ahmed (3), Yusuf (4)"* — useful for multi-child families.

> **Multi-child families get one SMS per phone**, not one per child. The message lists every qualifying child with their counts. Saves your credits.

## Custom message — one-off send

Use the **Custom Message** sub-tab when you want to send something specific (e.g. event announcement).

1. Pick recipients: by class, all parents, all teachers, or all students.
2. Type your message. Character counter shows how many credits it'll use.
3. Click **Send Now**. The button text shows the recipient count: *"Send Now to 28 recipients"*.

## History — what's been sent

The **History** sub-tab lists every SMS your madrasah has sent.

- **Filter** by type: *Fee reminder · Attendance alert · Custom · Announcement*.
- See each message's **status**: *queued · sent · delivered · failed · undelivered*.
- Failed messages show the error reason (invalid number, network rejection, etc).

## Common pitfalls

- **Can't send SMS** — your email isn't verified. The verify-email banner tells you. Click **Resend Email** in that banner.
- **Parent didn't receive it** — check History. Common causes: wrong phone number on student record, country code missing, parent's network blocking international SMS.
- **Credits depleting fast** — long messages cost more than one credit. Check the character counter on the Custom Message screen before sending.
- **Auto reminder didn't fire** — check that (a) it's enabled, (b) you have enough credits, (c) today is a school day not a holiday, (d) `last_sent` isn't in the current period (you can't double-send).

## What's next?

- [Setting up fees](/docs/admins/fees-setup)
- [FAQ](/docs/help/faq)

<!-- docs-meta
sources:
  - frontend/src/pages/admin/sections/SmsSection.jsx
  - frontend/src/components/AutoReminderCard.jsx
  - backend/src/services/scheduler.service.js
last_audited: 2026-05-05
-->
