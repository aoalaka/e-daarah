# Madrasah Admin - Launch & Growth Roadmap

## Philosophy

**Pragmatic + Ambitious**: Launch lean, learn from customers, grow sustainably.
- Two simple plans to start (not four)
- Cover infrastructure costs + modest profit
- Strengthen core foundations before adding features
- Let customers tell us what they need

---

## Current State (Feb 2026)

**Infrastructure:**
- Hosted on Railway ($5-20/mo depending on usage)
- Backend: https://api.e-daarah.com/
- Frontend: https://e-daarah.com/
- 2 madrasahs registered, 4 users, 12 students
- 14-day trial system in place

**What Works:**
- Full auth flow (login, register, password reset, email verification)
- Admin dashboard (sessions, semesters, classes, teachers, students)
- Teacher dashboard (attendance, exam recording)
- Parent portal (report cards)
- Super admin (madrasah listing, suspend/unsuspend)

---

## Two-Tier Pricing Model

### Cost Analysis

**Our Infrastructure Costs (Railway):**
- Base: $5-20/month for hobby/pro plan
- Database: Included in usage
- Per additional madrasah: ~$0.50-2/month in resources (estimate)
- Email (Resend): Free tier covers 3,000 emails/month

**Competitor Pricing (for reference):**
- Islamic Products UK: £20/month (~$25) for 150 students
- Dugsi.io: Tiered, contact for pricing
- Most competitors: $15-50/month range

### Our Pricing

| | **Standard** | **Plus** |
|---|---|---|
| **Price** | **$12/month** | **$29/month** |
| **Annual** | $120/year (save $24) | $290/year (save $58) |
| **Target** | Small madrasahs, weekend schools | Larger institutions, daily schools |
| **Students** | Up to 75 | Up to 300 |
| **Teachers** | Up to 5 | Up to 20 |
| **Classes** | Up to 5 | Up to 15 |

### Feature Breakdown

| Feature | Standard | Plus |
|---------|----------|------|
| **Core** | | |
| Student management | Yes | Yes |
| Teacher management | Yes | Yes |
| Attendance tracking | Yes | Yes |
| Exam/grades recording | Yes | Yes |
| Parent portal (report cards) | Yes | Yes |
| Session & semester management | Yes | Yes |
| Email notifications | Basic (welcome, password reset) | Yes + attendance alerts |
| **Reports** | | |
| View attendance reports | Yes | Yes |
| View exam reports | Yes | Yes |
| Export to CSV | No | Yes |
| PDF report cards | No | Yes |
| **Bulk Operations** | | |
| Bulk student upload (CSV/Excel) | No | Yes |
| Bulk attendance entry | No | Yes |
| **Support** | | |
| Email support | Yes (48hr response) | Yes (24hr response) |
| Help center access | Yes | Yes |
| Priority support | No | Yes |
| **Coming Soon** | | |
| SMS notifications | No | Add-on ($5/mo) |
| Custom branding | No | Yes |
| API access | No | Future |

### Why This Pricing?

1. **$12 Standard** - Accessible for small community madrasahs
   - Covers our per-customer infrastructure cost (~$2) with healthy margin
   - Competitive with market (cheaper than most)
   - 75 students handles most weekend/evening programs

2. **$29 Plus** - Value for larger institutions
   - PDF exports and bulk operations save significant admin time
   - 300 students covers most full madrasahs
   - Priority support justifies premium

3. **Annual discount** - Improves cash flow, reduces churn

### Revenue Projections

| Customers | Mix | Monthly Revenue | Annual Revenue |
|-----------|-----|-----------------|----------------|
| 10 | 7 Standard, 3 Plus | $171 | $2,052 |
| 25 | 18 Standard, 7 Plus | $419 | $5,028 |
| 50 | 35 Standard, 15 Plus | $855 | $10,260 |
| 100 | 70 Standard, 30 Plus | $1,710 | $20,520 |

Break-even: ~3-5 customers covers Railway Pro ($20/mo)

---

## Implementation Phases

### Phase 0: Foundation (Week 1)
**Goal:** Data safety before we touch anything

#### 0.1 Database Backups
- [ ] Enable Railway automatic daily backups
- [ ] Test backup restoration process
- [ ] Document recovery procedure

#### 0.2 Soft Deletes
Add `deleted_at` column to protect against accidental deletion:
- [ ] madrasahs
- [ ] users
- [ ] students
- [ ] attendance
- [ ] exam_performance

#### 0.3 Migration System
- [ ] Create `/backend/migrations/` folder
- [ ] Simple migration runner that tracks what's applied
- [ ] First migration: soft delete columns

**Deliverable:** Can safely iterate without data loss

---

### Phase 1: Stripe Payments (Week 2-3)
**Goal:** Start collecting revenue

