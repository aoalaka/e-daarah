import { useState } from 'react';
import { toast } from 'sonner';
import api from '../services/api';
import './AutoReminderCard.css';

/**
 * Reusable card for auto-SMS reminders (fee, attendance, future ones).
 *
 * Props:
 *   title           — heading text
 *   description     — short blurb shown when collapsed and as subtext when open
 *   icon            — optional emoji or short string shown in the header
 *   accentColor     — hex used for the active border + active pill
 *   enabledKey      — DB column name for the bool toggle (e.g. 'auto_fee_reminder_enabled')
 *   messageKey      — DB column name for the template (e.g. 'auto_fee_reminder_message')
 *   lastSentKey     — DB column name for the last-sent date
 *   defaultMessage  — string used to seed the template the first time the user enables
 *   variables       — array of placeholder strings shown to the admin (e.g. ['{madrasah_name}', '{first_name}'])
 *   madrasahProfile — current profile object
 *   setMadrasahProfile — setter
 *   children        — extra config rows (period selectors, day picker, threshold, etc.) rendered above the message
 */
function AutoReminderCard({
  title,
  description,
  icon,
  accentColor = '#0d9488',
  enabledKey,
  messageKey,
  lastSentKey,
  defaultMessage,
  variables = ['{madrasah_name}', '{student_name}', '{first_name}'],
  madrasahProfile,
  setMadrasahProfile,
  children,
}) {
  const [saving, setSaving] = useState(false);
  const enabled = !!madrasahProfile?.[enabledKey];
  const message = madrasahProfile?.[messageKey] || '';
  const lastSent = madrasahProfile?.[lastSentKey];

  const update = async (payload, successMsg) => {
    setSaving(true);
    try {
      const res = await api.put('/admin/settings', payload);
      setMadrasahProfile(prev => ({ ...prev, ...res.data }));
      if (successMsg) toast.success(successMsg);
    } catch {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    const next = !enabled;
    const payload = { [enabledKey]: next };
    if (next && !message) payload[messageKey] = defaultMessage;
    await update(payload, next ? `${title} enabled` : `${title} disabled`);
  };

  const handleSaveMessage = () => update({ [messageKey]: message }, 'Message saved');

  return (
    <div className={`arc-card ${enabled ? 'arc-active' : ''}`} style={enabled ? { borderColor: accentColor } : {}}>
      <div className="arc-header">
        <div className="arc-header-text">
          <div className="arc-title-row">
            {icon && <span className="arc-icon">{icon}</span>}
            <h3 className="arc-title">{title}</h3>
            {enabled && (
              <span className="arc-status-pill" style={{ background: `${accentColor}20`, color: accentColor }}>
                Active
              </span>
            )}
          </div>
          <p className="arc-description">{description}</p>
        </div>
        <button
          type="button"
          className={`arc-toggle-btn ${enabled ? 'on' : 'off'}`}
          style={enabled ? { background: accentColor, borderColor: accentColor } : {}}
          disabled={saving}
          onClick={handleToggle}
        >
          {saving ? '…' : enabled ? 'Disable' : 'Enable'}
        </button>
      </div>

      {enabled && (
        <div className="arc-body">
          {children}

          <div className="arc-field">
            <label className="form-label">Message template</label>
            <textarea
              className="form-textarea"
              rows={4}
              value={message}
              onChange={e => setMadrasahProfile(prev => ({ ...prev, [messageKey]: e.target.value }))}
              maxLength={1600}
              placeholder="Type your message…"
            />
            <div className="arc-field-foot">
              <span className="arc-variables">
                Variables: {variables.map(v => <code key={v}>{v}</code>)}
              </span>
              <span className={`arc-char-count ${message.length > 1400 ? 'warn' : ''}`}>
                {message.length}/1600
              </span>
            </div>
          </div>

          <div className="arc-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving || !message.trim()}
              onClick={handleSaveMessage}
            >
              {saving ? 'Saving…' : 'Save message'}
            </button>
            {lastSent && (
              <span className="arc-last-sent">
                Last sent: {new Date(lastSent).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AutoReminderCard;
