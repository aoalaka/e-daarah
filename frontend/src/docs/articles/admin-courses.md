# Tracking course progress

Courses sit alongside Qur'an in the Learning Tracker. Each course has units (chapters), and teachers tap to mark units taught.

## Two tracking modes

Set in **Settings → Features → Course tracking mode**:

- **Per student** *(default)* — every student gets a grade and outcome on each unit. Parents see grades.
- **Class coverage** — only records that the class covered a unit on a date. No grades.

Pick whichever matches what your school cares about. You can switch any time without losing history.

## Step 1: Admin creates the course (one-time setup)

1. Open **Courses** in the side nav.
2. Click **+ New Course**.
3. Fill in the form:
   - **Classes** — tap one or more class chips. The course will be available to teachers in every class you pick.
   - **Course Name** — e.g. "Fiqh", "Arabic", "Seerah"
   - **Description** *(optional)*
   - **Colour** — pick a colour dot. Used to identify the course at a glance.
4. Save.

## Step 2: Admin adds units (one-time setup)

1. Click into the course you just created.
2. Click **+ Add Unit** at the top right of the units panel.
3. Fill in **Unit Title** and an optional **Description**. Save.
4. Repeat for every unit in the course curriculum.

Drag-and-drop reordering isn't supported yet — units appear in the order they were created.

## Step 3: Teacher records progress (every lesson)

The teacher opens **Learning → Courses**, picks a class, and picks a course (the course strip shows colour-dot pills).

Each unit appears as a row. What happens next depends on the tracking mode:

### Class coverage mode

- Each unit is a tappable card. **Tap the unit** to mark it taught today. The card turns green with a ✓ checkmark.
- A 5-second toast appears: *"Marked X as taught — Undo"*. Tap **Undo** to remove the record.
- Tap an already-taught unit to remove the most recent record.

That's it. No grades, no per-student decisions. One tap per unit.

### Per-student mode

Each unit row has a green pill button: **✓ Mark all (N)** where N is the number of students in the class.

- **Tap "Mark all"** — records every student as Pass / Good for today, in one go. Toast with **Undo** for 5 seconds.
- **Click "+ Detailed entry"** at the top — opens a form for individual grades, repeats, or excluding specific students. Use this when not everyone passed or grades vary.

The detailed form has:
- **Track for**: Whole class (with student-exclusion chips) or One student
- **Unit, Date, Grade, Outcome (Pass/Repeat), Notes**
- Same Pass/Repeat semantics as Qur'an — Pass advances, Repeat doesn't.

## What parents see

On the parent report, each course block shows:

- A **Current unit** banner: e.g. *"3. Chapter Three · 3 of 12 units"*
- A list of recorded sessions for that course (in per-student mode, with the student's grade and outcome)

In class-coverage mode, parents see only the class's overall progress (no per-student grades — that's the whole point of coverage mode).

## What admins see

**Reports → Courses** shows:

- **Class current unit** banner — the furthest unit the class has reached
- KPI cards: students count, units count, units taught
- Two views via toggle:
  - **Unit coverage** — every unit, with how many students have passed it and the last recorded date
  - **Student matrix** — every student × every unit, with ✓ for passed units. Paginated 10 students per page.

## Common pitfalls

- **Course doesn't show up for a teacher** — the course isn't linked to their class. Edit the course → tick the right class.
- **"Mark all" button missing** — you're in class-coverage mode. Tap the unit card directly instead.
- **Switched modes and lost history** — history is preserved either way. Per-student records and class-coverage records live in separate tables; admin reports merge both.

## What's next?

- [Tracking Qur'an progress](/docs/admins/quran)
- [FAQ](/docs/help/faq)

<!-- docs-meta
sources:
  - frontend/src/pages/admin/sections/CoursesSection.jsx
  - frontend/src/pages/teacher/Dashboard.jsx#L4100-L4400
  - frontend/src/pages/admin/sections/SettingsSection.jsx
  - backend/src/routes/admin.routes.js#L4900-L5230
  - backend/src/routes/teacher.routes.js#L2050-L2200
last_audited: 2026-05-06
-->
