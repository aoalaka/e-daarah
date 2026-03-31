import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import api from '../../../services/api';
import '../Dashboard.css';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function DayPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      {DAYS.map(day => (
        <button
          key={day}
          type="button"
          className={`btn btn-small ${value.includes(day) ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => onChange(value.includes(day) ? value.filter(d => d !== day) : [...value, day])}
        >
          {day.slice(0, 3)}
        </button>
      ))}
    </div>
  );
}

function CohortPlanner({ classes, isReadOnly, fmtDate, setConfirmModal }) {
  const [cohorts, setCohorts] = useState([]);
  const [selectedCohort, setSelectedCohort] = useState(null);
  const [cohortDetail, setCohortDetail] = useState(null); // { ...cohort, periods, classes }
  const [loading, setLoading] = useState(false);
  const [detailTab, setDetailTab] = useState('periods');

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

  useEffect(() => {
    fetchCohorts();
  }, []);

  const fetchCohorts = async () => {
    try {
      const res = await api.get('/admin/cohorts');
      setCohorts(res.data);
    } catch {
      toast.error('Failed to load cohorts');
    }
  };

  const fetchCohortDetail = async (id) => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/cohorts/${id}`);
      setCohortDetail(res.data);
    } catch {
      toast.error('Failed to load cohort details');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCohort = (cohort) => {
    setSelectedCohort(cohort);
    fetchCohortDetail(cohort.id);
    setDetailTab('periods');
  };

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
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save cohort');
    }
  };

  const handleEditCohort = (cohort) => {
    setEditingCohort(cohort);
    const days = cohort.default_school_days
      ? (typeof cohort.default_school_days === 'string' ? JSON.parse(cohort.default_school_days) : cohort.default_school_days)
      : [];
    setCohortForm({
      name: cohort.name,
      start_date: cohort.start_date.split('T')[0],
      end_date: cohort.end_date.split('T')[0],
      is_active: cohort.is_active,
      default_school_days: days
    });
    setShowCohortForm(true);
  };

  const handleDeleteCohort = (cohort) => {
    setConfirmModal({
      title: 'Delete Cohort',
      message: `Delete "${cohort.name}"? Classes assigned to this cohort will be unassigned. This cannot be undone.`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await api.delete(`/admin/cohorts/${cohort.id}`);
          toast.success('Cohort deleted');
          setCohorts(prev => prev.filter(c => c.id !== cohort.id));
          if (selectedCohort?.id === cohort.id) {
            setSelectedCohort(null);
            setCohortDetail(null);
          }
        } catch {
          toast.error('Failed to delete cohort');
        }
      }
    });
  };

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
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save period');
    }
  };

  const handleDeletePeriod = (period) => {
    setConfirmModal({
      title: 'Delete Period',
      message: `Delete "${period.name}"? Attendance and exam records linked to this period will be removed.`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await api.delete(`/admin/cohort-periods/${period.id}`);
          toast.success('Period deleted');
          fetchCohortDetail(selectedCohort.id);
        } catch {
          toast.error('Failed to delete period');
        }
      }
    });
  };

  const handleHolidaySubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly()) { toast.error('Account is in read-only mode.'); return; }
    try {
      await api.post(`/admin/cohorts/${selectedCohort.id}/holidays`, holidayForm);
      toast.success('Holiday added');
      setShowHolidayForm(false);
      setHolidayForm({ name: '', date: '' });
      fetchCohortDetail(selectedCohort.id);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add holiday');
    }
  };

  const handleDeleteHoliday = (holiday) => {
    setConfirmModal({
      title: 'Delete Holiday',
      message: `Remove "${holiday.name || holiday.title}" from this cohort?`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await api.delete(`/admin/holidays/${holiday.id}`);
          toast.success('Holiday deleted');
          fetchCohortDetail(selectedCohort.id);
        } catch {
          toast.error('Failed to delete holiday');
        }
      }
    });
  };

  const handleOverrideSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly()) { toast.error('Account is in read-only mode.'); return; }
    try {
      await api.post(`/admin/cohorts/${selectedCohort.id}/schedule-overrides`, overrideForm);
      toast.success('Schedule override added');
      setShowOverrideForm(false);
      setOverrideForm({ date: '', is_school_day: true, reason: '' });
      fetchCohortDetail(selectedCohort.id);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add override');
    }
  };

  const handleDeleteOverride = (override) => {
    setConfirmModal({
      title: 'Delete Override',
      message: `Remove this schedule override for ${fmtDate(override.date)}?`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await api.delete(`/admin/schedule-overrides/${override.id}`);
          toast.success('Override deleted');
          fetchCohortDetail(selectedCohort.id);
        } catch {
          toast.error('Failed to delete override');
        }
      }
    });
  };

  const handleAssignClass = async (classId, assign) => {
    if (isReadOnly()) { toast.error('Account is in read-only mode.'); return; }
    const cls = classes.find(c => c.id === classId);
    if (!cls) return;
    try {
      await api.put(`/admin/classes/${classId}`, {
        name: cls.name,
        grade_level: cls.grade_level,
        school_days: cls.school_days,
        description: cls.description,
        cohort_id: assign ? selectedCohort.id : null
      });
      toast.success(assign ? `${cls.name} assigned to this cohort` : `${cls.name} unassigned`);
      fetchCohortDetail(selectedCohort.id);
    } catch {
      toast.error('Failed to update class assignment');
    }
  };

  const assignedClassIds = cohortDetail?.classes?.map(c => c.id) || [];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selectedCohort ? '280px 1fr' : '1fr', gap: '20px', alignItems: 'start' }}>
      {/* Cohort list panel */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0 }}>Cohorts</h3>
          <button className="btn btn-primary btn-small" onClick={() => { setEditingCohort(null); setCohortForm({ name: '', start_date: '', end_date: '', is_active: false, default_school_days: [] }); setShowCohortForm(true); }}>
            + New
          </button>
        </div>

        {showCohortForm && (
          <form onSubmit={handleCohortSubmit} className="card" style={{ marginBottom: '12px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 12px' }}>{editingCohort ? 'Edit Cohort' : 'New Cohort'}</h4>
            <div className="form-group">
              <label>Name</label>
              <input required value={cohortForm.name} onChange={e => setCohortForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Beginners Cohort 2025" />
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <input type="date" required value={cohortForm.start_date} onChange={e => setCohortForm(p => ({ ...p, start_date: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input type="date" required value={cohortForm.end_date} onChange={e => setCohortForm(p => ({ ...p, end_date: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Default School Days</label>
              <DayPicker value={cohortForm.default_school_days} onChange={days => setCohortForm(p => ({ ...p, default_school_days: days }))} />
            </div>
            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" id="cohort-active" checked={cohortForm.is_active} onChange={e => setCohortForm(p => ({ ...p, is_active: e.target.checked }))} />
              <label htmlFor="cohort-active" style={{ margin: 0 }}>Active (teachers can record attendance)</label>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" className="btn btn-primary btn-small">Save</button>
              <button type="button" className="btn btn-secondary btn-small" onClick={() => { setShowCohortForm(false); setEditingCohort(null); }}>Cancel</button>
            </div>
          </form>
        )}

        {cohorts.length === 0 ? (
          <p className="empty-state" style={{ fontSize: '13px' }}>No cohorts yet. Create one to get started.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {cohorts.map(cohort => (
              <div
                key={cohort.id}
                className={`card ${selectedCohort?.id === cohort.id ? 'selected' : ''}`}
                style={{ padding: '12px 14px', cursor: 'pointer', borderLeft: cohort.is_active ? '3px solid var(--primary)' : '3px solid transparent' }}
                onClick={() => handleSelectCohort(cohort)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{cohort.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                      {fmtDate(cohort.start_date)} — {fmtDate(cohort.end_date)}
                    </div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>
                      {cohort.is_active && <span className="status active" style={{ fontSize: '11px' }}>Active</span>}
                      {cohort.class_count > 0 && <span style={{ color: 'var(--muted)', marginLeft: '6px' }}>{cohort.class_count} class{cohort.class_count !== 1 ? 'es' : ''}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }} onClick={e => e.stopPropagation()}>
                    <button className="btn-icon" title="Edit" onClick={() => handleEditCohort(cohort)}>✏️</button>
                    <button className="btn-icon" title="Delete" onClick={() => handleDeleteCohort(cohort)}>🗑</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cohort detail panel */}
      {selectedCohort && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0 }}>{selectedCohort.name}</h3>
            <button className="btn-small" onClick={() => { setSelectedCohort(null); setCohortDetail(null); }}>← Back</button>
          </div>

          <div className="sub-tabs" style={{ marginBottom: '16px' }}>
            {['periods', 'classes', 'holidays', 'overrides'].map(tab => (
              <button key={tab} className={`sub-tab ${detailTab === tab ? 'active' : ''}`} onClick={() => setDetailTab(tab)}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {loading ? <p>Loading…</p> : (
            <>
              {/* Periods */}
              {detailTab === 'periods' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ margin: 0 }}>Periods</h4>
                    <button className="btn btn-primary btn-small" onClick={() => { setEditingPeriod(null); setPeriodForm({ name: '', start_date: '', end_date: '', is_active: false }); setShowPeriodForm(true); }}>
                      + Add Period
                    </button>
                  </div>

                  {showPeriodForm && (
                    <form onSubmit={handlePeriodSubmit} className="card" style={{ marginBottom: '12px', padding: '16px' }}>
                      <h4 style={{ margin: '0 0 12px' }}>{editingPeriod ? 'Edit Period' : 'New Period'}</h4>
                      <div className="form-group">
                        <label>Name</label>
                        <input required value={periodForm.name} onChange={e => setPeriodForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Term 1" />
                      </div>
                      <div className="form-group">
                        <label>Start Date</label>
                        <input type="date" required value={periodForm.start_date} onChange={e => setPeriodForm(p => ({ ...p, start_date: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label>End Date</label>
                        <input type="date" required value={periodForm.end_date} onChange={e => setPeriodForm(p => ({ ...p, end_date: e.target.value }))} />
                      </div>
                      <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                        <input type="checkbox" id="period-active" checked={periodForm.is_active} onChange={e => setPeriodForm(p => ({ ...p, is_active: e.target.checked }))} />
                        <label htmlFor="period-active" style={{ margin: 0 }}>Active</label>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="submit" className="btn btn-primary btn-small">Save</button>
                        <button type="button" className="btn btn-secondary btn-small" onClick={() => { setShowPeriodForm(false); setEditingPeriod(null); }}>Cancel</button>
                      </div>
                    </form>
                  )}

                  {!cohortDetail?.periods?.length ? (
                    <p className="empty-state" style={{ fontSize: '13px' }}>No periods yet. Add a period to track attendance and exams within this cohort.</p>
                  ) : (
                    <table className="data-table">
                      <thead><tr><th>Period</th><th>Dates</th><th>Status</th><th>Actions</th></tr></thead>
                      <tbody>
                        {cohortDetail.periods.map(period => (
                          <tr key={period.id}>
                            <td>{period.name}</td>
                            <td style={{ fontSize: '13px' }}>{fmtDate(period.start_date)} — {fmtDate(period.end_date)}</td>
                            <td>{period.is_active ? <span className="status active">Active</span> : <span className="status inactive">Inactive</span>}</td>
                            <td className="actions">
                              <button className="btn-small" onClick={() => { setEditingPeriod(period); setPeriodForm({ name: period.name, start_date: period.start_date.split('T')[0], end_date: period.end_date.split('T')[0], is_active: period.is_active }); setShowPeriodForm(true); }}>Edit</button>
                              <button className="btn-small danger" onClick={() => handleDeletePeriod(period)}>Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Classes */}
              {detailTab === 'classes' && (
                <div>
                  <h4 style={{ margin: '0 0 12px' }}>Assign Classes to This Cohort</h4>
                  <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>
                    Classes assigned here will use this cohort's schedule when teachers record attendance or exams.
                  </p>
                  {!classes.length ? (
                    <p className="empty-state" style={{ fontSize: '13px' }}>No classes found. Create classes first.</p>
                  ) : (
                    <table className="data-table">
                      <thead><tr><th>Class</th><th>Grade</th><th>Assigned</th><th></th></tr></thead>
                      <tbody>
                        {classes.filter(c => !c.deleted_at).map(cls => {
                          const isAssigned = assignedClassIds.includes(cls.id);
                          return (
                            <tr key={cls.id}>
                              <td>{cls.name}</td>
                              <td style={{ color: 'var(--muted)', fontSize: '13px' }}>{cls.grade_level || '—'}</td>
                              <td>{isAssigned ? <span className="status active">Yes</span> : <span style={{ color: 'var(--muted)', fontSize: '13px' }}>No</span>}</td>
                              <td>
                                <button
                                  className={`btn-small ${isAssigned ? 'danger' : 'success'}`}
                                  onClick={() => handleAssignClass(cls.id, !isAssigned)}
                                >
                                  {isAssigned ? 'Unassign' : 'Assign'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Holidays */}
              {detailTab === 'holidays' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ margin: 0 }}>Holidays</h4>
                    <button className="btn btn-primary btn-small" onClick={() => { setHolidayForm({ name: '', date: '' }); setShowHolidayForm(true); }}>+ Add Holiday</button>
                  </div>

                  {showHolidayForm && (
                    <form onSubmit={handleHolidaySubmit} className="card" style={{ marginBottom: '12px', padding: '16px' }}>
                      <div className="form-group">
                        <label>Name</label>
                        <input required value={holidayForm.name} onChange={e => setHolidayForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Eid Al-Fitr" />
                      </div>
                      <div className="form-group">
                        <label>Date</label>
                        <input type="date" required value={holidayForm.date} onChange={e => setHolidayForm(p => ({ ...p, date: e.target.value }))} />
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="submit" className="btn btn-primary btn-small">Add</button>
                        <button type="button" className="btn btn-secondary btn-small" onClick={() => setShowHolidayForm(false)}>Cancel</button>
                      </div>
                    </form>
                  )}

                  {!cohortDetail?.holidays?.length ? (
                    <p className="empty-state" style={{ fontSize: '13px' }}>No holidays for this cohort.</p>
                  ) : (
                    <table className="data-table">
                      <thead><tr><th>Name</th><th>Date</th><th></th></tr></thead>
                      <tbody>
                        {cohortDetail.holidays.map(h => (
                          <tr key={h.id}>
                            <td>{h.name || h.title}</td>
                            <td>{fmtDate(h.date || h.start_date)}</td>
                            <td><button className="btn-small danger" onClick={() => handleDeleteHoliday(h)}>Delete</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Schedule Overrides */}
              {detailTab === 'overrides' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ margin: 0 }}>Schedule Overrides</h4>
                    <button className="btn btn-primary btn-small" onClick={() => { setOverrideForm({ date: '', is_school_day: true, reason: '' }); setShowOverrideForm(true); }}>+ Add Override</button>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '12px' }}>
                    Override specific dates — mark a normally-off day as a school day, or cancel a normally-on day.
                  </p>

                  {showOverrideForm && (
                    <form onSubmit={handleOverrideSubmit} className="card" style={{ marginBottom: '12px', padding: '16px' }}>
                      <div className="form-group">
                        <label>Date</label>
                        <input type="date" required value={overrideForm.date} onChange={e => setOverrideForm(p => ({ ...p, date: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label>Override Type</label>
                        <select value={overrideForm.is_school_day ? 'school' : 'off'} onChange={e => setOverrideForm(p => ({ ...p, is_school_day: e.target.value === 'school' }))}>
                          <option value="school">School day (attendance can be taken)</option>
                          <option value="off">Not a school day (block attendance)</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Reason (optional)</label>
                        <input value={overrideForm.reason} onChange={e => setOverrideForm(p => ({ ...p, reason: e.target.value }))} placeholder="e.g. Makeup class" />
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="submit" className="btn btn-primary btn-small">Add</button>
                        <button type="button" className="btn btn-secondary btn-small" onClick={() => setShowOverrideForm(false)}>Cancel</button>
                      </div>
                    </form>
                  )}

                  {!cohortDetail?.overrides?.length ? (
                    <p className="empty-state" style={{ fontSize: '13px' }}>No overrides for this cohort.</p>
                  ) : (
                    <table className="data-table">
                      <thead><tr><th>Date</th><th>Type</th><th>Reason</th><th></th></tr></thead>
                      <tbody>
                        {cohortDetail.overrides.map(o => (
                          <tr key={o.id}>
                            <td>{fmtDate(o.date || o.start_date)}</td>
                            <td>{o.is_school_day ? <span className="status active">School day</span> : <span className="status inactive">Not a school day</span>}</td>
                            <td style={{ color: 'var(--muted)', fontSize: '13px' }}>{o.reason || '—'}</td>
                            <td><button className="btn-small danger" onClick={() => handleDeleteOverride(o)}>Delete</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default CohortPlanner;
