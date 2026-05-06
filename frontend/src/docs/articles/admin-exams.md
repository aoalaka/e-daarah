# Recording exam results

E-Daarah records exam scores per subject, per class, per semester. One form does the whole class at once.

## Step 1: Open the Exams tab

Click **Exams** in the side nav, then pick a class at the top.

## Step 2: Click "+ Record Exam"

A modal titled **"Record Exam Performance"** opens.

## Step 3: Fill in the exam header

These four fields apply to every student in the exam:

- **Session** *(required)* — pick from your sessions. The active session is marked **✓ (Active)**.
- **Semester** *(required)* — only semesters within the chosen session show.
- **Subject** *(required)* — free text. Examples: *Mathematics, Quran, Arabic, Fiqh*.
- **Exam Date** *(required)* — defaults to today; can't be in the future.
- **Total Score (Max)** *(required)* — between 1 and 1000. Defaults to 100.

## Step 4: Enter scores per student

Below the header, every student in the class appears as a row. For each:

- **Score** — the student's score out of the max.
- **Absent toggle** — if the student missed the exam, toggle absent and pick a reason: *Sick · Parent Request · School Not Notified · Other*.

You can leave a row empty if you don't have the score yet — just save what you have and come back to add the rest.

## Step 5: Click "Save Exam"

The whole batch saves in one go. The modal closes, and the students appear in the exam results table for that class + subject.

## Editing a previous exam

In the exam results table, click the **Edit** button on any row to update the score, change the subject, or fix the date.

## Cohort-mode madrasahs

If your madrasah is on **cohort scheduling**, you'll see a **Cohort Period** picker instead of Session/Semester. Everything else works the same.

## What students see

On the parent report:

- Each subject shows the student's score, percentage, and class average for that exam.
- A class ranking appears if your plan supports it (Plus and above).

## Common pitfalls

- **Student missing from the modal** — they aren't assigned to this class. Fix that under **Students → edit student → Class**.
- **Subject typed differently across exams** — `Math`, `Maths`, `Mathematics` are treated as separate subjects. Pick one and stick with it (case doesn't matter, but spelling does).
- **Future-date error** — exam date can't be later than today. Pick today or a past date.

## What's next?

- [Recording attendance](/docs/admins/attendance)
- [Tracking Qur'an progress](/docs/admins/quran)

<!-- docs-meta
sources:
  - frontend/src/pages/teacher/Dashboard.jsx#L3320-L3500
  - backend/src/routes/teacher.routes.js
last_audited: 2026-05-06
-->
