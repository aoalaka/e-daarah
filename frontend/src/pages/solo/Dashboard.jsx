import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../../services/api';
import { authService } from '../../services/auth.service';
import SortableTable from '../../components/SortableTable';
import EmailVerificationBanner from '../../components/EmailVerificationBanner';
import DemoBanner from '../../components/DemoBanner';
import AnnouncementBanner from '../../components/AnnouncementBanner';
import '../admin/Dashboard.css';

function SoloDashboard() {
  const fmtDate = (d) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getLocalDate = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const navigate = useNavigate();
  const { madrasahSlug } = useParams();
  const user = authService.getCurrentUser();

  // ─── Core state ──────────────────────────────────
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [madrasahProfile, setMadrasahProfile] = useState(null);

  // ─── Overview ────────────────────────────────────
  const [overviewData, setOverviewData] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  // ─── Sessions & Semesters ────────────────────────
  const [sessions, setSessions] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [showSemesterForm, setShowSemesterForm] = useState(false);
  const [newSession, setNewSession] = useState({ name: '', start_date: '', end_date: '', is_active: false, default_school_days: [] });
  const [newSemester, setNewSemester] = useState({ session_id: '', name: '', start_date: '', end_date: '', is_active: false });
  const [editingSession, setEditingSession] = useState(null);
  const [editingSemester, setEditingSemester] = useState(null);
  const [plannerSubTab, setPlannerSubTab] = useState('sessions');

  // ─── Classes ─────────────────────────────────────
  const [classes, setClasses] = useState([]);
  const [showClassForm, setShowClassForm] = useState(false);
  const [newClass, setNewClass] = useState({ name: '', grade_level: '', school_days: [], description: '' });
  const [editingClass, setEditingClass] = useState(null);

  // ─── Students ────────────────────────────────────
  const [students, setStudents] = useState([]);
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [newStudent, setNewStudent] = useState({
    first_name: '', last_name: '', student_id: '', gender: '', class_id: '',
    student_phone: '', student_phone_country_code: '+64',
    street: '', city: '', state: '', country: '',
    parent_guardian_name: '', parent_guardian_relationship: '',
    parent_guardian_phone: '', parent_guardian_phone_country_code: '+64',
    notes: '', expected_fee: '', fee_note: ''
  });
  const [editingStudent, setEditingStudent] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentClassFilter, setStudentClassFilter] = useState('');

  // ─── Attendance ──────────────────────────────────
  const [selectedClass, setSelectedClass] = useState(null);
  const [attendanceDate, setAttendanceDate] = useState(getLocalDate());
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [attendanceStudents, setAttendanceStudents] = useState([]);
  const [saving, setSaving] = useState(false);
  const [activeSemester, setActiveSemester] = useState(null);
  const [attendanceSubTab, setAttendanceSubTab] = useState('record');
  const [attendanceHistory, setAttendanceHistory] = useState([]);

  // ─── Exams ───────────────────────────────────────
  const [examPerformance, setExamPerformance] = useState([]);
  const [showExamModal, setShowExamModal] = useState(false);
  const [examForm, setExamForm] = useState({
    session_id: '', semester_id: '', subject: '', exam_date: getLocalDate(), max_score: 100, students: []
  });
  const [examFilterSession, setExamFilterSession] = useState('');
  const [examFilterSemester, setExamFilterSemester] = useState('');
  const [examFilteredSemesters, setExamFilteredSemesters] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [showEditExamModal, setShowEditExamModal] = useState(false);
  const [editingExamRecord, setEditingExamRecord] = useState(null);

  // ─── Qur'an ──────────────────────────────────────
  const [quranSubTab, setQuranSubTab] = useState('record');
  const [quranPositions, setQuranPositions] = useState([]);
  const [quranRecords, setQuranRecords] = useState([]);
  const [quranSelectedStudent, setQuranSelectedStudent] = useState(null);
  const [quranStudentPosition, setQuranStudentPosition] = useState(null);
  const [quranStudentHistory, setQuranStudentHistory] = useState([]);
  const [quranSessionType, setQuranSessionType] = useState('tilawah');
  const [quranSurah, setQuranSurah] = useState('');
  const [quranAyahFrom, setQuranAyahFrom] = useState('');
  const [quranAyahTo, setQuranAyahTo] = useState('');
  const [quranGrade, setQuranGrade] = useState('Good');
  const [quranPassed, setQuranPassed] = useState(true);
  const [quranNotes, setQuranNotes] = useState('');
  const [quranSaving, setQuranSaving] = useState(false);
  const [quranDate, setQuranDate] = useState(getLocalDate());
  const [surahs, setSurahs] = useState([]);

  // ─── Fees ────────────────────────────────────────
  const [feeSummary, setFeeSummary] = useState([]);
  const [feePayments, setFeePayments] = useState([]);
  const [showFeePaymentForm, setShowFeePaymentForm] = useState(false);
  const [feePaymentForm, setFeePaymentForm] = useState({
    student_id: '', amount_paid: '', payment_date: getLocalDate(), payment_method: 'cash', reference_note: '', payment_label: ''
  });
  const [feeClassFilter, setFeeClassFilter] = useState('');

  // ─── Settings ────────────────────────────────────
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // ─── Browser tab title ───────────────────────────
  useEffect(() => {
    const labels = {
      overview: 'Overview', planner: 'Planner', classes: 'Classes', students: 'Students',
      attendance: 'Attendance', exams: 'Exams', quran: "Qur'an", fees: 'Fees', settings: 'Settings', help: 'Help'
    };
    document.title = `${labels[activeTab] || 'Dashboard'} — e-Daarah`;
  }, [activeTab]);

  // ─── Close profile dropdown on outside click ────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ─── Initial data load ──────────────────────────
  useEffect(() => {
    loadData();
    fetchSurahs();
  }, []);

  // ─── Overview refresh ────────────────────────────
  useEffect(() => {
    if (activeTab === 'overview') fetchOverview();
  }, [activeTab]);

  // ─── Set active semester from semesters ──────────
  useEffect(() => {
    const active = semesters.find(s => s.is_active);
    setActiveSemester(active || null);
  }, [semesters]);

  // ─── Fetch attendance students when class/date changes
  useEffect(() => {
    if (activeTab === 'attendance' && selectedClass && activeSemester) {
      fetchAttendanceStudents();
    }
  }, [selectedClass, attendanceDate, activeSemester, activeTab]);

  // ─── Fetch attendance history ────────────────────
  useEffect(() => {
    if (activeTab === 'attendance' && attendanceSubTab === 'view' && selectedClass) {
      fetchAttendanceHistory();
    }
  }, [selectedClass, attendanceSubTab, activeTab]);

  // ─── Fetch exam data ─────────────────────────────
  useEffect(() => {
    if (activeTab === 'exams' && selectedClass) {
      fetchExamPerformance();
    }
  }, [selectedClass, examFilterSemester, selectedSubject, activeTab]);

  // ─── Filter semesters for exam filter ────────────
  useEffect(() => {
    if (examFilterSession) {
      setExamFilteredSemesters(semesters.filter(s => String(s.session_id) === examFilterSession));
    } else {
      setExamFilteredSemesters(semesters);
    }
  }, [examFilterSession, semesters]);

  // ─── Fetch Qur'an data ──────────────────────────
  useEffect(() => {
    if (activeTab === 'quran' && selectedClass) {
      fetchQuranPositions();
      fetchQuranRecords();
    }
  }, [selectedClass, activeTab]);

  // ─── Fetch Qur'an student position when selected
  useEffect(() => {
    if (quranSelectedStudent) {
      fetchQuranStudentPosition(quranSelectedStudent.id);
      fetchQuranStudentHistory(quranSelectedStudent.id);
    }
  }, [quranSelectedStudent]);

  // ─── Fetch fee data ──────────────────────────────
  useEffect(() => {
    if (activeTab === 'fees') {
      fetchFeeSummary();
      fetchFeePayments();
    }
  }, [activeTab, feeClassFilter]);


  // ════════════════════════════════════════════════
  // DATA FETCHING
  // ════════════════════════════════════════════════

  const loadData = async () => {
    setLoading(true);
    try {
      const [sessionsRes, semestersRes, classesRes, studentsRes, profileRes] = await Promise.all([
        api.get('/solo/sessions').catch(() => ({ data: [] })),
        api.get('/solo/semesters').catch(() => ({ data: [] })),
        api.get('/solo/classes').catch(() => ({ data: [] })),
        api.get('/solo/students').catch(() => ({ data: [] })),
        api.get('/solo/profile').catch(() => ({ data: null }))
      ]);
      setSessions(sessionsRes.data || []);
      setSemesters(semestersRes.data || []);
      setClasses(classesRes.data || []);
      setStudents(studentsRes.data || []);
      setMadrasahProfile(profileRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOverview = async () => {
    setOverviewLoading(true);
    try {
      const res = await api.get('/solo/dashboard');
      setOverviewData(res.data);
    } catch (error) {
      console.error('Failed to fetch overview:', error);
    } finally {
      setOverviewLoading(false);
    }
  };

  const fetchSurahs = async () => {
    try {
      const res = await api.get('/solo/quran/surahs');
      setSurahs(res.data);
    } catch (e) { /* ignore */ }
  };

  const fetchAttendanceStudents = async () => {
    if (!selectedClass) return;
    try {
      // Fetch students in the class
      const studentsInClass = students.filter(s => s.class_id === selectedClass.id);
      setAttendanceStudents(studentsInClass);

      // Fetch existing attendance for this date
      const res = await api.get(`/solo/attendance/class/${selectedClass.id}?date=${attendanceDate}`);
      const records = {};
      (res.data || []).forEach(r => {
        records[r.student_id] = {
          present: r.present,
          dressing_grade: r.dressing_grade || '',
          behavior_grade: r.behavior_grade || '',
          notes: r.notes || ''
        };
      });
      // Initialize missing students
      studentsInClass.forEach(s => {
        if (!records[s.id]) {
          records[s.id] = { present: true, dressing_grade: '', behavior_grade: '', notes: '' };
        }
      });
      setAttendanceRecords(records);
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    }
  };

  const fetchAttendanceHistory = async () => {
    if (!selectedClass) return;
    try {
      const res = await api.get(`/solo/attendance/class/${selectedClass.id}`);
      setAttendanceHistory(res.data || []);
    } catch (error) {
      console.error('Failed to fetch attendance history:', error);
    }
  };

  const fetchExamPerformance = async () => {
    if (!selectedClass) return;
    try {
      let url = `/solo/classes/${selectedClass.id}/exam-performance?`;
      if (examFilterSemester) url += `semesterId=${examFilterSemester}&`;
      if (selectedSubject && selectedSubject !== 'all') url += `subject=${selectedSubject}&`;
      const res = await api.get(url);
      const data = res.data || [];
      setExamPerformance(data);
      const subjects = [...new Set(data.map(r => r.subject))].sort();
      setAvailableSubjects(subjects);
    } catch (error) {
      console.error('Failed to fetch exam performance:', error);
    }
  };

  const fetchQuranPositions = async () => {
    if (!selectedClass) return;
    try {
      const res = await api.get(`/solo/classes/${selectedClass.id}/quran-positions`);
      setQuranPositions(res.data || []);
    } catch (error) {
      console.error('Failed to fetch quran positions:', error);
    }
  };

  const fetchQuranRecords = async () => {
    if (!selectedClass) return;
    try {
      const semId = activeSemester?.id;
      let url = `/solo/classes/${selectedClass.id}/quran-progress`;
      if (semId) url += `?semester_id=${semId}`;
      const res = await api.get(url);
      setQuranRecords(res.data || []);
    } catch (error) {
      console.error('Failed to fetch quran records:', error);
    }
  };

  const fetchQuranStudentPosition = async (studentId) => {
    try {
      const res = await api.get(`/solo/quran/student/${studentId}/position`);
      setQuranStudentPosition(res.data);
    } catch (e) { setQuranStudentPosition(null); }
  };

  const fetchQuranStudentHistory = async (studentId) => {
    try {
      const res = await api.get(`/solo/quran/student/${studentId}/history?limit=20`);
      setQuranStudentHistory(res.data || []);
    } catch (e) { setQuranStudentHistory([]); }
  };

  const fetchFeeSummary = async () => {
    try {
      let url = '/solo/fee-summary';
      if (feeClassFilter) url += `?class_id=${feeClassFilter}`;
      const res = await api.get(url);
      setFeeSummary(res.data || []);
    } catch (e) { console.error('Failed to fetch fee summary:', e); }
  };

  const fetchFeePayments = async () => {
    try {
      let url = '/solo/fee-payments';
      if (feeClassFilter) url += `?class_id=${feeClassFilter}`;
      const res = await api.get(url);
      setFeePayments(res.data || []);
    } catch (e) { console.error('Failed to fetch fee payments:', e); }
  };


  // ════════════════════════════════════════════════
  // CRUD HANDLERS
  // ════════════════════════════════════════════════

  // ─── Sessions ────────────────────────────────────
  const handleCreateSession = async (e) => {
    e.preventDefault();
    try {
      if (editingSession) {
        await api.put(`/solo/sessions/${editingSession.id}`, newSession);
        toast.success('Session updated');
      } else {
        await api.post('/solo/sessions', newSession);
        toast.success('Session created');
      }
      setShowSessionForm(false);
      setEditingSession(null);
      setNewSession({ name: '', start_date: '', end_date: '', is_active: false, default_school_days: [] });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save session');
    }
  };

  const handleDeleteSession = async (id) => {
    try {
      await api.delete(`/solo/sessions/${id}`);
      toast.success('Session deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete session');
    }
  };

  // ─── Semesters ───────────────────────────────────
  const handleCreateSemester = async (e) => {
    e.preventDefault();
    try {
      if (editingSemester) {
        await api.put(`/solo/semesters/${editingSemester.id}`, newSemester);
        toast.success('Semester updated');
      } else {
        await api.post('/solo/semesters', newSemester);
        toast.success('Semester created');
      }
      setShowSemesterForm(false);
      setEditingSemester(null);
      setNewSemester({ session_id: '', name: '', start_date: '', end_date: '', is_active: false });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save semester');
    }
  };

  // ─── Classes ─────────────────────────────────────
  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      if (editingClass) {
        await api.put(`/solo/classes/${editingClass.id}`, newClass);
        toast.success('Class updated');
      } else {
        await api.post('/solo/classes', newClass);
        toast.success('Class created');
      }
      setShowClassForm(false);
      setEditingClass(null);
      setNewClass({ name: '', grade_level: '', school_days: [], description: '' });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save class');
    }
  };

  const handleDeleteClass = async (id) => {
    try {
      await api.delete(`/solo/classes/${id}`);
      toast.success('Class deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete class');
    }
  };

  // ─── Students ────────────────────────────────────
  const handleCreateStudent = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...newStudent };
      if (!payload.class_id) delete payload.class_id;
      if (editingStudent) {
        await api.put(`/solo/students/${editingStudent.id}`, payload);
        toast.success('Student updated');
      } else {
        await api.post('/solo/students', payload);
        toast.success('Student created');
      }
      setShowStudentForm(false);
      setEditingStudent(null);
      setNewStudent({
        first_name: '', last_name: '', student_id: '', gender: '', class_id: '',
        student_phone: '', student_phone_country_code: '+64',
        street: '', city: '', state: '', country: '',
        parent_guardian_name: '', parent_guardian_relationship: '',
        parent_guardian_phone: '', parent_guardian_phone_country_code: '+64',
        notes: '', expected_fee: '', fee_note: ''
      });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save student');
    }
  };

  const handleDeleteStudent = async (id) => {
    try {
      await api.delete(`/solo/students/${id}`);
      toast.success('Student deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete student');
    }
  };

  // ─── Attendance ──────────────────────────────────
  const handleSaveAttendance = async () => {
    if (!selectedClass || !activeSemester) {
      toast.error('Please select a class and ensure there is an active semester');
      return;
    }
    setSaving(true);
    try {
      for (const student of attendanceStudents) {
        const record = attendanceRecords[student.id];
        if (record) {
          await api.post('/solo/attendance', {
            student_id: student.id,
            class_id: selectedClass.id,
            date: attendanceDate,
            present: record.present,
            dressing_grade: record.dressing_grade || null,
            behavior_grade: record.behavior_grade || null,
            notes: record.notes || null
          });
        }
      }
      toast.success('Attendance saved');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  // ─── Exam Performance ────────────────────────────
  const handleSaveExamPerformance = async (e) => {
    e.preventDefault();
    try {
      const activeSession = sessions.find(s => s.is_active);
      await api.post(`/solo/classes/${selectedClass.id}/exam-performance/bulk`, {
        session_id: examForm.session_id || activeSession?.id,
        semester_id: examForm.semester_id || activeSemester?.id,
        subject: examForm.subject,
        exam_date: examForm.exam_date,
        max_score: examForm.max_score,
        students: examForm.students
      });
      toast.success('Exam performance recorded');
      setShowExamModal(false);
      fetchExamPerformance();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to record exam performance');
    }
  };

  const handleEditExamRecord = async (e) => {
    e.preventDefault();
    if (!editingExamRecord) return;
    try {
      await api.put(`/solo/exam-performance/${editingExamRecord.id}`, {
        score: editingExamRecord.score,
        is_absent: editingExamRecord.is_absent,
        absence_reason: editingExamRecord.absence_reason,
        notes: editingExamRecord.notes
      });
      toast.success('Exam record updated');
      setShowEditExamModal(false);
      setEditingExamRecord(null);
      fetchExamPerformance();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update record');
    }
  };

  const handleDeleteExamRecord = async (id) => {
    try {
      await api.delete(`/solo/exam-performance/${id}`);
      toast.success('Exam record deleted');
      fetchExamPerformance();
    } catch (error) {
      toast.error('Failed to delete record');
    }
  };

  // ─── Qur'an ──────────────────────────────────────
  const handleRecordQuran = async () => {
    if (!quranSelectedStudent || !selectedClass || !activeSemester || !quranSurah) {
      toast.error('Please fill in all required fields');
      return;
    }
    const surah = surahs.find(s => String(s.n) === String(quranSurah));
    if (!surah) { toast.error('Invalid surah'); return; }
    setQuranSaving(true);
    try {
      await api.post('/solo/quran/record', {
        student_id: quranSelectedStudent.id,
        class_id: selectedClass.id,
        semester_id: activeSemester.id,
        date: quranDate,
        type: quranSessionType,
        surah_number: surah.n,
        surah_name: surah.name,
        juz: surah.juz,
        ayah_from: parseInt(quranAyahFrom),
        ayah_to: parseInt(quranAyahTo),
        grade: quranGrade,
        passed: quranPassed,
        notes: quranNotes
      });
      toast.success(quranPassed ? 'Passed — position updated' : 'Repeat — recorded');
      setQuranAyahFrom('');
      setQuranAyahTo('');
      setQuranNotes('');
      fetchQuranPositions();
      fetchQuranRecords();
      fetchQuranStudentPosition(quranSelectedStudent.id);
      fetchQuranStudentHistory(quranSelectedStudent.id);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to record progress');
    } finally {
      setQuranSaving(false);
    }
  };

  const handleDeleteQuranRecord = async (id) => {
    try {
      await api.delete(`/solo/quran-progress/${id}`);
      toast.success('Record deleted');
      fetchQuranRecords();
    } catch (error) {
      toast.error('Failed to delete record');
    }
  };

  // ─── Fee Payments ────────────────────────────────
  const handleRecordFeePayment = async (e) => {
    e.preventDefault();
    try {
      await api.post('/solo/fee-payments', feePaymentForm);
      toast.success('Payment recorded');
      setShowFeePaymentForm(false);
      setFeePaymentForm({ student_id: '', amount_paid: '', payment_date: getLocalDate(), payment_method: 'cash', reference_note: '', payment_label: '' });
      fetchFeeSummary();
      fetchFeePayments();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to record payment');
    }
  };

  const handleDeleteFeePayment = async (id) => {
    try {
      await api.delete(`/solo/fee-payments/${id}`);
      toast.success('Payment voided');
      fetchFeeSummary();
      fetchFeePayments();
    } catch (error) {
      toast.error('Failed to void payment');
    }
  };

  // ─── Settings ────────────────────────────────────
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/.test(passwordForm.newPassword)) {
      toast.error('Password must contain uppercase, lowercase, number, and symbol');
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
  };

  const handleSaveSettings = async (settings) => {
    setSavingSettings(true);
    try {
      const res = await api.put('/solo/settings', settings);
      setMadrasahProfile(prev => ({ ...prev, ...res.data }));
      toast.success('Settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  // ─── Other helpers ───────────────────────────────
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    const isDemo = user?.isDemo;
    authService.logout();
    navigate(isDemo ? '/demo' : `/${madrasahSlug}/login`);
  };


  // ════════════════════════════════════════════════
  // NAV CONFIG
  // ════════════════════════════════════════════════

  const navGroups = [
    { items: [{ id: 'overview', label: 'Overview' }] },
    { label: 'Manage', items: [
      { id: 'planner', label: 'Planner' },
      { id: 'classes', label: 'Classes' },
      { id: 'students', label: 'Students' },
    ]},
    { label: 'Teach', items: [
      { id: 'attendance', label: 'Attendance' },
      { id: 'exams', label: 'Exam Recording' },
      ...(madrasahProfile?.enable_quran_tracking ? [{ id: 'quran', label: "Qur'an" }] : []),
      ...(madrasahProfile?.enable_fee_tracking ? [{ id: 'fees', label: 'Fees' }] : []),
    ]},
    { label: 'System', items: [
      { id: 'settings', label: 'Settings' },
      { id: 'help', label: 'Help' },
    ]},
  ];

  const getNavIcon = (id) => {
    const iconProps = {
      width: "18", height: "18", viewBox: "0 0 24 24", fill: "none",
      stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round",
      style: { minWidth: '18px' }
    };
    switch (id) {
      case 'overview':
        return <svg {...iconProps}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>;
      case 'planner':
        return <svg {...iconProps}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
      case 'classes':
        return <svg {...iconProps}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>;
      case 'students':
        return <svg {...iconProps}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
      case 'attendance':
        return <svg {...iconProps}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M9 14l2 2 4-4"></path></svg>;
      case 'exams':
        return <svg {...iconProps}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>;
      case 'quran':
        return <svg {...iconProps}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>;
      case 'fees':
        return <svg {...iconProps}><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
      case 'settings':
        return <svg {...iconProps}><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;
      case 'help':
        return <svg {...iconProps}><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;
      default:
        return null;
    }
  };

  // Filtered students for student tab
  const filteredStudents = students.filter(s => {
    const matchesSearch = !studentSearch ||
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.student_id || '').toLowerCase().includes(studentSearch.toLowerCase());
    const matchesClass = !studentClassFilter || String(s.class_id) === studentClassFilter;
    return matchesSearch && matchesClass;
  });


  // ════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="dashboard">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
          <div className="loading-state">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Mobile Sidebar Overlay */}
      <div className={`sidebar-overlay ${mobileMenuOpen ? 'visible' : ''}`} onClick={() => setMobileMenuOpen(false)} />

      {/* Sidebar */}
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <img src="/e-daarah-blackbg-logo.png" alt="e-Daarah" className="sidebar-logo-img" />
          <span className="sidebar-logo-text">e-Daarah</span>
          <button className="sidebar-collapse-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} aria-label="Toggle sidebar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points={sidebarCollapsed ? "9 18 15 12 9 6" : "15 18 9 12 15 6"}></polyline>
            </svg>
          </button>
        </div>
        <nav className="sidebar-nav">
          {navGroups.map((group, gi) => (
            <div key={gi} className="nav-group">
              {group.label && !sidebarCollapsed && <div className="nav-group-label">{group.label}</div>}
              {gi > 0 && sidebarCollapsed && <div className="nav-group-divider" />}
              {group.items.map(item => (
                <button
                  key={item.id}
                  className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => handleTabChange(item.id)}
                >
                  {getNavIcon(item.id)}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer" ref={profileDropdownRef}>
          <div className="sidebar-user" onClick={() => setProfileDropdownOpen(!profileDropdownOpen)} style={{ cursor: 'pointer' }}>
            <div className="user-avatar">
              {user?.firstName?.charAt(0) || 'S'}
            </div>
            <div className="user-info">
              <div className="user-name">{user?.firstName} {user?.lastName}</div>
              <div className="user-role">Solo Admin</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, transform: profileDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
          </div>
          {profileDropdownOpen && (
            <div className="profile-dropdown">
              <div className="profile-dropdown-header">
                <div className="user-avatar" style={{ width: 36, height: 36, minWidth: 36, fontSize: 14 }}>
                  {user?.firstName?.charAt(0) || 'S'}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.firstName} {user?.lastName}</div>
                  <div style={{ fontSize: 11, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
                </div>
              </div>
              <div className="profile-dropdown-divider" />
              <button className="profile-dropdown-item" onClick={() => { handleTabChange('settings'); setProfileDropdownOpen(false); setTimeout(() => document.getElementById('settings-account')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                Account
              </button>
              <button className="profile-dropdown-item" onClick={() => { handleTabChange('settings'); setProfileDropdownOpen(false); setTimeout(() => document.getElementById('settings-password')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0110 0v4"></path></svg>
                Change Password
              </button>
              <button className="profile-dropdown-item" onClick={() => { handleTabChange('settings'); setProfileDropdownOpen(false); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"></path></svg>
                Settings
              </button>
              <div className="profile-dropdown-divider" />
              <button className="profile-dropdown-item logout" onClick={handleLogout}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                Log out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Wrapper */}
      <div className={`main-wrapper ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Header */}
        <header className="header">
          <div className="header-left">
            <button className={`menu-toggle ${mobileMenuOpen ? 'active' : ''}`} onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
              <span className="menu-toggle-icon"><span></span><span></span><span></span></span>
            </button>
            <span className="header-title">{madrasahProfile?.name || 'Dashboard'}</span>
          </div>
          <div className="header-actions"></div>
        </header>

        {/* Banners */}
        <EmailVerificationBanner />
        <DemoBanner />
        <AnnouncementBanner />

        {/* Main Content */}
        <main className="main">

          {/* ═══════ OVERVIEW TAB ═══════ */}
          {activeTab === 'overview' && (
            <>
              <div className="overview-greeting">
                <h2 className="page-title">
                  {(() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; })()}{user?.firstName ? `, ${user.firstName}` : ''}
                </h2>
                <span className="overview-context">{activeSemester ? activeSemester.name : 'No active semester'}</span>
              </div>

              {overviewLoading ? (
                <div className="card"><div className="loading-state">Loading overview...</div></div>
              ) : overviewData ? (
                <>
                  <div className="insights-summary">
                    <div className="summary-card">
                      <div className="summary-label">Students</div>
                      <div className="summary-value">{overviewData.students}</div>
                    </div>
                    <div className="summary-card">
                      <div className="summary-label">Classes</div>
                      <div className="summary-value">{overviewData.classes}</div>
                    </div>
                    <div className="summary-card">
                      <div className="summary-label">Present Today</div>
                      <div className="summary-value">{overviewData.attendance?.present || 0}/{overviewData.attendance?.total || 0}</div>
                    </div>
                    <div className="summary-card">
                      <div className="summary-label">Fees Collected</div>
                      <div className="summary-value">{madrasahProfile?.currency || '$'}{Number(overviewData.fees?.total_paid || 0).toLocaleString()}</div>
                      <div className="summary-meta">of {madrasahProfile?.currency || '$'}{Number(overviewData.fees?.total_expected || 0).toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="today-classes-grid" style={{ marginTop: 'var(--lg)' }}>
                    {classes.map(cls => (
                      <div key={cls.id} className="today-class-card" onClick={() => { setSelectedClass(cls); handleTabChange('attendance'); }}>
                        <div className="class-name">{cls.name}</div>
                        <div className="class-student-count">{cls.student_count || 0} students</div>
                        <div className="attendance-status not-taken">Take attendance →</div>
                      </div>
                    ))}
                    {classes.length === 0 && (
                      <div className="card" style={{ gridColumn: '1/-1' }}>
                        <div className="empty">
                          <p>No classes yet. Create one to get started.</p>
                          <button className="empty-action" onClick={() => handleTabChange('classes')}>+ Create Class</button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="card"><div className="empty"><p>Failed to load overview data.</p></div></div>
              )}
            </>
          )}

          {/* ═══════ PLANNER TAB ═══════ */}
          {activeTab === 'planner' && (
            <>
              <div className="page-header">
                <h2 className="page-title">Academic Planner</h2>
              </div>

              <div className="report-tabs">
                <nav className="report-tabs-nav">
                  <button className={`report-tab-btn ${plannerSubTab === 'sessions' ? 'active' : ''}`} onClick={() => setPlannerSubTab('sessions')}>Sessions</button>
                  <button className={`report-tab-btn ${plannerSubTab === 'semesters' ? 'active' : ''}`} onClick={() => setPlannerSubTab('semesters')}>Semesters</button>
                </nav>
              </div>

              {/* Sessions Sub-Tab */}
              {plannerSubTab === 'sessions' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--md)' }}>
                    <button onClick={() => {
                      setEditingSession(null);
                      setNewSession({ name: '', start_date: '', end_date: '', is_active: false, default_school_days: [] });
                      setShowSessionForm(!showSessionForm);
                    }} className="btn btn-primary">+ New Session</button>
                  </div>

                  {showSessionForm && (
                    <div className="card">
                      <div className="card-header">{editingSession ? 'Edit Session' : 'Create Session'}</div>
                      <div className="card-body">
                        <form onSubmit={handleCreateSession}>
                          <div className="form-grid form-grid-3">
                            <div className="form-group">
                              <label className="form-label">Session Name</label>
                              <input type="text" className="form-input" value={newSession.name} onChange={(e) => setNewSession({ ...newSession, name: e.target.value })} placeholder="e.g., 2025-2026" required />
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
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day => (
                                <button key={day} type="button" onClick={() => setNewSession({
                                  ...newSession,
                                  default_school_days: (newSession.default_school_days || []).includes(day)
                                    ? newSession.default_school_days.filter(d => d !== day)
                                    : [...(newSession.default_school_days || []), day]
                                })} style={{
                                  padding: '6px 14px', borderRadius: '20px',
                                  border: `2px solid ${(newSession.default_school_days || []).includes(day) ? '#2563eb' : '#d1d5db'}`,
                                  background: (newSession.default_school_days || []).includes(day) ? '#2563eb' : 'transparent',
                                  color: (newSession.default_school_days || []).includes(day) ? '#fff' : '#374151',
                                  cursor: 'pointer', fontSize: '13px', fontWeight: '500'
                                }}>{day.substring(0, 3)}</button>
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
                            <button type="button" onClick={() => { setShowSessionForm(false); setEditingSession(null); }} className="btn btn-secondary">Cancel</button>
                            <button type="submit" className="btn btn-primary">{editingSession ? 'Update' : 'Create'}</button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {sessions.length === 0 ? (
                    <div className="card"><div className="empty"><p>No sessions yet. Create your first academic session.</p><button className="empty-action" onClick={() => setShowSessionForm(true)}>+ Create Session</button></div></div>
                  ) : (
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {sessions.map(session => (
                        <div key={session.id} className="card" style={{ padding: 'var(--md)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <div>
                              <h3 style={{ margin: 0, fontSize: '16px' }}>{session.name}</h3>
                              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted)' }}>
                                {fmtDate(session.start_date)} — {fmtDate(session.end_date)}
                                {session.default_school_days && (() => {
                                  try {
                                    const days = typeof session.default_school_days === 'string' ? JSON.parse(session.default_school_days) : session.default_school_days;
                                    return days.length > 0 ? ` · ${days.map(d => d.substring(0, 3)).join(', ')}` : '';
                                  } catch { return ''; }
                                })()}
                              </p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              {session.is_active && <span className="badge badge-success">Active</span>}
                              <button onClick={() => {
                                setEditingSession(session);
                                setNewSession({
                                  name: session.name, start_date: session.start_date?.slice(0, 10),
                                  end_date: session.end_date?.slice(0, 10), is_active: session.is_active,
                                  default_school_days: (() => { try { return typeof session.default_school_days === 'string' ? JSON.parse(session.default_school_days) : (session.default_school_days || []); } catch { return []; } })()
                                });
                                setShowSessionForm(true);
                              }} className="btn btn-secondary btn-sm">Edit</button>
                              <button onClick={() => setConfirmModal({
                                message: `Delete session "${session.name}"?`,
                                onConfirm: () => { handleDeleteSession(session.id); setConfirmModal(null); }
                              })} className="btn btn-danger btn-sm">Delete</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Semesters Sub-Tab */}
              {plannerSubTab === 'semesters' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--md)' }}>
                    <button onClick={() => {
                      setEditingSemester(null);
                      setNewSemester({ session_id: sessions[0]?.id || '', name: '', start_date: '', end_date: '', is_active: false });
                      setShowSemesterForm(!showSemesterForm);
                    }} className="btn btn-primary">+ New Semester</button>
                  </div>

                  {showSemesterForm && (
                    <div className="card">
                      <div className="card-header">{editingSemester ? 'Edit Semester' : 'Create Semester'}</div>
                      <div className="card-body">
                        <form onSubmit={handleCreateSemester}>
                          <div className="form-grid form-grid-2">
                            <div className="form-group">
                              <label className="form-label">Session</label>
                              <select className="form-input" value={newSemester.session_id} onChange={(e) => setNewSemester({ ...newSemester, session_id: e.target.value })} required>
                                <option value="">Select session...</option>
                                {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </select>
                            </div>
                            <div className="form-group">
                              <label className="form-label">Semester Name</label>
                              <input type="text" className="form-input" value={newSemester.name} onChange={(e) => setNewSemester({ ...newSemester, name: e.target.value })} placeholder="e.g., First Semester" required />
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
                    </div>
                  )}

                  {semesters.length === 0 ? (
                    <div className="card"><div className="empty"><p>No semesters yet. Create a session first, then add semesters.</p></div></div>
                  ) : (
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {semesters.map(sem => (
                        <div key={sem.id} className="card" style={{ padding: 'var(--md)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <div>
                              <h3 style={{ margin: 0, fontSize: '16px' }}>{sem.name}</h3>
                              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted)' }}>
                                {sem.session_name} · {fmtDate(sem.start_date)} — {fmtDate(sem.end_date)}
                              </p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              {sem.is_active && <span className="badge badge-success">Active</span>}
                              <button onClick={() => {
                                setEditingSemester(sem);
                                setNewSemester({
                                  session_id: sem.session_id, name: sem.name,
                                  start_date: sem.start_date?.slice(0, 10), end_date: sem.end_date?.slice(0, 10),
                                  is_active: sem.is_active
                                });
                                setShowSemesterForm(true);
                              }} className="btn btn-secondary btn-sm">Edit</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ═══════ CLASSES TAB ═══════ */}
          {activeTab === 'classes' && (
            <>
              <div className="page-header">
                <h2 className="page-title">Classes</h2>
                <button onClick={() => {
                  setEditingClass(null);
                  setNewClass({ name: '', grade_level: '', school_days: [], description: '' });
                  setShowClassForm(!showClassForm);
                }} className="btn btn-primary">+ New Class</button>
              </div>

              {showClassForm && (
                <div className="card">
                  <div className="card-header">{editingClass ? 'Edit Class' : 'Create Class'}</div>
                  <div className="card-body">
                    <form onSubmit={handleCreateClass}>
                      <div className="form-grid form-grid-2">
                        <div className="form-group">
                          <label className="form-label">Class Name</label>
                          <input type="text" className="form-input" value={newClass.name} onChange={(e) => setNewClass({ ...newClass, name: e.target.value })} placeholder="e.g., Beginners" required />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Grade Level</label>
                          <input type="text" className="form-input" value={newClass.grade_level} onChange={(e) => setNewClass({ ...newClass, grade_level: e.target.value })} placeholder="e.g., Level 1" />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Description</label>
                        <input type="text" className="form-input" value={newClass.description} onChange={(e) => setNewClass({ ...newClass, description: e.target.value })} placeholder="Optional description" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">School Days</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day => (
                            <button key={day} type="button" onClick={() => setNewClass({
                              ...newClass,
                              school_days: (newClass.school_days || []).includes(day)
                                ? newClass.school_days.filter(d => d !== day)
                                : [...(newClass.school_days || []), day]
                            })} style={{
                              padding: '6px 14px', borderRadius: '20px',
                              border: `2px solid ${(newClass.school_days || []).includes(day) ? '#2563eb' : '#d1d5db'}`,
                              background: (newClass.school_days || []).includes(day) ? '#2563eb' : 'transparent',
                              color: (newClass.school_days || []).includes(day) ? '#fff' : '#374151',
                              cursor: 'pointer', fontSize: '13px', fontWeight: '500'
                            }}>{day.substring(0, 3)}</button>
                          ))}
                        </div>
                      </div>
                      <div className="form-actions">
                        <button type="button" onClick={() => { setShowClassForm(false); setEditingClass(null); }} className="btn btn-secondary">Cancel</button>
                        <button type="submit" className="btn btn-primary">{editingClass ? 'Update' : 'Create'}</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {classes.length === 0 ? (
                <div className="card"><div className="empty"><p>No classes yet.</p><button className="empty-action" onClick={() => setShowClassForm(true)}>+ Create Class</button></div></div>
              ) : (
                <div className="card">
                  <div className="table-responsive">
                    <table className="table">
                      <thead><tr>
                        <th>Name</th><th>Grade</th><th>Students</th><th>School Days</th><th>Actions</th>
                      </tr></thead>
                      <tbody>
                        {classes.map(cls => (
                          <tr key={cls.id}>
                            <td><strong>{cls.name}</strong></td>
                            <td>{cls.grade_level || '—'}</td>
                            <td>{cls.student_count || 0}</td>
                            <td>
                              {(() => {
                                try {
                                  const days = typeof cls.school_days === 'string' ? JSON.parse(cls.school_days) : (cls.school_days || []);
                                  return days.map(d => d.substring(0, 3)).join(', ') || '—';
                                } catch { return '—'; }
                              })()}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button onClick={() => {
                                  setEditingClass(cls);
                                  const schoolDays = (() => { try { return typeof cls.school_days === 'string' ? JSON.parse(cls.school_days) : (cls.school_days || []); } catch { return []; } })();
                                  setNewClass({ name: cls.name, grade_level: cls.grade_level || '', school_days: schoolDays, description: cls.description || '' });
                                  setShowClassForm(true);
                                }} className="btn btn-secondary btn-sm">Edit</button>
                                <button onClick={() => setConfirmModal({
                                  message: `Delete class "${cls.name}"?`,
                                  onConfirm: () => { handleDeleteClass(cls.id); setConfirmModal(null); }
                                })} className="btn btn-danger btn-sm">Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="mobile-cards">
                    {classes.map(cls => (
                      <div key={cls.id} className="student-card">
                        <div className="student-card-header">
                          <strong>{cls.name}</strong>
                          <span className="badge">{cls.student_count || 0} students</span>
                        </div>
                        <div className="student-card-details">
                          <span>Grade: {cls.grade_level || '—'}</span>
                        </div>
                        <div className="student-card-actions">
                          <button onClick={() => {
                            setEditingClass(cls);
                            const schoolDays = (() => { try { return typeof cls.school_days === 'string' ? JSON.parse(cls.school_days) : (cls.school_days || []); } catch { return []; } })();
                            setNewClass({ name: cls.name, grade_level: cls.grade_level || '', school_days: schoolDays, description: cls.description || '' });
                            setShowClassForm(true);
                          }} className="btn btn-secondary btn-sm">Edit</button>
                          <button onClick={() => setConfirmModal({
                            message: `Delete class "${cls.name}"?`,
                            onConfirm: () => { handleDeleteClass(cls.id); setConfirmModal(null); }
                          })} className="btn btn-danger btn-sm">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ═══════ STUDENTS TAB ═══════ */}
          {activeTab === 'students' && (
            <>
              <div className="page-header">
                <h2 className="page-title">Students</h2>
                <button onClick={() => {
                  setEditingStudent(null);
                  setNewStudent({
                    first_name: '', last_name: '', student_id: '', gender: '', class_id: '',
                    student_phone: '', student_phone_country_code: '+64',
                    street: '', city: '', state: '', country: '',
                    parent_guardian_name: '', parent_guardian_relationship: '',
                    parent_guardian_phone: '', parent_guardian_phone_country_code: '+64',
                    notes: '', expected_fee: '', fee_note: ''
                  });
                  setShowStudentForm(!showStudentForm);
                }} className="btn btn-primary">+ New Student</button>
              </div>

              {showStudentForm && (
                <div className="card">
                  <div className="card-header">{editingStudent ? 'Edit Student' : 'Add Student'}</div>
                  <div className="card-body">
                    <form onSubmit={handleCreateStudent}>
                      <div className="form-grid form-grid-3">
                        <div className="form-group">
                          <label className="form-label">First Name *</label>
                          <input type="text" className="form-input" value={newStudent.first_name} onChange={(e) => setNewStudent({ ...newStudent, first_name: e.target.value })} required />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Last Name *</label>
                          <input type="text" className="form-input" value={newStudent.last_name} onChange={(e) => setNewStudent({ ...newStudent, last_name: e.target.value })} required />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Student ID *</label>
                          <input type="text" className="form-input" value={newStudent.student_id} onChange={(e) => setNewStudent({ ...newStudent, student_id: e.target.value })} placeholder="6 digits" required />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Gender *</label>
                          <select className="form-input" value={newStudent.gender} onChange={(e) => setNewStudent({ ...newStudent, gender: e.target.value })} required>
                            <option value="">Select...</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Class</label>
                          <select className="form-input" value={newStudent.class_id} onChange={(e) => setNewStudent({ ...newStudent, class_id: e.target.value })}>
                            <option value="">No class</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                      </div>

                      <h4 style={{ margin: 'var(--md) 0 var(--sm)', fontSize: '14px', color: 'var(--muted)' }}>Parent/Guardian</h4>
                      <div className="form-grid form-grid-3">
                        <div className="form-group">
                          <label className="form-label">Name</label>
                          <input type="text" className="form-input" value={newStudent.parent_guardian_name} onChange={(e) => setNewStudent({ ...newStudent, parent_guardian_name: e.target.value })} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Relationship</label>
                          <select className="form-input" value={newStudent.parent_guardian_relationship} onChange={(e) => setNewStudent({ ...newStudent, parent_guardian_relationship: e.target.value })}>
                            <option value="">Select...</option>
                            <option value="Father">Father</option>
                            <option value="Mother">Mother</option>
                            <option value="Guardian">Guardian</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Phone</label>
                          <input type="text" className="form-input" value={newStudent.parent_guardian_phone} onChange={(e) => setNewStudent({ ...newStudent, parent_guardian_phone: e.target.value })} />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Notes</label>
                        <textarea className="form-input" value={newStudent.notes} onChange={(e) => setNewStudent({ ...newStudent, notes: e.target.value })} rows={2} />
                      </div>

                      {madrasahProfile?.enable_fee_tracking && (
                        <div className="form-grid form-grid-2">
                          <div className="form-group">
                            <label className="form-label">Expected Fee</label>
                            <input type="number" step="0.01" className="form-input" value={newStudent.expected_fee} onChange={(e) => setNewStudent({ ...newStudent, expected_fee: e.target.value })} />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Fee Note</label>
                            <input type="text" className="form-input" value={newStudent.fee_note} onChange={(e) => setNewStudent({ ...newStudent, fee_note: e.target.value })} />
                          </div>
                        </div>
                      )}

                      <div className="form-actions">
                        <button type="button" onClick={() => { setShowStudentForm(false); setEditingStudent(null); }} className="btn btn-secondary">Cancel</button>
                        <button type="submit" className="btn btn-primary">{editingStudent ? 'Update' : 'Add Student'}</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Search & Filter */}
              <div className="card" style={{ padding: 'var(--sm) var(--md)' }}>
                <div className="form-grid form-grid-2">
                  <input type="text" className="form-input" placeholder="Search students..." value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
                  <select className="form-input" value={studentClassFilter} onChange={(e) => setStudentClassFilter(e.target.value)}>
                    <option value="">All Classes</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {filteredStudents.length === 0 ? (
                <div className="card"><div className="empty"><p>No students found.</p></div></div>
              ) : (
                <div className="card">
                  <div className="table-responsive">
                    <table className="table">
                      <thead><tr>
                        <th>ID</th><th>Name</th><th>Gender</th><th>Class</th><th>Parent/Guardian</th><th>Actions</th>
                      </tr></thead>
                      <tbody>
                        {filteredStudents.map(s => (
                          <tr key={s.id}>
                            <td>{s.student_id}</td>
                            <td><strong>{s.first_name} {s.last_name}</strong></td>
                            <td>{s.gender}</td>
                            <td>{s.class_name || '—'}</td>
                            <td>{s.parent_guardian_name || '—'}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button onClick={() => {
                                  setEditingStudent(s);
                                  setNewStudent({
                                    first_name: s.first_name, last_name: s.last_name,
                                    student_id: s.student_id, gender: s.gender, class_id: s.class_id || '',
                                    student_phone: s.student_phone || '', student_phone_country_code: s.student_phone_country_code || '+64',
                                    street: s.street || '', city: s.city || '', state: s.state || '', country: s.country || '',
                                    parent_guardian_name: s.parent_guardian_name || '',
                                    parent_guardian_relationship: s.parent_guardian_relationship || '',
                                    parent_guardian_phone: s.parent_guardian_phone || '',
                                    parent_guardian_phone_country_code: s.parent_guardian_phone_country_code || '+64',
                                    notes: s.notes || '',
                                    expected_fee: s.expected_fee || '', fee_note: s.fee_note || ''
                                  });
                                  setShowStudentForm(true);
                                }} className="btn btn-secondary btn-sm">Edit</button>
                                <button onClick={() => setConfirmModal({
                                  message: `Delete student "${s.first_name} ${s.last_name}"?`,
                                  onConfirm: () => { handleDeleteStudent(s.id); setConfirmModal(null); }
                                })} className="btn btn-danger btn-sm">Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="mobile-cards">
                    {filteredStudents.map(s => (
                      <div key={s.id} className="student-card">
                        <div className="student-card-header">
                          <strong>{s.first_name} {s.last_name}</strong>
                          <span className="badge">{s.student_id}</span>
                        </div>
                        <div className="student-card-details">
                          <span>{s.gender} · {s.class_name || 'No class'}</span>
                        </div>
                        <div className="student-card-actions">
                          <button onClick={() => {
                            setEditingStudent(s);
                            setNewStudent({
                              first_name: s.first_name, last_name: s.last_name,
                              student_id: s.student_id, gender: s.gender, class_id: s.class_id || '',
                              student_phone: s.student_phone || '', student_phone_country_code: s.student_phone_country_code || '+64',
                              street: s.street || '', city: s.city || '', state: s.state || '', country: s.country || '',
                              parent_guardian_name: s.parent_guardian_name || '',
                              parent_guardian_relationship: s.parent_guardian_relationship || '',
                              parent_guardian_phone: s.parent_guardian_phone || '',
                              parent_guardian_phone_country_code: s.parent_guardian_phone_country_code || '+64',
                              notes: s.notes || '',
                              expected_fee: s.expected_fee || '', fee_note: s.fee_note || ''
                            });
                            setShowStudentForm(true);
                          }} className="btn btn-secondary btn-sm">Edit</button>
                          <button onClick={() => setConfirmModal({
                            message: `Delete "${s.first_name} ${s.last_name}"?`,
                            onConfirm: () => { handleDeleteStudent(s.id); setConfirmModal(null); }
                          })} className="btn btn-danger btn-sm">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ═══════ ATTENDANCE TAB ═══════ */}
          {activeTab === 'attendance' && (
            <>
              <div className="page-header"><h2 className="page-title">Attendance</h2></div>

              <div className="report-tabs">
                <nav className="report-tabs-nav">
                  <button className={`report-tab-btn ${attendanceSubTab === 'record' ? 'active' : ''}`} onClick={() => setAttendanceSubTab('record')}>Record</button>
                  <button className={`report-tab-btn ${attendanceSubTab === 'view' ? 'active' : ''}`} onClick={() => setAttendanceSubTab('view')}>History</button>
                </nav>
              </div>

              {attendanceSubTab === 'record' && (
                <>
                  <div className="card">
                    <div className="card-body">
                      <div className="form-grid form-grid-3">
                        <div className="form-group">
                          <label className="form-label">Semester</label>
                          <input type="text" className="form-input" value={activeSemester?.name || 'No active semester'} disabled />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Class</label>
                          <select className="form-input" value={selectedClass?.id || ''} onChange={(e) => {
                            const cls = classes.find(c => c.id === parseInt(e.target.value));
                            setSelectedClass(cls || null);
                          }}>
                            <option value="">Select class...</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Date</label>
                          <input type="date" className="form-input" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedClass && activeSemester && attendanceStudents.length > 0 && (
                    <div className="card">
                      <div className="table-responsive">
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Student</th>
                              <th>Attendance</th>
                              {madrasahProfile?.enable_dressing_grade && <th>Dressing</th>}
                              {madrasahProfile?.enable_behavior_grade && <th>Behavior</th>}
                              <th>Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {attendanceStudents.map(student => {
                              const record = attendanceRecords[student.id] || { present: true, dressing_grade: '', behavior_grade: '', notes: '' };
                              return (
                                <tr key={student.id}>
                                  <td><strong>{student.first_name} {student.last_name}</strong><br /><small style={{ color: 'var(--muted)' }}>{student.student_id}</small></td>
                                  <td>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                        <input type="radio" name={`att-${student.id}`} checked={record.present === true} onChange={() => setAttendanceRecords(prev => ({ ...prev, [student.id]: { ...prev[student.id], present: true } }))} />
                                        Present
                                      </label>
                                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                        <input type="radio" name={`att-${student.id}`} checked={record.present === false} onChange={() => setAttendanceRecords(prev => ({ ...prev, [student.id]: { ...prev[student.id], present: false } }))} />
                                        Absent
                                      </label>
                                    </div>
                                  </td>
                                  {madrasahProfile?.enable_dressing_grade && (
                                    <td>
                                      <select className="form-input" value={record.dressing_grade} onChange={(e) => setAttendanceRecords(prev => ({ ...prev, [student.id]: { ...prev[student.id], dressing_grade: e.target.value } }))}>
                                        <option value="">—</option>
                                        <option value="Excellent">Excellent</option>
                                        <option value="Good">Good</option>
                                        <option value="Fair">Fair</option>
                                        <option value="Poor">Poor</option>
                                      </select>
                                    </td>
                                  )}
                                  {madrasahProfile?.enable_behavior_grade && (
                                    <td>
                                      <select className="form-input" value={record.behavior_grade} onChange={(e) => setAttendanceRecords(prev => ({ ...prev, [student.id]: { ...prev[student.id], behavior_grade: e.target.value } }))}>
                                        <option value="">—</option>
                                        <option value="Excellent">Excellent</option>
                                        <option value="Good">Good</option>
                                        <option value="Fair">Fair</option>
                                        <option value="Poor">Poor</option>
                                      </select>
                                    </td>
                                  )}
                                  <td>
                                    <input type="text" className="form-input" value={record.notes} onChange={(e) => setAttendanceRecords(prev => ({ ...prev, [student.id]: { ...prev[student.id], notes: e.target.value } }))} placeholder="Notes..." style={{ minWidth: '120px' }} />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div style={{ padding: 'var(--md)', display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={handleSaveAttendance} className="btn btn-primary" disabled={saving}>
                          {saving ? 'Saving...' : 'Save Attendance'}
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedClass && activeSemester && attendanceStudents.length === 0 && (
                    <div className="card"><div className="empty"><p>No students in this class.</p></div></div>
                  )}

                  {!selectedClass && (
                    <div className="card"><div className="empty"><p>Select a class to take attendance.</p></div></div>
                  )}
                </>
              )}

              {attendanceSubTab === 'view' && (
                <>
                  <div className="card">
                    <div className="card-body">
                      <div className="form-group">
                        <label className="form-label">Class</label>
                        <select className="form-input" value={selectedClass?.id || ''} onChange={(e) => {
                          const cls = classes.find(c => c.id === parseInt(e.target.value));
                          setSelectedClass(cls || null);
                        }}>
                          <option value="">Select class...</option>
                          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {attendanceHistory.length > 0 ? (
                    <div className="card">
                      <div className="table-responsive">
                        <table className="table">
                          <thead><tr><th>Date</th><th>Student</th><th>Status</th><th>Dressing</th><th>Behavior</th><th>Notes</th></tr></thead>
                          <tbody>
                            {attendanceHistory.slice(0, 100).map((r, i) => (
                              <tr key={i}>
                                <td>{fmtDate(r.date)}</td>
                                <td>{r.first_name} {r.last_name}</td>
                                <td><span className={`badge ${r.present ? 'badge-success' : 'badge-danger'}`}>{r.present ? 'Present' : 'Absent'}</span></td>
                                <td>{r.dressing_grade || '—'}</td>
                                <td>{r.behavior_grade || '—'}</td>
                                <td>{r.notes || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : selectedClass ? (
                    <div className="card"><div className="empty"><p>No attendance records found.</p></div></div>
                  ) : null}
                </>
              )}
            </>
          )}

          {/* ═══════ EXAMS TAB ═══════ */}
          {activeTab === 'exams' && (
            <>
              <div className="page-header">
                <h2 className="page-title">Exam Recording</h2>
                <button onClick={() => {
                  if (!selectedClass) { toast.error('Select a class first'); return; }
                  const classStudents = students.filter(s => s.class_id === selectedClass.id);
                  const activeSession = sessions.find(s => s.is_active);
                  setExamForm({
                    session_id: activeSession?.id || '',
                    semester_id: activeSemester?.id || '',
                    subject: '',
                    exam_date: getLocalDate(),
                    max_score: 100,
                    students: classStudents.map(s => ({
                      student_id: s.id,
                      student_name: `${s.first_name} ${s.last_name}`,
                      score: '',
                      is_absent: false,
                      absence_reason: '',
                      notes: ''
                    }))
                  });
                  setShowExamModal(true);
                }} className="btn btn-primary">+ Record Exam</button>
              </div>

              <div className="card">
                <div className="card-body">
                  <div className="form-grid form-grid-3">
                    <div className="form-group">
                      <label className="form-label">Class</label>
                      <select className="form-input" value={selectedClass?.id || ''} onChange={(e) => {
                        const cls = classes.find(c => c.id === parseInt(e.target.value));
                        setSelectedClass(cls || null);
                      }}>
                        <option value="">Select class...</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Session</label>
                      <select className="form-input" value={examFilterSession} onChange={(e) => { setExamFilterSession(e.target.value); setExamFilterSemester(''); }}>
                        <option value="">All Sessions</option>
                        {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Semester</label>
                      <select className="form-input" value={examFilterSemester} onChange={(e) => setExamFilterSemester(e.target.value)}>
                        <option value="">All Semesters</option>
                        {examFilteredSemesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {selectedClass && examPerformance.length > 0 ? (
                <div className="card">
                  <div className="table-responsive">
                    <table className="table">
                      <thead><tr><th>Date</th><th>Subject</th><th>Student</th><th>Score</th><th>Actions</th></tr></thead>
                      <tbody>
                        {examPerformance.map(r => (
                          <tr key={r.id}>
                            <td>{fmtDate(r.exam_date)}</td>
                            <td>{r.subject}</td>
                            <td>{r.first_name} {r.last_name}</td>
                            <td>{r.is_absent ? <span className="badge badge-warning">Absent</span> : `${r.score}/${r.max_score}`}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button onClick={() => { setEditingExamRecord(r); setShowEditExamModal(true); }} className="btn btn-secondary btn-sm">Edit</button>
                                <button onClick={() => setConfirmModal({
                                  message: 'Delete this exam record?',
                                  onConfirm: () => { handleDeleteExamRecord(r.id); setConfirmModal(null); }
                                })} className="btn btn-danger btn-sm">Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : selectedClass ? (
                <div className="card"><div className="empty"><p>No exam records found.</p></div></div>
              ) : (
                <div className="card"><div className="empty"><p>Select a class to view exam records.</p></div></div>
              )}

              {/* Record Exam Modal */}
              {showExamModal && (
                <div className="modal-overlay" onClick={() => setShowExamModal(false)}>
                  <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
                    <div className="modal-header">
                      <h3>Record Exam Performance</h3>
                      <button onClick={() => setShowExamModal(false)} className="modal-close">&times;</button>
                    </div>
                    <form onSubmit={handleSaveExamPerformance}>
                      <div className="modal-body">
                        <div className="form-grid form-grid-2">
                          <div className="form-group">
                            <label className="form-label">Subject *</label>
                            <input type="text" className="form-input" value={examForm.subject} onChange={(e) => setExamForm({ ...examForm, subject: e.target.value })} placeholder="e.g., Mathematics" required />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Exam Date *</label>
                            <input type="date" className="form-input" value={examForm.exam_date} onChange={(e) => setExamForm({ ...examForm, exam_date: e.target.value })} required />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Max Score *</label>
                            <input type="number" className="form-input" value={examForm.max_score} onChange={(e) => setExamForm({ ...examForm, max_score: e.target.value })} min="1" step="0.1" required />
                          </div>
                        </div>

                        <h4 style={{ margin: 'var(--md) 0 var(--sm)', fontSize: '14px' }}>Student Scores</h4>
                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                          {examForm.students.map((s, i) => (
                            <div key={s.student_id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                              <span style={{ flex: 1, fontSize: '14px' }}>{s.student_name}</span>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                                <input type="checkbox" checked={s.is_absent} onChange={(e) => {
                                  const updated = [...examForm.students];
                                  updated[i] = { ...updated[i], is_absent: e.target.checked, score: e.target.checked ? '' : updated[i].score };
                                  setExamForm({ ...examForm, students: updated });
                                }} />
                                Absent
                              </label>
                              {s.is_absent ? (
                                <input type="text" className="form-input" placeholder="Reason" value={s.absence_reason} onChange={(e) => {
                                  const updated = [...examForm.students];
                                  updated[i] = { ...updated[i], absence_reason: e.target.value };
                                  setExamForm({ ...examForm, students: updated });
                                }} style={{ width: '120px' }} />
                              ) : (
                                <input type="number" className="form-input" placeholder="Score" step="0.1" min="0" max={examForm.max_score} value={s.score} onChange={(e) => {
                                  const updated = [...examForm.students];
                                  updated[i] = { ...updated[i], score: e.target.value };
                                  setExamForm({ ...examForm, students: updated });
                                }} style={{ width: '80px' }} />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="modal-footer">
                        <button type="button" onClick={() => setShowExamModal(false)} className="btn btn-secondary">Cancel</button>
                        <button type="submit" className="btn btn-primary">Save</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Edit Exam Modal */}
              {showEditExamModal && editingExamRecord && (
                <div className="modal-overlay" onClick={() => setShowEditExamModal(false)}>
                  <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                    <div className="modal-header">
                      <h3>Edit Exam Record</h3>
                      <button onClick={() => setShowEditExamModal(false)} className="modal-close">&times;</button>
                    </div>
                    <form onSubmit={handleEditExamRecord}>
                      <div className="modal-body">
                        <p style={{ marginBottom: 'var(--md)', color: 'var(--muted)' }}>{editingExamRecord.first_name} {editingExamRecord.last_name} — {editingExamRecord.subject}</p>
                        <div className="form-group">
                          <label className="form-label checkbox-label">
                            <input type="checkbox" checked={editingExamRecord.is_absent} onChange={(e) => setEditingExamRecord({ ...editingExamRecord, is_absent: e.target.checked })} />
                            <span>Absent</span>
                          </label>
                        </div>
                        {editingExamRecord.is_absent ? (
                          <div className="form-group">
                            <label className="form-label">Absence Reason</label>
                            <input type="text" className="form-input" value={editingExamRecord.absence_reason || ''} onChange={(e) => setEditingExamRecord({ ...editingExamRecord, absence_reason: e.target.value })} required />
                          </div>
                        ) : (
                          <div className="form-group">
                            <label className="form-label">Score (max: {editingExamRecord.max_score})</label>
                            <input type="number" className="form-input" step="0.1" min="0" max={editingExamRecord.max_score} value={editingExamRecord.score || ''} onChange={(e) => setEditingExamRecord({ ...editingExamRecord, score: e.target.value })} required />
                          </div>
                        )}
                        <div className="form-group">
                          <label className="form-label">Notes</label>
                          <input type="text" className="form-input" value={editingExamRecord.notes || ''} onChange={(e) => setEditingExamRecord({ ...editingExamRecord, notes: e.target.value })} />
                        </div>
                      </div>
                      <div className="modal-footer">
                        <button type="button" onClick={() => setShowEditExamModal(false)} className="btn btn-secondary">Cancel</button>
                        <button type="submit" className="btn btn-primary">Update</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ═══════ QUR'AN TAB ═══════ */}
          {activeTab === 'quran' && (
            <>
              <div className="page-header"><h2 className="page-title">Qur'an Progress</h2></div>

              <div className="report-tabs">
                <nav className="report-tabs-nav">
                  <button className={`report-tab-btn ${quranSubTab === 'record' ? 'active' : ''}`} onClick={() => setQuranSubTab('record')}>Record</button>
                  <button className={`report-tab-btn ${quranSubTab === 'positions' ? 'active' : ''}`} onClick={() => setQuranSubTab('positions')}>Positions</button>
                  <button className={`report-tab-btn ${quranSubTab === 'history' ? 'active' : ''}`} onClick={() => setQuranSubTab('history')}>History</button>
                </nav>
              </div>

              <div className="card" style={{ marginBottom: 'var(--md)' }}>
                <div className="card-body">
                  <div className="form-group">
                    <label className="form-label">Class</label>
                    <select className="form-input" value={selectedClass?.id || ''} onChange={(e) => {
                      const cls = classes.find(c => c.id === parseInt(e.target.value));
                      setSelectedClass(cls || null);
                      setQuranSelectedStudent(null);
                    }}>
                      <option value="">Select class...</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Record Sub-Tab */}
              {quranSubTab === 'record' && selectedClass && (
                <>
                  <div className="card">
                    <div className="card-body">
                      <div className="form-grid form-grid-2">
                        <div className="form-group">
                          <label className="form-label">Student</label>
                          <select className="form-input" value={quranSelectedStudent?.id || ''} onChange={(e) => {
                            const stu = students.find(s => s.id === parseInt(e.target.value));
                            setQuranSelectedStudent(stu || null);
                          }}>
                            <option value="">Select student...</option>
                            {students.filter(s => s.class_id === selectedClass.id).map(s => (
                              <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Date</label>
                          <input type="date" className="form-input" value={quranDate} onChange={(e) => setQuranDate(e.target.value)} />
                        </div>
                      </div>

                      {quranSelectedStudent && quranStudentPosition && !quranStudentPosition.isNew && (
                        <div style={{ padding: 'var(--sm)', background: 'var(--bg-muted)', borderRadius: '8px', marginBottom: 'var(--md)', fontSize: '13px' }}>
                          <strong>Current Position:</strong>
                          {quranStudentPosition.hifz && <span> Hifz: {quranStudentPosition.hifz.surah_name} ({quranStudentPosition.hifz.ayah})</span>}
                          {quranStudentPosition.tilawah && <span> · Tilawah: {quranStudentPosition.tilawah.surah_name} ({quranStudentPosition.tilawah.ayah})</span>}
                          {quranStudentPosition.revision && <span> · Revision: {quranStudentPosition.revision.surah_name} ({quranStudentPosition.revision.ayah})</span>}
                        </div>
                      )}

                      {quranSelectedStudent && (
                        <>
                          <div className="form-grid form-grid-3">
                            <div className="form-group">
                              <label className="form-label">Session Type</label>
                              <select className="form-input" value={quranSessionType} onChange={(e) => setQuranSessionType(e.target.value)}>
                                <option value="tilawah">Tilawah</option>
                                <option value="hifz">Hifz</option>
                                <option value="revision">Revision</option>
                              </select>
                            </div>
                            <div className="form-group">
                              <label className="form-label">Surah</label>
                              <select className="form-input" value={quranSurah} onChange={(e) => setQuranSurah(e.target.value)}>
                                <option value="">Select surah...</option>
                                {surahs.map(s => <option key={s.n} value={s.n}>{s.n}. {s.name} (Juz {s.juz})</option>)}
                              </select>
                            </div>
                            <div className="form-group">
                              <label className="form-label">Grade</label>
                              <select className="form-input" value={quranGrade} onChange={(e) => setQuranGrade(e.target.value)}>
                                <option value="Excellent">Excellent</option>
                                <option value="Good">Good</option>
                                <option value="Fair">Fair</option>
                                <option value="Poor">Poor</option>
                              </select>
                            </div>
                          </div>
                          <div className="form-grid form-grid-3">
                            <div className="form-group">
                              <label className="form-label">Ayah From</label>
                              <input type="number" className="form-input" min="1" value={quranAyahFrom} onChange={(e) => setQuranAyahFrom(e.target.value)} />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Ayah To</label>
                              <input type="number" className="form-input" min="1" value={quranAyahTo} onChange={(e) => setQuranAyahTo(e.target.value)} />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Result</label>
                              <select className="form-input" value={quranPassed ? 'passed' : 'repeat'} onChange={(e) => setQuranPassed(e.target.value === 'passed')}>
                                <option value="passed">Passed</option>
                                <option value="repeat">Repeat</option>
                              </select>
                            </div>
                          </div>
                          <div className="form-group">
                            <label className="form-label">Notes</label>
                            <input type="text" className="form-input" value={quranNotes} onChange={(e) => setQuranNotes(e.target.value)} placeholder="Optional notes..." />
                          </div>
                          <div className="form-actions">
                            <button onClick={handleRecordQuran} className="btn btn-primary" disabled={quranSaving}>
                              {quranSaving ? 'Saving...' : 'Record Progress'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Recent History for selected student */}
                  {quranSelectedStudent && quranStudentHistory.length > 0 && (
                    <div className="card" style={{ marginTop: 'var(--md)' }}>
                      <div className="card-header">Recent History — {quranSelectedStudent.first_name} {quranSelectedStudent.last_name}</div>
                      <div className="table-responsive">
                        <table className="table">
                          <thead><tr><th>Date</th><th>Type</th><th>Surah</th><th>Ayahs</th><th>Grade</th><th>Result</th></tr></thead>
                          <tbody>
                            {quranStudentHistory.map(r => (
                              <tr key={r.id}>
                                <td>{fmtDate(r.date)}</td>
                                <td style={{ textTransform: 'capitalize' }}>{r.type}</td>
                                <td>{r.surah_name}</td>
                                <td>{r.ayah_from}–{r.ayah_to}</td>
                                <td>{r.grade}</td>
                                <td><span className={`badge ${r.passed ? 'badge-success' : 'badge-warning'}`}>{r.passed ? 'Passed' : 'Repeat'}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Positions Sub-Tab */}
              {quranSubTab === 'positions' && selectedClass && (
                <div className="card">
                  {quranPositions.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table">
                        <thead><tr><th>Student</th><th>Hifz</th><th>Tilawah</th><th>Revision</th><th>Updated</th></tr></thead>
                        <tbody>
                          {quranPositions.map(s => (
                            <tr key={s.id}>
                              <td><strong>{s.first_name} {s.last_name}</strong></td>
                              <td>{s.current_surah_name ? `${s.current_surah_name} (${s.current_ayah})` : '—'}</td>
                              <td>{s.tilawah_surah_name ? `${s.tilawah_surah_name} (${s.tilawah_ayah})` : '—'}</td>
                              <td>{s.revision_surah_name ? `${s.revision_surah_name} (${s.revision_ayah})` : '—'}</td>
                              <td>{s.last_updated ? fmtDate(s.last_updated) : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty"><p>No Qur'an positions recorded yet.</p></div>
                  )}
                </div>
              )}

              {/* History Sub-Tab */}
              {quranSubTab === 'history' && selectedClass && (
                <div className="card">
                  {quranRecords.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table">
                        <thead><tr><th>Date</th><th>Student</th><th>Type</th><th>Surah</th><th>Ayahs</th><th>Grade</th><th>Result</th><th></th></tr></thead>
                        <tbody>
                          {quranRecords.map(r => (
                            <tr key={r.id}>
                              <td>{fmtDate(r.date)}</td>
                              <td>{r.first_name} {r.last_name}</td>
                              <td style={{ textTransform: 'capitalize' }}>{r.type}</td>
                              <td>{r.surah_name}</td>
                              <td>{r.ayah_from}–{r.ayah_to}</td>
                              <td>{r.grade}</td>
                              <td><span className={`badge ${r.passed ? 'badge-success' : 'badge-warning'}`}>{r.passed ? 'Passed' : 'Repeat'}</span></td>
                              <td>
                                <button onClick={() => setConfirmModal({
                                  message: 'Delete this Qur\'an record?',
                                  onConfirm: () => { handleDeleteQuranRecord(r.id); setConfirmModal(null); }
                                })} className="btn btn-danger btn-sm">Delete</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty"><p>No progress records found.</p></div>
                  )}
                </div>
              )}

              {!selectedClass && (
                <div className="card"><div className="empty"><p>Select a class to manage Qur'an progress.</p></div></div>
              )}
            </>
          )}

          {/* ═══════ FEES TAB ═══════ */}
          {activeTab === 'fees' && (
            <>
              <div className="page-header">
                <h2 className="page-title">Fee Tracking</h2>
                <button onClick={() => setShowFeePaymentForm(!showFeePaymentForm)} className="btn btn-primary">+ Record Payment</button>
              </div>

              <div className="card" style={{ padding: 'var(--sm) var(--md)', marginBottom: 'var(--md)' }}>
                <div className="form-group">
                  <label className="form-label">Filter by Class</label>
                  <select className="form-input" value={feeClassFilter} onChange={(e) => setFeeClassFilter(e.target.value)}>
                    <option value="">All Classes</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {showFeePaymentForm && (
                <div className="card">
                  <div className="card-header">Record Payment</div>
                  <div className="card-body">
                    <form onSubmit={handleRecordFeePayment}>
                      <div className="form-grid form-grid-3">
                        <div className="form-group">
                          <label className="form-label">Student *</label>
                          <select className="form-input" value={feePaymentForm.student_id} onChange={(e) => setFeePaymentForm({ ...feePaymentForm, student_id: e.target.value })} required>
                            <option value="">Select student...</option>
                            {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Amount *</label>
                          <input type="number" step="0.01" min="0.01" className="form-input" value={feePaymentForm.amount_paid} onChange={(e) => setFeePaymentForm({ ...feePaymentForm, amount_paid: e.target.value })} required />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Payment Date *</label>
                          <input type="date" className="form-input" value={feePaymentForm.payment_date} onChange={(e) => setFeePaymentForm({ ...feePaymentForm, payment_date: e.target.value })} required />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Method</label>
                          <select className="form-input" value={feePaymentForm.payment_method} onChange={(e) => setFeePaymentForm({ ...feePaymentForm, payment_method: e.target.value })}>
                            <option value="cash">Cash</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="online">Online</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Reference/Note</label>
                          <input type="text" className="form-input" value={feePaymentForm.reference_note} onChange={(e) => setFeePaymentForm({ ...feePaymentForm, reference_note: e.target.value })} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Label</label>
                          <input type="text" className="form-input" value={feePaymentForm.payment_label} onChange={(e) => setFeePaymentForm({ ...feePaymentForm, payment_label: e.target.value })} placeholder="e.g., Term 1" />
                        </div>
                      </div>
                      <div className="form-actions">
                        <button type="button" onClick={() => setShowFeePaymentForm(false)} className="btn btn-secondary">Cancel</button>
                        <button type="submit" className="btn btn-primary">Record Payment</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Fee Summary */}
              <div className="card">
                <div className="card-header">Fee Summary</div>
                {feeSummary.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table">
                      <thead><tr><th>Student</th><th>Class</th><th>Expected</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead>
                      <tbody>
                        {feeSummary.map(r => (
                          <tr key={r.student_id}>
                            <td>{r.student_name}</td>
                            <td>{r.class_name || '—'}</td>
                            <td>{madrasahProfile?.currency || '$'}{r.total_fee?.toLocaleString()}</td>
                            <td>{madrasahProfile?.currency || '$'}{r.total_paid?.toLocaleString()}</td>
                            <td style={{ color: r.balance > 0 ? 'var(--danger)' : 'var(--success)' }}>{madrasahProfile?.currency || '$'}{r.balance?.toLocaleString()}</td>
                            <td>
                              <span className={`badge ${r.status === 'paid' ? 'badge-success' : r.status === 'partial' ? 'badge-warning' : 'badge-danger'}`}>
                                {r.status === 'paid' ? 'Paid' : r.status === 'partial' ? 'Partial' : 'Unpaid'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty"><p>No fee data. Set expected fees on student profiles to start tracking.</p></div>
                )}
              </div>

              {/* Recent Payments */}
              {feePayments.length > 0 && (
                <div className="card" style={{ marginTop: 'var(--md)' }}>
                  <div className="card-header">Recent Payments</div>
                  <div className="table-responsive">
                    <table className="table">
                      <thead><tr><th>Date</th><th>Student</th><th>Amount</th><th>Method</th><th>Note</th><th></th></tr></thead>
                      <tbody>
                        {feePayments.slice(0, 50).map(p => (
                          <tr key={p.id}>
                            <td>{fmtDate(p.payment_date)}</td>
                            <td>{p.student_name}</td>
                            <td>{madrasahProfile?.currency || '$'}{p.amount_paid?.toLocaleString()}</td>
                            <td style={{ textTransform: 'capitalize' }}>{(p.payment_method || '').replace('_', ' ')}</td>
                            <td>{p.reference_note || '—'}</td>
                            <td>
                              <button onClick={() => setConfirmModal({
                                message: 'Void this payment?',
                                onConfirm: () => { handleDeleteFeePayment(p.id); setConfirmModal(null); }
                              })} className="btn btn-danger btn-sm">Void</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ═══════ SETTINGS TAB ═══════ */}
          {activeTab === 'settings' && (
            <>
              <div className="section-header">
                <h2>Settings</h2>
              </div>

              {/* Change Password */}
              <div className="card" id="settings-password">
                <h3>Change Password</h3>
                <form onSubmit={handleChangePassword} style={{ maxWidth: '400px' }}>
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

              {/* Attendance Features */}
              <div className="card" style={{ marginTop: '20px' }}>
                <h3>Attendance Features</h3>
                <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>
                  Choose which grading fields appear when recording attendance.
                </p>
                <div style={{ display: 'grid', gap: '16px', maxWidth: '400px' }}>
                  <div className="setting-toggle-row">
                    <div className="setting-toggle-info">
                      <span className="setting-toggle-label">Dressing Grade</span>
                      <p className="setting-toggle-desc">
                        Grade student dressing (Excellent / Good / Fair / Poor)
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={madrasahProfile?.enable_dressing_grade !== 0 && madrasahProfile?.enable_dressing_grade !== false}
                      className={`setting-switch ${(madrasahProfile?.enable_dressing_grade !== 0 && madrasahProfile?.enable_dressing_grade !== false) ? 'on' : ''}`}
                      disabled={savingSettings}
                      onClick={async () => {
                        const newValue = !(madrasahProfile?.enable_dressing_grade !== 0 && madrasahProfile?.enable_dressing_grade !== false);
                        setSavingSettings(true);
                        try {
                          const res = await api.put('/solo/settings', { enable_dressing_grade: newValue });
                          setMadrasahProfile(prev => ({ ...prev, ...res.data }));
                          toast.success(`Dressing grade ${newValue ? 'enabled' : 'disabled'}`);
                        } catch (error) {
                          toast.error('Failed to update setting');
                        } finally {
                          setSavingSettings(false);
                        }
                      }}
                    >
                      <span className="setting-switch-thumb" />
                    </button>
                  </div>
                  <div className="setting-toggle-row">
                    <div className="setting-toggle-info">
                      <span className="setting-toggle-label">Behavior Grade</span>
                      <p className="setting-toggle-desc">
                        Grade student behavior (Excellent / Good / Fair / Poor)
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={madrasahProfile?.enable_behavior_grade !== 0 && madrasahProfile?.enable_behavior_grade !== false}
                      className={`setting-switch ${(madrasahProfile?.enable_behavior_grade !== 0 && madrasahProfile?.enable_behavior_grade !== false) ? 'on' : ''}`}
                      disabled={savingSettings}
                      onClick={async () => {
                        const newValue = !(madrasahProfile?.enable_behavior_grade !== 0 && madrasahProfile?.enable_behavior_grade !== false);
                        setSavingSettings(true);
                        try {
                          const res = await api.put('/solo/settings', { enable_behavior_grade: newValue });
                          setMadrasahProfile(prev => ({ ...prev, ...res.data }));
                          toast.success(`Behavior grade ${newValue ? 'enabled' : 'disabled'}`);
                        } catch (error) {
                          toast.error('Failed to update setting');
                        } finally {
                          setSavingSettings(false);
                        }
                      }}
                    >
                      <span className="setting-switch-thumb" />
                    </button>
                  </div>
                  <div className="setting-toggle-row">
                    <div className="setting-toggle-info">
                      <span className="setting-toggle-label">Punctuality Grade</span>
                      <p className="setting-toggle-desc">
                        Grade student punctuality (Excellent / Good / Fair / Poor)
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={madrasahProfile?.enable_punctuality_grade !== 0 && madrasahProfile?.enable_punctuality_grade !== false}
                      className={`setting-switch ${(madrasahProfile?.enable_punctuality_grade !== 0 && madrasahProfile?.enable_punctuality_grade !== false) ? 'on' : ''}`}
                      disabled={savingSettings}
                      onClick={async () => {
                        const newValue = !(madrasahProfile?.enable_punctuality_grade !== 0 && madrasahProfile?.enable_punctuality_grade !== false);
                        setSavingSettings(true);
                        try {
                          const res = await api.put('/solo/settings', { enable_punctuality_grade: newValue });
                          setMadrasahProfile(prev => ({ ...prev, ...res.data }));
                          toast.success(`Punctuality grade ${newValue ? 'enabled' : 'disabled'}`);
                        } catch (error) {
                          toast.error('Failed to update setting');
                        } finally {
                          setSavingSettings(false);
                        }
                      }}
                    >
                      <span className="setting-switch-thumb" />
                    </button>
                  </div>
                  <div className="setting-toggle-row">
                    <div className="setting-toggle-info">
                      <span className="setting-toggle-label">Qur'an Tracking</span>
                      <p className="setting-toggle-desc">
                        Enable Qur'an memorization and recitation progress tracking
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={madrasahProfile?.enable_quran_tracking !== 0 && madrasahProfile?.enable_quran_tracking !== false}
                      className={`setting-switch ${(madrasahProfile?.enable_quran_tracking !== 0 && madrasahProfile?.enable_quran_tracking !== false) ? 'on' : ''}`}
                      disabled={savingSettings}
                      onClick={async () => {
                        const newValue = !(madrasahProfile?.enable_quran_tracking !== 0 && madrasahProfile?.enable_quran_tracking !== false);
                        setSavingSettings(true);
                        try {
                          const res = await api.put('/solo/settings', { enable_quran_tracking: newValue });
                          setMadrasahProfile(prev => ({ ...prev, ...res.data }));
                          toast.success(`Qur'an tracking ${newValue ? 'enabled' : 'disabled'}`);
                        } catch (error) {
                          toast.error('Failed to update setting');
                        } finally {
                          setSavingSettings(false);
                        }
                      }}
                    >
                      <span className="setting-switch-thumb" />
                    </button>
                  </div>
                  <div className="setting-toggle-row">
                    <div className="setting-toggle-info">
                      <span className="setting-toggle-label">Fee Tracking</span>
                      <p className="setting-toggle-desc">
                        Track student fee payments and manage collections
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={madrasahProfile?.enable_fee_tracking !== 0 && madrasahProfile?.enable_fee_tracking !== false}
                      className={`setting-switch ${(madrasahProfile?.enable_fee_tracking !== 0 && madrasahProfile?.enable_fee_tracking !== false) ? 'on' : ''}`}
                      disabled={savingSettings}
                      onClick={async () => {
                        const newValue = !(madrasahProfile?.enable_fee_tracking !== 0 && madrasahProfile?.enable_fee_tracking !== false);
                        setSavingSettings(true);
                        try {
                          const res = await api.put('/solo/settings', { enable_fee_tracking: newValue });
                          setMadrasahProfile(prev => ({ ...prev, ...res.data }));
                          toast.success(`Fee tracking ${newValue ? 'enabled' : 'disabled'}`);
                        } catch (error) {
                          toast.error('Failed to update setting');
                        } finally {
                          setSavingSettings(false);
                        }
                      }}
                    >
                      <span className="setting-switch-thumb" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Currency Setting */}
              <div className="card" style={{ marginTop: '20px' }}>
                <h3>Currency</h3>
                <p style={{ fontSize: '13px', color: 'var(--gray)', margin: '0 0 12px' }}>
                  Set the currency used for fee tracking and financial displays.
                </p>
                <select
                  className="form-select"
                  style={{ maxWidth: '280px' }}
                  value={madrasahProfile?.currency || 'USD'}
                  onChange={async (e) => {
                    const newCurrency = e.target.value;
                    try {
                      const res = await api.put('/solo/settings', { currency: newCurrency });
                      setMadrasahProfile(prev => ({ ...prev, ...res.data }));
                      toast.success(`Currency set to ${newCurrency}`);
                    } catch (error) {
                      toast.error('Failed to update currency');
                    }
                  }}
                >
                  <optgroup label="Popular">
                    <option value="USD">USD — US Dollar ($)</option>
                    <option value="EUR">EUR — Euro (€)</option>
                    <option value="GBP">GBP — British Pound (£)</option>
                    <option value="CAD">CAD — Canadian Dollar (CA$)</option>
                    <option value="AUD">AUD — Australian Dollar (A$)</option>
                    <option value="NZD">NZD — New Zealand Dollar (NZ$)</option>
                  </optgroup>
                  <optgroup label="Africa">
                    <option value="NGN">NGN — Nigerian Naira (₦)</option>
                    <option value="ZAR">ZAR — South African Rand (R)</option>
                    <option value="KES">KES — Kenyan Shilling (KSh)</option>
                    <option value="GHS">GHS — Ghanaian Cedi (GH₵)</option>
                    <option value="EGP">EGP — Egyptian Pound (E£)</option>
                    <option value="TZS">TZS — Tanzanian Shilling (TSh)</option>
                    <option value="UGX">UGX — Ugandan Shilling (USh)</option>
                    <option value="ETB">ETB — Ethiopian Birr (Br)</option>
                    <option value="MAD">MAD — Moroccan Dirham (MAD)</option>
                    <option value="XOF">XOF — West African CFA Franc (CFA)</option>
                    <option value="XAF">XAF — Central African CFA Franc (FCFA)</option>
                  </optgroup>
                  <optgroup label="Asia">
                    <option value="MYR">MYR — Malaysian Ringgit (RM)</option>
                    <option value="IDR">IDR — Indonesian Rupiah (Rp)</option>
                    <option value="PKR">PKR — Pakistani Rupee (₨)</option>
                    <option value="INR">INR — Indian Rupee (₹)</option>
                    <option value="BDT">BDT — Bangladeshi Taka (৳)</option>
                    <option value="SAR">SAR — Saudi Riyal (﷼)</option>
                    <option value="AED">AED — UAE Dirham (د.إ)</option>
                    <option value="QAR">QAR — Qatari Riyal (QR)</option>
                    <option value="KWD">KWD — Kuwaiti Dinar (KD)</option>
                    <option value="BHD">BHD — Bahraini Dinar (BD)</option>
                    <option value="OMR">OMR — Omani Rial (OMR)</option>
                    <option value="JOD">JOD — Jordanian Dinar (JD)</option>
                    <option value="TRY">TRY — Turkish Lira (₺)</option>
                    <option value="PHP">PHP — Philippine Peso (₱)</option>
                    <option value="SGD">SGD — Singapore Dollar (S$)</option>
                    <option value="JPY">JPY — Japanese Yen (¥)</option>
                    <option value="CNY">CNY — Chinese Yuan (¥)</option>
                    <option value="KRW">KRW — South Korean Won (₩)</option>
                    <option value="THB">THB — Thai Baht (฿)</option>
                    <option value="VND">VND — Vietnamese Dong (₫)</option>
                    <option value="LKR">LKR — Sri Lankan Rupee (Rs)</option>
                    <option value="MMK">MMK — Myanmar Kyat (K)</option>
                    <option value="IQD">IQD — Iraqi Dinar (ع.د)</option>
                    <option value="AFN">AFN — Afghan Afghani (؋)</option>
                  </optgroup>
                  <optgroup label="Europe">
                    <option value="CHF">CHF — Swiss Franc (CHF)</option>
                    <option value="SEK">SEK — Swedish Krona (kr)</option>
                    <option value="NOK">NOK — Norwegian Krone (kr)</option>
                    <option value="DKK">DKK — Danish Krone (kr)</option>
                    <option value="PLN">PLN — Polish Zloty (zł)</option>
                    <option value="CZK">CZK — Czech Koruna (Kč)</option>
                    <option value="HUF">HUF — Hungarian Forint (Ft)</option>
                    <option value="RON">RON — Romanian Leu (lei)</option>
                    <option value="BGN">BGN — Bulgarian Lev (лв)</option>
                    <option value="RUB">RUB — Russian Ruble (₽)</option>
                    <option value="UAH">UAH — Ukrainian Hryvnia (₴)</option>
                  </optgroup>
                  <optgroup label="Americas">
                    <option value="BRL">BRL — Brazilian Real (R$)</option>
                    <option value="MXN">MXN — Mexican Peso (MX$)</option>
                    <option value="ARS">ARS — Argentine Peso (ARS)</option>
                    <option value="CLP">CLP — Chilean Peso (CLP)</option>
                    <option value="COP">COP — Colombian Peso (COP)</option>
                    <option value="PEN">PEN — Peruvian Sol (S/)</option>
                    <option value="JMD">JMD — Jamaican Dollar (J$)</option>
                    <option value="TTD">TTD — Trinidad Dollar (TT$)</option>
                  </optgroup>
                  <optgroup label="Oceania">
                    <option value="FJD">FJD — Fijian Dollar (FJ$)</option>
                    <option value="PGK">PGK — Papua New Guinean Kina (K)</option>
                    <option value="WST">WST — Samoan Tala (WS$)</option>
                    <option value="TOP">TOP — Tongan Pa'anga (T$)</option>
                  </optgroup>
                </select>
              </div>

              {/* Account Info */}
              <div className="card" id="settings-account" style={{ marginTop: '20px' }}>
                <h3>Account Information</h3>
                <div style={{ display: 'grid', gap: '12px', maxWidth: '400px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Name</label>
                    <p style={{ margin: '4px 0 0 0' }}>{user?.firstName} {user?.lastName}</p>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Email</label>
                    <p style={{ margin: '4px 0 0 0' }}>{user?.email || 'N/A'}</p>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Role</label>
                    <p style={{ margin: '4px 0 0 0', textTransform: 'capitalize' }}>Solo Admin</p>
                  </div>
                </div>
              </div>

              {/* Madrasah Profile */}
              {madrasahProfile && (
                <div className="card" style={{ marginTop: '20px' }}>
                  <h3>Madrasah Profile</h3>
                  <div className="admin-profile-grid">
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Name</label>
                      <p style={{ margin: '4px 0 0 0', fontWeight: '500' }}>{madrasahProfile.name}</p>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>URL Slug</label>
                      <p style={{ margin: '4px 0 0 0', fontFamily: 'monospace' }}>/{madrasahProfile.slug}</p>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Plan</label>
                      <p style={{ margin: '4px 0 0 0', textTransform: 'capitalize' }}>
                        {madrasahProfile.pricing_plan || 'Solo'}
                      </p>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Phone</label>
                      <p style={{ margin: '4px 0 0 0' }}>{madrasahProfile.phone || 'Not specified'}</p>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Address</label>
                      <p style={{ margin: '4px 0 0 0' }}>
                        {[madrasahProfile.street, madrasahProfile.city, madrasahProfile.region, madrasahProfile.country]
                          .filter(Boolean).join(', ') || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Status</label>
                      <p style={{ margin: '4px 0 0 0' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: '#f5f5f5',
                          color: madrasahProfile.subscription_status === 'active' ? '#404040' : '#737373'
                        }}>
                          {madrasahProfile.subscription_status?.replace(/_/g, ' ') || 'Trial'}
                        </span>
                      </p>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Trial Ends</label>
                      <p style={{ margin: '4px 0 0 0' }}>
                        {madrasahProfile.trial_ends_at
                          ? new Date(madrasahProfile.trial_ends_at).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Usage Stats */}
                  <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>Current Usage</h4>
                    <div style={{ display: 'flex', gap: '24px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: '600' }}>{students.length}</div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Students</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: '600' }}>{classes.length}</div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Classes</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ═══════ HELP TAB ═══════ */}
          {activeTab === 'help' && (
            <>
              <div className="page-header"><h2 className="page-title">Help</h2></div>

              <div className="card">
                <div className="card-body">
                  <h3 style={{ fontSize: '16px', marginBottom: 'var(--md)' }}>Getting Started</h3>
                  <div style={{ display: 'grid', gap: '12px', fontSize: '14px', lineHeight: '1.6' }}>
                    <div>
                      <strong>1. Set up your academic year</strong>
                      <p style={{ color: 'var(--muted)', margin: '4px 0 0' }}>Go to Planner → Create a Session (e.g., "2025-2026") and set school days. Then add Semesters within that session.</p>
                    </div>
                    <div>
                      <strong>2. Create classes</strong>
                      <p style={{ color: 'var(--muted)', margin: '4px 0 0' }}>Go to Classes → Create classes for your madrasah (e.g., "Beginners", "Intermediate").</p>
                    </div>
                    <div>
                      <strong>3. Enroll students</strong>
                      <p style={{ color: 'var(--muted)', margin: '4px 0 0' }}>Go to Students → Add students and assign them to classes.</p>
                    </div>
                    <div>
                      <strong>4. Take attendance</strong>
                      <p style={{ color: 'var(--muted)', margin: '4px 0 0' }}>Go to Attendance → Select a class, choose the date, mark present/absent, and save.</p>
                    </div>
                    <div>
                      <strong>5. Record exams</strong>
                      <p style={{ color: 'var(--muted)', margin: '4px 0 0' }}>Go to Exam Recording → Select a class and click "Record Exam" to enter scores for all students.</p>
                    </div>
                    <div>
                      <strong>6. Enable features</strong>
                      <p style={{ color: 'var(--muted)', margin: '4px 0 0' }}>Go to Settings to enable/disable optional features like Qur'an tracking, fee tracking, and grading options.</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

        </main>
      </div>

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-body" style={{ padding: 'var(--lg)' }}>
              <p style={{ fontSize: '15px', marginBottom: 'var(--md)' }}>{confirmModal.message}</p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => setConfirmModal(null)} className="btn btn-secondary">Cancel</button>
                <button onClick={confirmModal.onConfirm} className="btn btn-danger">Confirm</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SoloDashboard;
