# Adding your first class and students

You need at least one class and a few students before you can record attendance. This takes 2 minutes.

## Step 1: Create a class

1. Open **Classes** in the side nav.
2. Click **+ New Class**.
3. Fill in the form:
   - **Class Name** *(required)* — e.g. "Junior Boys", "Senior Girls"
   - **Grade Level** *(optional)* — e.g. "Grade 5–6"
   - **Description** *(optional)* — anything that helps you identify the class
   - **School Days** — tap the day buttons (Mon, Tue, Wed…) for days this class meets. Used by attendance and the planner.
4. Click **Save**. The class appears in the list.

Repeat for each class. You can edit or delete a class any time.

## Step 2: Add students — pick the approach that fits

There are three ways to add students. They all end with the same result; pick whichever matches your situation.

### Option A — Add one student at a time *(easiest)*

Best for: a handful of students, or you're trying out E-Daarah.

1. Open **Students** → click **+ New Student**.
2. Fill in:
   - **First Name** *(required)*
   - **Last Name** *(required)*
   - **Student ID** *(required)* — 3 to 10 digits. Auto-fills with the next available number; you can override.
   - **Gender** *(required)* — Male or Female
   - **Assign to Class** — pick from your existing classes. Optional but recommended.
   - **Enrollment date**, addresses, parent contact info, notes, expected fee — all optional.
3. Click **Save**.

Repeat for each student. The list updates immediately.

### Option B — Share a public enrollment link *(zero data entry on your side)*

Best for: getting parents to fill in their own details, especially at the start of a term.

1. Open **Students → Applications** sub-tab.
2. The banner reads: *"Share this link for public enrollment:"* — click the URL to copy it (e.g. `e-daarah.com/your-madrasah/enroll`).
3. Send it via WhatsApp, email, or post it on your school website.

When a parent opens the link, they fill in the application form themselves. Submissions land in the **Applications** sub-tab with a count badge (e.g. *Applications (3)*).

For each pending application, you choose:

- **Approve** — assign a class, optionally set an expected fee + fee note. The student is created and joins your active list.
- **Reject** — the submission is removed.

Applicants don't appear anywhere else (attendance, fees, etc.) until you approve.

### Option C — Bulk upload from a spreadsheet *(fastest for many students)*

Best for: importing 10+ students at once. **Plus plan only.**

1. **Students → Bulk Upload**.
2. Pick a `.csv`, `.xlsx`, or `.xls` file.
3. Optionally pick a class to assign every uploaded student to.
4. Click **Upload**. Errors (duplicate IDs, missing required columns) are reported per row so you can fix and retry.

Required columns: `first_name`, `last_name`, `student_id`, `gender`. Everything else is optional.

## Common pitfalls

- **Student ID rejected** — must be 3 to 10 digits. No letters, no hyphens.
- **Bulk Upload button missing** — that's a Plus plan feature. Free and trial-tier accounts can use Option A or B.
- **Student doesn't appear in attendance** — they aren't assigned to a class. Open the student record and pick a class.

## What's next?

- [Inviting your teachers](/docs/admins/teachers)
- [Recording attendance](/docs/admins/attendance)

<!-- docs-meta
sources:
  - frontend/src/pages/admin/sections/ClassesSection.jsx
  - frontend/src/pages/admin/sections/StudentsSection.jsx
last_audited: 2026-05-06
-->
