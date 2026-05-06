# Tracking Qur'an progress

Record what each student covered in their Qur'an session — Hifdh, Tilawah, or Muraja'ah — with surah/ayah ranges. Their position auto-updates and shows up on the parent report.

## Three session types

E-Daarah uses these labels exactly:

- **Tilawah** — Recitation
- **Hifdh** — Memorization
- **Muraja'ah** — Revision

Each student has a separate position for each type — a Hifdh position, a Tilawah position, and a Muraja'ah position.

## Step 1: Open the Qur'an tab

In the teacher or admin dashboard, click **Qur'an** in the side nav (it appears under the **Learning** tab if your madrasah has multiple Learning Tracker features on).

## Step 2: Pick the session type

You'll see three large cards: **Tilawah · Hifdh · Muraja'ah**. Tap the one you're recording.

## Step 3: Pick the student

The next screen shows every student in the selected class. Tap the student you're recording for. Each student card shows their current position for the chosen type.

## Step 4: Pick the range

Three ways to enter a range — pick the one that fits how the session went:

- **Ayah range** *(default)* — single surah, ayah X to Y. Surah picker + two ayah numbers.
- **Surah range** — across multiple surahs. Pick a starting surah/ayah and an ending surah/ayah.
- **Juz range** — for big chunks. Pick "From Juz" and "To Juz". The actual surah and ayah boundaries are filled in automatically.

The ayah-from field auto-fills from the student's last position so the next session continues where the last one left off.

## Step 5: Pick a grade and outcome

- **Grade** — *Excellent · Good · Fair · Needs Improvement*. Defaults to Good.
- **Outcome** — **Pass** or **Repeat**. Pass advances the student's position; Repeat keeps the position where it was so the student can re-cover the same material next session.

Optional: **Notes** field for anything specific (e.g. "needed help with tajweed on ayah 23").

## Step 6: Save

The save button reads **"Pass"** or **"Repeat"** depending on your outcome choice. One tap saves the session and (if Pass) bumps the student's position.

## What parents see

On the parent report, in the **Learning Progress** section, the student's current Hifdh position appears as a banner: *"Current unit · Surah Al-Baqarah — ayah 152 · Juz 2"*.

The full session history is listed below — every recorded session with its type, date, range, grade, and outcome.

## Common pitfalls

- **Position didn't advance** — outcome was Repeat, not Pass. That's intentional behaviour, not a bug.
- **Wrong starting ayah** — pre-filled from the last session. If the student moved on without you recording, override the ayah-from field manually.
- **Ayah out of range** — the form rejects ayah numbers above the surah's actual length. The error message tells you the max for that surah.

## What's next?

- [Tracking course progress](/docs/admins/courses)
- [Recording exam results](/docs/admins/exams)

<!-- docs-meta
sources:
  - frontend/src/components/QuranSessionRecorder.jsx
  - backend/src/routes/teacher.routes.js#L1738-L1810
  - backend/src/routes/solo.routes.js#L620-L690
last_audited: 2026-05-05
-->
