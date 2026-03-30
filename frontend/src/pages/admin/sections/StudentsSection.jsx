import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import {
  ArrowDownTrayIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';
import SortableTable from '../../../components/SortableTable';
import { handleApiError } from '../../../utils/errorHandler';
import { downloadCSV, studentColumns, getDateSuffix } from '../../../utils/csvExport';
import '../Dashboard.css';

function StudentsSection({ students, setStudents, classes, sessions, semesters, madrasahProfile, isReadOnly, hasPlusAccess, fmtDate, setConfirmModal, loadData, setActiveTab }) {
  const { madrasahSlug } = useParams();
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showBulkEnrollment, setShowBulkEnrollment] = useState(false);
  const [bulkEnrollmentDate, setBulkEnrollmentDate] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadClass, setUploadClass] = useState('');
  const [uploadResults, setUploadResults] = useState(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [newStudent, setNewStudent] = useState({
    first_name: '', last_name: '', student_id: '', gender: '', class_id: '', enrollment_date: '',
    student_phone: '', student_phone_country_code: '+64',
    street: '', city: '', state: '', country: '',
    parent_guardian_name: '', parent_guardian_relationship: '',
    parent_guardian_phone: '', parent_guardian_phone_country_code: '+64', notes: '',
    expected_fee: '', fee_note: ''
  });
  const [studentSubTab, setStudentSubTab] = useState('list');
  const [applications, setApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [pendingAppCount, setPendingAppCount] = useState(0);
  const [approveModal, setApproveModal] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [mobileStudentSearch, setMobileStudentSearch] = useState('');
  const [mobileStudentPage, setMobileStudentPage] = useState(1);
  const mobilePageSize = 10;
  const [classFilter, setClassFilter] = useState('');
  const [studentsSubTab, setStudentsSubTab] = useState('manage');
  const [promotionStep, setPromotionStep] = useState(1);
  const [promotionSourceClass, setPromotionSourceClass] = useState('');
  const [promotionDestClass, setPromotionDestClass] = useState('');
  const [promotionType, setPromotionType] = useState('promoted');
  const [promotionNotes, setPromotionNotes] = useState('');
  const [promotionSession, setPromotionSession] = useState('');
  const [promotionSelected, setPromotionSelected] = useState([]);
  const [promotionHistory, setPromotionHistory] = useState([]);
  const [promotionSubTab, setPromotionSubTab] = useState('promote');
  const [promotionSaving, setPromotionSaving] = useState(false);

  const filteredStudents = useMemo(() => {
    if (!classFilter) return students;
    if (classFilter === '__unassigned__') return students.filter(s => !s.class_id && !s.is_dropout);
    if (classFilter === '__dropout__') return students.filter(s => !!s.is_dropout);
    return students.filter(s => String(s.class_id) === classFilter);
  }, [students, classFilter]);

  // Fetch applications when Applications sub-tab is active
  useEffect(() => {
    if (studentSubTab === 'applications' && madrasahProfile) {
      fetchApplications();
    }
  }, [studentSubTab, madrasahProfile]);

  // Fetch pending application count on load
  useEffect(() => {
    if (madrasahProfile) fetchPendingAppCount();
  }, [madrasahProfile]);

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    if (isReadOnly()) { toast.error('Account is in read-only mode. Please subscribe to make changes.'); return; }
    try {
      if (editingStudent) {
        await api.put(`/admin/students/${editingStudent.id}`, newStudent);
        toast.success('Student updated');
        setEditingStudent(null);
      } else {
        await api.post('/admin/students', newStudent);
        toast.success('Student created');
      }
      setShowStudentForm(false);
      setNewStudent({
        first_name: '', last_name: '', student_id: '', gender: '', class_id: '', enrollment_date: '',
        student_phone: '', student_phone_country_code: '+64',
        street: '', city: '', state: '', country: '',
        parent_guardian_name: '', parent_guardian_relationship: '',
        parent_guardian_phone: '', parent_guardian_phone_country_code: '+64', notes: '',
        expected_fee: '', fee_note: ''
      });
      loadData();
    } catch (error) {
      handleApiError(error, 'Failed to save student', () => {
        setActiveTab('settings');
      });
    }
  };

  const handleEditStudent = (student) => {
    setEditingStudent(student);
    setNewStudent({
      first_name: student.first_name,
      last_name: student.last_name,
      student_id: student.student_id,
      gender: student.gender || '',
      class_id: student.class_id || '',
      enrollment_date: student.enrollment_date ? student.enrollment_date.split('T')[0] : '',
      student_phone: student.student_phone || '',
      student_phone_country_code: student.student_phone_country_code || '+64',
      street: student.street || '',
      city: student.city || '',
      state: student.state || '',
      country: student.country || '',
      parent_guardian_name: student.parent_guardian_name || '',
      parent_guardian_relationship: student.parent_guardian_relationship || '',
      parent_guardian_phone: student.parent_guardian_phone || '',
      parent_guardian_phone_country_code: student.parent_guardian_phone_country_code || '+64',
      notes: student.notes || '',
      expected_fee: student.expected_fee != null ? String(student.expected_fee) : '',
      fee_note: student.fee_note || ''
    });
    setShowStudentForm(true);
  };

  const handleDeleteStudent = (id) => {
    if (isReadOnly()) { toast.error('Account is in read-only mode. Please subscribe to make changes.'); return; }
    setConfirmModal({ title: 'Delete Student', message: 'Are you sure you want to delete this student?', danger: true, confirmLabel: 'Delete', onConfirm: async () => {
      try { await api.delete(`/admin/students/${id}`); loadData(); }
      catch (error) { toast.error('Failed to delete student'); }
    }});
  };

  const handleBulkDeleteStudents = () => {
    if (isReadOnly()) { toast.error('Account is in read-only mode. Please subscribe to make changes.'); return; }
    if (selectedStudentIds.length === 0) return;
    const count = selectedStudentIds.length;
    setConfirmModal({ title: 'Delete Students', message: `Are you sure you want to delete ${count} student${count > 1 ? 's' : ''}?`, danger: true, confirmLabel: 'Delete', onConfirm: async () => {
      try { await api.post('/admin/students/bulk-delete', { ids: selectedStudentIds }); setSelectedStudentIds([]); loadData(); toast.success(`${count} student(s) deleted`); }
      catch (error) { toast.error('Failed to delete students'); }
    }});
  };

  const handleBulkEnrollmentDate = async () => {
    if (!bulkEnrollmentDate) { toast.error('Please select a date'); return; }
    try {
      const res = await api.put('/admin/students/bulk-enrollment-date', { enrollment_date: bulkEnrollmentDate });
      toast.success(res.data.message);
      setShowBulkEnrollment(false);
      setBulkEnrollmentDate('');
      loadData();
    } catch (error) { toast.error(error.response?.data?.error || 'Failed to update enrollment dates'); }
  };

  const handleResetParentPin = (student) => {
    if (isReadOnly()) { toast.error('Account is in read-only mode. Please subscribe to make changes.'); return; }
    setConfirmModal({ title: 'Reset Parent Account', message: `Reset the parent portal account for ${student.first_name} ${student.last_name}? The parent will need to set up a new PIN on the login page.`, confirmLabel: 'Reset', onConfirm: async () => {
      try {
        const response = await api.post(`/admin/students/${student.id}/reset-parent-pin`);
        toast.success(response.data.message);
      } catch (error) { toast.error(error.response?.data?.error || 'Failed to reset parent account'); }
    }});
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (isReadOnly()) { toast.error('Account is in read-only mode. Please subscribe to make changes.'); return; }
    if (!uploadFile) {
      toast.error('Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadFile);
    if (uploadClass) {
      formData.append('class_id', uploadClass);
    }

    try {
      const response = await api.post('/upload/students/bulk', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadResults(response.data);
      setUploadFile(null);
      setUploadClass('');
      // Reset the file input element
      const fileInput = e.target.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';
      loadData();
      const { created = 0, updated = 0, failed = 0 } = response.data;
      const parts = [];
      if (created > 0) parts.push(`${created} created`);
      if (updated > 0) parts.push(`${updated} updated`);
      if (failed > 0) parts.push(`${failed} failed`);
      toast.success(`Upload complete: ${parts.join(', ')}`);
    } catch (error) {
      console.error('Bulk upload error:', error.response?.data);

      // Show validation errors if present
      if (error.response?.data?.details) {
        const errorList = error.response.data.details.slice(0, 5); // Show first 5 errors
        const errorMessage = errorList.join('\n');
        toast.error(
          `Validation failed:\n${errorMessage}${error.response.data.details.length > 5 ? '\n...and more' : ''}`,
          { duration: 8000 }
        );
      } else {
        const errorMessage = error.response?.data?.error || 'Failed to upload file';
        toast.error(errorMessage);

        // Check if it's a billing limit error
        if (error.response?.status === 403) {
          handleApiError(error, errorMessage, () => {
            setShowBulkUpload(false);
            setActiveTab('settings');
          });
        }
      }
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await api.get('/upload/students/template', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'student_upload_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Failed to download template');
    }
  };

  const fetchApplications = async () => {
    setApplicationsLoading(true);
    try {
      const response = await api.get('/admin/student-applications?status=pending');
      setApplications(response.data);
    } catch (error) {
      // Table may not exist yet
    } finally {
      setApplicationsLoading(false);
    }
  };

  const fetchPendingAppCount = async () => {
    try {
      const response = await api.get('/admin/student-applications/count');
      setPendingAppCount(response.data.count);
    } catch (error) {
      // Silently fail
    }
  };

  const handleApproveApplication = async (applicationId, studentId, classId, expectedFee, feeNote) => {
    try {
      await api.post(`/admin/student-applications/${applicationId}/approve`, {
        student_id: studentId,
        class_id: classId || null,
        expected_fee: expectedFee || null,
        fee_note: feeNote || null,
      });
      toast.success('Application approved — student created');
      setApproveModal(null);
      fetchApplications();
      fetchPendingAppCount();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to approve');
    }
  };

  const handleRejectApplication = async (id) => {
    try {
      await api.post(`/admin/student-applications/${id}/reject`);
      toast.success('Application rejected');
      fetchApplications();
      fetchPendingAppCount();
    } catch (error) {
      toast.error('Failed to reject application');
    }
  };

  return (
    <>
      <div className="page-header">
        <h2 className="page-title">Students</h2>
        {studentSubTab === 'list' && (
        <div style={{ display: 'flex', gap: 'var(--sm)', flexWrap: 'wrap' }}>
          {hasPlusAccess() && (
            <button
              onClick={() => {
                const className = classFilter && classFilter !== '__unassigned__' && classFilter !== '__dropout__'
                  ? classes.find(c => String(c.id) === classFilter)?.name?.toLowerCase().replace(/\s+/g, '-')
                  : classFilter === '__unassigned__' ? 'unassigned' : classFilter === '__dropout__' ? 'dropout' : '';
                const suffix = className ? `-${className}` : '';
                downloadCSV(filteredStudents, studentColumns, `students${suffix}-${getDateSuffix()}`);
              }}
              className="btn btn-secondary"
              disabled={students.length === 0}
            >
              Export CSV
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="btn btn-secondary"
            disabled={filteredStudents.length === 0}
          >
            Print
          </button>
          {hasPlusAccess() && (
            <button onClick={() => {
              setShowBulkUpload(!showBulkUpload);
              setShowStudentForm(false);
              setUploadResults(null);
            }} className="btn btn-secondary">
              Bulk Upload
            </button>
          )}
          <button onClick={() => { setShowBulkEnrollment(!showBulkEnrollment); }} className="btn btn-secondary" disabled={isReadOnly()}>
            Set Enrollment Date
          </button>
          <button onClick={async () => {
            setEditingStudent(null);
            let nextId = '';
            if (!showStudentForm) {
              try { const res = await api.get('/admin/next-student-id'); nextId = res.data.student_id; } catch(e) {}
            }
            setNewStudent({
              first_name: '', last_name: '', student_id: nextId, gender: '', class_id: '', enrollment_date: '',
              student_phone: '', student_phone_country_code: '+64',
              street: '', city: '', state: '', country: '',
              parent_guardian_name: '', parent_guardian_relationship: '',
              parent_guardian_phone: '', parent_guardian_phone_country_code: '+64', notes: '',
              expected_fee: '', fee_note: ''
            });
            setShowStudentForm(!showStudentForm);
            setShowBulkUpload(false);
          }} className="btn btn-primary" disabled={isReadOnly()}>
            + New Student
          </button>
        </div>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="no-print" style={{ display: 'flex', gap: '0', marginBottom: 'var(--md)', borderBottom: '2px solid #e5e7eb' }}>
        {[{ id: 'list', label: 'Student List' }, { id: 'applications', label: 'Applications', count: pendingAppCount }].map(tab => (
          <button
            key={tab.id}
            onClick={() => setStudentSubTab(tab.id)}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: studentSubTab === tab.id ? 600 : 400,
              color: studentSubTab === tab.id ? 'var(--accent)' : '#6b7280',
              background: 'none',
              border: 'none',
              borderBottom: studentSubTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: '-2px',
              cursor: 'pointer',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span style={{
                background: '#ef4444',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 700,
                borderRadius: '10px',
                padding: '1px 7px',
                minWidth: '18px',
                textAlign: 'center',
              }}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Enrollment link */}
      {studentSubTab === 'applications' && (
        <div className="info-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sm)', flexWrap: 'wrap', padding: '12px 16px', background: '#fafafa', borderRadius: '8px', fontSize: '13px', color: '#525252', marginBottom: 'var(--md)' }}>
          <span>Share this link for public enrollment:</span>
          <code
            style={{ padding: '4px 10px', background: '#f0f0f0', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', userSelect: 'all' }}
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/${madrasahSlug}/enroll`);
              toast.success('Link copied');
            }}
          >
            {window.location.origin}/{madrasahSlug}/enroll
          </code>
        </div>
      )}

      {studentSubTab === 'list' && (
      <>
      {/* Bulk set enrollment date */}
      {showBulkEnrollment && (
        <div className="card" style={{ marginBottom: '16px', padding: '16px' }}>
          <p style={{ margin: '0 0 8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
            Set the enrollment date for all students. This affects fee calculations — students are only charged from their enrollment date onwards.
          </p>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="date" className="form-input" style={{ maxWidth: '200px' }} value={bulkEnrollmentDate}
              onChange={(e) => setBulkEnrollmentDate(e.target.value)} />
            <button className="btn btn-primary" onClick={handleBulkEnrollmentDate} disabled={!bulkEnrollmentDate}>
              Apply to All Students
            </button>
            <button className="btn btn-secondary" onClick={() => { setShowBulkEnrollment(false); setBulkEnrollmentDate(''); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Students Sub-Tabs */}
      <div className="report-tabs no-print">
        <nav className="report-tabs-nav">
          <button className={`report-tab-btn ${studentsSubTab === 'manage' ? 'active' : ''}`} onClick={() => setStudentsSubTab('manage')}>
            Manage
          </button>
          <button className={`report-tab-btn ${studentsSubTab === 'promotion' ? 'active' : ''}`} onClick={() => setStudentsSubTab('promotion')}>
            Student Status
          </button>
        </nav>
      </div>

      {studentsSubTab === 'manage' && (
      <>
      {/* Class filter */}
      <div className="no-print" style={{ display: 'flex', gap: 'var(--sm)', alignItems: 'center', marginBottom: 'var(--md)', flexWrap: 'wrap' }}>
        <label style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>Filter by class:</label>
        <select
          className="form-input"
          style={{ maxWidth: '220px', fontSize: '13px' }}
          value={classFilter}
          onChange={(e) => { setClassFilter(e.target.value); setMobileStudentPage(1); }}
        >
          <option value="">All Students</option>
          {classes.map(cls => (
            <option key={cls.id} value={String(cls.id)}>{cls.name}</option>
          ))}
          <option value="__unassigned__">Unassigned</option>
          <option value="__dropout__">Dropout</option>
        </select>
        {classFilter && (
          <span style={{ fontSize: '13px', color: '#6b7280' }}>
            {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {showBulkUpload && (
        <div className="card">
          <div className="card-header">Bulk Upload Students</div>
          <div className="card-body">
            <div className="upload-template-banner" onClick={downloadTemplate}>
              <div className="upload-template-icon">
                <ArrowDownTrayIcon width={20} height={20} />
              </div>
              <div className="upload-template-text">
                <strong>Download CSV template</strong>
                <span>Start here — fill in the template, then upload it below</span>
              </div>
              <ChevronRightIcon width={16} height={16} style={{ opacity: 0.4, flexShrink: 0 }} />
            </div>
            <div className="upload-info">
              <p style={{ margin: 0, fontSize: 13, color: '#666' }}>
                <strong>Required:</strong> first_name, last_name, gender ·
                <strong> Optional:</strong> class, student_id, email, phone, parent details, notes
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#999' }}>
                Gender must be Male or Female. Classes are auto-created if they don't exist yet. If student_id is provided it will be used as-is, otherwise auto-generated. Re-uploading the same file will update existing students instead of creating duplicates. The dropdown below is a fallback for rows without a class column value.
              </p>
            </div>

            <form onSubmit={handleBulkUpload}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Select File (CSV or Excel)</label>
                  <input
                    type="file"
                    className="form-input"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Assign to Class (Optional)</label>
                  <select
                    className="form-select"
                    value={uploadClass}
                    onChange={(e) => setUploadClass(e.target.value)}
                  >
                    <option value="">No class assignment</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => {
                  setShowBulkUpload(false);
                  setUploadFile(null);
                  setUploadResults(null);
                }} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={!uploadFile}>Upload Students</button>
              </div>
            </form>

            {uploadResults && (
              <div className={`upload-results ${uploadResults.failed > 0 ? 'warning' : 'success'}`}>
                <h4>Upload Results</h4>
                <p>
                  Total: {uploadResults.total} |
                  Created: {uploadResults.created || 0} |
                  Updated: {uploadResults.updated || 0} |
                  Failed: {uploadResults.failed}
                </p>

                {uploadResults.results.success.length > 0 && (
                  <details open>
                    <summary>Successful ({uploadResults.results.success.length})</summary>
                    <ul>
                      {uploadResults.results.success.map((s, i) => (
                        <li key={i}>{s.name} — ID: {s.student_id}{s.updated ? ' (updated)' : ''}</li>
                      ))}
                    </ul>
                  </details>
                )}

                {uploadResults.results.failed.length > 0 && (
                  <details>
                    <summary>Failed Uploads ({uploadResults.results.failed.length})</summary>
                    <ul>
                      {uploadResults.results.failed.map((f, i) => (
                        <li key={i}>{f.name} - {f.error}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showStudentForm && (
        <div className="card">
          <div className="card-header">{editingStudent ? 'Edit Student' : 'Create New Student'}</div>
          <div className="card-body">
            <form onSubmit={handleCreateStudent}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newStudent.first_name}
                    onChange={(e) => setNewStudent({ ...newStudent, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newStudent.last_name}
                    onChange={(e) => setNewStudent({ ...newStudent, last_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Student ID (3-10 digits)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newStudent.student_id}
                    onChange={(e) => setNewStudent({ ...newStudent, student_id: e.target.value })}
                    pattern="\d{3,10}"
                    maxLength="10"
                    placeholder="001"
                    required
                    disabled={!!editingStudent}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select
                    className="form-select"
                    value={newStudent.gender}
                    onChange={(e) => setNewStudent({ ...newStudent, gender: e.target.value })}
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="form-group full">
                  <label className="form-label">Assign to Class</label>
                  <select
                    className="form-select"
                    value={newStudent.class_id}
                    onChange={(e) => setNewStudent({ ...newStudent, class_id: e.target.value })}
                  >
                    <option value="">None (Unassigned)</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Enrollment Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={newStudent.enrollment_date}
                    onChange={(e) => setNewStudent({ ...newStudent, enrollment_date: e.target.value })}
                  />
                </div>
              </div>

              <h4 style={{ fontSize: '14px', margin: 'var(--lg) 0 var(--md)', color: 'var(--dark)' }}>
                Student Contact Information
              </h4>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Student Phone (Optional)</label>
                  <PhoneInput
                    country={'nz'}
                    value={newStudent.student_phone_country_code + newStudent.student_phone}
                    onChange={(phone, country) => {
                      setNewStudent({
                        ...newStudent,
                        student_phone: phone.substring(country.dialCode.length),
                        student_phone_country_code: '+' + country.dialCode
                      });
                    }}
                    containerStyle={{ width: '100%' }}
                    inputStyle={{ width: '100%', height: '42px' }}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Street Address (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={newStudent.street}
                  onChange={(e) => setNewStudent({ ...newStudent, street: e.target.value })}
                  placeholder="123 Main Street"
                />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">City (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newStudent.city}
                    onChange={(e) => setNewStudent({ ...newStudent, city: e.target.value })}
                    placeholder="Auckland"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">State/Region (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newStudent.state}
                    onChange={(e) => setNewStudent({ ...newStudent, state: e.target.value })}
                    placeholder="Auckland Region"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Country (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={newStudent.country}
                  onChange={(e) => setNewStudent({ ...newStudent, country: e.target.value })}
                  placeholder="New Zealand"
                />
              </div>

              <h4 style={{ fontSize: '14px', margin: 'var(--lg) 0 var(--md)', color: 'var(--dark)' }}>
                Parent/Guardian Information
              </h4>
              <div className="form-grid form-grid-3">
                <div className="form-group">
                  <label className="form-label">Parent/Guardian Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newStudent.parent_guardian_name}
                    onChange={(e) => setNewStudent({ ...newStudent, parent_guardian_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Relationship *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newStudent.parent_guardian_relationship}
                    onChange={(e) => setNewStudent({ ...newStudent, parent_guardian_relationship: e.target.value })}
                    placeholder="Mother, Father, Guardian, etc."
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <PhoneInput
                    country={'nz'}
                    value={newStudent.parent_guardian_phone_country_code + newStudent.parent_guardian_phone}
                    onChange={(phone, country) => {
                      setNewStudent({
                        ...newStudent,
                        parent_guardian_phone: phone.substring(country.dialCode.length),
                        parent_guardian_phone_country_code: '+' + country.dialCode
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
              {madrasahProfile?.enable_fee_tracking && madrasahProfile?.fee_tracking_mode !== 'auto' && (
                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Expected Fee</label>
                    <input type="number" className="form-input" step="0.01" min="0"
                      value={newStudent.expected_fee}
                      onChange={(e) => setNewStudent({ ...newStudent, expected_fee: e.target.value })}
                      placeholder="e.g. 500.00"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fee Note</label>
                    <input type="text" className="form-input"
                      value={newStudent.fee_note}
                      onChange={(e) => setNewStudent({ ...newStudent, fee_note: e.target.value })}
                      placeholder="e.g. Scholarship 50%"
                    />
                  </div>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-textarea"
                  value={newStudent.notes}
                  onChange={(e) => setNewStudent({ ...newStudent, notes: e.target.value })}
                  rows="3"
                  placeholder="Any additional information..."
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => {
                  setShowStudentForm(false);
                  setEditingStudent(null);
                }} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingStudent ? 'Update Student' : 'Create Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print header — only visible when printing */}
      <div className="students-print-header">
        <h2>{madrasahProfile?.name || 'Student List'}</h2>
        <p>
          {classFilter
            ? classFilter === '__unassigned__' ? 'Unassigned Students'
            : classFilter === '__dropout__' ? 'Dropout Students'
            : `Class: ${classes.find(c => String(c.id) === classFilter)?.name || ''}`
            : 'All Students'}
          {' — '}{filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Desktop table */}
      <div className="card students-desktop">
        {selectedStudentIds.length > 0 && (
          <div className="table-selection-bar">
            <span>{selectedStudentIds.length} student{selectedStudentIds.length > 1 ? 's' : ''} selected</span>
            <div className="selection-actions">
              <button className="btn-selection-clear" onClick={() => setSelectedStudentIds([])}>Clear</button>
              <button className="btn-selection-delete" onClick={handleBulkDeleteStudents}>Delete selected</button>
            </div>
          </div>
        )}
        <SortableTable
          columns={[
            { key: 'student_id', label: 'ID', sortable: true, sortType: 'string' },
            {
              key: 'name',
              label: 'Name',
              sortable: true,
              sortType: 'string',
              render: (row) => `${row.first_name} ${row.last_name}`
            },
            { key: 'gender', label: 'Gender', sortable: true },
            {
              key: 'class_name',
              label: 'Class',
              sortable: true,
              render: (row) => (
                <select
                  className={`inline-class-select${row.is_dropout ? ' is-dropout' : ''}`}
                  value={row.is_dropout ? '__dropout__' : (row.class_id || '')}
                  onClick={(e) => e.stopPropagation()}
                  onChange={async (e) => {
                    const val = e.target.value;
                    if (val === '__dropout__') {
                      setConfirmModal({
                        title: 'Mark as Dropout',
                        message: `Mark ${row.first_name} ${row.last_name} as dropped out? They will be removed from their class and recorded as a dropout.`,
                        danger: true,
                        confirmLabel: 'Mark as Dropout',
                        onConfirm: async () => {
                          try {
                            await api.post('/admin/promotion/promote', {
                              promotions: [{
                                student_id: row.id,
                                from_class_id: row.class_id || null,
                                to_class_id: null,
                                type: 'dropped_out',
                                notes: 'Marked as dropout from student list'
                              }]
                            });
                            setStudents(prev => prev.map(s =>
                              s.id === row.id ? { ...s, class_id: null, class_name: null, is_dropout: 1 } : s
                            ));
                            toast.success(`${row.first_name} ${row.last_name} marked as dropped out`);
                          } catch (err) {
                            toast.error('Failed to mark as dropout');
                          }
                        }
                      });
                      return;
                    }
                    const newClassId = val || null;
                    const newClassName = classes.find(c => String(c.id) === String(newClassId))?.name || null;
                    setStudents(prev => prev.map(s =>
                      s.id === row.id ? { ...s, class_id: newClassId ? Number(newClassId) : null, class_name: newClassName, is_dropout: 0 } : s
                    ));
                    try {
                      await api.patch(`/admin/students/${row.id}/class`, { class_id: newClassId });
                    } catch (err) {
                      setStudents(prev => prev.map(s =>
                        s.id === row.id ? { ...s, class_id: row.class_id, class_name: row.class_name, is_dropout: row.is_dropout } : s
                      ));
                      toast.error('Failed to update class');
                    }
                  }}
                >
                  <option value="">Unassigned</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                  <option disabled>──────────</option>
                  <option value="__dropout__">Dropout</option>
                </select>
              )
            },
            {
              key: 'parent_guardian_name',
              label: 'Parent/Guardian',
              sortable: true,
              render: (row) => row.parent_guardian_name ? (
                <span>{row.parent_guardian_name} ({row.parent_guardian_relationship || 'N/A'})</span>
              ) : (
                <span style={{ color: 'var(--muted)' }}>-</span>
              )
            },
            {
              key: 'parent_guardian_phone',
              label: 'Parent/Guardian Phone',
              sortable: false,
              render: (row) => row.parent_guardian_phone ? (
                <span>{row.parent_guardian_phone_country_code || ''}{row.parent_guardian_phone}</span>
              ) : (
                <span style={{ color: 'var(--muted)' }}>-</span>
              )
            },
            {
              key: 'actions',
              label: 'Actions',
              sortable: false,
              render: (row) => (
                <div className="table-actions">
                  {hasPlusAccess() && (
                    <button onClick={() => handleResetParentPin(row)} className="btn btn-sm btn-secondary" title="Reset parent PIN">
                      🔑
                    </button>
                  )}
                  <button onClick={() => handleEditStudent(row)} className="btn btn-sm btn-secondary">
                    Edit
                  </button>
                  <button onClick={() => handleDeleteStudent(row.id)} className="btn btn-sm btn-secondary btn-danger">
                    Delete
                  </button>
                </div>
              )
            }
          ]}
          data={filteredStudents}
          searchable={true}
          searchPlaceholder="Search by name, student ID, or class..."
          searchKeys={['student_id', 'first_name', 'last_name', 'class_name', 'parent_guardian_name']}
          pagination={true}
          pageSize={25}
          emptyMessage={classFilter ? 'No students match this filter.' : 'No students yet. Create one to get started.'}
          selectable={true}
          selectedIds={selectedStudentIds}
          onSelectionChange={setSelectedStudentIds}
        />
      </div>

      {/* Mobile cards */}
      <div className="admin-mobile-cards students-mobile-cards">
        {filteredStudents.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px 0' }}>{classFilter ? 'No students match this filter.' : 'No students yet. Create one to get started.'}</p>
        ) : (() => {
          const filtered = filteredStudents.filter(s => {
            if (!mobileStudentSearch) return true;
            const q = mobileStudentSearch.toLowerCase();
            return `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) || s.student_id?.toLowerCase().includes(q) || s.class_name?.toLowerCase().includes(q) || s.parent_guardian_name?.toLowerCase().includes(q);
          });
          const totalPages = Math.ceil(filtered.length / mobilePageSize);
          const page = Math.min(mobileStudentPage, totalPages || 1);
          const paged = filtered.slice((page - 1) * mobilePageSize, page * mobilePageSize);
          return (
            <>
              <div className="mobile-cards-search">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search students..."
                  value={mobileStudentSearch}
                  onChange={(e) => { setMobileStudentSearch(e.target.value); setMobileStudentPage(1); }}
                />
              </div>
              {paged.map(s => (
                <div key={s.id} className="admin-mobile-card">
                  <div className="admin-mobile-card-top">
                    <div style={{ flex: 1 }}>
                      <div className="admin-mobile-card-title">{s.first_name} {s.last_name}</div>
                      <div className="admin-mobile-card-sub">
                        {s.student_id} · {s.gender || '-'} ·{' '}
                        <select
                          className={`inline-class-select${s.is_dropout ? ' is-dropout' : ''}`}
                          value={s.is_dropout ? '__dropout__' : (s.class_id || '')}
                          onClick={(e) => e.stopPropagation()}
                          onChange={async (e) => {
                            const val = e.target.value;
                            if (val === '__dropout__') {
                              setConfirmModal({
                                title: 'Mark as Dropout',
                                message: `Mark ${s.first_name} ${s.last_name} as dropped out? They will be removed from their class and recorded as a dropout.`,
                                danger: true,
                                confirmLabel: 'Mark as Dropout',
                                onConfirm: async () => {
                                  try {
                                    await api.post('/admin/promotion/promote', {
                                      promotions: [{
                                        student_id: s.id,
                                        from_class_id: s.class_id || null,
                                        to_class_id: null,
                                        type: 'dropped_out',
                                        notes: 'Marked as dropout from student list'
                                      }]
                                    });
                                    setStudents(prev => prev.map(st =>
                                      st.id === s.id ? { ...st, class_id: null, class_name: null, is_dropout: 1 } : st
                                    ));
                                    toast.success(`${s.first_name} ${s.last_name} marked as dropped out`);
                                  } catch (err) {
                                    toast.error('Failed to mark as dropout');
                                  }
                                }
                              });
                              return;
                            }
                            const newClassId = val || null;
                            const newClassName = classes.find(c => String(c.id) === String(newClassId))?.name || null;
                            setStudents(prev => prev.map(st =>
                              st.id === s.id ? { ...st, class_id: newClassId ? Number(newClassId) : null, class_name: newClassName, is_dropout: 0 } : st
                            ));
                            try {
                              await api.patch(`/admin/students/${s.id}/class`, { class_id: newClassId });
                            } catch (err) {
                              setStudents(prev => prev.map(st =>
                                st.id === s.id ? { ...st, class_id: s.class_id, class_name: s.class_name, is_dropout: s.is_dropout } : st
                              ));
                              toast.error('Failed to update class');
                            }
                          }}
                        >
                          <option value="">Unassigned</option>
                          {classes.map(cls => (
                            <option key={cls.id} value={cls.id}>{cls.name}</option>
                          ))}
                          <option disabled>──────────</option>
                          <option value="__dropout__">Dropout</option>
                        </select>
                      </div>
                      {s.parent_guardian_name && (
                        <div className="admin-mobile-card-sub" style={{ marginTop: '4px' }}>
                          {s.parent_guardian_name} ({s.parent_guardian_relationship || 'N/A'})
                          {s.parent_guardian_phone && ` · ${s.parent_guardian_phone_country_code || ''}${s.parent_guardian_phone}`}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="admin-mobile-card-actions">
                    {hasPlusAccess() && (
                      <button onClick={() => handleResetParentPin(s)} className="btn btn-sm btn-secondary" title="Reset parent PIN">
                        🔑
                      </button>
                    )}
                    <button onClick={() => handleEditStudent(s)} className="btn btn-sm btn-secondary">Edit</button>
                    <button onClick={() => handleDeleteStudent(s.id)} className="btn btn-sm btn-secondary btn-danger">Delete</button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '16px 0' }}>No matching students</p>}
              {totalPages > 1 && (
                <div className="mobile-cards-pagination">
                  <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setMobileStudentPage(p => p - 1)}>Previous</button>
                  <span className="mobile-cards-page-info">{page} of {totalPages}</span>
                  <button className="btn btn-sm btn-secondary" disabled={page >= totalPages} onClick={() => setMobileStudentPage(p => p + 1)}>Next</button>
                </div>
              )}
            </>
          );
        })()}
      </div>
      </>
      )}

      {studentsSubTab === 'promotion' && (
      <>
      {/* Promotion Sub-tabs */}
      <div className="report-tabs no-print">
        <nav className="report-tabs-nav">
          <button className={`report-tab-btn ${promotionSubTab === 'promote' ? 'active' : ''}`} onClick={() => setPromotionSubTab('promote')}>
            Promote Students
          </button>
          <button className={`report-tab-btn ${promotionSubTab === 'history' ? 'active' : ''}`} onClick={() => {
            setPromotionSubTab('history');
            (async () => {
              try {
                const res = await api.get('/admin/promotion/history');
                setPromotionHistory(res.data || []);
              } catch { setPromotionHistory([]); }
            })();
          }}>
            History
          </button>
        </nav>
      </div>

      {/* Promote Sub-Tab */}
      {promotionSubTab === 'promote' && (
        <div className="card" style={{ padding: 'var(--lg)' }}>
          <h3 style={{ margin: '0 0 var(--md) 0', fontSize: '16px', fontWeight: '600' }}>
            {promotionStep === 1 && 'Step 1: Select Source Class'}
            {promotionStep === 2 && 'Step 2: Select Students'}
            {promotionStep === 3 && 'Step 3: Choose Action & Destination'}
            {promotionStep === 4 && 'Step 4: Confirm'}
          </h3>

          {/* Step indicator */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {[1,2,3,4].map(s => (
              <div key={s} style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: promotionStep === s ? '600' : '400',
                background: promotionStep === s ? '#0a0a0a' : s < promotionStep ? '#16a34a' : '#f5f5f5',
                color: (promotionStep === s || s < promotionStep) ? '#fff' : '#666'
              }}>
                {s}. {s === 1 ? 'Source' : s === 2 ? 'Students' : s === 3 ? 'Action' : 'Confirm'}
              </div>
            ))}
          </div>

          {/* Step 1: Select source class */}
          {promotionStep === 1 && (
            <div className="form-grid" style={{ maxWidth: '400px' }}>
              <div className="form-group">
                <label className="form-label">From Class</label>
                <select
                  className="form-select"
                  value={promotionSourceClass}
                  onChange={(e) => {
                    setPromotionSourceClass(e.target.value);
                    setPromotionSelected([]);
                  }}
                >
                  <option value="">-- Select class --</option>
                  <option value="unassigned">Unassigned Students</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}{c.grade_level && c.grade_level !== 'N/A' ? ` (${c.grade_level})` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-primary"
                  disabled={!promotionSourceClass}
                  onClick={() => setPromotionStep(2)}
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Select students */}
          {promotionStep === 2 && (() => {
            const sourceStudents = promotionSourceClass === 'unassigned'
              ? students.filter(s => !s.class_id)
              : students.filter(s => String(s.class_id) === String(promotionSourceClass));
            return (
              <div>
                <p style={{ color: '#666', marginBottom: '12px', fontSize: '14px' }}>
                  {sourceStudents.length} student{sourceStudents.length !== 1 ? 's' : ''} in {promotionSourceClass === 'unassigned' ? 'Unassigned' : classes.find(c => String(c.id) === String(promotionSourceClass))?.name || 'class'}
                </p>
                {sourceStudents.length > 0 && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', cursor: 'pointer', fontWeight: '500', fontSize: '14px' }}>
                    <input
                      type="checkbox"
                      checked={promotionSelected.length === sourceStudents.length && sourceStudents.length > 0}
                      onChange={(e) => {
                        setPromotionSelected(e.target.checked ? sourceStudents.map(s => s.id) : []);
                      }}
                    />
                    Select All
                  </label>
                )}
                <div className="table-wrap" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  {sourceStudents.length === 0 ? (
                    <p style={{ padding: '16px', color: '#666', textAlign: 'center' }}>No students in this class.</p>
                  ) : (
                    <table className="table">
                      <thead>
                        <tr>
                          <th style={{ width: '40px' }}></th>
                          <th>Student ID</th>
                          <th>Name</th>
                          <th>Gender</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sourceStudents.map(s => (
                          <tr key={s.id}>
                            <td>
                              <input
                                type="checkbox"
                                checked={promotionSelected.includes(s.id)}
                                onChange={(e) => {
                                  setPromotionSelected(prev =>
                                    e.target.checked ? [...prev, s.id] : prev.filter(id => id !== s.id)
                                  );
                                }}
                              />
                            </td>
                            <td>{s.student_id}</td>
                            <td>{s.first_name} {s.last_name}</td>
                            <td>{s.gender}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div className="form-actions" style={{ marginTop: '16px', justifyContent: 'space-between' }}>
                  <button className="btn btn-secondary" onClick={() => setPromotionStep(1)}>← Back</button>
                  <button className="btn btn-primary" disabled={promotionSelected.length === 0} onClick={() => setPromotionStep(3)}>
                    Next ({promotionSelected.length} selected) →
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Step 3: Choose action & destination */}
          {promotionStep === 3 && (
            <div>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Action</label>
                  <select className="form-select" value={promotionType} onChange={(e) => setPromotionType(e.target.value)}>
                    <option value="promoted">Promote to class</option>
                    <option value="transferred">Transfer to class</option>
                    <option value="repeated">Repeat (move to class)</option>
                    <option value="graduated">Graduate (remove from class)</option>
                    <option value="dropped_out">Drop out (remove from class)</option>
                  </select>
                </div>

                {promotionType !== 'graduated' && promotionType !== 'dropped_out' && (
                  <div className="form-group">
                    <label className="form-label">Destination Class</label>
                    <select className="form-select" value={promotionDestClass} onChange={(e) => setPromotionDestClass(e.target.value)}>
                      <option value="">-- Select class --</option>
                      {classes.filter(c => String(c.id) !== String(promotionSourceClass)).map(c => (
                        <option key={c.id} value={c.id}>{c.name}{c.grade_level && c.grade_level !== 'N/A' ? ` (${c.grade_level})` : ''}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Session (optional)</label>
                  <select className="form-select" value={promotionSession} onChange={(e) => setPromotionSession(e.target.value)}>
                    <option value="">-- None --</option>
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group full">
                  <label className="form-label">Notes (optional)</label>
                  <textarea
                    className="form-textarea"
                    rows="2"
                    value={promotionNotes}
                    onChange={(e) => setPromotionNotes(e.target.value)}
                    placeholder="e.g. End of year 2025 promotion"
                  />
                </div>
              </div>

              <div className="form-actions" style={{ marginTop: '16px', justifyContent: 'space-between' }}>
                <button className="btn btn-secondary" onClick={() => setPromotionStep(2)}>← Back</button>
                <button
                  className="btn btn-primary"
                  disabled={promotionType !== 'graduated' && promotionType !== 'dropped_out' && !promotionDestClass}
                  onClick={() => setPromotionStep(4)}
                >
                  Review →
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Confirm */}
          {promotionStep === 4 && (() => {
            const selectedStudents = students.filter(s => promotionSelected.includes(s.id));
            const sourceName = promotionSourceClass === 'unassigned'
              ? 'Unassigned'
              : classes.find(c => String(c.id) === String(promotionSourceClass))?.name || '—';
            const destName = (promotionType === 'graduated' || promotionType === 'dropped_out')
              ? (promotionType === 'graduated' ? 'Graduated (removed)' : 'Dropped out (removed)')
              : classes.find(c => String(c.id) === String(promotionDestClass))?.name || '—';
            const actionLabel = { promoted: 'Promote', transferred: 'Transfer', repeated: 'Repeat', graduated: 'Graduate', dropped_out: 'Drop Out' }[promotionType];

            return (
              <div>
                <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #e5e5e5' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
                    <div><strong>Action:</strong> {actionLabel}</div>
                    <div><strong>Students:</strong> {selectedStudents.length}</div>
                    <div><strong>From:</strong> {sourceName}</div>
                    <div><strong>To:</strong> {destName}</div>
                    {promotionSession && <div><strong>Session:</strong> {sessions.find(s => String(s.id) === String(promotionSession))?.name}</div>}
                    {promotionNotes && <div style={{ gridColumn: '1 / -1' }}><strong>Notes:</strong> {promotionNotes}</div>}
                  </div>
                </div>

                <div className="table-wrap" style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '16px' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Student ID</th>
                        <th>Name</th>
                        <th>Current Class</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedStudents.map(s => (
                        <tr key={s.id}>
                          <td>{s.student_id}</td>
                          <td>{s.first_name} {s.last_name}</td>
                          <td>{s.class_name || 'Unassigned'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {(promotionType === 'graduated' || promotionType === 'dropped_out') && (
                  <p style={{ color: '#d97706', fontSize: '13px', marginBottom: '16px' }}>
                    {promotionType === 'graduated'
                      ? '⚠️ Graduating students will remove them from their class. They will appear as "Unassigned" and can be re-assigned later.'
                      : '⚠️ Dropping out students will remove them from their class. They will appear as "Unassigned" and can be re-assigned later.'}
                  </p>
                )}

                <div className="form-actions" style={{ justifyContent: 'space-between' }}>
                  <button className="btn btn-secondary" onClick={() => setPromotionStep(3)}>← Back</button>
                  <button
                    className="btn btn-primary"
                    disabled={promotionSaving}
                    onClick={async () => {
                      setPromotionSaving(true);
                      try {
                        const payload = {
                          session_id: promotionSession || null,
                          promotions: selectedStudents.map(s => ({
                            student_id: s.id,
                            from_class_id: s.class_id || null,
                            to_class_id: (promotionType === 'graduated' || promotionType === 'dropped_out') ? null : Number(promotionDestClass),
                            type: promotionType,
                            notes: promotionNotes
                          }))
                        };
                        const res = await api.post('/admin/promotion/promote', payload);
                        toast.success(res.data.message || 'Promotion complete');
                        // Reset wizard
                        setPromotionStep(1);
                        setPromotionSourceClass('');
                        setPromotionDestClass('');
                        setPromotionSelected([]);
                        setPromotionNotes('');
                        setPromotionType('promoted');
                        setPromotionSession('');
                        // Refresh data
                        const studentsRes = await api.get('/admin/students').catch(() => ({ data: [] }));
                        setStudents(studentsRes.data || []);
                      } catch (err) {
                        handleApiError(err, 'Failed to promote students');
                      } finally {
                        setPromotionSaving(false);
                      }
                    }}
                  >
                    {promotionSaving ? 'Processing...' : `${actionLabel} ${selectedStudents.length} Student${selectedStudents.length !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* History Sub-Tab */}
      {promotionSubTab === 'history' && (
        <div className="card" style={{ padding: 'var(--lg)' }}>
          {promotionHistory.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '24px' }}>No promotion history yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Student</th>
                    <th>Action</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Session</th>
                    <th>By</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {promotionHistory.map(h => (
                    <tr key={h.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(h.created_at)}</td>
                      <td>{h.first_name} {h.last_name} <span style={{ color: '#666', fontSize: '12px' }}>({h.student_code})</span></td>
                      <td>
                        <span className={`badge ${h.promotion_type === 'graduated' ? 'badge-info' : h.promotion_type === 'repeated' ? 'badge-warning' : 'badge-success'}`}>
                          {h.promotion_type}
                        </span>
                      </td>
                      <td>{h.from_class_name || '—'}</td>
                      <td>{h.to_class_name || '—'}</td>
                      <td>{h.session_name || '—'}</td>
                      <td>{h.promoted_by_first ? `${h.promoted_by_first} ${h.promoted_by_last}` : '—'}</td>
                      <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      </>
      )}
      </>
      )}

      {/* Applications Sub-Tab */}
      {studentSubTab === 'applications' && (
      <>
        {applicationsLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Loading...</div>
        ) : applications.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: '#9ca3af', margin: 0 }}>No pending applications</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {applications.map(app => (
              <div key={app.id} className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ fontWeight: 600, fontSize: '15px' }}>{app.first_name} {app.last_name}</div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                      {app.gender}{app.date_of_birth ? ` · Born ${new Date(app.date_of_birth.split('T')[0] + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}` : ''}
                    </div>
                    {app.parent_guardian_name && (
                      <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                        Guardian: {app.parent_guardian_name}{app.parent_guardian_relationship ? ` (${app.parent_guardian_relationship})` : ''}
                        {app.parent_guardian_phone ? ` · ${app.parent_guardian_phone}` : ''}
                      </div>
                    )}
                    {app.email && <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>{app.email}</div>}
                    {(app.city || app.country) && (
                      <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '2px' }}>
                        {[app.street, app.city, app.state, app.country].filter(Boolean).join(', ')}
                      </div>
                    )}
                    {app.notes && <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px', fontStyle: 'italic' }}>{app.notes}</div>}
                    <div style={{ fontSize: '12px', color: '#d1d5db', marginTop: '6px' }}>
                      Applied {new Date(app.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={async () => {
                        let nextId = '';
                        try { const res = await api.get('/admin/next-student-id'); nextId = res.data.student_id; } catch(e) {}
                        setApproveModal({ ...app, student_id: nextId, class_id: '', expected_fee: '', fee_note: '' });
                      }}
                      disabled={isReadOnly()}
                    >
                      Approve
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        if (window.confirm(`Reject application from ${app.first_name} ${app.last_name}?`)) {
                          handleRejectApplication(app.id);
                        }
                      }}
                      disabled={isReadOnly()}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </>
      )}

      {/* Approve Modal */}
      {approveModal && (
        <div className="modal-overlay" onClick={() => setApproveModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Approve Application</h3>
              <button onClick={() => setApproveModal(null)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '14px', color: '#525252', margin: '0 0 16px' }}>
                Approve <strong>{approveModal.first_name} {approveModal.last_name}</strong> and create a student record.
              </p>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Student ID *</label>
                <input
                  type="text"
                  className="form-input"
                  value={approveModal.student_id}
                  onChange={(e) => setApproveModal({ ...approveModal, student_id: e.target.value })}
                  placeholder="e.g. 00001"
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Assign to Class</label>
                <select
                  className="form-select"
                  value={approveModal.class_id}
                  onChange={(e) => setApproveModal({ ...approveModal, class_id: e.target.value })}
                >
                  <option value="">No class (assign later)</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {madrasahProfile?.enable_fee_tracking && madrasahProfile?.fee_tracking_mode !== 'auto' && (
                <>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label">Expected Fee</label>
                    <input
                      type="number"
                      className="form-input"
                      value={approveModal.expected_fee}
                      onChange={(e) => setApproveModal({ ...approveModal, expected_fee: e.target.value })}
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label">Fee Note</label>
                    <input
                      type="text"
                      className="form-input"
                      value={approveModal.fee_note}
                      onChange={(e) => setApproveModal({ ...approveModal, fee_note: e.target.value })}
                      placeholder="Optional note"
                    />
                  </div>
                </>
              )}
              {madrasahProfile?.enable_fee_tracking && madrasahProfile?.fee_tracking_mode === 'auto' && (
                <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 12px', padding: '8px 12px', background: '#f3f4f6', borderRadius: '6px' }}>
                  Fees will be auto-calculated from your fee schedules.
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setApproveModal(null)} className="btn btn-secondary">Cancel</button>
              <button
                onClick={() => handleApproveApplication(
                  approveModal.id,
                  approveModal.student_id,
                  approveModal.class_id,
                  approveModal.expected_fee,
                  approveModal.fee_note
                )}
                className="btn btn-primary"
                disabled={!approveModal.student_id}
              >
                Approve & Create Student
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

export default StudentsSection;
