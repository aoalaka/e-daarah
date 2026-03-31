import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { CalendarIcon } from '@heroicons/react/24/outline';
import api from '../../../services/api';
import '../Dashboard.css';

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function CohortPlanner({ classes, isReadOnly, fmtDate, setConfirmModal }) {
  const [subTab, setSubTab] = useState('list'); // 'list' | 'detail'
  const [cohorts, setCohorts] = useState([]);
  const [selectedCohort, setSelectedCohort] = useState(null);
  const [cohortDetail, setCohortDetail] = useState(null);
  const [detailSection, setDetailSection] = useState('periods'); // 'periods' | 'classes' | 'holidays' | 'overrides'

  // Cohort form
  const [showCohortForm, setShowCohortForm] = useState(false);
  const [editingCohort, setEditingCohort] = useState(null);
  const [cohortForm, setCohortForm] = useState({ name: '', start_date: '', end_date: '', is_active: false, default_school_days: [] });

  // Period form
  const [showPeriodForm, setShowPeriodForm] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState(null);
  const [periodForm, setPeriodForm] = useState({ name: '', start_date: '', end_date: '', is_active: false });

  // Holiday form
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ name: '', date: '' });

  // Override form
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [overrideForm, setOverrideForm] = useState({ date: '', is_school_day: true, reason: '' });

  useEffect(() => { fetchCohorts(); }, []);

  const fetchCohorts = async () => {
    try {
      const res = await api.get('/admin/cohorts');
      setCohorts(res.data);
    } catch {
      toast.error('Failed to load cohorts');
    }
  };

  const fetchCohortDetail = async (id) => {
    try {
      const res = await api.get(`/admin/cohorts/${id}`);
      setCohortDetail(res.data);
    } catch {
      toast.error('Failed to load cohort details');
    }
  };

  const openCohort = (cohort) => {
    setSelectedCohort(cohort);
    fetchCohortDetail(cohort.id);
    setDetailSection('periods');
    setSubTab('detail');
    setShowPeriodForm(false);
    setShowHolidayForm(false);
    setShowOverrideForm(false);
  };

  // ── Cohort CRUD ──────────────────────────────────────────────
  const handleCohortSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly()) { toast.error('Account is in read-only mode.'); return; }
    try {
      if (editingCohort) {
        await api.put(`/admin/cohorts/${editingCohort.id}`, cohortForm);
        toast.success('Cohort updated');
      } else {
        await api.post('/admin/cohorts', cohortForm);
        toast.success('Cohort created');
      }
      setShowCohortForm(false);
      setEditingCohort(null);
      setCohortForm({ name: '', start_date: '', end_date: '', is_active: false, default_school_days: [] });
      await fetchCohorts();
      if (selectedCohort) fetchCohortDetail(selectedCohort.id);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save cohort');
    }
  };

  const startEditCohort = (cohort) => {
    const days = cohort.default_school_days
      ? (typeof cohort.default_school_days === 'string' ? JSON.parse(cohort.default_school_days) : cohort.default_school_days)
      : [];
    setEditingCohort(cohort);
    setCohortForm({ name: cohort.name, start_date: cohort.start_date.split('T')[0], end_date: cohort.end_date.split('T')[0], is_active: !!cohort.is_active, default_school_days: days });
    setShowCohortForm(true);
  };

  const handleDeleteCohort = (cohort) => {
    setConfirmModal({
      title: 'Delete Cohort',
      message: `Delete "${cohort.name}"? Classes assigned to this cohort will be unassigned. Existing attendance and exam records are kept.`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await api.delete(`/admin/cohorts/${cohort.id}`);
          toast.success('Cohort deleted');
          setCohorts(prev => prev.filter(c => c.id !== cohort.id));
          if (selectedCohort?.id === cohort.id) { setSubTab('list'); setSelectedCohort(null); setCohortDetail(null); }
        } catch { toast.error('Failed to delete cohort'); }
      }
    });
  };

  // ── Period CRUD ───────────────────────────────────────────────
  const handlePeriodSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly()) { toast.error('Account is in read-only mode.'); return; }
    try {
      if (editingPeriod) {
        await api.put(`/admin/cohort-periods/${editingPeriod.id}`, periodForm);
        toast.success('Period updated');
      } else {
        await api.post(`/admin/cohorts/${selectedCohort.id}/periods`, periodForm);
        toast.success('Period created');
      }
      setShowPeriodForm(false);
      setEditingPeriod(null);
      setPeriodForm({ name: '', start_date: '', end_date: '', is_active: false });
      fetchCohortDetail(selectedCohort.id);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save period');
    }
  };

  const startEditPeriod = (period) => {
    setEditingPeriod(period);
    setPeriodForm({ name: period.name, start_date: period.start_date.split('T')[0], end_date: period.end_date.split('T')[0], is_active: !!period.is_active });
    setShowPeriodForm(true);
  };

  const handleDeletePeriod = (period) => {
    setConfirmModal({
      title: 'Delete Period',
      message: `Delete "${period.name}"? Attendance and exam records linked to this period will also be removed.`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await api.delete(`/admin/cohort-periods/${period.id}`);
          toast.success('Period deleted');
          fetchCohortDetail(selectedCohort.id);
        } catch { toast.error('Failed to delete period'); }
      }
    });
  };

  // ── Holiday CRUD ──────────────────────────────────────────────
  const handleHolidaySubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly()) { toast.error('Account is in read-only mode.'); return; }
    try {
      await api.post(`/admin/cohorts/${selectedCohort.id}/holidays`, holidayForm);
      toast.success('Holiday added');
      setShowHolidayForm(false);
      setHolidayForm({ name: '', date: '' });
      fetchCohortDetail(selectedCohort.id);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to add holiday'); }
  };

  const handleDeleteHoliday = (holiday) => {
    setConfirmModal({
      title: 'Remove Holiday',
      message: `Remove "${holiday.name || holiday.title}" from this cohort?`,
      confirmLabel: 'Remove',
      onConfirm: async () => {
        try {
          await api.delete(`/admin/holidays/${holiday.id}`);
          toast.success('Holiday removed');
          fetchCohortDetail(selectedCohort.id);
        } catch { toast.error('Failed to remove holiday'); }
      }
    });
  };

  // ── Override CRUD ─────────────────────────────────────────────
  const handleOverrideSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly()) { toast.error('Account is in read-only mode.'); return; }
    try {
      await api.post(`/admin/cohorts/${selectedCohort.id}/schedule-overrides`, overrideForm);
      toast.success('Override added');
      setShowOverrideForm(false);
      setOverrideForm({ date: '', is_school_day: true, reason: '' });
      fetchCohortDetail(selectedCohort.id);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to add override'); }
  };

  const handleDeleteOverride = (override) => {
    setConfirmModal({
      title: 'Remove Override',
      message: `Remove the schedule override for ${fmtDate(override.date || override.start_date)}?`,
      confirmLabel: 'Remove',
      onConfirm: async () => {
        try {
          await api.delete(`/admin/schedule-overrides/${override.id}`);
          toast.success('Override removed');
          fetchCohortDetail(selectedCohort.id);
        } catch { toast.error('Failed to remove override'); }
      }
    });
  };

  // ── Class assignment ──────────────────────────────────────────
  const handleAssignClass = async (cls, assign) => {
    if (isReadOnly()) { toast.error('Account is in read-only mode.'); return; }
    try {
      await api.put(`/admin/classes/${cls.id}`, {
        name: cls.name, grade_level: cls.grade_level,
        school_days: cls.school_days, description: cls.description,
        cohort_id: assign ? selectedCohort.id : null
      });
      toast.success(assign ? `${cls.name} assigned` : `${cls.name} unassigned`);
      fetchCohortDetail(selectedCohort.id);
    } catch { toast.error('Failed to update class assignment'); }
  };

  const assignedClassIds = cohortDetail?.classes?.map(c => c.id) || [];

  // ── Day pill helper ───────────────────────────────────────────
  const DayPills = ({ value, onChange }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      {ALL_DAYS.map(day => (
        <button key={day} type="button"
          onClick={() => onChange(value.includes(day) ? value.filter(d => d !== day) : [...value, day])}
          style={{ padding: '6px 14px', borderRadius: '20px', border: `2px solid ${value.includes(day) ? '#2563eb' : '#d1d5db'}`, background: value.includes(day) ? '#2563eb' : 'transparent', color: value.includes(day) ? '#fff' : '#374151', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
          {day.substring(0, 3)}
        </button>
      ))}
    </div>
  );

  // ═══════════════════════════════════════════════════════════
  // LIST VIEW — cohorts list
  // ═══════════════════════════════════════════════════════════
  if (subTab === 'list') {
    return (
      <>
        <div className="page-header">
          <button onClick={() => { setEditingCohort(null); setCohortForm({ name: '', start_date: '', end_date: '', is_active: false, default_school_days: [] }); setShowCohortForm(!showCohortForm); }} className="btn btn-primary" disabled={isReadOnly()}>
            + New Cohort
          </button>
        </div>

        {showCohortForm && (
          <div className="card" style={{ marginBottom: 'var(--md)' }}>
            <div className="card-header">{editingCohort ? 'Edit Cohort' : 'Create New Cohort'}</div>
            <div className="card-body">
              <form onSubmit={handleCohortSubmit}>
                <div className="form-grid form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Cohort Name</label>
                    <input type="text" className="form-input" value={cohortForm.name} onChange={e => setCohortForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Beginners Cohort 2025" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input type="date" className="form-input" value={cohortForm.start_date} onChange={e => setCohortForm(p => ({ ...p, start_date: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input type="date" className="form-input" value={cohortForm.end_date} onChange={e => setCohortForm(p => ({ ...p, end_date: e.target.value }))} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">School Days</label>
                  <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>Select which days this cohort meets (can be overridden per class)</p>
                  <DayPills value={cohortForm.default_school_days} onChange={days => setCohortForm(p => ({ ...p, default_school_days: days }))} />
                </div>
                <div className="form-group">
                  <label className="form-label checkbox-label">
                    <input type="checkbox" checked={cohortForm.is_active} onChange={e => setCohortForm(p => ({ ...p, is_active: e.target.checked }))} />
                    <span>Set as active (teachers can record attendance)</span>
                  </label>
                </div>
                <div className="form-actions">
                  <button type="button" onClick={() => { setShowCohortForm(false); setEditingCohort(null); setCohortForm({ name: '', start_date: '', end_date: '', is_active: false, default_school_days: [] }); }} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary">{editingCohort ? 'Update Cohort' : 'Create Cohort'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {cohorts.length === 0 ? (
          <div className="card">
            <div className="empty">
              <div className="empty-icon"><CalendarIcon /></div>
              <p>No cohorts yet. Create one to get started.</p>
              <button className="empty-action" onClick={() => setShowCohortForm(true)}>+ Create Cohort</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {cohorts.map(cohort => {
              const days = cohort.default_school_days ? (typeof cohort.default_school_days === 'string' ? JSON.parse(cohort.default_school_days) : cohort.default_school_days) : [];
              return (
                <div key={cohort.id} className="card" style={{ padding: 'var(--md)', cursor: 'pointer' }} onClick={() => openCohort(cohort)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px' }}>{cohort.name}</h3>
                        <span className={`badge ${cohort.is_active ? 'badge-success' : 'badge-muted'}`}>{cohort.is_active ? 'Active' : 'Inactive'}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                        {fmtDate(cohort.start_date)} – {fmtDate(cohort.end_date)}
                      </div>
                      {days.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
                          {days.map(day => (
                            <span key={day} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(37,99,235,0.08)', color: '#2563eb', fontWeight: '500' }}>{day.substring(0, 3)}</span>
                          ))}
                        </div>
                      )}
                      <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px' }}>
                        {cohort.class_count || 0} class{cohort.class_count !== 1 ? 'es' : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button onClick={e => { e.stopPropagation(); startEditCohort(cohort); }} className="btn-sm btn-edit">Edit</button>
                      <button onClick={e => { e.stopPropagation(); handleDeleteCohort(cohort); }} className="btn-sm btn-delete">Delete</button>
                      <button onClick={() => openCohort(cohort)} style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '13px', color: '#2563eb', fontWeight: '500' }}>
                        View →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // DETAIL VIEW — selected cohort
  // ═══════════════════════════════════════════════════════════
  const cohortDays = cohortDetail?.default_school_days
    ? (typeof cohortDetail.default_school_days === 'string' ? JSON.parse(cohortDetail.default_school_days) : cohortDetail.default_school_days)
    : [];

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <button onClick={() => { setSubTab('list'); setSelectedCohort(null); setCohortDetail(null); }} className="btn btn-secondary" style={{ marginRight: '8px' }}>← Back</button>
        <div style={{ flex: 1 }}>
          <h2 className="page-title" style={{ margin: 0 }}>{selectedCohort?.name}</h2>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
            {fmtDate(selectedCohort?.start_date)} – {fmtDate(selectedCohort?.end_date)}
            {cohortDays.length > 0 ? ` · School days: ${cohortDays.map(d => d.substring(0, 3)).join(', ')}` : ''}
          </p>
        </div>
      </div>

      {/* Section nav tabs */}
      <div style={{ display: 'flex', gap: '0', marginBottom: 'var(--md)', borderBottom: '1px solid var(--border)' }}>
        {[
          { key: 'periods', label: 'Periods' },
          { key: 'classes', label: 'Classes' },
          { key: 'holidays', label: 'Holidays' },
          { key: 'overrides', label: 'Schedule Overrides' }
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setDetailSection(key)}
            style={{ padding: '10px 16px', background: 'none', border: 'none', borderBottom: detailSection === key ? '2px solid var(--primary)' : '2px solid transparent', cursor: 'pointer', fontWeight: detailSection === key ? '600' : '400', color: detailSection === key ? 'var(--primary)' : 'var(--muted)', fontSize: '14px' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Periods ── */}
      {detailSection === 'periods' && (
        <div className="card" style={{ marginBottom: 'var(--md)' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Periods</span>
            {!showPeriodForm && (
              <button onClick={() => { setEditingPeriod(null); setPeriodForm({ name: '', start_date: '', end_date: '', is_active: false }); setShowPeriodForm(true); }} className="btn btn-sm btn-primary" disabled={isReadOnly()}>+ Add</button>
            )}
          </div>

          {showPeriodForm && (
            <div className="card-body" style={{ borderBottom: '1px solid var(--border)' }}>
              <form onSubmit={handlePeriodSubmit}>
                <div className="form-grid form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Period Name</label>
                    <input type="text" className="form-input" value={periodForm.name} onChange={e => setPeriodForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Term 1" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input type="date" className="form-input" value={periodForm.start_date} onChange={e => setPeriodForm(p => ({ ...p, start_date: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input type="date" className="form-input" value={periodForm.end_date} onChange={e => setPeriodForm(p => ({ ...p, end_date: e.target.value }))} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label checkbox-label">
                    <input type="checkbox" checked={periodForm.is_active} onChange={e => setPeriodForm(p => ({ ...p, is_active: e.target.checked }))} />
                    <span>Set as active period</span>
                  </label>
                </div>
                <div className="form-actions">
                  <button type="button" onClick={() => { setShowPeriodForm(false); setEditingPeriod(null); }} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary">{editingPeriod ? 'Update' : 'Create'}</button>
                </div>
              </form>
            </div>
          )}

          <div className="card-body" style={{ padding: 0 }}>
            {!cohortDetail?.periods?.length ? (
              <div className="empty" style={{ padding: 'var(--md)' }}>
                <p>No periods yet for this cohort.</p>
              </div>
            ) : (
              <>
                <div className="table-wrap planner-table-desktop">
                  <table className="table">
                    <thead>
                      <tr><th>Period</th><th>Start Date</th><th>End Date</th><th>Status</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {cohortDetail.periods.map(period => (
                        <tr key={period.id}>
                          <td><strong>{period.name}</strong></td>
                          <td>{fmtDate(period.start_date)}</td>
                          <td>{fmtDate(period.end_date)}</td>
                          <td><span className={`badge ${period.is_active ? 'badge-success' : 'badge-muted'}`}>{period.is_active ? 'Active' : 'Inactive'}</span></td>
                          <td>
                            <button onClick={() => startEditPeriod(period)} className="btn-sm btn-edit">Edit</button>
                            <button onClick={() => handleDeletePeriod(period)} className="btn-sm btn-delete">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="planner-mobile-cards" style={{ display: 'none', padding: '8px 16px' }}>
                  {cohortDetail.periods.map(period => (
                    <div key={period.id} className="admin-mobile-card" style={{ marginBottom: '8px', padding: '14px', border: '1px solid var(--light)', borderRadius: 'var(--radius)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <strong style={{ fontSize: '15px' }}>{period.name}</strong>
                        <span className={`badge ${period.is_active ? 'badge-success' : 'badge-muted'}`}>{period.is_active ? 'Active' : 'Inactive'}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '8px' }}>{fmtDate(period.start_date)} – {fmtDate(period.end_date)}</div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => startEditPeriod(period)} className="btn-sm btn-edit">Edit</button>
                        <button onClick={() => handleDeletePeriod(period)} className="btn-sm btn-delete">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Classes ── */}
      {detailSection === 'classes' && (
        <div className="card" style={{ marginBottom: 'var(--md)' }}>
          <div className="card-header">Assign Classes to This Cohort</div>
          <div className="card-body">
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>
              Classes assigned here will use this cohort's schedule when teachers record attendance or exams.
            </p>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {!classes?.filter(c => !c.deleted_at).length ? (
              <div className="empty" style={{ padding: 'var(--md)' }}><p>No classes found. Create classes first.</p></div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Class</th><th>Grade</th><th>Assigned</th><th>Actions</th></tr></thead>
                  <tbody>
                    {classes.filter(c => !c.deleted_at).map(cls => {
                      const isAssigned = assignedClassIds.includes(cls.id);
                      return (
                        <tr key={cls.id}>
                          <td><strong>{cls.name}</strong></td>
                          <td style={{ color: 'var(--muted)', fontSize: '13px' }}>{cls.grade_level || '—'}</td>
                          <td><span className={`badge ${isAssigned ? 'badge-success' : 'badge-muted'}`}>{isAssigned ? 'Yes' : 'No'}</span></td>
                          <td>
                            <button className={isAssigned ? 'btn-sm btn-delete' : 'btn-sm btn-edit'} onClick={() => handleAssignClass(cls, !isAssigned)}>
                              {isAssigned ? 'Unassign' : 'Assign'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Holidays ── */}
      {detailSection === 'holidays' && (
        <div className="card" style={{ marginBottom: 'var(--md)' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Holidays</span>
            {!showHolidayForm && (
              <button onClick={() => { setHolidayForm({ name: '', date: '' }); setShowHolidayForm(true); }} className="btn btn-sm btn-primary" disabled={isReadOnly()}>+ Add</button>
            )}
          </div>

          {showHolidayForm && (
            <div className="card-body" style={{ borderBottom: '1px solid var(--border)' }}>
              <form onSubmit={handleHolidaySubmit}>
                <div className="form-grid form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Holiday Name</label>
                    <input type="text" className="form-input" value={holidayForm.name} onChange={e => setHolidayForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Eid Al-Fitr" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input type="date" className="form-input" value={holidayForm.date} onChange={e => setHolidayForm(p => ({ ...p, date: e.target.value }))} required />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" onClick={() => setShowHolidayForm(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary">Add Holiday</button>
                </div>
              </form>
            </div>
          )}

          <div className="card-body" style={{ padding: 0 }}>
            {!cohortDetail?.holidays?.length ? (
              <div className="empty" style={{ padding: 'var(--md)' }}><p>No holidays for this cohort.</p></div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Holiday</th><th>Date</th><th>Actions</th></tr></thead>
                  <tbody>
                    {cohortDetail.holidays.map(h => (
                      <tr key={h.id}>
                        <td><strong>{h.name || h.title}</strong></td>
                        <td>{fmtDate(h.date || h.start_date)}</td>
                        <td><button onClick={() => handleDeleteHoliday(h)} className="btn-sm btn-delete">Remove</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Schedule Overrides ── */}
      {detailSection === 'overrides' && (
        <div className="card" style={{ marginBottom: 'var(--md)' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Schedule Overrides</span>
            {!showOverrideForm && (
              <button onClick={() => { setOverrideForm({ date: '', is_school_day: true, reason: '' }); setShowOverrideForm(true); }} className="btn btn-sm btn-primary" disabled={isReadOnly()}>+ Add</button>
            )}
          </div>

          {!showOverrideForm && (
            <div className="card-body" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>Override specific dates — mark a normally-off day as a school day, or cancel a normally-on day.</p>
            </div>
          )}

          {showOverrideForm && (
            <div className="card-body" style={{ borderBottom: '1px solid var(--border)' }}>
              <form onSubmit={handleOverrideSubmit}>
                <div className="form-grid form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input type="date" className="form-input" value={overrideForm.date} onChange={e => setOverrideForm(p => ({ ...p, date: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Override Type</label>
                    <select className="form-input" value={overrideForm.is_school_day ? 'school' : 'off'} onChange={e => setOverrideForm(p => ({ ...p, is_school_day: e.target.value === 'school' }))}>
                      <option value="school">School day (attendance can be taken)</option>
                      <option value="off">Not a school day (block attendance)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Reason (optional)</label>
                    <input type="text" className="form-input" value={overrideForm.reason} onChange={e => setOverrideForm(p => ({ ...p, reason: e.target.value }))} placeholder="e.g., Makeup class" />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" onClick={() => setShowOverrideForm(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary">Add Override</button>
                </div>
              </form>
            </div>
          )}

          <div className="card-body" style={{ padding: 0 }}>
            {!cohortDetail?.overrides?.length ? (
              <div className="empty" style={{ padding: 'var(--md)' }}><p>No overrides for this cohort.</p></div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Date</th><th>Type</th><th>Reason</th><th>Actions</th></tr></thead>
                  <tbody>
                    {cohortDetail.overrides.map(o => (
                      <tr key={o.id}>
                        <td>{fmtDate(o.date || o.start_date)}</td>
                        <td><span className={`badge ${o.is_school_day ? 'badge-success' : 'badge-muted'}`}>{o.is_school_day ? 'School day' : 'Not a school day'}</span></td>
                        <td style={{ color: 'var(--muted)', fontSize: '13px' }}>{o.reason || '—'}</td>
                        <td><button onClick={() => handleDeleteOverride(o)} className="btn-sm btn-delete">Remove</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default CohortPlanner;
