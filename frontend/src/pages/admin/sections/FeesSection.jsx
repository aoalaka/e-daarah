import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import api from '../../../services/api';
import SortableTable from '../../../components/SortableTable';
import { CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { cacheData, getCachedData } from '../../../utils/offlineStore';
import '../Dashboard.css';

function FeesSection({ students, setStudents, classes, sessions, semesters, madrasahProfile, isReadOnly, formatCurrency, fmtDate, setConfirmModal }) {
  const [feeSummary, setFeeSummary] = useState([]);
  const [feePayments, setFeePayments] = useState([]);
  const [feeLoading, setFeeLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(null);
  const [newPayment, setNewPayment] = useState({ amount_paid: '', payment_date: '', payment_method: 'cash', reference_note: '', payment_label: '' });
  const [feeClassFilter, setFeeClassFilter] = useState('');
  const [showBulkFeeModal, setShowBulkFeeModal] = useState(false);
  const [bulkFeeAmount, setBulkFeeAmount] = useState('');
  const [bulkFeeNote, setBulkFeeNote] = useState('');
  const [selectedStudentsForFee, setSelectedStudentsForFee] = useState([]);
  const [editingFee, setEditingFee] = useState(null);
  const [bulkFeeClassFilter, setBulkFeeClassFilter] = useState('');
  // Auto fee tracking state
  const [feeSchedules, setFeeSchedules] = useState([]);
  const [showFeeScheduleModal, setShowFeeScheduleModal] = useState(false);
  const [editingFeeSchedule, setEditingFeeSchedule] = useState(null);
  const [newFeeSchedule, setNewFeeSchedule] = useState({ class_id: '', student_id: '', billing_cycle: 'per_semester', amount: '', description: '' });
  const [feeScheduleScope, setFeeScheduleScope] = useState('all');
  const [autoFeeSummary, setAutoFeeSummary] = useState([]);
  const [feeSubTab, setFeeSubTab] = useState('summary');
  const [feeReport, setFeeReport] = useState(null);
  const [feeReportLoading, setFeeReportLoading] = useState(false);
  const [feeReportPeriod, setFeeReportPeriod] = useState('semester');
  const [feeReportSemesterId, setFeeReportSemesterId] = useState('');
  const [feeReportSessionId, setFeeReportSessionId] = useState('');
  const [feeSemesterFilter, setFeeSemesterFilter] = useState('');

  const FeeProgressBar = ({ paid, total }) => {
    const pct = total > 0 ? Math.min(Math.round((paid / total) * 100), 100) : 0;
    const color = pct >= 100 ? '#16a34a' : pct >= 50 ? '#ca8a04' : '#dc2626';
    return (
      <div className="fee-progress">
        <div className="fee-progress-bar">
          <div className="fee-progress-fill" style={{ width: `${pct}%`, background: color }} />
        </div>
        <span className="fee-progress-label" style={{ color }}>{pct}%</span>
      </div>
    );
  };

  useEffect(() => {
    loadFeeData();
  }, [feeClassFilter, feeSemesterFilter, madrasahProfile?.fee_tracking_mode]);

  const getFeeDateRange = () => {
    if (!feeSemesterFilter) return {};
    const sem = semesters.find(s => String(s.id) === String(feeSemesterFilter));
    if (!sem) return {};
    const from = typeof sem.start_date === 'string' ? sem.start_date.split('T')[0] : new Date(sem.start_date).toISOString().split('T')[0];
    const to = typeof sem.end_date === 'string' ? sem.end_date.split('T')[0] : new Date(sem.end_date).toISOString().split('T')[0];
    return { from, to };
  };

  const loadFeeSummary = async () => {
    const cacheKey = `admin-fee-summary-${feeClassFilter || 'all'}-${feeSemesterFilter || 'all'}`;
    try {
      const urlParams = new URLSearchParams();
      if (feeClassFilter) urlParams.set('class_id', feeClassFilter);
      const { from, to } = getFeeDateRange();
      if (from) urlParams.set('from', from);
      if (to) urlParams.set('to', to);
      const qs = urlParams.toString();
      const res = await api.get(`/admin/fee-summary${qs ? '?' + qs : ''}`);
      setFeeSummary(res.data || []);
      cacheData(cacheKey, res.data || []);
    } catch (error) {
      console.error('Failed to load fee summary:', error);
      if (!error.response) {
        const cached = await getCachedData(cacheKey);
        if (cached) setFeeSummary(cached.data);
      }
    }
  };

  const loadFeePayments = async () => {
    const cacheKey = `admin-fee-payments-${feeClassFilter || 'all'}-${feeSemesterFilter || 'all'}`;
    try {
      const urlParams = new URLSearchParams();
      if (feeClassFilter) urlParams.set('class_id', feeClassFilter);
      const { from, to } = getFeeDateRange();
      if (from) urlParams.set('from', from);
      if (to) urlParams.set('to', to);
      const qs = urlParams.toString();
      const res = await api.get(`/admin/fee-payments${qs ? '?' + qs : ''}`);
      setFeePayments(res.data || []);
      cacheData(cacheKey, res.data || []);
    } catch (error) {
      console.error('Failed to load fee payments:', error);
      if (!error.response) {
        const cached = await getCachedData(cacheKey);
        if (cached) setFeePayments(cached.data);
      }
    }
  };

  const loadFeeData = async () => {
    setFeeLoading(true);
    const isAuto = madrasahProfile?.fee_tracking_mode === 'auto';
    await Promise.all([
      loadFeeSummary(),
      loadFeePayments(),
      ...(isAuto ? [loadFeeSchedules(), loadAutoFeeSummary()] : [])
    ]);
    setFeeLoading(false);
  };

  const loadFeeSchedules = async () => {
    const cacheKey = 'admin-fee-schedules';
    try {
      const res = await api.get('/admin/fee-schedules');
      setFeeSchedules(res.data || []);
      cacheData(cacheKey, res.data || []);
    } catch (error) {
      console.error('Failed to load fee schedules:', error);
      if (!error.response) {
        const cached = await getCachedData(cacheKey);
        if (cached) setFeeSchedules(cached.data);
      }
    }
  };

  const loadAutoFeeSummary = async () => {
    const cacheKey = `admin-auto-fee-${feeClassFilter || 'all'}-${feeSemesterFilter || 'all'}`;
    try {
      const urlParams = new URLSearchParams();
      if (feeClassFilter) urlParams.set('class_id', feeClassFilter);
      const { from, to } = getFeeDateRange();
      if (from) urlParams.set('from', from);
      if (to) urlParams.set('to', to);
      const qs = urlParams.toString();
      const res = await api.get(`/admin/fee-auto-calculate${qs ? '?' + qs : ''}`);
      setAutoFeeSummary(res.data || []);
      cacheData(cacheKey, res.data || []);
    } catch (error) {
      console.error('Failed to load auto fee summary:', error);
      if (!error.response) {
        const cached = await getCachedData(cacheKey);
        if (cached) setAutoFeeSummary(cached.data);
      }
    }
  };

  const loadFeeReport = async (periodOverride, semIdOverride, sessIdOverride) => {
    setFeeReportLoading(true);
    const p = periodOverride ?? feeReportPeriod;
    const semId = semIdOverride ?? feeReportSemesterId;
    const sessId = sessIdOverride ?? feeReportSessionId;
    const cacheKey = `admin-fee-report-${p}-${semId || 'none'}-${sessId || 'none'}`;
    try {
      const params = new URLSearchParams({ period: p });
      if (p === 'semester' && semId) params.set('semester_id', semId);
      if (p === 'session' && sessId) params.set('session_id', sessId);
      const res = await api.get(`/admin/fee-report?${params}`);
      setFeeReport(res.data);
      cacheData(cacheKey, res.data);
    } catch (error) {
      console.error('Failed to load fee report:', error);
      if (!error.response) {
        const cached = await getCachedData(cacheKey);
        if (cached) setFeeReport(cached.data);
      }
    }
    setFeeReportLoading(false);
  };

  // Fee payments
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (isReadOnly()) return;
    try {
      await api.post('/admin/fee-payments', {
        student_id: showPaymentModal.student_id,
        amount_paid: parseFloat(newPayment.amount_paid),
        payment_date: newPayment.payment_date,
        payment_method: newPayment.payment_method,
        reference_note: newPayment.reference_note,
        payment_label: newPayment.payment_label
      });
      toast.success('Payment recorded');
      setShowPaymentModal(null);
      setNewPayment({ amount_paid: '', payment_date: '', payment_method: 'cash', reference_note: '', payment_label: '' });
      loadFeeSummary();
      loadFeePayments();
      if (madrasahProfile?.fee_tracking_mode === 'auto') loadAutoFeeSummary();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to record payment');
    }
  };

  const handleVoidPayment = (id) => {
    setConfirmModal({ title: 'Void Payment', message: 'Void this payment? This cannot be undone.', danger: true, confirmLabel: 'Void', onConfirm: async () => {
      try {
        await api.delete(`/admin/fee-payments/${id}`);
        toast.success('Payment voided');
        loadFeeSummary();
        loadFeePayments();
        if (madrasahProfile?.fee_tracking_mode === 'auto') loadAutoFeeSummary();
      }
      catch (error) { toast.error('Failed to void payment'); }
    }});
  };

  const handleBulkSetFee = async () => {
    if (isReadOnly()) return;
    if (selectedStudentsForFee.length === 0) { toast.error('Select at least one student'); return; }
    if (!bulkFeeAmount || parseFloat(bulkFeeAmount) < 0) { toast.error('Enter a valid amount'); return; }
    try {
      await api.put('/admin/students/bulk-fee', {
        student_ids: selectedStudentsForFee,
        expected_fee: parseFloat(bulkFeeAmount),
        fee_note: bulkFeeNote || null
      });
      toast.success(`Expected fee set for ${selectedStudentsForFee.length} student(s)`);
      setShowBulkFeeModal(false);
      setBulkFeeAmount('');
      setBulkFeeNote('');
      setSelectedStudentsForFee([]);
      const res = await api.get('/admin/students');
      setStudents(res.data || []);
      loadFeeSummary();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to set fees');
    }
  };

  const handleUpdateFee = async () => {
    if (isReadOnly() || !editingFee) return;
    try {
      await api.put(`/admin/students/${editingFee.student_id}/fee`, {
        expected_fee: editingFee.expected_fee ? parseFloat(editingFee.expected_fee) : null,
        fee_note: editingFee.fee_note || null
      });
      toast.success('Expected fee updated');
      setEditingFee(null);
      loadFeeSummary();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update fee');
    }
  };

  const handleClearFee = (row) => {
    if (isReadOnly()) return;
    setConfirmModal({
      title: 'Clear Expected Fee',
      message: `Remove the expected fee for ${row.student_name}? This student will no longer appear in the Fees tab.`,
      danger: true,
      confirmLabel: 'Clear Fee',
      onConfirm: async () => {
        try {
          await api.put(`/admin/students/${row.student_id}/fee`, { expected_fee: null, fee_note: null });
          toast.success('Fee cleared');
          loadFeeSummary();
        } catch (error) { toast.error('Failed to clear fee'); }
      }
    });
  };

  return (
    <>
      <div className="page-header no-print">
        <h2 className="page-title">Fees</h2>
        {madrasahProfile?.fee_tracking_mode === 'auto' ? (
          <button className="btn btn-primary" disabled={isReadOnly()} onClick={() => {
            setEditingFeeSchedule(null);
            setFeeScheduleScope('all');
            setNewFeeSchedule({ class_id: '', student_id: '', billing_cycle: 'per_semester', amount: '', description: '' });
            setShowFeeScheduleModal(true);
          }}>Add Fee Schedule</button>
        ) : (
          <button className="btn btn-primary" disabled={isReadOnly()} onClick={() => {
            setSelectedStudentsForFee([]);
            setBulkFeeAmount('');
            setBulkFeeNote('');
            setBulkFeeClassFilter('');
            setShowBulkFeeModal(true);
          }}>Set Expected Fee</button>
        )}
      </div>

      {madrasahProfile?.fee_tracking_mode === 'auto' && (
        <div className="report-tabs no-print" style={{ marginBottom: '16px' }}>
          <nav className="report-tabs-nav">
            <button className={`report-tab-btn ${feeSubTab === 'summary' ? 'active' : ''}`} onClick={() => setFeeSubTab('summary')}>Students</button>
            <button className={`report-tab-btn ${feeSubTab === 'schedules' ? 'active' : ''}`} onClick={() => setFeeSubTab('schedules')}>Fee Schedules</button>
            <button className={`report-tab-btn ${feeSubTab === 'report' ? 'active' : ''}`} onClick={() => { setFeeSubTab('report'); if (!feeReport) loadFeeReport(); }}>Report</button>
          </nav>
        </div>
      )}

      {feeLoading && <div className="loading-state"><div className="loading-spinner" /></div>}

      {!feeLoading && madrasahProfile?.fee_tracking_mode === 'auto' && feeSubTab === 'schedules' && (
        <>
          {/* Fee Schedules Management */}
          {feeSchedules.length === 0 ? (
            <div className="card">
              <div className="empty">
                <div className="empty-icon"><CurrencyDollarIcon /></div>
                <p>No fee schedules yet. Create a fee schedule to define how much each class or student should be charged.</p>
                <button className="btn btn-primary" style={{ marginTop: '12px' }} disabled={isReadOnly()} onClick={() => {
                  setEditingFeeSchedule(null);
                  setFeeScheduleScope('all');
                  setNewFeeSchedule({ class_id: '', student_id: '', billing_cycle: 'per_semester', amount: '', description: '' });
                  setShowFeeScheduleModal(true);
                }}>Create Fee Schedule</button>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-body" style={{ padding: 0 }}>
                <SortableTable
                  columns={[
                    { key: 'scope', label: 'Applies To', sortable: true, sortType: 'string',
                      sortValue: (row) => row.student_name || row.class_name || 'All Students',
                      render: (row) => row.student_name ? `Student: ${row.student_name}` : row.class_name ? `Class: ${row.class_name}` : 'All Students (Default)' },
                    { key: 'billing_cycle', label: 'Billing Cycle', sortable: true, sortType: 'string',
                      render: (row) => ({ weekly: 'Weekly', monthly: 'Monthly', per_semester: 'Per Semester', per_session: 'Per Session' }[row.billing_cycle] || row.billing_cycle) },
                    { key: 'amount', label: 'Amount', sortable: true, sortType: 'number',
                      render: (row) => formatCurrency(row.amount) },
                    { key: 'description', label: 'Description', sortable: false,
                      render: (row) => row.description || '—' },
                    { key: 'is_active', label: 'Status', sortable: true, sortType: 'string',
                      render: (row) => <span className={`badge ${row.is_active ? 'badge-success' : 'badge-warning'}`}>{row.is_active ? 'Active' : 'Inactive'}</span> },
                    { key: 'actions', label: '', sortable: false,
                      render: (row) => (
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <button className="btn btn-sm btn-secondary" disabled={isReadOnly()} onClick={() => {
                            setEditingFeeSchedule(row);
                            setFeeScheduleScope(row.student_id ? 'student' : row.class_id ? 'class' : 'all');
                            setNewFeeSchedule({ class_id: row.class_id || '', student_id: row.student_id || '', billing_cycle: row.billing_cycle, amount: String(row.amount), description: row.description || '' });
                            setShowFeeScheduleModal(true);
                          }}>Edit</button>
                          <button className="btn btn-sm btn-secondary btn-danger" disabled={isReadOnly()} onClick={() => {
                            setConfirmModal({ title: 'Delete Fee Schedule', message: 'Are you sure you want to delete this fee schedule?', danger: true, confirmLabel: 'Delete', onConfirm: async () => {
                              try { await api.delete(`/admin/fee-schedules/${row.id}`); loadFeeSchedules(); loadAutoFeeSummary(); toast.success('Fee schedule deleted'); }
                              catch { toast.error('Failed to delete fee schedule'); }
                            }});
                          }}>Delete</button>
                        </div>
                      )}
                  ]}
                  data={feeSchedules}
                  pagination
                  pageSize={25}
                  emptyMessage="No fee schedules"
                />
              </div>
            </div>
          )}
        </>
      )}

      {!feeLoading && madrasahProfile?.fee_tracking_mode === 'auto' && feeSubTab === 'summary' && (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
            <select className="form-select" style={{ maxWidth: '260px' }} value={feeSemesterFilter}
              onChange={(e) => setFeeSemesterFilter(e.target.value)}>
              <option value="">All Time</option>
              {semesters.map(s => <option key={s.id} value={s.id}>{s.name}{s.session_name ? ` (${s.session_name})` : ''}{s.is_active ? ' ✓' : ''}</option>)}
            </select>
            <select className="form-select" style={{ maxWidth: '220px' }} value={feeClassFilter}
              onChange={(e) => setFeeClassFilter(e.target.value)}>
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Auto Summary cards */}
          {autoFeeSummary.length > 0 && (
            <div className="fee-summary-cards">
              <div className="fee-summary-card">
                <div className="fee-summary-value">{formatCurrency(autoFeeSummary.reduce((s, r) => s + r.total_fee, 0))}</div>
                <div className="fee-summary-label">Total Expected</div>
              </div>
              <div className="fee-summary-card">
                <div className="fee-summary-value">{formatCurrency(autoFeeSummary.reduce((s, r) => s + r.total_paid, 0))}</div>
                <div className="fee-summary-label">Collected</div>
              </div>
              <div className="fee-summary-card">
                <div className="fee-summary-value">{formatCurrency(autoFeeSummary.reduce((s, r) => s + Math.max(r.balance, 0), 0))}</div>
                <div className="fee-summary-label">Outstanding</div>
              </div>
            </div>
          )}

          {autoFeeSummary.length === 0 ? (
            <div className="card">
              <div className="empty">
                <div className="empty-icon"><CurrencyDollarIcon /></div>
                <p>No auto-calculated fees yet. Create a fee schedule and assign students to classes to see calculated fees.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="card fee-table-desktop">
                <SortableTable
                  columns={[
                    { key: 'student_name', label: 'Student', sortable: true, sortType: 'string' },
                    { key: 'class_name', label: 'Class', sortable: true, sortType: 'string' },
                    { key: 'total_fee', label: 'Expected', sortable: true, sortType: 'number',
                      render: (row) => formatCurrency(row.total_fee) },
                    { key: 'total_paid', label: 'Paid', sortable: true, sortType: 'number',
                      render: (row) => formatCurrency(row.total_paid) },
                    { key: 'balance', label: 'Balance', sortable: true, sortType: 'number',
                      render: (row) => formatCurrency(row.balance) },
                    { key: 'status', label: 'Progress', sortable: true, sortType: 'number',
                      sortValue: (row) => row.total_fee > 0 ? row.total_paid / row.total_fee : 0,
                      render: (row) => <FeeProgressBar paid={row.total_paid} total={row.total_fee} /> },
                    { key: 'actions', label: '', sortable: false,
                      render: (row) => (
                        <button className="btn btn-sm btn-primary" disabled={isReadOnly()} onClick={() => {
                          setShowPaymentModal(row);
                          setNewPayment({ amount_paid: '', payment_date: new Date().toISOString().split('T')[0], payment_method: 'cash', reference_note: '', payment_label: '', _labelCategory: '' });
                        }}>Record</button>
                      )}
                  ]}
                  data={autoFeeSummary}
                  searchable
                  searchPlaceholder="Search students..."
                  searchKeys={['student_name', 'class_name']}
                  pagination
                  pageSize={25}
                  emptyMessage="No fee records"
                />
              </div>
              <div className="fee-mobile-cards">
                {autoFeeSummary.map((row, idx) => (
                  <div key={idx} className="admin-mobile-card">
                    <div className="admin-mobile-card-top">
                      <div>
                        <div className="admin-mobile-card-title">{row.student_name}</div>
                        <div className="admin-mobile-card-sub">{row.class_name}{row.fee_note ? ` · ${row.fee_note}` : ''}</div>
                      </div>
                    </div>
                    <FeeProgressBar paid={row.total_paid} total={row.total_fee} />
                    <div className="fee-mobile-card-amounts">
                      <div className="fee-mobile-card-amount">
                        <span className="fee-mobile-card-amount-label">Expected</span>
                        <span>{formatCurrency(row.total_fee)}</span>
                      </div>
                      <div className="fee-mobile-card-amount">
                        <span className="fee-mobile-card-amount-label">Paid</span>
                        <span>{formatCurrency(row.total_paid)}</span>
                      </div>
                      <div className="fee-mobile-card-amount">
                        <span className="fee-mobile-card-amount-label">Balance</span>
                        <span style={{ fontWeight: 600 }}>{formatCurrency(row.balance)}</span>
                      </div>
                    </div>
                    <div className="admin-mobile-card-actions">
                      <button className="btn btn-sm btn-primary" disabled={isReadOnly()} onClick={() => {
                        setShowPaymentModal(row);
                        setNewPayment({ amount_paid: '', payment_date: new Date().toISOString().split('T')[0], payment_method: 'cash', reference_note: '', payment_label: '', _labelCategory: '' });
                      }}>Record Payment</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Payment History (shared) */}
          {feePayments.length > 0 && (
            <div className="card" style={{ marginTop: '20px' }}>
              <div className="card-header">Recent Payments</div>
              <div className="card-body" style={{ padding: 0 }}>
                <SortableTable
                  columns={[
                    { key: 'student_name', label: 'Student', sortable: true, sortType: 'string' },
                    { key: 'amount_paid', label: 'Amount', sortable: true, sortType: 'number',
                      render: (row) => formatCurrency(row.amount_paid) },
                    { key: 'payment_date', label: 'Date', sortable: true, sortType: 'string',
                      render: (row) => new Date(row.payment_date).toLocaleDateString() },
                    { key: 'payment_method', label: 'Method', sortable: true, sortType: 'string',
                      render: (row) => ({ cash: 'Cash', bank_transfer: 'Bank Transfer', online: 'Online', other: 'Other' }[row.payment_method] || row.payment_method) },
                    { key: 'actions', label: '', sortable: false,
                      render: (row) => (
                        <button className="btn btn-sm btn-secondary btn-danger" disabled={isReadOnly()} onClick={() => handleVoidPayment(row.id)}>Void</button>
                      )}
                  ]}
                  data={feePayments}
                  pagination
                  pageSize={10}
                  emptyMessage="No payments recorded"
                />
              </div>
            </div>
          )}
        </>
      )}

      {!feeLoading && (!madrasahProfile?.fee_tracking_mode || madrasahProfile?.fee_tracking_mode === 'manual') && (
        <>
          <div className="report-tabs no-print" style={{ marginBottom: '16px' }}>
            <nav className="report-tabs-nav">
              <button className={`report-tab-btn ${feeSubTab === 'summary' ? 'active' : ''}`} onClick={() => setFeeSubTab('summary')}>Students</button>
              <button className={`report-tab-btn ${feeSubTab === 'report' ? 'active' : ''}`} onClick={() => { setFeeSubTab('report'); if (!feeReport) loadFeeReport(); }}>Report</button>
            </nav>
          </div>

          {feeSubTab === 'summary' && (
          <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
            <select className="form-select" style={{ maxWidth: '260px' }} value={feeSemesterFilter}
              onChange={(e) => setFeeSemesterFilter(e.target.value)}>
              <option value="">All Time</option>
              {semesters.map(s => <option key={s.id} value={s.id}>{s.name}{s.session_name ? ` (${s.session_name})` : ''}{s.is_active ? ' ✓' : ''}</option>)}
            </select>
            <select className="form-select" style={{ maxWidth: '220px' }} value={feeClassFilter}
              onChange={(e) => setFeeClassFilter(e.target.value)}>
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Summary cards */}
          {feeSummary.length > 0 && (
            <div className="fee-summary-cards">
              <div className="fee-summary-card">
                <div className="fee-summary-value">{formatCurrency(feeSummary.reduce((s, r) => s + r.total_fee, 0))}</div>
                <div className="fee-summary-label">Total Expected</div>
              </div>
              <div className="fee-summary-card">
                <div className="fee-summary-value">{formatCurrency(feeSummary.reduce((s, r) => s + r.total_paid, 0))}</div>
                <div className="fee-summary-label">Collected</div>
              </div>
              <div className="fee-summary-card">
                <div className="fee-summary-value">{formatCurrency(feeSummary.reduce((s, r) => s + Math.max(r.balance, 0), 0))}</div>
                <div className="fee-summary-label">Outstanding</div>
              </div>
            </div>
          )}

          {feeSummary.length === 0 ? (
            <div className="card">
              <div className="empty">
                <div className="empty-icon"><CurrencyDollarIcon /></div>
                <p>No fee data yet. Set an expected fee on students (via the student form or the "Set Expected Fee" button above) to start tracking.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="card fee-table-desktop">
                <SortableTable
                  columns={[
                    { key: 'student_name', label: 'Student', sortable: true, sortType: 'string' },
                    { key: 'class_name', label: 'Class', sortable: true, sortType: 'string' },
                    { key: 'total_fee', label: 'Expected', sortable: true, sortType: 'number',
                      render: (row) => row.fee_note ? <span title={row.fee_note}>{formatCurrency(row.total_fee)} *</span> : formatCurrency(row.total_fee) },
                    { key: 'total_paid', label: 'Paid', sortable: true, sortType: 'number',
                      render: (row) => formatCurrency(row.total_paid) },
                    { key: 'balance', label: 'Balance', sortable: true, sortType: 'number',
                      render: (row) => formatCurrency(row.balance) },
                    { key: 'status', label: 'Progress', sortable: true, sortType: 'number',
                      sortValue: (row) => row.total_fee > 0 ? row.total_paid / row.total_fee : 0,
                      render: (row) => <FeeProgressBar paid={row.total_paid} total={row.total_fee} /> },
                    { key: 'actions', label: '', sortable: false,
                      render: (row) => (
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <button className="btn btn-sm btn-primary" disabled={isReadOnly()} onClick={() => {
                            setShowPaymentModal(row);
                            setNewPayment({ amount_paid: '', payment_date: new Date().toISOString().split('T')[0], payment_method: 'cash', reference_note: '', payment_label: '', _labelCategory: '' });
                          }}>Record</button>
                          <button className="btn btn-sm btn-secondary" disabled={isReadOnly()} onClick={() => setEditingFee({ student_id: row.student_id, expected_fee: row.total_fee, fee_note: row.fee_note || '', student_name: row.student_name })} title="Edit fee">Edit</button>
                          <button className="btn btn-sm btn-secondary btn-danger" disabled={isReadOnly()} onClick={() => handleClearFee(row)} title="Clear fee">×</button>
                        </div>
                      )}
                  ]}
                  data={feeSummary}
                  searchable
                  searchPlaceholder="Search students..."
                  searchKeys={['student_name', 'class_name']}
                  pagination
                  pageSize={25}
                  emptyMessage="No fee records"
                />
              </div>
              <div className="fee-mobile-cards">
                {feeSummary.map((row, idx) => (
                  <div key={idx} className="admin-mobile-card">
                    <div className="admin-mobile-card-top">
                      <div>
                        <div className="admin-mobile-card-title">{row.student_name}</div>
                        <div className="admin-mobile-card-sub">{row.class_name}{row.fee_note ? ` · ${row.fee_note}` : ''}</div>
                      </div>
                    </div>
                    <FeeProgressBar paid={row.total_paid} total={row.total_fee} />
                    <div className="fee-mobile-card-amounts">
                      <div className="fee-mobile-card-amount">
                        <span className="fee-mobile-card-amount-label">Expected</span>
                        <span>{formatCurrency(row.total_fee)}</span>
                      </div>
                      <div className="fee-mobile-card-amount">
                        <span className="fee-mobile-card-amount-label">Paid</span>
                        <span>{formatCurrency(row.total_paid)}</span>
                      </div>
                      <div className="fee-mobile-card-amount">
                        <span className="fee-mobile-card-amount-label">Balance</span>
                        <span style={{ fontWeight: 600 }}>{formatCurrency(row.balance)}</span>
                      </div>
                    </div>
                    <div className="admin-mobile-card-actions">
                      <button className="btn btn-sm btn-primary" disabled={isReadOnly()} onClick={() => {
                        setShowPaymentModal(row);
                        setNewPayment({ amount_paid: '', payment_date: new Date().toISOString().split('T')[0], payment_method: 'cash', reference_note: '', payment_label: '', _labelCategory: '' });
                      }}>Record Payment</button>
                      <button className="btn btn-sm btn-secondary" disabled={isReadOnly()} onClick={() => setEditingFee({ student_id: row.student_id, expected_fee: row.total_fee, fee_note: row.fee_note || '', student_name: row.student_name })}>Edit Fee</button>
                      <button className="btn btn-sm btn-secondary btn-danger" disabled={isReadOnly()} onClick={() => handleClearFee(row)}>Clear</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Payment History */}
          {feePayments.length > 0 && (
            <>
              <div className="card fee-table-desktop" style={{ marginTop: '20px' }}>
                <div className="card-header">Recent Payments</div>
                <div className="card-body" style={{ padding: 0 }}>
                  <SortableTable
                    columns={[
                      { key: 'student_name', label: 'Student', sortable: true, sortType: 'string' },
                      { key: 'amount_paid', label: 'Amount', sortable: true, sortType: 'number',
                        render: (row) => formatCurrency(row.amount_paid) },
                      { key: 'payment_label', label: 'For', sortable: false,
                        render: (row) => row.payment_label || row.period_label || '—' },
                      { key: 'payment_date', label: 'Date', sortable: true, sortType: 'string',
                        render: (row) => new Date(row.payment_date).toLocaleDateString() },
                      { key: 'payment_method', label: 'Method', sortable: true, sortType: 'string',
                        render: (row) => ({ cash: 'Cash', bank_transfer: 'Bank Transfer', online: 'Online', other: 'Other' }[row.payment_method] || row.payment_method) },
                      { key: 'actions', label: '', sortable: false,
                        render: (row) => (
                          <button className="btn btn-sm btn-secondary btn-danger" disabled={isReadOnly()} onClick={() => handleVoidPayment(row.id)}>Void</button>
                        )}
                    ]}
                    data={feePayments}
                    pagination
                    pageSize={10}
                    emptyMessage="No payments recorded"
                  />
                </div>
              </div>
              <div className="fee-mobile-cards" style={{ marginTop: '20px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#0a0a0a' }}>Recent Payments</div>
                {feePayments.map(row => (
                  <div key={row.id} className="admin-mobile-card">
                    <div className="admin-mobile-card-top">
                      <div>
                        <div className="admin-mobile-card-title">{row.student_name}</div>
                        <div className="admin-mobile-card-sub">{row.payment_label || row.period_label || ''} &middot; {({ cash: 'Cash', bank_transfer: 'Bank Transfer', online: 'Online', other: 'Other' }[row.payment_method] || row.payment_method)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, fontSize: '15px' }}>{formatCurrency(row.amount_paid)}</div>
                        <div className="admin-mobile-card-sub">{new Date(row.payment_date).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="admin-mobile-card-actions">
                      <button className="btn btn-sm btn-secondary btn-danger" disabled={isReadOnly()} onClick={() => handleVoidPayment(row.id)}>Void</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          </>
          )}
        </>
      )}

      {/* Fee Report Sub-tab (shared by auto and manual modes) */}
      {!feeLoading && feeSubTab === 'report' && (
        <>
          {/* Period selector */}
          <div className="fee-report-filters no-print">
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select className="form-select" style={{ maxWidth: '180px' }} value={feeReportPeriod}
                onChange={(e) => {
                  setFeeReportPeriod(e.target.value);
                  setFeeReport(null);
                  loadFeeReport(e.target.value, feeReportSemesterId, feeReportSessionId);
                }}>
                <option value="semester">Semester</option>
                <option value="session">Session</option>
                <option value="all">All Time</option>
              </select>
              {feeReportPeriod === 'semester' && (
                <select className="form-select" style={{ maxWidth: '260px' }} value={feeReportSemesterId}
                  onChange={(e) => {
                    setFeeReportSemesterId(e.target.value);
                    setFeeReport(null);
                    loadFeeReport('semester', e.target.value, feeReportSessionId);
                  }}>
                  <option value="">Active Semester</option>
                  {semesters.map(s => <option key={s.id} value={s.id}>{s.name} ({s.session_name})</option>)}
                </select>
              )}
              {feeReportPeriod === 'session' && (
                <select className="form-select" style={{ maxWidth: '220px' }} value={feeReportSessionId}
                  onChange={(e) => {
                    setFeeReportSessionId(e.target.value);
                    setFeeReport(null);
                    loadFeeReport('session', feeReportSemesterId, e.target.value);
                  }}>
                  <option value="">Active Session</option>
                  {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
            </div>
          </div>

          {feeReportLoading && <div className="loading-state"><div className="loading-spinner" /></div>}
          {!feeReportLoading && feeReport && (
            <div className="fee-report">
              <div className="fee-report-header no-print">
                <button className="btn btn-secondary" onClick={() => loadFeeReport()}>Refresh</button>
                <button className="btn btn-primary" onClick={() => window.print()}>Print Report</button>
              </div>

              {/* Report title for print */}
              <div className="fee-report-print-title">
                <h2>{feeReport.madrasahName || madrasahProfile?.name || 'Madrasah'}</h2>
                <p>Fee Collection Report &mdash; {feeReport.period?.name || 'All Time'}</p>
                {feeReport.period?.startDate && (
                  <p style={{ fontSize: '11px', color: '#888', margin: '2px 0 0' }}>
                    {new Date(feeReport.period.startDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} &ndash; {new Date(feeReport.period.endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                )}
              </div>

              {/* Period badge */}
              <div className="fee-report-period no-print">
                <span style={{ fontWeight: 600 }}>{feeReport.period?.name || 'All Time'}</span>
                {feeReport.period?.startDate && (
                  <span style={{ color: 'var(--muted)', marginLeft: '8px' }}>
                    {new Date(feeReport.period.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} &ndash; {new Date(feeReport.period.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
              </div>

              {/* Overview cards */}
              <div className="fee-report-cards">
                <div className="fee-report-card">
                  <div className="fee-report-card-value">{feeReport.overview.collectionRate}%</div>
                  <div className="fee-report-card-label">Collection Rate</div>
                  <div className="fee-report-card-bar">
                    <div className="fee-report-card-bar-fill" style={{
                      width: `${Math.min(feeReport.overview.collectionRate, 100)}%`,
                      backgroundColor: feeReport.overview.collectionRate >= 80 ? '#16a34a' : feeReport.overview.collectionRate >= 50 ? '#ca8a04' : '#dc2626'
                    }} />
                  </div>
                </div>
                <div className="fee-report-card">
                  <div className="fee-report-card-value">{formatCurrency(feeReport.overview.totalExpected)}</div>
                  <div className="fee-report-card-label">Total Expected</div>
                </div>
                <div className="fee-report-card">
                  <div className="fee-report-card-value" style={{ color: '#16a34a' }}>{formatCurrency(feeReport.overview.totalCollected)}</div>
                  <div className="fee-report-card-label">Collected</div>
                </div>
                <div className="fee-report-card">
                  <div className="fee-report-card-value" style={{ color: '#dc2626' }}>{formatCurrency(feeReport.overview.totalOutstanding)}</div>
                  <div className="fee-report-card-label">Outstanding</div>
                </div>
              </div>

              {/* Student status breakdown */}
              <div className="fee-report-section">
                <h3 className="fee-report-section-title">Student Payment Status</h3>
                <div className="fee-report-status-row">
                  <div className="fee-report-status-item">
                    <span className="fee-report-status-dot" style={{ backgroundColor: '#16a34a' }} />
                    <span className="fee-report-status-label">Paid</span>
                    <span className="fee-report-status-count">{feeReport.statusCounts.paid}</span>
                  </div>
                  <div className="fee-report-status-item">
                    <span className="fee-report-status-dot" style={{ backgroundColor: '#ca8a04' }} />
                    <span className="fee-report-status-label">Partial</span>
                    <span className="fee-report-status-count">{feeReport.statusCounts.partial}</span>
                  </div>
                  <div className="fee-report-status-item">
                    <span className="fee-report-status-dot" style={{ backgroundColor: '#dc2626' }} />
                    <span className="fee-report-status-label">Unpaid</span>
                    <span className="fee-report-status-count">{feeReport.statusCounts.unpaid}</span>
                  </div>
                  <div className="fee-report-status-item">
                    <span className="fee-report-status-dot" style={{ backgroundColor: '#6b7280' }} />
                    <span className="fee-report-status-label">Total Students</span>
                    <span className="fee-report-status-count">{feeReport.statusCounts.total}</span>
                  </div>
                </div>
                {/* Visual bar */}
                {feeReport.statusCounts.total > 0 && (
                  <div className="fee-report-status-bar">
                    {feeReport.statusCounts.paid > 0 && (
                      <div className="fee-report-status-bar-seg" style={{ width: `${(feeReport.statusCounts.paid / feeReport.statusCounts.total) * 100}%`, backgroundColor: '#16a34a' }}
                        title={`Paid: ${feeReport.statusCounts.paid}`} />
                    )}
                    {feeReport.statusCounts.partial > 0 && (
                      <div className="fee-report-status-bar-seg" style={{ width: `${(feeReport.statusCounts.partial / feeReport.statusCounts.total) * 100}%`, backgroundColor: '#ca8a04' }}
                        title={`Partial: ${feeReport.statusCounts.partial}`} />
                    )}
                    {feeReport.statusCounts.unpaid > 0 && (
                      <div className="fee-report-status-bar-seg" style={{ width: `${(feeReport.statusCounts.unpaid / feeReport.statusCounts.total) * 100}%`, backgroundColor: '#dc2626' }}
                        title={`Unpaid: ${feeReport.statusCounts.unpaid}`} />
                    )}
                  </div>
                )}
              </div>

              {/* Class breakdown table */}
              {feeReport.classBreakdown.length > 0 && (
                <div className="fee-report-section">
                  <h3 className="fee-report-section-title">Collection by Class</h3>
                  <div className="table-responsive">
                  <table className="fee-report-table">
                    <thead>
                      <tr>
                        <th>Class</th>
                        <th style={{ textAlign: 'right' }}>Students</th>
                        <th style={{ textAlign: 'right' }}>Expected</th>
                        <th style={{ textAlign: 'right' }}>Collected</th>
                        <th style={{ textAlign: 'right' }}>Outstanding</th>
                        <th style={{ textAlign: 'right' }}>Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feeReport.classBreakdown.map((c, i) => (
                        <tr key={i}>
                          <td data-label="">{c.class_name}</td>
                          <td data-label="Students" style={{ textAlign: 'right' }}>{c.student_count}</td>
                          <td data-label="Expected" style={{ textAlign: 'right' }}>{formatCurrency(c.total_expected)}</td>
                          <td data-label="Collected" style={{ textAlign: 'right' }}>{formatCurrency(c.total_collected)}</td>
                          <td data-label="Outstanding" style={{ textAlign: 'right', color: c.outstanding > 0 ? '#dc2626' : undefined }}>{formatCurrency(c.outstanding)}</td>
                          <td data-label="Rate" style={{ textAlign: 'right' }}>
                            <span style={{
                              fontWeight: 600,
                              color: c.collection_rate >= 80 ? '#16a34a' : c.collection_rate >= 50 ? '#ca8a04' : '#dc2626'
                            }}>{c.collection_rate}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ fontWeight: 600 }}>
                        <td data-label="">Total</td>
                        <td data-label="Students" style={{ textAlign: 'right' }}>{feeReport.statusCounts.total}</td>
                        <td data-label="Expected" style={{ textAlign: 'right' }}>{formatCurrency(feeReport.overview.totalExpected)}</td>
                        <td data-label="Collected" style={{ textAlign: 'right' }}>{formatCurrency(feeReport.overview.totalCollected)}</td>
                        <td data-label="Outstanding" style={{ textAlign: 'right', color: feeReport.overview.totalOutstanding > 0 ? '#dc2626' : undefined }}>{formatCurrency(feeReport.overview.totalOutstanding)}</td>
                        <td data-label="Rate" style={{ textAlign: 'right' }}>
                          <span style={{
                            color: feeReport.overview.collectionRate >= 80 ? '#16a34a' : feeReport.overview.collectionRate >= 50 ? '#ca8a04' : '#dc2626'
                          }}>{feeReport.overview.collectionRate}%</span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                  </div>
                </div>
              )}

              {/* Monthly collection trend */}
              {feeReport.monthlyTrend.length > 0 && (
                <div className="fee-report-section">
                  <h3 className="fee-report-section-title">Monthly Collections (Last 6 Months)</h3>
                  <div className="fee-report-trend">
                    {(() => {
                      const maxVal = Math.max(...feeReport.monthlyTrend.map(m => m.total));
                      return feeReport.monthlyTrend.map((m, i) => {
                        const pct = maxVal > 0 ? (m.total / maxVal) * 100 : 0;
                        const [year, month] = m.month.split('-');
                        const label = new Date(year, parseInt(month) - 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
                        return (
                          <div key={i} className="fee-report-trend-item">
                            <div className="fee-report-trend-bar-wrap">
                              <div className="fee-report-trend-bar" style={{ height: `${Math.max(pct, 4)}%` }} />
                            </div>
                            <div className="fee-report-trend-amount">{formatCurrency(m.total)}</div>
                            <div className="fee-report-trend-label">{label}</div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              <div className="fee-report-footer">
                <span>{feeReport.period?.name || 'All Time'} &middot; {feeReport.mode === 'auto' ? 'Auto' : 'Manual'} tracking</span>
                <span>Generated: {new Date(feeReport.generatedAt).toLocaleString()}</span>
              </div>
            </div>
          )}

          {!feeReportLoading && !feeReport && (
            <div className="card">
              <div className="empty">
                <p>Loading report data...</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit Fee Modal */}
      {editingFee && (
        <div className="modal-overlay" onClick={() => setEditingFee(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Expected Fee</h3>
              <button onClick={() => setEditingFee(null)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--lighter)', borderRadius: 'var(--radius)' }}>
                <strong>{editingFee.student_name}</strong>
              </div>
              <div className="form-group">
                <label className="form-label">Expected Fee</label>
                <input type="number" className="form-input" step="0.01" min="0" placeholder="0.00"
                  value={editingFee.expected_fee}
                  onChange={(e) => setEditingFee({ ...editingFee, expected_fee: e.target.value })}
                  autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Note (optional)</label>
                <input type="text" className="form-input" placeholder="e.g. Scholarship 50%"
                  value={editingFee.fee_note}
                  onChange={(e) => setEditingFee({ ...editingFee, fee_note: e.target.value })} />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setEditingFee(null)} className="btn btn-secondary">Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleUpdateFee}
                  disabled={!editingFee.expected_fee || parseFloat(editingFee.expected_fee) < 0}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Fee Modal */}
      {showBulkFeeModal && (
        <div className="modal-overlay" onClick={() => setShowBulkFeeModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Set Expected Fee</h3>
              <button onClick={() => setShowBulkFeeModal(false)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '14px', color: 'var(--gray)', marginBottom: '16px' }}>
                Select students and set their expected fee amount.
              </p>
              <div className="form-group">
                <label className="form-label">Select Students</label>
                <select className="form-select" style={{ marginBottom: '8px' }} value={bulkFeeClassFilter}
                  onChange={(e) => setBulkFeeClassFilter(e.target.value)}>
                  <option value="">All Classes</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {(() => {
                  const filtered = bulkFeeClassFilter ? students.filter(s => String(s.class_id) === bulkFeeClassFilter) : students;
                  const filteredIds = filtered.map(s => s.id);
                  return (
                    <>
                      <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                          <thead>
                            <tr style={{ position: 'sticky', top: 0, background: 'var(--lighter, #f9fafb)', borderBottom: '1px solid var(--border)' }}>
                              <th style={{ width: '36px', padding: '8px', textAlign: 'center' }}>
                                <input type="checkbox"
                                  checked={filtered.length > 0 && filtered.every(s => selectedStudentsForFee.includes(s.id))}
                                  onChange={(e) => setSelectedStudentsForFee(prev =>
                                    e.target.checked ? [...new Set([...prev, ...filteredIds])] : prev.filter(id => !filteredIds.includes(id))
                                  )} />
                              </th>
                              <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Name</th>
                              {!bulkFeeClassFilter && <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: 'var(--gray)' }}>Class</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map(s => (
                              <tr key={s.id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                                onClick={() => setSelectedStudentsForFee(prev =>
                                  prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                                )}>
                                <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                  <input type="checkbox" checked={selectedStudentsForFee.includes(s.id)} readOnly />
                                </td>
                                <td style={{ padding: '6px 8px' }}>{s.first_name} {s.last_name}</td>
                                {!bulkFeeClassFilter && <td style={{ padding: '6px 8px', color: 'var(--gray)', fontSize: '13px' }}>{s.class_name || ''}</td>}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {selectedStudentsForFee.length > 0 && (
                        <div style={{ fontSize: '13px', color: 'var(--gray)', marginTop: '4px' }}>{selectedStudentsForFee.length} student{selectedStudentsForFee.length !== 1 ? 's' : ''} selected</div>
                      )}
                    </>
                  );
                })()}
              </div>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Expected Fee</label>
                  <input type="number" className="form-input" step="0.01" min="0" placeholder="0.00"
                    value={bulkFeeAmount}
                    onChange={(e) => setBulkFeeAmount(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Note (optional)</label>
                  <input type="text" className="form-input" placeholder="e.g. Semester 1 2025"
                    value={bulkFeeNote}
                    onChange={(e) => setBulkFeeNote(e.target.value)} />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowBulkFeeModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="button" className="btn btn-primary"
                  disabled={selectedStudentsForFee.length === 0 || !bulkFeeAmount}
                  onClick={handleBulkSetFee}>
                  Apply to {selectedStudentsForFee.length} Student{selectedStudentsForFee.length !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fee Schedule Modal */}
      {showFeeScheduleModal && (
        <div className="modal-overlay" onClick={() => setShowFeeScheduleModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingFeeSchedule ? 'Edit Fee Schedule' : 'Create Fee Schedule'}</h3>
              <button onClick={() => setShowFeeScheduleModal(false)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={async (e) => {
                e.preventDefault();
                try {
                  if (editingFeeSchedule) {
                    await api.put(`/admin/fee-schedules/${editingFeeSchedule.id}`, newFeeSchedule);
                    toast.success('Fee schedule updated');
                  } else {
                    await api.post('/admin/fee-schedules', newFeeSchedule);
                    toast.success('Fee schedule created');
                  }
                  setShowFeeScheduleModal(false);
                  loadFeeSchedules();
                  loadAutoFeeSummary();
                } catch (error) {
                  toast.error(error.response?.data?.error || 'Failed to save fee schedule');
                }
              }}>
                {!editingFeeSchedule && (
                  <div className="form-group">
                    <label className="form-label">Apply To</label>
                    <select className="form-select" value={feeScheduleScope}
                      onChange={(e) => {
                        setFeeScheduleScope(e.target.value);
                        setNewFeeSchedule(prev => ({ ...prev, class_id: '', student_id: '' }));
                      }}>
                      <option value="all">All Students (Default)</option>
                      <option value="class">Specific Class</option>
                      <option value="student">Specific Student</option>
                    </select>
                  </div>
                )}
                {feeScheduleScope === 'class' && (
                  <div className="form-group">
                    <label className="form-label">Class</label>
                    <select className="form-select" value={newFeeSchedule.class_id}
                      onChange={(e) => setNewFeeSchedule({ ...newFeeSchedule, class_id: e.target.value })} required>
                      <option value="">Select Class</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
                {feeScheduleScope === 'student' && (
                  <div className="form-group">
                    <label className="form-label">Student</label>
                    <select className="form-select" value={newFeeSchedule.student_id}
                      onChange={(e) => setNewFeeSchedule({ ...newFeeSchedule, student_id: e.target.value })} required>
                      <option value="">Select Student</option>
                      {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.student_id})</option>)}
                    </select>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Billing Cycle</label>
                  <select className="form-select" value={newFeeSchedule.billing_cycle}
                    onChange={(e) => setNewFeeSchedule({ ...newFeeSchedule, billing_cycle: e.target.value })}>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="per_semester">Per Semester</option>
                    <option value="per_session">Per Session</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Amount</label>
                  <input type="number" className="form-input" step="0.01" min="0" placeholder="0.00"
                    value={newFeeSchedule.amount}
                    onChange={(e) => setNewFeeSchedule({ ...newFeeSchedule, amount: e.target.value })}
                    required />
                </div>
                <div className="form-group">
                  <label className="form-label">Description (Optional)</label>
                  <input type="text" className="form-input" placeholder="e.g. Tuition fee, Books fee"
                    value={newFeeSchedule.description}
                    onChange={(e) => setNewFeeSchedule({ ...newFeeSchedule, description: e.target.value })} />
                </div>
                <div className="form-actions">
                  <button type="button" onClick={() => setShowFeeScheduleModal(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary">{editingFeeSchedule ? 'Update' : 'Create'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Record Payment</h3>
              <button onClick={() => setShowPaymentModal(null)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--lighter)', borderRadius: 'var(--radius)' }}>
                <strong>{showPaymentModal.student_name}</strong>
                <div style={{ fontSize: '13px', color: 'var(--gray)', marginTop: '4px' }}>
                  Balance: {formatCurrency(showPaymentModal.balance || 0)}
                </div>
              </div>
              <form onSubmit={handleRecordPayment}>
                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Amount</label>
                    <input type="number" className="form-input" step="0.01" min="0.01" placeholder="0.00"
                      value={newPayment.amount_paid}
                      onChange={(e) => setNewPayment({ ...newPayment, amount_paid: e.target.value })}
                      required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input type="date" className="form-input"
                      value={newPayment.payment_date}
                      onChange={(e) => setNewPayment({ ...newPayment, payment_date: e.target.value })}
                      required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Method</label>
                    <select className="form-select" value={newPayment.payment_method}
                      onChange={(e) => setNewPayment({ ...newPayment, payment_method: e.target.value })}>
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="online">Online</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Payment For</label>
                    {/* Category chips */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      {[{ key: 'monthly', label: 'Monthly' }, { key: 'weekly', label: 'Weekly' }, { key: 'instalment', label: 'Instalment' }, { key: 'other', label: 'Other' }].map(cat => (
                        <button key={cat.key} type="button"
                          style={{ padding: '6px 14px', borderRadius: '20px', border: '1px solid var(--border)', background: newPayment._labelCategory === cat.key ? 'var(--primary, #404040)' : 'var(--lighter, #f9fafb)', color: newPayment._labelCategory === cat.key ? '#fff' : 'inherit', fontSize: '13px', cursor: 'pointer', minHeight: '36px' }}
                          onClick={() => setNewPayment({ ...newPayment, _labelCategory: newPayment._labelCategory === cat.key ? '' : cat.key, payment_label: '', _customLabel: false })}>
                          {cat.label}
                        </button>
                      ))}
                    </div>
                    {/* Value chips based on category */}
                    {newPayment._labelCategory === 'monthly' && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => {
                          const full = ['January','February','March','April','May','June','July','August','September','October','November','December'][i];
                          return (
                            <button key={m} type="button"
                              style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: newPayment.payment_label === full ? 'var(--primary, #404040)' : '#fff', color: newPayment.payment_label === full ? '#fff' : 'inherit', fontSize: '13px', cursor: 'pointer', minHeight: '36px' }}
                              onClick={() => setNewPayment({ ...newPayment, payment_label: full })}>
                              {m}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {newPayment._labelCategory === 'weekly' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px' }}>Week</span>
                        <input type="number" className="form-input" min="1" max="52" placeholder="1-52"
                          style={{ width: '80px' }}
                          value={newPayment.payment_label ? newPayment.payment_label.replace('Week ', '') : ''}
                          onChange={(e) => {
                            const n = parseInt(e.target.value);
                            setNewPayment({ ...newPayment, payment_label: n && n >= 1 && n <= 52 ? `Week ${n}` : '' });
                          }} />
                      </div>
                    )}
                    {newPayment._labelCategory === 'instalment' && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {Array.from({length: 12}, (_, i) => i + 1).map(n => (
                          <button key={n} type="button"
                            style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: newPayment.payment_label === `Instalment ${n}` ? 'var(--primary, #404040)' : '#fff', color: newPayment.payment_label === `Instalment ${n}` ? '#fff' : 'inherit', fontSize: '13px', cursor: 'pointer', minWidth: '44px', minHeight: '36px', textAlign: 'center' }}
                            onClick={() => setNewPayment({ ...newPayment, payment_label: `Instalment ${n}` })}>
                            {n}
                          </button>
                        ))}
                      </div>
                    )}
                    {newPayment._labelCategory === 'other' && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {['Registration', 'Exam Fee'].map(label => (
                          <button key={label} type="button"
                            style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: newPayment.payment_label === label ? 'var(--primary, #404040)' : '#fff', color: newPayment.payment_label === label ? '#fff' : 'inherit', fontSize: '13px', cursor: 'pointer', minHeight: '36px' }}
                            onClick={() => setNewPayment({ ...newPayment, payment_label: label, _customLabel: false })}>
                            {label}
                          </button>
                        ))}
                        <button type="button"
                          style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: newPayment._customLabel ? 'var(--primary, #404040)' : '#fff', color: newPayment._customLabel ? '#fff' : 'inherit', fontSize: '13px', cursor: 'pointer', minHeight: '36px' }}
                          onClick={() => setNewPayment({ ...newPayment, _customLabel: true, payment_label: '' })}>
                          Custom
                        </button>
                      </div>
                    )}
                    {newPayment._customLabel && (
                      <input type="text" className="form-input" placeholder="e.g. Semester 1 2025" style={{ marginTop: '8px' }}
                        value={newPayment.payment_label}
                        onChange={(e) => setNewPayment({ ...newPayment, payment_label: e.target.value })}
                        autoFocus />
                    )}
                    {newPayment.payment_label && (
                      <div style={{ fontSize: '13px', color: 'var(--gray)', marginTop: '6px' }}>Selected: <strong>{newPayment.payment_label}</strong></div>
                    )}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Reference / Note</label>
                  <input type="text" className="form-input" placeholder="Receipt number, memo, etc."
                    value={newPayment.reference_note}
                    onChange={(e) => setNewPayment({ ...newPayment, reference_note: e.target.value })} />
                </div>
                <div className="form-actions">
                  <button type="button" onClick={() => setShowPaymentModal(null)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary">Record Payment</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default FeesSection;