#### 1.1 Database Changes
```sql
ALTER TABLE madrasahs ADD COLUMN stripe_customer_id VARCHAR(255);
ALTER TABLE madrasahs ADD COLUMN stripe_subscription_id VARCHAR(255);
ALTER TABLE madrasahs ADD COLUMN pricing_plan ENUM('trial', 'standard', 'plus') DEFAULT 'trial';
ALTER TABLE madrasahs ADD COLUMN subscription_status ENUM('trialing', 'active', 'past_due', 'canceled') DEFAULT 'trialing';
ALTER TABLE madrasahs ADD COLUMN current_period_end TIMESTAMP;
```

#### 1.2 Stripe Setup
- [ ] Create products in Stripe Dashboard:
  - Standard Monthly ($12)
  - Standard Annual ($120)
  - Plus Monthly ($29)
  - Plus Annual ($290)
- [ ] Set up webhook endpoint

#### 1.3 Backend Routes
- [ ] `POST /api/billing/create-checkout` - Redirect to Stripe Checkout
- [ ] `POST /api/billing/webhook` - Handle Stripe events
- [ ] `GET /api/billing/portal` - Link to Stripe Customer Portal
- [ ] `GET /api/billing/status` - Current plan & usage

#### 1.4 Frontend
- [ ] Pricing page (public, linked from landing)
- [ ] Billing tab in admin settings
- [ ] Plan badge in dashboard header
- [ ] Upgrade prompts when hitting limits

**Deliverable:** Can accept payments

---

### Phase 2: Plan Enforcement (Week 3-4)
**Goal:** Features gated by plan

#### 2.1 Limits Configuration
```javascript
const PLAN_LIMITS = {
  trial: {
    maxStudents: 75,
    maxTeachers: 5,
    maxClasses: 5,
    features: ['core']
  },
  standard: {
    maxStudents: 75,
    maxTeachers: 5,
    maxClasses: 5,
    features: ['core', 'basic_email']
  },
  plus: {
    maxStudents: 300,
    maxTeachers: 20,
    maxClasses: 15,
    features: ['core', 'email', 'csv_export', 'pdf_reports', 'bulk_upload']
  }
};
```

#### 2.2 Backend Enforcement
- [ ] Middleware: check student count before create
- [ ] Middleware: check teacher count before create
- [ ] Middleware: check class count before create
- [ ] Feature check for export/bulk endpoints
- [ ] Return helpful error: "Upgrade to Plus to add more students"

#### 2.3 Usage Tracking
- [ ] Track counts on madrasahs table (or compute on-demand)
- [ ] API endpoint: GET /api/billing/usage

#### 2.4 Frontend Gating
- [ ] Show usage: "45 of 75 students"
- [ ] Disable/hide gated features with upgrade prompt
- [ ] Lock icon on Plus-only features for Standard users

**Deliverable:** Plans are enforced, upgrade path clear

---

### Phase 3: Trial Flow (Week 4-5)
**Goal:** Convert trials to paid customers

#### 3.1 Trial Experience
- [ ] New signups get 14-day trial with Plus features
- [ ] Trial banner in dashboard: "X days left"
- [ ] Trial expiry → downgrade to limited mode (read-only + limited creates)

#### 3.2 Trial Expiry Handling
When trial expires without payment:
- [ ] Can still log in and view all data
- [ ] Cannot create new students/teachers/classes
- [ ] Cannot record new attendance/exams
- [ ] Prominent "Subscribe to continue" banner
- [ ] Data retained for 90 days

#### 3.3 Email Sequence
- [ ] Day 1: Welcome + getting started
- [ ] Day 7: Check-in + feature highlights
- [ ] Day 12: Trial ending soon
- [ ] Day 14: Trial expired + subscribe CTA

**Deliverable:** Smooth trial → paid conversion

---

### Phase 4: Core Strengthening (Week 5-8)
**Goal:** Production-ready reliability

#### 4.1 Security Hardening
- [ ] Review all input validation
- [ ] SQL injection audit
- [ ] XSS prevention check
- [ ] Rate limiting review
- [ ] Session timeout implementation
- [ ] Password attempt lockout (5 failures = 15 min lockout)

#### 4.2 Error Tracking
- [ ] Set up Sentry (free tier: 5K errors/month)
- [ ] Add error boundaries in React
- [ ] Backend error logging with context
- [ ] Alert on error spikes

#### 4.3 Uptime & Monitoring
- [ ] Set up BetterUptime or similar (free tier available)
- [ ] Health check endpoint: GET /api/health
- [ ] Database connection monitoring
- [ ] Alert on downtime (email/Slack)

#### 4.4 Performance Baseline
- [ ] Add database indexes review
- [ ] Query performance logging (slow queries > 1s)
- [ ] API response time tracking
- [ ] Document current performance baseline

#### 4.5 Audit Logging
- [ ] Ensure audit_logs captures all sensitive actions
- [ ] Super admin UI to view audit logs
- [ ] Log: login attempts, data changes, exports

**Deliverable:** Reliable, secure, observable system

---

### Phase 5: Customer Operations (Week 8-10)
**Goal:** Support customers professionally

