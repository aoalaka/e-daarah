import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../../services/api';
import { authService } from '../../services/auth.service';
import SortableTable from '../../components/SortableTable';
import EmailVerificationBanner from '../../components/EmailVerificationBanner';
import DemoBanner from '../../components/DemoBanner';
import AnnouncementBanner from '../../components/AnnouncementBanner';
import GuidedTour from '../../components/GuidedTour';
import {
  HomeIcon,
  ClipboardDocumentCheckIcon,
  BookOpenIcon,
  DocumentTextIcon,
  UserGroupIcon,
  QuestionMarkCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  UserIcon,
  LockClosedIcon,
  Cog6ToothIcon,
  ArrowRightStartOnRectangleIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import BottomTabBar from '../../components/BottomTabBar';
import QuranSessionRecorder from '../../components/QuranSessionRecorder';
import { addToSyncQueue, cacheData, getCachedData } from '../../utils/offlineStore';
import OfflineBanner from '../../components/OfflineBanner';
import '../admin/Dashboard.css';

function TeacherDashboard() {
  // Format date as "01 Sep 2025"
  const fmtDate = (d) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Helper to get local date in YYYY-MM-DD format
  const getLocalDate = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  // Browser tab title
  useEffect(() => {
    const labels = { overview: 'Overview', attendance: 'Attendance', exams: 'Exams', reports: 'Reports', quran: 'Learning', availability: 'Availability', help: 'Help', settings: 'Settings' };
    document.title = `${labels[activeTab] || 'Dashboard'} — E-Daarah`;
  }, [activeTab]);

  // Keyboard shortcut: "/" to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        const input = document.querySelector('.table-search-input') || document.querySelector('.mobile-cards-search input');
        input?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [confirmModal, setConfirmModal] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState(getLocalDate());
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [saving, setSaving] = useState(false);
  const [examPerformance, setExamPerformance] = useState([]);
  const [showExamModal, setShowExamModal] = useState(false);
  const [examForm, setExamForm] = useState({
    session_id: '',
    semester_id: '',
    subject: '',
    exam_date: getLocalDate(),
    max_score: 100,
    students: []
  });
  const [activeSession, setActiveSession] = useState(null);
  const [activeSemester, setActiveSemester] = useState(null);
  const [schedulingMode, setSchedulingMode] = useState('academic');
  const [activeCohorts, setActiveCohorts] = useState([]);
  const [activePeriods, setActivePeriods] = useState([]);
  const [selectedCohortPeriod, setSelectedCohortPeriod] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [examKpis, setExamKpis] = useState(null);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [attendanceSubTab, setAttendanceSubTab] = useState('record');
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [historyClass, setHistoryClass] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);
  const [examFilterSession, setExamFilterSession] = useState('');
  const [examFilterSemester, setExamFilterSemester] = useState('');
  const [examFilteredSemesters, setExamFilteredSemesters] = useState([]);
  const [examFilterCohortPeriod, setExamFilterCohortPeriod] = useState('');
  const [examStudentSearch, setExamStudentSearch] = useState('');
  const [showEditExamModal, setShowEditExamModal] = useState(false);
  const [editingExamRecord, setEditingExamRecord] = useState(null);
  const [deleteExamId, setDeleteExamId] = useState(null);
  const [showEditExamBatchModal, setShowEditExamBatchModal] = useState(false);
  const [editingExamBatch, setEditingExamBatch] = useState(null);
  const [deleteExamBatch, setDeleteExamBatch] = useState(null);
  // Exam performance pagination
  const [currentSubjectPage, setCurrentSubjectPage] = useState(1);
  const subjectsPerPage = 1; // Show one subject at a time
  // Exam Reports state
  const [studentReports, setStudentReports] = useState([]);
  const [reportFilterSession, setReportFilterSession] = useState('');
  const [reportFilterSemester, setReportFilterSemester] = useState('');
  const [reportFilteredSemesters, setReportFilteredSemesters] = useState([]);
  const [reportFilterCohortPeriod, setReportFilterCohortPeriod] = useState('');
  const [reportFilterSubject, setReportFilterSubject] = useState('all');
  const [reportAvailableSubjects, setReportAvailableSubjects] = useState([]);
  // Settings state
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [madrasahProfile, setMadrasahProfile] = useState(null);
  // Quran Progress state
  const [quranRecords, setQuranRecords] = useState([]);
  const [quranPositions, setQuranPositions] = useState([]);
  const [quranSubTab, setQuranSubTab] = useState('record');
  const [quranSelectedStudent, setQuranSelectedStudent] = useState(null);
  const [quranStudentPosition, setQuranStudentPosition] = useState(null);
  const [quranStudentHistory, setQuranStudentHistory] = useState([]);
  const [quranSessionType, setQuranSessionType] = useState('tilawah'); // 'hifz', 'tilawah', 'revision'
  const [quranSurah, setQuranSurah] = useState('');
  const [quranAyahFrom, setQuranAyahFrom] = useState('');
  const [quranAyahTo, setQuranAyahTo] = useState('');
  const [quranGrade, setQuranGrade] = useState('Good');
  const [quranPassed, setQuranPassed] = useState(true);
  const [quranNotes, setQuranNotes] = useState('');
  const [quranSaving, setQuranSaving] = useState(false);
  const [quranDate, setQuranDate] = useState(getLocalDate());
  const [surahs, setSurahs] = useState([]);
  // School day validation state
  const [schoolDayInfo, setSchoolDayInfo] = useState(null);
  const [attendanceDateWarning, setAttendanceDateWarning] = useState('');
  // Mobile two-phase attendance UI
  const [mobileAttendancePhase, setMobileAttendancePhase] = useState(1);
  // Overview state
  const [overviewData, setOverviewData] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  // Fee tracking state
  const [teacherFeeSummary, setTeacherFeeSummary] = useState([]);
  const [teacherFeeClassFilter, setTeacherFeeClassFilter] = useState('');
  const [showTour, setShowTour] = useState(false);
  const [helpExpanded, setHelpExpanded] = useState(new Set());
  // Availability state
  const [availabilityWeekStart, setAvailabilityWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay()); // start of current week (Sunday)
    return getLocalDate(d);
  });
  const [availabilityData, setAvailabilityData] = useState([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityReason, setAvailabilityReason] = useState('');
  const [availabilityReasonDate, setAvailabilityReasonDate] = useState(null);
  // Learning tab sub-tab: 'quran' | 'courses'
  const [learningSubTab, setLearningSubTab] = useState('quran');
  // Course tracking state
  const [classCourses, setClassCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseUnits, setCourseUnits] = useState([]);
  const [courseProgress, setCourseProgress] = useState([]);
  const [courseProgressLoading, setCourseProgressLoading] = useState(false);
  const [selectedCourseUnit, setSelectedCourseUnit] = useState(null);
  const [courseProgressForm, setCourseProgressForm] = useState({ student_id: '', date: '', grade: 'Good', passed: true, notes: '' });
  const [savingCourseProgress, setSavingCourseProgress] = useState(false);
  const [showCourseProgressForm, setShowCourseProgressForm] = useState(false);
  const user = authService.getCurrentUser();
  const { madrasahSlug } = useParams();

  const navGroups = [
    { items: [{ id: 'overview', label: 'Overview' }] },
    { label: 'Teach', items: [
      { id: 'attendance', label: 'Attendance' },
      ...(madrasahProfile?.enable_learning_tracker !== 0 && madrasahProfile?.enable_learning_tracker !== false ? [{ id: 'quran', label: 'Learning' }] : []),
      { id: 'exams', label: 'Exam Recording' },
    ]},
    { label: 'Reports', items: [
      { id: 'reports', label: 'Exam Reports' },
    ]},
    { items: [
      { id: 'availability', label: 'Availability' },
    ]},
    { label: 'Help', items: [
      { id: 'help', label: 'Help' },
    ]},
  ];

  // Primary tabs for mobile bottom bar
  const bottomTabIds = ['overview', 'attendance', ...(madrasahProfile?.enable_learning_tracker !== 0 && madrasahProfile?.enable_learning_tracker !== false ? ['quran'] : []), 'exams'];
  const isBottomTab = bottomTabIds.includes(activeTab);

  // Close mobile menu when tab changes
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  const formatCurrency = (amount) => {
    const cur = madrasahProfile?.currency || 'USD';
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur }).format(amount); }
    catch { return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(amount); }
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

  // Helper to check if the account is in read-only mode (expired trial or inactive subscription)
  const isReadOnly = () => {
    if (!madrasahProfile) return false;
    const status = madrasahProfile.subscription_status;
    if (status === 'trialing') {
      const trialEndsAt = madrasahProfile.trial_ends_at;
      if (trialEndsAt && new Date(trialEndsAt) <= new Date()) return true;
    }
    if (status === 'canceled' || status === 'expired' || status === 'past_due') return true;
    return false;
  };

  useEffect(() => {
    fetchSessions();
    fetchClasses();
    fetchActiveSessionSemester();
    fetchMadrasahInfo();
    fetchSurahList();
    fetchSchoolDayInfo();
    fetchOverview();
  }, []);

  // Auto-trigger guided tour for first-time teachers
  useEffect(() => {
    if (overviewData && !localStorage.getItem('tour_teacher_done')) {
      const timer = setTimeout(() => setShowTour(true), 800);
      return () => clearTimeout(timer);
    }
  }, [overviewData]);

  const teacherTourSteps = [
    { target: '.sidebar-nav', title: 'Navigation', content: 'Switch between Overview, Attendance, Exam Recording, and Reports.' },
    { target: '.today-classes-grid', title: "Your Classes", content: 'See your assigned classes, student count, and quickly take attendance from here.' },
    { target: '[data-tour="attendance"]', title: 'Mark Attendance', content: 'Select a class and date to mark student attendance, dressing, behavior, and punctuality.' },
    { target: '[data-tour="exams"]', title: 'Record Exams', content: 'Enter exam scores for your classes after each assessment.' },
    { target: '[data-tour="reports"]', title: 'View Reports', content: 'View and export exam results for your classes.' },
  ];

  // Refresh overview when tab becomes active
  useEffect(() => {
    if (activeTab === 'overview') {
      fetchOverview();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'overview' && madrasahProfile?.enable_fee_tracking) fetchTeacherFeeSummary();
  }, [activeTab, teacherFeeClassFilter, madrasahProfile?.enable_fee_tracking]);

  // Re-fetch school day info when class changes (class may have its own school days)
  useEffect(() => {
    fetchSchoolDayInfo(selectedClass?.id || null);
  }, [selectedClass?.id]);

  // Validate attendance date against school day rules
  useEffect(() => {
    validateAttendanceDate(attendanceDate);
  }, [attendanceDate, schoolDayInfo]);

  useEffect(() => {
    const hasPeriodContext = schedulingMode === 'cohort' ? !!selectedCohortPeriod : !!selectedSemester;
    if (selectedClass && hasPeriodContext) {
      fetchStudents();
      fetchAttendance();
    }
  }, [selectedClass, selectedSemester, selectedCohortPeriod, schedulingMode, attendanceDate]);

  // Fetch Qur'an data when class changes and quran tab is active
  useEffect(() => {
    if (selectedClass && activeTab === 'quran') {
      fetchQuranPositions(selectedClass.id);
      if (activeSemester) {
        fetchQuranProgress(selectedClass.id);
      }
      // Reset student selection when class changes
      setQuranSelectedStudent(null);
      setQuranStudentPosition(null);
      setQuranStudentHistory([]);
      // Fetch courses for this class
      fetchClassCourses(selectedClass.id);
    }
  }, [selectedClass, activeTab]);

  // Fetch course progress when selected course or period changes
  useEffect(() => {
    if (selectedClass && selectedCourse && activeTab === 'quran' && learningSubTab === 'courses') {
      fetchCourseProgress(selectedClass.id, selectedCourse.id);
    }
  }, [selectedCourse, activeSemester, selectedCohortPeriod, learningSubTab]);

  // Fetch exam performance when class, semester, or subject filter changes
  useEffect(() => {
    if (selectedClass && activeTab === 'exams') {
      fetchExamPerformance();
      setCurrentSubjectPage(1); // Reset to first page when filters change
    }
  }, [selectedClass, examFilterSession, examFilterSemester, examFilterCohortPeriod, selectedSubject, activeTab]);

  // Filter semesters by selected session for exam tab
  useEffect(() => {
    if (examFilterSession) {
      const filtered = semesters.filter(sem => sem.session_id === parseInt(examFilterSession));
      setExamFilteredSemesters(filtered);
      // Reset semester selection if it doesn't belong to the selected session
      if (examFilterSemester && !filtered.find(s => s.id === parseInt(examFilterSemester))) {
        setExamFilterSemester('');
      }
      // Reset subject filter when session changes
      setSelectedSubject('all');
    } else {
      setExamFilteredSemesters(semesters);
    }
  }, [examFilterSession, semesters]);

  // Filter semesters by selected session for reports tab
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

  // Fetch student reports when filters change
  useEffect(() => {
    if (selectedClass && activeTab === 'reports') {
      fetchStudentReports();
    }
  }, [selectedClass, reportFilterSession, reportFilterSemester, reportFilterCohortPeriod, reportFilterSubject, activeTab]);

  // Fetch all students for overview when classes are loaded
  useEffect(() => {
    if (classes.length > 0) {
      fetchAllStudents();
    }
  }, [classes]);

  // Fetch attendance history when switching to view tab or changing class/semester
  useEffect(() => {
    if (activeTab === 'attendance' && attendanceSubTab === 'view' && historyClass && selectedSemester) {
      fetchAttendanceHistory();
    }
  }, [activeTab, attendanceSubTab, historyClass, selectedSemester]);

  // Fetch availability when tab or week changes
  useEffect(() => {
    if (activeTab === 'availability') {
      fetchAvailability();
    }
  }, [activeTab, availabilityWeekStart]);

  const fetchAvailability = async () => {
    setAvailabilityLoading(true);
    try {
      const start = new Date(availabilityWeekStart + 'T00:00:00');
      const end = new Date(start);
      end.setDate(end.getDate() + 27); // 4 weeks
      const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
      const response = await api.get(`/teacher/availability?start_date=${availabilityWeekStart}&end_date=${endStr}`);
      setAvailabilityData(response.data);
    } catch (error) {
      console.error('Failed to fetch availability:', error);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const toggleAvailability = async (dateStr, currentStatus) => {
    const newStatus = currentStatus === 'unavailable' ? 'available' : 'unavailable';

    if (newStatus === 'unavailable') {
      setAvailabilityReasonDate(dateStr);
      setAvailabilityReason('');
      return;
    }

    try {
      await api.put('/teacher/availability', { date: dateStr, status: newStatus });
      setAvailabilityData(prev => prev.filter(r => r.date?.split('T')[0] !== dateStr));
      toast.success('Marked as available');
    } catch (error) {
      toast.error('Failed to update availability');
    }
  };

  const confirmUnavailable = async () => {
    if (!availabilityReasonDate) return;
    try {
      await api.put('/teacher/availability', {
        date: availabilityReasonDate,
        status: 'unavailable',
        reason: availabilityReason || null,
      });
      setAvailabilityData(prev => {
        const filtered = prev.filter(r => r.date?.split('T')[0] !== availabilityReasonDate);
        return [...filtered, { date: availabilityReasonDate, status: 'unavailable', reason: availabilityReason || null }];
      });
      setAvailabilityReasonDate(null);
      setAvailabilityReason('');
      toast.success('Marked as unavailable');
    } catch (error) {
      toast.error('Failed to update availability');
    }
  };

  const getAvailabilityDays = () => {
    const days = [];
    const start = new Date(availabilityWeekStart + 'T00:00:00');
    const plannerAware = madrasahProfile?.availability_planner_aware === 1 || madrasahProfile?.availability_planner_aware === true;

    // Compute union of school days from all assigned classes (or fall back to session default from schoolDayInfo)
    let effectiveSchoolDays = [];
    if (plannerAware && classes.length > 0) {
      const daySet = new Set();
      classes.forEach(cls => {
        const cd = typeof cls.school_days === 'string' ? JSON.parse(cls.school_days || '[]') : (cls.school_days || []);
        if (Array.isArray(cd)) cd.forEach(d => daySet.add(d));
      });
      effectiveSchoolDays = daySet.size > 0 ? [...daySet] : (schoolDayInfo?.schoolDays || []);
    } else if (plannerAware) {
      effectiveSchoolDays = schoolDayInfo?.schoolDays || [];
    }

    const holidays = plannerAware ? (schoolDayInfo?.holidays || []) : [];
    const overrides = plannerAware ? (schoolDayInfo?.overrides || []) : [];

    // Session date boundaries
    const sessionStart = plannerAware && schoolDayInfo?.sessionStart
      ? new Date((typeof schoolDayInfo.sessionStart === 'string' ? schoolDayInfo.sessionStart.split('T')[0] : new Date(schoolDayInfo.sessionStart).toISOString().split('T')[0]) + 'T00:00:00')
      : null;
    const sessionEnd = plannerAware && schoolDayInfo?.sessionEnd
      ? new Date((typeof schoolDayInfo.sessionEnd === 'string' ? schoolDayInfo.sessionEnd.split('T')[0] : new Date(schoolDayInfo.sessionEnd).toISOString().split('T')[0]) + 'T00:00:00')
      : null;

    for (let i = 0; i < 28; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const record = availabilityData.find(r => r.date?.split('T')[0] === dateStr);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });

      let isHoliday = false;
      let holidayTitle = '';
      let isNonSchoolDay = false;
      let isOutsideSession = false;

      if (plannerAware) {
        // Check if date falls outside the active session period
        if (sessionStart && sessionEnd && (d < sessionStart || d > sessionEnd)) {
          isOutsideSession = true;
          isNonSchoolDay = true;
        } else {
          // Check holidays
          const holiday = holidays.find(h => {
            const hs = new Date((h.start_date?.split('T')[0] || h.start_date) + 'T00:00:00');
            const he = new Date((h.end_date?.split('T')[0] || h.end_date) + 'T00:00:00');
            return d >= hs && d <= he;
          });
          if (holiday) {
            isHoliday = true;
            holidayTitle = holiday.title;
          } else {
            // Check schedule override
            const override = overrides.find(o => {
              const os = new Date((o.start_date?.split('T')[0] || o.start_date) + 'T00:00:00');
              const oe = new Date((o.end_date?.split('T')[0] || o.end_date) + 'T00:00:00');
              return d >= os && d <= oe;
            });
            if (override) {
              const overrideDays = typeof override.school_days === 'string' ? JSON.parse(override.school_days) : override.school_days;
              if (!overrideDays.includes(dayName)) isNonSchoolDay = true;
            } else if (effectiveSchoolDays.length > 0 && !effectiveSchoolDays.includes(dayName)) {
              isNonSchoolDay = true;
            }
          }
        }
      }

      days.push({
        date: dateStr,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        fullDayName: dayName,
        dayNum: d.getDate(),
        month: d.toLocaleDateString('en-US', { month: 'short' }),
        status: record?.status || 'available',
        reason: record?.reason || null,
        isPast: d < new Date(getLocalDate() + 'T00:00:00'),
        isHoliday,
        holidayTitle,
        isNonSchoolDay,
        isOutsideSession,
      });
    }
    return days;
  };

  const fetchAttendanceHistory = async () => {
    if (!historyClass) return;
    try {
      let params = '';
      if (schedulingMode === 'cohort') {
        params = selectedCohortPeriod ? `?cohort_period_id=${selectedCohortPeriod.id}` : '';
      } else {
        params = selectedSemester ? `?semester_id=${selectedSemester.id}` : '';
      }
      const response = await api.get(`/teacher/classes/${historyClass.id}/attendance-history${params}`);
      setAttendanceHistory(response.data);
    } catch (error) {
      console.error('Failed to fetch attendance history:', error);
      toast.error('Failed to load attendance history');
      setAttendanceHistory([]);
    }
  };

  const fetchSessions = async () => {
    try {
      // Fetch both sessions and semesters
      const [sessionsRes, semestersRes] = await Promise.all([
        api.get('/teacher/sessions'),
        api.get('/teacher/semesters')
      ]);
      
      const sessionsData = sessionsRes.data || [];
      const semestersData = semestersRes.data || [];
      
      console.log('Raw sessions data:', sessionsData);
      console.log('Raw semesters data:', semestersData);
      
      setSessions(sessionsData);
      setSemesters(semestersData);
      cacheData('teacher-sessions', sessionsData);
      cacheData('teacher-semesters', semestersData);

      // Auto-select active semester
      const activeSemester = semestersData.find(s => {
        const isActive = s.is_active === 1 || s.is_active === true || s.is_active === '1';
        console.log(`Checking semester ${s.name}: is_active=${s.is_active}, matches=${isActive}`);
        return isActive;
      });
      
      console.log('Active semester found:', activeSemester);
      
      if (activeSemester) {
        console.log('Setting active semester:', {
          id: activeSemester?.id,
          name: activeSemester.name,
          session_name: activeSemester.session_name,
          is_active: activeSemester.is_active
        });
        setSelectedSemester(activeSemester);
      } else if (semestersData.length > 0) {
        console.log('No active semester found, using first semester');
        setSelectedSemester(semestersData[0]);
      } else {
        console.log('No semesters available');
        toast.error('No semesters available');
      }
    } catch (error) {
      console.error('Failed to fetch sessions/semesters:', error);
      if (!error.response) {
        const [cachedSessions, cachedSemesters] = await Promise.all([
          getCachedData('teacher-sessions'),
          getCachedData('teacher-semesters')
        ]);
        if (cachedSessions) setSessions(cachedSessions.data);
        if (cachedSemesters) {
          setSemesters(cachedSemesters.data);
          const activeSemester = cachedSemesters.data.find(s => {
            return s.is_active === 1 || s.is_active === true || s.is_active === '1';
          });
          if (activeSemester) {
            setSelectedSemester(activeSemester);
          } else if (cachedSemesters.data.length > 0) {
            setSelectedSemester(cachedSemesters.data[0]);
          }
        }
      }
      if (!error.response) return;
      toast.error('Failed to load semesters');
    }
  };

  const fetchActiveSessionSemester = async () => {
    try {
      const response = await api.get('/teacher/active-session-semester');
      const data = response.data;
      setSchedulingMode(data.scheduling_mode || 'academic');
      if (data.scheduling_mode === 'cohort') {
        setActiveCohorts(data.cohorts || []);
        setActivePeriods(data.periods || []);
        setActiveSession(null);
        setActiveSemester(null);
        // Auto-select first active period if none selected
        if ((data.periods || []).length > 0 && !selectedCohortPeriod) {
          setSelectedCohortPeriod(data.periods[0]);
        }
      } else {
        setActiveSession(data.session);
        setActiveSemester(data.semester);
        setActiveCohorts([]);
        setActivePeriods([]);
      }
      cacheData('teacher-active-session-semester', data);
    } catch (error) {
      console.error('Failed to fetch active session/semester:', error);
      if (!error.response) {
        const cached = await getCachedData('teacher-active-session-semester');
        if (cached) {
          const data = cached.data;
          setSchedulingMode(data.scheduling_mode || 'academic');
          if (data.scheduling_mode === 'cohort') {
            setActiveCohorts(data.cohorts || []);
            setActivePeriods(data.periods || []);
          } else {
            setActiveSession(data.session);
            setActiveSemester(data.semester);
          }
        }
      }
    }
  };

  const fetchSchoolDayInfo = async (classId = null) => {
    const cacheKey = `school-day-info-${classId || 'default'}`;
    try {
      const params = classId ? `?classId=${classId}` : '';
      const response = await api.get(`/teacher/school-day-info${params}`);
      setSchoolDayInfo(response.data);
      cacheData(cacheKey, response.data);
    } catch (error) {
      console.error('Failed to fetch school day info:', error);
      if (!error.response) {
        const cached = await getCachedData(cacheKey);
        if (cached) setSchoolDayInfo(cached);
      }
    }
  };

  const validateAttendanceDate = (dateStr) => {
    if (!schoolDayInfo || !dateStr) {
      setAttendanceDateWarning('');
      return;
    }
    const { schoolDays, holidays, overrides } = schoolDayInfo;
    const date = new Date(dateStr + 'T00:00:00');
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

    // Check if date falls on a holiday
    const holiday = holidays?.find(h => {
      const start = new Date(h.start_date.split('T')[0] + 'T00:00:00');
      const end = new Date(h.end_date.split('T')[0] + 'T00:00:00');
      return date >= start && date <= end;
    });
    if (holiday) {
      setAttendanceDateWarning(`This date falls on a holiday: ${holiday.title}`);
      return;
    }

    // Check schedule override first
    const override = overrides?.find(o => {
      const start = new Date(o.start_date.split('T')[0] + 'T00:00:00');
      const end = new Date(o.end_date.split('T')[0] + 'T00:00:00');
      return date >= start && date <= end;
    });

    if (override) {
      const overrideDays = typeof override.school_days === 'string' ? JSON.parse(override.school_days) : override.school_days;
      if (!overrideDays.includes(dayName)) {
        setAttendanceDateWarning(`${dayName} is not a school day during "${override.title}" (${overrideDays.map(d => d.substring(0, 3)).join(', ')})`);
        return;
      }
    } else if (schoolDays && schoolDays.length > 0) {
      if (!schoolDays.includes(dayName)) {
        setAttendanceDateWarning(`${dayName} is not a scheduled school day (${schoolDays.map(d => d.substring(0, 3)).join(', ')})`);
        return;
      }
    }

    setAttendanceDateWarning('');
  };

  const fetchMadrasahInfo = async () => {
    try {
      const response = await api.get('/teacher/madrasah-info');
      setMadrasahProfile(response.data);
      cacheData('teacher-madrasah-info', response.data);
    } catch (error) {
      console.error('Failed to fetch madrasah info:', error);
      if (!error.response) {
        const cached = await getCachedData('teacher-madrasah-info');
        if (cached) setMadrasahProfile(cached.data);
      }
    }
  };

  const fetchSurahList = async () => {
    try {
      const response = await api.get('/teacher/quran/surahs');
      setSurahs(response.data);
      cacheData('teacher-surahs', response.data);
    } catch (error) {
      console.error('Failed to fetch surahs:', error);
      if (!error.response) {
        const cached = await getCachedData('teacher-surahs');
        if (cached) setSurahs(cached.data);
      }
    }
  };

  const fetchQuranProgress = async (classId) => {
    if (!classId) return;
    if (schedulingMode === 'cohort' && !selectedCohortPeriod) return;
    if (schedulingMode === 'academic' && !activeSemester) return;
    try {
      const params = schedulingMode === 'cohort'
        ? { cohort_period_id: selectedCohortPeriod.id }
        : { semester_id: activeSemester.id };
      const response = await api.get(`/teacher/classes/${classId}/quran-progress`, { params });
      setQuranRecords(response.data);
    } catch (error) {
      console.error('Failed to fetch quran progress:', error);
    }
  };

  const fetchQuranPositions = async (classId) => {
    if (!classId) return;
    try {
      const response = await api.get(`/teacher/classes/${classId}/quran-positions`);
      setQuranPositions(response.data);
    } catch (error) {
      console.error('Failed to fetch quran positions:', error);
    }
  };

  const fetchClassCourses = async (classId) => {
    if (!classId) return;
    try {
      const res = await api.get(`/teacher/classes/${classId}/courses`);
      setClassCourses(res.data || []);
      setSelectedCourse(null);
      setCourseUnits([]);
      setCourseProgress([]);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    }
  };

  const fetchCourseUnits = async (courseId) => {
    try {
      const res = await api.get(`/teacher/courses/${courseId}/units`);
      setCourseUnits(res.data || []);
    } catch (error) {
      console.error('Failed to fetch course units:', error);
    }
  };

  const fetchCourseProgress = async (classId, courseId) => {
    if (!classId || !courseId) return;
    try {
      setCourseProgressLoading(true);
      const params = schedulingMode === 'cohort' && selectedCohortPeriod
        ? { cohort_period_id: selectedCohortPeriod.id }
        : activeSemester ? { semester_id: activeSemester.id } : {};
      const res = await api.get(`/teacher/classes/${classId}/courses/${courseId}/progress`, { params });
      setCourseProgress(res.data || []);
    } catch (error) {
      console.error('Failed to fetch course progress:', error);
    } finally {
      setCourseProgressLoading(false);
    }
  };

  const fetchStudentPosition = async (studentId) => {
    try {
      const response = await api.get(`/teacher/quran/student/${studentId}/position`);
      setQuranStudentPosition(response.data);
      // Pre-fill form based on session type
      const pos = response.data;
      if (quranSessionType === 'hifz' && pos.hifz) {
        setQuranSurah(String(pos.hifz.surah_number));
        setQuranAyahFrom(pos.hifz.ayah ? String(pos.hifz.ayah + 1) : '1');
        setQuranAyahTo('');
      } else if (quranSessionType === 'tilawah' && pos.tilawah) {
        setQuranSurah(String(pos.tilawah.surah_number));
        setQuranAyahFrom(pos.tilawah.ayah ? String(pos.tilawah.ayah + 1) : '1');
        setQuranAyahTo('');
      } else if (quranSessionType === 'revision' && pos.revision) {
        setQuranSurah(String(pos.revision.surah_number));
        setQuranAyahFrom(pos.revision.ayah ? String(pos.revision.ayah + 1) : '1');
        setQuranAyahTo('');
      } else {
        setQuranSurah('');
        setQuranAyahFrom('');
        setQuranAyahTo('');
      }
    } catch (error) {
      console.error('Failed to fetch student position:', error);
      setQuranStudentPosition({ isNew: true, hifz: null, tilawah: null, revision: null });
    }
  };

  const fetchStudentHistory = async (studentId) => {
    try {
      const response = await api.get(`/teacher/quran/student/${studentId}/history`);
      setQuranStudentHistory(response.data);
    } catch (error) {
      console.error('Failed to fetch student history:', error);
    }
  };

  const handleSelectQuranStudent = (studentId) => {
    if (!studentId) {
      setQuranSelectedStudent(null);
      setQuranStudentPosition(null);
      setQuranStudentHistory([]);
      return;
    }
    const student = students.find(s => String(s.id) === String(studentId));
    setQuranSelectedStudent(student);
    setQuranGrade('Good');
    setQuranPassed(true);
    setQuranNotes('');
    fetchStudentPosition(studentId);
    fetchStudentHistory(studentId);
  };

  const handleSaveQuranProgress = async () => {
    const hasPeriodContext = schedulingMode === 'cohort' ? !!selectedCohortPeriod : !!activeSemester;
    if (!selectedClass || !hasPeriodContext || !quranSelectedStudent) {
      toast.error(schedulingMode === 'cohort' ? 'Please select a cohort period first' : 'No active semester');
      return;
    }
    if (!quranSurah) {
      toast.error('Please select a surah');
      return;
    }
    const surah = surahs.find(s => s.n === parseInt(quranSurah));
    if (!surah) { toast.error('Invalid surah'); return; }

    // Validate ayah fields
    if (!quranAyahFrom || !quranAyahTo) {
      toast.error('Please fill in both Ayah From and Ayah To');
      return;
    }
    const ayahFrom = parseInt(quranAyahFrom);
    const ayahTo = parseInt(quranAyahTo);
    if (isNaN(ayahFrom) || isNaN(ayahTo) || ayahFrom < 1 || ayahTo < 1) {
      toast.error('Ayah values must be positive numbers');
      return;
    }
    if (ayahFrom > surah.ayahs || ayahTo > surah.ayahs) {
      toast.error(`${surah.name} has ${surah.ayahs} ayahs. Values cannot exceed this.`);
      return;
    }
    if (ayahFrom > ayahTo) {
      toast.error('Ayah From cannot be greater than Ayah To');
      return;
    }

    // Validate date
    const selectedDate = new Date(quranDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (selectedDate > today) {
      toast.error('Date cannot be in the future');
      return;
    }

    setQuranSaving(true);
    try {
      await api.post('/teacher/quran/record', {
        student_id: quranSelectedStudent.id,
        class_id: selectedClass.id,
        ...(schedulingMode === 'cohort'
          ? { cohort_period_id: selectedCohortPeriod?.id }
          : { semester_id: activeSemester?.id }),
        date: quranDate,
        type: quranSessionType,
        surah_number: surah.n,
        surah_name: surah.name,
        juz: surah.juz,
        ayah_from: ayahFrom,
        ayah_to: ayahTo,
        grade: quranGrade,
        passed: quranPassed,
        notes: quranNotes || null
      });
      toast.success(quranPassed ? 'Passed — position updated' : 'Repeat recorded — student to come back');
      fetchStudentPosition(quranSelectedStudent.id);
      fetchStudentHistory(quranSelectedStudent.id);
      fetchQuranPositions(selectedClass.id);
      fetchQuranProgress(selectedClass.id);

      // Auto-advance: if passed and completed all ayahs, move form to next surah
      if (quranPassed && ayahTo >= surah.ayahs) {
        const nextSurah = surahs.find(s => s.n === surah.n + 1);
        if (nextSurah) {
          setQuranSurah(String(nextSurah.n));
          setQuranAyahFrom('1');
          setQuranAyahTo('');
        } else {
          setQuranAyahFrom('');
          setQuranAyahTo('');
        }
      } else {
        setQuranAyahFrom(quranPassed ? String(ayahTo + 1) : String(ayahFrom));
        setQuranAyahTo('');
      }
      setQuranGrade('Good');
      setQuranPassed(true);
      setQuranNotes('');
    } catch (error) {
      if (!error.response) {
        const payload = {
          student_id: quranSelectedStudent.id,
          class_id: selectedClass.id,
          ...(schedulingMode === 'cohort'
            ? { cohort_period_id: selectedCohortPeriod?.id }
            : { semester_id: activeSemester?.id }),
          date: quranDate,
          type: quranSessionType,
          surah_number: surah.n,
          surah_name: surah.name,
          juz: surah.juz,
          ayah_from: ayahFrom,
          ayah_to: ayahTo,
          grade: quranGrade,
          passed: quranPassed,
          notes: quranNotes || null
        };
        addToSyncQueue('quran-record', '/teacher/quran/record', 'post', payload, { studentName: quranSelectedStudent.name, type: quranSessionType, date: quranDate });
        toast.success('Saved offline — will sync when connected');
        // Reset form same as success path
        if (quranPassed && ayahTo >= surah.ayahs) {
          const nextSurah = surahs.find(s => s.n === surah.n + 1);
          if (nextSurah) {
            setQuranSurah(String(nextSurah.n));
            setQuranAyahFrom('1');
            setQuranAyahTo('');
          } else {
            setQuranAyahFrom('');
            setQuranAyahTo('');
          }
        } else {
          setQuranAyahFrom(quranPassed ? String(ayahTo + 1) : String(ayahFrom));
          setQuranAyahTo('');
        }
        setQuranGrade('Good');
        setQuranPassed(true);
        setQuranNotes('');
      } else {
        toast.error(error.response?.data?.error || 'Failed to save');
      }
    } finally {
      setQuranSaving(false);
    }
  };

  // Re-fill form when session type changes
  useEffect(() => {
    if (quranSelectedStudent && quranStudentPosition) {
      const pos = quranStudentPosition;
      if (quranSessionType === 'hifz' && pos.hifz) {
        setQuranSurah(String(pos.hifz.surah_number));
        setQuranAyahFrom(pos.hifz.ayah ? String(pos.hifz.ayah + 1) : '1');
        setQuranAyahTo('');
      } else if (quranSessionType === 'tilawah' && pos.tilawah) {
        setQuranSurah(String(pos.tilawah.surah_number));
        setQuranAyahFrom(pos.tilawah.ayah ? String(pos.tilawah.ayah + 1) : '1');
        setQuranAyahTo('');
      } else if (quranSessionType === 'revision' && pos.revision) {
        setQuranSurah(String(pos.revision.surah_number));
        setQuranAyahFrom(pos.revision.ayah ? String(pos.revision.ayah + 1) : '1');
        setQuranAyahTo('');
      } else {
        setQuranSurah('');
        setQuranAyahFrom('');
        setQuranAyahTo('');
      }
    }
  }, [quranSessionType]);

  const handleDeleteQuranRecord = (id) => {
    setConfirmModal({ title: 'Delete Record', message: 'Delete this Quran progress record?', danger: true, confirmLabel: 'Delete', onConfirm: async () => {
      try {
        await api.delete(`/teacher/quran-progress/${id}`);
        toast.success('Deleted');
        if (selectedClass) { fetchQuranProgress(selectedClass.id); fetchQuranPositions(selectedClass.id); }
        if (quranSelectedStudent) { fetchStudentHistory(quranSelectedStudent.id); fetchStudentPosition(quranSelectedStudent.id); }
      } catch (error) { toast.error('Failed to delete'); }
    }});
  };

  const fetchClasses = async () => {
    try {
      const response = await api.get('/teacher/my-classes');
      setClasses(response.data);
      cacheData('teacher-classes', response.data);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
      if (!error.response) {
        const cached = await getCachedData('teacher-classes');
        if (cached) setClasses(cached.data);
      }
    }
  };

  const fetchOverview = async () => {
    setOverviewLoading(true);
    try {
      const response = await api.get(`/teacher/overview?date=${getLocalDate()}`);
      setOverviewData(response.data);
      cacheData('teacher-overview', response.data);
    } catch (error) {
      console.error('Failed to fetch overview:', error);
      if (!error.response) {
        const cached = await getCachedData('teacher-overview');
        if (cached) setOverviewData(cached.data);
      }
    } finally {
      setOverviewLoading(false);
    }
  };

  const fetchTeacherFeeSummary = async () => {
    const cacheKey = `teacher-fee-summary-${teacherFeeClassFilter || 'all'}`;
    try {
      const params = teacherFeeClassFilter ? `?class_id=${teacherFeeClassFilter}` : '';
      const res = await api.get(`/teacher/fee-summary${params}`);
      setTeacherFeeSummary(res.data || []);
      cacheData(cacheKey, res.data || []);
    } catch (error) {
      console.error('Failed to fetch teacher fee summary:', error);
      if (!error.response) {
        const cached = await getCachedData(cacheKey);
        if (cached) setTeacherFeeSummary(cached.data);
      }
    }
  };

  const fetchAllStudents = async () => {
    try {
      // Fetch students from all assigned classes
      const allStudents = [];
      for (const cls of classes) {
        try {
          const response = await api.get(`/teacher/classes/${cls.id}/students`);
          allStudents.push(...response.data);
        } catch (error) {
          console.error(`Failed to fetch students for class ${cls.id}:`, error);
        }
      }
      console.log('Total students across all classes:', allStudents.length);
      setStudents(allStudents);
    } catch (error) {
      console.error('Failed to fetch all students:', error);
    }
  };

  const fetchStudents = async () => {
    if (!selectedClass) return;
    const cacheKey = `students-class-${selectedClass.id}`;
    try {
      console.log('Fetching students for class:', selectedClass.id);
      const response = await api.get(`/teacher/classes/${selectedClass.id}/students`);
      console.log('Students fetched:', response.data);
      setStudents(response.data);
      // Cache for offline use
      cacheData(cacheKey, response.data);

      if (response.data.length === 0) {
        toast.error('No students found in this class');
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
      // Try serving from offline cache
      if (!error.response) {
        const cached = await getCachedData(cacheKey);
        if (cached) {
          setStudents(cached.data);
          toast.info('Showing cached student list (offline)');
          return;
        }
      }
      toast.error('Failed to load students');
      setStudents([]);
    }
  };

  const fetchAttendance = async () => {
    const hasPeriodContext = schedulingMode === 'cohort' ? !!selectedCohortPeriod : !!selectedSemester;
    if (!selectedClass || !hasPeriodContext) {
      return;
    }

    try {
      const periodParam = schedulingMode === 'cohort'
        ? `cohort_period_id=${selectedCohortPeriod.id}`
        : `semester_id=${selectedSemester.id}`;
      const response = await api.get(`/teacher/classes/${selectedClass.id}/attendance/${attendanceDate}?${periodParam}`);
      
      console.log('Attendance data received:', response.data);
      
      if (response.data.length === 0) {
        // No attendance for this date - clear all records (blank slate)
        console.log('No attendance records for this date - showing blank form');
        setAttendanceRecords({});
        setMobileAttendancePhase(1);
      } else {
        // Map existing attendance records
        const records = {};
        response.data.forEach(record => {
          records[record.student_id] = {
            present: record.present,
            absence_reason: record.absence_reason || '',
            dressing_grade: record.dressing_grade || '',
            behavior_grade: record.behavior_grade || '',
            punctuality_grade: record.punctuality_grade || '',
            notes: record.notes || ''
          };
        });
        setAttendanceRecords(records);
      }
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
      // Clear records on error (blank slate for new entry)
      setAttendanceRecords({});
      setMobileAttendancePhase(1);
    }
  };

  const fetchExamPerformance = async () => {
    if (!selectedClass) return;
    try {
      const params = {};
      if (schedulingMode === 'cohort') {
        if (examFilterCohortPeriod) params.cohortPeriodId = examFilterCohortPeriod;
      } else {
        if (examFilterSemester) params.semesterId = examFilterSemester;
      }
      
      // Always fetch all subjects first (without subject filter) to populate dropdown
      const allSubjectsResponse = await api.get(`/teacher/classes/${selectedClass.id}/exam-performance`, { params });
      
      // Extract and store all unique subjects for the dropdown (based on filtered session/semester)
      const subjects = [...new Set(allSubjectsResponse.data.map(record => record.subject))].sort();
      setAvailableSubjects(subjects);
      
      // If a specific subject is selected, fetch filtered data
      if (selectedSubject !== 'all') {
        params.subject = selectedSubject;
        const response = await api.get(`/teacher/classes/${selectedClass.id}/exam-performance`, { params });
        setExamPerformance(response.data);
        calculateExamKpis(response.data);
      } else {
        // Use the all subjects data
        setExamPerformance(allSubjectsResponse.data);
        calculateExamKpis(allSubjectsResponse.data);
      }
    } catch (error) {
      console.error('Failed to fetch exam performance:', error);
      setExamPerformance([]);
      setExamKpis(null);
      setAvailableSubjects([]);
    }
  };

  const calculateExamKpis = (data) => {
    if (!data || data.length === 0) {
      setExamKpis(null);
      return;
    }

    // Group by subject first, then by exam batch (date + semester + max_score)
    const bySubject = {};
    data.forEach(record => {
      if (!bySubject[record.subject]) {
        bySubject[record.subject] = [];
      }
      bySubject[record.subject].push(record);
    });

    // Calculate KPIs for each subject and group by exam batches
    const subjectKpis = Object.entries(bySubject).map(([subject, allRecords]) => {
      // Group records into exam batches (same date + semester + max_score)
      const batchMap = {};
      allRecords.forEach(record => {
        const batchKey = `${record.exam_date}_${record.semester_id}_${record.max_score}`;
        if (!batchMap[batchKey]) {
          batchMap[batchKey] = {
            exam_date: record.exam_date,
            semester_id: record.semester_id,
            semester_name: record.semester_name,
            max_score: record.max_score,
            records: []
          };
        }
        batchMap[batchKey].records.push(record);
      });

      const examBatches = Object.values(batchMap);

      // Calculate overall subject KPIs
      const totalStudents = new Set(allRecords.map(r => r.student_id)).size;
      const presentStudents = allRecords.filter(r => !r.is_absent);
      const scores = presentStudents.map(r => (r.score / r.max_score) * 100);
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const passCount = scores.filter(s => s >= 50).length;
      const failCount = scores.filter(s => s < 50).length;
      const passRate = presentStudents.length > 0 ? (passCount / presentStudents.length) * 100 : 0;
      const highPerformers = scores.filter(s => s >= 80).length;

      return {
        subject,
        totalStudents,
        presentCount: presentStudents.length,
        absentCount: allRecords.length - presentStudents.length,
        avgScore: scores.length > 0 ? avgScore.toFixed(2) : '0.00',
        passCount,
        failCount,
        passRate: presentStudents.length > 0 ? passRate.toFixed(2) : '0.00',
        highPerformers,
        examBatches, // Array of exam batches
        records: allRecords
      };
    });

    setExamKpis(subjectKpis);
  };

  // Reset subject filter when class changes
  useEffect(() => {
    if (selectedClass) {
      setSelectedSubject('all');
    }
  }, [selectedClass]);

  const updateAttendanceRecord = (studentId, field, value) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const saveAttendance = async () => {
    if (isReadOnly()) { toast.error('Account is in read-only mode. Contact your administrator.'); return; }
    const hasPeriodContext = schedulingMode === 'cohort' ? !!selectedCohortPeriod : !!selectedSemester;
    if (!selectedClass || !hasPeriodContext || students.length === 0) {
      toast.error(schedulingMode === 'cohort'
        ? 'Please select a class and a cohort period'
        : 'Please select a class and ensure there are students');
      return;
    }

    // Block submission on non-school days
    if (attendanceDateWarning) {
      toast.error(attendanceDateWarning);
      return;
    }

    // Validate date is not in the future
    const selectedDate = new Date(attendanceDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    if (selectedDate > today) {
      toast.error('Cannot record attendance for future dates');
      return;
    }

    // Check if ALL students have attendance marked (present or absent)
    const studentsWithoutAttendance = students.filter(student => {
      const record = attendanceRecords[student.id];
      return record?.present !== true && record?.present !== false;
    });

    if (studentsWithoutAttendance.length > 0) {
      const firstMissing = studentsWithoutAttendance[0];
      toast.error(`Please mark attendance for all students. Missing: ${firstMissing.first_name} ${firstMissing.last_name} and ${studentsWithoutAttendance.length - 1} other(s)`);
      return;
    }

    // Validate that all present students have dressing and behavior grades (if enabled)
    const enableDressing = madrasahProfile?.enable_dressing_grade !== 0 && madrasahProfile?.enable_dressing_grade !== false;
    const enableBehavior = madrasahProfile?.enable_behavior_grade !== 0 && madrasahProfile?.enable_behavior_grade !== false;
    const enablePunctuality = madrasahProfile?.enable_punctuality_grade !== 0 && madrasahProfile?.enable_punctuality_grade !== false;

    const studentsWithIncompleteGrades = students.filter(student => {
      const record = attendanceRecords[student.id];
      const isPresent = record?.present === true;
      if (isPresent) {
        const hasDressing = !enableDressing || (record?.dressing_grade && record.dressing_grade !== '');
        const hasBehavior = !enableBehavior || (record?.behavior_grade && record.behavior_grade !== '');
        const hasPunctuality = !enablePunctuality || (record?.punctuality_grade && record.punctuality_grade !== '');
        return !hasDressing || !hasBehavior || !hasPunctuality;
      }
      return false;
    });

    if (studentsWithIncompleteGrades.length > 0) {
      const firstInvalid = studentsWithIncompleteGrades[0];
      const record = attendanceRecords[firstInvalid.id];
      const missingFields = [];
      if (enableDressing && (!record?.dressing_grade || record.dressing_grade === '')) missingFields.push('Dressing');
      if (enableBehavior && (!record?.behavior_grade || record.behavior_grade === '')) missingFields.push('Behavior');
      if (enablePunctuality && (!record?.punctuality_grade || record.punctuality_grade === '')) missingFields.push('Punctuality');
      toast.error(`Please select ${missingFields.join(' and ')} grade for ${firstInvalid.first_name} ${firstInvalid.last_name}`);
      return;
    }

    // Validate that all absent students have absence reason
    const absentWithoutReason = students.filter(student => {
      const record = attendanceRecords[student.id];
      const isAbsent = record?.present === false;
      if (isAbsent) {
        return !record?.absence_reason || record.absence_reason === '';
      }
      return false;
    });

    if (absentWithoutReason.length > 0) {
      const firstInvalid = absentWithoutReason[0];
      toast.error(`Please select absence reason for ${firstInvalid.first_name} ${firstInvalid.last_name}`);
      return;
    }

    // Validate that students with 'Other' absence reason have notes
    const otherReasonWithoutNotes = students.filter(student => {
      const record = attendanceRecords[student.id];
      const isAbsent = record?.present === false;
      if (isAbsent && record?.absence_reason === 'Other') {
        return !record?.notes || record.notes.trim() === '';
      }
      return false;
    });

    if (otherReasonWithoutNotes.length > 0) {
      const firstInvalid = otherReasonWithoutNotes[0];
      toast.error(`Please provide a note explaining the absence for ${firstInvalid.first_name} ${firstInvalid.last_name} (reason: Other)`);
      return;
    }

    setSaving(true);
    const records = students.map(student => ({
      student_id: student.id,
      present: attendanceRecords[student.id]?.present ?? false,
      absence_reason: attendanceRecords[student.id]?.absence_reason || null,
      dressing_grade: attendanceRecords[student.id]?.dressing_grade || '',
      behavior_grade: attendanceRecords[student.id]?.behavior_grade || '',
      punctuality_grade: attendanceRecords[student.id]?.punctuality_grade || '',
      notes: attendanceRecords[student.id]?.notes || ''
    }));
    const requestUrl = `/teacher/classes/${selectedClass.id}/attendance/bulk`;
    const requestData = {
      ...(schedulingMode === 'cohort'
        ? { cohort_period_id: selectedCohortPeriod?.id }
        : { semester_id: selectedSemester?.id }),
      date: attendanceDate,
      records,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    try {
      toast.loading('Saving attendance...', { id: 'save-attendance' });
      await api.post(requestUrl, requestData);
      toast.success('Attendance saved successfully!', { id: 'save-attendance' });

      // Move to next day and clear attendance records
      const nextDay = new Date(attendanceDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = getLocalDate(nextDay);
      setAttendanceDate(nextDayStr);
      setAttendanceRecords({}); // Clear records for blank form
      setMobileAttendancePhase(1);
    } catch (error) {
      // If offline or network error, queue for later sync
      if (!error.response) {
        await addToSyncQueue(
          'attendance-bulk',
          requestUrl,
          'post',
          requestData,
          { className: selectedClass.name, date: attendanceDate, studentCount: records.length }
        );
        toast.success('Saved offline — will sync when connected', { id: 'save-attendance' });

        const nextDay = new Date(attendanceDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = getLocalDate(nextDay);
        setAttendanceDate(nextDayStr);
        setAttendanceRecords({});
        setMobileAttendancePhase(1);
      } else {
        const msg = error.response?.data?.error || 'Failed to save attendance';
        toast.error(msg, { id: 'save-attendance' });
        console.error('Failed to save attendance:', msg, error);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleExamSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly()) { toast.error('Account is in read-only mode. Contact your administrator.'); return; }
    
    // Validate form fields
    if (!examForm.subject || examForm.subject.trim() === '') {
      toast.error('Please enter the subject');
      return;
    }
    
    if (!examForm.exam_date) {
      toast.error('Please select the exam date');
      return;
    }
    
    // Check if exam date is in the future
    const examDate = new Date(examForm.exam_date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (examDate > today) {
      toast.error('Exam date cannot be in the future');
      return;
    }
    
    // Validate max score
    const maxScore = parseFloat(examForm.max_score);
    if (isNaN(maxScore) || maxScore <= 0 || maxScore > 1000) {
      toast.error('Max score must be between 1 and 1000');
      return;
    }
    
    // Validate that all students have either score or absence marked
    const invalidStudents = examForm.students.filter(s => {
      if (s.is_absent) {
        return !s.absence_reason;
      } else {
        if (s.score === '' || s.score === null || s.score === undefined) {
          return true;
        }
        // Check if score is within valid range
        const score = parseFloat(s.score);
        if (isNaN(score) || score < 0 || score > maxScore) {
          return true;
        }
      }
      return false;
    });
    
    if (invalidStudents.length > 0) {
      const firstInvalid = invalidStudents[0];
      if (firstInvalid.is_absent) {
        toast.error(`Please select absence reason for ${firstInvalid.student_name}`);
      } else {
        toast.error(`Invalid score for ${firstInvalid.student_name}. Score must be between 0 and ${maxScore}`);
      }
      return;
    }
    
    try {
      const examPayload = schedulingMode === 'cohort'
        ? { ...examForm, semester_id: undefined, cohort_period_id: selectedCohortPeriod?.id }
        : examForm;
      await api.post(`/teacher/classes/${selectedClass.id}/exam-performance/bulk`, examPayload);
      toast.success('Exam performance recorded successfully!');
      setShowExamModal(false);
      setExamForm({
        session_id: '',
        semester_id: '',
        subject: '',
        exam_date: '',
        max_score: 100,
        students: []
      });
      fetchExamPerformance();
    } catch (error) {
      console.error('Failed to record exam performance:', error);
      toast.error('Failed to record exam performance');
    }
  };

  const openExamModal = () => {
    if (schedulingMode === 'academic' && (sessions.length === 0 || semesters.length === 0)) {
      toast.error('No sessions or semesters available');
      return;
    }
    if (schedulingMode === 'cohort' && !selectedCohortPeriod) {
      toast.error('No active cohort period. Ask your admin to activate a period.');
      return;
    }

    // Initialize exam form with active session/semester (or first available) and all students
    const defaultSession = activeSession || sessions[0];
    const defaultSemester = activeSemester || semesters[0];

    setExamForm({
      session_id: defaultSession?.id || '',
      semester_id: defaultSemester?.id || '',
      subject: '',
      exam_date: getLocalDate(),
      max_score: 100,
      students: students.map(s => ({
        student_id: s.id,
        student_name: `${s.first_name} ${s.last_name}`,
        student_number: s.student_id,
        score: '',
        is_absent: false,
        absence_reason: '',
        notes: ''
      }))
    });
    setExamStudentSearch(''); // Reset search
    setShowExamModal(true);
  };

  const handleEditExam = (record) => {
    setEditingExamRecord({
      id: record.id,
      student_name: `${record.first_name} ${record.last_name}`,
      student_id: record.student_id,
      subject: record.subject,
      exam_date: record.exam_date,
      max_score: record.max_score,
      semester_name: record.semester_name,
      score: record.is_absent ? '' : record.score,
      is_absent: record.is_absent,
      absence_reason: record.absence_reason || '',
      notes: record.notes || ''
    });
    setShowEditExamModal(true);
  };

  const handleUpdateExam = async (e) => {
    e.preventDefault();
    if (isReadOnly()) { toast.error('Account is in read-only mode. Contact your administrator.'); return; }
    
    if (!editingExamRecord.is_absent && (editingExamRecord.score === '' || editingExamRecord.score === null)) {
      toast.error('Score is required when student is not absent');
      return;
    }

    if (editingExamRecord.is_absent && !editingExamRecord.absence_reason) {
      toast.error('Absence reason is required');
      return;
    }

    try {
      await api.put(`/teacher/exam-performance/${editingExamRecord.id}`, {
        score: editingExamRecord.score,
        is_absent: editingExamRecord.is_absent,
        absence_reason: editingExamRecord.absence_reason,
        notes: editingExamRecord.notes
      });
      
      toast.success('Exam record updated successfully!');
      setShowEditExamModal(false);
      setEditingExamRecord(null);
      fetchExamPerformance();
    } catch (error) {
      console.error('Failed to update exam record:', error);
      toast.error(error.response?.data?.error || 'Failed to update exam record');
    }
  };

  const handleDeleteExam = async (id) => {
    if (isReadOnly()) { toast.error('Account is in read-only mode. Contact your administrator.'); return; }
    try {
      await api.delete(`/teacher/exam-performance/${id}`);
      toast.success('Exam record deleted successfully!');
      setDeleteExamId(null);
      fetchExamPerformance();
    } catch (error) {
      console.error('Failed to delete exam record:', error);
      toast.error(error.response?.data?.error || 'Failed to delete exam record');
    }
  };

  const handleEditExamBatch = (subject, batch) => {
    // Format date to YYYY-MM-DD for date input
    const dateValue = batch.exam_date ? batch.exam_date.split('T')[0] : '';
    
    setEditingExamBatch({
      subject,
      exam_date: dateValue,
      semester_id: batch.semester_id,
      semester_name: batch.semester_name,
      max_score: batch.max_score,
      student_count: batch.records.length,
      record_ids: batch.records.map(r => r.id)
    });
    setShowEditExamBatchModal(true);
  };

  const handleUpdateExamBatch = async (e) => {
    e.preventDefault();
    if (isReadOnly()) { toast.error('Account is in read-only mode. Contact your administrator.'); return; }
    
    try {
      await api.put('/teacher/exam-performance/batch', {
        record_ids: editingExamBatch.record_ids,
        semester_id: editingExamBatch.semester_id,
        subject: editingExamBatch.subject,
        exam_date: editingExamBatch.exam_date,
        max_score: editingExamBatch.max_score
      });
      
      toast.success('Exam batch updated successfully!');
      setShowEditExamBatchModal(false);
      setEditingExamBatch(null);
      fetchExamPerformance();
    } catch (error) {
      console.error('Failed to update exam batch:', error);
      toast.error(error.response?.data?.error || 'Failed to update exam batch');
    }
  };

  const handleDeleteExamBatch = async () => {
    if (isReadOnly()) { toast.error('Account is in read-only mode. Contact your administrator.'); return; }
    try {
      await api.delete('/teacher/exam-performance/batch', {
        data: { record_ids: deleteExamBatch.record_ids }
      });
      
      toast.success('Exam batch deleted successfully!');
      setDeleteExamBatch(null);
      fetchExamPerformance();
    } catch (error) {
      console.error('Failed to delete exam batch:', error);
      toast.error(error.response?.data?.error || 'Failed to delete exam batch');
    }
  };

  const fetchStudentReports = async () => {
    if (!selectedClass) return;
    try {
      const params = {};
      if (schedulingMode === 'cohort') {
        if (reportFilterCohortPeriod) params.cohortPeriodId = reportFilterCohortPeriod;
      } else {
        if (reportFilterSession) params.sessionId = reportFilterSession;
        if (reportFilterSemester) params.semesterId = reportFilterSemester;
      }
      if (reportFilterSubject && reportFilterSubject !== 'all') {
        params.subject = reportFilterSubject;
      }
      
      const response = await api.get(`/teacher/classes/${selectedClass.id}/student-reports`, { params });
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

  const updateStudentExamData = (studentId, field, value) => {
    // Validate score input
    if (field === 'score' && value !== '') {
      const score = parseFloat(value);
      const maxScore = parseFloat(examForm.max_score);
      
      // Prevent invalid numbers
      if (isNaN(score)) {
        return;
      }
      
      // Enforce max score limit
      if (score > maxScore) {
        toast.error(`Score cannot exceed max score of ${maxScore}`);
        return;
      }
      
      // Enforce minimum of 0
      if (score < 0) {
        return;
      }
    }
    
    setExamForm(prev => ({
      ...prev,
      students: prev.students.map(s => 
        s.student_id === studentId 
          ? { ...s, [field]: value, ...(field === 'is_absent' && value ? { score: '' } : {}) }
          : s
      )
    }));
  };

  const calculatePercentage = (score, maxScore) => {
    if (!score || !maxScore || maxScore === 0) return 0;
    return ((parseFloat(score) / parseFloat(maxScore)) * 100).toFixed(2);
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

  const getNavIcon = (id) => {
    const cls = "nav-icon";
    const size = 18;
    const style = { minWidth: '18px' };

    switch(id) {
      case 'overview':
        return <HomeIcon className={cls} width={size} height={size} style={style} />;
      case 'attendance':
        return <ClipboardDocumentCheckIcon className={cls} width={size} height={size} style={style} />;
      case 'quran':
        return <BookOpenIcon className={cls} width={size} height={size} style={style} />;
      case 'exams':
        return <DocumentTextIcon className={cls} width={size} height={size} style={style} />;
      case 'reports':
        return <UserGroupIcon className={cls} width={size} height={size} style={style} />;
      case 'availability':
        return <CalendarDaysIcon className={cls} width={size} height={size} style={style} />;
      case 'help':
        return <QuestionMarkCircleIcon className={cls} width={size} height={size} style={style} />;
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
          <img src="/e-daarah-blackbg-logo.png" alt="E-Daarah" className="sidebar-logo-img" />
          <span className="sidebar-logo-text">E-Daarah</span>
          <button 
            className="sidebar-collapse-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label="Toggle sidebar"
          >
            {sidebarCollapsed ? <ChevronRightIcon width={16} height={16} /> : <ChevronLeftIcon width={16} height={16} />}
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
                  data-tour={item.id}
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
              {user?.firstName?.charAt(0) || 'T'}
            </div>
            <div className="user-info">
              <div className="user-name">{user?.firstName} {user?.lastName}</div>
              <div className="user-role">Teacher {user?.staffId ? `• ${user.staffId}` : ''}</div>
            </div>
            <ChevronUpIcon width={16} height={16} style={{ opacity: 0.5, transform: profileDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </div>
          {profileDropdownOpen && (
            <div className="profile-dropdown">
              <div className="profile-dropdown-header">
                <div className="user-avatar" style={{ width: 36, height: 36, minWidth: 36, fontSize: 14 }}>
                  {user?.firstName?.charAt(0) || 'T'}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.firstName} {user?.lastName}</div>
                  <div style={{ fontSize: 11, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
                </div>
              </div>
              <div className="profile-dropdown-divider" />
              <button className="profile-dropdown-item" onClick={() => { handleTabChange('settings'); setProfileDropdownOpen(false); }}>
                <UserIcon width={16} height={16} />
                Account
              </button>
              <button className="profile-dropdown-item" onClick={() => { handleTabChange('settings'); setProfileDropdownOpen(false); }}>
                <LockClosedIcon width={16} height={16} />
                Change Password
              </button>
              <button className="profile-dropdown-item" onClick={() => { handleTabChange('settings'); setProfileDropdownOpen(false); }}>
                <Cog6ToothIcon width={16} height={16} />
                Settings
              </button>
              <div className="profile-dropdown-divider" />
              <button className="profile-dropdown-item logout" onClick={handleLogout}>
                <ArrowRightStartOnRectangleIcon width={16} height={16} />
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
            <span className="header-title">Teacher Portal</span>
          </div>
          <div className="header-actions">
          </div>
        </header>

        {/* Email Verification Banner */}
        <EmailVerificationBanner />

        {/* Demo Banner */}
        <DemoBanner />

        {/* Platform Announcements */}
        <AnnouncementBanner />

        {/* Read-Only Warning Banner */}
        {isReadOnly() && (
          <div style={{
            background: '#f5f5f5', color: '#525252', padding: '12px 20px',
            borderBottom: '1px solid #e5e5e5', textAlign: 'center', fontWeight: 500, fontSize: '14px'
          }}>
            ⚠️ {madrasahProfile?.subscription_status === 'trialing' ? 'Your school\'s trial has expired' : madrasahProfile?.subscription_status === 'past_due' ? 'Your school\'s payment is past due' : 'Your school\'s subscription is inactive'}. 
            Your account is in read-only mode. Contact your administrator.
          </div>
        )}

        <OfflineBanner />

        {/* Main Content */}
        <main className="main tab-content" key={activeTab}>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Greeting + Semester */}
              <div className="overview-greeting">
                <h2 className="page-title">
                  {(() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; })()}{user?.firstName ? `, ${user.firstName}` : ''}
                </h2>
                <span className="overview-context">
                  {activeSemester ? activeSemester.name : ''}
                </span>
              </div>

              {overviewLoading ? (
                <div className="stats-grid">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="stat-card">
                      <div className="skeleton skeleton-text" style={{ width: '50%', height: '28px', marginBottom: '8px' }} />
                      <div className="skeleton skeleton-text short" style={{ height: '12px' }} />
                    </div>
                  ))}
                </div>
              ) : overviewData ? (
                <>
                  {/* Quick Stats */}
                  <div className="insights-summary">
                    {/* This Week */}
                    <div className="summary-card">
                      <div className="summary-label">Attendance This Week</div>
                      <div className="summary-value">
                        {overviewData.stats.this_week_rate !== null ? `${overviewData.stats.this_week_rate}%` : '-'}
                      </div>
                      {overviewData.stats.this_week_rate === null && (
                        <div className="summary-status">No attendance recorded this week</div>
                      )}
                      {overviewData.stats.this_week_rate !== null && overviewData.stats.last_week_rate !== null && (
                        <div style={{ fontSize: 12, marginTop: 4, color: (overviewData.stats.this_week_rate - overviewData.stats.last_week_rate) > 0 ? 'var(--accent)' : (overviewData.stats.this_week_rate - overviewData.stats.last_week_rate) < 0 ? '#c1121f' : 'var(--text-muted)' }}>
                          {(() => {
                            const diff = Math.round((overviewData.stats.this_week_rate - overviewData.stats.last_week_rate) * 10) / 10;
                            return diff > 0 ? `+${diff}%` : diff < 0 ? `${diff}%` : 'No change';
                          })()} vs last week
                        </div>
                      )}
                    </div>
                    {/* Semester Average */}
                    <div className="summary-card">
                      <div className="summary-label">Semester Attendance</div>
                      <div className="summary-value">{overviewData.stats.attendance_rate !== null ? `${overviewData.stats.attendance_rate}%` : '-'}</div>
                      {overviewData.stats.attendance_rate === null && (
                        <div className="summary-status">No data yet</div>
                      )}
                    </div>
                    {/* Students */}
                    <div className="summary-card">
                      <div className="summary-value">{overviewData.stats.total_students}</div>
                      <div className="summary-label">Students</div>
                    </div>
                    {/* Exams Recorded */}
                    <div className="summary-card">
                      <div className="summary-value">{overviewData.stats.exams_recorded}</div>
                      <div className="summary-label">Exams Recorded</div>
                      <div className="summary-status">This semester</div>
                    </div>
                  </div>

                  {/* Today's Classes */}
                  <h4 className="overview-section-title" style={{ marginBottom: 'var(--sm)' }}>Today's Classes</h4>
                  {overviewData.classes.length > 0 ? (
                    <div className="today-classes-grid">
                      {overviewData.classes.map(cls => (
                        <div
                          key={cls.id}
                          className="today-class-card"
                          onClick={() => {
                            setSelectedClass(classes.find(c => c.id === cls.id) || { id: cls.id, name: cls.name });
                            setActiveTab('attendance');
                          }}
                        >
                          <div className="class-name">{cls.name}</div>
                          <div className="class-student-count">{cls.student_count} student{cls.student_count !== 1 ? 's' : ''}</div>
                          {cls.attendance_taken_today ? (
                            <div className="attendance-status completed">
                              {cls.present_count}/{cls.student_count} present
                            </div>
                          ) : (
                            <div className="attendance-status not-taken">
                              Take attendance
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="card">
                      <div className="empty">
                        <p>No classes assigned yet. Contact your administrator.</p>
                      </div>
                    </div>
                  )}

                  {/* Attendance Compliance */}
                  {overviewData.attendanceCompliance && overviewData.attendanceCompliance.some(c => c.expected_days > 0) && (
                    <div className="overview-widget">
                      <h4>Attendance Compliance</h4>
                      <div className="compliance-list">
                        {overviewData.attendanceCompliance.filter(c => c.expected_days > 0).map(c => (
                          <div key={c.id} className="compliance-row">
                            <div className="compliance-class">{c.class_name}</div>
                            <div className="compliance-bar-wrap">
                              <div
                                className={`compliance-bar ${c.compliance_rate >= 100 ? 'green' : c.compliance_rate >= 70 ? 'yellow' : 'red'}`}
                                style={{ width: `${Math.min(c.compliance_rate, 100)}%` }}
                              />
                            </div>
                            <div className="compliance-stats">
                              <span className="compliance-fraction">{c.marked_days}/{c.expected_days}</span>
                              <span className={`compliance-pct ${c.compliance_rate >= 100 ? 'green' : c.compliance_rate >= 70 ? 'yellow' : 'red'}`}>
                                {Math.round(c.compliance_rate)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Alerts — Frequent Absences */}
                  {overviewData.frequentAbsences && overviewData.frequentAbsences.length > 0 && (
                    <div className="overview-widget">
                      <h4>Frequent Absences This Month</h4>
                      <table className="overview-table">
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th>Class</th>
                            <th>Absences</th>
                          </tr>
                        </thead>
                        <tbody>
                          {overviewData.frequentAbsences.map((s, i) => (
                            <tr key={i}>
                              <td>{s.first_name} {s.last_name}</td>
                              <td>{s.class_name}</td>
                              <td>{s.absence_count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Fee Status (read-only) */}
                  {madrasahProfile?.enable_fee_tracking !== 0 && madrasahProfile?.enable_fee_tracking !== false && madrasahProfile?.enable_fee_tracking != null && (
                    <div className="overview-widget">
                      <h4>Fee Status</h4>
                      {teacherFeeSummary.length > 0 ? (
                        <>
                          {overviewData?.classes?.length > 1 && (
                            <div style={{ marginBottom: '12px' }}>
                              <select className="form-select" style={{ maxWidth: '200px' }} value={teacherFeeClassFilter}
                                onChange={(e) => setTeacherFeeClassFilter(e.target.value)}>
                                <option value="">All Classes</option>
                                {overviewData.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                            </div>
                          )}
                          <table className="overview-table fee-table-desktop">
                            <thead>
                              <tr>
                                <th>Student</th>
                                <th>Fee</th>
                                <th>Balance</th>
                                <th>Progress</th>
                              </tr>
                            </thead>
                            <tbody>
                              {teacherFeeSummary.map((row, i) => (
                                <tr key={i}>
                                  <td>{row.student_name}</td>
                                  <td>{row.template_name}</td>
                                  <td>{formatCurrency(row.balance)}</td>
                                  <td><FeeProgressBar paid={row.total_paid} total={row.total_fee} /></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="fee-mobile-cards">
                            {teacherFeeSummary.map((row, i) => (
                              <div key={i} className="admin-mobile-card">
                                <div className="admin-mobile-card-top">
                                  <div>
                                    <div className="admin-mobile-card-title">{row.student_name}</div>
                                    <div className="admin-mobile-card-sub">{row.template_name}</div>
                                  </div>
                                </div>
                                <FeeProgressBar paid={row.total_paid} total={row.total_fee} />
                                <div style={{ marginTop: '4px', fontWeight: 600, fontSize: '14px' }}>Balance: {formatCurrency(row.balance)}</div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p style={{ color: 'var(--gray)', fontSize: '14px' }}>No fees assigned to your classes yet.</p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                /* Fallback — no overview data */
                <>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-value">{classes.length}</div>
                      <div className="stat-label">Assigned Classes</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{students.length}</div>
                      <div className="stat-label">Total Students</div>
                    </div>
                  </div>
                  {classes.length > 0 ? (
                    <div className="quick-grid">
                      {classes.map(cls => (
                        <div key={cls.id} className="quick-card" onClick={() => { setSelectedClass(cls); setActiveTab('attendance'); }}>
                          <h4>{cls.name}</h4>
                          <p>Click to take attendance</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="card">
                      <div className="empty">
                        <p>No classes assigned yet. Contact your administrator.</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Attendance Tab */}
          {activeTab === 'attendance' && (
            <>
              <div className="page-header">
                <h2 className="page-title">Attendance</h2>
              </div>

              {/* Attendance Sub-Tabs */}
              <div className="report-tabs">
                <nav className="report-tabs-nav">
                  <button
                    onClick={() => setAttendanceSubTab('record')}
                    className={`report-tab-btn ${attendanceSubTab === 'record' ? 'active' : ''}`}
                  >
                    Record Attendance
                  </button>
                  <button
                    onClick={() => setAttendanceSubTab('view')}
                    className={`report-tab-btn ${attendanceSubTab === 'view' ? 'active' : ''}`}
                  >
                    View History
                  </button>
                </nav>
              </div>

              {/* Record Attendance Sub-Tab */}
              {attendanceSubTab === 'record' && (
                <>
                  <div className="card">
                    <div className="card-body">
                      <div className="form-grid">
                        {schedulingMode === 'cohort' ? (
                          <div className="form-group">
                            <label className="form-label">Cohort Period</label>
                            {activePeriods.length === 0 ? (
                              <input type="text" value="No active periods" readOnly disabled className="form-select" style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }} />
                            ) : (
                              <select
                                value={selectedCohortPeriod?.id || ''}
                                onChange={e => {
                                  const p = activePeriods.find(p => p.id === parseInt(e.target.value));
                                  setSelectedCohortPeriod(p || null);
                                }}
                                className="form-select"
                              >
                                {activePeriods.map(p => (
                                  <option key={p.id} value={p.id}>{p.cohort_name} — {p.name}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        ) : (
                          <div className="form-group">
                            <label className="form-label">Active Semester</label>
                            <input
                              type="text"
                              value={selectedSemester ? `${selectedSemester.session_name} - ${selectedSemester.name}` : 'No active semester'}
                              readOnly
                              disabled
                              className="form-select"
                              style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                            />
                          </div>
                        )}

                        <div className="form-group">
                          <label className="form-label">Select Class</label>
                          <select
                            value={selectedClass?.id || ''}
                            onChange={(e) => {
                              const cls = classes.find(c => c.id === parseInt(e.target.value));
                              setSelectedClass(cls);
                            }}
                            className="form-select"
                          >
                            <option value="">-- Select a class --</option>
                            {classes.map(cls => (
                              <option key={cls.id} value={cls.id}>{cls.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Date</label>
                          <input
                            type="date"
                            value={attendanceDate}
                            onChange={(e) => setAttendanceDate(e.target.value)}
                            max={getLocalDate()}
                            className="form-input"
                            style={attendanceDateWarning ? { borderColor: '#e67e22' } : {}}
                          />
                          {attendanceDateWarning && (
                            <p style={{ color: '#e67e22', fontSize: '12px', marginTop: '4px', margin: '4px 0 0' }}>
                              ⚠ {attendanceDateWarning}
                            </p>
                          )}
                        </div>
                      </div>
                      {schoolDayInfo?.schoolDays?.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>School days:</span>
                          {schoolDayInfo.schoolDays.map(day => (
                            <span key={day} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: 'var(--primary-bg, rgba(37,99,235,0.08))', color: 'var(--primary)', fontWeight: '500' }}>{day.substring(0, 3)}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedClass && selectedSemester && students.length > 0 && (
                    <div className="card attendance-recording-card">
                      {/* Hint: grading fields available */}
                      {(madrasahProfile?.enable_dressing_grade === 0 || madrasahProfile?.enable_dressing_grade === false) &&
                       (madrasahProfile?.enable_behavior_grade === 0 || madrasahProfile?.enable_behavior_grade === false) &&
                       (madrasahProfile?.enable_punctuality_grade === 0 || madrasahProfile?.enable_punctuality_grade === false) && (
                        <div style={{ padding: '10px 16px', background: '#f0f9ff', borderBottom: '1px solid #bae6fd', fontSize: '13px', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>💡</span>
                          <span>You can also grade dressing, behavior, and punctuality during attendance. Ask your admin to enable these in Settings.</span>
                        </div>
                      )}
                      {/* Desktop Table View */}
                      <div className="table-wrap">
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Student ID</th>
                              <th>Name</th>
                              <th style={{ minWidth: '140px' }}>Attendance</th>
                              <th>Absence Reason</th>
                              {(madrasahProfile?.enable_dressing_grade !== 0 && madrasahProfile?.enable_dressing_grade !== false) && <th>Dressing</th>}
                              {(madrasahProfile?.enable_behavior_grade !== 0 && madrasahProfile?.enable_behavior_grade !== false) && <th>Behavior</th>}
                              {(madrasahProfile?.enable_punctuality_grade !== 0 && madrasahProfile?.enable_punctuality_grade !== false) && <th>Punctuality</th>}
                              <th>Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {students.map(student => (
                              <tr key={student.id}>
                                <td><strong>{student.student_id}</strong></td>
                                <td>{student.first_name} {student.last_name}</td>
                                <td>
                                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                      <input
                                        type="radio"
                                        name={`attendance-${student.id}`}
                                        checked={attendanceRecords[student.id]?.present === true}
                                        onChange={() => {
                                          updateAttendanceRecord(student.id, 'present', true);
                                          updateAttendanceRecord(student.id, 'absence_reason', '');
                                        }}
                                        style={{ width: '16px', height: '16px' }}
                                      />
                                      <span>Present</span>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                      <input
                                        type="radio"
                                        name={`attendance-${student.id}`}
                                        checked={attendanceRecords[student.id]?.present === false}
                                        onChange={() => {
                                          updateAttendanceRecord(student.id, 'present', false);
                                          updateAttendanceRecord(student.id, 'dressing_grade', '');
                                          updateAttendanceRecord(student.id, 'behavior_grade', '');
                                          updateAttendanceRecord(student.id, 'punctuality_grade', '');
                                        }}
                                        style={{ width: '16px', height: '16px' }}
                                      />
                                      <span>Absent</span>
                                    </label>
                                  </div>
                                </td>
                                <td>
                                  <select
                                    value={attendanceRecords[student.id]?.absence_reason || ''}
                                    onChange={(e) => updateAttendanceRecord(student.id, 'absence_reason', e.target.value)}
                                    className="form-select"
                                    style={{ minWidth: '140px' }}
                                    disabled={attendanceRecords[student.id]?.present !== false}
                                  >
                                    <option value="">Select reason...</option>
                                    <option value="Sick">Sick</option>
                                    <option value="Parent Request">Parent Request</option>
                                    <option value="School Not Notified">School Not Notified</option>
                                    <option value="Other">Other</option>
                                  </select>
                                </td>
                                {(madrasahProfile?.enable_dressing_grade !== 0 && madrasahProfile?.enable_dressing_grade !== false) && (
                                <td>
                                  <select
                                    value={attendanceRecords[student.id]?.dressing_grade || ''}
                                    onChange={(e) => updateAttendanceRecord(student.id, 'dressing_grade', e.target.value)}
                                    className="form-select"
                                    style={{ minWidth: '100px' }}
                                    disabled={attendanceRecords[student.id]?.present !== true}
                                  >
                                    <option value="">Select...</option>
                                    <option value="Excellent">Excellent</option>
                                    <option value="Good">Good</option>
                                    <option value="Fair">Fair</option>
                                    <option value="Poor">Poor</option>
                                  </select>
                                </td>
                                )}
                                {(madrasahProfile?.enable_behavior_grade !== 0 && madrasahProfile?.enable_behavior_grade !== false) && (
                                <td>
                                  <select
                                    value={attendanceRecords[student.id]?.behavior_grade || ''}
                                    onChange={(e) => updateAttendanceRecord(student.id, 'behavior_grade', e.target.value)}
                                    className="form-select"
                                    style={{ minWidth: '100px' }}
                                    disabled={attendanceRecords[student.id]?.present !== true}
                                  >
                                    <option value="">Select...</option>
                                    <option value="Excellent">Excellent</option>
                                    <option value="Good">Good</option>
                                    <option value="Fair">Fair</option>
                                    <option value="Poor">Poor</option>
                                  </select>
                                </td>
                                )}
                                {(madrasahProfile?.enable_punctuality_grade !== 0 && madrasahProfile?.enable_punctuality_grade !== false) && (
                                <td>
                                  <select
                                    value={attendanceRecords[student.id]?.punctuality_grade || ''}
                                    onChange={(e) => updateAttendanceRecord(student.id, 'punctuality_grade', e.target.value)}
                                    className="form-select"
                                    style={{ minWidth: '100px' }}
                                    disabled={attendanceRecords[student.id]?.present !== true}
                                  >
                                    <option value="">Select...</option>
                                    <option value="Excellent">Excellent</option>
                                    <option value="Good">Good</option>
                                    <option value="Fair">Fair</option>
                                    <option value="Poor">Poor</option>
                                  </select>
                                </td>
                                )}
                                <td>
                                  <input
                                    type="text"
                                    value={attendanceRecords[student.id]?.notes || ''}
                                    onChange={(e) => updateAttendanceRecord(student.id, 'notes', e.target.value)}
                                    className="form-input"
                                    placeholder="Optional notes"
                                    style={{ minWidth: '150px' }}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Two-Phase Attendance UI */}
                      <div className="mobile-attendance-flow">
                        {/* Phase 1: Quick Roll Call */}
                        {mobileAttendancePhase === 1 && (
                          <div className="mobile-rollcall">
                            <div className="rollcall-header">
                              <div className="rollcall-title">
                                <span className="rollcall-dot"></span>
                                <span>Roll Call</span>
                              </div>
                              <div className="rollcall-count">
                                {students.filter(s => attendanceRecords[s.id]?.present === true || attendanceRecords[s.id]?.present === false).length}/{students.length} marked
                              </div>
                            </div>
                            <div className="rollcall-list">
                              {students.map(student => {
                                const record = attendanceRecords[student.id];
                                const isPresent = record?.present === true;
                                const isAbsent = record?.present === false;
                                return (
                                  <div key={student.id} className={`rollcall-row ${isPresent ? 'marked-present' : ''} ${isAbsent ? 'marked-absent' : ''}`}>
                                    <div className="rollcall-name">
                                      <span className="rollcall-student-name">{student.first_name} {student.last_name}</span>
                                    </div>
                                    <div className="rollcall-actions">
                                      <button
                                        type="button"
                                        className={`rollcall-btn present ${isPresent ? 'active' : ''}`}
                                        onClick={() => {
                                          updateAttendanceRecord(student.id, 'present', true);
                                          updateAttendanceRecord(student.id, 'absence_reason', '');
                                        }}
                                        aria-label={`Mark ${student.first_name} present`}
                                      >✓</button>
                                      <button
                                        type="button"
                                        className={`rollcall-btn absent ${isAbsent ? 'active' : ''}`}
                                        onClick={() => {
                                          updateAttendanceRecord(student.id, 'present', false);
                                          updateAttendanceRecord(student.id, 'dressing_grade', '');
                                          updateAttendanceRecord(student.id, 'behavior_grade', '');
                                          updateAttendanceRecord(student.id, 'punctuality_grade', '');
                                        }}
                                        aria-label={`Mark ${student.first_name} absent`}
                                      >✗</button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="rollcall-summary">
                              <span className="rollcall-stat present-stat">{students.filter(s => attendanceRecords[s.id]?.present === true).length} present</span>
                              <span className="rollcall-stat absent-stat">{students.filter(s => attendanceRecords[s.id]?.present === false).length} absent</span>
                            </div>
                            <div className="form-actions form-actions-sticky">
                              {(() => {
                                const enableDressing = madrasahProfile?.enable_dressing_grade !== 0 && madrasahProfile?.enable_dressing_grade !== false;
                                const enableBehavior = madrasahProfile?.enable_behavior_grade !== 0 && madrasahProfile?.enable_behavior_grade !== false;
                                const enablePunctuality = madrasahProfile?.enable_punctuality_grade !== 0 && madrasahProfile?.enable_punctuality_grade !== false;
                                const hasGrades = enableDressing || enableBehavior || enablePunctuality;
                                const allMarked = students.every(s => attendanceRecords[s.id]?.present === true || attendanceRecords[s.id]?.present === false);
                                const hasAbsent = students.some(s => attendanceRecords[s.id]?.present === false);
                                const needsPhase2 = hasGrades || hasAbsent;
                                if (needsPhase2) {
                                  return (
                                    <button
                                      type="button"
                                      className="btn btn-primary"
                                      disabled={!allMarked}
                                      onClick={() => setMobileAttendancePhase(2)}
                                    >
                                      {allMarked ? 'Continue — Add Details' : `Mark all students (${students.filter(s => attendanceRecords[s.id]?.present === true || attendanceRecords[s.id]?.present === false).length}/${students.length})`}
                                    </button>
                                  );
                                }
                                return (
                                  <button onClick={saveAttendance} className="btn btn-primary" disabled={!allMarked || saving || isReadOnly()}>
                                    {saving ? 'Saving...' : allMarked ? 'Save Attendance' : `Mark all students (${students.filter(s => attendanceRecords[s.id]?.present === true || attendanceRecords[s.id]?.present === false).length}/${students.length})`}
                                  </button>
                                );
                              })()}
                            </div>
                          </div>
                        )}

                        {/* Phase 2: Details (grades + absence reasons) */}
                        {mobileAttendancePhase === 2 && (
                          <div className="mobile-details">
                            <div className="details-header">
                              <button type="button" className="details-back" onClick={() => setMobileAttendancePhase(1)}>← Roll Call</button>
                              <span className="details-title">Details</span>
                            </div>

                            {/* Absent students — need reasons */}
                            {students.filter(s => attendanceRecords[s.id]?.present === false).length > 0 && (
                              <div className="details-section">
                                <div className="details-section-label">Absent ({students.filter(s => attendanceRecords[s.id]?.present === false).length})</div>
                                {students.filter(s => attendanceRecords[s.id]?.present === false).map(student => (
                                  <div key={student.id} className="details-card absent-card">
                                    <div className="details-card-name">{student.first_name} {student.last_name}</div>
                                    <div className="details-field">
                                      <label className="details-field-label">Reason</label>
                                      <select
                                        value={attendanceRecords[student.id]?.absence_reason || ''}
                                        onChange={(e) => updateAttendanceRecord(student.id, 'absence_reason', e.target.value)}
                                        className="details-select"
                                      >
                                        <option value="">Select reason...</option>
                                        <option value="Sick">Sick</option>
                                        <option value="Parent Request">Parent Request</option>
                                        <option value="School Not Notified">School Not Notified</option>
                                        <option value="Other">Other</option>
                                      </select>
                                    </div>
                                    {attendanceRecords[student.id]?.absence_reason === 'Other' && (
                                      <div className="details-field">
                                        <label className="details-field-label">Note (required)</label>
                                        <input
                                          type="text"
                                          value={attendanceRecords[student.id]?.notes || ''}
                                          onChange={(e) => updateAttendanceRecord(student.id, 'notes', e.target.value)}
                                          className="details-input"
                                          placeholder="Explain absence..."
                                        />
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Present students — conduct grades */}
                            {(() => {
                              const enableDressing = madrasahProfile?.enable_dressing_grade !== 0 && madrasahProfile?.enable_dressing_grade !== false;
                              const enableBehavior = madrasahProfile?.enable_behavior_grade !== 0 && madrasahProfile?.enable_behavior_grade !== false;
                              const enablePunctuality = madrasahProfile?.enable_punctuality_grade !== 0 && madrasahProfile?.enable_punctuality_grade !== false;
                              const presentStudents = students.filter(s => attendanceRecords[s.id]?.present === true);
                              if (presentStudents.length === 0 || (!enableDressing && !enableBehavior && !enablePunctuality)) return null;
                              return (
                                <div className="details-section">
                                  <div className="details-section-label">Conduct Grades ({presentStudents.length})</div>
                                  {presentStudents.map(student => (
                                    <div key={student.id} className="details-card">
                                      <div className="details-card-name">{student.first_name} {student.last_name}</div>
                                      {enableDressing && (
                                        <div className="details-field">
                                          <label className="details-field-label">Dressing</label>
                                          <div className="grade-pills">
                                            {['Excellent', 'Good', 'Fair', 'Poor'].map(g => (
                                              <button
                                                key={g}
                                                type="button"
                                                className={`grade-pill ${attendanceRecords[student.id]?.dressing_grade === g ? 'active' : ''} grade-${g.toLowerCase()}`}
                                                onClick={() => updateAttendanceRecord(student.id, 'dressing_grade', g)}
                                              >{g.substring(0, 2)}</button>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {enableBehavior && (
                                        <div className="details-field">
                                          <label className="details-field-label">Behavior</label>
                                          <div className="grade-pills">
                                            {['Excellent', 'Good', 'Fair', 'Poor'].map(g => (
                                              <button
                                                key={g}
                                                type="button"
                                                className={`grade-pill ${attendanceRecords[student.id]?.behavior_grade === g ? 'active' : ''} grade-${g.toLowerCase()}`}
                                                onClick={() => updateAttendanceRecord(student.id, 'behavior_grade', g)}
                                              >{g.substring(0, 2)}</button>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {enablePunctuality && (
                                        <div className="details-field">
                                          <label className="details-field-label">Punctuality</label>
                                          <div className="grade-pills">
                                            {['Excellent', 'Good', 'Fair', 'Poor'].map(g => (
                                              <button
                                                key={g}
                                                type="button"
                                                className={`grade-pill ${attendanceRecords[student.id]?.punctuality_grade === g ? 'active' : ''} grade-${g.toLowerCase()}`}
                                                onClick={() => updateAttendanceRecord(student.id, 'punctuality_grade', g)}
                                              >{g.substring(0, 2)}</button>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}

                            <div className="form-actions form-actions-sticky">
                              <button onClick={saveAttendance} className="btn btn-primary" disabled={saving || isReadOnly()}>
                                {saving ? 'Saving...' : 'Save Attendance'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Desktop save button */}
                      <div className="desktop-save-actions">
                        <button onClick={saveAttendance} className="btn btn-primary" disabled={saving || isReadOnly()}>
                          {saving ? 'Saving...' : 'Save Attendance'}
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedClass && students.length === 0 && (
                    <div className="card">
                      <div className="empty">
                        <p>No students enrolled in this class yet.</p>
                      </div>
                    </div>
                  )}

                  {!selectedClass && (
                    <div className="card">
                      <div className="empty">
                        <p>Select a class to record attendance.</p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* View Attendance History Sub-Tab */}
              {attendanceSubTab === 'view' && (
                <>
                  <div className="card">
                    <div className="card-body">
                      <div className="form-grid">
                        <div className="form-group">
                          <label className="form-label">Filter by Semester</label>
                          <select
                            value={selectedSemester?.id || ''}
                            onChange={(e) => {
                              const sem = semesters.find(s => s.id === parseInt(e.target.value));
                              setSelectedSemester(sem);
                            }}
                            className="form-select"
                          >
                            <option value="">All Semesters</option>
                            {semesters.map(sem => (
                              <option key={sem.id} value={sem.id}>
                                {sem.session_name} - {sem.name} {sem.is_active ? '(Active)' : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Select Class</label>
                          <select
                            value={historyClass?.id || ''}
                            onChange={(e) => {
                              const cls = classes.find(c => c.id === parseInt(e.target.value));
                              setHistoryClass(cls);
                            }}
                            className="form-select"
                          >
                            <option value="">-- Select a class --</option>
                            {classes.map(cls => (
                              <option key={cls.id} value={cls.id}>{cls.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {historyClass ? (
                    <div className="card">
                      <SortableTable
                        columns={[
                          {
                            key: 'date',
                            label: 'Date',
                            sortable: true,
                            sortType: 'date',
                            render: (row) => fmtDate(row.date)
                          },
                          {
                            key: 'student_id',
                            label: 'Student ID',
                            sortable: true
                          },
                          {
                            key: 'name',
                            label: 'Student Name',
                            sortable: true,
                            render: (row) => `${row.first_name} ${row.last_name}`
                          },
                          {
                            key: 'present',
                            label: 'Status',
                            sortable: true,
                            sortType: 'boolean',
                            render: (row) => (
                              <span className={`badge ${row.present ? 'badge-success' : 'badge-danger'}`}>
                                {row.present ? 'Present' : 'Absent'}
                              </span>
                            )
                          },
                          {
                            key: 'absence_reason',
                            label: 'Absence Reason',
                            sortable: true,
                            render: (row) => row.absence_reason || '-'
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
                        data={attendanceHistory}
                        searchable={true}
                        searchPlaceholder="Search by student name or ID..."
                        searchKeys={['student_id', 'first_name', 'last_name']}
                        pagination={true}
                        pageSize={25}
                        emptyMessage="No attendance records found"
                      />
                    </div>
                  ) : (
                    <div className="card">
                      <div className="empty">
                        <p>Select a class to view attendance history.</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Exam Performance Tab */}
          {activeTab === 'exams' && (
            <>
              <div className="page-header">
                <h2 className="page-title">Exam Performance</h2>
                {selectedClass && students.length > 0 && (
                  <button onClick={openExamModal} className="btn btn-primary" disabled={isReadOnly()}>
                    + Record Exam
                  </button>
                )}
              </div>

              <div className="card">
                <div className="card-body">
                  <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                    <div className="form-group">
                      <label className="form-label">Select Class</label>
                      <select
                        value={selectedClass?.id || ''}
                        onChange={(e) => {
                          const cls = classes.find(c => c.id === parseInt(e.target.value));
                          setSelectedClass(cls);
                          if (cls) {
                            fetchStudents();
                            fetchExamPerformance();
                          }
                        }}
                        className="form-select"
                      >
                        <option value="">-- Select a class --</option>
                        {classes.map(cls => (
                          <option key={cls.id} value={cls.id}>{cls.name}</option>
                        ))}
                      </select>
                    </div>
                    {schedulingMode === 'cohort' ? (
                      <div className="form-group">
                        <label className="form-label">Filter by Cohort Period</label>
                        <select
                          value={examFilterCohortPeriod}
                          onChange={(e) => setExamFilterCohortPeriod(e.target.value)}
                          className="form-select"
                          disabled={!selectedClass}
                        >
                          <option value="">All Periods</option>
                          {activePeriods.map(p => (
                            <option key={p.id} value={p.id}>{p.cohort_name} — {p.name}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <>
                        <div className="form-group">
                          <label className="form-label">Filter by Session</label>
                          <select
                            value={examFilterSession}
                            onChange={(e) => setExamFilterSession(e.target.value)}
                            className="form-select"
                            disabled={!selectedClass}
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
                            value={examFilterSemester}
                            onChange={(e) => setExamFilterSemester(e.target.value)}
                            className="form-select"
                            disabled={!selectedClass}
                          >
                            <option value="">All Semesters</option>
                            {examFilteredSemesters.map(sem => (
                              <option key={sem.id} value={sem.id}>
                                {sem.name} {sem.is_active ? '(Active)' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                    <div className="form-group">
                      <label className="form-label">Filter by Subject</label>
                      <select
                        value={selectedSubject}
                        onChange={(e) => {
                          setSelectedSubject(e.target.value);
                        }}
                        className="form-select"
                        disabled={!selectedClass}
                      >
                        <option value="all">All Subjects</option>
                        {availableSubjects.map(subject => (
                          <option key={subject} value={subject}>{subject}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* KPIs by Subject */}
              {selectedClass && examKpis && examKpis.length > 0 && (() => {
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
                            Subject {startIndex + 1} of {totalSubjects}
                          </div>
                          <div className="subject-pagination-btns" style={{ display: 'flex', gap: 'var(--sm)' }}>
                            <button
                              onClick={() => setCurrentSubjectPage(prev => Math.max(1, prev - 1))}
                              disabled={currentSubjectPage === 1}
                              className="btn-sm"
                              style={{ opacity: currentSubjectPage === 1 ? 0.5 : 1 }}
                            >
                              ← Prev
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
                              Next →
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {currentSubjects.map(kpi => (
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

                      {/* Exam Batches - Grouped by Date/Semester */}
                      {kpi.examBatches && kpi.examBatches.map((batch, batchIndex) => (
                        <div key={batchIndex} className="card" style={{ marginBottom: 'var(--md)' }}>
                          <div className="exam-batch-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--md)', padding: 'var(--sm)', backgroundColor: 'var(--gray-50)', borderRadius: 'var(--radius)' }}>
                            <div>
                              <strong style={{ fontSize: '15px' }}>
                                {fmtDate(batch.exam_date)} - {batch.semester_name} (Max: {batch.max_score})
                              </strong>
                              <span style={{ marginLeft: 'var(--md)', color: 'var(--muted)', fontSize: '13px' }}>
                                {batch.records.length} student{batch.records.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--sm)' }}>
                              <button
                                onClick={() => handleEditExamBatch(kpi.subject, batch)}
                                className="btn-sm btn-edit"
                                title="Edit this exam batch"
                              >
                                Edit Batch
                              </button>
                              <button
                                onClick={() => setDeleteExamBatch({
                                  subject: kpi.subject,
                                  exam_date: batch.exam_date,
                                  semester_name: batch.semester_name,
                                  student_count: batch.records.length,
                                  record_ids: batch.records.map(r => r.id)
                                })}
                                className="btn-sm btn-delete"
                                title="Delete this exam batch"
                              >
                                Delete Batch
                              </button>
                            </div>
                          </div>

                          {/* Student Performance Table */}
                          {/* Desktop table */}
                          <div className="exam-results-desktop">
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
                              render: (row) => fmtDate(row.exam_date)
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
                                <span style={{ color: 'var(--gray-500)', fontStyle: 'italic' }}>Absent</span>
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
                                           percentage >= 70 ? '#404040' :
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
                                      backgroundColor: '#f5f5f5',
                                      color: '#525252'
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
                                      backgroundColor: '#f0fdf4',
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
                                    backgroundColor: '#fef2f2',
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
                            },
                            {
                              key: 'actions',
                              label: 'Actions',
                              sortable: false,
                              render: (row) => (
                                <div style={{ display: 'flex', gap: 'var(--sm)' }}>
                                  <button
                                    onClick={() => handleEditExam(row)}
                                    className="btn-sm btn-edit"
                                    title="Edit"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => setDeleteExamId(row.id)}
                                    className="btn-sm btn-delete"
                                    title="Delete"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )
                            }
                          ]}
                          data={batch.records}
                        />
                          </div>

                          {/* Mobile cards */}
                          <div className="exam-results-mobile-cards">
                            {batch.records.map(row => {
                              const percentage = row.is_absent ? null : ((row.score / row.max_score) * 100).toFixed(1);
                              return (
                                <div key={row.id} className="admin-mobile-card">
                                  <div className="admin-mobile-card-top">
                                    <div>
                                      <div className="admin-mobile-card-title">{row.first_name} {row.last_name}</div>
                                      <div className="admin-mobile-card-sub">
                                        {row.is_absent ? (
                                          <span style={{ color: 'var(--gray-500)', fontStyle: 'italic' }}>Absent — {row.absence_reason || 'No reason'}</span>
                                        ) : (
                                          <span>Score: <strong>{row.score}/{row.max_score}</strong> ({percentage}%)</span>
                                        )}
                                      </div>
                                      {row.notes && <div className="admin-mobile-card-sub" style={{ marginTop: '2px' }}>{row.notes}</div>}
                                    </div>
                                    {!row.is_absent && (
                                      <div className="admin-mobile-card-badge" style={{
                                        color: percentage >= 80 ? 'var(--success)' : percentage >= 50 ? 'var(--warning)' : 'var(--error)',
                                        fontWeight: '700'
                                      }}>
                                        {percentage}%
                                      </div>
                                    )}
                                  </div>
                                  <div className="admin-mobile-card-actions">
                                    <button onClick={() => handleEditExam(row)} className="btn btn-sm btn-secondary">Edit</button>
                                    <button onClick={() => setDeleteExamId(row.id)} className="btn btn-sm btn-secondary btn-danger">Delete</button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                  </>
                );
              })()}

              {selectedClass && examPerformance.length === 0 && (
                <div className="card">
                  <div className="empty">
                    <p>No exam records yet for this class.</p>
                  </div>
                </div>
              )}

              {!selectedClass && (
                <div className="card">
                  <div className="empty">
                    <p>Select a class to view exam performance.</p>
                  </div>
                </div>
              )}

              {/* Exam Modal */}
              {showExamModal && (
                <div className="modal-overlay" onClick={() => setShowExamModal(false)}>
                  <div className="modal modal-large" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1200px', width: '95%' }}>
                    <div className="modal-header">
                      <h3 className="modal-title">Record Exam Performance - {examForm.subject || 'Subject'}</h3>
                      <button onClick={() => setShowExamModal(false)} className="modal-close">×</button>
                    </div>
                    <form onSubmit={handleExamSubmit}>
                      <div className="modal-body">
                        {/* Session and Semester (Selectable with active highlighted) */}
                        <div className="form-grid form-grid-2" style={{ marginBottom: 'var(--md)' }}>
                          <div className="form-group">
                            <label className="form-label">Session *</label>
                            <select
                              className="form-select"
                              value={examForm.session_id}
                              onChange={(e) => {
                                const sessionId = parseInt(e.target.value);
                                setExamForm({
                                  ...examForm,
                                  session_id: sessionId,
                                  semester_id: '' // Reset semester when session changes
                                });
                              }}
                              required
                            >
                              {sessions.map(session => (
                                <option key={session.id} value={session.id}>
                                  {session.name} {session.is_active ? '✓ (Active)' : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="form-group">
                            <label className="form-label">Semester *</label>
                            <select
                              className="form-select"
                              value={examForm.semester_id}
                              onChange={(e) => setExamForm({...examForm, semester_id: parseInt(e.target.value)})}
                              required
                            >
                              {semesters
                                .filter(sem => sem.session_id === examForm.session_id)
                                .map(sem => (
                                  <option key={sem.id} value={sem.id}>
                                    {sem.name} {sem.is_active ? '✓ (Active)' : ''}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>

                        {/* Exam Details */}
                        <div className="form-grid form-grid-3" style={{ marginBottom: 'var(--md)' }}>
                          <div className="form-group">
                            <label className="form-label">Subject *</label>
                            <input
                              type="text"
                              className="form-input"
                              value={examForm.subject}
                              onChange={(e) => setExamForm({...examForm, subject: e.target.value})}
                              placeholder="e.g., Mathematics, Quran"
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Exam Date *</label>
                            <input
                              type="date"
                              className="form-input"
                              value={examForm.exam_date}
                              onChange={(e) => setExamForm({...examForm, exam_date: e.target.value})}
                              max={getLocalDate()}
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Total Score (Max) *</label>
                            <input
                              type="number"
                              className="form-input"
                              value={examForm.max_score}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === '' || (parseFloat(value) >= 1 && parseFloat(value) <= 1000)) {
                                  setExamForm({...examForm, max_score: value});
                                }
                              }}
                              onBlur={(e) => {
                                const value = parseFloat(e.target.value);
                                if (isNaN(value) || value < 1) {
                                  setExamForm({...examForm, max_score: 100});
                                  toast.warning('Max score set to 100 (minimum is 1)');
                                } else if (value > 1000) {
                                  setExamForm({...examForm, max_score: 1000});
                                  toast.warning('Max score set to 1000 (maximum allowed)');
                                }
                              }}
                              min="1"
                              max="1000"
                              step="0.1"
                              placeholder="100"
                              required
                            />
                          </div>
                        </div>

                        {/* Student Scores Table */}
                        <div style={{ marginBottom: 'var(--md)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sm)' }}>
                            <h4 style={{ fontSize: 'var(--text-lg)', fontWeight: '600', margin: 0 }}>
                              Student Scores
                            </h4>
                            <div style={{ position: 'relative' }} className="exam-search-container">
                              <input
                                type="text"
                                className="form-input"
                                placeholder="Search by name or ID..."
                                value={examStudentSearch}
                                onChange={(e) => setExamStudentSearch(e.target.value)}
                                style={{ paddingLeft: '32px', fontSize: '16px' }}
                              />
                              <MagnifyingGlassIcon width={16} height={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                            </div>
                          </div>
                          <div className="exam-modal-table" style={{ overflowX: 'auto', maxHeight: '400px', border: 'var(--border)', borderRadius: 'var(--radius)' }}>
                            <table className="table exam-scores-table" style={{ minWidth: '100%' }}>
                              <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--gray-50)', zIndex: 1 }}>
                                <tr>
                                  <th style={{ width: '40px' }}>#</th>
                                  <th style={{ width: '180px' }}>Student Name</th>
                                  <th style={{ width: '100px' }}>Student ID</th>
                                  <th style={{ width: '120px' }}>Score</th>
                                  <th style={{ width: '100px' }}>Percentage</th>
                                  <th style={{ width: '100px' }}>Absent</th>
                                  <th style={{ width: '150px' }}>Absence Reason</th>
                                  <th>Notes</th>
                                </tr>
                              </thead>
                              <tbody>
                                {examForm.students
                                  .filter(student => {
                                    if (!examStudentSearch.trim()) return true;
                                    const searchLower = examStudentSearch.toLowerCase();
                                    return (
                                      student.student_name.toLowerCase().includes(searchLower) ||
                                      student.student_number.toLowerCase().includes(searchLower)
                                    );
                                  })
                                  .map((student, index) => (
                                  <tr key={student.student_id}>
                                    <td>{index + 1}</td>
                                    <td><strong>{student.student_name}</strong></td>
                                    <td>{student.student_number}</td>
                                    <td>
                                      <input
                                        type="number"
                                        className="form-input"
                                        value={student.score}
                                        onChange={(e) => updateStudentExamData(student.student_id, 'score', e.target.value)}
                                        onBlur={(e) => {
                                          // Validate on blur
                                          if (e.target.value !== '' && !student.is_absent) {
                                            const score = parseFloat(e.target.value);
                                            const maxScore = parseFloat(examForm.max_score);
                                            if (isNaN(score) || score < 0) {
                                              updateStudentExamData(student.student_id, 'score', '0');
                                            } else if (score > maxScore) {
                                              updateStudentExamData(student.student_id, 'score', maxScore.toString());
                                            }
                                          }
                                        }}
                                        min="0"
                                        max={examForm.max_score}
                                        step="0.1"
                                        placeholder="0"
                                        disabled={student.is_absent}
                                        style={{ 
                                          width: '100%',
                                          backgroundColor: student.is_absent ? 'var(--gray-100)' : 'white'
                                        }}
                                      />
                                    </td>
                                    <td>
                                      <span style={{
                                        fontWeight: '600',
                                        color: student.is_absent ? 'var(--gray-500)' : 
                                               calculatePercentage(student.score, examForm.max_score) >= 70 ? 'var(--success)' :
                                               calculatePercentage(student.score, examForm.max_score) >= 50 ? 'var(--warning)' : 'var(--error)'
                                      }}>
                                        {student.is_absent ? 'N/A' : `${calculatePercentage(student.score, examForm.max_score)}%`}
                                      </span>
                                    </td>
                                    <td>
                                      <input
                                        type="checkbox"
                                        checked={student.is_absent}
                                        onChange={(e) => updateStudentExamData(student.student_id, 'is_absent', e.target.checked)}
                                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                      />
                                    </td>
                                    <td>
                                      <select
                                        className="form-select"
                                        value={student.absence_reason}
                                        onChange={(e) => updateStudentExamData(student.student_id, 'absence_reason', e.target.value)}
                                        disabled={!student.is_absent}
                                        style={{ 
                                          width: '100%',
                                          fontSize: '0.875rem',
                                          backgroundColor: !student.is_absent ? 'var(--gray-100)' : 'white'
                                        }}
                                      >
                                        <option value="">Select...</option>
                                        <option value="Sick">Sick</option>
                                        <option value="Parent Request">Parent Request</option>
                                        <option value="School Not Notified">School Not Notified</option>
                                        <option value="Other">Other</option>
                                      </select>
                                    </td>
                                    <td>
                                      <input
                                        type="text"
                                        className="form-input"
                                        value={student.notes}
                                        onChange={(e) => updateStudentExamData(student.student_id, 'notes', e.target.value)}
                                        placeholder="Optional notes"
                                        style={{ width: '100%', fontSize: '0.875rem' }}
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Mobile Card View for Exam Scores */}
                          <div className="exam-modal-mobile-cards" style={{ display: 'none' }}>
                            {examForm.students
                              .filter(student => {
                                if (!examStudentSearch.trim()) return true;
                                const searchLower = examStudentSearch.toLowerCase();
                                return (
                                  student.student_name.toLowerCase().includes(searchLower) ||
                                  student.student_number.toLowerCase().includes(searchLower)
                                );
                              })
                              .map((student, index) => (
                              <div key={student.student_id} className="exam-student-card">
                                <div className="student-header">
                                  <div>
                                    <div className="student-name">{index + 1}. {student.student_name}</div>
                                    <div className="student-id">{student.student_number}</div>
                                  </div>
                                  <div className="percentage-badge" style={{
                                    color: student.is_absent ? '#a3a3a3' :
                                      calculatePercentage(student.score, examForm.max_score) >= 70 ? '#404040' :
                                      calculatePercentage(student.score, examForm.max_score) >= 50 ? '#737373' : '#0a0a0a'
                                  }}>
                                    {student.is_absent ? 'Absent' : `${calculatePercentage(student.score, examForm.max_score)}%`}
                                  </div>
                                </div>

                                {!student.is_absent && (
                                  <div className="score-row">
                                    <input
                                      type="number"
                                      className="score-input"
                                      value={student.score}
                                      onChange={(e) => updateStudentExamData(student.student_id, 'score', e.target.value)}
                                      onBlur={(e) => {
                                        if (e.target.value !== '') {
                                          const score = parseFloat(e.target.value);
                                          const maxScore = parseFloat(examForm.max_score);
                                          if (isNaN(score) || score < 0) {
                                            updateStudentExamData(student.student_id, 'score', '0');
                                          } else if (score > maxScore) {
                                            updateStudentExamData(student.student_id, 'score', maxScore.toString());
                                          }
                                        }
                                      }}
                                      min="0"
                                      max={examForm.max_score}
                                      step="0.1"
                                      placeholder={`Score / ${examForm.max_score}`}
                                    />
                                  </div>
                                )}

                                <div className="absent-row">
                                  <label>
                                    <input
                                      type="checkbox"
                                      checked={student.is_absent}
                                      onChange={(e) => updateStudentExamData(student.student_id, 'is_absent', e.target.checked)}
                                    />
                                    <span>Absent</span>
                                  </label>
                                </div>

                                {student.is_absent && (
                                  <div className="absence-reason-row">
                                    <select
                                      value={student.absence_reason}
                                      onChange={(e) => updateStudentExamData(student.student_id, 'absence_reason', e.target.value)}
                                    >
                                      <option value="">Absence reason...</option>
                                      <option value="Sick">Sick</option>
                                      <option value="Parent Request">Parent Request</option>
                                      <option value="School Not Notified">School Not Notified</option>
                                      <option value="Other">Other</option>
                                    </select>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="modal-footer">
                        <button type="button" onClick={() => setShowExamModal(false)} className="btn btn-secondary">
                          Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                          Save All Exam Records
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Student Reports Tab */}
          {activeTab === 'reports' && (
            <>
              <div className="section-header">
                <h2 className="page-title">Exam Reports</h2>
                <p style={{ color: 'var(--muted)', marginTop: 'var(--sm)' }}>
                  View overall performance summary for each student
                </p>
              </div>

              {/* Filters Card */}
              <div className="card">
                <h3 style={{ marginBottom: 'var(--md)' }}>Filters</h3>
                <div className="filters">
                  <div className="filter-grid">
                    <div className="form-group">
                      <label className="form-label">Class *</label>
                      <select
                        value={selectedClass?.id || ''}
                        onChange={(e) => {
                          const cls = classes.find(c => c.id === parseInt(e.target.value));
                          setSelectedClass(cls || null);
                          if (cls) {
                            fetchStudents();
                            fetchStudentReports();
                          }
                        }}
                        className="form-select"
                      >
                        <option value="">-- Select a class --</option>
                        {classes.map(cls => (
                          <option key={cls.id} value={cls.id}>{cls.name}</option>
                        ))}
                      </select>
                    </div>
                    {schedulingMode === 'cohort' ? (
                      <div className="form-group">
                        <label className="form-label">Filter by Cohort Period</label>
                        <select
                          value={reportFilterCohortPeriod}
                          onChange={(e) => setReportFilterCohortPeriod(e.target.value)}
                          className="form-select"
                          disabled={!selectedClass}
                        >
                          <option value="">All Periods</option>
                          {activePeriods.map(p => (
                            <option key={p.id} value={p.id}>{p.cohort_name} — {p.name}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <>
                        <div className="form-group">
                          <label className="form-label">Filter by Session</label>
                          <select
                            value={reportFilterSession}
                            onChange={(e) => setReportFilterSession(e.target.value)}
                            className="form-select"
                            disabled={!selectedClass}
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
                            value={reportFilterSemester}
                            onChange={(e) => setReportFilterSemester(e.target.value)}
                            className="form-select"
                            disabled={!selectedClass}
                          >
                            <option value="">All Semesters</option>
                            {reportFilteredSemesters.map(sem => (
                              <option key={sem.id} value={sem.id}>
                                {sem.name} {sem.is_active ? '(Active)' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                    <div className="form-group">
                      <label className="form-label">Filter by Subject</label>
                      <select
                        value={reportFilterSubject}
                        onChange={(e) => setReportFilterSubject(e.target.value)}
                        className="form-select"
                        disabled={!selectedClass}
                      >
                        <option value="all">All Subjects</option>
                        {reportAvailableSubjects.map(subject => (
                          <option key={subject} value={subject}>{subject}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Exam Reports Table */}
              {selectedClass && studentReports.length > 0 && (
                <div className="card">
                  <h3 style={{ marginBottom: 'var(--md)' }}>
                    Class Rankings - {selectedClass.name}
                  </h3>

                  {/* Desktop Table View */}
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
                              color: rank === 1 ? '#ffd700' : rank === 2 ? '#c0c0c0' : rank === 3 ? '#cd7f32' : 'var(--text)'
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

                  {/* Mobile Card View */}
                  <div className="rankings-mobile">
                    {[...studentReports]
                      .sort((a, b) => (a.rank || 999) - (b.rank || 999))
                      .map((row) => {
                        const percentage = parseFloat(row.overall_percentage);
                        const statusLabel = percentage >= 80 ? 'Excellent' : percentage >= 70 ? 'Good' : percentage >= 50 ? 'Average' : 'Needs Attention';
                        const statusColor = percentage >= 80 ? '#404040' : percentage >= 70 ? '#525252' : percentage >= 50 ? '#737373' : '#0a0a0a';
                        const statusBg = percentage >= 80 ? '#f5f5f5' : percentage >= 70 ? '#f5f5f5' : percentage >= 50 ? '#f5f5f5' : '#f5f5f5';
                        const percentColor = percentage >= 80 ? '#404040' : percentage >= 70 ? '#525252' : percentage >= 50 ? '#737373' : '#0a0a0a';
                        return (
                          <div key={row.student_id} className="ranking-card">
                            <div className="ranking-card-top">
                              <div className="ranking-card-rank">
                                {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : `#${row.rank}`}
                              </div>
                              <div className="ranking-card-student">
                                <div className="ranking-card-name">{row.first_name} {row.last_name}</div>
                                <div className="ranking-card-id">{row.student_id}</div>
                              </div>
                              <div className="ranking-card-score" style={{ color: percentColor }}>
                                {row.overall_percentage}%
                              </div>
                            </div>
                            <div className="ranking-card-details">
                              <div className="ranking-detail">
                                <span className="ranking-detail-label">Score</span>
                                <span className="ranking-detail-value">{row.total_score}/{row.total_max_score}</span>
                              </div>
                              <div className="ranking-detail">
                                <span className="ranking-detail-label">Subjects</span>
                                <span className="ranking-detail-value">{row.subject_count}</span>
                              </div>
                              <div className="ranking-detail">
                                <span className="ranking-detail-label">Taken</span>
                                <span className="ranking-detail-value">{row.exams_taken}</span>
                              </div>
                              {row.exams_absent > 0 && (
                                <div className="ranking-detail">
                                  <span className="ranking-detail-label">Absent</span>
                                  <span className="ranking-detail-value" style={{ color: '#0a0a0a' }}>{row.exams_absent}</span>
                                </div>
                              )}
                              <div className="ranking-detail">
                                <span className="ranking-status" style={{ backgroundColor: statusBg, color: statusColor }}>{statusLabel}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {selectedClass && studentReports.length === 0 && (
                <div className="card">
                  <div className="empty">
                    <p>No exam data available for this class. Students need to have exam records to appear here.</p>
                  </div>
                </div>
              )}

              {!selectedClass && (
                <div className="card">
                  <div className="empty">
                    <p>Please select a class to view exam reports.</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Learning Tab (Qur'an + Courses) */}
          {activeTab === 'quran' && (
            <>
              <div className="page-header">
                <h2 className="page-title">Learning</h2>
              </div>

              {/* Class selector */}
              <div className="card" style={{ marginBottom: 'var(--md)' }}>
                <div className="card-body">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Class</label>
                    <select
                      className="form-select"
                      value={selectedClass?.id || ''}
                      onChange={e => {
                        const cls = classes.find(c => c.id === parseInt(e.target.value));
                        setSelectedClass(cls || null);
                      }}
                    >
                      <option value="">— Select a class —</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Sub-tab pills */}
              <div className="sub-tab-pills" style={{ marginBottom: 'var(--md)' }}>
                <button
                  className={`sub-tab-pill ${learningSubTab === 'quran' ? 'active' : ''}`}
                  onClick={() => setLearningSubTab('quran')}
                >
                  Qur'an
                </button>
                <button
                  className={`sub-tab-pill ${learningSubTab === 'courses' ? 'active' : ''}`}
                  onClick={() => setLearningSubTab('courses')}
                >
                  Courses
                </button>
              </div>

              {/* Qur'an sub-tab */}
              {learningSubTab === 'quran' && (
                !selectedClass ? (
                  <div className="card" style={{ padding: 'var(--lg)', textAlign: 'center' }}>
                    <p className="empty">Select a class above to record Qur'an progress</p>
                  </div>
                ) : (
                  <QuranSessionRecorder
                    students={students}
                    api={api}
                    selectedClass={selectedClass}
                    activeSemester={activeSemester}
                    cohortPeriodId={schedulingMode === 'cohort' ? selectedCohortPeriod?.id : undefined}
                    routePrefix="/teacher"
                    onSessionSaved={() => {
                      fetchQuranPositions(selectedClass?.id);
                      if (activeSemester || selectedCohortPeriod) fetchQuranProgress(selectedClass?.id);
                    }}
                  />
                )
              )}

              {/* Courses sub-tab */}
              {learningSubTab === 'courses' && (
                !selectedClass ? (
                  <div className="card" style={{ padding: 'var(--lg)', textAlign: 'center' }}>
                    <p className="empty">Select a class above to view courses</p>
                  </div>
                ) : classCourses.length === 0 ? (
                  <div className="card" style={{ padding: 'var(--lg)', textAlign: 'center' }}>
                    <p className="empty">No courses have been set up for this class yet. Ask your admin to add courses.</p>
                  </div>
                ) : (
                  <>
                    {/* Course selector pills */}
                    <div className="sub-tab-pills" style={{ marginBottom: 'var(--md)', flexWrap: 'wrap' }}>
                      {classCourses.map(course => (
                        <button
                          key={course.id}
                          className={`sub-tab-pill ${selectedCourse?.id === course.id ? 'active' : ''}`}
                          style={selectedCourse?.id === course.id && course.colour ? { background: course.colour, borderColor: course.colour, color: '#fff' } : {}}
                          onClick={() => {
                            setSelectedCourse(course);
                            fetchCourseUnits(course.id);
                            fetchCourseProgress(selectedClass.id, course.id);
                            setShowCourseProgressForm(false);
                          }}
                        >
                          {course.name}
                        </button>
                      ))}
                    </div>

                    {selectedCourse && (
                      <>
                        {/* Unit list with record button */}
                        {courseUnits.length === 0 ? (
                          <div className="card" style={{ padding: 'var(--lg)', textAlign: 'center' }}>
                            <p className="empty">No units in this course yet.</p>
                          </div>
                        ) : (
                          <>
                            <div className="card" style={{ padding: 'var(--md)', marginBottom: 'var(--md)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <h3 style={{ margin: 0, fontSize: '1rem' }}>{selectedCourse.name} — Units</h3>
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => {
                                    setCourseProgressForm({ student_id: '', date: getLocalDate ? getLocalDate() : new Date().toISOString().slice(0,10), grade: 'Good', passed: true, notes: '' });
                                    setSelectedCourseUnit(null);
                                    setShowCourseProgressForm(true);
                                  }}
                                >
                                  + Record Progress
                                </button>
                              </div>

                              {/* Record progress form */}
                              {showCourseProgressForm && (
                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                                  <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem' }}>Record Progress</h4>
                                  <div className="form-group">
                                    <label className="form-label">Unit</label>
                                    <select
                                      className="form-select"
                                      value={selectedCourseUnit?.id || ''}
                                      onChange={e => setSelectedCourseUnit(courseUnits.find(u => u.id === parseInt(e.target.value)) || null)}
                                    >
                                      <option value="">Select unit...</option>
                                      {courseUnits.map((u, i) => <option key={u.id} value={u.id}>{i+1}. {u.title}</option>)}
                                    </select>
                                  </div>
                                  <div className="form-group">
                                    <label className="form-label">Student</label>
                                    <select
                                      className="form-select"
                                      value={courseProgressForm.student_id}
                                      onChange={e => setCourseProgressForm(f => ({ ...f, student_id: e.target.value }))}
                                    >
                                      <option value="">Select student...</option>
                                      {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                                    </select>
                                  </div>
                                  <div className="form-group">
                                    <label className="form-label">Date</label>
                                    <input type="date" className="form-input" value={courseProgressForm.date} onChange={e => setCourseProgressForm(f => ({ ...f, date: e.target.value }))} />
                                  </div>
                                  <div className="form-group">
                                    <label className="form-label">Grade</label>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                      {['Excellent', 'Good', 'Fair', 'Needs Improvement'].map(g => (
                                        <button
                                          key={g}
                                          type="button"
                                          className={`btn btn-sm ${courseProgressForm.grade === g ? 'btn-primary' : 'btn-secondary'}`}
                                          onClick={() => setCourseProgressForm(f => ({ ...f, grade: g }))}
                                        >{g}</button>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="form-group">
                                    <label className="form-label">Outcome</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                      <button
                                        type="button"
                                        className={`btn btn-sm ${courseProgressForm.passed ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => setCourseProgressForm(f => ({ ...f, passed: true }))}
                                      >Pass</button>
                                      <button
                                        type="button"
                                        className={`btn btn-sm ${!courseProgressForm.passed ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => setCourseProgressForm(f => ({ ...f, passed: false }))}
                                      >Repeat</button>
                                    </div>
                                  </div>
                                  <div className="form-group">
                                    <label className="form-label">Notes <span style={{ fontSize: '0.75rem', color: '#888' }}>(optional)</span></label>
                                    <input type="text" className="form-input" value={courseProgressForm.notes} onChange={e => setCourseProgressForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any notes..." />
                                  </div>
                                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                    <button className="btn btn-secondary btn-sm" onClick={() => setShowCourseProgressForm(false)}>Cancel</button>
                                    <button
                                      className="btn btn-primary btn-sm"
                                      disabled={savingCourseProgress || !selectedCourseUnit || !courseProgressForm.student_id || !courseProgressForm.date}
                                      onClick={async () => {
                                        setSavingCourseProgress(true);
                                        try {
                                          const params = schedulingMode === 'cohort' && selectedCohortPeriod
                                            ? { cohort_period_id: selectedCohortPeriod.id }
                                            : activeSemester ? { semester_id: activeSemester.id } : {};
                                          await api.post(`/teacher/classes/${selectedClass.id}/courses/${selectedCourse.id}/progress`, {
                                            unit_id: selectedCourseUnit.id,
                                            student_id: parseInt(courseProgressForm.student_id),
                                            date: courseProgressForm.date,
                                            grade: courseProgressForm.grade,
                                            passed: courseProgressForm.passed,
                                            notes: courseProgressForm.notes || null,
                                            ...params,
                                          });
                                          toast.success('Progress recorded');
                                          setShowCourseProgressForm(false);
                                          fetchCourseProgress(selectedClass.id, selectedCourse.id);
                                        } catch {
                                          toast.error('Failed to save progress');
                                        } finally {
                                          setSavingCourseProgress(false);
                                        }
                                      }}
                                    >
                                      {savingCourseProgress ? 'Saving...' : 'Save'}
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Units list */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {courseUnits.map((unit, idx) => {
                                  const unitRecords = courseProgress.filter(r => r.unit_id === unit.id);
                                  const lastRecord = unitRecords[0];
                                  return (
                                    <div key={unit.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fafafa' }}>
                                      <span style={{ flexShrink: 0, width: 24, height: 24, background: selectedCourse.colour || '#475569', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 600 }}>{idx+1}</span>
                                      <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{unit.title}</div>
                                        {lastRecord && (
                                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 2 }}>
                                            Last: {lastRecord.first_name} {lastRecord.last_name} — {lastRecord.grade} — {lastRecord.date ? lastRecord.date.slice(0,10) : ''}
                                          </div>
                                        )}
                                      </div>
                                      <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>{unitRecords.length} record{unitRecords.length !== 1 ? 's' : ''}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Progress history */}
                            {courseProgressLoading ? (
                              <div style={{ textAlign: 'center', padding: 'var(--lg)' }}>Loading...</div>
                            ) : courseProgress.length > 0 && (
                              <div className="card" style={{ padding: 'var(--md)' }}>
                                <h3 style={{ margin: '0 0 12px', fontSize: '1rem' }}>Progress History</h3>
                                <div style={{ overflowX: 'auto' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                    <thead>
                                      <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                        <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 600 }}>Date</th>
                                        <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 600 }}>Student</th>
                                        <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 600 }}>Unit</th>
                                        <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 600 }}>Grade</th>
                                        <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 600 }}>Outcome</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {courseProgress.map(r => (
                                        <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                          <td style={{ padding: '8px 0', color: '#6b7280' }}>{r.date ? r.date.slice(0,10) : ''}</td>
                                          <td style={{ padding: '8px 0' }}>{r.first_name} {r.last_name}</td>
                                          <td style={{ padding: '8px 0', color: '#374151' }}>{r.unit_title}</td>
                                          <td style={{ padding: '8px 0' }}>{r.grade}</td>
                                          <td style={{ padding: '8px 0' }}>
                                            <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: 4, background: r.passed ? '#dcfce7' : '#fef9c3', color: r.passed ? '#166534' : '#713f12' }}>
                                              {r.passed ? 'Pass' : 'Repeat'}
                                            </span>
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
                      </>
                    )}
                  </>
                )
              )}
            </>
          )}

          {/* Availability Tab */}
          {activeTab === 'availability' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sm)' }}>
                <h2 className="page-title" style={{ margin: 0 }}>My Availability</h2>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      const d = new Date(availabilityWeekStart + 'T00:00:00');
                      d.setDate(d.getDate() - 28);
                      setAvailabilityWeekStart(getLocalDate(d));
                    }}
                    style={{ minWidth: '36px', minHeight: '36px', padding: 0 }}
                  >
                    <ChevronLeftIcon width={16} height={16} />
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() - d.getDay());
                      setAvailabilityWeekStart(getLocalDate(d));
                    }}
                    style={{ fontSize: '12px', minHeight: '36px', padding: '0 10px' }}
                  >
                    Today
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      const d = new Date(availabilityWeekStart + 'T00:00:00');
                      d.setDate(d.getDate() + 28);
                      setAvailabilityWeekStart(getLocalDate(d));
                    }}
                    style={{ minWidth: '36px', minHeight: '36px', padding: 0 }}
                  >
                    <ChevronRightIcon width={16} height={16} />
                  </button>
                </div>
              </div>

              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: 'var(--md)' }}>
                Tap a date to mark yourself as unavailable. Your admin will see this on their dashboard.
              </p>

              {availabilityLoading ? (
                <div className="card" style={{ padding: 'var(--lg)', textAlign: 'center' }}>Loading...</div>
              ) : (
                <>
                  {(() => {
                    const days = getAvailabilityDays();
                    const weeks = [];
                    for (let i = 0; i < days.length; i += 7) {
                      weeks.push(days.slice(i, i + 7));
                    }
                    return weeks.map((week, wi) => (
                      <div key={wi} className="card" style={{ marginBottom: 'var(--sm)', overflow: 'hidden' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', padding: '8px 12px', borderBottom: '1px solid #f3f4f6' }}>
                          {week[0].month} {week[0].dayNum} — {week[6].month} {week[6].dayNum}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: '#e5e7eb' }}>
                          {week.map(day => {
                            const isUnavailable = day.status === 'unavailable';
                            const isToday = day.date === getLocalDate();
                            const isOff = day.isHoliday || day.isNonSchoolDay;
                            const statusColor = isOff ? '#9ca3af' : isUnavailable ? '#dc2626' : '#16a34a';
                            return (
                              <button
                                key={day.date}
                                onClick={() => !day.isPast && !isOff && toggleAvailability(day.date, day.status)}
                                disabled={day.isPast || isOff}
                                aria-label={`${day.dayName} ${day.dayNum} ${day.month} — ${day.isOutsideSession ? 'Outside session' : day.isHoliday ? 'Holiday: ' + day.holidayTitle : day.isNonSchoolDay ? 'No class' : isUnavailable ? 'Unavailable' : 'Available'}${day.reason ? ': ' + day.reason : ''}`}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: '6px 2px',
                                  minHeight: '60px',
                                  background: isOff ? '#f3f4f6' : day.isPast ? '#f9fafb' : isUnavailable ? '#fef2f2' : '#f0fdf4',
                                  border: 'none',
                                  outline: isToday ? '2px solid #1a1a1a' : 'none',
                                  outlineOffset: '-2px',
                                  borderRadius: isToday ? '4px' : '0',
                                  cursor: day.isPast || isOff ? 'default' : 'pointer',
                                  opacity: day.isPast ? 0.45 : isOff ? 0.55 : 1,
                                  WebkitTapHighlightColor: 'transparent',
                                  touchAction: 'manipulation',
                                  gap: '2px',
                                }}
                              >
                                <span style={{ fontSize: '10px', fontWeight: 500, color: '#9ca3af', lineHeight: 1, letterSpacing: '0.3px' }}>
                                  {day.dayName.charAt(0)}
                                </span>
                                <span style={{ fontSize: '17px', fontWeight: 700, color: statusColor, lineHeight: 1 }}>
                                  {day.dayNum}
                                </span>
                                {isOff ? (
                                  <span style={{ fontSize: '8px', fontWeight: 600, color: '#b0b7c0', lineHeight: 1, textTransform: 'uppercase', letterSpacing: '0.2px' }}>
                                    {day.isHoliday ? 'Hol' : day.isOutsideSession ? '—' : '—'}
                                  </span>
                                ) : (
                                  <span style={{
                                    width: '6px', height: '6px', borderRadius: '50%',
                                    background: isUnavailable ? '#dc2626' : '#16a34a',
                                  }} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}

                  {/* Legend */}
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', padding: '8px 0', fontSize: '11px', color: '#9ca3af' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} /> Available
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} /> Unavailable
                    </span>
                    {(madrasahProfile?.availability_planner_aware === 1 || madrasahProfile?.availability_planner_aware === true) && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '10px', height: '2px', background: '#d1d5db', display: 'inline-block', borderRadius: '1px' }} /> No class
                      </span>
                    )}
                  </div>
                </>
              )}

              {/* Reason modal — mobile-friendly bottom sheet style */}
              {availabilityReasonDate && (
                <div className="modal-overlay" onClick={() => setAvailabilityReasonDate(null)} style={{ alignItems: 'flex-end' }}>
                  <div
                    className="modal"
                    onClick={e => e.stopPropagation()}
                    style={{
                      maxWidth: '400px',
                      width: '100%',
                      margin: '0 auto',
                      borderRadius: '16px 16px 0 0',
                      paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
                      <div style={{ width: '36px', height: '4px', background: '#d1d5db', borderRadius: '2px' }} />
                    </div>
                    <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                      <h3 className="modal-title">Mark Unavailable</h3>
                      <button className="modal-close" onClick={() => setAvailabilityReasonDate(null)}>&times;</button>
                    </div>
                    <div className="modal-body">
                      <p style={{ fontSize: '15px', color: '#374151', marginBottom: 'var(--md)', fontWeight: 500 }}>
                        {new Date(availabilityReasonDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      <div className="form-group">
                        <label className="form-label">Reason (optional)</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Sick leave, travel, personal"
                          value={availabilityReason}
                          onChange={e => setAvailabilityReason(e.target.value)}
                          maxLength={255}
                          autoFocus
                          onKeyDown={e => e.key === 'Enter' && confirmUnavailable()}
                          style={{ fontSize: '16px', padding: '12px' }}
                        />
                      </div>
                    </div>
                    <div className="modal-footer" style={{ display: 'flex', gap: '8px', padding: '12px 16px' }}>
                      <button className="btn btn-secondary" onClick={() => setAvailabilityReasonDate(null)} style={{ flex: 1, padding: '12px', fontSize: '15px' }}>Cancel</button>
                      <button className="btn btn-primary" onClick={confirmUnavailable} style={{ flex: 1, padding: '12px', fontSize: '15px' }}>Confirm</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Help Tab */}
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
                  <ChevronDownIcon width={16} height={16} style={{ transform: helpExpanded.has(sectionKey) ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
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
                <div className="page-header no-print">
                  <h2 className="page-title">Help</h2>
                  <button className="btn btn-secondary btn-sm" onClick={() => { localStorage.removeItem('tour_teacher_done'); setShowTour(true); }}>Replay Tour</button>
                </div>

                <HelpSection sectionKey="getting-started" title="Getting Started" items={[
                  { title: 'Your dashboard overview', content: 'The Overview tab shows your assigned classes, today\'s schedule, and quick-action buttons to take attendance. It\'s your starting point each day.' },
                  { title: 'How classes are assigned', content: 'Your admin assigns classes to you. You\'ll see all your assigned classes on the Overview and can mark attendance or record exams for them. If a class is missing, contact your admin.' },
                  { title: 'Active semester', content: 'Your dashboard automatically uses the active semester set by your admin. You cannot change the semester — all attendance and exam records are filed under the current active semester.' },
                ]} />

                <HelpSection sectionKey="attendance" title="Attendance" items={[
                  { title: 'Mark attendance for a class', content: 'Go to Attendance, select your class and the date. You\'ll see a list of students — mark each as Present, Absent, Late, or Excused. Click "Save Attendance" when done.' },
                  { title: 'Mark dressing, behavior, and punctuality', content: 'After marking presence, you can rate each student\'s dressing, behavior, and punctuality (Excellent, Good, Fair, or Poor) if these are enabled by your admin. These ratings appear in parent and admin reports.' },
                  { title: 'Absent reasons', content: 'For absent students, select a reason: Sick, Parent Request, School Not Notified, or Other. This helps the admin track absence patterns.' },
                  { title: 'Edit past attendance', content: 'Select a past date in the Attendance tab to view and edit previously marked records. Changes are saved immediately. You cannot record attendance for future dates.' },
                  { title: 'View attendance history', content: 'Switch to the "View" sub-tab in Attendance to see a summary of past attendance records for any class and date range.' },
                ]} />

                <HelpSection sectionKey="exams" title="Exams" items={[
                  { title: 'Record exam scores', content: 'Go to Exam Recording, select a class, subject, and exam type (e.g. Test, Quiz, Final). Enter each student\'s score out of the maximum marks, then save.' },
                  { title: 'Mark a student absent for an exam', content: 'If a student was absent for an exam, you can mark them as absent with a reason instead of entering a score.' },
                  { title: 'Edit or delete exam records', content: 'In Exam Recording, select the same class/subject/exam to view existing records. You can update scores or delete the entire exam record.' },
                ]} />

                <HelpSection sectionKey="reports" title="Reports" items={[
                  { title: 'View exam results', content: 'Go to Exam Reports and select a class. You\'ll see exam results sorted by subject and date, with averages and individual student scores.' },
                  { title: 'Student rankings', content: 'Reports show student rankings within their class based on exam performance. Rankings are tie-aware — students with the same percentage share the same rank.' },
                  { title: 'Export exam reports', content: 'Use the export button on the reports page to download results as a file for printing or sharing.' },
                ]} />

                {madrasahProfile?.enable_learning_tracker !== 0 && madrasahProfile?.enable_learning_tracker !== false && (
                  <HelpSection sectionKey="quran" title="Qur'an Tracker" items={[
                    { title: 'Update student progress', content: 'Go to Qur\'an Tracker and select a class. For each student, update their current position (Juz, Surah, Ayah). This helps track memorisation or reading progress over time.' },
                    { title: 'View progress history', content: 'Select a student to see their full Qur\'an progress history, including past positions and dates of each update.' },
                  ]} />
                )}

                <HelpSection sectionKey="availability" title="Availability" items={[
                  { title: 'Mark yourself as unavailable', content: 'Go to the Availability tab and tap on a date to mark yourself as unavailable. You can optionally add a reason (e.g. sick leave, travel). Your admin will see this on their dashboard.' },
                  { title: 'Cancel an unavailability', content: 'Tap on a date you\'ve already marked as unavailable to revert it back to available.' },
                ]} />

                <HelpSection sectionKey="settings" title="Settings" items={[
                  { title: 'Update your password', content: 'Click your profile icon at the bottom of the sidebar, then go to Settings. You can change your password from there.' },
                  { title: 'Keyboard shortcut', content: 'Press "/" on any page with a search field to quickly focus the search bar.' },
                ]} />
              </>
            );
          })()}

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
                    <p style={{ margin: '4px 0 0 0' }}>{user?.firstName} {user?.lastName}</p>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Email</label>
                    <p style={{ margin: '4px 0 0 0' }}>{user?.email || 'N/A'}</p>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Staff ID</label>
                    <p style={{ margin: '4px 0 0 0' }}>{user?.staffId || 'N/A'}</p>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Role</label>
                    <p style={{ margin: '4px 0 0 0', textTransform: 'capitalize' }}>Teacher</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Edit Exam Modal */}
      {showEditExamModal && editingExamRecord && (
        <div className="modal-overlay" onClick={() => setShowEditExamModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Exam Record</h3>
              <button onClick={() => setShowEditExamModal(false)} className="modal-close">×</button>
            </div>
            <form onSubmit={handleUpdateExam}>
              <div className="modal-body">
                {/* Student Info (Read-only) */}
                <div style={{ padding: 'var(--md)', backgroundColor: 'var(--gray-50)', borderRadius: 'var(--radius)', marginBottom: 'var(--md)' }}>
                  <div className="edit-exam-info-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--sm)' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Student</label>
                      <p style={{ margin: '4px 0 0 0', fontWeight: '600' }}>{editingExamRecord.student_name}</p>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Student ID</label>
                      <p style={{ margin: '4px 0 0 0' }}>{editingExamRecord.student_id}</p>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Subject</label>
                      <p style={{ margin: '4px 0 0 0' }}>{editingExamRecord.subject}</p>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Semester</label>
                      <p style={{ margin: '4px 0 0 0' }}>{editingExamRecord.semester_name}</p>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Exam Date</label>
                      <p style={{ margin: '4px 0 0 0' }}>{fmtDate(editingExamRecord.exam_date)}</p>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Max Score</label>
                      <p style={{ margin: '4px 0 0 0' }}>{editingExamRecord.max_score}</p>
                    </div>
                  </div>
                </div>

                {/* Absent Checkbox */}
                <div className="form-group" style={{ marginBottom: 'var(--md)' }}>
                  <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sm)' }}>
                    <input
                      type="checkbox"
                      checked={editingExamRecord.is_absent}
                      onChange={(e) => setEditingExamRecord({
                        ...editingExamRecord,
                        is_absent: e.target.checked,
                        score: e.target.checked ? '' : editingExamRecord.score
                      })}
                    />
                    <span>Student was absent</span>
                  </label>
                </div>

                {/* Score or Absence Reason */}
                {!editingExamRecord.is_absent ? (
                  <div className="form-group">
                    <label className="form-label">Score *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingExamRecord.score}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || (parseFloat(value) >= 0 && parseFloat(value) <= editingExamRecord.max_score)) {
                          setEditingExamRecord({ ...editingExamRecord, score: value });
                        }
                      }}
                      min="0"
                      max={editingExamRecord.max_score}
                      step="0.1"
                      required
                    />
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">Absence Reason *</label>
                    <select
                      className="form-select"
                      value={editingExamRecord.absence_reason}
                      onChange={(e) => setEditingExamRecord({ ...editingExamRecord, absence_reason: e.target.value })}
                      required
                    >
                      <option value="">Select reason</option>
                      <option value="Sick">Sick</option>
                      <option value="Parent Request">Parent Request</option>
                      <option value="School Not Notified">School Not Notified</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                )}

                {/* Notes */}
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-input"
                    value={editingExamRecord.notes}
                    onChange={(e) => setEditingExamRecord({ ...editingExamRecord, notes: e.target.value })}
                    rows="3"
                    placeholder="Optional notes about this exam record"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowEditExamModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteExamId && (
        <div className="modal-overlay" onClick={() => setDeleteExamId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Confirm Delete</h3>
              <button onClick={() => setDeleteExamId(null)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this exam record? This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setDeleteExamId(null)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={() => handleDeleteExam(deleteExamId)} className="btn btn-danger">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Exam Batch Modal */}
      {showEditExamBatchModal && editingExamBatch && (
        <div className="modal-overlay" onClick={() => setShowEditExamBatchModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Exam Batch</h3>
              <button onClick={() => setShowEditExamBatchModal(false)} className="modal-close">×</button>
            </div>
            <form onSubmit={handleUpdateExamBatch}>
              <div className="modal-body">
                <div style={{ padding: 'var(--md)', backgroundColor: '#f5f5f5', borderRadius: 'var(--radius)', marginBottom: 'var(--md)', border: '1px solid #e5e5e5' }}>
                  <p style={{ margin: 0, fontSize: '14px', color: '#525252' }}>
                    <strong>⚠️ Batch Edit:</strong> This will update {editingExamBatch.student_count} student record{editingExamBatch.student_count !== 1 ? 's' : ''}.
                  </p>
                </div>

                <div className="form-grid" style={{ gridTemplateColumns: '1fr', gap: 'var(--md)' }}>
                  <div className="form-group">
                    <label className="form-label">Subject *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editingExamBatch.subject}
                      onChange={(e) => setEditingExamBatch({ ...editingExamBatch, subject: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Semester *</label>
                    <select
                      className="form-select"
                      value={editingExamBatch.semester_id}
                      onChange={(e) => setEditingExamBatch({ ...editingExamBatch, semester_id: parseInt(e.target.value) })}
                      required
                    >
                      {semesters.map(sem => (
                        <option key={sem.id} value={sem.id}>
                          {sem.name} {sem.is_active ? '✓ (Active)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Exam Date *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={editingExamBatch.exam_date}
                      onChange={(e) => setEditingExamBatch({ ...editingExamBatch, exam_date: e.target.value })}
                      max={getLocalDate()}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Max Score *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingExamBatch.max_score}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || (parseFloat(value) >= 1 && parseFloat(value) <= 1000)) {
                          setEditingExamBatch({ ...editingExamBatch, max_score: value });
                        }
                      }}
                      min="1"
                      max="1000"
                      step="0.1"
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowEditExamBatchModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Exam Batch Confirmation */}
      {deleteExamBatch && (
        <div className="modal-overlay" onClick={() => setDeleteExamBatch(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Confirm Batch Delete</h3>
              <button onClick={() => setDeleteExamBatch(null)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <div style={{ padding: 'var(--md)', backgroundColor: '#f8d7da', borderRadius: 'var(--radius)', marginBottom: 'var(--md)', border: '1px solid #dc3545' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#721c24' }}>
                  <strong>⚠️ Warning:</strong> This will permanently delete all exam records for:
                </p>
              </div>
              <div style={{ padding: 'var(--md)', backgroundColor: 'var(--gray-50)', borderRadius: 'var(--radius)' }}>
                <p style={{ margin: '0 0 8px 0' }}><strong>Subject:</strong> {deleteExamBatch.subject}</p>
                <p style={{ margin: '0 0 8px 0' }}><strong>Date:</strong> {fmtDate(deleteExamBatch.exam_date)}</p>
                <p style={{ margin: '0 0 8px 0' }}><strong>Semester:</strong> {deleteExamBatch.semester_name}</p>
                <p style={{ margin: 0 }}><strong>Students:</strong> {deleteExamBatch.student_count} record{deleteExamBatch.student_count !== 1 ? 's' : ''}</p>
              </div>
              <p style={{ marginTop: 'var(--md)', color: 'var(--error)' }}>This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setDeleteExamBatch(null)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleDeleteExamBatch} className="btn btn-danger">
                Delete All {deleteExamBatch.student_count} Records
              </button>
            </div>
          </div>
        </div>
      )}

      <GuidedTour
        steps={teacherTourSteps}
        isOpen={showTour}
        onComplete={() => { setShowTour(false); localStorage.setItem('tour_teacher_done', 'true'); }}
        onSkip={() => { setShowTour(false); localStorage.setItem('tour_teacher_done', 'true'); }}
      />

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{confirmModal.title}</h3>
              <button onClick={() => setConfirmModal(null)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '14px', color: '#525252', lineHeight: 1.6 }}>{confirmModal.message}</p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setConfirmModal(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }} className={`btn ${confirmModal.danger ? 'btn-danger' : 'btn-primary'}`}>
                {confirmModal.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Tab Bar */}
      <BottomTabBar
        tabs={bottomTabIds.map(id => {
          const iconProps = { width: 20, height: 20 };
          const icons = {
            overview: <HomeIcon {...iconProps} />,
            attendance: <ClipboardDocumentCheckIcon {...iconProps} />,
            quran: <BookOpenIcon {...iconProps} />,
            exams: <DocumentTextIcon {...iconProps} />,
          };
          const labels = { overview: 'Home', attendance: 'Attend.', quran: "Qur'an", exams: 'Exams' };
          return { id, label: labels[id] || id, icon: icons[id] };
        })}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onMoreClick={() => setMobileMenuOpen(true)}
        moreActive={!isBottomTab}
      />
    </div>
  );
}

export default TeacherDashboard;
