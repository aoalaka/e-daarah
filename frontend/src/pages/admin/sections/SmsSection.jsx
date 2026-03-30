import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import api from '../../../services/api';
import '../Dashboard.css';

function SmsSection({ classes, madrasahProfile, setMadrasahProfile, savingSettings, setSavingSettings, formatCurrency, fmtDate }) {
  // SMS state
  const [smsStatus, setSmsStatus] = useState({ balance: 0, totalPurchased: 0, totalUsed: 0, sentThisMonth: 0, twilioConfigured: false, packs: [] });
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsSubTab, setSmsSubTab] = useState('overview'); // overview, send, reminders, history
  const [smsHistory, setSmsHistory] = useState([]);
  const [smsHistoryTotal, setSmsHistoryTotal] = useState(0);
  const [smsHistoryPage, setSmsHistoryPage] = useState(1);
  const [smsPurchases, setSmsPurchases] = useState([]);
  const [smsReminderStudents, setSmsReminderStudents] = useState([]);
  const [smsReminderClass, setSmsReminderClass] = useState('');
  const [smsReminderSendTo, setSmsReminderSendTo] = useState('parent'); // parent or student
  const [smsReminderMsg, setSmsReminderMsg] = useState('[{madrasah_name}] Dear Parent/Guardian, this is a reminder that the fee for {student_name} has an outstanding balance. Please make the payment at your earliest convenience. Thank you.');
  const [smsSelectedStudents, setSmsSelectedStudents] = useState([]);
  const [smsSending, setSmsSending] = useState(false);
  const [smsReminderPage, setSmsReminderPage] = useState(1);
  const [smsShowRecipients, setSmsShowRecipients] = useState(false);
  const [smsCustomPhone, setSmsCustomPhone] = useState('');
  const [smsCustomMsg, setSmsCustomMsg] = useState('');
  const [smsHistoryFilter, setSmsHistoryFilter] = useState('');

  // SMS data loading
  useEffect(() => {
    loadSmsData();
  }, []);

  useEffect(() => {
    if (smsSubTab === 'history') loadSmsHistory();
  }, [smsSubTab, smsHistoryPage, smsHistoryFilter]);

  useEffect(() => {
    if (smsSubTab === 'reminders') loadFeeReminderPreview();
  }, [smsSubTab, smsReminderClass, smsReminderSendTo]);

  // SMS functions
  const loadSmsData = async () => {
    setSmsLoading(true);
    try {
      const [statusRes, purchasesRes] = await Promise.all([
        api.get('/sms/status'),
        api.get('/sms/purchases')
      ]);
      setSmsStatus(statusRes.data);
      setSmsPurchases(purchasesRes.data.purchases || []);
    } catch (error) {
      console.error('Failed to load SMS data:', error);
    }
    setSmsLoading(false);
  };

  const loadSmsHistory = async () => {
    try {
      const params = new URLSearchParams({ page: smsHistoryPage, limit: 25 });
      if (smsHistoryFilter) params.append('type', smsHistoryFilter);
      const res = await api.get(`/sms/history?${params}`);
      setSmsHistory(res.data.messages || []);
      setSmsHistoryTotal(res.data.total || 0);
    } catch (error) {
      console.error('Failed to load SMS history:', error);
    }
  };

  const loadFeeReminderPreview = async () => {
    try {
      const qp = new URLSearchParams();
      if (smsReminderClass) qp.set('classId', smsReminderClass);
      qp.set('sendTo', smsReminderSendTo);
      const res = await api.get(`/sms/fee-reminder-preview?${qp}`);
      setSmsReminderStudents(res.data.students || []);
      setSmsSelectedStudents(res.data.students?.map(s => s.id) || []);
      setSmsReminderPage(1);
    } catch (error) {
      console.error('Failed to load fee reminder preview:', error);
    }
  };

  const handleBuySmsCredits = async (packId) => {
    try {
      const res = await api.post('/sms/purchase', { packId });
      if (res.data.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to start checkout');
    }
  };

  const handleSendFeeReminders = async () => {
    if (smsSelectedStudents.length === 0) {
      toast.error('Select at least one student');
      return;
    }
    if (!smsReminderMsg.trim()) {
      toast.error('Enter a message');
      return;
    }
    setSmsSending(true);
    try {
      const res = await api.post('/sms/send-bulk', {
        studentIds: smsSelectedStudents,
        message: smsReminderMsg,
        messageType: 'fee_reminder',
        sendTo: smsReminderSendTo,
        groupByPhone: true
      });
      const r = res.data;
      toast.success(`Sent: ${r.sent}, Failed: ${r.failed}, Skipped (no phone): ${r.skipped}`);
      loadSmsData();
      if (r.errors?.length) {
        r.errors.forEach(e => toast.error(`${e.student}: ${e.error}`));
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send reminders');
    }
    setSmsSending(false);
  };

  const handleSendCustomSms = async () => {
    if (!smsCustomPhone || !smsCustomMsg.trim()) {
      toast.error('Phone and message are required');
      return;
    }
    setSmsSending(true);
    try {
      await api.post('/sms/send', { phone: smsCustomPhone, message: smsCustomMsg, messageType: 'custom' });
      toast.success('SMS sent successfully');
      setSmsCustomPhone('');
      setSmsCustomMsg('');
      loadSmsData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send SMS');
    }
    setSmsSending(false);
  };

  return (
    <>
      <div className="page-header">
        <h2 className="page-title">SMS</h2>
      </div>

      {smsLoading && <div className="loading-state"><div className="loading-spinner" /></div>}

      {!smsLoading && (
        <>
          {/* Credit Balance KPIs */}
          <div className="kpi-grid">
            <div className="kpi-card blue">
              <div className="kpi-label">Credits Available</div>
              <div className="kpi-value" style={{ color: smsStatus.balance > 0 ? 'var(--black)' : '#dc2626' }}>{smsStatus.balance}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Sent This Month</div>
              <div className="kpi-value">{smsStatus.sentThisMonth}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Total Purchased</div>
              <div className="kpi-value">{smsStatus.totalPurchased}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Total Used</div>
              <div className="kpi-value">{smsStatus.totalUsed}</div>
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="report-tabs no-print">
            <nav className="report-tabs-nav">
              {[
                { id: 'overview', label: 'Buy Credits' },
                { id: 'reminders', label: 'Fee Reminders' },
                { id: 'send', label: 'Custom Message' },
                { id: 'history', label: 'History' }
              ].map(t => (
                <button key={t.id} className={`report-tab-btn ${smsSubTab === t.id ? 'active' : ''}`}
                  onClick={() => setSmsSubTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Buy Credits Sub-tab */}
          {smsSubTab === 'overview' && (
            <>
              <div className="card">
                <h3 style={{ marginBottom: '0.25rem' }}>Purchase SMS Credits</h3>
                <p className="page-description" style={{ marginBottom: '1rem' }}>Each credit sends one SMS message. Credits never expire.</p>
                <div className="kpi-grid">
                  {(smsStatus.packs?.length ? smsStatus.packs : [
                    { id: 'sms_50', credits: 50, price_cents: 300, label: '50 SMS', description: '$3.00' },
                    { id: 'sms_200', credits: 200, price_cents: 1000, label: '200 SMS', description: '$10.00' },
                    { id: 'sms_500', credits: 500, price_cents: 2000, label: '500 SMS', description: '$20.00' },
                    { id: 'sms_1000', credits: 1000, price_cents: 3500, label: '1000 SMS', description: '$35.00' },
                  ]).map(pack => (
                    <div key={pack.id} className="kpi-card" style={{
                      cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                      transition: 'border-color 0.2s, box-shadow 0.2s'
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--black)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--light)'; e.currentTarget.style.boxShadow = 'none'; }}
                      onClick={() => handleBuySmsCredits(pack.id)}
                    >
                      <div className="kpi-value">{pack.credits}</div>
                      <div className="kpi-label" style={{ marginBottom: 0 }}>SMS credits</div>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--black)' }}>{pack.description}</div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{smsStatus.currency === 'NZD' ? 'NZ$' : '$'}{(pack.price_cents / 100 / pack.credits).toFixed(3)}/credit</div>
                      <button className="btn btn-primary" style={{ width: '100%', marginTop: '4px' }}>
                        Buy Now
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Purchase History — only show completed purchases */}
              {smsPurchases.filter(p => p.status === 'completed').length > 0 && (
                <div className="card">
                  <h3 style={{ marginBottom: '1rem' }}>Purchase History</h3>
                  <div className="table-responsive sms-table-desktop">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Credits</th>
                          <th>Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {smsPurchases.filter(p => p.status === 'completed').map(p => (
                          <tr key={p.id}>
                            <td>{fmtDate(p.created_at)}</td>
                            <td>{p.credits}</td>
                            <td>{p.amount_cents === 0 ? 'Free' : `${(p.currency || '').toUpperCase() === 'NZD' ? 'NZ$' : '$'}${(p.amount_cents / 100).toFixed(2)}`}</td>
                            <td>
                              <span className="status-badge status-active">
                                Completed
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="support-mobile-cards">
                    {smsPurchases.filter(p => p.status === 'completed').map(p => (
                      <div key={p.id} className="admin-mobile-card">
                        <div className="admin-mobile-card-top">
                          <div>
                            <div className="admin-mobile-card-title">{fmtDate(p.created_at)}</div>
                            <div className="admin-mobile-card-sub">{p.credits} credits</div>
                          </div>
                          <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                            {p.amount_cents === 0 ? 'Free' : `${(p.currency || '').toUpperCase() === 'NZD' ? 'NZ$' : '$'}${(p.amount_cents / 100).toFixed(2)}`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Fee Reminders Sub-tab */}
          {smsSubTab === 'reminders' && (
            <>
              {/* Auto Monthly Reminder — prominent card */}
              <div className="card" style={{
                marginBottom: '16px',
                border: madrasahProfile?.auto_fee_reminder_enabled ? '1px solid #22c55e' : '1px solid var(--border, #e5e7eb)',
                background: madrasahProfile?.auto_fee_reminder_enabled ? 'var(--surface, #f9fafb)' : undefined
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <h3 style={{ margin: 0 }}>Auto Monthly Reminder</h3>
                      {madrasahProfile?.auto_fee_reminder_enabled && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: '10px' }}>ACTIVE</span>
                      )}
                    </div>
                    <p className="page-description" style={{ margin: 0 }}>
                      Automatically send a fee reminder to all parents every month during active semesters. No manual action needed.
                    </p>
                  </div>
                  <label className="toggle-switch" style={{ flexShrink: 0, marginTop: '2px' }}>
                    <input
                      type="checkbox"
                      checked={!!madrasahProfile?.auto_fee_reminder_enabled}
                      disabled={savingSettings}
                      onChange={async (e) => {
                        const enabled = e.target.checked;
                        const updates = { auto_fee_reminder_enabled: enabled };
                        if (enabled) {
                          updates.auto_fee_reminder_message = madrasahProfile?.auto_fee_reminder_message
                            || `Assalaamu Alaikum. This is a reminder from {madrasah_name} that fees for this month are now due. Please ensure payment is made at your earliest convenience. JazakAllahu Khairan.`;
                        }
                        setSavingSettings(true);
                        try {
                          const res = await api.put('/admin/settings', updates);
                          setMadrasahProfile(prev => ({ ...prev, ...res.data }));
                          toast.success(enabled ? 'Auto reminder enabled' : 'Auto reminder disabled');
                        } catch (err) { toast.error('Failed to update'); }
                        setSavingSettings(false);
                      }}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                {madrasahProfile?.auto_fee_reminder_enabled && (
                  <div style={{ marginTop: '16px', maxWidth: '520px' }}>
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <label className="form-label">When to send</label>
                      <select
                        className="form-input"
                        style={{ width: '220px' }}
                        value={madrasahProfile?.auto_fee_reminder_timing || 'day_of_month'}
                        onChange={async (e) => {
                          const timing = e.target.value;
                          setMadrasahProfile(prev => ({ ...prev, auto_fee_reminder_timing: timing }));
                          setSavingSettings(true);
                          try {
                            const res = await api.put('/admin/settings', { auto_fee_reminder_timing: timing });
                            setMadrasahProfile(prev => ({ ...prev, ...res.data }));
                            toast.success(timing === 'semester_start' ? 'Will send on semester start dates' : 'Will send on specific day of month');
                          } catch (err) { toast.error('Failed to update'); }
                          setSavingSettings(false);
                        }}
                      >
                        <option value="day_of_month">Specific day of month</option>
                        <option value="semester_start">Start of each semester</option>
                      </select>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                        {(madrasahProfile?.auto_fee_reminder_timing || 'day_of_month') === 'semester_start'
                          ? 'Reminder will be sent on the first day of each semester automatically.'
                          : 'Reminder will be sent on the chosen day every month.'}
                      </span>
                    </div>

                    {(madrasahProfile?.auto_fee_reminder_timing || 'day_of_month') === 'day_of_month' && (
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <label className="form-label">Day of month</label>
                      <input
                        type="number"
                        className="form-input"
                        style={{ width: '80px' }}
                        min={1}
                        max={28}
                        placeholder="e.g. 1"
                        value={madrasahProfile?.auto_fee_reminder_day || ''}
                        onChange={(e) => setMadrasahProfile(prev => ({ ...prev, auto_fee_reminder_day: e.target.value }))}
                        onBlur={async (e) => {
                          const day = parseInt(e.target.value);
                          if (!day || day < 1 || day > 28) return;
                          setSavingSettings(true);
                          try {
                            const res = await api.put('/admin/settings', { auto_fee_reminder_day: day });
                            setMadrasahProfile(prev => ({ ...prev, ...res.data }));
                          } catch (err) { toast.error('Failed to update'); }
                          setSavingSettings(false);
                        }}
                      />
                    </div>
                    )}

                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <label className="form-label">Message</label>
                      <textarea
                        className="form-textarea"
                        rows={3}
                        value={madrasahProfile?.auto_fee_reminder_message || ''}
                        onChange={(e) => setMadrasahProfile(prev => ({ ...prev, auto_fee_reminder_message: e.target.value }))}
                        maxLength={1600}
                        placeholder="Type your reminder message..."
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                          Variables: {'{madrasah_name}'} {'{student_name}'} {'{first_name}'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: (madrasahProfile?.auto_fee_reminder_message || '').length > 1400 ? '#dc2626' : 'var(--muted)' }}>
                          {(madrasahProfile?.auto_fee_reminder_message || '').length}/1600
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-primary"
                        disabled={savingSettings || !(madrasahProfile?.auto_fee_reminder_message || '').trim()}
                        onClick={async () => {
                          setSavingSettings(true);
                          try {
                            const res = await api.put('/admin/settings', {
                              auto_fee_reminder_message: madrasahProfile.auto_fee_reminder_message
                            });
                            setMadrasahProfile(prev => ({ ...prev, ...res.data }));
                            toast.success('Message saved');
                          } catch (err) { toast.error('Failed to save'); }
                          setSavingSettings(false);
                        }}
                      >
                        {savingSettings ? 'Saving...' : 'Save Message'}
                      </button>
                      {madrasahProfile?.auto_fee_reminder_last_sent && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                          Last sent: {new Date(madrasahProfile.auto_fee_reminder_last_sent).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Manual Send — collapsible recipients */}
              <div className="card">
                <h3 style={{ marginBottom: '0.25rem' }}>Send Now</h3>
                <p className="page-description" style={{ marginBottom: '1rem' }}>
                  Send a one-time fee reminder to selected students with outstanding balances.
                </p>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Send To</label>
                    <select className="form-select" value={smsReminderSendTo}
                      onChange={(e) => setSmsReminderSendTo(e.target.value)}>
                      <option value="parent">Parent / Guardian</option>
                      <option value="student">Student (direct)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Filter by Class</label>
                    <select className="form-select" value={smsReminderClass}
                      onChange={(e) => setSmsReminderClass(e.target.value)}>
                      <option value="">All Classes</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Message</label>
                  <textarea className="form-textarea" rows={4} value={smsReminderMsg}
                    onChange={(e) => setSmsReminderMsg(e.target.value)}
                    maxLength={1600} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      Variables: {'{madrasah_name}'}, {'{student_name}'}, {'{first_name}'}, {'{last_name}'}, {'{expected_fee}'}, {'{balance}'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: smsReminderMsg.length > 1400 ? '#dc2626' : '#94a3b8' }}>
                      {smsReminderMsg.length}/1600
                    </span>
                  </div>
                </div>

                {smsReminderStudents.length === 0 ? (
                  <div className="empty-state">
                    <p>No students with outstanding balances and phone numbers found.</p>
                  </div>
                ) : (
                  (() => {
                    const perPage = 20;
                    const totalPages = Math.ceil(smsReminderStudents.length / perPage);
                    const paged = smsReminderStudents.slice((smsReminderPage - 1) * perPage, smsReminderPage * perPage);
                    const getPhone = (s) => smsReminderSendTo === 'student' ? s.student_phone : s.parent_guardian_phone;
                    const getPhoneCode = (s) => smsReminderSendTo === 'student' ? (s.student_phone_country_code || '') : (s.parent_guardian_phone_country_code || '');
                    const formatDisplay = (s) => { const code = getPhoneCode(s); const ph = getPhone(s); return code && ph ? `${code}${ph}` : ph || '—'; };
                    const selectedStudents = smsReminderStudents.filter(s => smsSelectedStudents.includes(s.id));
                    const phoneGroups = {};
                    selectedStudents.forEach(s => {
                      const key = getPhoneCode(s) + getPhone(s);
                      if (!phoneGroups[key]) phoneGroups[key] = [];
                      phoneGroups[key].push(s);
                    });
                    const uniquePhones = Object.keys(phoneGroups).length;
                    const duplicateParents = selectedStudents.length - uniquePhones;

                    const estimateSegments = (text) => {
                      if (!text) return 1;
                      const len = text.length;
                      return len <= 160 ? 1 : Math.ceil(len / 153);
                    };
                    const estimatedCredits = Object.values(phoneGroups).reduce((total, group) => {
                      const names = group.map(s => `${s.first_name} ${s.last_name}`).join(', ');
                      const simulated = smsReminderMsg
                        .replace(/\{student_name\}/gi, names)
                        .replace(/\{first_name\}/gi, group.map(s => s.first_name).join(', '))
                        .replace(/\{last_name\}/gi, group.map(s => s.last_name).join(', '))
                        .replace(/\{madrasah_name\}/gi, madrasahProfile?.name || '')
                        .replace(/\{expected_fee\}/gi, '$0.00')
                        .replace(/\{balance\}/gi, '$0.00');
                      return total + estimateSegments(simulated);
                    }, 0);

                    return (
                      <>
                        {/* Collapsible recipient header */}
                        <div
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: smsShowRecipients ? '0.75rem' : 0, cursor: 'pointer', padding: '8px 0' }}
                          onClick={() => setSmsShowRecipients(!smsShowRecipients)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.75rem', transition: 'transform 0.2s', transform: smsShowRecipients ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}>&#9654;</span>
                            <label className="form-label" style={{ margin: 0, cursor: 'pointer' }}>
                              {smsSelectedStudents.length} of {smsReminderStudents.length} students selected
                            </label>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button className="btn btn-sm btn-secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSmsSelectedStudents(
                                  smsSelectedStudents.length === smsReminderStudents.length ? [] : smsReminderStudents.map(s => s.id)
                                );
                              }}>
                              {smsSelectedStudents.length === smsReminderStudents.length ? 'Deselect All' : 'Select All'}
                            </button>
                            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                              {smsShowRecipients ? 'Hide' : 'Preview'}
                            </span>
                          </div>
                        </div>

                        {smsShowRecipients && (
                          <>
                            {duplicateParents > 0 && (
                              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '8px 12px', marginBottom: '0.75rem', fontSize: '0.8125rem', color: '#1e40af' }}>
                                {uniquePhones} SMS will be sent — {duplicateParents} student{duplicateParents !== 1 ? 's share' : ' shares'} a phone number with another student. Children of the same parent are combined into one message.
                              </div>
                            )}

                            <div className="table-responsive sms-table-desktop" style={{ marginBottom: '0.5rem' }}>
                              <table className="data-table">
                                <thead>
                                  <tr>
                                    <th style={{ width: '40px' }}>
                                      <input type="checkbox"
                                        checked={smsSelectedStudents.length === smsReminderStudents.length}
                                        onChange={() => setSmsSelectedStudents(
                                          smsSelectedStudents.length === smsReminderStudents.length ? [] : smsReminderStudents.map(s => s.id)
                                        )} />
                                    </th>
                                    <th>Student</th>
                                    <th>Class</th>
                                    <th>{smsReminderSendTo === 'student' ? 'Student Phone' : 'Parent Phone'}</th>
                                    <th>Balance</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {paged.map(s => (
                                    <tr key={s.id}>
                                      <td>
                                        <input type="checkbox"
                                          checked={smsSelectedStudents.includes(s.id)}
                                          onChange={() => setSmsSelectedStudents(prev =>
                                            prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                                          )} />
                                      </td>
                                      <td>{s.first_name} {s.last_name}</td>
                                      <td>{s.class_name || '—'}</td>
                                      <td>{formatDisplay(s)}</td>
                                      <td style={{ color: '#dc2626', fontWeight: '600' }}>{formatCurrency(s.balance)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {totalPages > 1 && (
                              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                <button className="btn btn-sm btn-secondary" disabled={smsReminderPage <= 1}
                                  onClick={() => setSmsReminderPage(p => p - 1)}>Previous</button>
                                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                                  Page {smsReminderPage} of {totalPages}
                                </span>
                                <button className="btn btn-sm btn-secondary" disabled={smsReminderPage >= totalPages}
                                  onClick={() => setSmsReminderPage(p => p + 1)}>Next</button>
                              </div>
                            )}

                            {/* Mobile cards */}
                            <div className="support-mobile-cards" style={{ marginBottom: '1rem' }}>
                              {paged.map(s => (
                                <div key={s.id} className="admin-mobile-card" style={{ cursor: 'pointer' }}
                                  onClick={() => setSmsSelectedStudents(prev =>
                                    prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                                  )}>
                                  <div className="admin-mobile-card-top">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <input type="checkbox" checked={smsSelectedStudents.includes(s.id)} readOnly />
                                      <div>
                                        <div className="admin-mobile-card-title">{s.first_name} {s.last_name}</div>
                                        <div className="admin-mobile-card-sub">{s.class_name || 'No class'} · {formatDisplay(s)}</div>
                                      </div>
                                    </div>
                                    <span style={{ color: '#dc2626', fontWeight: '600', fontSize: '0.875rem' }}>{formatCurrency(s.balance)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}

                        {/* Send button — always visible */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                          <button className="btn btn-primary" onClick={handleSendFeeReminders}
                            disabled={smsSending || smsSelectedStudents.length === 0 || smsStatus.balance < estimatedCredits}>
                            {smsSending ? 'Sending...' : `Send Now to ${uniquePhones} recipient${uniquePhones !== 1 ? 's' : ''}`}
                          </button>
                          {smsStatus.balance < estimatedCredits && estimatedCredits > 0 && (
                            <span style={{ color: '#dc2626', fontSize: '0.875rem' }}>
                              ~{estimatedCredits} credits needed, have {smsStatus.balance}.{' '}
                              <button className="btn-link" style={{ fontSize: '0.875rem' }} onClick={() => setSmsSubTab('overview')}>Buy more</button>
                            </span>
                          )}
                          {smsStatus.balance >= estimatedCredits && estimatedCredits > 0 && (
                            <span style={{ color: '#64748b', fontSize: '0.875rem' }}>
                              ~{estimatedCredits} credit{estimatedCredits !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </>
                    );
                  })()
                )}
              </div>
            </>
          )}

          {/* Custom Message Sub-tab */}
          {smsSubTab === 'send' && (
            <>
              <div className="card">
                <h3 style={{ marginBottom: '0.25rem' }}>Send Custom Message</h3>
                <p className="page-description" style={{ marginBottom: '1rem' }}>
                  Send an SMS to any phone number. Costs 1 credit per SMS segment.
                </p>

                <div style={{ maxWidth: '480px' }}>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input type="tel" className="form-input" placeholder="+1234567890"
                      value={smsCustomPhone} onChange={(e) => setSmsCustomPhone(e.target.value)} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                      Include country code (e.g. +1 for US, +44 for UK)
                    </span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Message</label>
                    <textarea className="form-textarea" rows={4} value={smsCustomMsg}
                      onChange={(e) => setSmsCustomMsg(e.target.value)}
                      maxLength={1600} placeholder="Type your message..." />
                    <div style={{ textAlign: 'right', marginTop: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: smsCustomMsg.length > 1400 ? '#dc2626' : 'var(--muted)' }}>
                        {smsCustomMsg.length}/1600
                      </span>
                    </div>
                  </div>

                  <div className="form-actions">
                    <button className="btn btn-primary" onClick={handleSendCustomSms}
                      disabled={smsSending || !smsCustomPhone || !smsCustomMsg.trim() || smsStatus.balance < 1}>
                      {smsSending ? 'Sending...' : 'Send SMS (1 credit)'}
                    </button>
                  </div>

                  {smsStatus.balance < 1 && (
                    <p style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.75rem' }}>
                      No credits remaining. <button className="btn-link" style={{ fontSize: '0.875rem' }} onClick={() => setSmsSubTab('overview')}>Buy credits</button>
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* History Sub-tab */}
          {smsSubTab === 'history' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <h3 style={{ margin: 0 }}>Message History</h3>
                <select className="form-select" style={{ maxWidth: '180px' }} value={smsHistoryFilter}
                  onChange={(e) => { setSmsHistoryFilter(e.target.value); setSmsHistoryPage(1); }}>
                  <option value="">All Types</option>
                  <option value="fee_reminder">Fee Reminders</option>
                  <option value="custom">Custom</option>
                  <option value="announcement">Announcements</option>
                </select>
              </div>

              {smsHistory.length === 0 ? (
                <div className="empty-state">
                  <p>No messages sent yet.</p>
                </div>
              ) : (
                <>
                  <div className="table-responsive sms-table-desktop">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Recipient</th>
                          <th>Phone</th>
                          <th>Type</th>
                          <th>Status</th>
                          <th>Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {smsHistory.map(m => (
                          <tr key={m.id}>
                            <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(m.created_at)}</td>
                            <td>{m.first_name ? `${m.first_name} ${m.last_name}` : '—'}</td>
                            <td>{m.to_phone}</td>
                            <td>
                              <span className={`status-badge ${m.message_type === 'fee_reminder' ? 'status-pending' : 'status-active'}`}>
                                {m.message_type.replace('_', ' ')}
                              </span>
                            </td>
                            <td>
                              <span className={`status-badge ${m.status === 'sent' || m.status === 'delivered' ? 'status-active' : m.status === 'failed' ? 'status-inactive' : 'status-pending'}`}>
                                {m.status}
                              </span>
                            </td>
                            <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                              title={m.message_body}>
                              {m.message_body}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="support-mobile-cards">
                    {smsHistory.map(m => (
                      <div key={m.id} className="admin-mobile-card">
                        <div className="admin-mobile-card-top">
                          <div>
                            <div className="admin-mobile-card-title">
                              {m.first_name ? `${m.first_name} ${m.last_name}` : m.to_phone}
                            </div>
                            <div className="admin-mobile-card-sub">
                              {fmtDate(m.created_at)} · {m.message_type.replace('_', ' ')}
                            </div>
                          </div>
                          <span className={`status-badge ${m.status === 'sent' || m.status === 'delivered' ? 'status-active' : m.status === 'failed' ? 'status-inactive' : 'status-pending'}`}>
                            {m.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem', lineHeight: '1.4' }}>
                          {m.message_body?.length > 120 ? m.message_body.slice(0, 120) + '...' : m.message_body}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {smsHistoryTotal > 25 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                      <button className="btn btn-sm btn-secondary" disabled={smsHistoryPage <= 1}
                        onClick={() => setSmsHistoryPage(p => p - 1)}>Previous</button>
                      <span style={{ padding: '0.375rem 0.75rem', fontSize: '0.875rem', color: '#64748b' }}>
                        Page {smsHistoryPage} of {Math.ceil(smsHistoryTotal / 25)}
                      </span>
                      <button className="btn btn-sm btn-secondary" disabled={smsHistoryPage >= Math.ceil(smsHistoryTotal / 25)}
                        onClick={() => setSmsHistoryPage(p => p + 1)}>Next</button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}

export default SmsSection;
