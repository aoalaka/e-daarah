import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { authService } from '../../services/auth.service';
import api from '../../services/api';
import SortableTable from '../../components/SortableTable';
import EmailVerificationBanner from '../../components/EmailVerificationBanner';
import DemoBanner from '../../components/DemoBanner';
import TrialBanner from '../../components/TrialBanner';
import AnnouncementBanner from '../../components/AnnouncementBanner';
import UsageIndicator from '../../components/UsageIndicator';
import { handleApiError } from '../../utils/errorHandler';
import { downloadCSV, studentColumns, attendanceColumns, getAttendanceColumns, examColumns, getDateSuffix } from '../../utils/csvExport';
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
    parent_guardian_name: '', parent_guardian_relationship: '', 
    parent_guardian_phone: '', parent_guardian_phone_country_code: '+64', notes: ''
  });
  const [editingSession, setEditingSession] = useState(null);
  const [editingSemester, setEditingSemester] = useState(null);
  const [editingClass, setEditingClass] = useState(null);
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
  const [reportSubTab, setReportSubTab] = useState('insights');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsFilterClass, setAnalyticsFilterClass] = useState('');
  const [analyticsFilterGender, setAnalyticsFilterGender] = useState('');
  const [examKpis, setExamKpis] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [currentSubjectPage, setCurrentSubjectPage] = useState(1);
  const subjectsPerPage = 1; // Show one subject at a time
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [reportFilterSession, setReportFilterSession] = useState('');
  const [reportFilteredSemesters, setReportFilteredSemesters] = useState([]);
  const [reportFilterSemester, setReportFilterSemester] = useState('');
  const [reportFilterSubject, setReportFilterSubject] = useState('all');
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [reportAvailableSubjects, setReportAvailableSubjects] = useState([]);
  const [studentReports, setStudentReports] = useState([]);
  const [rankingSubTab, setRankingSubTab] = useState('exam'); // Sub-tab for rankings (exam, attendance, dressing, behavior, punctuality)
  const [attendanceRankings, setAttendanceRankings] = useState([]);
  const [dressingRankings, setDressingRankings] = useState([]);
  const [behaviorRankings, setBehaviorRankings] = useState([]);
  const [punctualityRankings, setPunctualityRankings] = useState([]);
  const [individualRankings, setIndividualRankings] = useState(null); // Madrasah-wide rankings for individual student
  // Teacher Activity state
  const [teacherPerformanceData, setTeacherPerformanceData] = useState(null);
  const [teacherPerformanceLoading, setTeacherPerformanceLoading] = useState(false);
  const [selectedTeacherForDetail, setSelectedTeacherForDetail] = useState(null);
  const [teacherDetailData, setTeacherDetailData] = useState(null);
  const [teacherDetailLoading, setTeacherDetailLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);
  // Access code state
  const [accessCodeModal, setAccessCodeModal] = useState(null); // { studentName, studentId, accessCode }
  // Settings state
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  // Billing state
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [selectedPlan, setSelectedPlan] = useState('plus');
  const [madrasahProfile, setMadrasahProfile] = useState(null);
  // Promotion / Rollover state
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
  // Support tickets state
  const [supportTickets, setSupportTickets] = useState([]);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: '', message: '', priority: 'normal' });
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  // Planner state
  const [plannerSubTab, setPlannerSubTab] = useState('sessions'); // sessions, detail
  const [plannerSelectedSession, setPlannerSelectedSession] = useState(null);
  const [plannerHolidays, setPlannerHolidays] = useState([]);
  const [plannerOverrides, setPlannerOverrides] = useState([]);
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [newHoliday, setNewHoliday] = useState({ title: '', start_date: '', end_date: '', description: '' });
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [editingOverride, setEditingOverride] = useState(null);
  const [newOverride, setNewOverride] = useState({ title: '', start_date: '', end_date: '', school_days: [] });
  const [ticketReply, setTicketReply] = useState('');
  const user = authService.getCurrentUser();
  const navigate = useNavigate();
  const { madrasahSlug } = useParams();

  // Close mobile menu when tab changes
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Helper to check if user has Plus-level access (Plus plan OR active trial)
  const hasPlusAccess = () => {
    if (!madrasahProfile) return false;
    const plan = madrasahProfile.pricing_plan;
    const status = madrasahProfile.subscription_status;
    // Plus and enterprise plans have access
    if (plan === 'plus' || plan === 'enterprise') return true;
    // Active trial users get Plus-level access
    if (status === 'trialing') {
      const trialEndsAt = madrasahProfile.trial_ends_at;
      if (!trialEndsAt) return true; // No end date means trial is active
      return new Date(trialEndsAt) > new Date();
    }
    return false;
  };

  // Helper to check if the account is in read-only mode (expired trial or inactive subscription)
  const isReadOnly = () => {
    if (!madrasahProfile) return false;
    const status = madrasahProfile.subscription_status;
    // Expired trial = read-only
    if (status === 'trialing') {
      const trialEndsAt = madrasahProfile.trial_ends_at;
      if (trialEndsAt && new Date(trialEndsAt) <= new Date()) return true;
    }
    // Canceled or expired subscription = read-only
    if (status === 'canceled' || status === 'expired') return true;
    return false;
  };

  const navItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'planner', label: 'Planner' },
    { id: 'classes', label: 'Classes' },
    { id: 'teachers', label: 'Teachers' },
    { id: 'students', label: 'Students' },
    { id: 'promotion', label: 'Promotion' },
    { id: 'reports', label: 'Reports' },
    { id: 'support', label: 'Support' }
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

  // Filter semesters for exam reports by selected session
  useEffect(() => {
    if (reportFilterSession) {
      const filtered = semesters.filter(sem => sem.session_id === parseInt(reportFilterSession));
      setReportFilteredSemesters(filtered);
      if (reportFilterSemester && !filtered.find(s => s.id === parseInt(reportFilterSemester))) {
        setReportFilterSemester('');
      }
    } else {
      setReportFilteredSemesters(semesters);
    }
  }, [reportFilterSession, semesters]);

  // Fetch student reports when exam reports filters change
  useEffect(() => {
    if (selectedClassForPerformance && reportSubTab === 'student-reports') {
      fetchStudentReports();
    }
  }, [selectedClassForPerformance, reportFilterSession, reportFilterSemester, reportFilterSubject, reportSubTab]);

  // Fetch rankings based on active ranking sub-tab
  useEffect(() => {
    if (selectedClassForPerformance && reportSubTab === 'student-reports') {
      if (rankingSubTab === 'exam') {
        fetchStudentReports();
      } else if (rankingSubTab === 'attendance') {
        fetchAttendanceRankings();
      } else if (rankingSubTab === 'dressing') {
        fetchDressingRankings();
      } else if (rankingSubTab === 'behavior') {
        fetchBehaviorRankings();
      } else if (rankingSubTab === 'punctuality') {
        fetchPunctualityRankings();
      }
    }
  }, [selectedClassForPerformance, reportFilterSession, reportFilterSemester, reportSubTab, rankingSubTab]);

  // Reset subject filter when class changes
  useEffect(() => {
    if (selectedClassForPerformance) {
      setSelectedSubject('all');
    }
  }, [selectedClassForPerformance]);

  // Fetch analytics when Reports tab is active and Insights is selected
  useEffect(() => {
    if (activeTab === 'reports' && reportSubTab === 'insights' && madrasahProfile) {
      fetchAnalytics();
    }
  }, [activeTab, reportSubTab, reportSemester, madrasahProfile]);

  // Fetch teacher performance when Teacher Activity sub-tab is selected
  useEffect(() => {
    if (activeTab === 'reports' && reportSubTab === 'teacher-performance' && madrasahProfile && hasPlusAccess()) {
      fetchTeacherPerformance();
    }
  }, [activeTab, reportSubTab, madrasahProfile]);

  // Fetch tickets when Support tab is active
  useEffect(() => {
    if (activeTab === 'support') {
      fetchTickets();
    }
  }, [activeTab]);

  // Re-fetch individual student report when filters or student changes
  useEffect(() => {
    if (reportSubTab === 'individual' && selectedStudentForReport?.id) {
      fetchStudentReport(selectedStudentForReport.id);
      fetchIndividualRankings(selectedStudentForReport.id);
    }
  }, [reportFilterSession, reportFilterSemester, selectedStudentForReport?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sessionsRes, semestersRes, classesRes, teachersRes, studentsRes, profileRes] = await Promise.all([
        api.get('/admin/sessions').catch(() => ({ data: [] })),
        api.get('/admin/semesters').catch(() => ({ data: [] })),
        api.get('/classes').catch(() => ({ data: [] })),
        api.get('/admin/teachers').catch(() => ({ data: [] })),
        api.get('/admin/students').catch(() => ({ data: [] })),
        api.get('/admin/profile').catch(() => ({ data: null }))
      ]);
      const sessionsData = sessionsRes.data || [];
      const semestersData = semestersRes.data || [];

      setSessions(sessionsData);
      setSemesters(semestersData);
      setClasses(classesRes.data || []);
      setTeachers(teachersRes.data || []);
      setStudents(studentsRes.data || []);
      setMadrasahProfile(profileRes.data);

      // Set default filters to active session and semester
      const activeSession = sessionsData.find(s => s.is_active);
      const activeSemester = semestersData.find(s => s.is_active);

      if (activeSession) {
        setReportFilterSession(String(activeSession.id));
      }
      if (activeSemester) {
        setReportSemester(String(activeSemester.id));
        setReportFilterSemester(String(activeSemester.id));
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleDeleteSession = async (id) => {
    if (isReadOnly()) { toast.error('Account is in read-only mode. Please subscribe to make changes.'); return; }
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

  const handleDeleteSemester = async (id) => {
    if (isReadOnly()) { toast.error('Account is in read-only mode. Please subscribe to make changes.'); return; }
    if (!confirm('Are you sure you want to delete this semester? This will also delete all associated attendance records.')) return;
    try {
      await api.delete(`/admin/semesters/${id}`);
      loadData();
    } catch (error) {
      toast.error('Failed to delete semester');
    }
  };

  // ============ PLANNER HANDLERS ============

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

  const handleDeleteHoliday = async (id) => {
    if (!confirm('Delete this holiday?')) return;
    try {
      await api.delete(`/admin/holidays/${id}`);
      setPlannerHolidays(prev => prev.filter(h => h.id !== id));
      toast.success('Holiday deleted');
    } catch (error) {
      toast.error('Failed to delete holiday');
    }
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

  const handleDeleteOverride = async (id) => {
    if (!confirm('Delete this schedule override?')) return;
    try {
      await api.delete(`/admin/schedule-overrides/${id}`);
      setPlannerOverrides(prev => prev.filter(o => o.id !== id));
      toast.success('Override deleted');
    } catch (error) {
      toast.error('Failed to delete override');
    }
  };

  const toggleSchoolDay = (day, arr, setter) => {
    if (arr.includes(day)) {
      setter(arr.filter(d => d !== day));
    } else {
      setter([...arr, day]);
    }
  };

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

  const handleDeleteClass = async (cls) => {
    if (isReadOnly()) { toast.error('Account is in read-only mode. Please subscribe to make changes.'); return; }
    if (!confirm(`Are you sure you want to delete "${cls.name}"? Students in this class will be unassigned.`)) {
      return;
    }
    try {
      await api.delete(`/admin/classes/${cls.id}`);
      toast.success('Class deleted successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to delete class');
    }
  };

  const toggleClassSchoolDay = (day) => {
    setNewClass(prev => ({
      ...prev,
      school_days: prev.school_days.includes(day)
        ? prev.school_days.filter(d => d !== day)
        : [...prev.school_days, day]
    }));
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
        await api.post('/admin/teachers', newTeacher);
        toast.success('Teacher created successfully');
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

  const handleDeleteTeacher = async (id) => {
    if (isReadOnly()) { toast.error('Account is in read-only mode. Please subscribe to make changes.'); return; }
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
    if (isReadOnly()) { toast.error('Account is in read-only mode. Please subscribe to make changes.'); return; }
    try {
      if (editingStudent) {
        await api.put(`/admin/students/${editingStudent.id}`, newStudent);
        setEditingStudent(null);
      } else {
        const response = await api.post('/admin/students', newStudent);
        // Show the generated access code to admin (Plus/Enterprise/Trial only)
        if (response.data.access_code && hasPlusAccess()) {
          setAccessCodeModal({
            studentName: `${newStudent.first_name} ${newStudent.last_name}`,
            studentId: response.data.student_id,
            accessCode: response.data.access_code
          });
        }
      }
      setShowStudentForm(false);
      setNewStudent({
        first_name: '', last_name: '', student_id: '', gender: '', class_id: '',
        student_phone: '', student_phone_country_code: '+64',
        street: '', city: '', state: '', country: '',
        parent_guardian_name: '', parent_guardian_relationship: '',
        parent_guardian_phone: '', parent_guardian_phone_country_code: '+64', notes: ''
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
      notes: student.notes || ''
    });
    setShowStudentForm(true);
  };

  const handleDeleteStudent = async (id) => {
    if (isReadOnly()) { toast.error('Account is in read-only mode. Please subscribe to make changes.'); return; }
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await api.delete(`/admin/students/${id}`);
        loadData();
      } catch (error) {
        toast.error('Failed to delete student');
      }
    }
  };

  const handleRegenerateAccessCode = async (student) => {
    if (isReadOnly()) { toast.error('Account is in read-only mode. Please subscribe to make changes.'); return; }
    if (window.confirm(`Regenerate parent access code for ${student.first_name} ${student.last_name}? The old code will stop working.`)) {
      try {
        const response = await api.post(`/admin/students/${student.id}/regenerate-access-code`);
        setAccessCodeModal({
          studentName: response.data.student_name,
          studentId: response.data.student_id,
          accessCode: response.data.access_code
        });
      } catch (error) {
        toast.error('Failed to regenerate access code');
      }
    }
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
      loadData();
      toast.success(`Upload complete: ${response.data.successful} successful, ${response.data.failed} failed`);
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

  const handleRemoveTeacher = async (teacherId) => {
    if (isReadOnly()) { toast.error('Account is in read-only mode. Please subscribe to make changes.'); return; }
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
      const params = {};
      if (reportFilterSession) {
        params.sessionId = reportFilterSession;
      }
      if (reportFilterSemester) {
        params.semesterId = reportFilterSemester;
      }
      
      console.log('fetchStudentReport params:', params, 'filters:', { reportFilterSession, reportFilterSemester });
      const response = await api.get(`/admin/students/${studentId}/report`, { params });
      console.log('fetchStudentReport response:', response.data);
      setStudentReport(response.data);
      setSelectedStudentForReport(students.find(s => s.id === studentId));
      // Fetch madrasah-wide rankings for the student
      fetchIndividualRankings(studentId);
    } catch (error) {
      toast.error('Failed to load student report');
    }
  };

  const updateStudentComment = async (studentId, comment) => {
    if (isReadOnly()) { toast.error('Account is in read-only mode. Please subscribe to make changes.'); return; }
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

  const fetchStudentReports = async () => {
    if (!selectedClassForPerformance) return;
    try {
      const params = {};
      
      if (reportFilterSession) {
        params.sessionId = reportFilterSession;
      }
      if (reportFilterSemester) {
        params.semesterId = reportFilterSemester;
      }
      if (reportFilterSubject && reportFilterSubject !== 'all') {
        params.subject = reportFilterSubject;
      }
      
      const classId = selectedClassForPerformance.id || selectedClassForPerformance;
      const response = await api.get(`/admin/classes/${classId}/student-reports`, { params });
      setStudentReports(response.data);
      
      // Extract unique subjects from the exam data
      const subjects = new Set();
      response.data.forEach(student => {
        if (student.subjects) {
          student.subjects.split(',').forEach(sub => subjects.add(sub.trim()));
        }
      });
      setReportAvailableSubjects(Array.from(subjects).sort());
    } catch (error) {
      console.error('Failed to fetch student reports:', error);
      setStudentReports([]);
      setReportAvailableSubjects([]);
    }
  };

  const fetchAttendanceRankings = async () => {
    if (!selectedClassForPerformance) return;
    try {
      const params = {};
      
      if (reportFilterSession) {
        params.sessionId = reportFilterSession;
      }
      if (reportFilterSemester) {
        params.semesterId = reportFilterSemester;
      }
      
      const classId = selectedClassForPerformance.id || selectedClassForPerformance;
      const response = await api.get(`/admin/classes/${classId}/attendance-rankings`, { params });
      setAttendanceRankings(response.data);
    } catch (error) {
      console.error('Failed to fetch attendance rankings:', error);
      setAttendanceRankings([]);
    }
  };

  const fetchDressingRankings = async () => {
    if (!selectedClassForPerformance) return;
    try {
      const params = {};
      
      if (reportFilterSession) {
        params.sessionId = reportFilterSession;
      }
      if (reportFilterSemester) {
        params.semesterId = reportFilterSemester;
      }
      
      const classId = selectedClassForPerformance.id || selectedClassForPerformance;
      const response = await api.get(`/admin/classes/${classId}/dressing-rankings`, { params });
      setDressingRankings(response.data);
    } catch (error) {
      console.error('Failed to fetch dressing rankings:', error);
      setDressingRankings([]);
    }
  };

  const fetchBehaviorRankings = async () => {
    if (!selectedClassForPerformance) return;
    try {
      const params = {};
      
      if (reportFilterSession) {
        params.sessionId = reportFilterSession;
      }
      if (reportFilterSemester) {
        params.semesterId = reportFilterSemester;
      }
      
      const classId = selectedClassForPerformance.id || selectedClassForPerformance;
      const response = await api.get(`/admin/classes/${classId}/behavior-rankings`, { params });
      setBehaviorRankings(response.data);
    } catch (error) {
      console.error('Failed to fetch behavior rankings:', error);
      setBehaviorRankings([]);
    }
  };

  const fetchPunctualityRankings = async () => {
    if (!selectedClassForPerformance) return;
    try {
      const params = {};
      
      if (reportFilterSession) {
        params.sessionId = reportFilterSession;
      }
      if (reportFilterSemester) {
        params.semesterId = reportFilterSemester;
      }
      
      const classId = selectedClassForPerformance.id || selectedClassForPerformance;
      const response = await api.get(`/admin/classes/${classId}/punctuality-rankings`, { params });
      setPunctualityRankings(response.data);
    } catch (error) {
      console.error('Failed to fetch punctuality rankings:', error);
      setPunctualityRankings([]);
    }
  };

  const fetchIndividualRankings = async (studentId) => {
    if (!studentId) return;
    try {
      const params = {};
      
      if (reportFilterSession) {
        params.sessionId = reportFilterSession;
      }
      if (reportFilterSemester) {
        params.semesterId = reportFilterSemester;
      }
      
      console.log('fetchIndividualRankings params:', params, 'filters:', { reportFilterSession, reportFilterSemester });
      const response = await api.get(`/admin/students/${studentId}/all-rankings`, { params });
      console.log('fetchIndividualRankings response:', response.data);
      setIndividualRankings(response.data);
    } catch (error) {
      console.error('Failed to fetch individual rankings:', error);
      setIndividualRankings(null);
    }
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

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const params = new URLSearchParams();
      if (reportSemester) params.append('semester_id', reportSemester);
      if (analyticsFilterClass) params.append('class_id', analyticsFilterClass);
      if (analyticsFilterGender) params.append('gender', analyticsFilterGender);

      const endpoint = `/admin/analytics${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await api.get(endpoint);
      setAnalyticsData(response.data);
    } catch (error) {
      console.error('Analytics error:', error);
      // Don't show error toast for Plus-only feature if user doesn't have access
      if (error.response?.data?.code !== 'UPGRADE_REQUIRED') {
        toast.error('Failed to load analytics');
      }
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchTeacherPerformance = async () => {
    setTeacherPerformanceLoading(true);
    try {
      const response = await api.get('/admin/teacher-performance');
      setTeacherPerformanceData(response.data);
    } catch (error) {
      console.error('Teacher performance error:', error);
      if (error.response?.data?.code !== 'UPGRADE_REQUIRED') {
        toast.error('Failed to load teacher performance data');
      }
    } finally {
      setTeacherPerformanceLoading(false);
    }
  };

  const fetchTeacherDetail = async (teacherId) => {
    setTeacherDetailLoading(true);
    try {
      const response = await api.get(`/admin/teacher-performance/${teacherId}`);
      setTeacherDetailData(response.data);
    } catch (error) {
      console.error('Teacher detail error:', error);
      toast.error('Failed to load teacher details');
    } finally {
      setTeacherDetailLoading(false);
    }
  };

  const handleLogout = () => {
    const user = authService.getCurrentUser();
    const isDemo = user?.isDemo;
    authService.logout();
    navigate(isDemo ? '/demo' : `/${madrasahSlug}/login`);
  };

  // Close profile dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Support ticket functions
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

  const getNavIcon = (id) => {
    const iconProps = {
      width: "18",
      height: "18",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      style: { minWidth: '18px' }
    };

    switch(id) {
      case 'overview':
        return <svg {...iconProps}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>;
      case 'planner':
        return <svg {...iconProps}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><line x1="8" y1="14" x2="8" y2="14.01"></line><line x1="12" y1="14" x2="12" y2="14.01"></line><line x1="16" y1="14" x2="16" y2="14.01"></line><line x1="8" y1="18" x2="8" y2="18.01"></line><line x1="12" y1="18" x2="12" y2="18.01"></line></svg>;
      case 'classes':
        return <svg {...iconProps}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>;
      case 'teachers':
        return <svg {...iconProps}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
      case 'students':
        return <svg {...iconProps}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
      case 'promotion':
        return <svg {...iconProps}><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>;
      case 'reports':
        return <svg {...iconProps}><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line></svg>;
      case 'support':
        return <svg {...iconProps}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>;
      default:
        return null;
    }
  };

  return (
    <div className="dashboard">
      {/* Mobile Sidebar Overlay */}
      <div
        className={`sidebar-overlay ${mobileMenuOpen ? 'visible' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Sidebar - Dark Theme */}
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <img src="/e-daarah-blackbg-logo.png" alt="e-daarah" className="sidebar-logo-img" />
          <span className="sidebar-logo-text">e-daarah</span>
          <button 
            className="sidebar-collapse-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label="Toggle sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points={sidebarCollapsed ? "9 18 15 12 9 6" : "15 18 9 12 15 6"}></polyline>
            </svg>
          </button>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => handleTabChange(item.id)}
            >
              {getNavIcon(item.id)}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer" ref={profileDropdownRef}>
          <div className="sidebar-user" onClick={() => setProfileDropdownOpen(!profileDropdownOpen)} style={{ cursor: 'pointer' }}>
            <div className="user-avatar">
              {user?.firstName?.charAt(0) || 'A'}
            </div>
            <div className="user-info">
              <div className="user-name">{user?.firstName} {user?.lastName}</div>
              <div className="user-role">{user?.role || 'Admin'}</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, transform: profileDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
          </div>
          {profileDropdownOpen && (
            <div className="profile-dropdown">
              <div className="profile-dropdown-header">
                <div className="user-avatar" style={{ width: 36, height: 36, minWidth: 36, fontSize: 14 }}>
                  {user?.firstName?.charAt(0) || 'A'}
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{user?.firstName} {user?.lastName}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{user?.email}</div>
                </div>
              </div>
              <div className="profile-dropdown-divider" />
              <button className="profile-dropdown-item" onClick={() => { handleTabChange('settings'); setProfileDropdownOpen(false); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                Account
              </button>
              <button className="profile-dropdown-item" onClick={() => { handleTabChange('settings'); setProfileDropdownOpen(false); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0110 0v4"></path></svg>
                Change Password
              </button>
              <button className="profile-dropdown-item" onClick={() => { handleTabChange('settings'); setProfileDropdownOpen(false); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"></path></svg>
                Settings
              </button>
              <button className="profile-dropdown-item" onClick={() => { handleTabChange('settings'); setProfileDropdownOpen(false); }}>
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
            <span className="header-title">{madrasahProfile?.name || 'Dashboard'}</span>
          </div>
          <div className="header-actions">
          </div>
        </header>

        {/* Email Verification Banner */}
        <EmailVerificationBanner />

        {/* Demo Banner */}
        <DemoBanner />

        {/* Trial Banner */}
        <TrialBanner
          trialEndsAt={madrasahProfile?.trial_ends_at}
          subscriptionStatus={madrasahProfile?.subscription_status}
          pricingPlan={madrasahProfile?.pricing_plan}
        />

        {/* Platform Announcements */}
        <AnnouncementBanner />

        {/* Read-Only Warning Banner */}
        {isReadOnly() && (
          <div style={{
            background: '#f5f5f5', color: '#525252', padding: '12px 20px',
            borderBottom: '1px solid #e5e5e5', textAlign: 'center', fontWeight: 500, fontSize: '14px'
          }}>
            ⚠️ Your {madrasahProfile?.subscription_status === 'trialing' ? 'trial has expired' : 'subscription is inactive'}. 
            Your account is in read-only mode. Please subscribe or renew to make changes.
          </div>
        )}

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
                  <UsageIndicator type="classes" current={classes.length} plan={madrasahProfile?.pricing_plan} />
                </div>
                <div className="stat-card">
                  <div className="stat-value">{teachers.length}</div>
                  <div className="stat-label">Teachers</div>
                  <UsageIndicator type="teachers" current={teachers.length} plan={madrasahProfile?.pricing_plan} />
                </div>
                <div className="stat-card">
                  <div className="stat-value">{students.length}</div>
                  <div className="stat-label">Students</div>
                  <UsageIndicator type="students" current={students.length} plan={madrasahProfile?.pricing_plan} />
                </div>
              </div>

              <h3 className="section-title">Quick Actions</h3>
              <div className="quick-grid">
                <div className={`quick-card ${isReadOnly() ? 'disabled' : ''}`} onClick={() => { if (!isReadOnly()) { setActiveTab('sessions'); setShowSessionForm(true); } }}>
                  <h4>New Session</h4>
                  <p>Create a new academic year</p>
                </div>
                <div className={`quick-card ${isReadOnly() ? 'disabled' : ''}`} onClick={() => { if (!isReadOnly()) { setActiveTab('semesters'); setShowSemesterForm(true); } }}>
                  <h4>New Semester</h4>
                  <p>Create a new semester</p>
                </div>
                <div className={`quick-card ${isReadOnly() ? 'disabled' : ''}`} onClick={() => { if (!isReadOnly()) { setActiveTab('classes'); setShowClassForm(true); } }}>
                  <h4>New Class</h4>
                  <p>Add a new class group</p>
                </div>
                <div className={`quick-card ${isReadOnly() ? 'disabled' : ''}`} onClick={() => { if (!isReadOnly()) { setActiveTab('students'); setShowStudentForm(true); } }}>
                  <h4>New Student</h4>
                  <p>Enroll a new student</p>
                </div>
              </div>
            </>
          )}

          {/* Planner Tab */}
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
                    <div className="card"><div className="empty"><p>No sessions yet. Create one to get started.</p></div></div>
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
                                  {new Date(session.start_date).toLocaleDateString()} – {new Date(session.end_date).toLocaleDateString()}
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
                        {new Date(plannerSelectedSession.start_date).toLocaleDateString()} – {new Date(plannerSelectedSession.end_date).toLocaleDateString()}
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
                      <button onClick={() => {
                        setEditingSemester(null);
                        setNewSemester({ session_id: plannerSelectedSession.id, name: '', start_date: '', end_date: '', is_active: false });
                        setShowSemesterForm(!showSemesterForm);
                      }} className="btn btn-sm btn-primary" disabled={isReadOnly()}>+ Add</button>
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
                                  <td>{new Date(semester.start_date).toLocaleDateString()}</td>
                                  <td>{new Date(semester.end_date).toLocaleDateString()}</td>
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
                      )}
                    </div>
                  </div>

                  {/* Holidays Section */}
                  <div className="card" style={{ marginBottom: 'var(--md)' }}>
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Holidays & Closures</span>
                      <button onClick={() => {
                        setEditingHoliday(null);
                        setNewHoliday({ title: '', start_date: '', end_date: '', description: '' });
                        setShowHolidayForm(!showHolidayForm);
                      }} className="btn btn-sm btn-primary" disabled={isReadOnly()}>+ Add</button>
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
                        <div className="table-wrap">
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
                                  <td>{new Date(h.start_date).toLocaleDateString()}</td>
                                  <td>{new Date(h.end_date).toLocaleDateString()}</td>
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
                      )}
                    </div>
                  </div>

                  {/* Schedule Overrides Section */}
                  <div className="card">
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Schedule Overrides</span>
                      <button onClick={() => {
                        setEditingOverride(null);
                        setNewOverride({ title: '', start_date: '', end_date: '', school_days: [] });
                        setShowOverrideForm(!showOverrideForm);
                      }} className="btn btn-sm btn-primary" disabled={isReadOnly()}>+ Add</button>
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
                        <div className="table-wrap">
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
                                    <td style={{ fontSize: '13px' }}>{new Date(o.start_date).toLocaleDateString()} – {new Date(o.end_date).toLocaleDateString()}</td>
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
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* Classes Tab */}
          {activeTab === 'classes' && (
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
                              <p>No classes yet. Create one to get started.</p>
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
                    <div className="empty"><p>No classes yet. Create one to get started.</p></div>
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
                }} className="btn btn-primary" disabled={isReadOnly()}>
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
                <div style={{ display: 'flex', gap: 'var(--sm)', flexWrap: 'wrap' }}>
                  {hasPlusAccess() && (
                    <button
                      onClick={() => downloadCSV(students, studentColumns, `students-${getDateSuffix()}`)}
                      className="btn btn-secondary"
                      disabled={students.length === 0}
                    >
                      Export CSV
                    </button>
                  )}
                  {hasPlusAccess() && (
                    <button onClick={() => {
                      setShowBulkUpload(!showBulkUpload);
                      setShowStudentForm(false);
                      setUploadResults(null);
                    }} className="btn btn-secondary">
                      Bulk Upload
                    </button>
                  )}
                  <button onClick={() => {
                    setEditingStudent(null);
                    setNewStudent({
                      first_name: '', last_name: '', student_id: '', gender: '', class_id: '',
                      parent_guardian_name: '', parent_guardian_relationship: '', parent_guardian_phone: '', notes: ''
                    });
                    setShowStudentForm(!showStudentForm);
                    setShowBulkUpload(false);
                  }} className="btn btn-primary" disabled={isReadOnly()}>
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
                        Optional: email, phone, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone, notes
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
                          <details open>
                            <summary>Successful Uploads ({uploadResults.results.success.length})</summary>
                            <p style={{ fontSize: '0.85em', color: '#0a0a0a', margin: '8px 0' }}>
                              ⚠️ Save these access codes now — they cannot be retrieved later.
                            </p>
                            <ul>
                              {uploadResults.results.success.map((s, i) => (
                                <li key={i}>{s.name} — ID: {s.student_id} — Access Code: <strong>{s.access_code}</strong></li>
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
                            <button onClick={() => handleRegenerateAccessCode(row)} className="btn btn-sm btn-secondary" title="Regenerate parent access code">
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
                  data={students}
                  searchable={true}
                  searchPlaceholder="Search by name, student ID, or class..."
                  searchKeys={['student_id', 'first_name', 'last_name', 'class_name', 'parent_guardian_name']}
                  pagination={true}
                  pageSize={25}
                  emptyMessage="No students yet. Create one to get started."
                />
              </div>
            </>
          )}

          {/* Promotion / Rollover Tab */}
          {activeTab === 'promotion' && (
            <>
              <div className="page-header">
                <h2 className="page-title">Student Promotion / Rollover</h2>
              </div>

              {/* Sub-tabs */}
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
                          </select>
                        </div>

                        {promotionType !== 'graduated' && (
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
                          disabled={promotionType !== 'graduated' && !promotionDestClass}
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
                    const destName = promotionType === 'graduated'
                      ? 'Graduated (removed)'
                      : classes.find(c => String(c.id) === String(promotionDestClass))?.name || '—';
                    const actionLabel = { promoted: 'Promote', transferred: 'Transfer', repeated: 'Repeat', graduated: 'Graduate' }[promotionType];

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

                        {promotionType === 'graduated' && (
                          <p style={{ color: '#d97706', fontSize: '13px', marginBottom: '16px' }}>
                            ⚠️ Graduating students will remove them from their class. They will appear as &quot;Unassigned&quot; and can be re-assigned later.
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
                                    to_class_id: promotionType === 'graduated' ? null : Number(promotionDestClass),
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
                              <td style={{ whiteSpace: 'nowrap' }}>{new Date(h.created_at).toLocaleDateString()}</td>
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

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <>
              <div className="page-header no-print">
                <h2 className="page-title">Reports & Analytics</h2>
              </div>

              {/* Report Sub-Tabs */}
              <div className="report-tabs no-print">
                <nav className="report-tabs-nav">
                  <button
                    onClick={() => setReportSubTab('insights')}
                    className={`report-tab-btn ${reportSubTab === 'insights' ? 'active' : ''}`}
                  >
                    Quick Insights
                  </button>
                  {hasPlusAccess() && (
                    <>
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
                        Exam Records
                      </button>
                      <button
                        onClick={() => setReportSubTab('student-reports')}
                        className={`report-tab-btn ${reportSubTab === 'student-reports' ? 'active' : ''}`}
                      >
                        Student Rankings
                      </button>
                      <button
                        onClick={() => setReportSubTab('individual')}
                        className={`report-tab-btn ${reportSubTab === 'individual' ? 'active' : ''}`}
                      >
                        Individual Student
                      </button>
                      <button
                        onClick={() => {
                          setReportSubTab('teacher-performance');
                          setSelectedTeacherForDetail(null);
                          setTeacherDetailData(null);
                        }}
                        className={`report-tab-btn ${reportSubTab === 'teacher-performance' ? 'active' : ''}`}
                      >
                        Teacher Activity
                      </button>
                    </>
                  )}
                </nav>
              </div>

              {/* Filters */}
              <div className="card no-print">
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
                        value={reportSubTab === 'student-reports' || reportSubTab === 'individual' ? reportFilterSemester : reportSemester}
                        onChange={(e) => {
                          if (reportSubTab === 'student-reports' || reportSubTab === 'individual') {
                            setReportFilterSemester(e.target.value);
                          } else {
                            setReportSemester(e.target.value);
                          }
                        }}
                      >
                        <option value="">All Semesters</option>
                        {reportFilteredSemesters.map(sem => (
                          <option key={sem.id} value={sem.id}>
                            {sem.name} {sem.is_active ? '(Active)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    {(reportSubTab === 'attendance' || reportSubTab === 'exams' || reportSubTab === 'student-reports') && (
                      <div className="form-group">
                        <label className="form-label">Select Class</label>
                        <select
                          className="form-select"
                          value={selectedClassForPerformance?.id || ''}
                          onChange={(e) => {
                            const cls = classes.find(c => c.id === parseInt(e.target.value));
                            setSelectedClassForPerformance(cls);
                            if (cls) {
                              if (reportSubTab !== 'student-reports') {
                                fetchClassKpis(cls.id);
                                fetchClassAttendance(cls.id);
                                fetchClassExams(cls.id);
                              }
                              // student-reports will be fetched by useEffect when selectedClassForPerformance changes
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
                    {reportSubTab === 'student-reports' && selectedClassForPerformance && (
                      <div className="form-group">
                        <label className="form-label">Filter by Subject</label>
                        <select
                          className="form-select"
                          value={reportFilterSubject}
                          onChange={(e) => setReportFilterSubject(e.target.value)}
                        >
                          <option value="all">All Subjects</option>
                          {reportAvailableSubjects.map(subject => (
                            <option key={subject} value={subject}>{subject}</option>
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
                      <>
                        <div className="form-group">
                          <label className="form-label">Filter by Class</label>
                          <select
                            className="form-select"
                            value={selectedClassForPerformance?.id || ''}
                            onChange={(e) => {
                              const cls = classes.find(c => c.id === parseInt(e.target.value));
                              setSelectedClassForPerformance(cls);
                              setSelectedStudentForReport(null);
                              setStudentReport(null);
                            }}
                          >
                            <option value="">All Classes</option>
                            {classes.map(cls => (
                              <option key={cls.id} value={cls.id}>{cls.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Select Student</label>
                          <select
                            className="form-select"
                            value={selectedStudentForReport?.id || ''}
                            onChange={(e) => {
                              const studentId = parseInt(e.target.value);
                              if (studentId) fetchStudentReport(studentId);
                            }}
                          >
                            <option value="">-- Select a student --</option>
                            {(selectedClassForPerformance 
                              ? students.filter(s => s.class_id === selectedClassForPerformance.id)
                              : students
                            ).map(student => (
                              <option key={student.id} value={student.id}>
                                {student.first_name} {student.last_name} ({student.student_id})
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Insights Tab - Simple Overview */}
              {reportSubTab === 'insights' && (
                <>
                  {analyticsLoading ? (
                    <div className="card">
                      <div className="card-body" style={{ textAlign: 'center', padding: 'var(--xl)' }}>
                        <p>Loading insights...</p>
                      </div>
                    </div>
                  ) : analyticsData ? (
                    <>
                      {/* Quick Summary - 4 Key Metrics */}
                      <div className="insights-summary">
                        <div className={`summary-card ${analyticsData.summary.attendanceStatus}`}>
                          <div className="summary-value">{analyticsData.summary.overallAttendanceRate || 0}%</div>
                          <div className="summary-label">Attendance</div>
                          <div className="summary-status">{analyticsData.summary.attendanceLabel}</div>
                        </div>

                        <div className={`summary-card ${analyticsData.summary.studentsWithExams > 0 ? analyticsData.summary.examStatus : 'neutral'}`}>
                          <div className="summary-value">
                            {analyticsData.summary.studentsWithExams > 0 ? `${analyticsData.summary.avgExamPercentage || 0}%` : '-'}
                          </div>
                          <div className="summary-label">Exam Average</div>
                          <div className="summary-status">
                            {analyticsData.summary.studentsWithExams > 0 ? analyticsData.summary.examLabel : 'No exams yet'}
                          </div>
                        </div>

                        <div className={`summary-card ${analyticsData.summary.studentsNeedingAttention > 0 ? 'needs-attention' : 'good'}`}>
                          <div className="summary-value">{analyticsData.summary.studentsNeedingAttention}</div>
                          <div className="summary-label">Need Attention</div>
                          <div className="summary-status">Below 70% attendance</div>
                        </div>

                        <div className={`summary-card ${analyticsData.summary.studentsStruggling > 0 ? 'needs-attention' : 'good'}`}>
                          <div className="summary-value">{analyticsData.summary.studentsStruggling || 0}</div>
                          <div className="summary-label">Struggling</div>
                          <div className="summary-status">Below 50% exam avg</div>
                        </div>
                      </div>

                      {/* Additional Insights Grid */}
                      <div className="insights-widgets">
                        {/* Getting Started Progress */}
                        {analyticsData.gettingStarted && analyticsData.gettingStarted.totalClasses > 0 && (
                          <div className="insight-widget">
                            <h4>Getting Started</h4>
                            <div className="progress-bar-container">
                              <div className="progress-stat">
                                <span className="stat-label">Classes with students</span>
                                <span className="stat-value">
                                  {analyticsData.gettingStarted.classesWithStudents} / {analyticsData.gettingStarted.totalClasses}
                                </span>
                              </div>
                              <div className="progress-bar">
                                <div
                                  className="progress-fill"
                                  style={{ width: `${(analyticsData.gettingStarted.classesWithStudents / analyticsData.gettingStarted.totalClasses * 100)}%` }}
                                ></div>
                              </div>
                            </div>
                            <div className="progress-bar-container" style={{ marginTop: 'var(--sm)' }}>
                              <div className="progress-stat">
                                <span className="stat-label">Classes taking attendance</span>
                                <span className="stat-value">
                                  {analyticsData.gettingStarted.classesWithAttendance} / {analyticsData.gettingStarted.totalClasses}
                                </span>
                              </div>
                              <div className="progress-bar">
                                <div
                                  className="progress-fill"
                                  style={{ width: `${(analyticsData.gettingStarted.classesWithAttendance / analyticsData.gettingStarted.totalClasses * 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* This Week Summary */}
                        {analyticsData.thisWeekSummary && (analyticsData.thisWeekSummary.presentCount > 0 || analyticsData.thisWeekSummary.absentCount > 0) && (
                          <div className="insight-widget">
                            <h4>This Week</h4>
                            <div className="week-stats">
                              <div className="week-stat">
                                <div className="week-stat-value" style={{ color: '#404040' }}>
                                  {analyticsData.thisWeekSummary.presentCount}
                                </div>
                                <div className="week-stat-label">Students attended</div>
                              </div>
                              <div className="week-stat">
                                <div className="week-stat-value" style={{ color: '#0a0a0a' }}>
                                  {analyticsData.thisWeekSummary.absentCount}
                                </div>
                                <div className="week-stat-label">Students absent</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Attendance Streak */}
                        {analyticsData.attendanceStreaks && analyticsData.attendanceStreaks.length > 0 && (
                          <div className="insight-widget">
                            <h4>Attendance Streak</h4>
                            {analyticsData.attendanceStreaks.slice(0, 1).map(streak => (
                              <div key={streak.id} className="streak-highlight">
                                <div className="streak-class">{streak.class_name}</div>
                                <div className="streak-info">
                                  100% attendance for <strong>{streak.streak_weeks} week{streak.streak_weeks !== 1 ? 's' : ''}</strong>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Top Performer */}
                        {analyticsData.topPerformer && (
                          <div className="insight-widget">
                            <h4>Top Performer</h4>
                            <div className="top-performer">
                              <div className="performer-name">
                                {analyticsData.topPerformer.first_name} {analyticsData.topPerformer.last_name}
                              </div>
                              <div className="performer-score">{analyticsData.topPerformer.percentage}%</div>
                              <div className="performer-detail">
                                {analyticsData.topPerformer.subject}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Quick Actions */}
                        {analyticsData.quickActions && (
                          <div className="insight-widget">
                            <h4>Quick Actions</h4>
                            <div className="quick-actions-list">
                              {!analyticsData.quickActions.attendanceMarkedToday && (
                                <div className="action-item">
                                  <span className="action-icon">⚠️</span>
                                  <span>No attendance marked today</span>
                                </div>
                              )}
                              {analyticsData.quickActions.classesWithoutExams > 0 && (
                                <div className="action-item">
                                  <span className="action-icon">📝</span>
                                  <span>
                                    Awaiting exams recording for {analyticsData.quickActions.classesWithoutExams} class{analyticsData.quickActions.classesWithoutExams !== 1 ? 'es' : ''} in {analyticsData.quickActions.activeSemesterName}
                                  </span>
                                </div>
                              )}
                              {analyticsData.quickActions.attendanceMarkedToday && analyticsData.quickActions.classesWithoutExams === 0 && (
                                <div className="action-item all-good">
                                  <span className="action-icon">✓</span>
                                  <span>All caught up!</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Month-over-Month */}
                        {analyticsData.monthOverMonth && analyticsData.monthOverMonth.lastRate > 0 && (
                          <div className="insight-widget">
                            <h4>Month Comparison</h4>
                            <div className="month-comparison">
                              <div className="comparison-value">
                                {analyticsData.monthOverMonth.change > 0 ? '+' : ''}{analyticsData.monthOverMonth.change.toFixed(1)}%
                              </div>
                              <div className={`comparison-label ${analyticsData.monthOverMonth.change >= 0 ? 'positive' : 'negative'}`}>
                                {analyticsData.monthOverMonth.change >= 0 ? 'Improved' : 'Decreased'} from last month
                              </div>
                              <div className="comparison-detail">
                                {analyticsData.monthOverMonth.lastRate}% → {analyticsData.monthOverMonth.currentRate}%
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Alerts Section - Only show if there are alerts */}
                      {((analyticsData.classesWithoutRecentAttendance && analyticsData.classesWithoutRecentAttendance.length > 0) ||
                        (analyticsData.frequentAbsences && analyticsData.frequentAbsences.length > 0)) && (
                        <div className="insights-alerts">
                          {/* Classes Not Taking Attendance */}
                          {analyticsData.classesWithoutRecentAttendance && analyticsData.classesWithoutRecentAttendance.length > 0 && (
                            <div className="alert-box danger">
                              <h4>Classes Without Recent Attendance</h4>
                              <div className="alert-list">
                                {analyticsData.classesWithoutRecentAttendance.slice(0, 3).map(cls => (
                                  <div key={cls.id} className="alert-item">
                                    <strong>{cls.class_name}</strong>
                                    <span className="alert-badge" style={{ background: '#f5f5f5', color: '#525252' }}>
                                      {cls.last_attendance_date
                                        ? (cls.weeks_missed === 1 ? '1 week' : `${cls.weeks_missed} weeks`)
                                        : 'Never'}
                                    </span>
                                  </div>
                                ))}
                                {analyticsData.classesWithoutRecentAttendance.length > 3 && (
                                  <div className="alert-more">+{analyticsData.classesWithoutRecentAttendance.length - 3} more</div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Frequent Absences */}
                          {analyticsData.frequentAbsences && analyticsData.frequentAbsences.length > 0 && (
                            <div className="alert-box warning">
                              <h4>Frequent Absences This Month</h4>
                              <div className="alert-list">
                                {analyticsData.frequentAbsences.slice(0, 3).map(student => (
                                  <div key={student.id} className="alert-item">
                                    <strong>{student.first_name} {student.last_name}</strong>
                                    <span className="alert-badge">{student.absence_count} absences</span>
                                  </div>
                                ))}
                                {analyticsData.frequentAbsences.length > 3 && (
                                  <div className="alert-more">+{analyticsData.frequentAbsences.length - 3} more</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* No Data State */}
                      {analyticsData.summary.overallAttendanceRate === 0 && analyticsData.summary.studentsWithExams === 0 && (
                        <div className="card" style={{ marginTop: 'var(--md)' }}>
                          <div className="empty">
                            <p>No data yet. Start recording attendance and exams to see insights.</p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="card">
                      <div className="empty">
                        <p>Unable to load insights. Please try again.</p>
                      </div>
                    </div>
                  )}
                </>
              )}

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
                          {classKpis.classStats?.attendance_rate != null && !isNaN(classKpis.classStats.attendance_rate) && (
                            <div className="kpi-insight">
                              {Number(classKpis.classStats.attendance_rate) >= 90 
                                ? 'Excellent attendance! Class is consistently present.'
                                : Number(classKpis.classStats.attendance_rate) >= 80
                                ? 'Good attendance overall. Keep up the momentum.'
                                : Number(classKpis.classStats.attendance_rate) >= 70
                                ? 'Attendance needs attention. Consider follow-ups.'
                                : 'Low attendance rate. Urgent intervention needed.'}
                            </div>
                          )}
                        </div>
                        {(madrasahProfile?.enable_dressing_grade !== 0 && madrasahProfile?.enable_dressing_grade !== false) && (
                        <div className="kpi-card green">
                          <div className="kpi-label">Avg Dressing</div>
                          <div className="kpi-value">
                            {(classKpis.classStats?.avg_dressing_score != null && !isNaN(classKpis.classStats.avg_dressing_score))
                              ? Number(classKpis.classStats.avg_dressing_score).toFixed(2)
                              : 'N/A'}
                          </div>
                          <div className="kpi-sub">out of 4.0</div>
                          {classKpis.classStats?.avg_dressing_score != null && !isNaN(classKpis.classStats.avg_dressing_score) && (
                            <div className="kpi-insight">
                              {Number(classKpis.classStats.avg_dressing_score) >= 3.5
                                ? 'Outstanding! Students are well-dressed.'
                                : Number(classKpis.classStats.avg_dressing_score) >= 3.0
                                ? 'Good presentation. Minor improvements possible.'
                                : Number(classKpis.classStats.avg_dressing_score) >= 2.5
                                ? 'Dressing standards need reinforcement.'
                                : 'Dressing requires significant attention.'}
                            </div>
                          )}
                        </div>
                        )}
                        {(madrasahProfile?.enable_behavior_grade !== 0 && madrasahProfile?.enable_behavior_grade !== false) && (
                        <div className="kpi-card yellow">
                          <div className="kpi-label">Avg Behavior</div>
                          <div className="kpi-value">
                            {(classKpis.classStats?.avg_behavior_score != null && !isNaN(classKpis.classStats.avg_behavior_score))
                              ? Number(classKpis.classStats.avg_behavior_score).toFixed(2)
                              : 'N/A'}
                          </div>
                          <div className="kpi-sub">out of 4.0</div>
                          {classKpis.classStats?.avg_behavior_score != null && !isNaN(classKpis.classStats.avg_behavior_score) && (
                            <div className="kpi-insight">
                              {Number(classKpis.classStats.avg_behavior_score) >= 3.5
                                ? 'Excellent behavior! Class is well-disciplined.'
                                : Number(classKpis.classStats.avg_behavior_score) >= 3.0
                                ? 'Good behavior overall. Maintain standards.'
                                : Number(classKpis.classStats.avg_behavior_score) >= 2.5
                                ? 'Behavior needs improvement. Guidance recommended.'
                                : 'Behavior requires immediate attention.'}
                            </div>
                          )}
                        </div>
                        )}
                        {(madrasahProfile?.enable_punctuality_grade !== 0 && madrasahProfile?.enable_punctuality_grade !== false) && (
                        <div className="kpi-card purple">
                          <div className="kpi-label">Avg Punctuality</div>
                          <div className="kpi-value">
                            {(classKpis.classStats?.avg_punctuality_score != null && !isNaN(classKpis.classStats.avg_punctuality_score))
                              ? Number(classKpis.classStats.avg_punctuality_score).toFixed(2)
                              : 'N/A'}
                          </div>
                          <div className="kpi-sub">out of 4.0</div>
                          {classKpis.classStats?.avg_punctuality_score != null && !isNaN(classKpis.classStats.avg_punctuality_score) && (
                            <div className="kpi-insight">
                              {Number(classKpis.classStats.avg_punctuality_score) >= 3.5
                                ? 'Excellent punctuality! Students arrive on time.'
                                : Number(classKpis.classStats.avg_punctuality_score) >= 3.0
                                ? 'Good punctuality overall. Keep it up.'
                                : Number(classKpis.classStats.avg_punctuality_score) >= 2.5
                                ? 'Punctuality needs improvement. Encourage timeliness.'
                                : 'Punctuality requires immediate attention.'}
                            </div>
                          )}
                        </div>
                        )}
                      </div>

                      {/* High Risk Students (Attendance) */}
                      {classKpis.highRiskStudents && classKpis.highRiskStudents.filter(s =>
                        s.attendance_rate < 70 || ((madrasahProfile?.enable_dressing_grade !== 0 && madrasahProfile?.enable_dressing_grade !== false) && s.avg_dressing < 2.5) || ((madrasahProfile?.enable_behavior_grade !== 0 && madrasahProfile?.enable_behavior_grade !== false) && s.avg_behavior < 2.5) || ((madrasahProfile?.enable_punctuality_grade !== 0 && madrasahProfile?.enable_punctuality_grade !== false) && s.avg_punctuality < 2.5)
                      ).length > 0 && (
                        <div className="alert-box danger">
                          <h4>At-Risk Students</h4>
                          <p>Students with attendance below 70%{(madrasahProfile?.enable_dressing_grade !== 0 && madrasahProfile?.enable_dressing_grade !== false) || (madrasahProfile?.enable_behavior_grade !== 0 && madrasahProfile?.enable_behavior_grade !== false) || (madrasahProfile?.enable_punctuality_grade !== 0 && madrasahProfile?.enable_punctuality_grade !== false) ? ' or grades below 2.5/4.0' : ''}</p>
                          <div className="table-wrap">
                            <table className="table">
                              <thead>
                                <tr>
                                  <th>Student ID</th>
                                  <th>Name</th>
                                  <th>Attendance</th>
                                  {(madrasahProfile?.enable_dressing_grade !== 0 && madrasahProfile?.enable_dressing_grade !== false) && <th>Dressing</th>}
                                  {(madrasahProfile?.enable_behavior_grade !== 0 && madrasahProfile?.enable_behavior_grade !== false) && <th>Behavior</th>}
                                  {(madrasahProfile?.enable_punctuality_grade !== 0 && madrasahProfile?.enable_punctuality_grade !== false) && <th>Punctuality</th>}
                                  <th>Areas Needing Attention</th>
                                </tr>
                              </thead>
                              <tbody>
                                {classKpis.highRiskStudents
                                  .filter(s => s.attendance_rate < 70 || ((madrasahProfile?.enable_dressing_grade !== 0 && madrasahProfile?.enable_dressing_grade !== false) && s.avg_dressing < 2.5) || ((madrasahProfile?.enable_behavior_grade !== 0 && madrasahProfile?.enable_behavior_grade !== false) && s.avg_behavior < 2.5) || ((madrasahProfile?.enable_punctuality_grade !== 0 && madrasahProfile?.enable_punctuality_grade !== false) && s.avg_punctuality < 2.5))
                                  .map(student => {
                                    const areasNeedingAttention = [];
                                    if (student.attendance_rate != null && student.attendance_rate < 70) {
                                      areasNeedingAttention.push('Attendance Needs Improvement');
                                    }
                                    if ((madrasahProfile?.enable_dressing_grade !== 0 && madrasahProfile?.enable_dressing_grade !== false) && student.avg_dressing != null && student.avg_dressing < 2.5) {
                                      areasNeedingAttention.push('Dressing Needs Attention');
                                    }
                                    if ((madrasahProfile?.enable_behavior_grade !== 0 && madrasahProfile?.enable_behavior_grade !== false) && student.avg_behavior != null && student.avg_behavior < 2.5) {
                                      areasNeedingAttention.push('Behavior Needs Guidance');
                                    }
                                    if ((madrasahProfile?.enable_punctuality_grade !== 0 && madrasahProfile?.enable_punctuality_grade !== false) && student.avg_punctuality != null && student.avg_punctuality < 2.5) {
                                      areasNeedingAttention.push('Punctuality Needs Improvement');
                                    }

                                    return (
                                      <tr key={student.id}>
                                        <td><strong>{student.student_id}</strong></td>
                                        <td>{student.first_name} {student.last_name}</td>
                                        <td>
                                          <strong style={{ color: student.attendance_rate != null && student.attendance_rate < 70 ? '#0a0a0a' : '#404040' }}>
                                            {student.attendance_rate != null ? `${Number(student.attendance_rate).toFixed(1)}%` : '-'}
                                          </strong>
                                        </td>
                                        {(madrasahProfile?.enable_dressing_grade !== 0 && madrasahProfile?.enable_dressing_grade !== false) && (
                                        <td>
                                          <strong style={{ color: student.avg_dressing != null && student.avg_dressing < 2.5 ? '#0a0a0a' : student.avg_dressing != null ? '#404040' : 'var(--muted)' }}>
                                            {student.avg_dressing != null ? Number(student.avg_dressing).toFixed(2) : '-'}
                                          </strong>
                                        </td>
                                        )}
                                        {(madrasahProfile?.enable_behavior_grade !== 0 && madrasahProfile?.enable_behavior_grade !== false) && (
                                        <td>
                                          <strong style={{ color: student.avg_behavior != null && student.avg_behavior < 2.5 ? '#0a0a0a' : student.avg_behavior != null ? '#404040' : 'var(--muted)' }}>
                                            {student.avg_behavior != null ? Number(student.avg_behavior).toFixed(2) : '-'}
                                          </strong>
                                        </td>
                                        )}
                                        {(madrasahProfile?.enable_punctuality_grade !== 0 && madrasahProfile?.enable_punctuality_grade !== false) && (
                                        <td>
                                          <strong style={{ color: student.avg_punctuality != null && student.avg_punctuality < 2.5 ? '#0a0a0a' : student.avg_punctuality != null ? '#404040' : 'var(--muted)' }}>
                                            {student.avg_punctuality != null ? Number(student.avg_punctuality).toFixed(2) : '-'}
                                          </strong>
                                        </td>
                                        )}
                                        <td>
                                          {areasNeedingAttention.map((area, idx) => (
                                            <span key={idx} className="risk-badge">{area}</span>
                                          ))}
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                          {/* Mobile cards for at-risk students */}
                          <div className="at-risk-mobile-cards">
                            {classKpis.highRiskStudents
                              .filter(s => s.attendance_rate < 70 || ((madrasahProfile?.enable_dressing_grade !== 0 && madrasahProfile?.enable_dressing_grade !== false) && s.avg_dressing < 2.5) || ((madrasahProfile?.enable_behavior_grade !== 0 && madrasahProfile?.enable_behavior_grade !== false) && s.avg_behavior < 2.5) || ((madrasahProfile?.enable_punctuality_grade !== 0 && madrasahProfile?.enable_punctuality_grade !== false) && s.avg_punctuality < 2.5))
                              .map(student => {
                                const areas = [];
                                if (student.attendance_rate != null && student.attendance_rate < 70) areas.push('Attendance');
                                if ((madrasahProfile?.enable_dressing_grade !== 0 && madrasahProfile?.enable_dressing_grade !== false) && student.avg_dressing != null && student.avg_dressing < 2.5) areas.push('Dressing');
                                if ((madrasahProfile?.enable_behavior_grade !== 0 && madrasahProfile?.enable_behavior_grade !== false) && student.avg_behavior != null && student.avg_behavior < 2.5) areas.push('Behavior');
                                if ((madrasahProfile?.enable_punctuality_grade !== 0 && madrasahProfile?.enable_punctuality_grade !== false) && student.avg_punctuality != null && student.avg_punctuality < 2.5) areas.push('Punctuality');
                                return (
                                  <div key={student.id} className="at-risk-card">
                                    <div className="at-risk-card-header">
                                      <div>
                                        <div className="at-risk-card-name">{student.first_name} {student.last_name}</div>
                                        <div className="at-risk-card-id">{student.student_id}</div>
                                      </div>
                                    </div>
                                    <div className="at-risk-card-stats">
                                      <div className="at-risk-stat">
                                        <span className="at-risk-stat-label">Attend.</span>
                                        <span className="at-risk-stat-value" style={{ color: student.attendance_rate != null && student.attendance_rate < 70 ? '#0a0a0a' : '#404040' }}>
                                          {student.attendance_rate != null ? `${Number(student.attendance_rate).toFixed(1)}%` : '-'}
                                        </span>
                                      </div>
                                      {(madrasahProfile?.enable_dressing_grade !== 0 && madrasahProfile?.enable_dressing_grade !== false) && (
                                      <div className="at-risk-stat">
                                        <span className="at-risk-stat-label">Dressing</span>
                                        <span className="at-risk-stat-value" style={{ color: student.avg_dressing != null && student.avg_dressing < 2.5 ? '#0a0a0a' : '#404040' }}>
                                          {student.avg_dressing != null ? Number(student.avg_dressing).toFixed(2) : '-'}
                                        </span>
                                      </div>
                                      )}
                                      {(madrasahProfile?.enable_behavior_grade !== 0 && madrasahProfile?.enable_behavior_grade !== false) && (
                                      <div className="at-risk-stat">
                                        <span className="at-risk-stat-label">Behavior</span>
                                        <span className="at-risk-stat-value" style={{ color: student.avg_behavior != null && student.avg_behavior < 2.5 ? '#0a0a0a' : '#404040' }}>
                                          {student.avg_behavior != null ? Number(student.avg_behavior).toFixed(2) : '-'}
                                        </span>
                                      </div>
                                      )}
                                      {(madrasahProfile?.enable_punctuality_grade !== 0 && madrasahProfile?.enable_punctuality_grade !== false) && (
                                      <div className="at-risk-stat">
                                        <span className="at-risk-stat-label">Punctuality</span>
                                        <span className="at-risk-stat-value" style={{ color: student.avg_punctuality != null && student.avg_punctuality < 2.5 ? '#0a0a0a' : '#404040' }}>
                                          {student.avg_punctuality != null ? Number(student.avg_punctuality).toFixed(2) : '-'}
                                        </span>
                                      </div>
                                      )}
                                    </div>
                                    <div className="at-risk-card-badges">
                                      {areas.map((a, i) => <span key={i} className="risk-badge">{a}</span>)}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Attendance Records */}
                  <div className="card">
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Attendance Records</span>
                      {hasPlusAccess() && classAttendance.length > 0 && (
                        <button
                          onClick={() => downloadCSV(
                            classAttendance.map(r => ({ ...r, class_name: classes.find(c => c.id === selectedClassForPerformance)?.name })),
                            getAttendanceColumns(
                              madrasahProfile?.enable_dressing_grade !== 0 && madrasahProfile?.enable_dressing_grade !== false,
                              madrasahProfile?.enable_behavior_grade !== 0 && madrasahProfile?.enable_behavior_grade !== false,
                              madrasahProfile?.enable_punctuality_grade !== 0 && madrasahProfile?.enable_punctuality_grade !== false
                            ),
                            `attendance-${getDateSuffix()}`
                          )}
                          className="btn btn-secondary btn-sm"
                        >
                          Export CSV
                        </button>
                      )}
                    </div>
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
                        ...((madrasahProfile?.enable_dressing_grade !== 0 && madrasahProfile?.enable_dressing_grade !== false) ? [{
                          key: 'dressing_grade',
                          label: 'Dressing',
                          sortable: true,
                          render: (row) => row.dressing_grade || '-'
                        }] : []),
                        ...((madrasahProfile?.enable_behavior_grade !== 0 && madrasahProfile?.enable_behavior_grade !== false) ? [{
                          key: 'behavior_grade',
                          label: 'Behavior',
                          sortable: true,
                          render: (row) => row.behavior_grade || '-'
                        }] : []),
                        ...((madrasahProfile?.enable_punctuality_grade !== 0 && madrasahProfile?.enable_punctuality_grade !== false) ? [{
                          key: 'punctuality_grade',
                          label: 'Punctuality',
                          sortable: true,
                          render: (row) => row.punctuality_grade || '-'
                        }] : []),
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
                  {examKpis && examKpis.length > 0 ? (() => {
                    const totalSubjects = examKpis.length;
                    const totalPages = Math.ceil(totalSubjects / subjectsPerPage);
                    const startIndex = (currentSubjectPage - 1) * subjectsPerPage;
                    const endIndex = startIndex + subjectsPerPage;
                    const currentSubjects = examKpis.slice(startIndex, endIndex);

                    return (
                      <>
                        {/* Subject Pagination Controls */}
                        {totalPages > 1 && (
                          <div className="card" style={{ marginBottom: 'var(--md)' }}>
                            <div className="subject-pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ color: 'var(--muted)', fontSize: '14px' }}>
                                Showing subject {startIndex + 1} of {totalSubjects}
                              </div>
                              <div style={{ display: 'flex', gap: 'var(--sm)' }}>
                                <button
                                  onClick={() => setCurrentSubjectPage(prev => Math.max(1, prev - 1))}
                                  disabled={currentSubjectPage === 1}
                                  className="btn-sm"
                                  style={{ opacity: currentSubjectPage === 1 ? 0.5 : 1 }}
                                >
                                  ← Previous Subject
                                </button>
                                <div style={{ 
                                  padding: '8px 16px', 
                                  backgroundColor: 'var(--accent-light)', 
                                  color: 'var(--accent)',
                                  borderRadius: 'var(--radius)',
                                  fontWeight: '600',
                                  fontSize: '14px'
                                }}>
                                  {currentSubjectPage} / {totalPages}
                                </div>
                                <button
                                  onClick={() => setCurrentSubjectPage(prev => Math.min(totalPages, prev + 1))}
                                  disabled={currentSubjectPage === totalPages}
                                  className="btn-sm"
                                  style={{ opacity: currentSubjectPage === totalPages ? 0.5 : 1 }}
                                >
                                  Next Subject →
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {currentSubjects.map(kpi => (
                        <div key={kpi.subject} className="exam-subject-section">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--sm)' }}>
                            <h3 className="exam-subject-title" style={{ margin: 0 }}>
                              {kpi.subject}
                            </h3>
                            {hasPlusAccess() && kpi.records?.length > 0 && (
                              <button
                                onClick={() => downloadCSV(
                                  kpi.records.map(r => ({ ...r, subject_name: kpi.subject })),
                                  examColumns,
                                  `exams-${kpi.subject.replace(/\s+/g, '-').toLowerCase()}-${getDateSuffix()}`
                                )}
                                className="btn btn-secondary btn-sm"
                              >
                                Export CSV
                              </button>
                            )}
                          </div>

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
                                        color: percentage >= 80 ? '#404040' :
                                               percentage >= 70 ? '#525252' :
                                               percentage >= 50 ? '#737373' :
                                               '#0a0a0a'
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
                                          backgroundColor: '#f5f5f5',
                                          color: '#404040'
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
                                        backgroundColor: '#f5f5f5',
                                        color: '#0a0a0a'
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
                    );
                  })() : (
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

              {/* Student Rankings Tab */}
              {reportSubTab === 'student-reports' && selectedClassForPerformance && (
                <div className="card">
                  <h3 style={{ marginBottom: 'var(--md)' }}>
                    Class Rankings - {classes.find(c => c.id === selectedClassForPerformance)?.name}
                  </h3>

                  {/* Ranking Sub-tabs */}
                  <div className="report-subtabs" style={{ marginBottom: 'var(--md)' }}>
                    <button
                      className={`subtab-btn ${rankingSubTab === 'exam' ? 'active' : ''}`}
                      onClick={() => setRankingSubTab('exam')}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                      </svg>
                      Exam
                    </button>
                    <button
                      className={`subtab-btn ${rankingSubTab === 'attendance' ? 'active' : ''}`}
                      onClick={() => setRankingSubTab('attendance')}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                      Attendance
                    </button>
                    {(madrasahProfile?.enable_dressing_grade !== 0 && madrasahProfile?.enable_dressing_grade !== false) && (
                    <button
                      className={`subtab-btn ${rankingSubTab === 'dressing' ? 'active' : ''}`}
                      onClick={() => setRankingSubTab('dressing')}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                      Dressing
                    </button>
                    )}
                    {(madrasahProfile?.enable_behavior_grade !== 0 && madrasahProfile?.enable_behavior_grade !== false) && (
                    <button
                      className={`subtab-btn ${rankingSubTab === 'behavior' ? 'active' : ''}`}
                      onClick={() => setRankingSubTab('behavior')}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      Behavior
                    </button>
                    )}
                    {(madrasahProfile?.enable_punctuality_grade !== 0 && madrasahProfile?.enable_punctuality_grade !== false) && (
                    <button
                      className={`subtab-btn ${rankingSubTab === 'punctuality' ? 'active' : ''}`}
                      onClick={() => setRankingSubTab('punctuality')}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                      Punctuality
                    </button>
                    )}
                  </div>

                  {/* Exam Rankings */}
                  {rankingSubTab === 'exam' && studentReports.length > 0 && (
                    <>
                    <div className="rankings-desktop">
                    <SortableTable
                      columns={[
                        {
                          key: 'rank',
                          label: 'Rank',
                          sortable: false,
                          render: (row) => {
                            const rank = row.rank || 0;
                            return (
                              <span style={{ 
                                fontWeight: '700', 
                                fontSize: '16px',
                                color: 'var(--text)'
                              }}>
                                {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                              </span>
                            );
                          }
                        },
                        {
                          key: 'name',
                          label: 'Student',
                          sortable: true,
                          render: (row) => (
                            <div>
                              <strong>{row.first_name} {row.last_name}</strong>
                              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{row.student_id}</div>
                            </div>
                          )
                        },
                        {
                          key: 'overall_percentage',
                          label: 'Overall %',
                          sortable: true,
                          sortType: 'number',
                          render: (row) => (
                            <span style={{
                              fontWeight: '700',
                              fontSize: '18px',
                              color: row.overall_percentage >= 80 ? '#404040' : 
                                     row.overall_percentage >= 70 ? '#525252' :
                                     row.overall_percentage >= 50 ? '#737373' : 
                                     '#0a0a0a'
                            }}>
                              {row.overall_percentage}%
                            </span>
                          )
                        },
                        {
                          key: 'total_score',
                          label: 'Total Score',
                          sortable: true,
                          sortType: 'number',
                          render: (row) => (
                            <div>
                              <strong>{row.total_score}</strong>
                              <span style={{ color: 'var(--muted)', fontSize: '12px' }}> / {row.total_max_score}</span>
                            </div>
                          )
                        },
                        {
                          key: 'subject_count',
                          label: 'Subjects',
                          sortable: true,
                          sortType: 'number',
                          render: (row) => (
                            <span style={{
                              padding: '4px 12px',
                              borderRadius: '20px',
                              backgroundColor: 'var(--accent-light)',
                              color: 'var(--accent)',
                              fontWeight: '600',
                              fontSize: '14px'
                            }}>
                              {row.subject_count}
                            </span>
                          )
                        },
                        {
                          key: 'exams_taken',
                          label: 'Exams Taken',
                          sortable: true,
                          sortType: 'number'
                        },
                        {
                          key: 'exams_absent',
                          label: 'Absences',
                          sortable: true,
                          sortType: 'number',
                          render: (row) => (
                            <span style={{
                              color: row.exams_absent > 0 ? 'var(--error)' : 'var(--muted)'
                            }}>
                              {row.exams_absent}
                            </span>
                          )
                        },
                        {
                          key: 'status',
                          label: 'Status',
                          sortable: false,
                          render: (row) => {
                            const percentage = parseFloat(row.overall_percentage);
                            if (percentage >= 80) {
                              return (
                                <span style={{
                                  padding: '4px 10px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  backgroundColor: '#f5f5f5',
                                  color: '#404040'
                                }}>
                                  Excellent
                                </span>
                              );
                            } else if (percentage >= 70) {
                              return (
                                <span style={{
                                  padding: '4px 10px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  backgroundColor: '#f5f5f5',
                                  color: '#525252'
                                }}>
                                  Good
                                </span>
                              );
                            } else if (percentage >= 50) {
                              return (
                                <span style={{
                                  padding: '4px 10px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  backgroundColor: '#f5f5f5',
                                  color: '#737373'
                                }}>
                                  Average
                                </span>
                              );
                            } else {
                              return (
                                <span style={{
                                  padding: '4px 10px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  backgroundColor: '#f5f5f5',
                                  color: '#0a0a0a'
                                }}>
                                  Needs Attention
                                </span>
                              );
                            }
                          }
                        }
                      ]}
                      data={studentReports}
                      defaultSort={{ key: 'overall_percentage', direction: 'desc' }}
                    />
                    </div>
                    {/* Mobile ranking cards for exams */}
                    <div className="rankings-mobile">
                      {studentReports.map(row => {
                        const rank = row.rank || 0;
                        const pct = parseFloat(row.overall_percentage);
                        return (
                          <div key={row.student_id} className="ranking-card">
                            <div className="ranking-card-top">
                              <span className="ranking-card-rank">
                                {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                              </span>
                              <div className="ranking-card-info">
                                <div className="ranking-card-name">{row.first_name} {row.last_name}</div>
                                <div className="ranking-card-id">{row.student_id}</div>
                              </div>
                              <div className="ranking-card-score" style={{ color: pct >= 80 ? '#404040' : pct >= 70 ? '#525252' : pct >= 50 ? '#737373' : '#0a0a0a' }}>
                                {row.overall_percentage}%
                              </div>
                            </div>
                            <div className="ranking-card-details">
                              <div className="ranking-detail"><span className="ranking-detail-label">Score</span><span className="ranking-detail-value">{row.total_score}/{row.total_max_score}</span></div>
                              <div className="ranking-detail"><span className="ranking-detail-label">Subjects</span><span className="ranking-detail-value">{row.subject_count}</span></div>
                              <div className="ranking-detail"><span className="ranking-detail-label">Taken</span><span className="ranking-detail-value">{row.exams_taken}</span></div>
                              <div className="ranking-detail"><span className="ranking-detail-label">Absent</span><span className="ranking-detail-value" style={{ color: row.exams_absent > 0 ? '#0a0a0a' : 'inherit' }}>{row.exams_absent}</span></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    </>
                  )}

                  {/* Attendance Rankings */}
                  {rankingSubTab === 'attendance' && attendanceRankings.length > 0 && (
                    <>
                    <div className="rankings-desktop">
                    <SortableTable
                      columns={[
                        {
                          key: 'rank',
                          label: 'Rank',
                          sortable: false,
                          render: (row) => {
                            const rank = row.rank || 0;
                            return (
                              <span style={{ 
                                fontWeight: '700', 
                                fontSize: '16px',
                                color: 'var(--text)'
                              }}>
                                {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                              </span>
                            );
                          }
                        },
                        {
                          key: 'name',
                          label: 'Student',
                          sortable: true,
                          render: (row) => (
                            <div>
                              <strong>{row.first_name} {row.last_name}</strong>
                              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{row.student_id}</div>
                            </div>
                          )
                        },
                        {
                          key: 'attendance_rate',
                          label: 'Attendance Rate',
                          sortable: true,
                          sortType: 'number',
                          render: (row) => (
                            <span style={{
                              fontWeight: '700',
                              fontSize: '18px',
                              color: row.attendance_rate >= 90 ? '#404040' : 
                                     row.attendance_rate >= 80 ? '#525252' :
                                     row.attendance_rate >= 70 ? '#737373' : 
                                     '#0a0a0a'
                            }}>
                              {row.attendance_rate}%
                            </span>
                          )
                        },
                        {
                          key: 'days_present',
                          label: 'Days Present',
                          sortable: true,
                          sortType: 'number',
                          render: (row) => (
                            <span style={{ color: '#404040', fontWeight: '600' }}>
                              {row.days_present}
                            </span>
                          )
                        },
                        {
                          key: 'days_absent',
                          label: 'Days Absent',
                          sortable: true,
                          sortType: 'number',
                          render: (row) => (
                            <span style={{ color: row.days_absent > 0 ? '#0a0a0a' : 'var(--muted)' }}>
                              {row.days_absent}
                            </span>
                          )
                        },
                        {
                          key: 'total_days',
                          label: 'Total Days',
                          sortable: true,
                          sortType: 'number'
                        },
                        {
                          key: 'status',
                          label: 'Status',
                          sortable: false,
                          render: (row) => {
                            const rate = parseFloat(row.attendance_rate);
                            if (rate >= 90) {
                              return (
                                <span style={{
                                  padding: '4px 10px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  backgroundColor: '#f5f5f5',
                                  color: '#404040'
                                }}>
                                  Excellent
                                </span>
                              );
                            } else if (rate >= 80) {
                              return (
                                <span style={{
                                  padding: '4px 10px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  backgroundColor: '#f5f5f5',
                                  color: '#525252'
                                }}>
                                  Good
                                </span>
                              );
                            } else if (rate >= 70) {
                              return (
                                <span style={{
                                  padding: '4px 10px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  backgroundColor: '#f5f5f5',
                                  color: '#737373'
                                }}>
                                  Needs Attention
                                </span>
                              );
                            } else {
                              return (
                                <span style={{
                                  padding: '4px 10px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  backgroundColor: '#f5f5f5',
                                  color: '#0a0a0a'
                                }}>
                                  Urgent Intervention
                                </span>
                              );
                            }
                          }
                        }
                      ]}
                      data={attendanceRankings}
                      defaultSort={{ key: 'attendance_rate', direction: 'desc' }}
                    />
                    </div>
                    <div className="rankings-mobile">
                      {attendanceRankings.map(row => {
                        const rank = row.rank || 0;
                        const rate = parseFloat(row.attendance_rate);
                        return (
                          <div key={row.student_id} className="ranking-card">
                            <div className="ranking-card-top">
                              <span className="ranking-card-rank">
                                {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                              </span>
                              <div className="ranking-card-info">
                                <div className="ranking-card-name">{row.first_name} {row.last_name}</div>
                                <div className="ranking-card-id">{row.student_id}</div>
                              </div>
                              <div className="ranking-card-score" style={{ color: rate >= 90 ? '#404040' : rate >= 80 ? '#525252' : rate >= 70 ? '#737373' : '#0a0a0a' }}>
                                {row.attendance_rate}%
                              </div>
                            </div>
                            <div className="ranking-card-details">
                              <div className="ranking-detail"><span className="ranking-detail-label">Present</span><span className="ranking-detail-value" style={{ color: '#404040' }}>{row.days_present}</span></div>
                              <div className="ranking-detail"><span className="ranking-detail-label">Absent</span><span className="ranking-detail-value" style={{ color: row.days_absent > 0 ? '#0a0a0a' : 'inherit' }}>{row.days_absent}</span></div>
                              <div className="ranking-detail"><span className="ranking-detail-label">Total</span><span className="ranking-detail-value">{row.total_days}</span></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    </>
                  )}

                  {/* Dressing Rankings */}
                  {rankingSubTab === 'dressing' && dressingRankings.length > 0 && (
                    <>
                    <div className="rankings-desktop">
                    <SortableTable
                      columns={[
                        {
                          key: 'rank',
                          label: 'Rank',
                          sortable: false,
                          render: (row) => {
                            const rank = row.rank || '-';
                            if (rank === '-') return <span style={{ color: 'var(--muted)' }}>N/A</span>;
                            return (
                              <span style={{ 
                                fontWeight: '700', 
                                fontSize: '16px',
                                color: 'var(--text)'
                              }}>
                                {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                              </span>
                            );
                          }
                        },
                        {
                          key: 'name',
                          label: 'Student',
                          sortable: true,
                          render: (row) => (
                            <div>
                              <strong>{row.first_name} {row.last_name}</strong>
                              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{row.student_id}</div>
                            </div>
                          )
                        },
                        {
                          key: 'avg_dressing_grade',
                          label: 'Average Grade',
                          sortable: true,
                          render: (row) => {
                            const grade = row.avg_dressing_grade || 'N/A';
                            let color = 'var(--muted)';
                            if (grade === 'Excellent') color = '#404040';
                            else if (grade === 'Good') color = '#525252';
                            else if (grade === 'Fair') color = '#737373';
                            else if (grade === 'Poor') color = '#0a0a0a';
                            
                            return (
                              <span style={{ fontWeight: '700', fontSize: '16px', color }}>
                                {grade}
                              </span>
                            );
                          }
                        },
                        {
                          key: 'excellent_count',
                          label: 'Excellent',
                          sortable: true,
                          sortType: 'number',
                          render: (row) => (
                            <span style={{ color: '#404040', fontWeight: '600' }}>
                              {row.excellent_count}
                            </span>
                          )
                        },
                        {
                          key: 'good_count',
                          label: 'Good',
                          sortable: true,
                          sortType: 'number',
                          render: (row) => (
                            <span style={{ color: '#525252', fontWeight: '600' }}>
                              {row.good_count}
                            </span>
                          )
                        },
                        {
                          key: 'fair_count',
                          label: 'Fair',
                          sortable: true,
                          sortType: 'number',
                          render: (row) => (
                            <span style={{ color: '#737373', fontWeight: '600' }}>
                              {row.fair_count}
                            </span>
                          )
                        },
                        {
                          key: 'poor_count',
                          label: 'Poor',
                          sortable: true,
                          sortType: 'number',
                          render: (row) => (
                            <span style={{ color: '#0a0a0a', fontWeight: '600' }}>
                              {row.poor_count}
                            </span>
                          )
                        },
                        {
                          key: 'total_records',
                          label: 'Total Records',
                          sortable: true,
                          sortType: 'number'
                        }
                      ]}
                      data={dressingRankings}
                      defaultSort={{ key: 'avg_dressing_score', direction: 'desc' }}
                    />
                    </div>
                    <div className="rankings-mobile">
                      {dressingRankings.map(row => {
                        const rank = row.rank || '-';
                        const grade = row.avg_dressing_grade || 'N/A';
                        let color = '#888';
                        if (grade === 'Excellent') color = '#404040';
                        else if (grade === 'Good') color = '#525252';
                        else if (grade === 'Fair') color = '#737373';
                        else if (grade === 'Poor') color = '#0a0a0a';
                        return (
                          <div key={row.student_id} className="ranking-card">
                            <div className="ranking-card-top">
                              <span className="ranking-card-rank">
                                {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank === '-' ? '-' : `#${rank}`}
                              </span>
                              <div className="ranking-card-info">
                                <div className="ranking-card-name">{row.first_name} {row.last_name}</div>
                                <div className="ranking-card-id">{row.student_id}</div>
                              </div>
                              <div className="ranking-card-score" style={{ color }}>{grade}</div>
                            </div>
                            <div className="ranking-card-details">
                              <div className="ranking-detail"><span className="ranking-detail-label">Excellent</span><span className="ranking-detail-value" style={{ color: '#404040' }}>{row.excellent_count}</span></div>
                              <div className="ranking-detail"><span className="ranking-detail-label">Good</span><span className="ranking-detail-value" style={{ color: '#525252' }}>{row.good_count}</span></div>
                              <div className="ranking-detail"><span className="ranking-detail-label">Fair</span><span className="ranking-detail-value" style={{ color: '#737373' }}>{row.fair_count}</span></div>
                              <div className="ranking-detail"><span className="ranking-detail-label">Poor</span><span className="ranking-detail-value" style={{ color: '#0a0a0a' }}>{row.poor_count}</span></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    </>
                  )}

                  {/* Behavior Rankings */}
                  {rankingSubTab === 'behavior' && behaviorRankings.length > 0 && (
                    <>
                    <div className="rankings-desktop">
                    <SortableTable
                      columns={[
                        {
                          key: 'rank',
                          label: 'Rank',
                          sortable: false,
                          render: (row) => {
                            const rank = row.rank || '-';
                            if (rank === '-') return <span style={{ color: 'var(--muted)' }}>N/A</span>;
                            return (
                              <span style={{ 
                                fontWeight: '700', 
                                fontSize: '16px',
                                color: 'var(--text)'
                              }}>
                                {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                              </span>
                            );
                          }
                        },
                        {
                          key: 'name',
                          label: 'Student',
                          sortable: true,
                          render: (row) => (
                            <div>
                              <strong>{row.first_name} {row.last_name}</strong>
                              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{row.student_id}</div>
                            </div>
                          )
                        },
                        {
                          key: 'avg_behavior_grade',
                          label: 'Average Grade',
                          sortable: true,
                          render: (row) => {
                            const grade = row.avg_behavior_grade || 'N/A';
                            let color = 'var(--muted)';
                            if (grade === 'Excellent') color = '#404040';
                            else if (grade === 'Good') color = '#525252';
                            else if (grade === 'Fair') color = '#737373';
                            else if (grade === 'Poor') color = '#0a0a0a';
                            
                            return (
                              <span style={{ fontWeight: '700', fontSize: '16px', color }}>
                                {grade}
                              </span>
                            );
                          }
                        },
                        {
                          key: 'excellent_count',
                          label: 'Excellent',
                          sortable: true,
                          sortType: 'number',
                          render: (row) => (
                            <span style={{ color: '#404040', fontWeight: '600' }}>
                              {row.excellent_count}
                            </span>
                          )
                        },
                        {
                          key: 'good_count',
                          label: 'Good',
                          sortable: true,
                          sortType: 'number',
                          render: (row) => (
                            <span style={{ color: '#525252', fontWeight: '600' }}>
                              {row.good_count}
                            </span>
                          )
                        },
                        {
                          key: 'fair_count',
                          label: 'Fair',
                          sortable: true,
                          sortType: 'number',
                          render: (row) => (
                            <span style={{ color: '#737373', fontWeight: '600' }}>
                              {row.fair_count}
                            </span>
                          )
                        },
                        {
                          key: 'poor_count',
                          label: 'Poor',
                          sortable: true,
                          sortType: 'number',
                          render: (row) => (
                            <span style={{ color: '#0a0a0a', fontWeight: '600' }}>
                              {row.poor_count}
                            </span>
                          )
                        },
                        {
                          key: 'total_records',
                          label: 'Total Records',
                          sortable: true,
                          sortType: 'number'
                        }
                      ]}
                      data={behaviorRankings}
                      defaultSort={{ key: 'avg_behavior_score', direction: 'desc' }}
                    />
                    </div>
                    <div className="rankings-mobile">
                      {behaviorRankings.map(row => {
                        const rank = row.rank || '-';
                        const grade = row.avg_behavior_grade || 'N/A';
                        let color = '#888';
                        if (grade === 'Excellent') color = '#404040';
                        else if (grade === 'Good') color = '#525252';
                        else if (grade === 'Fair') color = '#737373';
                        else if (grade === 'Poor') color = '#0a0a0a';
                        return (
                          <div key={row.student_id} className="ranking-card">
                            <div className="ranking-card-top">
                              <span className="ranking-card-rank">
                                {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank === '-' ? '-' : `#${rank}`}
                              </span>
                              <div className="ranking-card-info">
                                <div className="ranking-card-name">{row.first_name} {row.last_name}</div>
                                <div className="ranking-card-id">{row.student_id}</div>
                              </div>
                              <div className="ranking-card-score" style={{ color }}>{grade}</div>
                            </div>
                            <div className="ranking-card-details">
                              <div className="ranking-detail"><span className="ranking-detail-label">Excellent</span><span className="ranking-detail-value" style={{ color: '#404040' }}>{row.excellent_count}</span></div>
                              <div className="ranking-detail"><span className="ranking-detail-label">Good</span><span className="ranking-detail-value" style={{ color: '#525252' }}>{row.good_count}</span></div>
                              <div className="ranking-detail"><span className="ranking-detail-label">Fair</span><span className="ranking-detail-value" style={{ color: '#737373' }}>{row.fair_count}</span></div>
                              <div className="ranking-detail"><span className="ranking-detail-label">Poor</span><span className="ranking-detail-value" style={{ color: '#0a0a0a' }}>{row.poor_count}</span></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    </>
                  )}

                  {/* Empty states */}
                  {rankingSubTab === 'exam' && studentReports.length === 0 && (
                    <div className="empty">
                      <p>No exam data available for this class.</p>
                    </div>
                  )}
                  {rankingSubTab === 'attendance' && attendanceRankings.length === 0 && (
                    <div className="empty">
                      <p>No attendance data available for this class.</p>
                    </div>
                  )}
                  {rankingSubTab === 'dressing' && dressingRankings.length === 0 && (
                    <div className="empty">
                      <p>No dressing data available for this class.</p>
                    </div>
                  )}
                  {rankingSubTab === 'behavior' && behaviorRankings.length === 0 && (
                    <div className="empty">
                      <p>No behavior data available for this class.</p>
                    </div>
                  )}

                  {/* Punctuality Rankings */}
                  {rankingSubTab === 'punctuality' && punctualityRankings.length > 0 && (
                    <>
                    <div className="rankings-desktop">
                    <SortableTable
                      columns={[
                        {
                          key: 'rank',
                          label: 'Rank',
                          sortable: false,
                          render: (row) => {
                            const rank = row.rank || '-';
                            if (rank === '-') return <span style={{ color: 'var(--muted)' }}>N/A</span>;
                            return (
                              <span style={{ 
                                fontWeight: '700', 
                                fontSize: '16px',
                                color: 'var(--text)'
                              }}>
                                {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                              </span>
                            );
                          }
                        },
                        {
                          key: 'name',
                          label: 'Student',
                          sortable: true,
                          render: (row) => (
                            <div>
                              <strong>{row.first_name} {row.last_name}</strong>
                              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{row.student_id}</div>
                            </div>
                          )
                        },
                        {
                          key: 'avg_punctuality_grade',
                          label: 'Average Grade',
                          sortable: true,
                          render: (row) => {
                            const grade = row.avg_punctuality_grade || 'N/A';
                            let color = 'var(--muted)';
                            if (grade === 'Excellent') color = '#404040';
                            else if (grade === 'Good') color = '#525252';
                            else if (grade === 'Fair') color = '#737373';
                            else if (grade === 'Poor') color = '#0a0a0a';
                            
                            return (
                              <span style={{ fontWeight: '700', fontSize: '16px', color }}>
                                {grade}
                              </span>
                            );
                          }
                        },
                        {
                          key: 'excellent_count',
                          label: 'Excellent',
                          sortable: true,
                          sortType: 'number',
                          render: (row) => (
                            <span style={{ color: '#404040', fontWeight: '600' }}>
                              {row.excellent_count}
                            </span>
                          )
                        },
                        {
                          key: 'good_count',
                          label: 'Good',
                          sortable: true,
                          sortType: 'number',
                          render: (row) => (
                            <span style={{ color: '#525252', fontWeight: '600' }}>
                              {row.good_count}
                            </span>
                          )
                        },
                        {
                          key: 'fair_count',
                          label: 'Fair',
                          sortable: true,
                          sortType: 'number',
                          render: (row) => (
                            <span style={{ color: '#737373', fontWeight: '600' }}>
                              {row.fair_count}
                            </span>
                          )
                        },
                        {
                          key: 'poor_count',
                          label: 'Poor',
                          sortable: true,
                          sortType: 'number',
                          render: (row) => (
                            <span style={{ color: '#0a0a0a', fontWeight: '600' }}>
                              {row.poor_count}
                            </span>
                          )
                        },
                        {
                          key: 'total_records',
                          label: 'Total Records',
                          sortable: true,
                          sortType: 'number'
                        }
                      ]}
                      data={punctualityRankings}
                      defaultSort={{ key: 'avg_punctuality_score', direction: 'desc' }}
                    />
                    </div>
                    <div className="rankings-mobile">
                      {punctualityRankings.map(row => {
                        const rank = row.rank || '-';
                        const grade = row.avg_punctuality_grade || 'N/A';
                        let color = '#888';
                        if (grade === 'Excellent') color = '#404040';
                        else if (grade === 'Good') color = '#525252';
                        else if (grade === 'Fair') color = '#737373';
                        else if (grade === 'Poor') color = '#0a0a0a';
                        return (
                          <div key={row.student_id} className="ranking-card">
                            <div className="ranking-card-top">
                              <span className="ranking-card-rank">
                                {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank === '-' ? '-' : `#${rank}`}
                              </span>
                              <div className="ranking-card-info">
                                <div className="ranking-card-name">{row.first_name} {row.last_name}</div>
                                <div className="ranking-card-id">{row.student_id}</div>
                              </div>
                              <div className="ranking-card-score" style={{ color }}>{grade}</div>
                            </div>
                            <div className="ranking-card-details">
                              <div className="ranking-detail"><span className="ranking-detail-label">Excellent</span><span className="ranking-detail-value" style={{ color: '#404040' }}>{row.excellent_count}</span></div>
                              <div className="ranking-detail"><span className="ranking-detail-label">Good</span><span className="ranking-detail-value" style={{ color: '#525252' }}>{row.good_count}</span></div>
                              <div className="ranking-detail"><span className="ranking-detail-label">Fair</span><span className="ranking-detail-value" style={{ color: '#737373' }}>{row.fair_count}</span></div>
                              <div className="ranking-detail"><span className="ranking-detail-label">Poor</span><span className="ranking-detail-value" style={{ color: '#0a0a0a' }}>{row.poor_count}</span></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    </>
                  )}

                  {rankingSubTab === 'punctuality' && punctualityRankings.length === 0 && (
                    <div className="empty">
                      <p>No punctuality data available for this class.</p>
                    </div>
                  )}
                </div>
              )}

              {reportSubTab === 'student-reports' && selectedClassForPerformance && studentReports.length === 0 && (
                <div className="card">
                  <div className="empty">
                    <p>No exam data available for this class. Students need to have exam records to appear here.</p>
                  </div>
                </div>
              )}

              {reportSubTab === 'student-reports' && !selectedClassForPerformance && (
                <div className="card">
                  <div className="empty">
                    <p>Please select a class to view student rankings.</p>
                  </div>
                </div>
              )}

              {/* Individual Student Report Tab */}
              {reportSubTab === 'individual' && studentReport && selectedStudentForReport && (
                <div className="student-report-card">
                  {/* Report Card Header */}
                  <div className="report-card-header">
                    {/* Print Header (only visible when printing) */}
                    <div className="print-header">
                      <h1 className="madrasah-name">{madrasahProfile?.name || 'Madrasah Name'}</h1>
                      <div className="report-subtitle">Student Performance Report</div>
                    </div>
                    
                    {/* Screen Header (hidden when printing) */}
                    <div className="report-card-title no-print">
                      <h2>Student Performance Report</h2>
                      <div className="report-period">
                        {reportFilterSession && sessions.find(s => s.id === parseInt(reportFilterSession))?.name}
                        {reportFilterSemester && ` - ${semesters.find(s => s.id === parseInt(reportFilterSemester))?.name}`}
                      </div>
                    </div>
                    <button 
                      className="btn btn-secondary btn-sm no-print" 
                      onClick={() => window.print()}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 6 2 18 2 18 9"/>
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                        <rect x="6" y="14" width="12" height="8"/>
                      </svg>
                      Print
                    </button>
                  </div>

                  {/* Student Info */}
                  <div className="report-card-student-info">
                    <div className="student-info-grid">
                      <div className="info-item">
                        <div className="info-label">Student Name</div>
                        <div className="info-value">{selectedStudentForReport.first_name} {selectedStudentForReport.last_name}</div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">Student ID</div>
                        <div className="info-value">{selectedStudentForReport.student_id}</div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">Class</div>
                        <div className="info-value">{selectedStudentForReport.class_name || 'Not assigned'}</div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">Report Date</div>
                        <div className="info-value">{new Date().toLocaleDateString()}</div>
                      </div>
                    </div>
                  </div>

                  {/* Performance Summary Grid */}
                  <div className="performance-summary-grid">
                    {/* Attendance */}
                    <div className="performance-card">
                      <div className="performance-card-header">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                          <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                        <span>Attendance</span>
                      </div>
                      <div className="performance-card-body">
                        {individualRankings?.rankings?.attendance?.rank ? (
                          <>
                            <div className="performance-main-stat">
                              <div className="performance-big-number" style={{ color: parseFloat(studentReport.attendance.attendanceRate) >= 90 ? '#404040' : parseFloat(studentReport.attendance.attendanceRate) >= 80 ? '#525252' : '#737373' }}>
                                {studentReport.attendance.attendanceRate}%
                              </div>
                              <div className="performance-label">Attendance Rate</div>
                            </div>
                            <div className="performance-details">
                              <div className="detail-row">
                                <span>Present:</span>
                                <strong style={{ color: '#404040' }}>{studentReport.attendance.presentDays} days</strong>
                              </div>
                              <div className="detail-row">
                                <span>Absent:</span>
                                <strong style={{ color: '#0a0a0a' }}>
                                  {studentReport.attendance.totalDays - studentReport.attendance.presentDays} days
                                </strong>
                              </div>
                              <div className="detail-row">
                                <span>Total Days:</span>
                                <strong>{studentReport.attendance.totalDays}</strong>
                              </div>
                            </div>
                            {individualRankings?.rankings.attendance.rank && (
                              <div className="performance-rank">
                                Rank #{individualRankings.rankings.attendance.rank} of {individualRankings.rankings.attendance.total_students}
                              </div>
                            )}
                          </>
                        ) : (
                          <div style={{ textAlign: 'center', padding: 'var(--lg)', color: 'var(--muted)' }}>
                            <p>No attendance records yet</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Exam Performance */}
                    <div className="performance-card">
                      <div className="performance-card-header">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                        </svg>
                        <span>Exam Performance</span>
                      </div>
                      <div className="performance-card-body">
                        {individualRankings?.rankings?.exam?.rank ? (
                          <>
                            <div className="performance-main-stat">
                              <div className="performance-big-number" style={{ color: individualRankings?.rankings.exam.percentage >= 80 ? '#404040' : individualRankings?.rankings.exam.percentage >= 70 ? '#525252' : '#737373' }}>
                                {individualRankings.rankings.exam.percentage}%
                              </div>
                              <div className="performance-label">Overall Score</div>
                            </div>
                            <div className="performance-details">
                              <div className="detail-row">
                                <span>Exams Taken:</span>
                                <strong>{studentReport.exams.filter(e => !e.is_absent).length}</strong>
                              </div>
                              <div className="detail-row">
                                <span>Exams Missed:</span>
                                <strong style={{ color: '#0a0a0a' }}>{studentReport.exams.filter(e => e.is_absent).length}</strong>
                              </div>
                              <div className="detail-row">
                                <span>Total Exams:</span>
                                <strong>{studentReport.exams.length}</strong>
                              </div>
                            </div>
                            {individualRankings?.rankings.exam.rank && (
                              <div className="performance-rank">
                                Rank #{individualRankings.rankings.exam.rank} of {individualRankings.rankings.exam.total_students}
                              </div>
                            )}
                          </>
                        ) : (
                          <div style={{ textAlign: 'center', padding: 'var(--lg)', color: 'var(--muted)' }}>
                            <p>No exams yet</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Dressing Standards */}
                    {(madrasahProfile?.enable_dressing_grade !== 0 && madrasahProfile?.enable_dressing_grade !== false) && (
                    <div className="performance-card">
                      <div className="performance-card-header">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                        <span>Dressing Standards</span>
                      </div>
                      <div className="performance-card-body">
                        {individualRankings?.rankings?.dressing?.rank ? (
                          <>
                            <div className="performance-main-stat">
                              <div className="performance-big-number" style={{ color: studentReport.dressingBehavior?.avgDressing >= 3.5 ? '#404040' : studentReport.dressingBehavior?.avgDressing >= 2.5 ? '#525252' : '#737373' }}>
                                {studentReport.dressingBehavior?.avgDressing ? studentReport.dressingBehavior.avgDressing.toFixed(1) : '0.0'}
                              </div>
                              <div className="performance-label">Average Grade (out of 4.0)</div>
                            </div>
                            <div className="performance-details">
                              <div className="detail-row">
                                <span>Grade:</span>
                                <strong>
                                  {studentReport.dressingBehavior?.avgDressing >= 3.5 ? 'Excellent' :
                                   studentReport.dressingBehavior?.avgDressing >= 2.5 ? 'Good' :
                                   studentReport.dressingBehavior?.avgDressing >= 1.5 ? 'Fair' : 'Needs Improvement'}
                                </strong>
                              </div>
                            </div>
                            {individualRankings?.rankings.dressing.rank && (
                              <div className="performance-rank">
                                Rank #{individualRankings.rankings.dressing.rank} of {individualRankings.rankings.dressing.total_students}
                              </div>
                            )}
                          </>
                        ) : (
                          <div style={{ textAlign: 'center', padding: 'var(--lg)', color: 'var(--muted)' }}>
                            <p>No dressing records yet</p>
                          </div>
                        )}
                      </div>
                    </div>
                    )}

                    {/* Behavior & Conduct */}
                    {(madrasahProfile?.enable_behavior_grade !== 0 && madrasahProfile?.enable_behavior_grade !== false) && (
                    <div className="performance-card">
                      <div className="performance-card-header">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                        <span>Behavior & Conduct</span>
                      </div>
                      <div className="performance-card-body">
                        {individualRankings?.rankings?.behavior?.rank ? (
                          <>
                            <div className="performance-main-stat">
                              <div className="performance-big-number" style={{ color: studentReport.dressingBehavior?.avgBehavior >= 3.5 ? '#404040' : studentReport.dressingBehavior?.avgBehavior >= 2.5 ? '#525252' : '#737373' }}>
                                {studentReport.dressingBehavior?.avgBehavior ? studentReport.dressingBehavior.avgBehavior.toFixed(1) : '0.0'}
                              </div>
                              <div className="performance-label">Average Grade (out of 4.0)</div>
                            </div>
                            <div className="performance-details">
                              <div className="detail-row">
                                <span>Grade:</span>
                                <strong>
                                  {studentReport.dressingBehavior?.avgBehavior >= 3.5 ? 'Excellent' :
                                   studentReport.dressingBehavior?.avgBehavior >= 2.5 ? 'Good' :
                                   studentReport.dressingBehavior?.avgBehavior >= 1.5 ? 'Fair' : 'Needs Improvement'}
                                </strong>
                              </div>
                            </div>
                            {individualRankings?.rankings.behavior.rank && (
                              <div className="performance-rank">
                                Rank #{individualRankings.rankings.behavior.rank} of {individualRankings.rankings.behavior.total_students}
                              </div>
                            )}
                          </>
                        ) : (
                          <div style={{ textAlign: 'center', padding: 'var(--lg)', color: 'var(--muted)' }}>
                            <p>No behavior records yet</p>
                          </div>
                        )}
                      </div>
                    </div>
                    )}

                    {/* Punctuality */}
                    {(madrasahProfile?.enable_punctuality_grade !== 0 && madrasahProfile?.enable_punctuality_grade !== false) && (
                    <div className="performance-card">
                      <div className="performance-card-header">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <span>Punctuality</span>
                      </div>
                      <div className="performance-card-body">
                        {individualRankings?.rankings?.punctuality?.rank ? (
                          <>
                            <div className="performance-main-stat">
                              <div className="performance-big-number" style={{ color: studentReport.dressingBehavior?.avgPunctuality >= 3.5 ? '#404040' : studentReport.dressingBehavior?.avgPunctuality >= 2.5 ? '#525252' : '#737373' }}>
                                {studentReport.dressingBehavior?.avgPunctuality ? studentReport.dressingBehavior.avgPunctuality.toFixed(1) : '0.0'}
                              </div>
                              <div className="performance-label">Average Grade (out of 4.0)</div>
                            </div>
                            <div className="performance-details">
                              <div className="detail-row">
                                <span>Grade:</span>
                                <strong>
                                  {studentReport.dressingBehavior?.avgPunctuality >= 3.5 ? 'Excellent' :
                                   studentReport.dressingBehavior?.avgPunctuality >= 2.5 ? 'Good' :
                                   studentReport.dressingBehavior?.avgPunctuality >= 1.5 ? 'Fair' : 'Needs Improvement'}
                                </strong>
                              </div>
                            </div>
                            {individualRankings?.rankings.punctuality.rank && (
                              <div className="performance-rank">
                                Rank #{individualRankings.rankings.punctuality.rank} of {individualRankings.rankings.punctuality.total_students}
                              </div>
                            )}
                          </>
                        ) : (
                          <div style={{ textAlign: 'center', padding: 'var(--lg)', color: 'var(--muted)' }}>
                            <p>No punctuality records yet</p>
                          </div>
                        )}
                      </div>
                    </div>
                    )}
                  </div>

                  {/* School Overall Comment */}
                  <div className="report-card-comment">
                    <h3>School Overall Comment</h3>
                    {!isEditingComment ? (
                      <>
                        <div className="comment-display">
                          {selectedStudentForReport.notes || 'No comment added yet.'}
                        </div>
                        <button
                          className="btn btn-secondary btn-sm no-print"
                          onClick={() => setIsEditingComment(true)}
                          style={{ marginTop: '12px' }}
                        >
                          Edit Comment
                        </button>
                      </>
                    ) : (
                      <>
                        <textarea
                          className="comment-textarea"
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
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }} className="no-print">
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={async () => {
                              await updateStudentComment(selectedStudentForReport.id, selectedStudentForReport.notes);
                              setIsEditingComment(false);
                            }}
                          >
                            Save Comment
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setIsEditingComment(false)}
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Report Footer */}
                  <div className="report-card-footer">
                    <div className="powered-by">
                      <img src="/e-daarah-whitebg-logo.png" alt="e-daarah" className="footer-logo" />
                    </div>
                  </div>
                </div>
              )}

              {/* Student not selected message */}
              {reportSubTab === 'individual' && !studentReport && (
                <div className="card">
                  <div className="empty">
                    <p>Select a student to view their report</p>
                  </div>
                </div>
              )}

              {/* Teacher Activity Tab */}
              {reportSubTab === 'teacher-performance' && (
                <>
                  {selectedTeacherForDetail ? (
                    <div>
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setSelectedTeacherForDetail(null);
                          setTeacherDetailData(null);
                        }}
                        style={{ marginBottom: 'var(--md)' }}
                      >
                        Back to All Teachers
                      </button>

                      <h3 style={{ marginBottom: 'var(--md)' }}>
                        {selectedTeacherForDetail.first_name} {selectedTeacherForDetail.last_name}
                        {selectedTeacherForDetail.staff_id && (
                          <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 'var(--sm)' }}>
                            ({selectedTeacherForDetail.staff_id})
                          </span>
                        )}
                      </h3>

                      {teacherDetailLoading ? (
                        <div className="card">
                          <div className="card-body" style={{ textAlign: 'center', padding: 'var(--xl)' }}>
                            <p>Loading teacher details...</p>
                          </div>
                        </div>
                      ) : teacherDetailData ? (
                        <>
                          {/* Summary cards */}
                          <div className="insights-summary">
                            <div className="summary-card">
                              <div className="summary-value">{selectedTeacherForDetail.attendance_records}</div>
                              <div className="summary-label">Attendance Records</div>
                            </div>
                            <div className="summary-card">
                              <div className="summary-value">{selectedTeacherForDetail.exam_records}</div>
                              <div className="summary-label">Exam Records</div>
                            </div>
                            <div className="summary-card">
                              <div className="summary-value">{selectedTeacherForDetail.classes_assigned}</div>
                              <div className="summary-label">Classes Assigned</div>
                            </div>
                          </div>

                          <div className="insights-widgets">
                            {/* Recording Frequency */}
                            <div className="insight-widget">
                              <h4>Recording Frequency (Last 8 Weeks)</h4>
                              {teacherDetailData.recordingFrequency.length > 0 ? (
                                <div className="class-bars">
                                  {teacherDetailData.recordingFrequency.map(week => (
                                    <div key={week.year_week} className="class-bar-row">
                                      <span className="class-bar-label" style={{ width: '70px', fontSize: '12px' }}>
                                        {new Date(week.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                      </span>
                                      <div className="class-bar-container">
                                        <div
                                          className="class-bar-fill good"
                                          style={{ width: `${Math.min((week.days_recorded / 5) * 100, 100)}%` }}
                                        />
                                      </div>
                                      <span className="class-bar-value">{week.days_recorded}d</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No attendance recorded recently</p>
                              )}
                            </div>

                            {/* Class Attendance Rates */}
                            <div className="insight-widget">
                              <h4>Class Attendance Rates</h4>
                              {teacherDetailData.classAttendanceRates.length > 0 ? (
                                <div className="class-bars">
                                  {teacherDetailData.classAttendanceRates.map(cls => (
                                    <div key={cls.class_id} className="class-bar-row">
                                      <span className="class-bar-label">{cls.class_name}</span>
                                      <div className="class-bar-container">
                                        <div
                                          className={`class-bar-fill ${
                                            cls.attendance_rate >= 90 ? 'excellent' :
                                            cls.attendance_rate >= 80 ? 'good' :
                                            cls.attendance_rate >= 70 ? 'fair' : 'poor'
                                          }`}
                                          style={{ width: `${cls.attendance_rate || 0}%` }}
                                        />
                                      </div>
                                      <span className="class-bar-value">{cls.attendance_rate || 0}%</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No class data available</p>
                              )}
                            </div>
                          </div>

                          <div className="insights-widgets">
                            {/* Exams by Subject */}
                            <div className="insight-widget">
                              <h4>Exams Recorded by Subject</h4>
                              {teacherDetailData.examsBySubject.length > 0 ? (
                                <table className="table" style={{ fontSize: '13px' }}>
                                  <thead>
                                    <tr>
                                      <th>Subject</th>
                                      <th>Records</th>
                                      <th>Students</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {teacherDetailData.examsBySubject.map(subj => (
                                      <tr key={subj.subject}>
                                        <td>{subj.subject}</td>
                                        <td>{subj.exam_count}</td>
                                        <td>{subj.students_examined}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No exam records</p>
                              )}
                            </div>

                            {/* Average Scores */}
                            <div className="insight-widget">
                              <h4>Average Student Scores</h4>
                              {teacherDetailData.avgScoresByClassSubject.length > 0 ? (
                                <table className="table" style={{ fontSize: '13px' }}>
                                  <thead>
                                    <tr>
                                      <th>Class</th>
                                      <th>Subject</th>
                                      <th>Avg %</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {teacherDetailData.avgScoresByClassSubject.map((row, i) => (
                                      <tr key={i}>
                                        <td>{row.class_name}</td>
                                        <td>{row.subject}</td>
                                        <td>{row.avg_percentage}%</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No exam scores available</p>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="card">
                          <div className="empty">
                            <p>Unable to load teacher details. Please try again.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {teacherPerformanceLoading ? (
                        <div className="card">
                          <div className="card-body" style={{ textAlign: 'center', padding: 'var(--xl)' }}>
                            <p>Loading teacher performance data...</p>
                          </div>
                        </div>
                      ) : teacherPerformanceData && teacherPerformanceData.teachers.length > 0 ? (
                        <SortableTable
                          columns={[
                            { key: 'name', label: 'Teacher', sortable: true, render: (row) => `${row.first_name} ${row.last_name}` },
                            { key: 'staff_id', label: 'Staff ID', sortable: true },
                            { key: 'classes_assigned', label: 'Classes', sortable: true, sortType: 'number' },
                            { key: 'attendance_records', label: 'Attendance', sortable: true, sortType: 'number' },
                            { key: 'exam_records', label: 'Exams', sortable: true, sortType: 'number' },
                            {
                              key: 'last_activity',
                              label: 'Last Active',
                              sortable: true,
                              sortType: 'date',
                              render: (row) => {
                                if (!row.last_activity || new Date(row.last_activity).getFullYear() <= 1970) return 'Never';
                                return new Date(row.last_activity).toLocaleDateString();
                              }
                            },
                            {
                              key: 'activity_status',
                              label: 'Status',
                              sortable: true,
                              render: (row) => (
                                <span className={`status-badge ${row.activity_status === 'Active' ? 'active' : row.activity_status === 'Inactive' ? 'inactive' : 'none'}`}>
                                  {row.activity_status}
                                </span>
                              )
                            }
                          ]}
                          data={teacherPerformanceData.teachers}
                          searchable={true}
                          searchPlaceholder="Search teachers..."
                          searchKeys={['first_name', 'last_name', 'staff_id']}
                          pagination={true}
                          pageSize={10}
                          onRowClick={(teacher) => {
                            setSelectedTeacherForDetail(teacher);
                            fetchTeacherDetail(teacher.id);
                          }}
                          emptyMessage="No teachers found"
                        />
                      ) : (
                        <div className="card">
                          <div className="empty">
                            <p>No teachers found. Add teachers to see their performance metrics.</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}

          {/* Support Tab */}
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
                              <td style={{ fontSize: '13px', color: '#666' }}>{new Date(t.updated_at).toLocaleDateString()}</td>
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
                                {t.message_count} message{t.message_count !== 1 ? 's' : ''} · {new Date(t.updated_at).toLocaleDateString()}
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

              {/* Attendance Features */}
              <div className="card" style={{ marginTop: '20px' }}>
                <h3>Attendance Features</h3>
                <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>
                  Choose which grading fields teachers see when recording attendance.
                </p>
                <div style={{ display: 'grid', gap: '16px', maxWidth: '400px' }}>
                  <div className="setting-toggle-row">
                    <div className="setting-toggle-info">
                      <span className="setting-toggle-label">Dressing Grade</span>
                      <p className="setting-toggle-desc">
                        Teachers grade student dressing (Excellent / Good / Fair / Poor)
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
                          const res = await api.put('/admin/settings', { enable_dressing_grade: newValue });
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
                        Teachers grade student behavior (Excellent / Good / Fair / Poor)
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
                          const res = await api.put('/admin/settings', { enable_behavior_grade: newValue });
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
                        Teachers grade student punctuality (Excellent / Good / Fair / Poor)
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
                          const res = await api.put('/admin/settings', { enable_punctuality_grade: newValue });
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
                        Enable Qur'an memorization and recitation progress tracking for teachers
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
                          const res = await api.put('/admin/settings', { enable_quran_tracking: newValue });
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
                </div>
              </div>

              {/* Account Info */}
              <div className="card" style={{ marginTop: '20px' }}>
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
                    <p style={{ margin: '4px 0 0 0', textTransform: 'capitalize' }}>{user?.role || 'Admin'}</p>
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
                      <label style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Institution Type</label>
                      <p style={{ margin: '4px 0 0 0', textTransform: 'capitalize' }}>
                        {madrasahProfile.institution_type?.replace(/_/g, ' ') || 'Not specified'}
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
                      <label style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Verification Status</label>
                      <p style={{ margin: '4px 0 0 0' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: madrasahProfile.verification_status === 'fully_verified' ? '#f5f5f5' :
                            madrasahProfile.verification_status === 'basic_verified' ? '#f5f5f5' : '#f5f5f5',
                          color: madrasahProfile.verification_status === 'fully_verified' ? '#404040' :
                            madrasahProfile.verification_status === 'basic_verified' ? '#525252' : '#737373'
                        }}>
                          {madrasahProfile.verification_status?.replace(/_/g, ' ') || 'Unverified'}
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
                  {madrasahProfile.usage && (
                    <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>Current Usage</h4>
                      <div style={{ display: 'flex', gap: '24px' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '24px', fontWeight: '600' }}>{madrasahProfile.usage.students}</div>
                          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Students</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '24px', fontWeight: '600' }}>{madrasahProfile.usage.teachers}</div>
                          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Teachers</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '24px', fontWeight: '600' }}>{madrasahProfile.usage.classes}</div>
                          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Classes</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Billing & Subscription */}
              <div className="card" style={{ marginTop: '20px' }}>
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
                        backgroundColor: madrasahProfile?.subscription_status === 'active' ? '#f5f5f5' :
                          madrasahProfile?.subscription_status === 'trialing' ? '#f5f5f5' :
                          madrasahProfile?.subscription_status === 'past_due' ? '#f5f5f5' : '#f5f5f5',
                        color: madrasahProfile?.subscription_status === 'active' ? '#404040' :
                          madrasahProfile?.subscription_status === 'trialing' ? '#525252' :
                          madrasahProfile?.subscription_status === 'past_due' ? '#737373' : '#525252'
                      }}>
                        {madrasahProfile?.subscription_status || 'trialing'}
                      </span>
                    </div>
                  </div>

                  {/* Plan Selection */}
                  {madrasahProfile?.pricing_plan === 'enterprise' ? (
                    <div style={{ marginTop: '16px', padding: '20px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--lighter)', textAlign: 'center' }}>
                      <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Enterprise Plan</div>
                      <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '0 0 12px 0' }}>
                        Your plan is managed under a service agreement. For changes or questions, contact your account manager.
                      </p>
                      <a href="mailto:support@e-daarah.com?subject=Enterprise%20Account%20Inquiry" style={{ color: 'var(--accent)', fontSize: '14px', fontWeight: '500' }}>
                        Contact Support →
                      </a>
                    </div>
                  ) : (
                  <div style={{ marginTop: '16px', padding: '16px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>Choose a Plan</h4>

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

                    {/* Plan Options */}
                    <div className="plan-options-grid">
                      {/* Standard Plan */}
                      <div
                        onClick={() => setSelectedPlan('standard')}
                        style={{
                          padding: '16px',
                          border: selectedPlan === 'standard' ? '2px solid var(--accent)' : '1px solid var(--border)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          background: selectedPlan === 'standard' ? 'var(--lighter)' : 'white'
                        }}
                      >
                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>Standard</div>
                        <div style={{ fontSize: '24px', fontWeight: '600' }}>
                          ${billingCycle === 'monthly' ? '12' : '120'}
                          <span style={{ fontSize: '14px', fontWeight: '400', color: 'var(--muted)' }}>
                            /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px' }}>
                          100 students, 20 teachers
                        </div>
                      </div>

                      {/* Plus Plan */}
                      <div
                        onClick={() => setSelectedPlan('plus')}
                        style={{
                          padding: '16px',
                          border: selectedPlan === 'plus' ? '2px solid var(--accent)' : '1px solid var(--border)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          background: selectedPlan === 'plus' ? 'var(--lighter)' : 'white',
                          position: 'relative'
                        }}
                      >
                        <span style={{
                          position: 'absolute',
                          top: '-10px',
                          right: '12px',
                          background: 'var(--accent)',
                          color: 'white',
                          fontSize: '11px',
                          fontWeight: '600',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                        }}>Popular</span>
                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>Plus</div>
                        <div style={{ fontSize: '24px', fontWeight: '600' }}>
                          ${billingCycle === 'monthly' ? '29' : '290'}
                          <span style={{ fontSize: '14px', fontWeight: '400', color: 'var(--muted)' }}>
                            /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px' }}>
                          500 students, 50 teachers
                        </div>
                      </div>
                    </div>

                    {/* Subscribe Button */}
                    <button
                      className="btn primary"
                      style={{ width: '100%', marginTop: '16px' }}
                      onClick={async () => {
                        try {
                          const priceKey = `${selectedPlan}_${billingCycle}`;
                          const response = await api.post('/billing/create-checkout', {
                            priceKey,
                            successUrl: `${window.location.origin}/${madrasahSlug}/admin?billing=success`,
                            cancelUrl: `${window.location.origin}/${madrasahSlug}/admin?billing=canceled`
                          });
                          window.location.href = response.data.url;
                        } catch (error) {
                          toast.error(error.response?.data?.error || 'Failed to start checkout');
                        }
                      }}
                    >
                      {madrasahProfile?.subscription_status === 'active' ? 'Change Plan' : 'Subscribe Now'}
                    </button>
                  </div>
                  )}

                  {/* Manage Billing */}
                  {madrasahProfile?.stripe_customer_id && (
                    <button
                      className="btn secondary"
                      style={{ marginTop: '12px' }}
                      onClick={async () => {
                        try {
                          const response = await api.post('/billing/customer-portal', {
                            returnUrl: `${window.location.origin}/${madrasahSlug}/admin`
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

                  <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '12px 0 0 0' }}>
                    View our <a href="/pricing" target="_blank" style={{ color: 'var(--accent)' }}>pricing page</a> for full feature comparison.
                  </p>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Parent Access Code Modal */}
      {accessCodeModal && (
        <div className="modal-overlay" onClick={() => setAccessCodeModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Parent Access Code</h3>
              <button onClick={() => setAccessCodeModal(null)} className="modal-close">×</button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center' }}>
              <p style={{ marginBottom: '12px' }}>
                <strong>{accessCodeModal.studentName}</strong>
                <br />
                <span style={{ color: 'var(--muted)' }}>Student ID: {accessCodeModal.studentId}</span>
              </p>
              <div style={{
                background: 'var(--bg)', 
                border: '2px dashed var(--accent)',
                borderRadius: '8px', 
                padding: '16px',
                margin: '12px 0',
                fontSize: '28px',
                fontWeight: '700',
                letterSpacing: '6px',
                fontFamily: 'monospace'
              }}>
                {accessCodeModal.accessCode}
              </div>
              <p style={{ fontSize: '13px', color: '#0a0a0a', margin: '12px 0' }}>
                ⚠️ Save this code now — it cannot be retrieved later.
                <br />Share it with the parent/guardian for portal access.
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(accessCodeModal.accessCode);
                  toast.success('Access code copied to clipboard');
                }}
                className="btn btn-secondary"
                style={{ marginRight: '8px' }}
              >
                📋 Copy Code
              </button>
              <button onClick={() => setAccessCodeModal(null)} className="btn btn-primary">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
