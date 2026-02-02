# Demo Madrasah Setup - In Progress

## Goal
Create a pre-seeded demo madrasah so users can click "Try Demo" on the landing page and immediately explore the system without registering.

## Status: 🟡 IN PROGRESS

### Completed ✅
1. **Seed SQL File Created**: `database/seed-demo-madrasah.sql`
   - Complete demo data structure
   - Demo madrasah (slug: 'demo')
   - 3 users: 1 admin + 2 teachers
   - 4 classes with realistic Islamic education names
   - 12 students with addresses and contact info
   - 20+ attendance records (January 2026)
   - 12 exam performance records
   
2. **Demo Credentials**:
   - **Admin**: admin@demo.com / demo123
   - **Teacher**: teacher@demo.com / demo123
   - **Teacher 2**: aisha@demo.com / demo123

3. **Landing Page**: Already has "Try Demo" link to `/demo/login`

4. **Backend Routes**: Already support multi-tenancy via madrasah slug

### Issue 🔴
MySQL user variables (@demo_madrasah_id, etc.) don't persist across statements when executing SQL from file.

When running:
```sql
INSERT INTO madrasahs (...) VALUES (...);
SELECT @demo_madrasah_id := LAST_INSERT_ID();
-- Later:
INSERT INTO sessions (madrasah_id, ...) VALUES (@demo_madrasah_id, ...);
```

The variable becomes NULL in the sessions INSERT, causing:
```
ERROR 1364: Field 'madrasah_id' doesn't have a default value
```

**Attempted Solutions**:
- ✗ Using `START TRANSACTION` / `COMMIT`
- ✗ Using `SOURCE` command
- ✗ Using heredoc in bash
- ✗ Using `-e` flag with inline SQL
- ✗ Changing `=` to `:=` in SET statements
- ✗ Using `SELECT @var := value` instead of `SET`

### Solution Options

#### Option 1: Stored Procedure (Recommended)
Convert seed SQL to stored procedure:
```sql
DELIMITER $$
CREATE PROCEDURE seed_demo_data()
BEGIN
  DECLARE demo_madrasah_id INT;
  -- ... all inserts here with proper variable scope
END$$
DELIMITER ;
CALL seed_demo_data();
```

#### Option 2: Programmatic Insert
Create Node.js/Python script using MySQL connector:
- Variables persist within same connection/session
- Can use proper transaction handling
- More maintainable

#### Option 3: Hardcoded IDs
After initial insert, hardcode IDs in subsequent INSERTs:
```sql
INSERT INTO madrasahs (id, ...) VALUES (100, ...);
INSERT INTO sessions (madrasah_id, ...) VALUES (100, ...);
```

#### Option 4: Use Default Madrasah
Instead of creating new 'demo' madrasah:
- Add demo users to existing default madrasah (ID=1)
- Label them clearly as DEMO accounts
- Users can immediately login

### Next Steps
1. Choose solution approach (recommend Option 1 or 2)
2. Implement chosen solution
3. Test demo login flow end-to-end
4. Consider read-only middleware for demo accounts

### Files
- `database/seed-demo-madrasah.sql` - Seed data (needs fix)
- `database/seed-demo.sh` - Execution script (needs update)
- `frontend/src/pages/Landing.jsx` - Has demo link

### Testing Checklist
Once seeded:
- [ ] Navigate to landing page
- [ ] Click "Try Demo"
- [ ] Login as admin@demo.com / demo123
- [ ] View classes, students, attendance
- [ ] Login as teacher@demo.com / demo123  
- [ ] Record attendance
- [ ] View reports
- [ ] Verify read-only protection (if implemented)

---
**Last Updated**: February 2, 2026  
**Status**: Blocked on MySQL variable persistence issue
**Priority**: High (landing page feature)
