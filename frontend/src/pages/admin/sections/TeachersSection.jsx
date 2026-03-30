import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import api from '../../../services/api';
import SortableTable from '../../../components/SortableTable';
import { handleApiError } from '../../../utils/errorHandler';
import '../Dashboard.css';

function TeachersSection({ teachers, setTeachers, classes, weekDays, isReadOnly, fmtDate, setConfirmModal, madrasahProfile, loadData, setActiveTab, sessions }) {
  const { madrasahSlug } = useParams();
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [newTeacher, setNewTeacher] = useState({
    first_name: '', last_name: '', staff_id: '', email: '',
    phone: '', phone_country_code: '+64',
    street: '', city: '', state: '', country: ''
  });
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [teacherSubTab, setTeacherSubTab] = useState('list');
  const [availabilityWeekStart, setAvailabilityWeekStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); return d;
  });
  const [availabilityData, setAvailabilityData] = useState([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [allTeachers, setAllTeachers] = useState([]);
  const [availabilityPlannerData, setAvailabilityPlannerData] = useState({ schoolDays: [], holidays: [], overrides: [] });
  const [mobileTeacherSearch, setMobileTeacherSearch] = useState('');
  const [mobileTeacherPage, setMobileTeacherPage] = useState(1);
  const mobilePageSize = 10;

  // Fetch availability data when Availability sub-tab is active
  useEffect(() => {
    if (teacherSubTab === 'availability' && madrasahProfile) {
      fetchAvailabilityData();
    }
  }, [teacherSubTab, availabilityWeekStart, madrasahProfile]);

  const fetchAvailabilityData = async () => {
    setAvailabilityLoading(true);
    try {
      const endDate = new Date(availabilityWeekStart);
      endDate.setDate(endDate.getDate() + 13); // 2 weeks
      const startStr = availabilityWeekStart.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      const fetches = [
        api.get(`/admin/teacher-availability?start_date=${startStr}&end_date=${endStr}`),
        api.get('/admin/teachers'),
      ];

      // Fetch planner data if planner-aware is enabled
      const plannerAware = madrasahProfile?.availability_planner_aware === 1 || madrasahProfile?.availability_planner_aware === true;
      const activeSession = plannerAware ? sessions.find(s => s.is_active) : null;
      if (activeSession) {
        fetches.push(
          api.get(`/admin/sessions/${activeSession.id}/holidays`),
          api.get(`/admin/sessions/${activeSession.id}/schedule-overrides`),
        );
      }

      const results = await Promise.all(fetches);
      setAvailabilityData(results[0].data);
      setAllTeachers(results[1].data.filter(t => t.status === 'active'));

      if (activeSession) {
        const sessionDays = activeSession.default_school_days
          ? (typeof activeSession.default_school_days === 'string' ? JSON.parse(activeSession.default_school_days) : activeSession.default_school_days)
          : [];
        setAvailabilityPlannerData({
          schoolDays: sessionDays,
          holidays: results[2]?.data || [],
          overrides: results[3]?.data || [],
        });
      } else {
        setAvailabilityPlannerData({ schoolDays: [], holidays: [], overrides: [] });
      }
    } catch (error) {
      toast.error('Failed to load availability data');
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    if (isReadOnly()) { toast.error('Account is in read-only mode. Please subscribe to make changes.'); return; }
    try {
      if (editingTeacher) {
        await api.put(`/admin/teachers/${editingTeacher.id}`, newTeacher);
        toast.success('Teacher updated successfully');
        setEditingTeacher(null);
      } else {
        const createdTeacher = await api.post('/admin/teachers', newTeacher);
        const loginUrl = `${window.location.origin}/${madrasahSlug}/login`;
        const staffId = createdTeacher.data?.staff_id || newTeacher.staff_id;
        toast.success(
          `Teacher created. Share these login details with them:\n\nLogin: ${loginUrl}\nStaff ID: ${staffId}\nPassword: ${staffId} (same as Staff ID)`,
          { duration: 12000 }
        );
      }
      setShowTeacherForm(false);
      setNewTeacher({
        first_name: '', last_name: '', staff_id: '', email: '',
        phone: '', phone_country_code: '+64',
        street: '', city: '', state: '', country: ''
      });
      loadData();
    } catch (error) {
      const errorMessage = error.response?.data?.error || (editingTeacher ? 'Failed to update teacher' : 'Failed to create teacher');
      console.error('Teacher error:', error.response?.data);
      toast.error(errorMessage);

      // Check if it's a billing limit error
      if (error.response?.status === 403) {
        handleApiError(error, errorMessage, () => {
          setActiveTab('settings');
        });
      }
    }
  };

  const handleEditTeacher = (teacher) => {
    setEditingTeacher(teacher);
    setNewTeacher({
      first_name: teacher.first_name,
      last_name: teacher.last_name,
      staff_id: teacher.staff_id,
      email: teacher.email,
      phone: teacher.phone || '',
      phone_country_code: teacher.phone_country_code || '+64',
      street: teacher.street || '',
      city: teacher.city || '',
      state: teacher.state || '',
      country: teacher.country || ''
    });
    setShowTeacherForm(true);
  };

  const handleDeleteTeacher = (id) => {
    if (isReadOnly()) { toast.error('Account is in read-only mode. Please subscribe to make changes.'); return; }
    setConfirmModal({ title: 'Delete Teacher', message: 'Are you sure you want to delete this teacher?', danger: true, confirmLabel: 'Delete', onConfirm: async () => {
      try { await api.delete(`/admin/teachers/${id}`); loadData(); }
      catch (error) { toast.error('Failed to delete teacher'); }
    }});
  };

  return (
    <>
      <div className="page-header">
        <h2 className="page-title">Teachers</h2>
        {teacherSubTab === 'list' && (
        <button onClick={() => {
          setEditingTeacher(null);
          setNewTeacher({ first_name: '', last_name: '', staff_id: '', email: '', phone: '' });
          setShowTeacherForm(!showTeacherForm);
        }} className="btn btn-primary" disabled={isReadOnly()}>
          + New Teacher
        </button>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="sub-tabs" style={{ display: 'flex', gap: '0', marginBottom: 'var(--md)', borderBottom: '2px solid #e5e7eb' }}>
        {[{ id: 'list', label: 'Teacher List' }, { id: 'availability', label: 'Availability' }].map(tab => (
          <button
            key={tab.id}
            onClick={() => setTeacherSubTab(tab.id)}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: teacherSubTab === tab.id ? 600 : 400,
              color: teacherSubTab === tab.id ? 'var(--accent)' : '#6b7280',
              background: 'none',
              border: 'none',
              borderBottom: teacherSubTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: '-2px',
              cursor: 'pointer',
              minHeight: '44px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {teacherSubTab === 'list' && (
      <>
      <div className="info-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sm)', flexWrap: 'wrap', padding: '12px 16px', background: '#fafafa', borderRadius: '8px', fontSize: '13px', color: '#525252', marginBottom: 'var(--md)' }}>
        <span>Teachers can also self-register using this link:</span>
        <code
          style={{ padding: '4px 10px', background: '#f0f0f0', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', userSelect: 'all' }}
          onClick={() => {
            navigator.clipboard.writeText(`${window.location.origin}/${madrasahSlug}/register-teacher`);
            toast.success('Link copied');
          }}
          title="Click to copy"
        >
          {`${window.location.origin}/${madrasahSlug}/register-teacher`}
        </code>
      </div>

      {showTeacherForm && (
        <div className="card">
          <div className="card-header">{editingTeacher ? 'Edit Teacher' : 'Create New Teacher'}</div>
          <div className="card-body">
            <form onSubmit={handleCreateTeacher}>
              <div className="form-grid form-grid-3">
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newTeacher.first_name}
                    onChange={(e) => setNewTeacher({ ...newTeacher, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newTeacher.last_name}
                    onChange={(e) => setNewTeacher({ ...newTeacher, last_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Staff ID (5 digits)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newTeacher.staff_id}
                    onChange={(e) => setNewTeacher({ ...newTeacher, staff_id: e.target.value })}
                    pattern="\d{5}"
                    maxLength="5"
                    placeholder="12345"
                    required
                    disabled={!!editingTeacher}
                  />
                </div>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={newTeacher.email}
                    onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <PhoneInput
                    country={'nz'}
                    value={newTeacher.phone_country_code + newTeacher.phone}
                    onChange={(phone, country) => {
                      setNewTeacher({
                        ...newTeacher,
                        phone: phone.substring(country.dialCode.length),
                        phone_country_code: '+' + country.dialCode
                      });
                    }}
                    inputProps={{
                      required: true
                    }}
                    containerStyle={{ width: '100%' }}
                    inputStyle={{ width: '100%', height: '42px' }}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Street Address *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newTeacher.street}
                  onChange={(e) => setNewTeacher({ ...newTeacher, street: e.target.value })}
                  placeholder="123 Main Street"
                  required
                />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">City *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newTeacher.city}
                    onChange={(e) => setNewTeacher({ ...newTeacher, city: e.target.value })}
                    placeholder="Auckland"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">State/Region *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newTeacher.state}
                    onChange={(e) => setNewTeacher({ ...newTeacher, state: e.target.value })}
                    placeholder="Auckland Region"
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Country *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newTeacher.country}
                  onChange={(e) => setNewTeacher({ ...newTeacher, country: e.target.value })}
                  placeholder="New Zealand"
                  required
                />
              </div>
              {!editingTeacher && (
                <p className="form-hint">
                  Default password will be set to the staff ID. Teacher can change it after first login.
                </p>
              )}
              <div className="form-actions">
                <button type="button" onClick={() => {
                  setShowTeacherForm(false);
                  setEditingTeacher(null);
                }} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTeacher ? 'Update Teacher' : 'Create Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Desktop table */}
      <div className="card teachers-desktop">
        <SortableTable
          columns={[
            { key: 'staff_id', label: 'Staff ID', sortable: true, sortType: 'string' },
            {
              key: 'name',
              label: 'Name',
              sortable: true,
              sortType: 'string',
              render: (row) => `${row.first_name} ${row.last_name}`
            },
            { key: 'email', label: 'Email', sortable: true },
            {
              key: 'phone',
              label: 'Phone',
              sortable: true,
              render: (row) => row.phone || '-'
            },
            {
              key: 'actions',
              label: 'Actions',
              sortable: false,
              render: (row) => (
                <div className="table-actions">
                  <button onClick={() => handleEditTeacher(row)} className="btn btn-sm btn-secondary">
                    Edit
                  </button>
                  <button onClick={() => handleDeleteTeacher(row.id)} className="btn btn-sm btn-secondary btn-danger">
                    Delete
                  </button>
                </div>
              )
            }
          ]}
          data={teachers}
          searchable={true}
          searchPlaceholder="Search by name, email, or staff ID..."
          searchKeys={['staff_id', 'first_name', 'last_name', 'email']}
          pagination={true}
          pageSize={10}
          emptyMessage="No teachers yet. Create one to get started."
        />
      </div>

      {/* Mobile cards */}
      <div className="admin-mobile-cards teachers-mobile-cards">
        {teachers.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px 0' }}>No teachers yet. Create one to get started.</p>
        ) : (() => {
          const filtered = teachers.filter(t => {
            if (!mobileTeacherSearch) return true;
            const q = mobileTeacherSearch.toLowerCase();
            return `${t.first_name} ${t.last_name}`.toLowerCase().includes(q) || t.staff_id?.toLowerCase().includes(q) || t.email?.toLowerCase().includes(q);
          });
          const totalPages = Math.ceil(filtered.length / mobilePageSize);
          const page = Math.min(mobileTeacherPage, totalPages || 1);
          const paged = filtered.slice((page - 1) * mobilePageSize, page * mobilePageSize);
          return (
            <>
              <div className="mobile-cards-search">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search teachers..."
                  value={mobileTeacherSearch}
                  onChange={(e) => { setMobileTeacherSearch(e.target.value); setMobileTeacherPage(1); }}
                />
              </div>
              {paged.map(t => (
                <div key={t.id} className="admin-mobile-card">
                  <div className="admin-mobile-card-top">
                    <div>
                      <div className="admin-mobile-card-title">{t.first_name} {t.last_name}</div>
                      <div className="admin-mobile-card-sub">ID: {t.staff_id} · {t.email}</div>
                    </div>
                    {t.phone && <div className="admin-mobile-card-badge">{t.phone_country_code || ''}{t.phone}</div>}
                  </div>
                  <div className="admin-mobile-card-actions">
                    <button onClick={() => handleEditTeacher(t)} className="btn btn-sm btn-secondary">Edit</button>
                    <button onClick={() => handleDeleteTeacher(t.id)} className="btn btn-sm btn-secondary btn-danger">Delete</button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '16px 0' }}>No matching teachers</p>}
              {totalPages > 1 && (
                <div className="mobile-cards-pagination">
                  <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setMobileTeacherPage(p => p - 1)}>Previous</button>
                  <span className="mobile-cards-page-info">{page} of {totalPages}</span>
                  <button className="btn btn-sm btn-secondary" disabled={page >= totalPages} onClick={() => setMobileTeacherPage(p => p + 1)}>Next</button>
                </div>
              )}
            </>
          );
        })()}
      </div>
      </>
      )}

      {/* Availability Sub-Tab */}
      {teacherSubTab === 'availability' && (
      <>
        {/* Week Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" style={{ minWidth: '44px', minHeight: '44px', padding: '0 12px' }} onClick={() => {
            const d = new Date(availabilityWeekStart);
            d.setDate(d.getDate() - 14);
            setAvailabilityWeekStart(d);
          }}>← Prev</button>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>
              {availabilityWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {(() => {
                const end = new Date(availabilityWeekStart);
                end.setDate(end.getDate() + 13);
                return end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              })()}
            </span>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>2 weeks</div>
          </div>
          <button className="btn btn-secondary" style={{ minWidth: '44px', minHeight: '44px', padding: '0 12px' }} onClick={() => {
            const d = new Date(availabilityWeekStart);
            d.setDate(d.getDate() + 14);
            setAvailabilityWeekStart(d);
          }}>Next →</button>
        </div>

        {availabilityLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Loading...</div>
        ) : allTeachers.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: '#9ca3af' }}>No active teachers found</p>
          </div>
        ) : (
          <div className="card" style={{ overflow: 'auto' }}>
            {(() => {
              const plannerAware = madrasahProfile?.availability_planner_aware === 1 || madrasahProfile?.availability_planner_aware === true;
              const { schoolDays: pSchoolDays, holidays: pHolidays, overrides: pOverrides } = availabilityPlannerData;

              const getDayInfo = (date) => {
                if (!plannerAware) return { isOff: false, label: '' };
                // Check if date falls outside the active session period
                const activeSession = sessions.find(s => s.is_active);
                if (activeSession) {
                  const sStart = new Date((typeof activeSession.start_date === 'string' ? activeSession.start_date.split('T')[0] : new Date(activeSession.start_date).toISOString().split('T')[0]) + 'T00:00:00');
                  const sEnd = new Date((typeof activeSession.end_date === 'string' ? activeSession.end_date.split('T')[0] : new Date(activeSession.end_date).toISOString().split('T')[0]) + 'T00:00:00');
                  if (date < sStart || date > sEnd) return { isOff: true, label: 'No term' };
                }
                if (pSchoolDays.length === 0) return { isOff: false, label: '' };
                const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                // Holiday check
                const holiday = pHolidays.find(h => {
                  const hs = new Date((h.start_date?.split('T')[0] || h.start_date) + 'T00:00:00');
                  const he = new Date((h.end_date?.split('T')[0] || h.end_date) + 'T00:00:00');
                  return date >= hs && date <= he;
                });
                if (holiday) return { isOff: true, label: holiday.title };
                // Override check
                const override = pOverrides.find(o => {
                  const os = new Date((o.start_date?.split('T')[0] || o.start_date) + 'T00:00:00');
                  const oe = new Date((o.end_date?.split('T')[0] || o.end_date) + 'T00:00:00');
                  return date >= os && date <= oe;
                });
                if (override) {
                  const od = typeof override.school_days === 'string' ? JSON.parse(override.school_days) : override.school_days;
                  if (!od.includes(dayName)) return { isOff: true, label: 'No class' };
                  return { isOff: false, label: '' };
                }
                if (!pSchoolDays.includes(dayName)) return { isOff: true, label: 'No class' };
                return { isOff: false, label: '' };
              };

              return (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 2, padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', minWidth: '120px' }}>Teacher</th>
                  {Array.from({ length: 14 }, (_, i) => {
                    const d = new Date(availabilityWeekStart);
                    d.setDate(d.getDate() + i);
                    const isToday = d.toDateString() === new Date().toDateString();
                    const info = getDayInfo(d);
                    return (
                      <th key={i} style={{
                        padding: '4px 2px',
                        textAlign: 'center',
                        borderBottom: '2px solid #e5e7eb',
                        minWidth: '36px',
                        background: info.isOff ? '#f3f4f6' : isToday ? '#eff6ff' : '#fff',
                        borderLeft: i % 7 === 0 && i > 0 ? '2px solid #e5e7eb' : 'none',
                        opacity: info.isOff ? 0.6 : 1,
                      }} title={info.label || undefined}>
                        <div style={{ fontSize: '10px', color: info.isOff ? '#d1d5db' : '#9ca3af' }}>{d.toLocaleDateString('en-US', { weekday: 'narrow' })}</div>
                        <div style={{ fontSize: '12px', fontWeight: isToday ? 700 : 500, color: info.isOff ? '#9ca3af' : isToday ? 'var(--accent)' : '#374151' }}>{d.getDate()}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {allTeachers.map(teacher => (
                  <tr key={teacher.id}>
                    <td style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 1, padding: '8px 12px', borderBottom: '1px solid #f3f4f6', fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {teacher.first_name} {teacher.last_name}
                    </td>
                    {Array.from({ length: 14 }, (_, i) => {
                      const d = new Date(availabilityWeekStart);
                      d.setDate(d.getDate() + i);
                      const dateStr = d.toISOString().split('T')[0];
                      const record = availabilityData.find(r => r.teacher_id === teacher.id && (r.date === dateStr || r.date?.split('T')[0] === dateStr));
                      const isUnavailable = record?.status === 'unavailable';
                      const isToday = d.toDateString() === new Date().toDateString();
                      const info = getDayInfo(d);
                      return (
                        <td key={i} style={{
                          padding: '4px 2px',
                          textAlign: 'center',
                          borderBottom: '1px solid #f3f4f6',
                          background: info.isOff ? '#f3f4f6' : isUnavailable ? '#fef2f2' : isToday ? '#eff6ff' : 'transparent',
                          borderLeft: i % 7 === 0 && i > 0 ? '2px solid #e5e7eb' : 'none',
                          opacity: info.isOff ? 0.5 : 1,
                        }} title={info.isOff ? info.label : isUnavailable ? `${teacher.first_name}: ${record.reason || 'No reason'}` : ''}>
                          {info.isOff ? (
                            <span style={{ color: '#d1d5db', fontSize: '12px' }}>—</span>
                          ) : isUnavailable ? (
                            <span style={{ color: '#ef4444', fontSize: '16px', cursor: 'default' }} title={record.reason || 'Unavailable'}>✕</span>
                          ) : (
                            <span style={{ color: '#d1d5db' }}>·</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
              );
            })()}

            {/* Legend */}
            <div style={{ display: 'flex', gap: '16px', padding: '12px', fontSize: '12px', color: '#6b7280', borderTop: '1px solid #f3f4f6', flexWrap: 'wrap' }}>
              <span><span style={{ color: '#d1d5db', marginRight: '4px' }}>·</span> Available</span>
              <span><span style={{ color: '#ef4444', marginRight: '4px' }}>✕</span> Unavailable</span>
              {(madrasahProfile?.availability_planner_aware === 1 || madrasahProfile?.availability_planner_aware === true) && availabilityPlannerData.schoolDays.length > 0 && (
                <span><span style={{ color: '#d1d5db', marginRight: '4px' }}>—</span> No class / Holiday</span>
              )}
            </div>
          </div>
        )}

        {/* Unavailable detail list */}
        {!availabilityLoading && availabilityData.filter(r => r.status === 'unavailable').length > 0 && (
          <div className="card" style={{ marginTop: '16px' }}>
            <div className="card-header">Unavailable Days</div>
            <div style={{ padding: 0 }}>
              {availabilityData.filter(r => r.status === 'unavailable').map((item, i, arr) => (
                <div key={item.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 16px',
                  borderBottom: i < arr.length - 1 ? '1px solid #f3f4f6' : 'none',
                }}>
                  <div style={{
                    minWidth: '44px', height: '44px', background: '#fef2f2', borderRadius: '8px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                  }}>
                    <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 500 }}>
                      {new Date((item.date?.split('T')[0] || item.date) + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <span style={{ fontSize: '16px', color: '#dc2626', fontWeight: 700 }}>
                      {new Date((item.date?.split('T')[0] || item.date) + 'T00:00:00').getDate()}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: '14px' }}>{item.first_name} {item.last_name}</div>
                    <div style={{ fontSize: '13px', color: '#9ca3af', fontStyle: item.reason ? 'normal' : 'italic' }}>
                      {item.reason || 'No reason given'}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                    {new Date((item.date?.split('T')[0] || item.date) + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
      )}
    </>
  );
}

export default TeachersSection;
