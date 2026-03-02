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

  const formatCurrency = (amount) => {
    const sym = madrasahProfile?.currency || '$';
    return `${sym}${Number(amount || 0).toLocaleString()}`;
  };

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

  // ─── Billing ─────────────────────────────────────
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [selectedPlan, setSelectedPlan] = useState('solo');
  const [couponCode, setCouponCode] = useState('');

  // ─── Support Tickets ─────────────────────────────
  const [supportTickets, setSupportTickets] = useState([]);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: '', message: '', priority: 'normal' });
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [ticketReply, setTicketReply] = useState('');

  // ─── Help ────────────────────────────────────────
  const [helpExpanded, setHelpExpanded] = useState(new Set());

  // ─── Constants ───────────────────────────────────
  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // ─── Browser tab title ───────────────────────────
  useEffect(() => {
    const labels = {
      overview: 'Overview', planner: 'Planner', classes: 'Classes', students: 'Students',
      attendance: 'Attendance', exams: 'Exams', quran: "Qur'an", fees: 'Fees', settings: 'Settings', help: 'Help', support: 'Support'
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

  // ─── Fetch tickets when Support tab is active ───
  useEffect(() => {
    if (activeTab === 'support') {
      fetchTickets();
    }
  }, [activeTab]);

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

  // ─── Support ticket handlers ─────────────────────
  const fetchTickets = async () => {
    try {
      const response = await api.get('/admin/tickets');
      setSupportTickets(response.data || []);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/tickets', newTicket);
      setNewTicket({ subject: '', message: '', priority: 'normal' });
      setShowTicketForm(false);
      fetchTickets();
      toast.success('Ticket submitted successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create ticket');
    }
  };

  const handleViewTicket = async (id) => {
    try {
      const response = await api.get(`/admin/tickets/${id}`);
      setSelectedTicket(response.data.ticket);
      setTicketMessages(response.data.messages || []);
      setTicketReply('');
    } catch (error) {
      toast.error('Failed to load ticket');
    }
  };

  const handleReplyToTicket = async () => {
    if (!ticketReply.trim()) return;
    try {
      await api.post(`/admin/tickets/${selectedTicket.id}/reply`, { message: ticketReply });
      setTicketReply('');
      handleViewTicket(selectedTicket.id);
      fetchTickets();
    } catch (error) {
      toast.error('Failed to send reply');
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
      { id: 'classes', label: 'Classes' },
      { id: 'students', label: 'Students' },
      ...(madrasahProfile?.enable_fee_tracking ? [{ id: 'fees', label: 'Fees' }] : []),
    ]},
    { label: 'Teach', items: [
      { id: 'attendance', label: 'Attendance' },
      { id: 'exams', label: 'Exam Recording' },
      ...(madrasahProfile?.enable_quran_tracking ? [{ id: 'quran', label: "Qur'an" }] : []),
    ]},
    { label: 'Tools', items: [
      { id: 'planner', label: 'Planner' },
    ]},
    { label: 'Help', items: [
      { id: 'help', label: 'Help' },
      { id: 'support', label: 'Support' },
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
      case 'support':
        return <svg {...iconProps}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>;
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
              <button className="profile-dropdown-item" onClick={() => { handleTabChange('settings'); setProfileDropdownOpen(false); setTimeout(() => document.getElementById('settings-billing')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                Billing
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
                <div className="stats-grid">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="card" style={{ padding: '20px' }}>
                      <div className="skeleton" style={{ height: '14px', width: '60%', marginBottom: '12px', borderRadius: '4px', background: 'var(--lighter)' }} />
                      <div className="skeleton" style={{ height: '28px', width: '40%', borderRadius: '4px', background: 'var(--lighter)' }} />
                    </div>
                  ))}
                </div>
              ) : overviewData ? (
                <>
                  <div className="insights-summary">
                    <div className="summary-card">
                      <div className="summary-label">Students</div>
                      <div className="summary-value">{overviewData.students}</div>
                      <div className="summary-status">across {overviewData.classes} class{overviewData.classes !== 1 ? 'es' : ''}</div>
                    </div>
                    <div className="summary-card">
                      <div className="summary-label">Classes</div>
                      <div className="summary-value">{overviewData.classes}</div>
                      <div className="summary-status">max 5 on Solo</div>
                    </div>
                    <div className="summary-card">
                      <div className="summary-label">Present Today</div>
                      <div className="summary-value">{overviewData.attendance?.present || 0}/{overviewData.attendance?.total || 0}</div>
                      <div className="summary-status">{overviewData.attendance?.total > 0 ? `${Math.round((overviewData.attendance?.present || 0) / overviewData.attendance.total * 100)}% attendance` : 'No records yet'}</div>
                    </div>
                    {madrasahProfile?.enable_fee_tracking && (
                      <div className="summary-card">
                        <div className="summary-label">Fees Collected</div>
                        <div className="summary-value">{formatCurrency(overviewData.fees?.total_paid || 0)}</div>
                        <div className="summary-status">of {formatCurrency(overviewData.fees?.total_expected || 0)} expected</div>
                      </div>
                    )}
                  </div>

                  {/* Today's Status */}
                  {activeSemester && (
                    <div className="alert-panel" style={{ marginTop: 'var(--md)' }}>
                      <div className="alert-panel-title">Today's Status</div>
                      <div className="alert-panel-content">
                        {classes.length === 0 ? (
                          <span style={{ color: 'var(--muted)' }}>Create a class to start tracking attendance.</span>
                        ) : (
                          <span>
                            {overviewData.attendance?.total > 0
                              ? `Attendance recorded for ${overviewData.attendance.present} of ${overviewData.attendance.total} students.`
                              : 'Attendance has not been recorded yet today.'}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="overview-actions" style={{ marginTop: 'var(--lg)' }}>
                    <div className="overview-action-card" onClick={() => handleTabChange('attendance')}>
                      <div className="overview-action-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                      </div>
                      <div className="overview-action-label">Take Attendance</div>
                    </div>
                    <div className="overview-action-card" onClick={() => handleTabChange('students')}>
                      <div className="overview-action-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                      </div>
                      <div className="overview-action-label">Add Student</div>
                    </div>
                    <div className="overview-action-card" onClick={() => handleTabChange('exams')}>
                      <div className="overview-action-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                      </div>
                      <div className="overview-action-label">Record Exam</div>
                    </div>
                    {madrasahProfile?.enable_fee_tracking && (
                      <div className="overview-action-card" onClick={() => handleTabChange('fees')}>
                        <div className="overview-action-icon">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                        </div>
                        <div className="overview-action-label">Record Payment</div>
                      </div>
                    )}
                  </div>

                  {/* Setup Checklist */}
                  {(sessions.length === 0 || classes.length === 0 || students.length === 0) && (
                    <div className="card" style={{ marginTop: 'var(--lg)' }}>
                      <div className="card-header">Setup Checklist</div>
                      <div className="card-body" style={{ display: 'grid', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', background: sessions.length > 0 ? 'var(--accent)' : 'var(--lighter)', color: sessions.length > 0 ? 'white' : 'var(--muted)' }}>{sessions.length > 0 ? '✓' : '1'}</span>
                          <span style={{ fontSize: '14px', textDecoration: sessions.length > 0 ? 'line-through' : 'none', color: sessions.length > 0 ? 'var(--muted)' : 'var(--text)' }}>Create an academic session</span>
                          {sessions.length === 0 && <button className="btn btn-sm btn-secondary" onClick={() => handleTabChange('planner')}>Go</button>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', background: classes.length > 0 ? 'var(--accent)' : 'var(--lighter)', color: classes.length > 0 ? 'white' : 'var(--muted)' }}>{classes.length > 0 ? '✓' : '2'}</span>
                          <span style={{ fontSize: '14px', textDecoration: classes.length > 0 ? 'line-through' : 'none', color: classes.length > 0 ? 'var(--muted)' : 'var(--text)' }}>Create your first class</span>
                          {classes.length === 0 && <button className="btn btn-sm btn-secondary" onClick={() => handleTabChange('classes')}>Go</button>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', background: students.length > 0 ? 'var(--accent)' : 'var(--lighter)', color: students.length > 0 ? 'white' : 'var(--muted)' }}>{students.length > 0 ? '✓' : '3'}</span>
                          <span style={{ fontSize: '14px', textDecoration: students.length > 0 ? 'line-through' : 'none', color: students.length > 0 ? 'var(--muted)' : 'var(--text)' }}>Add your first student</span>
                          {students.length === 0 && <button className="btn btn-sm btn-secondary" onClick={() => handleTabChange('students')}>Go</button>}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="card"><div className="empty"><p>Failed to load overview data.</p></div></div>
              )}
            </>
          )}

          {/* ═══════ PLANNER TAB ═══════ */}
          {activeTab === 'planner' && (
            <>
              {plannerSubTab === 'sessions' && (
                <>
                  <div className="page-header">
                    <h2 className="page-title">Academic Planner</h2>
                    <button onClick={() => {
                      setEditingSession(null);
                      setNewSession({ name: '', start_date: '', end_date: '', is_active: false, default_school_days: [] });
                      setShowSessionForm(!showSessionForm);
                    }} className="btn btn-primary">+ New Session</button>
                  </div>

                  <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: 'var(--md)' }}>
                    Create academic sessions, set school days, and manage semesters.
                  </p>

                  {showSessionForm && (
                    <div className="card">
                      <div className="card-header">{editingSession ? 'Edit Academic Session' : 'Create New Academic Session'}</div>
                      <div className="card-body">
                        <form onSubmit={handleCreateSession}>
                          <div className="form-grid">
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
                            <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>Select which days the madrasah operates during this session</p>
                            <div className="days-grid">
                              {weekDays.map(day => (
                                <button
                                  key={day}
                                  type="button"
                                  className={`day-btn ${(newSession.default_school_days || []).includes(day) ? 'selected' : ''}`}
                                  onClick={() => setNewSession({
                                    ...newSession,
                                    default_school_days: (newSession.default_school_days || []).includes(day)
                                      ? newSession.default_school_days.filter(d => d !== day)
                                      : [...(newSession.default_school_days || []), day]
                                  })}
                                >
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

                  {sessions.length === 0 ? (
                    <div className="card"><div className="empty"><div className="empty-icon"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div><p>No sessions yet. Create one to get started.</p><button className="empty-action" onClick={() => setShowSessionForm(true)}>+ Create Session</button></div></div>
                  ) : (
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {sessions.map(session => {
                        const schoolDays = session.default_school_days ? (typeof session.default_school_days === 'string' ? JSON.parse(session.default_school_days) : session.default_school_days) : [];
                        const sessionSemesters = semesters.filter(sem => sem.session_id === session.id);
                        return (
                          <div key={session.id} className="card" style={{ padding: 'var(--md)', cursor: 'pointer' }} onClick={() => { setPlannerSubTab('detail'); setPlannerSelectedSession(session); }}>
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
                                <button onClick={(e) => { e.stopPropagation(); setEditingSession(session); setNewSession({ name: session.name, start_date: session.start_date?.slice(0, 10), end_date: session.end_date?.slice(0, 10), is_active: session.is_active, default_school_days: schoolDays }); setShowSessionForm(true); }} className="btn btn-sm btn-secondary">Edit</button>
                                <button onClick={(e) => { e.stopPropagation(); setConfirmModal({ message: `Delete session "${session.name}"?`, onConfirm: () => { handleDeleteSession(session.id); setConfirmModal(null); } }); }} className="btn btn-sm btn-danger">Delete</button>
                                <button onClick={() => { setPlannerSubTab('detail'); setPlannerSelectedSession(session); }} style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '13px', color: '#2563eb', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>View →</button>
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
                        }} className="btn btn-sm btn-primary">+ Add</button>
                      )}
                    </div>

                    {showSemesterForm && (
                      <div className="card-body" style={{ borderBottom: '1px solid var(--border)' }}>
                        <form onSubmit={handleCreateSemester}>
                          <div className="form-grid">
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
                    )}

                    <div className="card-body" style={{ padding: 0 }}>
                      {semesters.filter(sem => sem.session_id === plannerSelectedSession.id).length === 0 ? (
                        <div className="empty" style={{ padding: 'var(--md)' }}><p>No semesters yet for this session.</p></div>
                      ) : (
                        <div className="table-wrap">
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
                                    <button onClick={() => { setEditingSemester(semester); setNewSemester({ session_id: semester.session_id, name: semester.name, start_date: semester.start_date?.slice(0, 10), end_date: semester.end_date?.slice(0, 10), is_active: semester.is_active }); setShowSemesterForm(true); }} className="btn btn-sm btn-secondary">Edit</button>
                                    <button onClick={() => setConfirmModal({ message: `Delete semester "${semester.name}"?`, onConfirm: () => { handleDeleteSemester(semester.id); setConfirmModal(null); } })} className="btn btn-sm btn-danger" style={{ marginLeft: '4px' }}>Delete</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
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
                  <div className="card-header">{editingClass ? 'Edit Class' : 'Create New Class'}</div>
                  <div className="card-body">
                    <form onSubmit={handleCreateClass}>
                      <div className="form-grid">
                        <div className="form-group">
                          <label className="form-label">Class Name</label>
                          <input type="text" className="form-input" value={newClass.name} onChange={(e) => setNewClass({ ...newClass, name: e.target.value })} placeholder="e.g., Junior Boys, Senior Girls" required />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Grade Level</label>
                          <input type="text" className="form-input" value={newClass.grade_level} onChange={(e) => setNewClass({ ...newClass, grade_level: e.target.value })} placeholder="e.g., Grade 5-6" />
                        </div>
                        <div className="form-group full">
                          <label className="form-label">Description</label>
                          <input type="text" className="form-input" value={newClass.description} onChange={(e) => setNewClass({ ...newClass, description: e.target.value })} placeholder="Optional description" />
                        </div>
                        <div className="form-group full">
                          <label className="form-label">School Days</label>
                          <div className="days-grid">
                            {weekDays.map(day => (
                              <button
                                key={day}
                                type="button"
                                className={`day-btn ${(newClass.school_days || []).includes(day) ? 'selected' : ''}`}
                                onClick={() => setNewClass({
                                  ...newClass,
                                  school_days: (newClass.school_days || []).includes(day)
                                    ? newClass.school_days.filter(d => d !== day)
                                    : [...(newClass.school_days || []), day]
                                })}
                              >
                                {day.substring(0, 3)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="form-actions">
                        <button type="button" onClick={() => { setShowClassForm(false); setEditingClass(null); setNewClass({ name: '', grade_level: '', school_days: [], description: '' }); }} className="btn btn-secondary">Cancel</button>
                        <button type="submit" className="btn btn-primary">{editingClass ? 'Update Class' : 'Create Class'}</button>
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
                            const days = typeof cls.school_days === 'string' ? JSON.parse(cls.school_days) : cls.school_days;
                            schoolDays = Array.isArray(days) ? days.join(', ') : 'Not set';
                          }
                        } catch (e) { /* ignore */ }
                        return (
                          <tr key={cls.id}>
                            <td><strong>{cls.name}</strong></td>
                            <td>{cls.grade_level || 'N/A'}</td>
                            <td>{schoolDays}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button onClick={() => {
                                  setEditingClass(cls);
                                  const sd = (() => { try { return typeof cls.school_days === 'string' ? JSON.parse(cls.school_days) : (cls.school_days || []); } catch { return []; } })();
                                  setNewClass({ name: cls.name, grade_level: cls.grade_level || '', school_days: sd, description: cls.description || '' });
                                  setShowClassForm(true);
                                }} className="btn btn-sm btn-secondary">Edit</button>
                                <button onClick={() => setConfirmModal({
                                  message: `Delete class "${cls.name}"?`,
                                  onConfirm: () => { handleDeleteClass(cls.id); setConfirmModal(null); }
                                })} className="btn btn-sm btn-danger">Delete</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {classes.length === 0 && (
                        <tr>
                          <td colSpan="4">
                            <div className="empty">
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
                        const days = typeof cls.school_days === 'string' ? JSON.parse(cls.school_days) : cls.school_days;
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
                          <button onClick={() => {
                            setEditingClass(cls);
                            const sd = (() => { try { return typeof cls.school_days === 'string' ? JSON.parse(cls.school_days) : (cls.school_days || []); } catch { return []; } })();
                            setNewClass({ name: cls.name, grade_level: cls.grade_level || '', school_days: sd, description: cls.description || '' });
                            setShowClassForm(true);
                          }} className="btn btn-sm btn-secondary">Edit</button>
                          <button onClick={() => setConfirmModal({
                            message: `Delete class "${cls.name}"?`,
                            onConfirm: () => { handleDeleteClass(cls.id); setConfirmModal(null); }
                          })} className="btn btn-sm btn-danger">Delete</button>
                        </div>
                      </div>
                    );
                  })}
                  {classes.length === 0 && (
                    <div className="empty"><p>No classes yet. Create one to get started.</p><button className="empty-action" onClick={() => setShowClassForm(true)}>+ Create Class</button></div>
                  )}
                </div>
              </div>
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
                  <div className="card-header">{editingStudent ? 'Edit Student' : 'Create New Student'}</div>
                  <div className="card-body">
                    <form onSubmit={handleCreateStudent}>
                      <div className="form-grid">
                        <div className="form-group">
                          <label className="form-label">First Name *</label>
                          <input type="text" className="form-input" value={newStudent.first_name} onChange={(e) => setNewStudent({ ...newStudent, first_name: e.target.value })} required />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Last Name *</label>
                          <input type="text" className="form-input" value={newStudent.last_name} onChange={(e) => setNewStudent({ ...newStudent, last_name: e.target.value })} required />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Student ID (3-10 digits)</label>
                          <input type="text" className="form-input" value={newStudent.student_id} onChange={(e) => setNewStudent({ ...newStudent, student_id: e.target.value })} pattern="\d{3,10}" maxLength="10" placeholder="001" required disabled={!!editingStudent} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Gender *</label>
                          <select className="form-select" value={newStudent.gender} onChange={(e) => setNewStudent({ ...newStudent, gender: e.target.value })} required>
                            <option value="">Select...</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Class</label>
                          <select className="form-select" value={newStudent.class_id} onChange={(e) => setNewStudent({ ...newStudent, class_id: e.target.value })}>
                            <option value="">No class</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                      </div>

                      <h4 style={{ margin: 'var(--md) 0 var(--sm)', fontSize: '14px', color: 'var(--muted)' }}>Parent/Guardian</h4>
                      <div className="form-grid">
                        <div className="form-group">
                          <label className="form-label">Name</label>
                          <input type="text" className="form-input" value={newStudent.parent_guardian_name} onChange={(e) => setNewStudent({ ...newStudent, parent_guardian_name: e.target.value })} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Relationship</label>
                          <select className="form-select" value={newStudent.parent_guardian_relationship} onChange={(e) => setNewStudent({ ...newStudent, parent_guardian_relationship: e.target.value })}>
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
                        <div className="form-grid">
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
                        <button type="submit" className="btn btn-primary">{editingStudent ? 'Update Student' : 'Add Student'}</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Desktop: SortableTable */}
              <div className="card admin-table-desktop">
                <SortableTable
                  columns={[
                    { key: 'student_id', label: 'ID', sortable: true, sortType: 'string' },
                    { key: 'name', label: 'Name', sortable: true, sortType: 'string',
                      render: (row) => <strong>{row.first_name} {row.last_name}</strong>,
                      sortValue: (row) => `${row.first_name} ${row.last_name}` },
                    { key: 'gender', label: 'Gender', sortable: true, sortType: 'string' },
                    { key: 'class_name', label: 'Class', sortable: true, sortType: 'string',
                      render: (row) => row.class_name || '—' },
                    { key: 'parent', label: 'Parent/Guardian', sortable: false,
                      render: (row) => row.parent_guardian_name || '—' },
                    { key: 'actions', label: '', sortable: false,
                      render: (row) => (
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button onClick={() => {
                            setEditingStudent(row);
                            setNewStudent({
                              first_name: row.first_name, last_name: row.last_name,
                              student_id: row.student_id, gender: row.gender, class_id: row.class_id || '',
                              student_phone: row.student_phone || '', student_phone_country_code: row.student_phone_country_code || '+64',
                              street: row.street || '', city: row.city || '', state: row.state || '', country: row.country || '',
                              parent_guardian_name: row.parent_guardian_name || '',
                              parent_guardian_relationship: row.parent_guardian_relationship || '',
                              parent_guardian_phone: row.parent_guardian_phone || '',
                              parent_guardian_phone_country_code: row.parent_guardian_phone_country_code || '+64',
                              notes: row.notes || '',
                              expected_fee: row.expected_fee || '', fee_note: row.fee_note || ''
                            });
                            setShowStudentForm(true);
                          }} className="btn btn-sm btn-secondary">Edit</button>
                          <button onClick={() => setConfirmModal({
                            message: `Delete student "${row.first_name} ${row.last_name}"?`,
                            onConfirm: () => { handleDeleteStudent(row.id); setConfirmModal(null); }
                          })} className="btn btn-sm btn-danger">Delete</button>
                        </div>
                      )}
                  ]}
                  data={filteredStudents}
                  searchable
                  searchPlaceholder="Search students..."
                  searchKeys={['first_name', 'last_name', 'student_id', 'class_name', 'parent_guardian_name']}
                  pagination
                  pageSize={25}
                  emptyMessage="No students found. Add your first student to get started."
                />
              </div>

              {/* Mobile: admin-mobile-cards */}
              <div className="admin-mobile-cards students-mobile-cards">
                {filteredStudents.length === 0 ? (
                  <div className="empty"><p>No students found.</p></div>
                ) : (
                  filteredStudents.map(s => (
                    <div key={s.id} className="admin-mobile-card">
                      <div className="admin-mobile-card-top">
                        <div>
                          <div className="admin-mobile-card-title">{s.first_name} {s.last_name}</div>
                          <div className="admin-mobile-card-sub">{s.gender} · {s.class_name || 'No class'}</div>
                        </div>
                        <div className="admin-mobile-card-badge">{s.student_id}</div>
                      </div>
                      <div className="admin-mobile-card-actions">
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
                        }} className="btn btn-sm btn-secondary">Edit</button>
                        <button onClick={() => setConfirmModal({
                          message: `Delete "${s.first_name} ${s.last_name}"?`,
                          onConfirm: () => { handleDeleteStudent(s.id); setConfirmModal(null); }
                        })} className="btn btn-sm btn-danger">Delete</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
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

              {/* Class filter */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
                <select className="form-select" style={{ maxWidth: '220px' }} value={feeClassFilter} onChange={(e) => setFeeClassFilter(e.target.value)}>
                  <option value="">All Classes</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {showFeePaymentForm && (
                <div className="card">
                  <div className="card-header">Record Payment</div>
                  <div className="card-body">
                    <form onSubmit={handleRecordFeePayment}>
                      <div className="form-grid">
                        <div className="form-group">
                          <label className="form-label">Student *</label>
                          <select className="form-select" value={feePaymentForm.student_id} onChange={(e) => setFeePaymentForm({ ...feePaymentForm, student_id: e.target.value })} required>
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
                          <select className="form-select" value={feePaymentForm.payment_method} onChange={(e) => setFeePaymentForm({ ...feePaymentForm, payment_method: e.target.value })}>
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

              {/* Fee Summary Cards */}
              {feeSummary.length > 0 && (
                <div className="fee-summary-cards">
                  <div className="fee-summary-card">
                    <div className="fee-summary-value">{formatCurrency(feeSummary.reduce((s, r) => s + (r.total_fee || 0), 0))}</div>
                    <div className="fee-summary-label">Total Expected</div>
                  </div>
                  <div className="fee-summary-card">
                    <div className="fee-summary-value">{formatCurrency(feeSummary.reduce((s, r) => s + (r.total_paid || 0), 0))}</div>
                    <div className="fee-summary-label">Collected</div>
                  </div>
                  <div className="fee-summary-card">
                    <div className="fee-summary-value">{formatCurrency(feeSummary.reduce((s, r) => s + Math.max(r.balance || 0, 0), 0))}</div>
                    <div className="fee-summary-label">Outstanding</div>
                  </div>
                </div>
              )}

              {feeSummary.length === 0 ? (
                <div className="card">
                  <div className="empty">
                    <div className="empty-icon"><svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
                    <p>No fee data yet. Set expected fees on student profiles to start tracking.</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="card fee-table-desktop">
                    <SortableTable
                      columns={[
                        { key: 'student_name', label: 'Student', sortable: true, sortType: 'string' },
                        { key: 'class_name', label: 'Class', sortable: true, sortType: 'string', render: (row) => row.class_name || '—' },
                        { key: 'total_fee', label: 'Expected', sortable: true, sortType: 'number', render: (row) => formatCurrency(row.total_fee) },
                        { key: 'total_paid', label: 'Paid', sortable: true, sortType: 'number', render: (row) => formatCurrency(row.total_paid) },
                        { key: 'balance', label: 'Balance', sortable: true, sortType: 'number', render: (row) => formatCurrency(row.balance) },
                        { key: 'status', label: 'Progress', sortable: true, sortType: 'number',
                          sortValue: (row) => row.total_fee > 0 ? row.total_paid / row.total_fee : 0,
                          render: (row) => <FeeProgressBar paid={row.total_paid} total={row.total_fee} /> }
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

                  {/* Mobile Cards */}
                  <div className="fee-mobile-cards">
                    {feeSummary.map((row, idx) => (
                      <div key={idx} className="admin-mobile-card">
                        <div className="admin-mobile-card-top">
                          <div>
                            <div className="admin-mobile-card-title">{row.student_name}</div>
                            <div className="admin-mobile-card-sub">{row.class_name || '—'}</div>
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
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Recent Payments */}
              {feePayments.length > 0 && (
                <>
                  <div className="card fee-table-desktop" style={{ marginTop: '20px' }}>
                    <div className="card-header">Recent Payments</div>
                    <div className="card-body" style={{ padding: 0 }}>
                      <SortableTable
                        columns={[
                          { key: 'student_name', label: 'Student', sortable: true, sortType: 'string' },
                          { key: 'amount_paid', label: 'Amount', sortable: true, sortType: 'number', render: (row) => formatCurrency(row.amount_paid) },
                          { key: 'payment_label', label: 'For', sortable: false, render: (row) => row.payment_label || '—' },
                          { key: 'payment_date', label: 'Date', sortable: true, sortType: 'string', render: (row) => fmtDate(row.payment_date) },
                          { key: 'payment_method', label: 'Method', sortable: true, sortType: 'string',
                            render: (row) => ({ cash: 'Cash', bank_transfer: 'Bank Transfer', online: 'Online', other: 'Other' }[row.payment_method] || row.payment_method) },
                          { key: 'actions', label: '', sortable: false,
                            render: (row) => (
                              <button onClick={() => setConfirmModal({ message: 'Void this payment?', onConfirm: () => { handleDeleteFeePayment(row.id); setConfirmModal(null); } })} className="btn btn-sm btn-danger">Void</button>
                            )}
                        ]}
                        data={feePayments.slice(0, 50)}
                        pagination
                        pageSize={10}
                        emptyMessage="No payments recorded"
                      />
                    </div>
                  </div>
                  <div className="fee-mobile-cards" style={{ marginTop: '20px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#0a0a0a' }}>Recent Payments</div>
                    {feePayments.slice(0, 50).map(p => (
                      <div key={p.id} className="admin-mobile-card">
                        <div className="admin-mobile-card-top">
                          <div>
                            <div className="admin-mobile-card-title">{p.student_name}</div>
                            <div className="admin-mobile-card-sub">{p.payment_label || ''} &middot; {({ cash: 'Cash', bank_transfer: 'Bank Transfer', online: 'Online', other: 'Other' }[p.payment_method] || p.payment_method)}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 600, fontSize: '15px' }}>{formatCurrency(p.amount_paid)}</div>
                            <div className="admin-mobile-card-sub">{fmtDate(p.payment_date)}</div>
                          </div>
                        </div>
                        <div className="admin-mobile-card-actions">
                          <button onClick={() => setConfirmModal({ message: 'Void this payment?', onConfirm: () => { handleDeleteFeePayment(p.id); setConfirmModal(null); } })} className="btn btn-sm btn-danger">Void</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
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

              {/* Billing & Subscription */}
              <div className="card" id="settings-billing" style={{ marginTop: '20px' }}>
                <h3>Billing & Subscription</h3>
                <div style={{ display: 'grid', gap: '16px', maxWidth: '500px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--lighter)', borderRadius: '4px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Current Plan</div>
                      <div style={{ fontSize: '18px', fontWeight: '600', textTransform: 'capitalize' }}>
                        {madrasahProfile?.pricing_plan || 'Trial'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Status</div>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor: '#f5f5f5',
                        color: madrasahProfile?.subscription_status === 'active' ? '#404040' :
                          madrasahProfile?.subscription_status === 'trialing' ? '#525252' :
                          madrasahProfile?.subscription_status === 'past_due' ? '#737373' : '#525252'
                      }}>
                        {madrasahProfile?.subscription_status || 'trialing'}
                      </span>
                    </div>
                  </div>

                  {/* Solo Plan Selection */}
                  <div style={{ marginTop: '16px', padding: '16px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>Solo Plan</h4>

                    {/* Billing Cycle Toggle */}
                    <div style={{ display: 'flex', gap: '0', marginBottom: '16px', background: 'var(--lighter)', borderRadius: '6px', padding: '4px', width: 'fit-content' }}>
                      <button
                        type="button"
                        onClick={() => setBillingCycle('monthly')}
                        style={{
                          padding: '8px 16px',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          background: billingCycle === 'monthly' ? 'white' : 'transparent',
                          color: billingCycle === 'monthly' ? 'var(--text)' : 'var(--muted)',
                          fontWeight: billingCycle === 'monthly' ? '500' : '400',
                          boxShadow: billingCycle === 'monthly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                        }}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillingCycle('annual')}
                        style={{
                          padding: '8px 16px',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          background: billingCycle === 'annual' ? 'white' : 'transparent',
                          color: billingCycle === 'annual' ? 'var(--text)' : 'var(--muted)',
                          fontWeight: billingCycle === 'annual' ? '500' : '400',
                          boxShadow: billingCycle === 'annual' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                        }}
                      >
                        Annual <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: '500' }}>Save 2 months</span>
                      </button>
                    </div>

                    {/* Solo pricing display */}
                    <div style={{
                      padding: '16px',
                      border: '2px solid var(--accent)',
                      borderRadius: '8px',
                      background: 'var(--lighter)'
                    }}>
                      <div style={{ fontSize: '24px', fontWeight: '600' }}>
                        ${billingCycle === 'monthly' ? '5' : '50'}
                        <span style={{ fontSize: '14px', fontWeight: '400', color: 'var(--muted)' }}>
                          /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px' }}>
                        Up to 50 students · 5 classes · Attendance, exams, fees & more
                      </div>
                    </div>

                    {/* Discount Code */}
                    <div style={{ marginTop: '16px' }}>
                      <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Discount Code</label>
                      <input
                        type="text"
                        className="form-input"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="e.g. SCHOOL50"
                        style={{ width: '100%', letterSpacing: '1px', fontWeight: '500' }}
                      />
                    </div>

                    {/* Subscribe Button */}
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%', marginTop: '12px' }}
                      onClick={async () => {
                        try {
                          const priceKey = `solo_${billingCycle}`;
                          const payload = {
                            priceKey,
                            successUrl: `${window.location.origin}/${madrasahSlug}/solo?billing=success`,
                            cancelUrl: `${window.location.origin}/${madrasahSlug}/solo?billing=canceled`
                          };
                          if (couponCode.trim()) {
                            payload.coupon_code = couponCode.trim();
                          }
                          const response = await api.post('/billing/create-checkout', payload);
                          window.location.href = response.data.url;
                        } catch (error) {
                          toast.error(error.response?.data?.error || 'Failed to start checkout');
                        }
                      }}
                    >
                      {madrasahProfile?.subscription_status === 'active' ? 'Change Plan' : 'Subscribe Now'}
                    </button>
                  </div>

                  {/* Manage Billing */}
                  {madrasahProfile?.stripe_customer_id && (
                    <button
                      className="btn btn-secondary"
                      style={{ marginTop: '12px' }}
                      onClick={async () => {
                        try {
                          const response = await api.post('/billing/customer-portal', {
                            returnUrl: `${window.location.origin}/${madrasahSlug}/solo`
                          });
                          window.location.href = response.data.url;
                        } catch (error) {
                          toast.error(error.response?.data?.error || 'Failed to open billing portal');
                        }
                      }}
                    >
                      Manage Billing
                    </button>
                  )}

                  {/* Upgrade Path */}
                  <div style={{ padding: '12px 16px', background: 'var(--lighter)', borderRadius: '8px', marginTop: '4px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Need more capacity?</div>
                    <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 8px' }}>
                      Upgrade to Standard (100 students, teachers, reports) or Plus (500 students, advanced features).
                    </p>
                    <a href="/pricing" target="_blank" style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: '500', textDecoration: 'none' }}>
                      View plans & pricing →
                    </a>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ═══════ SUPPORT TAB ═══════ */}
          {activeTab === 'support' && (
            <>
              <div className="section-header">
                <h2>Support</h2>
                <button className="btn btn-primary" onClick={() => setShowTicketForm(!showTicketForm)}>
                  {showTicketForm ? 'Cancel' : '+ New Ticket'}
                </button>
              </div>

              <p className="support-intro">
                Need help? Submit a support ticket and our team will get back to you.
              </p>

              {showTicketForm && (
                <div className="card ticket-form">
                  <form onSubmit={handleCreateTicket}>
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                      <label className="form-label">Subject</label>
                      <input
                        className="form-input"
                        type="text"
                        value={newTicket.subject}
                        onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                        placeholder="Brief description of your issue"
                        required
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                      <label className="form-label">Priority</label>
                      <select
                        className="form-select"
                        value={newTicket.priority}
                        onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                      >
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                      <label className="form-label">Message</label>
                      <textarea
                        className="form-textarea"
                        value={newTicket.message}
                        onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                        placeholder="Describe your issue in detail..."
                        rows={5}
                        required
                      />
                    </div>
                    <div className="form-actions" style={{ borderTop: 'none', marginTop: 0, paddingTop: 0, justifyContent: 'flex-start' }}>
                      <button type="submit" className="btn btn-primary">Submit Ticket</button>
                    </div>
                  </form>
                </div>
              )}

              {selectedTicket ? (
                <div className="card">
                  <button className="btn btn-secondary btn-sm" onClick={() => setSelectedTicket(null)} style={{ marginBottom: '16px' }}>
                    ← Back to tickets
                  </button>
                  <div className="ticket-detail-header">
                    <h3>{selectedTicket.subject}</h3>
                    <div className="ticket-detail-meta">
                      <span className={`ticket-status ticket-status-${selectedTicket.status}`}>
                        {selectedTicket.status.replace('_', ' ')}
                      </span>
                      <span>{new Date(selectedTicket.created_at).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="ticket-messages">
                    {ticketMessages.map((msg) => (
                      <div key={msg.id} className={`ticket-message ${msg.sender_type === 'super_admin' ? 'ticket-message-support' : 'ticket-message-user'}`}>
                        <div className="ticket-message-header">
                          <strong>{msg.sender_type === 'super_admin' ? 'Support Team' : 'You'}</strong>
                          <span>{new Date(msg.created_at).toLocaleString()}</span>
                        </div>
                        <p className="ticket-message-body">{msg.message}</p>
                      </div>
                    ))}
                  </div>

                  {selectedTicket.status !== 'closed' && (
                    <div className="ticket-reply-area">
                      <textarea
                        value={ticketReply}
                        onChange={(e) => setTicketReply(e.target.value)}
                        placeholder="Type your reply..."
                        rows={3}
                      />
                      <button className="btn btn-primary" onClick={handleReplyToTicket} disabled={!ticketReply.trim()}>
                        Send Reply
                      </button>
                    </div>
                  )}
                </div>
              ) : supportTickets.length === 0 ? (
                <div className="card">
                  <div className="empty">
                    <p>No support tickets yet.</p>
                    <p style={{ fontSize: '14px', marginTop: '8px' }}>Click "+ New Ticket" to submit your first support request.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="card">
                    <div className="table-wrap support-table-desktop">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Subject</th>
                            <th>Status</th>
                            <th>Priority</th>
                            <th>Messages</th>
                            <th>Updated</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {supportTickets.map((t) => (
                            <tr key={t.id}>
                              <td><strong>{t.subject}</strong></td>
                              <td>
                                <span className={`ticket-status ticket-status-${t.status}`}>
                                  {t.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="ticket-priority">{t.priority}</td>
                              <td>{t.message_count}</td>
                              <td style={{ fontSize: '13px', color: '#666' }}>{fmtDate(t.updated_at)}</td>
                              <td>
                                <button className="btn-sm btn-edit" onClick={() => handleViewTicket(t.id)}>
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Mobile cards for tickets */}
                    <div className="support-mobile-cards">
                      {supportTickets.map((t) => (
                        <div key={t.id} className="admin-mobile-card">
                          <div className="admin-mobile-card-top">
                            <div>
                              <div className="admin-mobile-card-title">{t.subject}</div>
                              <div className="admin-mobile-card-sub">
                                {t.message_count} message{t.message_count !== 1 ? 's' : ''} · {fmtDate(t.updated_at)}
                              </div>
                            </div>
                            <span className={`ticket-status ticket-status-${t.status}`}>
                              {t.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="admin-mobile-card-actions">
                            <button className="btn btn-sm btn-secondary" onClick={() => handleViewTicket(t.id)}>View</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* ═══════ HELP TAB ═══════ */}
          {activeTab === 'help' && (() => {
            const toggleHelp = (key) => setHelpExpanded(prev => {
              const next = new Set(prev);
              next.has(key) ? next.delete(key) : next.add(key);
              return next;
            });
            const HelpSection = ({ sectionKey, title, items }) => (
              <div className="card" style={{ marginBottom: '12px' }}>
                <button onClick={() => toggleHelp(sectionKey)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: 600, textAlign: 'left' }}>
                  {title}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: helpExpanded.has(sectionKey) ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
                {helpExpanded.has(sectionKey) && (
                  <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {items.map((item, i) => (
                      <div key={i}>
                        <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{item.title}</div>
                        <div style={{ fontSize: '13px', color: 'var(--gray)', lineHeight: '1.5' }}>{item.content}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
            return (
              <>
                <div className="page-header">
                  <h2 className="page-title">Help</h2>
                </div>

                <HelpSection sectionKey="getting-started" title="Getting Started" items={[
                  { title: 'Create a session and semester', content: 'Go to Planner and click "New Session" to create an academic year (e.g. 2025/2026). Set your school days, then add semesters within that session. Sessions and semesters organise your attendance and exam records by time period.' },
                  { title: 'Create classes', content: 'Go to Classes and click "New Class". Give it a name (e.g. "Junior Boys", "Grade 3") and select which days it meets. Classes group your students and are used for attendance, exams, and reports.' },
                  { title: 'Add students', content: 'Go to Students and click "New Student". Fill in their details and assign them to a class. Each student gets a unique ID for tracking.' },
                  { title: 'Set expected fees', content: 'When adding or editing a student, set their expected fee amount. Fee progress is tracked automatically in the Fees tab.' },
                ]} />

                <HelpSection sectionKey="daily-ops" title="Daily Operations" items={[
                  { title: 'Take attendance', content: 'Go to the Attendance tab, select a class and date, then mark each student as present or absent. You can also grade dressing and behaviour if those features are enabled in Settings. Click "Save All" to record.' },
                  { title: 'Record exam scores', content: 'Go to Exam Recording, select a class, and click "Record Exam". Choose the exam type and subject, then enter scores for each student. Results are saved and available for review.' },
                  { title: 'Record a payment', content: 'In the Fees tab, click "Record Payment". Select the student, enter the amount, date, payment method, and an optional label (e.g. "March", "Term 1"). The student\'s balance updates automatically.' },
                  { title: 'Void a payment', content: 'In the Fees tab under "Recent Payments", click "Void" next to a payment to reverse it. The student\'s balance will be recalculated.' },
                ]} />

                <HelpSection sectionKey="planner" title="Academic Planner" items={[
                  { title: 'Sessions and semesters', content: 'Sessions represent academic years. Semesters are periods within a session (e.g. First Term, Second Term). Go to Planner to create, edit, or delete them. Only one session and one semester can be active at a time.' },
                  { title: 'School days', content: 'When creating a session, select which days of the week your madrasah operates. These determine when attendance is expected.' },
                ]} />

                <HelpSection sectionKey="students-classes" title="Students & Classes" items={[
                  { title: 'Edit or delete a student', content: 'Go to Students, find the student in the list, and click Edit or Delete. You can update their class, contact info, and expected fees.' },
                  { title: 'Manage classes', content: 'Go to Classes to create, edit, or delete classes. Each class has a name, optional description, and school days schedule.' },
                ]} />

                {madrasahProfile?.enable_fee_tracking && (
                  <HelpSection sectionKey="fees" title="Fees" items={[
                    { title: 'Set expected fees', content: 'Set a student\'s expected fee when creating or editing their profile. The Fees tab shows a summary with progress bars for each student.' },
                    { title: 'Track collection progress', content: 'The Fees tab shows summary cards (Total Expected, Collected, Outstanding) and a progress bar for each student. Filter by class to focus on specific groups.' },
                    { title: 'Payment methods', content: 'Record payments as Cash, Bank Transfer, Online, or Other. Add labels to categorise payments (e.g. monthly, termly, instalments).' },
                  ]} />
                )}

                <HelpSection sectionKey="settings" title="Settings" items={[
                  { title: 'Update madrasah profile', content: 'Go to Settings to update your madrasah name, contact info, address, and other details.' },
                  { title: 'Enable or disable features', content: 'In Settings, toggle features like Fee Tracking, Qur\'an Progress, Behaviour Grading, and Dressing Grading on or off based on your needs.' },
                  { title: 'Change your password', content: 'In Settings, scroll to the Account section to update your password. You\'ll need to enter your current password and the new one (minimum 8 characters with uppercase, lowercase, number, and symbol).' },
                ]} />
              </>
            );
          })()}

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
