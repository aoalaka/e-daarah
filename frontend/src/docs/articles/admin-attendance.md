# Recording attendance

Attendance is the most-used feature in E-Daarah. Once you've set it up, recording a class takes under 30 seconds.

> Both teachers (for their assigned classes) and admins use the same screen.

## Step 1: Open the Attendance tab

Click **Attendance** in the side nav.

## Step 2: Pick a class and a date

The two pickers at the top of the page set what you're recording.

## Step 3: Tap ✓ or ✗ for each student

Each student appears as a row with two large circle buttons:

- **✓** (green) — Present
- **✗** (red) — Absent

Tap one for each student. Tap the other one to change your mind. Rows aren't saved yet — they're held in memory until you hit Save.

The bottom of the page shows a running tally: **"X present · Y absent"**.

## Step 4 (mobile): Continue to details

If grade tracking is on or any student is marked absent, the **"Save Attendance"** button changes to **"Continue — Add Details"**. Tap it.

The details screen lets you fill in:

- **Reason** for each absent student. Options: *Sick · Parent Request · School Not Notified · Other*
- **Dressing / Behaviour / Punctuality** grades (only the ones enabled in **Settings → Features → Attendance Features**). Options: *Excellent · Good · Fair · Poor*
- **Notes** — free-text per-student note (placeholder: "Optional notes")

If grade tracking is off and no one is absent, you can save directly from step 3 — no details screen needed.

## Step 5: Save

Click **Save Attendance** at the bottom. The button is disabled until every student is marked present or absent.

## Editing past attendance

Pick the date you want at the top of the page. Existing records load in. Change rows. Save. The originals are overwritten — no separate "edit mode".

## Common pitfalls

- **Wrong date** — defaults to today; double-check before saving for a previous day.
- **Unmarked students** — the Save button stays disabled until every row has ✓ or ✗. The button text shows progress: *"Mark all students (8/12)"*.
- **Student missing from the list** — they aren't assigned to this class. Open **Students**, edit the student, set their **Class**.

## What parents see

Parents see attendance as a percentage on their report ("attended 18 of 20 classes — 90%") plus the list of absences with the reason. Per-student grades only appear if those features are enabled.

## What's next?

- [Recording exam results](/docs/admins/exams) *(coming soon)*
- [FAQ](/docs/help/faq)

<!-- docs-meta
sources:
  - frontend/src/pages/teacher/Dashboard.jsx#L2400-L2700
  - backend/src/routes/teacher.routes.js#L600-L800
last_audited: 2026-05-06
-->
