import { useState } from 'react';
import { toast } from 'sonner';
import { CalendarIcon } from '@heroicons/react/24/outline';
import api from '../../../services/api';
import '../Dashboard.css';

function PlannerSection({ sessions, setSessions, semesters, setSemesters, classes, isReadOnly, fmtDate, madrasahProfile, setConfirmModal, loadData }) {
  const [plannerSubTab, setPlannerSubTab] = useState('sessions');
  const [plannerSelectedSession, setPlannerSelectedSession] = useState(null);
  const [plannerHolidays, setPlannerHolidays] = useState([]);
  const [plannerOverrides, setPlannerOverrides] = useState([]);
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [newHoliday, setNewHoliday] = useState({ title: '', start_date: '', end_date: '', description: '' });
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [editingOverride, setEditingOverride] = useState(null);
  const [newOverride, setNewOverride] = useState({ title: '', start_date: '', end_date: '', school_days: [] });
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [showSemesterForm, setShowSemesterForm] = useState(false);
  const [newSession, setNewSession] = useState({ name: '', start_date: '', end_date: '', is_active: false, default_school_days: [] });
  const [newSemester, setNewSemester] = useState({ session_id: '', name: '', start_date: '', end_date: '', is_active: false });
  const [editingSession, setEditingSession] = useState(null);
  const [editingSemester, setEditingSemester] = useState(null);

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (isReadOnly()) { toast.error('Account is in read-only mode. Please subscribe to make changes.'); return; }
    try {
      if (editingSession) {
        await api.put(`/admin/sessions/${editingSession.id}`, newSession);
        setEditingSession(null);
      } else {
        await api.post('/admin/sessions', newSession);
      }
      setShowSessionForm(false);
      setNewSession({ name: '', start_date: '', end_date: '', is_active: false, default_school_days: [] });
      loadData();
      // Refresh planner detail if viewing this session
      if (plannerSelectedSession && editingSession && plannerSelectedSession.id === editingSession.id) {
        const updatedSessions = (await api.get('/admin/sessions')).data;
        const updated = updatedSessions.find(s => s.id === editingSession.id);
        if (updated) setPlannerSelectedSession(updated);
      }
    } catch (error) {
      toast.error(editingSession ? 'Failed to update session' : 'Failed to create session');
    }
  };

  const handleEditSession = (session) => {
    setEditingSession(session);
    const schoolDays = session.default_school_days ? (typeof session.default_school_days === 'string' ? JSON.parse(session.default_school_days) : session.default_school_days) : [];
    setNewSession({
      name: session.name,
      start_date: session.start_date.split('T')[0],
      end_date: session.end_date.split('T')[0],
      is_active: session.is_active,
      default_school_days: schoolDays
    });
    setShowSessionForm(true);
  };

  const handleDeleteSession = (id) => {
    if (isReadOnly()) { toast.error('Account is in read-only mode. Please subscribe to make changes.'); return; }
    setConfirmModal({ title: 'Delete Session', message: 'Are you sure? This will also delete all associated semesters.', danger: true, confirmLabel: 'Delete', onConfirm: async () => {
      try { await api.delete(`/admin/sessions/${id}`); loadData(); }
      catch (error) { toast.error('Failed to delete session'); }
    }});
  };

  const handleCreateSemester = async (e) => {
    e.preventDefault();
    if (isReadOnly()) { toast.error('Account is in read-only mode. Please subscribe to make changes.'); return; }
    try {
      if (editingSemester) {
        await api.put(`/admin/semesters/${editingSemester.id}`, newSemester);
        toast.success('Semester updated successfully');
        setEditingSemester(null);
      } else {
        await api.post('/admin/semesters', newSemester);
        toast.success('Semester created successfully');
      }
      setShowSemesterForm(false);
      setNewSemester({ session_id: '', name: '', start_date: '', end_date: '', is_active: false });
      loadData();
    } catch (error) {
      const errorMessage = error.response?.data?.error || (editingSemester ? 'Failed to update semester' : 'Failed to create semester');
      console.error('Semester error:', error.response?.data);
      toast.error(errorMessage);
    }
  };

  const handleEditSemester = (semester) => {
    setEditingSemester(semester);
    setNewSemester({
      session_id: semester.session_id,
      name: semester.name,
      start_date: semester.start_date.split('T')[0],
      end_date: semester.end_date.split('T')[0],
      is_active: semester.is_active
    });
    setShowSemesterForm(true);
  };

  const handleDeleteSemester = (id) => {
    if (isReadOnly()) { toast.error('Account is in read-only mode. Please subscribe to make changes.'); return; }
    setConfirmModal({ title: 'Delete Semester', message: 'Are you sure? This will also delete all associated attendance records.', danger: true, confirmLabel: 'Delete', onConfirm: async () => {
      try { await api.delete(`/admin/semesters/${id}`); loadData(); }
      catch (error) { toast.error('Failed to delete semester'); }
    }});
  };

  const openPlannerSession = async (session) => {
    setPlannerSelectedSession(session);
    setPlannerSubTab('detail');
    // Fetch holidays and overrides for this session
    try {
      const [holidaysRes, overridesRes] = await Promise.all([
        api.get(`/admin/sessions/${session.id}/holidays`),
        api.get(`/admin/sessions/${session.id}/schedule-overrides`)
      ]);
      setPlannerHolidays(holidaysRes.data);
      setPlannerOverrides(overridesRes.data);
    } catch (error) {
      console.error('Failed to fetch planner data:', error);
    }
  };

  const handleCreateHoliday = async (e) => {
    e.preventDefault();
    if (isReadOnly()) { toast.error('Account is in read-only mode.'); return; }
    try {
      if (editingHoliday) {
        await api.put(`/admin/holidays/${editingHoliday.id}`, newHoliday);
        toast.success('Holiday updated');
        setEditingHoliday(null);
      } else {
        await api.post(`/admin/sessions/${plannerSelectedSession.id}/holidays`, newHoliday);
        toast.success('Holiday added');
      }
      setShowHolidayForm(false);
      setNewHoliday({ title: '', start_date: '', end_date: '', description: '' });
      const res = await api.get(`/admin/sessions/${plannerSelectedSession.id}/holidays`);
      setPlannerHolidays(res.data);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save holiday');
    }
  };

  const handleEditHoliday = (holiday) => {
    setEditingHoliday(holiday);
    setNewHoliday({
      title: holiday.title,
      start_date: holiday.start_date.split('T')[0],
      end_date: holiday.end_date.split('T')[0],
      description: holiday.description || ''
    });
    setShowHolidayForm(true);
  };

  const handleDeleteHoliday = (id) => {
    setConfirmModal({ title: 'Delete Holiday', message: 'Delete this holiday?', danger: true, confirmLabel: 'Delete', onConfirm: async () => {
      try { await api.delete(`/admin/holidays/${id}`); setPlannerHolidays(prev => prev.filter(h => h.id !== id)); toast.success('Holiday deleted'); }
      catch (error) { toast.error('Failed to delete holiday'); }
    }});
  };

  const handleCreateOverride = async (e) => {
    e.preventDefault();
    if (isReadOnly()) { toast.error('Account is in read-only mode.'); return; }
    if (!newOverride.school_days || newOverride.school_days.length === 0) {
      toast.error('Select at least one school day for the override');
      return;
    }
    try {
      if (editingOverride) {
        await api.put(`/admin/schedule-overrides/${editingOverride.id}`, newOverride);
        toast.success('Schedule override updated');
        setEditingOverride(null);
      } else {
        await api.post(`/admin/sessions/${plannerSelectedSession.id}/schedule-overrides`, newOverride);
        toast.success('Schedule override added');
      }
      setShowOverrideForm(false);
      setNewOverride({ title: '', start_date: '', end_date: '', school_days: [] });
      const res = await api.get(`/admin/sessions/${plannerSelectedSession.id}/schedule-overrides`);
      setPlannerOverrides(res.data);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save override');
    }
  };

  const handleEditOverride = (override) => {
    setEditingOverride(override);
    const days = override.school_days ? (typeof override.school_days === 'string' ? JSON.parse(override.school_days) : override.school_days) : [];
    setNewOverride({
      title: override.title,
      start_date: override.start_date.split('T')[0],
      end_date: override.end_date.split('T')[0],
      school_days: days
    });
    setShowOverrideForm(true);
  };

  const handleDeleteOverride = (id) => {
    setConfirmModal({ title: 'Delete Override', message: 'Delete this schedule override?', danger: true, confirmLabel: 'Delete', onConfirm: async () => {
      try { await api.delete(`/admin/schedule-overrides/${id}`); setPlannerOverrides(prev => prev.filter(o => o.id !== id)); toast.success('Override deleted'); }
      catch (error) { toast.error('Failed to delete override'); }
    }});
  };

  return (
    <>
      {plannerSubTab === 'sessions' && (
        <>
          <div className="page-header">
            <h2 className="page-title">Academic Planner</h2>
            <button onClick={() => {
              setEditingSession(null);
              setNewSession({ name: '', start_date: '', end_date: '', is_active: false, default_school_days: [] });
              setShowSessionForm(!showSessionForm);
            }} className="btn btn-primary" disabled={isReadOnly()}>
              + New Session
            </button>
          </div>

          <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: 'var(--md)' }}>
            Create academic sessions, set school days, manage semesters, holidays, and temporary schedule changes.
          </p>

          {showSessionForm && (
            <div className="card">
              <div className="card-header">{editingSession ? 'Edit Academic Session' : 'Create New Academic Session'}</div>
              <div className="card-body">
                <form onSubmit={handleCreateSession}>
                  <div className="form-grid form-grid-3">
                    <div className="form-group">
                      <label className="form-label">Session Name</label>
                      <input type="text" className="form-input" value={newSession.name} onChange={(e) => setNewSession({ ...newSession, name: e.target.value })} placeholder="e.g., 2024-2025" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Start Date</label>
                      <input type="date" className="form-input" value={newSession.start_date} onChange={(e) => setNewSession({ ...newSession, start_date: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">End Date</label>
                      <input type="date" className="form-input" value={newSession.end_date} onChange={(e) => setNewSession({ ...newSession, end_date: e.target.value })} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">School Days</label>
                    <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>Select which days the madrasah operates during this session</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                        <button key={day} type="button" onClick={() => setNewSession({ ...newSession, default_school_days: (newSession.default_school_days || []).includes(day) ? newSession.default_school_days.filter(d => d !== day) : [...(newSession.default_school_days || []), day] })} style={{ padding: '6px 14px', borderRadius: '20px', border: `2px solid ${(newSession.default_school_days || []).includes(day) ? '#2563eb' : '#d1d5db'}`, background: (newSession.default_school_days || []).includes(day) ? '#2563eb' : 'transparent', color: (newSession.default_school_days || []).includes(day) ? '#fff' : '#374151', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                          {day.substring(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label checkbox-label">
                      <input type="checkbox" checked={newSession.is_active} onChange={(e) => setNewSession({ ...newSession, is_active: e.target.checked })} />
                      <span>Set as active session</span>
                    </label>
                  </div>
                  <div className="form-actions">
                    <button type="button" onClick={() => { setShowSessionForm(false); setEditingSession(null); setNewSession({ name: '', start_date: '', end_date: '', is_active: false, default_school_days: [] }); }} className="btn btn-secondary">Cancel</button>
                    <button type="submit" className="btn btn-primary">{editingSession ? 'Update Session' : 'Create Session'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Sessions List */}
          {sessions.length === 0 ? (
            <div className="card"><div className="empty"><div className="empty-icon"><CalendarIcon /></div><p>No sessions yet. Create one to get started.</p><button className="empty-action" onClick={() => setShowSessionForm(true)}>+ Create Session</button></div></div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {sessions.map(session => {
                const schoolDays = session.default_school_days ? (typeof session.default_school_days === 'string' ? JSON.parse(session.default_school_days) : session.default_school_days) : [];
                const sessionSemesters = semesters.filter(sem => sem.session_id === session.id);
                return (
                  <div key={session.id} className="card" style={{ padding: 'var(--md)', cursor: 'pointer' }} onClick={() => openPlannerSession(session)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <h3 style={{ margin: 0, fontSize: '16px' }}>{session.name}</h3>
                          <span className={`badge ${session.is_active ? 'badge-success' : 'badge-muted'}`}>{session.is_active ? 'Active' : 'Inactive'}</span>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                          {fmtDate(session.start_date)} – {fmtDate(session.end_date)}
                        </div>
                        {schoolDays.length > 0 && (
                          <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
                            {schoolDays.map(day => (
                              <span key={day} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(37,99,235,0.08)', color: '#2563eb', fontWeight: '500' }}>{day.substring(0, 3)}</span>
                            ))}
                          </div>
                        )}
                        <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px' }}>
                          {sessionSemesters.length} semester{sessionSemesters.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button onClick={(e) => { e.stopPropagation(); handleEditSession(session); }} className="btn-sm btn-edit">Edit</button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteSession(session.id); }} className="btn-sm btn-delete">Delete</button>
                        <button onClick={() => openPlannerSession(session)} style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '13px', color: '#2563eb', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
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
      )}

      {/* Planner Session Detail View */}
      {plannerSubTab === 'detail' && plannerSelectedSession && (
        <>
          <div className="page-header">
            <button onClick={() => { setPlannerSubTab('sessions'); setPlannerSelectedSession(null); }} className="btn btn-secondary" style={{ marginRight: '8px' }}>← Back</button>
            <div style={{ flex: 1 }}>
              <h2 className="page-title" style={{ margin: 0 }}>{plannerSelectedSession.name}</h2>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                {fmtDate(plannerSelectedSession.start_date)} – {fmtDate(plannerSelectedSession.end_date)}
                {(() => {
                  const sd = plannerSelectedSession.default_school_days ? (typeof plannerSelectedSession.default_school_days === 'string' ? JSON.parse(plannerSelectedSession.default_school_days) : plannerSelectedSession.default_school_days) : [];
                  return sd.length > 0 ? ` · School days: ${sd.map(d => d.substring(0, 3)).join(', ')}` : '';
                })()}
              </p>
            </div>
          </div>

          {/* Semesters Section */}
          <div className="card" style={{ marginBottom: 'var(--md)' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Semesters</span>
              {!showSemesterForm && (
                <button onClick={() => {
                  setEditingSemester(null);
                  setNewSemester({ session_id: plannerSelectedSession.id, name: '', start_date: '', end_date: '', is_active: false });
                  setShowSemesterForm(true);
                }} className="btn btn-sm btn-primary" disabled={isReadOnly()}>+ Add</button>
              )}
            </div>

            {showSemesterForm && (
              <div className="card-body" style={{ borderBottom: '1px solid var(--border)' }}>
                <form onSubmit={handleCreateSemester}>
                  <div className="form-grid form-grid-3">
                    <div className="form-group">
                      <label className="form-label">Semester Name</label>
                      <input type="text" className="form-input" value={newSemester.name} onChange={(e) => setNewSemester({ ...newSemester, name: e.target.value })} placeholder="e.g., Fall 2024" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Start Date</label>
                      <input type="date" className="form-input" value={newSemester.start_date} onChange={(e) => setNewSemester({ ...newSemester, start_date: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">End Date</label>
                      <input type="date" className="form-input" value={newSemester.end_date} onChange={(e) => setNewSemester({ ...newSemester, end_date: e.target.value })} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label checkbox-label">
                      <input type="checkbox" checked={newSemester.is_active} onChange={(e) => setNewSemester({ ...newSemester, is_active: e.target.checked })} />
                      <span>Set as active semester</span>
                    </label>
                  </div>
                  <div className="form-actions">
                    <button type="button" onClick={() => { setShowSemesterForm(false); setEditingSemester(null); }} className="btn btn-secondary">Cancel</button>
                    <button type="submit" className="btn btn-primary">{editingSemester ? 'Update' : 'Create'}</button>
                  </div>
                </form>
              </div>
            )}

            <div className="card-body" style={{ padding: 0 }}>
              {semesters.filter(sem => sem.session_id === plannerSelectedSession.id).length === 0 ? (
                <div className="empty" style={{ padding: 'var(--md)' }}><p>No semesters yet for this session.</p></div>
              ) : (
                <>
                <div className="table-wrap planner-table-desktop">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Semester</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {semesters.filter(sem => sem.session_id === plannerSelectedSession.id).map(semester => (
                        <tr key={semester.id}>
                          <td><strong>{semester.name}</strong></td>
                          <td>{fmtDate(semester.start_date)}</td>
                          <td>{fmtDate(semester.end_date)}</td>
                          <td><span className={`badge ${semester.is_active ? 'badge-success' : 'badge-muted'}`}>{semester.is_active ? 'Active' : 'Inactive'}</span></td>
                          <td>
                            <button onClick={() => handleEditSemester(semester)} className="btn-sm btn-edit">Edit</button>
                            <button onClick={() => handleDeleteSemester(semester.id)} className="btn-sm btn-delete">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="planner-mobile-cards" style={{ display: 'none', padding: '8px 16px' }}>
                  {semesters.filter(sem => sem.session_id === plannerSelectedSession.id).map(semester => (
                    <div key={semester.id} className="admin-mobile-card" style={{ marginBottom: '8px', padding: '14px', border: '1px solid var(--light)', borderRadius: 'var(--radius)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <strong style={{ fontSize: '15px' }}>{semester.name}</strong>
                        <span className={`badge ${semester.is_active ? 'badge-success' : 'badge-muted'}`}>{semester.is_active ? 'Active' : 'Inactive'}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '10px' }}>
                        {fmtDate(semester.start_date)} — {fmtDate(semester.end_date)}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleEditSemester(semester)} className="btn-sm btn-edit">Edit</button>
                        <button onClick={() => handleDeleteSemester(semester.id)} className="btn-sm btn-delete">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
                </>
              )}
            </div>
          </div>

          {/* Holidays Section */}
          <div className="card" style={{ marginBottom: 'var(--md)' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Holidays & Closures</span>
              {!showHolidayForm && (
                <button onClick={() => {
                  setEditingHoliday(null);
                  setNewHoliday({ title: '', start_date: '', end_date: '', description: '' });
                  setShowHolidayForm(true);
                }} className="btn btn-sm btn-primary" disabled={isReadOnly()}>+ Add</button>
              )}
            </div>

            {showHolidayForm && (
              <div className="card-body" style={{ borderBottom: '1px solid var(--border)' }}>
                <form onSubmit={handleCreateHoliday}>
                  <div className="form-grid form-grid-3">
                    <div className="form-group">
                      <label className="form-label">Holiday Name</label>
                      <input type="text" className="form-input" value={newHoliday.title} onChange={(e) => setNewHoliday({ ...newHoliday, title: e.target.value })} placeholder="e.g., Eid al-Fitr, Ramadan Break" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Start Date</label>
                      <input type="date" className="form-input" value={newHoliday.start_date} onChange={(e) => setNewHoliday({ ...newHoliday, start_date: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">End Date</label>
                      <input type="date" className="form-input" value={newHoliday.end_date} onChange={(e) => setNewHoliday({ ...newHoliday, end_date: e.target.value })} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description (optional)</label>
                    <input type="text" className="form-input" value={newHoliday.description} onChange={(e) => setNewHoliday({ ...newHoliday, description: e.target.value })} placeholder="e.g., School closed for 3 days" />
                  </div>
                  <div className="form-actions">
                    <button type="button" onClick={() => { setShowHolidayForm(false); setEditingHoliday(null); }} className="btn btn-secondary">Cancel</button>
                    <button type="submit" className="btn btn-primary">{editingHoliday ? 'Update' : 'Add Holiday'}</button>
                  </div>
                </form>
              </div>
            )}

            <div className="card-body" style={{ padding: 0 }}>
              {plannerHolidays.length === 0 ? (
                <div className="empty" style={{ padding: 'var(--md)' }}><p>No holidays added. Teachers can mark attendance on any school day.</p></div>
              ) : (
                <>
                <div className="table-wrap planner-table-desktop">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Holiday</th>
                        <th>Start</th>
                        <th>End</th>
                        <th>Description</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plannerHolidays.map(h => (
                        <tr key={h.id}>
                          <td><strong>{h.title}</strong></td>
                          <td>{fmtDate(h.start_date)}</td>
                          <td>{fmtDate(h.end_date)}</td>
                          <td style={{ color: 'var(--muted)', fontSize: '13px' }}>{h.description || '—'}</td>
                          <td>
                            <button onClick={() => handleEditHoliday(h)} className="btn-sm btn-edit">Edit</button>
                            <button onClick={() => handleDeleteHoliday(h.id)} className="btn-sm btn-delete">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="planner-mobile-cards" style={{ display: 'none', padding: '8px 16px' }}>
                  {plannerHolidays.map(h => (
                    <div key={h.id} className="admin-mobile-card" style={{ marginBottom: '8px', padding: '14px', border: '1px solid var(--light)', borderRadius: 'var(--radius)' }}>
                      <strong style={{ fontSize: '15px', display: 'block', marginBottom: '4px' }}>{h.title}</strong>
                      <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>
                        {fmtDate(h.start_date)} — {fmtDate(h.end_date)}
                      </div>
                      {h.description && <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '8px' }}>{h.description}</div>}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleEditHoliday(h)} className="btn-sm btn-edit">Edit</button>
                        <button onClick={() => handleDeleteHoliday(h.id)} className="btn-sm btn-delete">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
                </>
              )}
            </div>
          </div>

          {/* Schedule Overrides Section */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Schedule Overrides</span>
              {!showOverrideForm && (
                <button onClick={() => {
                  setEditingOverride(null);
                  setNewOverride({ title: '', start_date: '', end_date: '', school_days: [] });
                  setShowOverrideForm(true);
                }} className="btn btn-sm btn-primary" disabled={isReadOnly()}>+ Add</button>
              )}
            </div>
            <p style={{ padding: '0 var(--md)', fontSize: '12px', color: 'var(--muted)', margin: '8px 0 0' }}>
              Temporarily change school days for a period (e.g., shift to Saturday-Sunday during Ramadan)
            </p>

            {showOverrideForm && (
              <div className="card-body" style={{ borderBottom: '1px solid var(--border)' }}>
                <form onSubmit={handleCreateOverride}>
                  <div className="form-grid form-grid-3">
                    <div className="form-group">
                      <label className="form-label">Override Name</label>
                      <input type="text" className="form-input" value={newOverride.title} onChange={(e) => setNewOverride({ ...newOverride, title: e.target.value })} placeholder="e.g., Ramadan Schedule" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Start Date</label>
                      <input type="date" className="form-input" value={newOverride.start_date} onChange={(e) => setNewOverride({ ...newOverride, start_date: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">End Date</label>
                      <input type="date" className="form-input" value={newOverride.end_date} onChange={(e) => setNewOverride({ ...newOverride, end_date: e.target.value })} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Temporary School Days</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                        <button key={day} type="button" onClick={() => setNewOverride({ ...newOverride, school_days: newOverride.school_days.includes(day) ? newOverride.school_days.filter(d => d !== day) : [...newOverride.school_days, day] })} style={{ padding: '6px 14px', borderRadius: '20px', border: `2px solid ${newOverride.school_days.includes(day) ? '#2563eb' : '#d1d5db'}`, background: newOverride.school_days.includes(day) ? '#2563eb' : 'transparent', color: newOverride.school_days.includes(day) ? '#fff' : '#374151', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                          {day.substring(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="button" onClick={() => { setShowOverrideForm(false); setEditingOverride(null); }} className="btn btn-secondary">Cancel</button>
                    <button type="submit" className="btn btn-primary">{editingOverride ? 'Update' : 'Add Override'}</button>
                  </div>
                </form>
              </div>
            )}

            <div className="card-body" style={{ padding: 0 }}>
              {plannerOverrides.length === 0 ? (
                <div className="empty" style={{ padding: 'var(--md)' }}><p>No schedule overrides. The default school days apply throughout the session.</p></div>
              ) : (
                <>
                <div className="table-wrap planner-table-desktop">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Override</th>
                        <th>Period</th>
                        <th>Temporary Days</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plannerOverrides.map(o => {
                        const days = o.school_days ? (typeof o.school_days === 'string' ? JSON.parse(o.school_days) : o.school_days) : [];
                        return (
                          <tr key={o.id}>
                            <td><strong>{o.title}</strong></td>
                            <td style={{ fontSize: '13px' }}>{fmtDate(o.start_date)} – {fmtDate(o.end_date)}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                                {days.map(d => (
                                  <span key={d} style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '10px', background: 'rgba(37,99,235,0.08)', color: '#2563eb', fontWeight: '500' }}>{d.substring(0, 3)}</span>
                                ))}
                              </div>
                            </td>
                            <td>
                              <button onClick={() => handleEditOverride(o)} className="btn-sm btn-edit">Edit</button>
                              <button onClick={() => handleDeleteOverride(o.id)} className="btn-sm btn-delete">Delete</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="planner-mobile-cards" style={{ display: 'none', padding: '8px 16px' }}>
                  {plannerOverrides.map(o => {
                    const days = o.school_days ? (typeof o.school_days === 'string' ? JSON.parse(o.school_days) : o.school_days) : [];
                    return (
                      <div key={o.id} className="admin-mobile-card" style={{ marginBottom: '8px', padding: '14px', border: '1px solid var(--light)', borderRadius: 'var(--radius)' }}>
                        <strong style={{ fontSize: '15px', display: 'block', marginBottom: '4px' }}>{o.title}</strong>
                        <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '6px' }}>
                          {fmtDate(o.start_date)} – {fmtDate(o.end_date)}
                        </div>
                        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginBottom: '10px' }}>
                          {days.map(d => (
                            <span key={d} style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '10px', background: 'rgba(37,99,235,0.08)', color: '#2563eb', fontWeight: '500' }}>{d.substring(0, 3)}</span>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleEditOverride(o)} className="btn-sm btn-edit">Edit</button>
                          <button onClick={() => handleDeleteOverride(o.id)} className="btn-sm btn-delete">Delete</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default PlannerSection;
