import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { authService } from '../../services/auth.service';
import api from '../../services/api';
import SortableTable from '../../components/SortableTable';
import EmailVerificationBanner from '../../components/EmailVerificationBanner';
import './Dashboard.css';

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [sessions, setSessions] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [showSemesterForm, setShowSemesterForm] = useState(false);
  const [showClassForm, setShowClassForm] = useState(false);
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadClass, setUploadClass] = useState('');
  const [uploadResults, setUploadResults] = useState(null);
  const [newSession, setNewSession] = useState({ name: '', start_date: '', end_date: '', is_active: false });
  const [newSemester, setNewSemester] = useState({ session_id: '', name: '', start_date: '', end_date: '', is_active: false });
  const [newClass, setNewClass] = useState({ name: '', grade_level: '', school_days: [], description: '' });
  const [newTeacher, setNewTeacher] = useState({ 
    first_name: '', last_name: '', staff_id: '', email: '', 
    phone: '', phone_country_code: '+64',
    street: '', city: '', state: '', country: ''
  });
  const [newStudent, setNewStudent] = useState({
    first_name: '', last_name: '', student_id: '', gender: '', class_id: '',
    student_phone: '', student_phone_country_code: '+64',
    street: '', city: '', state: '', country: '',
    next_of_kin_name: '', next_of_kin_relationship: '', 
    next_of_kin_phone: '', next_of_kin_phone_country_code: '+64', notes: ''
  });
  const [editingSession, setEditingSession] = useState(null);
  const [editingSemester, setEditingSemester] = useState(null);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classTeachers, setClassTeachers] = useState([]);
  const [showTeacherAssignment, setShowTeacherAssignment] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedStudentForReport, setSelectedStudentForReport] = useState(null);
  const [studentReport, setStudentReport] = useState(null);
  const [reportSemester, setReportSemester] = useState('');
  const [classAttendance, setClassAttendance] = useState([]);
  const [classExams, setClassExams] = useState([]);
  const [classKpis, setClassKpis] = useState(null);
  const [selectedClassForPerformance, setSelectedClassForPerformance] = useState(null);
  const [reportSubTab, setReportSubTab] = useState('attendance');
  const [examKpis, setExamKpis] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [reportFilterSession, setReportFilterSession] = useState('');
  const [reportFilteredSemesters, setReportFilteredSemesters] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Settings state
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const user = authService.getCurrentUser();
  const navigate = useNavigate();
  const { madrasahSlug } = useParams();

  // Close mobile menu when tab changes
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const navItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'sessions', label: 'Sessions' },
    { id: 'semesters', label: 'Semesters' },
    { id: 'classes', label: 'Classes' },
    { id: 'teachers', label: 'Teachers' },
    { id: 'students', label: 'Students' },
    { id: 'reports', label: 'Reports' },
    { id: 'settings', label: 'Settings' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  // Recalculate exam KPIs when subject filter changes
  useEffect(() => {
    if (classExams.length > 0) {
      calculateExamKpis(classExams);
    }
  }, [selectedSubject]);

  // Filter semesters by selected session for reports tab
  useEffect(() => {
    if (reportFilterSession) {
      const filtered = semesters.filter(sem => sem.session_id === parseInt(reportFilterSession));
      setReportFilteredSemesters(filtered);
      // Reset semester selection if it doesn't belong to the selected session
      if (reportSemester && !filtered.find(s => s.id === parseInt(reportSemester))) {
        setReportSemester('');
      }
    } else {
      setReportFilteredSemesters(semesters);
    }
  }, [reportFilterSession, semesters]);

  // Reset subject filter when class changes
  useEffect(() => {
    if (selectedClassForPerformance) {
      setSelectedSubject('all');
    }
  }, [selectedClassForPerformance]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sessionsRes, semestersRes, classesRes, teachersRes, studentsRes] = await Promise.all([
        api.get('/admin/sessions').catch(() => ({ data: [] })),
        api.get('/admin/semesters').catch(() => ({ data: [] })),
        api.get('/classes').catch(() => ({ data: [] })),
        api.get('/admin/teachers').catch(() => ({ data: [] })),
        api.get('/admin/students').catch(() => ({ data: [] }))
      ]);
      setSessions(sessionsRes.data || []);
      setSemesters(semestersRes.data || []);
      setClasses(classesRes.data || []);
      setTeachers(teachersRes.data || []);
      setStudents(studentsRes.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    try {
      if (editingSession) {
        await api.put(`/admin/sessions/${editingSession.id}`, newSession);
        setEditingSession(null);
      } else {
        await api.post('/admin/sessions', newSession);
      }
      setShowSessionForm(false);
      setNewSession({ name: '', start_date: '', end_date: '', is_active: false });
      loadData();
    } catch (error) {
      toast.error(editingSession ? 'Failed to update session' : 'Failed to create session');
    }
  };

  const handleEditSession = (session) => {
    setEditingSession(session);
    setNewSession({
      name: session.name,
      start_date: session.start_date.split('T')[0],
      end_date: session.end_date.split('T')[0],
      is_active: session.is_active
    });
    setShowSessionForm(true);
  };

  const handleDeleteSession = async (id) => {
    if (!confirm('Are you sure you want to delete this session? This will also delete all associated semesters.')) return;
    try {
      await api.delete(`/admin/sessions/${id}`);
      loadData();
    } catch (error) {
      toast.error('Failed to delete session');
    }
  };

  const handleCreateSemester = async (e) => {
    e.preventDefault();
    try {
      if (editingSemester) {
        await api.put(`/admin/semesters/${editingSemester.id}`, newSemester);
        setEditingSemester(null);
      } else {
        await api.post('/admin/semesters', newSemester);
      }
      setShowSemesterForm(false);
      setNewSemester({ session_id: '', name: '', start_date: '', end_date: '', is_active: false });
      loadData();
    } catch (error) {
      toast.error(editingSemester ? 'Failed to update semester' : 'Failed to create semester');
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

  const handleDeleteSemester = async (id) => {
    if (!confirm('Are you sure you want to delete this semester? This will also delete all associated attendance records.')) return;
    try {
      await api.delete(`/admin/semesters/${id}`);
      loadData();
    } catch (error) {
      toast.error('Failed to delete semester');
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/classes', newClass);
      setShowClassForm(false);
      setNewClass({ name: '', grade_level: '', school_days: [], description: '' });
      loadData();
    } catch (error) {
      toast.error('Failed to create class');
    }
  };

  const toggleSchoolDay = (day) => {
    setNewClass(prev => ({
      ...prev,
      school_days: prev.school_days.includes(day)
        ? prev.school_days.filter(d => d !== day)
        : [...prev.school_days, day]
    }));
  };

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    try {
      if (editingTeacher) {
        await api.put(`/admin/teachers/${editingTeacher.id}`, newTeacher);
        setEditingTeacher(null);
      } else {
        await api.post('/admin/teachers', newTeacher);
      }
      setShowTeacherForm(false);
      setNewTeacher({ 
        first_name: '', last_name: '', staff_id: '', email: '', 
        phone: '', phone_country_code: '+64',
        street: '', city: '', state: '', country: ''
      });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save teacher');
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

  const handleDeleteTeacher = async (id) => {
    if (window.confirm('Are you sure you want to delete this teacher?')) {
      try {
        await api.delete(`/admin/teachers/${id}`);
        loadData();
      } catch (error) {
        toast.error('Failed to delete teacher');
      }
    }
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    try {
      if (editingStudent) {
        await api.put(`/admin/students/${editingStudent.id}`, newStudent);
        setEditingStudent(null);
      } else {
        await api.post('/admin/students', newStudent);
      }
      setShowStudentForm(false);
      setNewStudent({
        first_name: '', last_name: '', student_id: '', gender: '', class_id: '',
        student_phone: '', student_phone_country_code: '+64',
        street: '', city: '', state: '', country: '',
        next_of_kin_name: '', next_of_kin_relationship: '', 
        next_of_kin_phone: '', next_of_kin_phone_country_code: '+64', notes: ''
      });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save student');
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
      student_phone: student.student_phone || '',
      student_phone_country_code: student.student_phone_country_code || '+64',
      street: student.street || '',
      city: student.city || '',
      state: student.state || '',
      country: student.country || '',
      next_of_kin_name: student.next_of_kin_name || '',
      next_of_kin_relationship: student.next_of_kin_relationship || '',
      next_of_kin_phone: student.next_of_kin_phone || '',
      next_of_kin_phone_country_code: student.next_of_kin_phone_country_code || '+64',
      notes: student.notes || ''
    });
    setShowStudentForm(true);
  };

  const handleDeleteStudent = async (id) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await api.delete(`/admin/students/${id}`);
        loadData();
      } catch (error) {
        toast.error('Failed to delete student');
      }
    }
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
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
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to upload file');
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

  const handleRemoveTeacher = async (teacherId) => {
    if (window.confirm('Remove this teacher from the class?')) {
      try {
        await api.delete(`/admin/classes/${selectedClass.id}/teachers/${teacherId}`);
        const response = await api.get(`/admin/classes/${selectedClass.id}/teachers`);
        setClassTeachers(response.data);
      } catch (error) {
        toast.error('Failed to remove teacher');
      }
    }
  };

  const fetchStudentReport = async (studentId) => {
    try {
      const url = reportSemester 
        ? `/admin/students/${studentId}/report?semester_id=${reportSemester}`
        : `/admin/students/${studentId}/report`;
      const response = await api.get(url);
      setStudentReport(response.data);
      setSelectedStudentForReport(students.find(s => s.id === studentId));
    } catch (error) {
      toast.error('Failed to load student report');
    }
  };

  const updateStudentComment = async (studentId, comment) => {
    try {
      await api.put(`/admin/students/${studentId}/comment`, { notes: comment });
      toast.success('Comment updated successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to update comment');
    }
  };

  const fetchClassAttendance = async (classId) => {
    try {
      const url = reportSemester
        ? `/admin/classes/${classId}/attendance-performance?semester_id=${reportSemester}`
        : `/admin/classes/${classId}/attendance-performance`;
      const response = await api.get(url);
      setClassAttendance(response.data);
    } catch (error) {
      toast.error('Failed to load class attendance');
    }
  };

  const fetchClassExams = async (classId) => {
    try {
      const url = reportSemester
        ? `/admin/classes/${classId}/exam-performance?semester_id=${reportSemester}`
        : `/admin/classes/${classId}/exam-performance`;
      const response = await api.get(url);
      setClassExams(response.data);
      calculateExamKpis(response.data);

      // Extract and store all unique subjects for the dropdown
      const subjects = [...new Set(response.data.map(record => record.subject))].sort();
      setAvailableSubjects(subjects);
    } catch (error) {
      toast.error('Failed to load exam performance');
      setClassExams([]);
      setExamKpis(null);
    }
  };

  const calculateExamKpis = (data) => {
    if (!data || data.length === 0) {
      setExamKpis(null);
      return;
    }

    // Filter by selected subject if not 'all'
    const filteredData = selectedSubject === 'all'
      ? data
      : data.filter(r => r.subject === selectedSubject);

    if (filteredData.length === 0) {
      setExamKpis(null);
      return;
    }

    // Group by subject
    const bySubject = {};
    filteredData.forEach(record => {
      if (!bySubject[record.subject]) {
        bySubject[record.subject] = [];
      }
      bySubject[record.subject].push(record);
    });

    // Calculate KPIs for each subject
    const subjectKpis = Object.entries(bySubject).map(([subject, records]) => {
      const totalStudents = new Set(records.map(r => r.student_id)).size;
      const presentStudents = records.filter(r => !r.is_absent);
      const absentStudents = records.filter(r => r.is_absent);

      const scores = presentStudents.map(r => (r.score / r.max_score) * 100);
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

      const passCount = scores.filter(s => s >= 50).length;
      const failCount = scores.filter(s => s < 50).length;
      const passRate = presentStudents.length > 0 ? (passCount / presentStudents.length) * 100 : 0;

      const highPerformers = scores.filter(s => s >= 80).length;
      const lowPerformers = scores.filter(s => s < 50).length;

      return {
        subject,
        totalStudents,
        presentCount: presentStudents.length,
        absentCount: absentStudents.length,
        avgScore: avgScore.toFixed(2),
        passCount,
        failCount,
        passRate: passRate.toFixed(2),
        highPerformers,
        lowPerformers,
        records
      };
    });

    setExamKpis(subjectKpis);
  };

  const fetchClassKpis = async (classId) => {
    try {
      const endpoint = reportSemester
        ? `/admin/classes/${classId}/kpis?semester_id=${reportSemester}`
        : `/admin/classes/${classId}/kpis`;
      const response = await api.get(endpoint);
      console.log('KPIs response:', response.data);
      setClassKpis(response.data);
    } catch (error) {
      console.error('KPIs error:', error);
      toast.error('Failed to load class KPIs');
      // Set empty KPIs structure to prevent rendering errors
      setClassKpis({
        classStats: {},
        examStats: {},
        highRiskStudents: []
      });
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate(`/${madrasahSlug}/login`);
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <button
            className={`menu-toggle ${mobileMenuOpen ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span className="menu-toggle-icon">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>
          <h1 className="header-title">Madrasah Admin</h1>
        </div>
        <div className="header-user">
          <span className="header-name">{user?.name || 'Administrator'}</span>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      {/* Email Verification Banner */}
      <EmailVerificationBanner />

      {/* Mobile Sidebar Overlay */}
      <div
        className={`sidebar-overlay ${mobileMenuOpen ? 'visible' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Mobile Sidebar */}
      <aside className={`sidebar-mobile ${mobileMenuOpen ? 'open' : ''}`}>
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => handleTabChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </aside>

      <div className="layout">
        {/* Desktop Sidebar */}
        <aside className="sidebar">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => handleTabChange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </aside>

        {/* Main Content */}
        <main className="main">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              <div className="page-header">
                <h2 className="page-title">Overview</h2>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value">{semesters.length}</div>
                  <div className="stat-label">Semesters</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{classes.length}</div>
                  <div className="stat-label">Classes</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{teachers.length}</div>
                  <div className="stat-label">Teachers</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{students.length}</div>
                  <div className="stat-label">Students</div>
                </div>
              </div>

              <h3 className="section-title">Quick Actions</h3>
              <div className="quick-grid">
                <div className="quick-card" onClick={() => { setActiveTab('sessions'); setShowSessionForm(true); }}>
                  <h4>New Session</h4>
                  <p>Create a new academic year</p>
                </div>
                <div className="quick-card" onClick={() => { setActiveTab('semesters'); setShowSemesterForm(true); }}>
                  <h4>New Semester</h4>
                  <p>Create a new semester</p>
                </div>
                <div className="quick-card" onClick={() => { setActiveTab('classes'); setShowClassForm(true); }}>
                  <h4>New Class</h4>
                  <p>Add a new class group</p>
                </div>
                <div className="quick-card" onClick={() => { setActiveTab('students'); setShowStudentForm(true); }}>
                  <h4>New Student</h4>
                  <p>Enroll a new student</p>
                </div>
              </div>
            </>
          )}

          {/* Sessions Tab */}
          {activeTab === 'sessions' && (
            <>
              <div className="page-header">
                <h2 className="page-title">Academic Sessions</h2>
                <button onClick={() => {
                  setEditingSession(null);
                  setNewSession({ name: '', start_date: '', end_date: '', is_active: false });
                  setShowSessionForm(!showSessionForm);
                }} className="btn btn-primary">
                  + New Session
                </button>
              </div>

              {showSessionForm && (
                <div className="card">
                  <div className="card-header">{editingSession ? 'Edit Academic Session' : 'Create New Academic Session'}</div>
                  <div className="card-body">
                    <form onSubmit={handleCreateSession}>
                      <div className="form-grid form-grid-3">
                        <div className="form-group">
                          <label className="form-label">Session Name</label>
                          <input
                            type="text"
                            className="form-input"
                            value={newSession.name}
                            onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
                            placeholder="e.g., 2024-2025"
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Start Date</label>
                          <input
                            type="date"
                            className="form-input"
                            value={newSession.start_date}
                            onChange={(e) => setNewSession({ ...newSession, start_date: e.target.value })}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">End Date</label>
                          <input
                            type="date"
                            className="form-input"
                            value={newSession.end_date}
                            onChange={(e) => setNewSession({ ...newSession, end_date: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label checkbox-label">
                          <input
                            type="checkbox"
                            checked={newSession.is_active}
                            onChange={(e) => setNewSession({ ...newSession, is_active: e.target.checked })}
                          />
                          <span>Set as active session</span>
                        </label>
                      </div>
                      <div className="form-actions">
                        <button type="button" onClick={() => {
                          setShowSessionForm(false);
                          setEditingSession(null);
                          setNewSession({ name: '', start_date: '', end_date: '', is_active: false });
                        }} className="btn btn-secondary">
                          Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">{editingSession ? 'Update Session' : 'Create Session'}</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div className="card">
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Session Name</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map(session => (
                        <tr key={session.id}>
                          <td><strong>{session.name}</strong></td>
                          <td>{new Date(session.start_date).toLocaleDateString()}</td>
                          <td>{new Date(session.end_date).toLocaleDateString()}</td>
                          <td>
                            <span className={`badge ${session.is_active ? 'badge-success' : 'badge-muted'}`}>
                              {session.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <button onClick={() => handleEditSession(session)} className="btn-sm btn-edit">Edit</button>
                            <button onClick={() => handleDeleteSession(session.id)} className="btn-sm btn-delete">Delete</button>
                          </td>
                        </tr>
                      ))}
                      {sessions.length === 0 && (
                        <tr>
                          <td colSpan="5">
                            <div className="empty">
                              <p>No sessions yet. Create one to get started.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Semesters Tab */}
          {activeTab === 'semesters' && (
            <>
              <div className="page-header">
                <h2 className="page-title">Semesters</h2>
                <button onClick={() => {
                  setEditingSemester(null);
                  setNewSemester({ session_id: '', name: '', start_date: '', end_date: '', is_active: false });
                  setShowSemesterForm(!showSemesterForm);
                }} className="btn btn-primary">
                  + New Semester
                </button>
              </div>

              {showSemesterForm && (
                <div className="card">
                  <div className="card-header">{editingSemester ? 'Edit Semester' : 'Create New Semester'}</div>
                  <div className="card-body">
                    <form onSubmit={handleCreateSemester}>
                      <div className="form-grid form-grid-3">
                        <div className="form-group">
                          <label className="form-label">Academic Session</label>
                          <select
                            className="form-input"
                            value={newSemester.session_id}
                            onChange={(e) => setNewSemester({ ...newSemester, session_id: e.target.value })}
                            required
                          >
                            <option value="">Select Session</option>
                            {sessions.map(session => (
                              <option key={session.id} value={session.id}>{session.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Semester Name</label>
                          <input
                            type="text"
                            className="form-input"
                            value={newSemester.name}
                            onChange={(e) => setNewSemester({ ...newSemester, name: e.target.value })}
                            placeholder="e.g., Fall 2024, Spring 2025"
                            required
                          />
                        </div>
                      </div>
                      <div className="form-grid form-grid-2">
                        <div className="form-group">
                          <label className="form-label">Start Date</label>
                          <input
                            type="date"
                            className="form-input"
                            value={newSemester.start_date}
                            onChange={(e) => setNewSemester({ ...newSemester, start_date: e.target.value })}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">End Date</label>
                          <input
                            type="date"
                            className="form-input"
                            value={newSemester.end_date}
                            onChange={(e) => setNewSemester({ ...newSemester, end_date: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label checkbox-label">
                          <input
                            type="checkbox"
                            checked={newSemester.is_active}
                            onChange={(e) => setNewSemester({ ...newSemester, is_active: e.target.checked })}
                          />
                          <span>Set as active semester</span>
                        </label>
                      </div>
                      <div className="form-actions">
                        <button type="button" onClick={() => {
                          setShowSemesterForm(false);
                          setEditingSemester(null);
                          setNewSemester({ session_id: '', name: '', start_date: '', end_date: '', is_active: false });
                        }} className="btn btn-secondary">
                          Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">{editingSemester ? 'Update Semester' : 'Create Semester'}</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div className="card">
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Session</th>
                        <th>Semester Name</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {semesters.map(semester => (
                        <tr key={semester.id}>
                          <td>{semester.session_name || 'N/A'}</td>
                          <td><strong>{semester.name}</strong></td>
                          <td>{new Date(semester.start_date).toLocaleDateString()}</td>
                          <td>{new Date(semester.end_date).toLocaleDateString()}</td>
                          <td>
                            <span className={`badge ${semester.is_active ? 'badge-success' : 'badge-muted'}`}>
                              {semester.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <button onClick={() => handleEditSemester(semester)} className="btn-sm btn-edit">Edit</button>
                            <button onClick={() => handleDeleteSemester(semester.id)} className="btn-sm btn-delete">Delete</button>
                          </td>
                        </tr>
                      ))}
                      {semesters.length === 0 && (
                        <tr>
                          <td colSpan="6">
                            <div className="empty">
                              <p>No semesters yet. Create one to get started.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Classes Tab */}
          {activeTab === 'classes' && (
            <>
              <div className="page-header">
                <h2 className="page-title">Classes</h2>
                <button onClick={() => setShowClassForm(!showClassForm)} className="btn btn-primary">
                  + New Class
                </button>
              </div>

              {showClassForm && (
                <div className="card">
                  <div className="card-header">Create New Class</div>
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
                                onClick={() => toggleSchoolDay(day)}
                              >
                                {day.substring(0, 3)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="form-actions">
                        <button type="button" onClick={() => setShowClassForm(false)} className="btn btn-secondary">
                          Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">Create Class</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div className="card">
                <div className="table-wrap">
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
                              <button onClick={() => handleManageTeachers(cls)} className="btn btn-sm btn-secondary">
                                Manage Teachers
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {classes.length === 0 && (
                        <tr>
                          <td colSpan="3">
                            <div className="empty">
                              <p>No classes yet. Create one to get started.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
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
          )}

          {/* Teachers Tab */}
          {activeTab === 'teachers' && (
            <>
              <div className="page-header">
                <h2 className="page-title">Teachers</h2>
                <button onClick={() => {
                  setEditingTeacher(null);
                  setNewTeacher({ first_name: '', last_name: '', staff_id: '', email: '', phone: '' });
                  setShowTeacherForm(!showTeacherForm);
                }} className="btn btn-primary">
                  + New Teacher
                </button>
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

              <div className="card">
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
            </>
          )}

          {/* Students Tab */}
          {activeTab === 'students' && (
            <>
              <div className="page-header">
                <h2 className="page-title">Students</h2>
                <div style={{ display: 'flex', gap: 'var(--sm)' }}>
                  <button onClick={() => {
                    setShowBulkUpload(!showBulkUpload);
                    setShowStudentForm(false);
                    setUploadResults(null);
                  }} className="btn btn-secondary">
                    Bulk Upload
                  </button>
                  <button onClick={() => {
                    setEditingStudent(null);
                    setNewStudent({
                      first_name: '', last_name: '', student_id: '', gender: '', class_id: '',
                      next_of_kin_name: '', next_of_kin_relationship: '', next_of_kin_phone: '', notes: ''
                    });
                    setShowStudentForm(!showStudentForm);
                    setShowBulkUpload(false);
                  }} className="btn btn-primary">
                    + New Student
                  </button>
                </div>
              </div>

              {showBulkUpload && (
                <div className="card">
                  <div className="card-header">Bulk Upload Students</div>
                  <div className="card-body">
                    <div className="upload-info">
                      <h4>Required File Format</h4>
                      <p>Upload a CSV or Excel file with the following columns:</p>
                      <code>
                        Required: first_name, last_name, gender<br/>
                        Optional: email, phone, next_of_kin_name, next_of_kin_relationship, next_of_kin_phone, notes
                      </code>
                      <p>Gender must be either 'Male' or 'Female'. Student IDs will be auto-generated.</p>
                      <button onClick={downloadTemplate} className="btn btn-secondary btn-sm">
                        Download Template
                      </button>
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
                        <button type="submit" className="btn btn-primary">Upload Students</button>
                      </div>
                    </form>

                    {uploadResults && (
                      <div className={`upload-results ${uploadResults.failed > 0 ? 'warning' : 'success'}`}>
                        <h4>Upload Results</h4>
                        <p>
                          Total: {uploadResults.total} |
                          Successful: {uploadResults.successful} |
                          Failed: {uploadResults.failed}
                        </p>

                        {uploadResults.results.success.length > 0 && (
                          <details>
                            <summary>Successful Uploads ({uploadResults.results.success.length})</summary>
                            <ul>
                              {uploadResults.results.success.map((s, i) => (
                                <li key={i}>{s.name} - ID: {s.student_id}</li>
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
                          <label className="form-label">Student ID (6 digits)</label>
                          <input
                            type="text"
                            className="form-input"
                            value={newStudent.student_id}
                            onChange={(e) => setNewStudent({ ...newStudent, student_id: e.target.value })}
                            pattern="\d{6}"
                            maxLength="6"
                            placeholder="123456"
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
                        Next of Kin Information
                      </h4>
                      <div className="form-grid form-grid-3">
                        <div className="form-group">
                          <label className="form-label">Next of Kin Name *</label>
                          <input
                            type="text"
                            className="form-input"
                            value={newStudent.next_of_kin_name}
                            onChange={(e) => setNewStudent({ ...newStudent, next_of_kin_name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Relationship *</label>
                          <input
                            type="text"
                            className="form-input"
                            value={newStudent.next_of_kin_relationship}
                            onChange={(e) => setNewStudent({ ...newStudent, next_of_kin_relationship: e.target.value })}
                            placeholder="Mother, Father, Guardian, etc."
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Phone Number *</label>
                          <PhoneInput
                            country={'nz'}
                            value={newStudent.next_of_kin_phone_country_code + newStudent.next_of_kin_phone}
                            onChange={(phone, country) => {
                              setNewStudent({ 
                                ...newStudent, 
                                next_of_kin_phone: phone.substring(country.dialCode.length),
                                next_of_kin_phone_country_code: '+' + country.dialCode
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

              <div className="card">
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
                      render: (row) => row.class_name || <span style={{ color: 'var(--muted)' }}>Unassigned</span>
                    },
                    {
                      key: 'next_of_kin_name',
                      label: 'Next of Kin',
                      sortable: true,
                      render: (row) => row.next_of_kin_name ? (
                        <span>{row.next_of_kin_name} ({row.next_of_kin_relationship || 'N/A'})</span>
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
                  data={students}
                  searchable={true}
                  searchPlaceholder="Search by name, student ID, or class..."
                  searchKeys={['student_id', 'first_name', 'last_name', 'class_name', 'next_of_kin_name']}
                  pagination={true}
                  pageSize={25}
                  emptyMessage="No students yet. Create one to get started."
                />
              </div>
            </>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <>
              <div className="page-header">
                <h2 className="page-title">Reports & Analytics</h2>
              </div>

              {/* Report Sub-Tabs */}
              <div className="report-tabs">
                <nav className="report-tabs-nav">
                  <button
                    onClick={() => setReportSubTab('attendance')}
                    className={`report-tab-btn ${reportSubTab === 'attendance' ? 'active' : ''}`}
                  >
                    Attendance Reports
                  </button>
                  <button
                    onClick={() => setReportSubTab('exams')}
                    className={`report-tab-btn ${reportSubTab === 'exams' ? 'active' : ''}`}
                  >
                    Exam Reports
                  </button>
                  <button
                    onClick={() => setReportSubTab('individual')}
                    className={`report-tab-btn ${reportSubTab === 'individual' ? 'active' : ''}`}
                  >
                    Individual Student
                  </button>
                </nav>
              </div>

              {/* Filters */}
              <div className="card">
                <div className="card-body">
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Filter by Session</label>
                      <select
                        className="form-select"
                        value={reportFilterSession}
                        onChange={(e) => setReportFilterSession(e.target.value)}
                      >
                        <option value="">All Sessions</option>
                        {sessions.map(session => (
                          <option key={session.id} value={session.id}>
                            {session.name} {session.is_active ? '(Active)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Filter by Semester</label>
                      <select
                        className="form-select"
                        value={reportSemester}
                        onChange={(e) => setReportSemester(e.target.value)}
                      >
                        <option value="">All Semesters</option>
                        {reportFilteredSemesters.map(sem => (
                          <option key={sem.id} value={sem.id}>
                            {sem.name} {sem.is_active ? '(Active)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    {(reportSubTab === 'attendance' || reportSubTab === 'exams') && (
                      <div className="form-group">
                        <label className="form-label">Select Class</label>
                        <select
                          className="form-select"
                          value={selectedClassForPerformance?.id || ''}
                          onChange={(e) => {
                            const cls = classes.find(c => c.id === parseInt(e.target.value));
                            setSelectedClassForPerformance(cls);
                            if (cls) {
                              fetchClassKpis(cls.id);
                              fetchClassAttendance(cls.id);
                              fetchClassExams(cls.id);
                            }
                          }}
                        >
                          <option value="">-- Select a class --</option>
                          {classes.map(cls => (
                            <option key={cls.id} value={cls.id}>{cls.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {reportSubTab === 'exams' && selectedClassForPerformance && (
                      <div className="form-group">
                        <label className="form-label">Filter by Subject</label>
                        <select
                          className="form-select"
                          value={selectedSubject}
                          onChange={(e) => setSelectedSubject(e.target.value)}
                        >
                          <option value="all">All Subjects</option>
                          {availableSubjects.map(subject => (
                            <option key={subject} value={subject}>{subject}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {reportSubTab === 'individual' && (
                      <div className="form-group">
                        <label className="form-label">Select Student</label>
                        <select
                          className="form-select"
                          onChange={(e) => {
                            const studentId = parseInt(e.target.value);
                            if (studentId) fetchStudentReport(studentId);
                          }}
                        >
                          <option value="">-- Select a student --</option>
                          {students.map(student => (
                            <option key={student.id} value={student.id}>
                              {student.first_name} {student.last_name} ({student.student_id})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Attendance Reports Tab */}
              {reportSubTab === 'attendance' && selectedClassForPerformance && (
                <>
                  {/* Attendance KPIs Section */}
                  {classKpis && classKpis.classStats && (
                    <>
                      <h3 className="subsection-title">Attendance Metrics</h3>
                      <div className="kpi-grid">
                        <div className="kpi-card blue">
                          <div className="kpi-label">Attendance Rate</div>
                          <div className="kpi-value">
                            {(classKpis.classStats?.attendance_rate != null && !isNaN(classKpis.classStats.attendance_rate))
                              ? `${Number(classKpis.classStats.attendance_rate).toFixed(1)}%`
                              : 'N/A'}
                          </div>
                        </div>
                        <div className="kpi-card green">
                          <div className="kpi-label">Avg Dressing</div>
                          <div className="kpi-value">
                            {(classKpis.classStats?.avg_dressing_score != null && !isNaN(classKpis.classStats.avg_dressing_score))
                              ? Number(classKpis.classStats.avg_dressing_score).toFixed(2)
                              : 'N/A'}
                          </div>
                          <div className="kpi-sub">out of 4.0</div>
                        </div>
                        <div className="kpi-card yellow">
                          <div className="kpi-label">Avg Behavior</div>
                          <div className="kpi-value">
                            {(classKpis.classStats?.avg_behavior_score != null && !isNaN(classKpis.classStats.avg_behavior_score))
                              ? Number(classKpis.classStats.avg_behavior_score).toFixed(2)
                              : 'N/A'}
                          </div>
                          <div className="kpi-sub">out of 4.0</div>
                        </div>
                      </div>

                      {/* High Risk Students (Attendance) */}
                      {classKpis.highRiskStudents && classKpis.highRiskStudents.filter(s =>
                        s.attendance_rate < 70 || s.avg_dressing < 2.5 || s.avg_behavior < 2.5
                      ).length > 0 && (
                        <div className="alert-box danger">
                          <h4>At-Risk Students</h4>
                          <p>Students with attendance below 70% or poor grades (below 2.5/4.0)</p>
                          <div className="table-wrap">
                            <table className="table">
                              <thead>
                                <tr>
                                  <th>Student ID</th>
                                  <th>Name</th>
                                  <th>Attendance</th>
                                  <th>Dressing</th>
                                  <th>Behavior</th>
                                  <th>Risk Factors</th>
                                </tr>
                              </thead>
                              <tbody>
                                {classKpis.highRiskStudents
                                  .filter(s => s.attendance_rate < 70 || s.avg_dressing < 2.5 || s.avg_behavior < 2.5)
                                  .map(student => {
                                    const riskFactors = [];
                                    if (student.attendance_rate < 70) riskFactors.push('Low Attendance');
                                    if (student.avg_dressing < 2.5) riskFactors.push('Poor Dressing');
                                    if (student.avg_behavior < 2.5) riskFactors.push('Poor Behavior');

                                    return (
                                      <tr key={student.id}>
                                        <td><strong>{student.student_id}</strong></td>
                                        <td>{student.first_name} {student.last_name}</td>
                                        <td>
                                          <strong style={{ color: student.attendance_rate < 70 ? 'var(--error)' : 'var(--success)' }}>
                                            {student.attendance_rate != null ? `${Number(student.attendance_rate).toFixed(1)}%` : 'N/A'}
                                          </strong>
                                        </td>
                                        <td>
                                          <strong style={{ color: student.avg_dressing < 2.5 ? 'var(--error)' : 'var(--success)' }}>
                                            {student.avg_dressing != null ? Number(student.avg_dressing).toFixed(2) : 'N/A'}
                                          </strong>
                                        </td>
                                        <td>
                                          <strong style={{ color: student.avg_behavior < 2.5 ? 'var(--error)' : 'var(--success)' }}>
                                            {student.avg_behavior != null ? Number(student.avg_behavior).toFixed(2) : 'N/A'}
                                          </strong>
                                        </td>
                                        <td>
                                          {riskFactors.map((factor, idx) => (
                                            <span key={idx} className="risk-badge">{factor}</span>
                                          ))}
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Attendance Records */}
                  <div className="card">
                    <div className="card-header">Attendance Records</div>
                    <SortableTable
                      columns={[
                        {
                          key: 'date',
                          label: 'Date',
                          sortable: true,
                          sortType: 'date',
                          render: (row) => new Date(row.date).toLocaleDateString()
                        },
                        {
                          key: 'student_id',
                          label: 'Student ID',
                          sortable: true
                        },
                        {
                          key: 'name',
                          label: 'Student',
                          sortable: true,
                          render: (row) => `${row.first_name} ${row.last_name}`
                        },
                        {
                          key: 'present',
                          label: 'Present',
                          sortable: true,
                          sortType: 'boolean',
                          render: (row) => (
                            <span className={`badge ${row.present ? 'badge-success' : 'badge-danger'}`}>
                              {row.present ? 'Yes' : 'No'}
                            </span>
                          )
                        },
                        {
                          key: 'dressing_grade',
                          label: 'Dressing',
                          sortable: true,
                          render: (row) => row.dressing_grade || '-'
                        },
                        {
                          key: 'behavior_grade',
                          label: 'Behavior',
                          sortable: true,
                          render: (row) => row.behavior_grade || '-'
                        },
                        {
                          key: 'semester_name',
                          label: 'Semester',
                          sortable: true,
                          render: (row) => row.semester_name || '-'
                        }
                      ]}
                      data={classAttendance}
                      searchable={true}
                      searchPlaceholder="Search by student name or ID..."
                      searchKeys={['student_id', 'first_name', 'last_name']}
                      pagination={true}
                      pageSize={25}
                      emptyMessage="No attendance records found"
                    />
                  </div>
                </>
              )}

              {/* Attendance - Class not selected message */}
              {reportSubTab === 'attendance' && !selectedClassForPerformance && (
                <div className="card">
                  <div className="empty">
                    <p>Select a class to view attendance reports</p>
                  </div>
                </div>
              )}

              {/* Exam Reports Tab */}
              {reportSubTab === 'exams' && selectedClassForPerformance && (
                <>
                  {/* Exam KPIs by Subject */}
                  {examKpis && examKpis.length > 0 ? (
                    <>
                      {examKpis.map(kpi => (
                        <div key={kpi.subject} className="exam-subject-section">
                          <h3 className="exam-subject-title">
                            {kpi.subject}
                          </h3>

                          {/* Metrics Card */}
                          <div className="exam-metrics">
                            <div className="exam-metrics-grid">
                              <div className="exam-metric">
                                <div className="exam-metric-value primary">
                                  {kpi.presentCount}/{kpi.totalStudents}
                                </div>
                                <div className="exam-metric-label">Present</div>
                              </div>

                              <div className="exam-metric">
                                <div className={`exam-metric-value ${kpi.avgScore >= 70 ? 'success' : kpi.avgScore >= 50 ? 'warning' : 'error'}`}>
                                  {kpi.avgScore}%
                                </div>
                                <div className="exam-metric-label">Average</div>
                              </div>

                              <div className="exam-metric">
                                <div className={`exam-metric-value ${kpi.passRate >= 70 ? 'success' : kpi.passRate >= 50 ? 'warning' : 'error'}`}>
                                  {kpi.passRate}%
                                </div>
                                <div className="exam-metric-label">Pass Rate</div>
                              </div>

                              <div className="exam-metric">
                                <div className="exam-metric-value success">
                                  {kpi.passCount}
                                </div>
                                <div className="exam-metric-label">Passed</div>
                              </div>

                              <div className="exam-metric">
                                <div className="exam-metric-value error">
                                  {kpi.failCount}
                                </div>
                                <div className="exam-metric-label">Failed</div>
                              </div>

                              <div className="exam-metric">
                                <div className="exam-metric-value info">
                                  {kpi.highPerformers}
                                </div>
                                <div className="exam-metric-label">Excellence</div>
                              </div>
                            </div>
                          </div>

                          {/* Student Performance Table */}
                          <div className="card">
                            <SortableTable
                              columns={[
                                { 
                                  key: 'name', 
                                  label: 'Student', 
                                  sortable: true,
                                  render: (row) => <strong>{row.first_name} {row.last_name}</strong>
                                },
                                { key: 'student_id', label: 'Student ID', sortable: true },
                                { 
                                  key: 'exam_date', 
                                  label: 'Exam Date', 
                                  sortable: true, 
                                  sortType: 'date',
                                  render: (row) => new Date(row.exam_date).toLocaleDateString()
                                },
                                { 
                                  key: 'semester_name', 
                                  label: 'Semester', 
                                  sortable: true,
                                  render: (row) => row.semester_name || '-'
                                },
                                { 
                                  key: 'score', 
                                  label: 'Score', 
                                  sortable: true, 
                                  sortType: 'number',
                                  render: (row) => row.is_absent ? (
                                    <span style={{ color: 'var(--gray)', fontStyle: 'italic' }}>Absent</span>
                                  ) : (
                                    <span style={{ fontWeight: '600' }}>{row.score}/{row.max_score}</span>
                                  )
                                },
                                { 
                                  key: 'percentage', 
                                  label: 'Percentage', 
                                  sortable: true, 
                                  sortType: 'number',
                                  render: (row) => {
                                    const percentage = row.is_absent ? null : ((row.score / row.max_score) * 100).toFixed(2);
                                    return row.is_absent ? (
                                      <span style={{ color: 'var(--gray)' }}>N/A</span>
                                    ) : (
                                      <span style={{
                                        fontWeight: '700',
                                        fontSize: 'var(--text-lg)',
                                        color: percentage >= 80 ? 'var(--success)' :
                                               percentage >= 70 ? '#10b981' :
                                               percentage >= 50 ? 'var(--warning)' :
                                               'var(--error)'
                                      }}>
                                        {percentage}%
                                      </span>
                                    );
                                  }
                                },
                                { 
                                  key: 'status', 
                                  label: 'Status', 
                                  sortable: true,
                                  render: (row) => {
                                    const percentage = row.is_absent ? null : ((row.score / row.max_score) * 100).toFixed(2);
                                    if (row.is_absent) {
                                      return (
                                        <span style={{
                                          padding: '0.25rem 0.75rem',
                                          borderRadius: 'var(--radius)',
                                          fontSize: 'var(--text-sm)',
                                          fontWeight: '600',
                                          backgroundColor: 'var(--lighter)',
                                          color: 'var(--dark)'
                                        }}>
                                          {row.absence_reason}
                                        </span>
                                      );
                                    }
                                    if (percentage >= 50) {
                                      return (
                                        <span style={{
                                          padding: '0.25rem 0.75rem',
                                          borderRadius: 'var(--radius)',
                                          fontSize: 'var(--text-sm)',
                                          fontWeight: '600',
                                          backgroundColor: '#dcfce7',
                                          color: 'var(--success)'
                                        }}>
                                          ✓ Passed
                                        </span>
                                      );
                                    }
                                    return (
                                      <span style={{
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: 'var(--radius)',
                                        fontSize: 'var(--text-sm)',
                                        fontWeight: '600',
                                        backgroundColor: '#fee2e2',
                                        color: 'var(--error)'
                                      }}>
                                        ✗ Failed
                                      </span>
                                    );
                                  }
                                },
                                { 
                                  key: 'notes', 
                                  label: 'Notes', 
                                  sortable: false,
                                  render: (row) => row.notes || '-'
                                }
                              ]}
                              data={kpi.records}
                            />
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="card">
                      <div className="empty">
                        <p>No exam records yet for this class.</p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Exams - Class not selected message */}
              {reportSubTab === 'exams' && !selectedClassForPerformance && (
                <div className="card">
                  <div className="empty">
                    <p>Select a class to view exam reports</p>
                  </div>
                </div>
              )}

              {/* Individual Student Report Tab */}
              {reportSubTab === 'individual' && studentReport && selectedStudentForReport && (
                <>
                  {/* Student Header */}
                  <div className="report-header">
                    <h3>{selectedStudentForReport.first_name} {selectedStudentForReport.last_name}</h3>
                    <p><strong>Student ID:</strong> {selectedStudentForReport.student_id}</p>
                    <p><strong>Class:</strong> {selectedStudentForReport.class_name || 'Not assigned'}</p>

                    <div className="report-stats">
                      <div className="report-stat">
                        <div className="report-stat-value">{studentReport.attendance.totalDays}</div>
                        <div className="report-stat-label">Total Days</div>
                      </div>
                      <div className="report-stat">
                        <div className="report-stat-value success">{studentReport.attendance.presentDays}</div>
                        <div className="report-stat-label">Present</div>
                      </div>
                      <div className="report-stat">
                        <div className="report-stat-value">
                          {studentReport.attendance.attendanceRate != null 
                            ? `${studentReport.attendance.attendanceRate}%` 
                            : 'N/A'}
                        </div>
                        <div className="report-stat-label">Attendance Rate</div>
                      </div>
                      <div className="report-stat">
                        <div className="report-stat-value danger">
                          {studentReport.attendance.totalDays != null && studentReport.attendance.presentDays != null
                            ? studentReport.attendance.totalDays - studentReport.attendance.presentDays
                            : 0}
                        </div>
                        <div className="report-stat-label">Absent</div>
                      </div>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <h3 className="subsection-title">Performance Metrics</h3>
                  <div className="metric-grid">
                    <div className="metric-card">
                      <div className="metric-label">Average Dressing Grade</div>
                      <div className="metric-value green">
                        {studentReport.dressingBehavior?.avgDressing
                          ? studentReport.dressingBehavior.avgDressing.toFixed(2)
                          : 'N/A'}
                      </div>
                      <div className="metric-sub">out of 4.0</div>
                      {studentReport.dressingBehavior?.avgDressing && (
                        <span className={`metric-badge ${
                          studentReport.dressingBehavior.avgDressing >= 3.5 ? 'excellent' :
                          studentReport.dressingBehavior.avgDressing >= 2.5 ? 'good' : 'needs-improvement'
                        }`}>
                          {studentReport.dressingBehavior.avgDressing >= 3.5 ? 'Excellent' :
                           studentReport.dressingBehavior.avgDressing >= 2.5 ? 'Good' : 'Needs Improvement'}
                        </span>
                      )}
                    </div>
                    <div className="metric-card">
                      <div className="metric-label">Average Behavior Grade</div>
                      <div className="metric-value purple">
                        {studentReport.dressingBehavior?.avgBehavior
                          ? studentReport.dressingBehavior.avgBehavior.toFixed(2)
                          : 'N/A'}
                      </div>
                      <div className="metric-sub">out of 4.0</div>
                      {studentReport.dressingBehavior?.avgBehavior && (
                        <span className={`metric-badge ${
                          studentReport.dressingBehavior.avgBehavior >= 3.5 ? 'excellent' :
                          studentReport.dressingBehavior.avgBehavior >= 2.5 ? 'good' : 'needs-improvement'
                        }`}>
                          {studentReport.dressingBehavior.avgBehavior >= 3.5 ? 'Excellent' :
                           studentReport.dressingBehavior.avgBehavior >= 2.5 ? 'Good' : 'Needs Improvement'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Overall Comment */}
                  <div className="card">
                    <div className="card-header">Overall Comment</div>
                    <div className="card-body">
                      <textarea
                        className="form-textarea"
                        rows="4"
                        value={selectedStudentForReport.notes || ''}
                        onChange={(e) => {
                          setSelectedStudentForReport({
                            ...selectedStudentForReport,
                            notes: e.target.value
                          });
                        }}
                        placeholder="Add overall comment about student's performance..."
                      />
                      <div className="form-actions">
                        <button
                          className="btn btn-primary"
                          onClick={() => updateStudentComment(selectedStudentForReport.id, selectedStudentForReport.notes)}
                        >
                          Save Comment
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Recent Attendance */}
                  <div className="card">
                    <div className="card-header">Recent Attendance</div>
                    <div className="table-wrap">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Present</th>
                            <th>Dressing</th>
                            <th>Behavior</th>
                            <th>Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentReport.attendance.records.slice(0, 10).map((record, idx) => (
                            <tr key={idx}>
                              <td>{new Date(record.date).toLocaleDateString()}</td>
                              <td>
                                <span className={`badge ${record.present ? 'badge-success' : 'badge-danger'}`}>
                                  {record.present ? 'Yes' : 'No'}
                                </span>
                              </td>
                              <td>{record.dressing_grade || '-'}</td>
                              <td>{record.behavior_grade || '-'}</td>
                              <td>{record.notes || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Exam Results */}
                  <div className="card">
                    <div className="card-header">Exam Results</div>
                    <div className="table-wrap">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Score</th>
                            <th>Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentReport.exams.map((exam, idx) => (
                            <tr key={idx}>
                              <td>{new Date(exam.exam_date).toLocaleDateString()}</td>
                              <td>{exam.exam_type}</td>
                              <td><strong>{exam.score}</strong></td>
                              <td>{exam.notes || '-'}</td>
                            </tr>
                          ))}
                          {studentReport.exams.length === 0 && (
                            <tr><td colSpan="4"><div className="empty"><p>No exam records</p></div></td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {/* Student not selected message */}
              {reportSubTab === 'individual' && !studentReport && (
                <div className="card">
                  <div className="empty">
                    <p>Select a student to view their report</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <>
              <div className="section-header">
                <h2>Settings</h2>
              </div>

              {/* Change Password */}
              <div className="card">
                <h3>Change Password</h3>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                    toast.error('New passwords do not match');
                    return;
                  }
                  if (passwordForm.newPassword.length < 8) {
                    toast.error('Password must be at least 8 characters');
                    return;
                  }
                  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/;
                  if (!passwordRegex.test(passwordForm.newPassword)) {
                    toast.error('Password must contain uppercase, lowercase, number, and special character');
                    return;
                  }
                  setChangingPassword(true);
                  try {
                    await api.post('/password/change-password', {
                      currentPassword: passwordForm.currentPassword,
                      newPassword: passwordForm.newPassword
                    });
                    toast.success('Password changed successfully');
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  } catch (error) {
                    toast.error(error.response?.data?.error || 'Failed to change password');
                  } finally {
                    setChangingPassword(false);
                  }
                }} style={{ maxWidth: '400px' }}>
                  <div className="form-group">
                    <label>Current Password</label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>New Password</label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      required
                      minLength={8}
                    />
                    <small style={{ color: 'var(--muted)', fontSize: '12px' }}>
                      Min 8 characters, uppercase, lowercase, number, and special character
                    </small>
                  </div>
                  <div className="form-group">
                    <label>Confirm New Password</label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                  <button type="submit" className="btn primary" disabled={changingPassword}>
                    {changingPassword ? 'Changing...' : 'Change Password'}
                  </button>
                </form>
              </div>

              {/* Account Info */}
              <div className="card" style={{ marginTop: '20px' }}>
                <h3>Account Information</h3>
                <div style={{ display: 'grid', gap: '12px', maxWidth: '400px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Name</label>
                    <p style={{ margin: '4px 0 0 0' }}>{user?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Email</label>
                    <p style={{ margin: '4px 0 0 0' }}>{user?.email || 'N/A'}</p>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Role</label>
                    <p style={{ margin: '4px 0 0 0', textTransform: 'capitalize' }}>{user?.role || 'Admin'}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default AdminDashboard;
