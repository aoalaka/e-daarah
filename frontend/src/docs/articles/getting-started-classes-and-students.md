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

## Step 2: Add students

1. Open **Students**.
2. Click **+ New Student**.
3. Fill in the form. Required fields are marked:
   - **First Name** *(required)*
   - **Last Name** *(required)*
   - **Student ID** *(required)* — 3 to 10 digits. Auto-fills with the next available number; you can override.
   - **Gender** *(required)* — Male or Female
   - **Assign to Class** — pick from your existing classes. Optional but recommended.
   - **Enrollment date**, addresses, parent contact info, notes, expected fee — all optional.
4. Click **Save**.

Repeat for each student. The list updates immediately.

## Step 3: Bulk upload from a spreadsheet *(Plus plan only)*

For more than ~5 students, the bulk upload is much faster.

1. **Students → Bulk Upload**.
2. Pick a `.csv`, `.xlsx`, or `.xls` file.
3. Optionally pick a class to assign every uploaded student to.
4. Click **Upload**. Errors (duplicate IDs, missing required columns) are reported per row so you can fix and retry.

Required columns in the spreadsheet: `first_name`, `last_name`, `student_id`, `gender`. Everything else is optional.

## Step 4: Let parents apply via a public link

Don't want to type students in yourself? Share a public enrollment link and let parents fill in the details.

1. Open **Students → Applications** sub-tab.
2. At the top is a banner: *"Share this link for public enrollment:"* with a URL like `e-daarah.com/your-madrasah/enroll`.
3. Click the URL to copy it. Send it via WhatsApp, email, or paste it on your school website.

When a parent opens the link, they fill in a public application form with the same fields you'd fill in yourself — student name, gender, parent contact info, address, etc.

### Approving applications

Submitted applications appear in the same **Applications** sub-tab with a count badge on the tab title (e.g. *Applications (3)*).

For each pending application:

- **Approve** — opens a modal where you assign the student to a class, optionally set an expected fee + fee note, then confirm. The student is created and joins your active student list.
- **Reject** — declines the application. The submission is removed.

Until you approve, applicants don't appear in the main Student List, attendance, or anywhere else.

## Common pitfalls

- **Student ID rejected** — must be 3 to 10 digits. No letters, no hyphens.
- **Bulk Upload button missing** — that's a Plus plan feature. Free and trial-tier accounts can still add students one at a time.
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
