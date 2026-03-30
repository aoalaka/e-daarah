import { useState } from 'react';
import { toast } from 'sonner';
import { ComputerDesktopIcon } from '@heroicons/react/24/outline';
import api from '../../../services/api';
import { handleApiError } from '../../../utils/errorHandler';
import '../Dashboard.css';

function ClassesSection({ classes, setClasses, teachers, weekDays, isReadOnly, fmtDate, setConfirmModal, madrasahProfile, loadData, setActiveTab }) {
  const [showClassForm, setShowClassForm] = useState(false);
  const [newClass, setNewClass] = useState({ name: '', grade_level: '', school_days: [], description: '' });
  const [editingClass, setEditingClass] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classTeachers, setClassTeachers] = useState([]);
  const [showTeacherAssignment, setShowTeacherAssignment] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (isReadOnly()) { toast.error('Account is in read-only mode. Please subscribe to make changes.'); return; }
    try {
      if (editingClass) {
        await api.put(`/admin/classes/${editingClass.id}`, newClass);
        setEditingClass(null);
        toast.success('Class updated successfully');
      } else {
        await api.post('/admin/classes', newClass);
        toast.success('Class created successfully');
      }
      setShowClassForm(false);
      setNewClass({ name: '', grade_level: '', school_days: [], description: '' });
      loadData();
    } catch (error) {
      handleApiError(error, editingClass ? 'Failed to update class' : 'Failed to create class', () => {
        setActiveTab('settings');
      });
    }
  };

  const handleEditClass = (cls) => {
    let schoolDays = [];
    try {
      if (cls.school_days) {
        schoolDays = typeof cls.school_days === 'string'
          ? JSON.parse(cls.school_days)
          : cls.school_days;
      }
    } catch (e) {
      schoolDays = [];
    }
    setNewClass({
      name: cls.name,
      grade_level: cls.grade_level || '',
      school_days: Array.isArray(schoolDays) ? schoolDays : [],
      description: cls.description || ''
    });
    setEditingClass(cls);
    setShowClassForm(true);
  };

  const handleDeleteClass = (cls) => {
    if (isReadOnly()) { toast.error('Account is in read-only mode. Please subscribe to make changes.'); return; }
    setConfirmModal({ title: 'Delete Class', message: `Are you sure you want to delete "${cls.name}"? Students in this class will be unassigned.`, danger: true, confirmLabel: 'Delete', onConfirm: async () => {
      try { await api.delete(`/admin/classes/${cls.id}`); toast.success('Class deleted successfully'); loadData(); }
      catch (error) { toast.error('Failed to delete class'); }
    }});
  };

  const toggleClassSchoolDay = (day) => {
    setNewClass(prev => ({
      ...prev,
      school_days: prev.school_days.includes(day)
        ? prev.school_days.filter(d => d !== day)
        : [...prev.school_days, day]
    }));
  };

  const handleManageTeachers = async (cls) => {
    setSelectedClass(cls);
    try {
      const response = await api.get(`/admin/classes/${cls.id}/teachers`);
      setClassTeachers(response.data);
      setShowTeacherAssignment(true);
    } catch (error) {
      toast.error('Failed to load teachers');
    }
  };

  const handleAssignTeacher = async () => {
    if (isReadOnly()) { toast.error('Account is in read-only mode. Please subscribe to make changes.'); return; }
    if (!selectedTeacherId) return;
    try {
      await api.post(`/admin/classes/${selectedClass.id}/teachers`, { teacher_id: selectedTeacherId });
      const response = await api.get(`/admin/classes/${selectedClass.id}/teachers`);
      setClassTeachers(response.data);
      setSelectedTeacherId('');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to assign teacher');
    }
  };

  const handleRemoveTeacher = (teacherId) => {
    if (isReadOnly()) { toast.error('Account is in read-only mode. Please subscribe to make changes.'); return; }
    setConfirmModal({ title: 'Remove Teacher', message: 'Remove this teacher from the class?', danger: true, confirmLabel: 'Remove', onConfirm: async () => {
      try { await api.delete(`/admin/classes/${selectedClass.id}/teachers/${teacherId}`); const response = await api.get(`/admin/classes/${selectedClass.id}/teachers`); setClassTeachers(response.data); }
      catch (error) { toast.error('Failed to remove teacher'); }
    }});
  };

  return (
    <>
      <div className="page-header">
        <h2 className="page-title">Classes</h2>
        <button onClick={() => setShowClassForm(!showClassForm)} className="btn btn-primary" disabled={isReadOnly()}>
          + New Class
        </button>
      </div>

      {showClassForm && (
        <div className="card">
          <div className="card-header">{editingClass ? 'Edit Class' : 'Create New Class'}</div>
          <div className="card-body">
            <form onSubmit={handleCreateClass}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Class Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newClass.name}
                    onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                    placeholder="e.g., Junior Boys, Senior Girls"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Grade Level</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newClass.grade_level}
                    onChange={(e) => setNewClass({ ...newClass, grade_level: e.target.value })}
                    placeholder="e.g., Grade 5-6, Grade 7-8"
                  />
                </div>
                <div className="form-group full">
                  <label className="form-label">Description</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newClass.description}
                    onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                    placeholder="Optional description"
                  />
                </div>
                <div className="form-group full">
                  <label className="form-label">School Days</label>
                  <div className="days-grid">
                    {weekDays.map(day => (
                      <button
                        key={day}
                        type="button"
                        className={`day-btn ${newClass.school_days.includes(day) ? 'selected' : ''}`}
                        onClick={() => toggleClassSchoolDay(day)}
                      >
                        {day.substring(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => {
                  setShowClassForm(false);
                  setEditingClass(null);
                  setNewClass({ name: '', grade_level: '', school_days: [], description: '' });
                }} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingClass ? 'Update Class' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="table-wrap admin-table-desktop">
          <table className="table">
            <thead>
              <tr>
                <th>Class Name</th>
                <th>Grade Level</th>
                <th>School Days</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {classes.map(cls => {
                let schoolDays = 'Not set';
                try {
                  if (cls.school_days) {
                    const days = typeof cls.school_days === 'string'
                      ? JSON.parse(cls.school_days)
                      : cls.school_days;
                    schoolDays = Array.isArray(days) ? days.join(', ') : 'Not set';
                  }
                } catch (error) {
                  console.error('Error parsing school_days:', error);
                }

                return (
                  <tr key={cls.id}>
                    <td><strong>{cls.name}</strong></td>
                    <td>{cls.grade_level || 'N/A'}</td>
                    <td>{schoolDays}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button onClick={() => handleEditClass(cls)} className="btn btn-sm btn-secondary">
                          Edit
                        </button>
                        <button onClick={() => handleManageTeachers(cls)} className="btn btn-sm btn-secondary">
                          Teachers
                        </button>
                        <button onClick={() => handleDeleteClass(cls)} className="btn btn-sm btn-danger">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {classes.length === 0 && (
                <tr>
                  <td colSpan="3">
                    <div className="empty">
                      <div className="empty-icon"><ComputerDesktopIcon /></div>
                      <p>No classes yet. Create one to get started.</p>
                      <button className="empty-action" onClick={() => setShowClassForm(true)}>+ Create Class</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Mobile cards for classes */}
        <div className="admin-mobile-cards">
          {classes.map(cls => {
            let schoolDays = 'Not set';
            try {
              if (cls.school_days) {
                const days = typeof cls.school_days === 'string'
                  ? JSON.parse(cls.school_days)
                  : cls.school_days;
                schoolDays = Array.isArray(days) ? days.map(d => d.substring(0, 3)).join(', ') : 'Not set';
              }
            } catch (e) { /* ignore */ }
            return (
              <div key={cls.id} className="admin-mobile-card">
                <div className="admin-mobile-card-top">
                  <div>
                    <div className="admin-mobile-card-title">{cls.name}</div>
                    <div className="admin-mobile-card-sub">{cls.grade_level || 'No grade level'}</div>
                  </div>
                  <div className="admin-mobile-card-badge">{schoolDays}</div>
                </div>
                <div className="admin-mobile-card-actions">
                  <button onClick={() => handleEditClass(cls)} className="btn btn-sm btn-secondary">Edit</button>
                  <button onClick={() => handleManageTeachers(cls)} className="btn btn-sm btn-secondary">Teachers</button>
                  <button onClick={() => handleDeleteClass(cls)} className="btn btn-sm btn-danger">Delete</button>
                </div>
              </div>
            );
          })}
          {classes.length === 0 && (
            <div className="empty"><p>No classes yet. Create one to get started.</p><button className="empty-action" onClick={() => setShowClassForm(true)}>+ Create Class</button></div>
          )}
        </div>
      </div>

      {/* Teacher Assignment Modal */}
      {showTeacherAssignment && selectedClass && (
        <div className="modal-overlay" onClick={() => setShowTeacherAssignment(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Manage Teachers - {selectedClass.name}</h3>
              <button onClick={() => setShowTeacherAssignment(false)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <h4 style={{ fontSize: '14px', marginBottom: 'var(--sm)' }}>Assigned Teachers</h4>
              {classTeachers.length > 0 ? (
                <div className="teacher-list">
                  {classTeachers.map(teacher => (
                    <div key={teacher.id} className="teacher-item">
                      <span>{teacher.first_name} {teacher.last_name} ({teacher.staff_id})</span>
                      <button
                        onClick={() => handleRemoveTeacher(teacher.id)}
                        className="btn btn-sm btn-danger"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--muted)', marginBottom: 'var(--md)' }}>No teachers assigned yet</p>
              )}

              <h4 style={{ fontSize: '14px', marginBottom: 'var(--sm)' }}>Assign New Teacher</h4>
              <div style={{ display: 'flex', gap: 'var(--sm)' }}>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="form-select"
                  style={{ flex: 1 }}
                >
                  <option value="">Select a teacher...</option>
                  {teachers
                    .filter(t => !classTeachers.some(ct => ct.id === t.id))
                    .map(teacher => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.first_name} {teacher.last_name} ({teacher.staff_id})
                      </option>
                    ))
                  }
                </select>
                <button
                  onClick={handleAssignTeacher}
                  className="btn btn-primary"
                  disabled={!selectedTeacherId}
                >
                  Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ClassesSection;
