import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { AcademicCapIcon } from '@heroicons/react/24/outline';
import api from '../../../services/api';
import '../Dashboard.css';
import './CoursesSection.css';

const COLOUR_OPTIONS = [
  { label: 'Teal', value: '#0d9488' },
  { label: 'Blue', value: '#2563eb' },
  { label: 'Purple', value: '#7c3aed' },
  { label: 'Rose', value: '#e11d48' },
  { label: 'Amber', value: '#d97706' },
  { label: 'Green', value: '#16a34a' },
  { label: 'Slate', value: '#475569' },
];

function CoursesSection({ classes, isReadOnly, setConfirmModal }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [units, setUnits] = useState([]);
  const [unitsLoading, setUnitsLoading] = useState(false);

  // Course form
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [courseForm, setCourseForm] = useState({ class_ids: [], name: '', description: '', colour: '#0d9488' });

  // Unit form
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [unitForm, setUnitForm] = useState({ title: '', description: '' });

  const loadCourses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/courses');
      setCourses(res.data || []);
    } catch {
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  const loadUnits = useCallback(async (courseId) => {
    try {
      setUnitsLoading(true);
      const res = await api.get(`/admin/courses/${courseId}/units`);
      setUnits(res.data || []);
    } catch {
      toast.error('Failed to load units');
    } finally {
      setUnitsLoading(false);
    }
  }, []);

  const handleSelectCourse = (course) => {
    setSelectedCourse(course);
    loadUnits(course.id);
    setShowUnitForm(false);
    setEditingUnit(null);
  };

  // --- Course CRUD ---

  const openCreateCourse = () => {
    setEditingCourse(null);
    setCourseForm({ class_ids: [], name: '', description: '', colour: '#0d9488' });
    setShowCourseForm(true);
  };

  const openEditCourse = (course, e) => {
    e.stopPropagation();
    setEditingCourse(course);
    const ids = Array.isArray(course.class_ids) && course.class_ids.length > 0
      ? course.class_ids
      : (course.class_id ? [course.class_id] : []);
    setCourseForm({ class_ids: ids, name: course.name, description: course.description || '', colour: course.colour || '#0d9488' });
    setShowCourseForm(true);
  };

  const toggleClassId = (id) => {
    setCourseForm(f => ({
      ...f,
      class_ids: f.class_ids.includes(id) ? f.class_ids.filter(x => x !== id) : [...f.class_ids, id],
    }));
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    if (isReadOnly()) { toast.error('Account is in read-only mode. Please subscribe to make changes.'); return; }
    if (!courseForm.name.trim()) { toast.error('Course name is required'); return; }
    if (courseForm.class_ids.length === 0) { toast.error('Select at least one class'); return; }
    try {
      if (editingCourse) {
        await api.put(`/admin/courses/${editingCourse.id}`, {
          name: courseForm.name.trim(),
          description: courseForm.description || null,
          colour: courseForm.colour,
          class_ids: courseForm.class_ids,
        });
        toast.success('Course updated');
      } else {
        await api.post('/admin/courses', {
          class_ids: courseForm.class_ids,
          name: courseForm.name.trim(),
          description: courseForm.description || null,
          colour: courseForm.colour,
        });
        toast.success('Course created');
      }
      setShowCourseForm(false);
      setEditingCourse(null);
      await loadCourses();
    } catch {
      toast.error(editingCourse ? 'Failed to update course' : 'Failed to create course');
    }
  };

  const handleDeleteCourse = (course, e) => {
    e.stopPropagation();
    if (isReadOnly()) { toast.error('Account is in read-only mode. Please subscribe to make changes.'); return; }
    setConfirmModal({
      title: 'Delete Course',
      message: `Delete "${course.name}"? All units and progress records will also be removed.`,
      danger: true,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await api.delete(`/admin/courses/${course.id}`);
          toast.success('Course deleted');
          if (selectedCourse?.id === course.id) { setSelectedCourse(null); setUnits([]); }
          await loadCourses();
        } catch {
          toast.error('Failed to delete course');
        }
      },
    });
  };

  const handleToggleCourseActive = async (course, e) => {
    e.stopPropagation();
    if (isReadOnly()) { toast.error('Account is in read-only mode. Please subscribe to make changes.'); return; }
    try {
      await api.put(`/admin/courses/${course.id}`, { is_active: !course.is_active });
      toast.success(course.is_active ? 'Course hidden from teachers' : 'Course shown to teachers');
      await loadCourses();
    } catch {
      toast.error('Failed to update course');
    }
  };

  // --- Unit CRUD ---

  const openCreateUnit = () => {
    setEditingUnit(null);
    setUnitForm({ title: '', description: '' });
    setShowUnitForm(true);
  };

  const openEditUnit = (unit) => {
    setEditingUnit(unit);
    setUnitForm({ title: unit.title, description: unit.description || '' });
    setShowUnitForm(true);
  };

  const handleSaveUnit = async (e) => {
    e.preventDefault();
    if (isReadOnly()) { toast.error('Account is in read-only mode. Please subscribe to make changes.'); return; }
    if (!unitForm.title.trim()) { toast.error('Unit title is required'); return; }
    try {
      if (editingUnit) {
        await api.put(`/admin/courses/${selectedCourse.id}/units/${editingUnit.id}`, {
          title: unitForm.title.trim(),
          description: unitForm.description || null,
        });
        toast.success('Unit updated');
      } else {
        await api.post(`/admin/courses/${selectedCourse.id}/units`, {
          title: unitForm.title.trim(),
          description: unitForm.description || null,
        });
        toast.success('Unit added');
      }
      setShowUnitForm(false);
      setEditingUnit(null);
      await loadUnits(selectedCourse.id);
    } catch {
      toast.error(editingUnit ? 'Failed to update unit' : 'Failed to add unit');
    }
  };

  const handleDeleteUnit = (unit) => {
    if (isReadOnly()) { toast.error('Account is in read-only mode. Please subscribe to make changes.'); return; }
    setConfirmModal({
      title: 'Delete Unit',
      message: `Delete unit "${unit.title}"? Any recorded progress for this unit will also be removed.`,
      danger: true,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await api.delete(`/admin/courses/${selectedCourse.id}/units/${unit.id}`);
          toast.success('Unit deleted');
          await loadUnits(selectedCourse.id);
        } catch {
          toast.error('Failed to delete unit');
        }
      },
    });
  };

  return (
    <>
      <div className="page-header">
        <h2 className="page-title">Courses</h2>
        <button className="btn btn-primary" onClick={openCreateCourse} disabled={classes.length === 0 || isReadOnly()}>
          + New Course
        </button>
      </div>

      {classes.length === 0 && (
        <div className="card">
          <div className="card-body">
            <div className="empty">
              <div className="empty-icon"><AcademicCapIcon /></div>
              <p>Create a class first before adding courses.</p>
            </div>
          </div>
        </div>
      )}

      {/* Course form */}
      {showCourseForm && (
        <div className="card">
          <div className="card-header">{editingCourse ? 'Edit Course' : 'New Course'}</div>
          <div className="card-body">
            <form onSubmit={handleSaveCourse}>
              <div className="form-grid">
                <div className="form-group full">
                  <label className="form-label">Classes <span style={{ fontWeight: 400, color: '#888', fontSize: '0.8rem' }}>(select one or more)</span></label>
                  <div className="cs-class-chips">
                    {classes.map(c => {
                      const selected = courseForm.class_ids.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          className={`cs-class-chip ${selected ? 'selected' : ''}`}
                          onClick={() => toggleClassId(c.id)}
                        >
                          {selected ? '✓ ' : ''}{c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Course Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={courseForm.name}
                    onChange={e => setCourseForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Fiqh, Arabic, Seerah"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description <span style={{ fontWeight: 400, color: '#888', fontSize: '0.8rem' }}>(optional)</span></label>
                  <input
                    type="text"
                    className="form-input"
                    value={courseForm.description}
                    onChange={e => setCourseForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Brief description"
                  />
                </div>
                <div className="form-group full">
                  <label className="form-label">Colour</label>
                  <div className="cs-colour-row">
                    {COLOUR_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        title={opt.label}
                        aria-label={opt.label}
                        onClick={() => setCourseForm(f => ({ ...f, colour: opt.value }))}
                        className={`cs-colour-dot ${courseForm.colour === opt.value ? 'selected' : ''}`}
                        style={{ background: opt.value }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowCourseForm(false); setEditingCourse(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingCourse ? 'Save Changes' : 'Create Course'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Course list */}
      {loading ? (
        <div className="loading-state"><div className="loading-spinner" /></div>
      ) : courses.length === 0 && classes.length > 0 ? (
        <div className="card">
          <div className="card-body">
            <div className="empty">
              <div className="empty-icon"><AcademicCapIcon /></div>
              <p>No courses yet. Add one to get started.</p>
              <button className="empty-action" onClick={openCreateCourse}>+ New Course</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap admin-table-desktop">
            <table className="table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Classes</th>
                  <th>Units</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map(course => (
                  <tr
                    key={course.id}
                    style={{ cursor: 'pointer', background: selectedCourse?.id === course.id ? '#f8fafc' : undefined }}
                    onClick={() => handleSelectCourse(course)}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: course.colour || '#475569', flexShrink: 0 }} />
                        <strong>{course.name}</strong>
                        {course.description && <span style={{ color: '#888', fontWeight: 400, fontSize: '0.85rem' }}>— {course.description}</span>}
                      </div>
                    </td>
                    <td>{course.class_name}</td>
                    <td>{course.unit_count}</td>
                    <td>
                      <span className={`status-badge ${course.is_active ? 'active' : 'inactive'}`}>
                        {course.is_active ? 'Visible' : 'Hidden'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button className="btn btn-sm btn-secondary" onClick={e => openEditCourse(course, e)}>Edit</button>
                        <button className="btn btn-sm btn-secondary" onClick={e => handleToggleCourseActive(course, e)}>
                          {course.is_active ? 'Hide' : 'Show'}
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={e => handleDeleteCourse(course, e)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="admin-mobile-cards">
            {courses.map(course => (
              <div
                key={course.id}
                className="admin-mobile-card"
                style={{ borderLeft: `4px solid ${course.colour || '#475569'}` }}
                onClick={() => handleSelectCourse(course)}
              >
                <div className="admin-mobile-card-main">
                  <div className="admin-mobile-card-name">
                    {course.name}
                    {!course.is_active && <span style={{ marginLeft: 8, fontSize: '0.72rem', color: '#888' }}>(hidden)</span>}
                  </div>
                  <div className="admin-mobile-card-meta">{course.class_name} · {course.unit_count} unit{course.unit_count !== 1 ? 's' : ''}</div>
                </div>
                <div className="admin-mobile-card-actions">
                  <button className="btn btn-sm btn-secondary" onClick={e => openEditCourse(course, e)}>Edit</button>
                  <button className="btn btn-sm btn-secondary" onClick={e => handleToggleCourseActive(course, e)}>{course.is_active ? 'Hide' : 'Show'}</button>
                  <button className="btn btn-sm btn-danger" onClick={e => handleDeleteCourse(course, e)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Units panel — shown below selected course */}
      {selectedCourse && (
        <div className="card" style={{ marginTop: 'var(--md)' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: selectedCourse.colour || '#475569', display: 'inline-block', marginRight: 8 }} />
              {selectedCourse.name} — Curriculum Units
            </span>
            {!showUnitForm && (
              <button className="btn btn-sm btn-primary" onClick={openCreateUnit}>+ Add Unit</button>
            )}
          </div>
          <div className="card-body">
            {/* Unit form */}
            {showUnitForm && (
              <form onSubmit={handleSaveUnit} style={{ marginBottom: 'var(--md)' }}>
                <div className="form-grid">
                  <div className="form-group full">
                    <label className="form-label">Unit Title</label>
                    <input
                      type="text"
                      className="form-input"
                      value={unitForm.title}
                      onChange={e => setUnitForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="e.g. Chapter 1: Introduction to Taharah"
                      autoFocus
                      required
                    />
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Description <span style={{ fontWeight: 400, color: '#888', fontSize: '0.8rem' }}>(optional)</span></label>
                    <input
                      type="text"
                      className="form-input"
                      value={unitForm.description}
                      onChange={e => setUnitForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Brief description"
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowUnitForm(false); setEditingUnit(null); }}>Cancel</button>
                  <button type="submit" className="btn btn-primary">{editingUnit ? 'Save Changes' : 'Save Unit'}</button>
                </div>
              </form>
            )}

            {unitsLoading ? (
              <div className="loading-state"><div className="loading-spinner" /></div>
            ) : units.length === 0 ? (
              <div className="empty">
                <p>No units yet. Add curriculum items above.</p>
                <button className="empty-action" onClick={openCreateUnit}>+ Add Unit</button>
              </div>
            ) : (
              <div>
                {units.map((unit, idx) => (
                  <div key={unit.id} className="cs-unit-row">
                    <div className="cs-unit-num">{idx + 1}</div>
                    <div className="cs-unit-body">
                      <div className="cs-unit-title">{unit.title}</div>
                      {unit.description && <div className="cs-unit-desc">{unit.description}</div>}
                    </div>
                    <div className="cs-unit-actions">
                      <button className="btn btn-sm btn-secondary" onClick={() => openEditUnit(unit)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeleteUnit(unit)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default CoursesSection;