#### 5.1 Self-Service Support
- [ ] Help center page with FAQs
- [ ] Getting started guide
- [ ] Video walkthrough (optional)
- [ ] Contact form

#### 5.2 Legal Pages
- [ ] Terms of Service
- [ ] Privacy Policy
- [ ] Data processing info (for schools)

#### 5.3 Communication Channel
- [ ] Support email workflow
- [ ] Response time tracking
- [ ] Canned responses for common issues

#### 5.4 Customer Feedback
- [ ] Simple feedback form in app
- [ ] Feature request collection
- [ ] NPS survey after 30 days

**Deliverable:** Customers can get help, we can learn from them

---

### Phase 6: Verification Light (Week 10-12)
**Goal:** Basic trust without heavy process

#### 6.1 Lightweight Verification
- [ ] Phone number verification (OTP on registration)
- [ ] Email already verified ✓
- [ ] Mark as "verified" after both complete

#### 6.2 Super Admin Review
- [ ] Queue of new registrations to review
- [ ] Quick approve/flag/suspend actions
- [ ] Notes field for follow-up

#### 6.3 Trust Indicators
- [ ] Verified badge in parent portal
- [ ] Unverified warning (internal only, not blocking)

**Deliverable:** Basic vetting without friction

---

## Future Features (Customer-Driven)

Only build these when customers ask:
- SMS notifications (charge as add-on)
- Custom branding/white-label
- Advanced analytics/charts
- API access for integrations
- Mobile app
- Offline mode
- Multi-language support
- Academic calendar
- Fee management

---

## Database Migration Strategy

### Safe Migration Rules
1. **Always additive** - Add columns, never remove
2. **Default values** - New columns must have defaults
3. **Backward compatible** - Old code works with new schema
4. **Test first** - Run on local before production
5. **Backup before** - Manual backup before migrations

### Migration Tracking
```sql
CREATE TABLE migrations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Migration Files
```
/backend/migrations/
  001_add_soft_deletes.sql
  002_add_stripe_columns.sql
  003_add_usage_tracking.sql
```

---

## Railway Deployment

### Environment Variables to Add
```
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STANDARD_MONTHLY=price_...
STRIPE_PRICE_STANDARD_ANNUAL=price_...
STRIPE_PRICE_PLUS_MONTHLY=price_...
STRIPE_PRICE_PLUS_ANNUAL=price_...

# Monitoring
SENTRY_DSN=https://...

# Feature Flags (optional)
TRIAL_DAYS=14
```

### Deployment Checklist
- [ ] Backup database before deploy
- [ ] Run migrations
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Smoke test critical flows
- [ ] Monitor errors for 1 hour

---

## Success Metrics

### Month 1
- [ ] Payment system live
- [ ] First 5 paying customers
- [ ] Zero data loss incidents

### Month 3
- [ ] 25+ paying customers
- [ ] <5% churn rate
- [ ] 99%+ uptime

### Month 6
- [ ] 50+ paying customers
- [ ] Break-even on infrastructure
- [ ] Clear feature roadmap from customer feedback

---

## Progress Tracker

### Phase 0: Foundation - COMPLETE (Feb 4, 2026)
- [x] Enable Railway automatic daily backups (via Railway dashboard)
- [x] Create migrations system (`/backend/migrations/`)
- [x] Add soft delete columns to critical tables (migration 002)
- [x] Add Stripe columns for billing (migration 003)
- [x] Update all backend queries to exclude soft-deleted records
- [x] Document recovery procedure (`/docs/BACKUP_RECOVERY.md`)
- [x] Test data integrity after migrations

**Migrations Applied:**
1. `001_create_migrations_table` - Feb 4, 2026
2. `002_add_soft_deletes` - Feb 4, 2026
3. `003_add_stripe_columns` - Feb 4, 2026

### Phase 1: Stripe Payments - READY TO START
### Phase 2: Plan Enforcement - PENDING
### Phase 3: Trial Flow - PENDING
### Phase 4: Core Strengthening - PENDING
### Phase 5: Customer Operations - PENDING
### Phase 6: Verification Light - PENDING

---

## Existing Users Decision

**Tauranga Masjid Madrasah** - Trial expires Feb 17, 2026

Recommendation: **Extend trial to 30 days + personal outreach**
- Email them directly
- Offer feedback call
- Give them Standard plan free for 3 months if they provide feedback
- They're early adopters - treat them well

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Data loss | Daily backups, soft deletes, tested restore |
| Payment failures | Stripe handles retries, we handle webhooks |
| Breaking changes | Additive migrations only |
| Customer churn | Trial doesn't lock out, data retained 90 days |
| Support overload | Help center, FAQs, canned responses |
| Security breach | Audit logs, rate limiting, monitoring alerts |

---

## Notes

- Keep it simple: two plans, clear value prop
- Price to cover costs + profit, not to maximize revenue
- Let customers pull features from us, don't push
- Foundation first: backups, security, reliability
- Revenue enables everything else
