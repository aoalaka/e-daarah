# Inviting your teachers

Two ways to add a teacher: create them yourself, or share a self-registration link.

## Option A — Self-registration link (fastest)

1. Open **Teachers** in the side nav.
2. At the top of the **Teacher List** sub-tab there's a banner reading: *"Teachers can also self-register using this link:"*.
3. Click the URL (e.g. `e-daarah.com/your-madrasah/register-teacher`) to copy it.
4. Send it to your teachers. They open the link, fill in their details, and pick a password. Done — they appear in your teacher list.

## Option B — Create the teacher yourself

1. **Teachers → + New Teacher**
2. Fill in the **Create New Teacher** form:
   - **First Name** + **Last Name**
   - **Staff ID** — must be exactly 5 digits (e.g. `12345`). The teacher uses this together with their password to log in.
   - **Email**
   - **Phone Number** (with country code)
3. Click **Save**.
4. Tell the teacher their staff ID and the temporary password you set. They can change the password after first login.

## Step 2: Assign teachers to classes

A teacher must be assigned to a class before they can record attendance, exams, or Qur'an sessions for that class.

1. Open **Classes**.
2. Click the class you want to assign the teacher to.
3. In the **Teachers** section, pick a teacher from the dropdown and click **Assign**.
4. Repeat for every class the teacher should access.

To remove a teacher from a class: click the **Remove** button next to their name in the class detail.

> A teacher can be assigned to **multiple classes**. They'll see all their assigned classes in their dashboard.

## What teachers see when they log in

- Their assigned classes (only — never other teachers' classes)
- Attendance, Exams, Qur'an, Courses, and Reports tabs
- Their Availability tab (if you've enabled Teacher Availability)

## Common pitfalls

- **Staff ID rejected** — must be exactly 5 digits. If you typed 4 or 6 the form won't submit.
- **Teacher can't see a class** — they're not assigned. Open the class, add them.
- **Teacher login email vs staff ID** — both work. The staff ID is the durable identifier; the email can change.

## What's next?

- [Adding your first class and students](/docs/getting-started/classes-and-students)
- [Recording attendance](/docs/admins/attendance)

<!-- docs-meta
sources:
  - frontend/src/pages/admin/sections/TeachersSection.jsx
  - frontend/src/pages/admin/sections/ClassesSection.jsx#L85-L110
  - frontend/src/pages/TeacherRegistration.jsx
last_audited: 2026-05-05
-->
