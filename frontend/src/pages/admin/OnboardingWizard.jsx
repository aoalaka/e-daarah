import { useState } from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import api from '../../services/api';
import './OnboardingWizard.css';

const CURRENCIES = [
  { value: 'GBP', label: 'GBP — British Pound (£)' },
  { value: 'USD', label: 'USD — US Dollar ($)' },
  { value: 'EUR', label: 'EUR — Euro (€)' },
  { value: 'CAD', label: 'CAD — Canadian Dollar (CA$)' },
  { value: 'AUD', label: 'AUD — Australian Dollar (A$)' },
  { value: 'NZD', label: 'NZD — New Zealand Dollar (NZ$)' },
  { value: 'NGN', label: 'NGN — Nigerian Naira (₦)' },
  { value: 'ZAR', label: 'ZAR — South African Rand (R)' },
  { value: 'KES', label: 'KES — Kenyan Shilling (KSh)' },
  { value: 'GHS', label: 'GHS — Ghanaian Cedi (GH₵)' },
  { value: 'EGP', label: 'EGP — Egyptian Pound (E£)' },
  { value: 'MYR', label: 'MYR — Malaysian Ringgit (RM)' },
  { value: 'IDR', label: 'IDR — Indonesian Rupiah (Rp)' },
  { value: 'PKR', label: 'PKR — Pakistani Rupee (₨)' },
  { value: 'INR', label: 'INR — Indian Rupee (₹)' },
  { value: 'BDT', label: 'BDT — Bangladeshi Taka (৳)' },
  { value: 'SAR', label: 'SAR — Saudi Riyal (﷼)' },
  { value: 'AED', label: 'AED — UAE Dirham (د.إ)' },
  { value: 'QAR', label: 'QAR — Qatari Riyal (QR)' },
  { value: 'SGD', label: 'SGD — Singapore Dollar (S$)' },
  { value: 'TRY', label: 'TRY — Turkish Lira (₺)' },
  { value: 'CHF', label: 'CHF — Swiss Franc (CHF)' },
];

// All possible steps in order
const ALL_STEPS = ['scheduling', 'features', 'fee_mode', 'availability', 'currency', 'done'];

