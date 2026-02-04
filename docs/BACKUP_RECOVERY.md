# Backup & Recovery Procedures

## Overview

This document outlines backup and recovery procedures for the Madrasah Admin production database hosted on Railway.

## Railway Backup Configuration

### Automatic Backups
Railway MySQL provides automatic point-in-time recovery (PITR) for databases on paid plans.

**To enable/verify backups:**
1. Go to Railway Dashboard: https://railway.com/project/014d8329-16c9-468a-8281-b621924f79b6
2. Click on the MySQL service
3. Go to Settings → Backups
4. Ensure backups are enabled

**Backup retention:** Railway retains backups based on your plan level.

### Manual Backup (Before Major Changes)

Always create a manual backup before running migrations or making significant changes.

```bash
# Export database to local file
railway run mysqldump -u root railway > backup_$(date +%Y%m%d_%H%M%S).sql

# Or connect and export specific tables
railway connect MySQL
mysqldump railway madrasahs users students > critical_tables_backup.sql
```

## Recovery Procedures

### Scenario 1: Accidental Data Deletion (Soft Delete Available)

Since we have soft deletes, most "deleted" data can be recovered:

```sql
-- View soft-deleted records
SELECT * FROM students WHERE deleted_at IS NOT NULL;

-- Restore a soft-deleted student
UPDATE students SET deleted_at = NULL WHERE id = <student_id>;

-- Restore all recently deleted students (last 24 hours)
UPDATE students
SET deleted_at = NULL
WHERE deleted_at > NOW() - INTERVAL 24 HOUR;
```

### Scenario 2: Restore from Railway Point-in-Time Recovery

1. Go to Railway Dashboard
2. Select MySQL service
3. Click "Backups" tab
4. Select the point in time to restore
5. Railway will create a new database instance with restored data
6. Update your backend to point to the restored instance

### Scenario 3: Restore from Manual Backup File

```bash
# Connect to Railway MySQL and restore
railway run mysql -u root railway < backup_file.sql
```

### Scenario 4: Rollback a Bad Migration

Migrations should be additive, but if needed:

```sql
-- Check what migrations have been applied
SELECT * FROM migrations ORDER BY applied_at DESC;

-- If a migration needs to be undone, manually reverse it
-- Example: Remove a column that was incorrectly added
ALTER TABLE tablename DROP COLUMN column_name;

-- Remove the migration record
DELETE FROM migrations WHERE name = 'migration_name';
```

## Critical Tables Priority

In case of partial recovery, prioritize these tables:

1. **madrasahs** - Tenant data (highest priority)
2. **users** - Admin and teacher accounts
3. **students** - Student records
4. **attendance** - Attendance history
5. **exam_performance** - Exam scores
6. **sessions/semesters** - Academic periods
7. **classes** - Class definitions

## Soft Delete Policy

### Tables with Soft Deletes
- madrasahs
- users
- students
- attendance
- exam_performance
- classes
- sessions
- semesters

### Querying Active Records Only

All queries should exclude soft-deleted records:

```sql
-- Correct: Only active students
SELECT * FROM students WHERE deleted_at IS NULL;

-- Wrong: Includes deleted records
SELECT * FROM students;
```

### Permanent Deletion (Data Purge)

Only permanently delete data after 90 days and with explicit approval:

```sql
-- WARNING: Permanent deletion - requires approval
-- Delete records soft-deleted more than 90 days ago
DELETE FROM students
WHERE deleted_at IS NOT NULL
AND deleted_at < NOW() - INTERVAL 90 DAY;
```

## Pre-Deployment Checklist

Before any production deployment:

- [ ] Manual backup created
- [ ] Migration tested on local/staging
- [ ] Rollback plan documented
- [ ] Team notified of deployment window

## Contacts

**Database Issues:**
- Primary: [Your name/email]
- Railway Support: https://railway.com/help

## Monitoring

### Check Database Health
```bash
railway connect MySQL
SHOW STATUS LIKE 'Connections';
SHOW STATUS LIKE 'Uptime';
SHOW TABLE STATUS;
```

### Check for Orphaned Records
```sql
-- Students without a valid class
SELECT s.* FROM students s
LEFT JOIN classes c ON s.class_id = c.id
WHERE s.class_id IS NOT NULL AND c.id IS NULL;

-- Attendance for deleted students
SELECT a.* FROM attendance a
LEFT JOIN students s ON a.student_id = s.id
WHERE s.id IS NULL OR s.deleted_at IS NOT NULL;
```

## Recovery Testing

**Quarterly:** Test backup restoration process
1. Export production backup
2. Restore to local MySQL
3. Verify data integrity
4. Document any issues

Last tested: _____________
Next scheduled test: _____________
