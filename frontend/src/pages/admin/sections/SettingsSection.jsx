import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { getPricingTier, TIER_PRICES } from '../../../config/pricing-tiers';
import { authService } from '../../../services/auth.service';
import api from '../../../services/api';
import VerifiedBadge from '../../../components/VerifiedBadge';
import '../Dashboard.css';

function SettingsSection({ madrasahProfile, setMadrasahProfile, user, fmtDate, isReadOnly, hasPlusAccess, sessions, setConfirmModal }) {
  const navigate = useNavigate();
  const { madrasahSlug } = useParams();

  // Password state
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Billing state
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [selectedPlan, setSelectedPlan] = useState('plus');
  const [couponCode, setCouponCode] = useState('');

  return (
    <>
      <div className="section-header">
        <h2>Settings</h2>
      </div>

      {/* Change Password */}
      <div className="card" id="settings-password">
        <h3>Change Password</h3>
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            toast.error('New passwords do not match');
            return;
          }
          if (passwordForm.newPassword.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
          }
          const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/;
          if (!passwordRegex.test(passwordForm.newPassword)) {
            toast.error('Password must contain uppercase, lowercase, number, and special character');
            return;
          }
          setChangingPassword(true);
          try {
            await api.post('/password/change-password', {
              currentPassword: passwordForm.currentPassword,
              newPassword: passwordForm.newPassword
            });
            toast.success('Password changed successfully');
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
          } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to change password');
          } finally {
            setChangingPassword(false);
          }
        }} style={{ maxWidth: '400px' }}>
          <div className="form-group">
            <label>Current Password</label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              required
              minLength={8}
            />
            <small style={{ color: 'var(--muted)', fontSize: '12px' }}>
              Min 8 characters, uppercase, lowercase, number, and special character
            </small>
          </div>
          <div className="form-group">
            <label>Confirm New Password</label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              required
            />
          </div>
          <button type="submit" className="btn primary" disabled={changingPassword}>
            {changingPassword ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* Attendance Features */}
      <div className="card" style={{ marginTop: '20px' }}>
        <h3>Attendance Features</h3>
        <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>
          Choose which grading fields teachers see when recording attendance.
        </p>
        <div style={{ display: 'grid', gap: '16px', maxWidth: '400px' }}>
          <div className="setting-toggle-row">
            <div className="setting-toggle-info">
              <span className="setting-toggle-label">Dressing Grade</span>
              <p className="setting-toggle-desc">
                Teachers grade student dressing (Excellent / Good / Fair / Poor)
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={madrasahProfile?.enable_dressing_grade !== 0 && madrasahProfile?.enable_dressing_grade !== false}
              className={`setting-switch ${(madrasahProfile?.enable_dressing_grade !== 0 && madrasahProfile?.enable_dressing_grade !== false) ? 'on' : ''}`}
              disabled={savingSettings}
              onClick={async () => {
                const newValue = !(madrasahProfile?.enable_dressing_grade !== 0 && madrasahProfile?.enable_dressing_grade !== false);
                setSavingSettings(true);
                try {
                  const res = await api.put('/admin/settings', { enable_dressing_grade: newValue });
                  setMadrasahProfile(prev => ({ ...prev, ...res.data }));
                  toast.success(`Dressing grade ${newValue ? 'enabled' : 'disabled'}`);
                } catch (error) {
                  toast.error('Failed to update setting');
                } finally {
                  setSavingSettings(false);
                }
              }}
            >
              <span className="setting-switch-thumb" />
            </button>
          </div>
          <div className="setting-toggle-row">
            <div className="setting-toggle-info">
              <span className="setting-toggle-label">Behavior Grade</span>
              <p className="setting-toggle-desc">
                Teachers grade student behavior (Excellent / Good / Fair / Poor)
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={madrasahProfile?.enable_behavior_grade !== 0 && madrasahProfile?.enable_behavior_grade !== false}
              className={`setting-switch ${(madrasahProfile?.enable_behavior_grade !== 0 && madrasahProfile?.enable_behavior_grade !== false) ? 'on' : ''}`}
              disabled={savingSettings}
              onClick={async () => {
                const newValue = !(madrasahProfile?.enable_behavior_grade !== 0 && madrasahProfile?.enable_behavior_grade !== false);
                setSavingSettings(true);
                try {
                  const res = await api.put('/admin/settings', { enable_behavior_grade: newValue });
                  setMadrasahProfile(prev => ({ ...prev, ...res.data }));
                  toast.success(`Behavior grade ${newValue ? 'enabled' : 'disabled'}`);
                } catch (error) {
                  toast.error('Failed to update setting');
                } finally {
                  setSavingSettings(false);
                }
              }}
            >
              <span className="setting-switch-thumb" />
            </button>
          </div>
          <div className="setting-toggle-row">
            <div className="setting-toggle-info">
              <span className="setting-toggle-label">Punctuality Grade</span>
              <p className="setting-toggle-desc">
                Teachers grade student punctuality (Excellent / Good / Fair / Poor)
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={madrasahProfile?.enable_punctuality_grade !== 0 && madrasahProfile?.enable_punctuality_grade !== false}
              className={`setting-switch ${(madrasahProfile?.enable_punctuality_grade !== 0 && madrasahProfile?.enable_punctuality_grade !== false) ? 'on' : ''}`}
              disabled={savingSettings}
              onClick={async () => {
                const newValue = !(madrasahProfile?.enable_punctuality_grade !== 0 && madrasahProfile?.enable_punctuality_grade !== false);
                setSavingSettings(true);
                try {
                  const res = await api.put('/admin/settings', { enable_punctuality_grade: newValue });
                  setMadrasahProfile(prev => ({ ...prev, ...res.data }));
                  toast.success(`Punctuality grade ${newValue ? 'enabled' : 'disabled'}`);
                } catch (error) {
                  toast.error('Failed to update setting');
                } finally {
                  setSavingSettings(false);
                }
              }}
            >
              <span className="setting-switch-thumb" />
            </button>
          </div>
          <div className="setting-toggle-row">
            <div className="setting-toggle-info">
              <span className="setting-toggle-label">Qur'an Tracking</span>
              <p className="setting-toggle-desc">
                Enable Qur'an memorization and recitation progress tracking for teachers
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={madrasahProfile?.enable_quran_tracking !== 0 && madrasahProfile?.enable_quran_tracking !== false}
              className={`setting-switch ${(madrasahProfile?.enable_quran_tracking !== 0 && madrasahProfile?.enable_quran_tracking !== false) ? 'on' : ''}`}
              disabled={savingSettings}
              onClick={async () => {
                const newValue = !(madrasahProfile?.enable_quran_tracking !== 0 && madrasahProfile?.enable_quran_tracking !== false);
                setSavingSettings(true);
                try {
                  const res = await api.put('/admin/settings', { enable_quran_tracking: newValue });
                  setMadrasahProfile(prev => ({ ...prev, ...res.data }));
                  toast.success(`Qur'an tracking ${newValue ? 'enabled' : 'disabled'}`);
                } catch (error) {
                  toast.error('Failed to update setting');
                } finally {
                  setSavingSettings(false);
                }
              }}
            >
              <span className="setting-switch-thumb" />
            </button>
          </div>
          <div className="setting-toggle-row">
            <div className="setting-toggle-info">
              <span className="setting-toggle-label">Fee Tracking</span>
              <p className="setting-toggle-desc">
                Track student fee payments, create fee templates, and manage collections
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={madrasahProfile?.enable_fee_tracking !== 0 && madrasahProfile?.enable_fee_tracking !== false}
              className={`setting-switch ${(madrasahProfile?.enable_fee_tracking !== 0 && madrasahProfile?.enable_fee_tracking !== false) ? 'on' : ''}`}
              disabled={savingSettings}
              onClick={async () => {
                const newValue = !(madrasahProfile?.enable_fee_tracking !== 0 && madrasahProfile?.enable_fee_tracking !== false);
                setSavingSettings(true);
                try {
                  const res = await api.put('/admin/settings', { enable_fee_tracking: newValue });
                  setMadrasahProfile(prev => ({ ...prev, ...res.data }));
                  toast.success(`Fee tracking ${newValue ? 'enabled' : 'disabled'}`);
                } catch (error) {
                  toast.error('Failed to update setting');
                } finally {
                  setSavingSettings(false);
                }
              }}
            >
              <span className="setting-switch-thumb" />
            </button>
          </div>
        </div>
      </div>

      {/* Teacher Availability */}
      <div className="card" style={{ marginTop: '20px' }}>
        <h3>Teacher Availability</h3>
        <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>
          Control how teacher availability interacts with your madrasah planner.
        </p>
        <div style={{ display: 'grid', gap: '16px', maxWidth: '400px' }}>
          <div className="setting-toggle-row">
            <div className="setting-toggle-info">
              <span className="setting-toggle-label">Planner-Aware Availability</span>
              <p className="setting-toggle-desc">
                When enabled, non-school days and holidays from your planner are automatically shown as unavailable. When disabled, availability is tracked independently of the planner.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={madrasahProfile?.availability_planner_aware !== 0 && madrasahProfile?.availability_planner_aware !== false}
              className={`setting-switch ${(madrasahProfile?.availability_planner_aware !== 0 && madrasahProfile?.availability_planner_aware !== false) ? 'on' : ''}`}
              disabled={savingSettings}
              onClick={async () => {
                const newValue = !(madrasahProfile?.availability_planner_aware !== 0 && madrasahProfile?.availability_planner_aware !== false);
                setSavingSettings(true);
                try {
                  const res = await api.put('/admin/settings', { availability_planner_aware: newValue });
                  setMadrasahProfile(prev => ({ ...prev, ...res.data }));
                  toast.success(`Planner-aware availability ${newValue ? 'enabled' : 'disabled'}`);
                } catch (error) {
                  toast.error('Failed to update setting');
                } finally {
                  setSavingSettings(false);
                }
              }}
            >
              <span className="setting-switch-thumb" />
            </button>
          </div>
        </div>
      </div>

      {/* Fee Tracking Mode */}
      {(madrasahProfile?.enable_fee_tracking !== 0 && madrasahProfile?.enable_fee_tracking !== false) && (
        <div className="card" style={{ marginTop: '20px' }}>
          <h3>Fee Calculation Mode</h3>
          <p style={{ fontSize: '13px', color: 'var(--gray)', margin: '0 0 12px' }}>
            Choose how student fees are calculated.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              className={`btn ${(!madrasahProfile?.fee_tracking_mode || madrasahProfile?.fee_tracking_mode === 'manual') ? 'btn-primary' : 'btn-secondary'}`}
              disabled={savingSettings}
              onClick={async () => {
                if (madrasahProfile?.fee_tracking_mode === 'manual' || !madrasahProfile?.fee_tracking_mode) return;
                setSavingSettings(true);
                try {
                  const res = await api.put('/admin/settings', { fee_tracking_mode: 'manual' });
                  setMadrasahProfile(prev => ({ ...prev, ...res.data }));
                  toast.success('Switched to manual fee tracking');
                } catch (error) {
                  toast.error('Failed to update setting');
                } finally {
                  setSavingSettings(false);
                }
              }}
            >
              Manual
            </button>
            <button
              className={`btn ${madrasahProfile?.fee_tracking_mode === 'auto' ? 'btn-primary' : 'btn-secondary'}`}
              disabled={savingSettings}
              onClick={async () => {
                if (madrasahProfile?.fee_tracking_mode === 'auto') return;
                const hasPlanner = sessions.some(s => s.is_active);
                if (!hasPlanner) {
                  toast.error('You need an active session in your Planner before enabling auto fee tracking.');
                  return;
                }
                setConfirmModal({
                  title: 'Switch to Auto Fee Tracking',
                  message: 'Auto fee calculation uses your Planner data (sessions, semesters, school days, and holidays) to compute expected fees. Make sure your Planner is up to date before switching.',
                  confirmLabel: 'Switch to Auto',
                  onConfirm: async () => {
                    setSavingSettings(true);
                    try {
                      const res = await api.put('/admin/settings', { fee_tracking_mode: 'auto' });
                      setMadrasahProfile(prev => ({ ...prev, ...res.data }));
                      toast.success('Switched to auto fee tracking');
                    } catch (error) {
                      toast.error(error.response?.data?.error || 'Failed to update setting');
                    } finally {
                      setSavingSettings(false);
                    }
                  }
                });
              }}
            >
              Auto
            </button>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--gray)', marginTop: '8px' }}>
            {(!madrasahProfile?.fee_tracking_mode || madrasahProfile?.fee_tracking_mode === 'manual')
              ? 'Manually set expected fees per student.'
              : 'Fees are auto-calculated from fee schedules and your Planner data.'}
          </p>

          {madrasahProfile?.fee_tracking_mode === 'auto' && (
            <div className="setting-toggle-row" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <div className="setting-toggle-info">
                <span className="setting-toggle-label">Prorate Mid-Period Enrollment</span>
                <p className="setting-toggle-desc">
                  Reduce fees proportionally when a student enrolls partway through a billing period
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={!!madrasahProfile?.fee_prorate_mid_period}
                className={`setting-switch ${madrasahProfile?.fee_prorate_mid_period ? 'on' : ''}`}
                disabled={savingSettings}
                onClick={async () => {
                  const newValue = !madrasahProfile?.fee_prorate_mid_period;
                  setSavingSettings(true);
                  try {
                    const res = await api.put('/admin/settings', { fee_prorate_mid_period: newValue });
                    setMadrasahProfile(prev => ({ ...prev, ...res.data }));
                    toast.success(`Proration ${newValue ? 'enabled' : 'disabled'}`);
                  } catch (error) {
                    toast.error('Failed to update setting');
                  } finally {
                    setSavingSettings(false);
                  }
                }}
              >
                <span className="setting-switch-thumb" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Currency Setting */}
      <div className="card" style={{ marginTop: '20px' }}>
        <h3>Currency</h3>
        <p style={{ fontSize: '13px', color: 'var(--gray)', margin: '0 0 12px' }}>
          Set the currency used for fee tracking and financial displays.
        </p>
        <select
          className="form-select"
          style={{ maxWidth: '280px' }}
          value={madrasahProfile?.currency || 'USD'}
          onChange={async (e) => {
            const newCurrency = e.target.value;
            try {
              const res = await api.put('/admin/settings', { currency: newCurrency });
              setMadrasahProfile(prev => ({ ...prev, ...res.data }));
              toast.success(`Currency set to ${newCurrency}`);
            } catch (error) {
              toast.error('Failed to update currency');
            }
          }}
        >
          <optgroup label="Popular">
            <option value="USD">USD — US Dollar ($)</option>
            <option value="EUR">EUR — Euro (€)</option>
            <option value="GBP">GBP — British Pound (£)</option>
            <option value="CAD">CAD — Canadian Dollar (CA$)</option>
            <option value="AUD">AUD — Australian Dollar (A$)</option>
            <option value="NZD">NZD — New Zealand Dollar (NZ$)</option>
          </optgroup>
          <optgroup label="Africa">
            <option value="NGN">NGN — Nigerian Naira (₦)</option>
            <option value="ZAR">ZAR — South African Rand (R)</option>
            <option value="KES">KES — Kenyan Shilling (KSh)</option>
            <option value="GHS">GHS — Ghanaian Cedi (GH₵)</option>
            <option value="EGP">EGP — Egyptian Pound (E£)</option>
            <option value="TZS">TZS — Tanzanian Shilling (TSh)</option>
            <option value="UGX">UGX — Ugandan Shilling (USh)</option>
            <option value="ETB">ETB — Ethiopian Birr (Br)</option>
            <option value="MAD">MAD — Moroccan Dirham (MAD)</option>
            <option value="XOF">XOF — West African CFA Franc (CFA)</option>
            <option value="XAF">XAF — Central African CFA Franc (FCFA)</option>
          </optgroup>
          <optgroup label="Asia">
            <option value="MYR">MYR — Malaysian Ringgit (RM)</option>
            <option value="IDR">IDR — Indonesian Rupiah (Rp)</option>
            <option value="PKR">PKR — Pakistani Rupee (₨)</option>
            <option value="INR">INR — Indian Rupee (₹)</option>
            <option value="BDT">BDT — Bangladeshi Taka (৳)</option>
            <option value="SAR">SAR — Saudi Riyal (﷼)</option>
            <option value="AED">AED — UAE Dirham (د.إ)</option>
            <option value="QAR">QAR — Qatari Riyal (QR)</option>
            <option value="KWD">KWD — Kuwaiti Dinar (KD)</option>
            <option value="BHD">BHD — Bahraini Dinar (BD)</option>
            <option value="OMR">OMR — Omani Rial (OMR)</option>
            <option value="JOD">JOD — Jordanian Dinar (JD)</option>
            <option value="TRY">TRY — Turkish Lira (₺)</option>
            <option value="PHP">PHP — Philippine Peso (₱)</option>
            <option value="SGD">SGD — Singapore Dollar (S$)</option>
            <option value="JPY">JPY — Japanese Yen (¥)</option>
            <option value="CNY">CNY — Chinese Yuan (¥)</option>
            <option value="KRW">KRW — South Korean Won (₩)</option>
            <option value="THB">THB — Thai Baht (฿)</option>
            <option value="VND">VND — Vietnamese Dong (₫)</option>
            <option value="LKR">LKR — Sri Lankan Rupee (Rs)</option>
            <option value="MMK">MMK — Myanmar Kyat (K)</option>
            <option value="IQD">IQD — Iraqi Dinar (ع.د)</option>
            <option value="AFN">AFN — Afghan Afghani (؋)</option>
          </optgroup>
          <optgroup label="Europe">
            <option value="CHF">CHF — Swiss Franc (CHF)</option>
            <option value="SEK">SEK — Swedish Krona (kr)</option>
            <option value="NOK">NOK — Norwegian Krone (kr)</option>
            <option value="DKK">DKK — Danish Krone (kr)</option>
            <option value="PLN">PLN — Polish Zloty (zł)</option>
            <option value="CZK">CZK — Czech Koruna (Kč)</option>
            <option value="HUF">HUF — Hungarian Forint (Ft)</option>
            <option value="RON">RON — Romanian Leu (lei)</option>
            <option value="BGN">BGN — Bulgarian Lev (лв)</option>
            <option value="RUB">RUB — Russian Ruble (₽)</option>
            <option value="UAH">UAH — Ukrainian Hryvnia (₴)</option>
          </optgroup>
          <optgroup label="Americas">
            <option value="BRL">BRL — Brazilian Real (R$)</option>
            <option value="MXN">MXN — Mexican Peso (MX$)</option>
            <option value="ARS">ARS — Argentine Peso (ARS)</option>
            <option value="CLP">CLP — Chilean Peso (CLP)</option>
            <option value="COP">COP — Colombian Peso (COP)</option>
            <option value="PEN">PEN — Peruvian Sol (S/)</option>
            <option value="JMD">JMD — Jamaican Dollar (J$)</option>
            <option value="TTD">TTD — Trinidad Dollar (TT$)</option>
          </optgroup>
          <optgroup label="Oceania">
            <option value="FJD">FJD — Fijian Dollar (FJ$)</option>
            <option value="PGK">PGK — Papua New Guinean Kina (K)</option>
            <option value="WST">WST — Samoan Tala (WS$)</option>
            <option value="TOP">TOP — Tongan Pa'anga (T$)</option>
          </optgroup>
        </select>
      </div>

      {/* Account Info */}
      <div className="card" id="settings-account" style={{ marginTop: '20px' }}>
        <h3>Account Information</h3>
        <div style={{ display: 'grid', gap: '12px', maxWidth: '400px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Name</label>
            <p style={{ margin: '4px 0 0 0' }}>{user?.firstName} {user?.lastName}</p>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Email</label>
            <p style={{ margin: '4px 0 0 0' }}>{user?.email || 'N/A'}</p>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Role</label>
            <p style={{ margin: '4px 0 0 0', textTransform: 'capitalize' }}>{user?.role || 'Admin'}</p>
          </div>
        </div>
      </div>

      {/* Madrasah Profile */}
      {madrasahProfile && (
        <div className="card" style={{ marginTop: '20px' }}>
          <h3>Madrasah Profile</h3>
          <div className="admin-profile-grid">
            <div>
              <label style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Name</label>
              <p style={{ margin: '4px 0 0 0', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {madrasahProfile.name}
                {madrasahProfile.verification_status === 'verified' && <VerifiedBadge size={16} />}
              </p>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>URL Slug</label>
              <p style={{ margin: '4px 0 0 0', fontFamily: 'monospace' }}>/{madrasahProfile.slug}</p>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Institution Type</label>
              <p style={{ margin: '4px 0 0 0', textTransform: 'capitalize' }}>
                {madrasahProfile.institution_type?.replace(/_/g, ' ') || 'Not specified'}
              </p>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Phone</label>
              <p style={{ margin: '4px 0 0 0' }}>{madrasahProfile.phone || 'Not specified'}</p>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Address</label>
              <p style={{ margin: '4px 0 0 0' }}>
                {[madrasahProfile.street, madrasahProfile.city, madrasahProfile.region, madrasahProfile.country]
                  .filter(Boolean).join(', ') || 'Not specified'}
              </p>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Verification Status</label>
              <p style={{ margin: '4px 0 0 0' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500',
                  backgroundColor: madrasahProfile.verification_status === 'fully_verified' ? '#f5f5f5' :
                    madrasahProfile.verification_status === 'basic_verified' ? '#f5f5f5' : '#f5f5f5',
                  color: madrasahProfile.verification_status === 'fully_verified' ? '#404040' :
                    madrasahProfile.verification_status === 'basic_verified' ? '#525252' : '#737373'
                }}>
                  {madrasahProfile.verification_status?.replace(/_/g, ' ') || 'Unverified'}
                </span>
              </p>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Trial Ends</label>
              <p style={{ margin: '4px 0 0 0' }}>
                {madrasahProfile.trial_ends_at
                  ? fmtDate(madrasahProfile.trial_ends_at)
                  : 'N/A'}
              </p>
            </div>
          </div>

          {/* Usage Stats */}
          {madrasahProfile.usage && (
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>Current Usage</h4>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '600' }}>{madrasahProfile.usage.students}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Students</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '600' }}>{madrasahProfile.usage.teachers}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Teachers</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '600' }}>{madrasahProfile.usage.classes}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Classes</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Billing & Subscription */}
      <div className="card" id="settings-billing" style={{ marginTop: '20px' }}>
        <h3>Billing & Subscription</h3>
        <div style={{ display: 'grid', gap: '16px', maxWidth: '500px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--lighter)', borderRadius: '4px' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Current Plan</div>
              <div style={{ fontSize: '18px', fontWeight: '600', textTransform: 'capitalize' }}>
                {madrasahProfile?.pricing_plan || 'Trial'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Status</div>
              <span style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '500',
                backgroundColor: madrasahProfile?.subscription_status === 'active' ? '#f5f5f5' :
                  madrasahProfile?.subscription_status === 'trialing' ? '#f5f5f5' :
                  madrasahProfile?.subscription_status === 'past_due' ? '#f5f5f5' : '#f5f5f5',
                color: madrasahProfile?.subscription_status === 'active' ? '#404040' :
                  madrasahProfile?.subscription_status === 'trialing' ? '#525252' :
                  madrasahProfile?.subscription_status === 'past_due' ? '#737373' : '#525252'
              }}>
                {madrasahProfile?.subscription_status || 'trialing'}
              </span>
            </div>
          </div>

          {/* Plan Selection */}
          {madrasahProfile?.pricing_plan === 'enterprise' ? (
            <div style={{ marginTop: '16px', padding: '20px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--lighter)', textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Enterprise Plan</div>
              <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '0 0 12px 0' }}>
                Your plan is managed under a service agreement. For changes or questions, contact your account manager.
              </p>
              <a href="mailto:support@e-daarah.com?subject=Enterprise%20Account%20Inquiry" style={{ color: 'var(--accent)', fontSize: '14px', fontWeight: '500' }}>
                Contact Support →
              </a>
            </div>
          ) : (
          <div style={{ marginTop: '16px', padding: '16px', border: '1px solid var(--border)', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>Choose a Plan</h4>

            {/* Billing Cycle Toggle */}
            <div style={{ display: 'flex', gap: '0', marginBottom: '16px', background: 'var(--lighter)', borderRadius: '6px', padding: '4px', width: 'fit-content' }}>
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  background: billingCycle === 'monthly' ? 'white' : 'transparent',
                  color: billingCycle === 'monthly' ? 'var(--text)' : 'var(--muted)',
                  fontWeight: billingCycle === 'monthly' ? '500' : '400',
                  boxShadow: billingCycle === 'monthly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  background: billingCycle === 'annual' ? 'white' : 'transparent',
                  color: billingCycle === 'annual' ? 'var(--text)' : 'var(--muted)',
                  fontWeight: billingCycle === 'annual' ? '500' : '400',
                  boxShadow: billingCycle === 'annual' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                Annual <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: '500' }}>Save 2 months</span>
              </button>
            </div>

            {/* Plan Options */}
            <div className="plan-options-grid">
              {/* Standard Plan */}
              <div
                onClick={() => setSelectedPlan('standard')}
                style={{
                  padding: '16px',
                  border: selectedPlan === 'standard' ? '2px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: selectedPlan === 'standard' ? 'var(--lighter)' : 'white'
                }}
              >
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>Standard</div>
                <div style={{ fontSize: '24px', fontWeight: '600' }}>
                  {(madrasahProfile?.currency || 'USD') === 'NZD' ? 'NZ' : ''}${billingCycle === 'monthly' ? ((madrasahProfile?.currency || 'USD') === 'NZD' ? '21' : TIER_PRICES[getPricingTier(madrasahProfile?.country)]?.standard?.monthly) : ((madrasahProfile?.currency || 'USD') === 'NZD' ? '209' : TIER_PRICES[getPricingTier(madrasahProfile?.country)]?.standard?.annual)}
                  <span style={{ fontSize: '14px', fontWeight: '400', color: 'var(--muted)' }}>
                    /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px' }}>
                  100 students, 20 teachers
                </div>
              </div>

              {/* Plus Plan */}
              <div
                onClick={() => setSelectedPlan('plus')}
                style={{
                  padding: '16px',
                  border: selectedPlan === 'plus' ? '2px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: selectedPlan === 'plus' ? 'var(--lighter)' : 'white',
                  position: 'relative'
                }}
              >
                <span style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '12px',
                  background: 'var(--accent)',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: '600',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                }}>Popular</span>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>Plus</div>
                <div style={{ fontSize: '24px', fontWeight: '600' }}>
                  {(madrasahProfile?.currency || 'USD') === 'NZD' ? 'NZ' : ''}${billingCycle === 'monthly' ? ((madrasahProfile?.currency || 'USD') === 'NZD' ? '49' : TIER_PRICES[getPricingTier(madrasahProfile?.country)]?.plus?.monthly) : ((madrasahProfile?.currency || 'USD') === 'NZD' ? '499' : TIER_PRICES[getPricingTier(madrasahProfile?.country)]?.plus?.annual)}
                  <span style={{ fontSize: '14px', fontWeight: '400', color: 'var(--muted)' }}>
                    /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px' }}>
                  500 students, 50 teachers
                </div>
              </div>
            </div>

            {/* Discount Code */}
            <div style={{ marginTop: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Discount Code</label>
              <input
                type="text"
                className="form-input"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="e.g. SCHOOL50"
                style={{ width: '100%', letterSpacing: '1px', fontWeight: '500' }}
              />
            </div>

            {/* Subscribe Button */}
            <button
              className="btn primary"
              style={{ width: '100%', marginTop: '12px' }}
              onClick={async () => {
                try {
                  const priceKey = `${selectedPlan}_${billingCycle}`;
                  const payload = {
                    priceKey,
                    successUrl: `${window.location.origin}/${madrasahSlug}/admin?billing=success`,
                    cancelUrl: `${window.location.origin}/${madrasahSlug}/admin?billing=canceled`
                  };
                  if (couponCode.trim()) {
                    payload.coupon_code = couponCode.trim();
                  }
                  const response = await api.post('/billing/create-checkout', payload);
                  window.location.href = response.data.url;
                } catch (error) {
                  toast.error(error.response?.data?.error || 'Failed to start checkout');
                }
              }}
            >
              {madrasahProfile?.subscription_status === 'active' ? 'Change Plan' : 'Subscribe Now'}
            </button>
          </div>
          )}

          {/* Manage Billing */}
          {madrasahProfile?.stripe_customer_id && (
            <button
              className="btn secondary"
              style={{ marginTop: '12px' }}
              onClick={async () => {
                try {
                  const response = await api.post('/billing/customer-portal', {
                    returnUrl: `${window.location.origin}/${madrasahSlug}/admin`
                  });
                  window.location.href = response.data.url;
                } catch (error) {
                  toast.error(error.response?.data?.error || 'Failed to open billing portal');
                }
              }}
            >
              Manage Billing
            </button>
          )}

          <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '12px 0 0 0' }}>
            View our <a href="/pricing" target="_blank" style={{ color: 'var(--accent)' }}>pricing page</a> for full feature comparison.
          </p>
        </div>
      </div>
    </>
  );
}

export default SettingsSection;