export default function OnboardingWizard({ madrasahProfile, onComplete }) {
  const [step, setStep] = useState('scheduling');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    scheduling_mode: madrasahProfile?.scheduling_mode || 'academic',
    enable_learning_tracker: madrasahProfile?.enable_learning_tracker !== 0 && madrasahProfile?.enable_learning_tracker !== false,
    enable_fee_tracking: madrasahProfile?.enable_fee_tracking !== 0 && madrasahProfile?.enable_fee_tracking !== false,
    enable_grade_tracking: (
      madrasahProfile?.enable_dressing_grade !== 0 && madrasahProfile?.enable_dressing_grade !== false &&
      madrasahProfile?.enable_behavior_grade !== 0 && madrasahProfile?.enable_behavior_grade !== false
    ),
    enable_teacher_availability: false, // new accounts default off
    fee_tracking_mode: madrasahProfile?.fee_tracking_mode || 'manual',
    fee_prorate_mid_period: !!madrasahProfile?.fee_prorate_mid_period,
    availability_planner_aware: madrasahProfile?.availability_planner_aware !== 0 && madrasahProfile?.availability_planner_aware !== false,
    currency: madrasahProfile?.currency || 'GBP',
  });

  // Compute the ordered list of steps that apply given current form state
  function getVisibleSteps() {
    const steps = ['scheduling', 'features'];
    if (form.enable_fee_tracking) steps.push('fee_mode');
    if (form.enable_teacher_availability) steps.push('availability');
    if (form.enable_fee_tracking) steps.push('currency');
    return steps;
  }

  const visibleSteps = getVisibleSteps();
  const visibleIndex = visibleSteps.indexOf(step);
  const totalSteps = visibleSteps.length;
  const progress = step === 'done' ? 100 : Math.round(((visibleIndex + 1) / (totalSteps + 1)) * 100);

  function stepLabel() {
    if (step === 'done') return null;
    return `Step ${visibleIndex + 1} of ${totalSteps}`;
  }

  function goNext() {
    const idx = visibleSteps.indexOf(step);
    if (idx < visibleSteps.length - 1) {
      setStep(visibleSteps[idx + 1]);
    } else {
      finish();
    }
  }

  function goBack() {
    const idx = visibleSteps.indexOf(step);
    if (idx > 0) setStep(visibleSteps[idx - 1]);
  }

  function toggle(key) {
    setForm(f => ({ ...f, [key]: !f[key] }));
  }

  function isLastBeforeFinish() {
    return visibleSteps.indexOf(step) === visibleSteps.length - 1;
  }

  async function finish() {
    setSaving(true);
    try {
      await api.post('/admin/onboarding/complete', {
        scheduling_mode: form.scheduling_mode,
        enable_learning_tracker: form.enable_learning_tracker,
        enable_fee_tracking: form.enable_fee_tracking,
        enable_grade_tracking: form.enable_grade_tracking,
        currency: form.currency,
        fee_tracking_mode: form.enable_fee_tracking ? form.fee_tracking_mode : undefined,
        fee_prorate_mid_period: form.enable_fee_tracking && form.fee_tracking_mode === 'auto' ? form.fee_prorate_mid_period : undefined,
        availability_planner_aware: form.enable_teacher_availability ? form.availability_planner_aware : undefined,
      });
      setStep('done');
    } catch {
      toast.error('Settings could not be saved — you can update them in Settings anytime.');
      closeWithProfile();
    } finally {
      setSaving(false);
    }
  }

  function closeWithProfile() {
    onComplete({
      ...madrasahProfile,
      scheduling_mode: form.scheduling_mode,
      enable_learning_tracker: form.enable_learning_tracker,
      enable_fee_tracking: form.enable_fee_tracking,
      enable_dressing_grade: form.enable_grade_tracking,
      enable_behavior_grade: form.enable_grade_tracking,
      enable_punctuality_grade: form.enable_grade_tracking,
      currency: form.currency,
      fee_tracking_mode: form.fee_tracking_mode,
      fee_prorate_mid_period: form.fee_prorate_mid_period,
      availability_planner_aware: form.availability_planner_aware,
      setup_complete: 1,
    });
  }

  function skipAll() {
    api.post('/admin/onboarding/complete', {}).catch(() => {});
    onComplete({ ...madrasahProfile, setup_complete: 1 });
  }

  // ── Done ────────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="ob-page">
        <div className="ob-topbar">
          <div className="ob-logo">
            <img src="/e-daarah-whitebg-logo.png" alt="e-Daarah" className="ob-logo-img" />
            <span className="ob-logo-name">e-Daarah</span>
          </div>
        </div>
        <div className="ob-progress-track">
          <div className="ob-progress-fill" style={{ width: '100%' }} />
        </div>
        <div className="ob-body">
          <div className="ob-done">
            <div className="ob-done-icon">
              <CheckIcon width={28} height={28} strokeWidth={2.5} />
            </div>
            <h2>You're all set</h2>
            <p>
              Your madrasah is configured. Head to the <strong>Planner</strong> to set up your first session, then add your classes and teachers. You can adjust any of these settings later under <strong>Settings</strong>.
            </p>
            <button className="ob-btn-primary" onClick={closeWithProfile}>
              Go to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ob-page">
      {/* Top bar */}
      <div className="ob-topbar">
        <div className="ob-logo">
          <img src="/e-daarah-whitebg-logo.png" alt="e-Daarah" className="ob-logo-img" />
          <span className="ob-logo-name">e-Daarah</span>
        </div>
        <button className="ob-skip" onClick={skipAll}>Skip setup</button>
      </div>

      {/* Progress bar */}
      <div className="ob-progress-track">
        <div className="ob-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="ob-body">

        {/* ── Step: Scheduling mode ── */}
        {step === 'scheduling' && (
          <div className="ob-step">
            <div className="ob-step-label">{stepLabel()}</div>
            <h1 className="ob-question">How do you organise your academic year?</h1>
            <p className="ob-hint">
              This shapes how sessions, attendance, and fees are structured across your whole madrasah. You can change it later in <strong>Settings → Scheduling Mode</strong>.
            </p>
            <div className="ob-options">
              <button
                className={`ob-option${form.scheduling_mode === 'academic' ? ' selected' : ''}`}
                onClick={() => setForm(f => ({ ...f, scheduling_mode: 'academic' }))}
              >
                <div className="ob-option-radio">
                  {form.scheduling_mode === 'academic' && <div className="ob-option-radio-dot" />}
                </div>
                <div className="ob-option-text">
                  <div className="ob-option-title">Academic year with semesters</div>
                  <div className="ob-option-desc">One active session at a time (e.g. 2025–26), split into terms or halves. Best for madrasahs with fixed term dates.</div>
                </div>
              </button>
              <button
                className={`ob-option${form.scheduling_mode === 'cohort' ? ' selected' : ''}`}
                onClick={() => setForm(f => ({ ...f, scheduling_mode: 'cohort' }))}
              >
                <div className="ob-option-radio">
                  {form.scheduling_mode === 'cohort' && <div className="ob-option-radio-dot" />}
                </div>
                <div className="ob-option-text">
                  <div className="ob-option-title">Rolling cohorts</div>
                  <div className="ob-option-desc">Multiple cohorts run in parallel. Students join anytime and are tracked individually from their start date. Best for online or year-round schools.</div>
                </div>
              </button>
            </div>
            <div className="ob-actions">
              <button className="ob-btn-primary" onClick={goNext}>Continue</button>
            </div>
          </div>
        )}

        {/* ── Step: Features ── */}
        {step === 'features' && (
          <div className="ob-step">
            <div className="ob-step-label">{stepLabel()}</div>
            <h1 className="ob-question">Which features do you need?</h1>
            <p className="ob-hint">
              Select everything that applies. All of these can be turned on or off anytime in <strong>Settings</strong>.
            </p>
            <div className="ob-options">
              <button
                className={`ob-check${form.enable_learning_tracker ? ' checked' : ''}`}
                onClick={() => toggle('enable_learning_tracker')}
              >
                <div className="ob-check-box">
                  <span className="ob-check-tick">✓</span>
                </div>
                <div className="ob-option-text">
                  <div className="ob-option-title">Learning Tracker</div>
                  <div className="ob-option-desc">Teachers record Qur'an memorisation and subject progress per student. Parents can view it in the parent report.</div>
                </div>
              </button>
              <button
                className={`ob-check${form.enable_grade_tracking ? ' checked' : ''}`}
                onClick={() => toggle('enable_grade_tracking')}
              >
                <div className="ob-check-box">
                  <span className="ob-check-tick">✓</span>
                </div>
                <div className="ob-option-text">
                  <div className="ob-option-title">Grade Tracking</div>
                  <div className="ob-option-desc">Record behaviour, dress, and punctuality alongside attendance. Useful for madrasahs that report on student conduct.</div>
                </div>
              </button>
              <button
                className={`ob-check${form.enable_fee_tracking ? ' checked' : ''}`}
                onClick={() => toggle('enable_fee_tracking')}
              >
                <div className="ob-check-box">
                  <span className="ob-check-tick">✓</span>
                </div>
                <div className="ob-option-text">
                  <div className="ob-option-title">Fee Tracking</div>
                  <div className="ob-option-desc">Manage student payments, track outstanding balances, and send automated reminders to parents.</div>
                </div>
              </button>
              <button
                className={`ob-check${form.enable_teacher_availability ? ' checked' : ''}`}
                onClick={() => toggle('enable_teacher_availability')}
              >
                <div className="ob-check-box">
                  <span className="ob-check-tick">✓</span>
                </div>
                <div className="ob-option-text">
                  <div className="ob-option-title">Teacher Availability</div>
                  <div className="ob-option-desc">Teachers mark days they're unavailable in the next 2 weeks. Helps you plan cover and avoid scheduling conflicts.</div>
                </div>
              </button>
            </div>
            <div className="ob-actions">
              <button className="ob-btn-back" onClick={goBack}>Back</button>
              <button className="ob-btn-primary" onClick={goNext} disabled={saving}>
                {isLastBeforeFinish() ? (saving ? 'Saving…' : 'Finish setup') : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Fee mode (conditional) ── */}
        {step === 'fee_mode' && (
          <div className="ob-step">
            <div className="ob-step-label">{stepLabel()}</div>
            <h1 className="ob-question">How do you want to calculate fees?</h1>
            <p className="ob-hint">
              This determines how expected fees are worked out for each student. You can change this in <strong>Settings → Fee Calculation Mode</strong>.
            </p>
            <div className="ob-options">
              <button
                className={`ob-option${form.fee_tracking_mode === 'manual' ? ' selected' : ''}`}
                onClick={() => setForm(f => ({ ...f, fee_tracking_mode: 'manual' }))}
              >
                <div className="ob-option-radio">
                  {form.fee_tracking_mode === 'manual' && <div className="ob-option-radio-dot" />}
                </div>
                <div className="ob-option-text">
                  <div className="ob-option-title">Manual</div>
                  <div className="ob-option-desc">You enter a fixed fee amount for each student yourself. Simple and flexible — best if fees vary by student or you don't use the Planner yet.</div>
                </div>
              </button>
              <button
                className={`ob-option${form.fee_tracking_mode === 'auto' ? ' selected' : ''}`}
                onClick={() => setForm(f => ({ ...f, fee_tracking_mode: 'auto' }))}
              >
                <div className="ob-option-radio">
                  {form.fee_tracking_mode === 'auto' && <div className="ob-option-radio-dot" />}
                </div>
                <div className="ob-option-text">
                  <div className="ob-option-title">Automatic</div>
                  <div className="ob-option-desc">Fees are calculated from your Planner data — sessions, school days, and holidays. Requires an active session to be set up first.</div>
                </div>
              </button>
            </div>

            {/* Sub-question: proration (only when auto selected) */}
            {form.fee_tracking_mode === 'auto' && (
              <div className="ob-subquestion">
                <div className="ob-subquestion-label">Follow-up</div>
                <div className="ob-subquestion-title">Should fees be reduced for students who join mid-period?</div>
                <div className="ob-subquestion-desc">
                  Proration automatically reduces the fee when a student enrols partway through a billing period. For example, if they join halfway through a term, they pay half the term fee.
                </div>
                <div className="ob-options ob-options-inline">
                  <button
                    className={`ob-option${form.fee_prorate_mid_period ? ' selected' : ''}`}
                    onClick={() => setForm(f => ({ ...f, fee_prorate_mid_period: true }))}
                  >
                    <div className="ob-option-radio">
                      {form.fee_prorate_mid_period && <div className="ob-option-radio-dot" />}
                    </div>
                    <div className="ob-option-text">
                      <div className="ob-option-title">Yes, prorate fees</div>
                    </div>
                  </button>
                  <button
                    className={`ob-option${!form.fee_prorate_mid_period ? ' selected' : ''}`}
                    onClick={() => setForm(f => ({ ...f, fee_prorate_mid_period: false }))}
                  >
                    <div className="ob-option-radio">
                      {!form.fee_prorate_mid_period && <div className="ob-option-radio-dot" />}
                    </div>
                    <div className="ob-option-text">
                      <div className="ob-option-title">No, charge the full period fee</div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            <div className="ob-actions">
              <button className="ob-btn-back" onClick={goBack}>Back</button>
              <button className="ob-btn-primary" onClick={goNext} disabled={saving}>
                {isLastBeforeFinish() ? (saving ? 'Saving…' : 'Finish setup') : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Teacher availability (conditional) ── */}
        {step === 'availability' && (
          <div className="ob-step">
            <div className="ob-step-label">{stepLabel()}</div>
            <h1 className="ob-question">How should availability link to your Planner?</h1>
            <p className="ob-hint">
              Teachers mark the days they can't attend in the next 2 weeks. This setting controls whether your Planner's non-school days count as automatic unavailability. You can change this in <strong>Settings → Teacher Availability</strong>.
            </p>
            <div className="ob-options">
              <button
                className={`ob-option${form.availability_planner_aware ? ' selected' : ''}`}
                onClick={() => setForm(f => ({ ...f, availability_planner_aware: true }))}
              >
                <div className="ob-option-radio">
                  {form.availability_planner_aware && <div className="ob-option-radio-dot" />}
                </div>
                <div className="ob-option-text">
                  <div className="ob-option-title">Planner-aware <span className="ob-option-tag">Recommended</span></div>
                  <div className="ob-option-desc">School holidays and non-teaching days from your Planner are automatically shown as unavailable. Teachers only need to flag exceptions beyond that.</div>
                </div>
              </button>
              <button
                className={`ob-option${!form.availability_planner_aware ? ' selected' : ''}`}
                onClick={() => setForm(f => ({ ...f, availability_planner_aware: false }))}
              >
                <div className="ob-option-radio">
                  {!form.availability_planner_aware && <div className="ob-option-radio-dot" />}
                </div>
                <div className="ob-option-text">
                  <div className="ob-option-title">Independent</div>
                  <div className="ob-option-desc">Availability is managed entirely by teachers, separate from the Planner. Best if your Planner isn't fully set up yet.</div>
                </div>
              </button>
            </div>
            <div className="ob-actions">
              <button className="ob-btn-back" onClick={goBack}>Back</button>
              <button className="ob-btn-primary" onClick={goNext} disabled={saving}>
                {isLastBeforeFinish() ? (saving ? 'Saving…' : 'Finish setup') : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Currency (conditional on fees) ── */}
        {step === 'currency' && (
          <div className="ob-step">
            <div className="ob-step-label">{stepLabel()}</div>
            <h1 className="ob-question">What currency do you use?</h1>
            <p className="ob-hint">
              Used for fee amounts and financial reports. You can change this anytime in <strong>Settings → Currency</strong>.
            </p>
            <select
              className="ob-select"
              value={form.currency}
              onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
            >
              {CURRENCIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <div className="ob-actions">
              <button className="ob-btn-back" onClick={goBack}>Back</button>
              <button className="ob-btn-primary" onClick={goNext} disabled={saving}>
                {saving ? 'Saving…' : 'Finish setup'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
