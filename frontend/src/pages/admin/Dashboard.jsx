import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  HomeIcon,
  CalendarIcon,
  BookOpenIcon,
  UsersIcon,
  UserGroupIcon,
  ArrowPathIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  QuestionMarkCircleIcon,
  ChatBubbleLeftIcon,
  ChatBubbleOvalLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  UserIcon,
  LockClosedIcon,
  Cog6ToothIcon,
  CreditCardIcon,
  ArrowRightStartOnRectangleIcon,
  CheckIcon,
  ComputerDesktopIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  StarIcon,
  ClockIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
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
import VerifiedBadge from '../../components/VerifiedBadge';
import GuidedTour from '../../components/GuidedTour';
import { handleApiError } from '../../utils/errorHandler';
import { downloadCSV, studentColumns, attendanceColumns, getAttendanceColumns, examColumns, getDateSuffix } from '../../utils/csvExport';
import BottomTabBar from '../../components/BottomTabBar';
import './Dashboard.css';

function AdminDashboard() {
  // Format date as "01 Sep 2025"
  const fmtDate = (d) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const [activeTab, setActiveTab] = useState('overview');
  const [sessions, setSessions] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const initialLoadDone = useRef(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [showSemesterForm, setShowSemesterForm] = useState(false);
  const [showClassForm, setShowClassForm] = useState(false);
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showBulkEnrollment, setShowBulkEnrollment] = useState(false);
  const [bulkEnrollmentDate, setBulkEnrollmentDate] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadClass, setUploadClass] = useState('');
  const [uploadResults, setUploadResults] = useState(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [newSession, setNewSession] = useState({ name: '', start_date: '', end_date: '', is_active: false });
  const [newSemester, setNewSemester] = useState({ session_id: '', name: '', start_date: '', end_date: '', is_active: false });
  const [newClass, setNewClass] = useState({ name: '', grade_level: '', school_days: [], description: '' });
  const [newTeacher, setNewTeacher] = useState({ 
    first_name: '', last_name: '', staff_id: '', email: '', 
    phone: '', phone_country_code: '+64',
    street: '', city: '', state: '', country: ''
  });
  const [newStudent, setNewStudent] = useState({
    first_name: '', last_name: '', student_id: '', gender: '', class_id: '', enrollment_date: '',
    student_phone: '', student_phone_country_code: '+64',
    street: '', city: '', state: '', country: '',
    parent_guardian_name: '', parent_guardian_relationship: '',
    parent_guardian_phone: '', parent_guardian_phone_country_code: '+64', notes: '',
    expected_fee: '', fee_note: ''
  });
  const [editingSession, setEditingSession] = useState(null);
  const [editingSemester, setEditingSemester] = useState(null);
  const [editingClass, setEditingClass] = useState(null);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [teacherSubTab, setTeacherSubTab] = useState('list');
  const [studentSubTab, setStudentSubTab] = useState('list');
  const [applications, setApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [pendingAppCount, setPendingAppCount] = useState(0);
  const [approveModal, setApproveModal] = useState(null);
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
  const [attendanceDateFrom, setAttendanceDateFrom] = useState('');
  const [attendanceDateTo, setAttendanceDateTo] = useState('');
  const [selectedClassForPerformance, setSelectedClassForPerformance] = useState(null);
  const [reportSubTab, setReportSubTab] = useState('attendance');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const analyticsLoadedOnce = useRef(false);
  const [analyticsFilterClass, setAnalyticsFilterClass] = useState('');
  const [analyticsFilterGender, setAnalyticsFilterGender] = useState('');
  const [expandedMetric, setExpandedMetric] = useState(null); // 'attention' | 'struggling' | null
  const [upcomingUnavailable, setUpcomingUnavailable] = useState([]);
  const [availabilityWeekStart, setAvailabilityWeekStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); return d;
  });
  const [availabilityData, setAvailabilityData] = useState([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [allTeachers, setAllTeachers] = useState([]);
  const [availabilityPlannerData, setAvailabilityPlannerData] = useState({ schoolDays: [], holidays: [], overrides: [] });
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
  // Settings state
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  // Billing state
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [selectedPlan, setSelectedPlan] = useState('plus');
  const [couponCode, setCouponCode] = useState('');
  const [madrasahProfile, setMadrasahProfile] = useState(null);
  // Mobile card search + pagination state
  const [mobileTeacherSearch, setMobileTeacherSearch] = useState('');
  const [mobileTeacherPage, setMobileTeacherPage] = useState(1);
  const [mobileStudentSearch, setMobileStudentSearch] = useState('');
  const [mobileStudentPage, setMobileStudentPage] = useState(1);
  const mobilePageSize = 10;
  // Students sub-tab state
  const [studentsSubTab, setStudentsSubTab] = useState('manage');
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
  // Fee tracking state
  const [feeSummary, setFeeSummary] = useState([]);
  const [feePayments, setFeePayments] = useState([]);
  const [feeLoading, setFeeLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(null);
  const [newPayment, setNewPayment] = useState({ amount_paid: '', payment_date: '', payment_method: 'cash', reference_note: '', payment_label: '' });
  const [feeClassFilter, setFeeClassFilter] = useState('');
  const [showBulkFeeModal, setShowBulkFeeModal] = useState(false);
  const [bulkFeeAmount, setBulkFeeAmount] = useState('');
  const [bulkFeeNote, setBulkFeeNote] = useState('');
  const [selectedStudentsForFee, setSelectedStudentsForFee] = useState([]);
  const [editingFee, setEditingFee] = useState(null);
  const [bulkFeeClassFilter, setBulkFeeClassFilter] = useState('');
  const [helpExpanded, setHelpExpanded] = useState(new Set());
  // Auto fee tracking state
  const [feeSchedules, setFeeSchedules] = useState([]);
  const [showFeeScheduleModal, setShowFeeScheduleModal] = useState(false);
  const [editingFeeSchedule, setEditingFeeSchedule] = useState(null);
  const [newFeeSchedule, setNewFeeSchedule] = useState({ class_id: '', student_id: '', billing_cycle: 'per_semester', amount: '', description: '' });
  const [feeScheduleScope, setFeeScheduleScope] = useState('all');
  const [autoFeeSummary, setAutoFeeSummary] = useState([]);
  const [feeSubTab, setFeeSubTab] = useState('summary');
  const [feeReport, setFeeReport] = useState(null);
  const [feeReportLoading, setFeeReportLoading] = useState(false);
  const [feeReportPeriod, setFeeReportPeriod] = useState('semester');
  const [feeReportSemesterId, setFeeReportSemesterId] = useState('');
  const [feeReportSessionId, setFeeReportSessionId] = useState('');
  const [feeSemesterFilter, setFeeSemesterFilter] = useState('');
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
  const [showTour, setShowTour] = useState(false);
  // SMS state
  const [smsStatus, setSmsStatus] = useState({ balance: 0, totalPurchased: 0, totalUsed: 0, sentThisMonth: 0, twilioConfigured: false, packs: [] });
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsSubTab, setSmsSubTab] = useState('overview'); // overview, send, reminders, history
  const [smsHistory, setSmsHistory] = useState([]);
  const [smsHistoryTotal, setSmsHistoryTotal] = useState(0);
  const [smsHistoryPage, setSmsHistoryPage] = useState(1);
  const [smsPurchases, setSmsPurchases] = useState([]);
  const [smsReminderStudents, setSmsReminderStudents] = useState([]);
  const [smsReminderClass, setSmsReminderClass] = useState('');
  const [smsReminderSendTo, setSmsReminderSendTo] = useState('parent'); // parent or student
  const [smsReminderMsg, setSmsReminderMsg] = useState('[{madrasah_name}] Dear Parent/Guardian, this is a reminder that the fee for {student_name} has an outstanding balance. Please make the payment at your earliest convenience. Thank you.');
  const [smsSelectedStudents, setSmsSelectedStudents] = useState([]);
  const [smsSending, setSmsSending] = useState(false);
  const [smsReminderPage, setSmsReminderPage] = useState(1);
  const [smsShowRecipients, setSmsShowRecipients] = useState(false);
  const [smsCustomPhone, setSmsCustomPhone] = useState('');
  const [smsCustomMsg, setSmsCustomMsg] = useState('');
  const [smsHistoryFilter, setSmsHistoryFilter] = useState('');
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

  const isReadOnly = () => {
    if (!madrasahProfile) return false;
    const status = madrasahProfile.subscription_status;
    // Expired trial = read-only
    if (status === 'trialing') {
      const trialEndsAt = madrasahProfile.trial_ends_at;
      if (trialEndsAt && new Date(trialEndsAt) <= new Date()) return true;
    }
    // Canceled, expired, or past due subscription = read-only
    if (status === 'canceled' || status === 'expired' || status === 'past_due') return true;
    return false;
  };

  const navGroups = [
    { items: [{ id: 'overview', label: 'Overview' }] },
    { label: 'Manage', items: [
      { id: 'classes', label: 'Classes' },
      { id: 'teachers', label: 'Teachers' },
      { id: 'students', label: 'Students' },
      ...(madrasahProfile?.enable_fee_tracking ? [{ id: 'fees', label: 'Fees' }] : []),
    ]},
    { label: 'Tools', items: [
      { id: 'planner', label: 'Planner' },
      ...(hasPlusAccess() ? [{ id: 'reports', label: 'Reports' }] : []),
      { id: 'sms', label: 'SMS' },
    ]},
    { label: 'Help', items: [
      { id: 'help', label: 'Help' },
      { id: 'support', label: 'Support' },
    ]},
  ];

  // Primary tabs for mobile bottom bar
  const bottomTabIds = ['overview', 'students', 'classes', ...(madrasahProfile?.enable_fee_tracking ? ['fees'] : ['reports'])];
  const isBottomTab = bottomTabIds.includes(activeTab);

  useEffect(() => {
    loadData();
    // Handle ?tab=sms&purchase=success from Stripe redirect
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const purchase = params.get('purchase');
    if (tab === 'sms') {
      setActiveTab('sms');
      if (purchase === 'success') {
        toast.success('SMS credits purchased successfully!');
      } else if (purchase === 'cancelled') {
        toast.info('SMS credit purchase was cancelled.');
      }
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Update browser tab title based on active tab
  useEffect(() => {
    const labels = { overview: 'Overview', classes: 'Classes', teachers: 'Teachers', students: 'Students', fees: 'Fees', planner: 'Planner', reports: 'Reports', sms: 'SMS', help: 'Help', support: 'Support', settings: 'Settings' };
    document.title = `${labels[activeTab] || 'Dashboard'} — e-Daarah`;
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

  // Auto-trigger guided tour for first-time users
  useEffect(() => {
    if (!loading && !localStorage.getItem('tour_admin_done')) {
      const timer = setTimeout(() => setShowTour(true), 800);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const adminTourSteps = [
    { target: '.sidebar-nav', title: 'Navigation', content: 'Use the sidebar to switch between sections.' },
    { target: '.setup-checklist', title: 'Getting Started', content: 'Follow these steps to set up your school. Each step links to the right page.' },
    { target: '.insights-summary', title: 'Key Metrics', content: 'See attendance rates, students needing attention, and performance at a glance.' },
    { target: '.alert-panel', title: "Today's Status", content: 'Check if there are pending tasks like unmarked attendance or missing exams.' },
    { target: '.overview-actions', title: 'Quick Actions', content: 'Jump to creating a session, class, or student.' },
    { target: '[data-tour="planner"]', title: 'Academic Planner', content: 'Set up your academic year: sessions, semesters, and holidays.' },
    { target: '[data-tour="students"]', title: 'Students', content: 'Add students individually or bulk-upload from a spreadsheet.' },
    { target: '.sidebar-footer', title: 'Your Profile', content: 'Access settings, billing, and log out from here.' },
  ];

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

  // Fetch analytics when Overview tab is active
  useEffect(() => {
    if (activeTab === 'overview' && madrasahProfile) {
      fetchAnalytics();
      fetchUpcomingUnavailable();
    }
  }, [activeTab, reportSemester, madrasahProfile]);

  // Fetch applications when Students > Applications sub-tab is active
  useEffect(() => {
    if (activeTab === 'students' && studentSubTab === 'applications' && madrasahProfile) {
      fetchApplications();
    }
  }, [activeTab, studentSubTab, madrasahProfile]);

  // Fetch pending application count on load
  useEffect(() => {
    if (madrasahProfile) fetchPendingAppCount();
  }, [madrasahProfile]);

  // Fetch availability data when Teachers > Availability sub-tab is active
  useEffect(() => {
    if (activeTab === 'teachers' && teacherSubTab === 'availability' && madrasahProfile) {
      fetchAvailabilityData();
    }
  }, [activeTab, teacherSubTab, availabilityWeekStart, madrasahProfile]);

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

  useEffect(() => {
    if (activeTab === 'fees') loadFeeData();
  }, [activeTab, feeClassFilter, feeSemesterFilter, madrasahProfile?.fee_tracking_mode]);

  // SMS data loading
  useEffect(() => {
    if (activeTab === 'sms') loadSmsData();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'sms' && smsSubTab === 'history') loadSmsHistory();
  }, [activeTab, smsSubTab, smsHistoryPage, smsHistoryFilter]);

  useEffect(() => {
    if (activeTab === 'sms' && smsSubTab === 'reminders') loadFeeReminderPreview();
  }, [activeTab, smsSubTab, smsReminderClass, smsReminderSendTo]);

  const loadData = async () => {
    if (!initialLoadDone.current) setLoading(true);
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
        setFeeSemesterFilter(String(activeSemester.id));
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
      initialLoadDone.current = true;
    }
  };

  // Fee data loading
  const getFeeDateRange = () => {
    if (!feeSemesterFilter) return {};
    const sem = semesters.find(s => String(s.id) === String(feeSemesterFilter));
    if (!sem) return {};
    const from = typeof sem.start_date === 'string' ? sem.start_date.split('T')[0] : new Date(sem.start_date).toISOString().split('T')[0];
    const to = typeof sem.end_date === 'string' ? sem.end_date.split('T')[0] : new Date(sem.end_date).toISOString().split('T')[0];
    return { from, to };
  };

  const loadFeeSummary = async () => {
    try {
      const urlParams = new URLSearchParams();
      if (feeClassFilter) urlParams.set('class_id', feeClassFilter);
      const { from, to } = getFeeDateRange();
      if (from) urlParams.set('from', from);
      if (to) urlParams.set('to', to);
      const qs = urlParams.toString();
      const res = await api.get(`/admin/fee-summary${qs ? '?' + qs : ''}`);
      setFeeSummary(res.data || []);
    } catch (error) { console.error('Failed to load fee summary:', error); }
  };

  const loadFeePayments = async () => {
    try {
      const urlParams = new URLSearchParams();
      if (feeClassFilter) urlParams.set('class_id', feeClassFilter);
      const { from, to } = getFeeDateRange();
      if (from) urlParams.set('from', from);
      if (to) urlParams.set('to', to);
      const qs = urlParams.toString();
      const res = await api.get(`/admin/fee-payments${qs ? '?' + qs : ''}`);
      setFeePayments(res.data || []);
    } catch (error) { console.error('Failed to load fee payments:', error); }
  };

  const loadFeeData = async () => {
    setFeeLoading(true);
    const isAuto = madrasahProfile?.fee_tracking_mode === 'auto';
    await Promise.all([
      loadFeeSummary(),
      loadFeePayments(),
      ...(isAuto ? [loadFeeSchedules(), loadAutoFeeSummary()] : [])
    ]);
    setFeeLoading(false);
  };

  const loadFeeSchedules = async () => {
    try {
      const res = await api.get('/admin/fee-schedules');
      setFeeSchedules(res.data || []);
    } catch (error) { console.error('Failed to load fee schedules:', error); }
  };

  const loadAutoFeeSummary = async () => {
    try {
      const urlParams = new URLSearchParams();
      if (feeClassFilter) urlParams.set('class_id', feeClassFilter);
      const { from, to } = getFeeDateRange();
      if (from) urlParams.set('from', from);
      if (to) urlParams.set('to', to);
      const qs = urlParams.toString();
      const res = await api.get(`/admin/fee-auto-calculate${qs ? '?' + qs : ''}`);
      setAutoFeeSummary(res.data || []);
    } catch (error) { console.error('Failed to load auto fee summary:', error); }
  };

  const loadFeeReport = async (periodOverride, semIdOverride, sessIdOverride) => {
    setFeeReportLoading(true);
    try {
      const p = periodOverride ?? feeReportPeriod;
      const params = new URLSearchParams({ period: p });
      const semId = semIdOverride ?? feeReportSemesterId;
      const sessId = sessIdOverride ?? feeReportSessionId;
      if (p === 'semester' && semId) params.set('semester_id', semId);
      if (p === 'session' && sessId) params.set('session_id', sessId);
      const res = await api.get(`/admin/fee-report?${params}`);
      setFeeReport(res.data);
    } catch (error) { console.error('Failed to load fee report:', error); }
    setFeeReportLoading(false);
  };

  // SMS functions
  const loadSmsData = async () => {
    setSmsLoading(true);
    try {
      const [statusRes, purchasesRes] = await Promise.all([
        api.get('/sms/status'),
        api.get('/sms/purchases')
      ]);
      setSmsStatus(statusRes.data);
      setSmsPurchases(purchasesRes.data.purchases || []);
    } catch (error) {
      console.error('Failed to load SMS data:', error);
    }
    setSmsLoading(false);
  };

  const loadSmsHistory = async () => {
    try {
      const params = new URLSearchParams({ page: smsHistoryPage, limit: 25 });
      if (smsHistoryFilter) params.append('type', smsHistoryFilter);
      const res = await api.get(`/sms/history?${params}`);
      setSmsHistory(res.data.messages || []);
      setSmsHistoryTotal(res.data.total || 0);
    } catch (error) {
      console.error('Failed to load SMS history:', error);
    }
  };

  const loadFeeReminderPreview = async () => {
    try {
      const qp = new URLSearchParams();
      if (smsReminderClass) qp.set('classId', smsReminderClass);
      qp.set('sendTo', smsReminderSendTo);
      const res = await api.get(`/sms/fee-reminder-preview?${qp}`);
      setSmsReminderStudents(res.data.students || []);
      setSmsSelectedStudents(res.data.students?.map(s => s.id) || []);
      setSmsReminderPage(1);
    } catch (error) {
      console.error('Failed to load fee reminder preview:', error);
    }
  };

  const handleBuySmsCredits = async (packId) => {
    try {
      const res = await api.post('/sms/purchase', { packId });
      if (res.data.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to start checkout');
    }
  };

  const handleSendFeeReminders = async () => {
    if (smsSelectedStudents.length === 0) {
      toast.error('Select at least one student');
      return;
    }
    if (!smsReminderMsg.trim()) {
      toast.error('Enter a message');
      return;
    }
    setSmsSending(true);
    try {
      const res = await api.post('/sms/send-bulk', {
        studentIds: smsSelectedStudents,
        message: smsReminderMsg,
        messageType: 'fee_reminder',
        sendTo: smsReminderSendTo,
        groupByPhone: true
      });
      const r = res.data;
      toast.success(`Sent: ${r.sent}, Failed: ${r.failed}, Skipped (no phone): ${r.skipped}`);
      loadSmsData();
      if (r.errors?.length) {
        r.errors.forEach(e => toast.error(`${e.student}: ${e.error}`));
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send reminders');
    }
    setSmsSending(false);
  };

  const handleSendCustomSms = async () => {
    if (!smsCustomPhone || !smsCustomMsg.trim()) {
      toast.error('Phone and message are required');
      return;
    }
    setSmsSending(true);
    try {
      await api.post('/sms/send', { phone: smsCustomPhone, message: smsCustomMsg, messageType: 'custom' });
      toast.success('SMS sent successfully');
      setSmsCustomPhone('');
      setSmsCustomMsg('');
      loadSmsData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send SMS');
    }
    setSmsSending(false);
  };

  // Fee payments
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (isReadOnly()) return;
    try {
      await api.post('/admin/fee-payments', {
        student_id: showPaymentModal.student_id,
        amount_paid: parseFloat(newPayment.amount_paid),
        payment_date: newPayment.payment_date,
        payment_method: newPayment.payment_method,
        reference_note: newPayment.reference_note,
        payment_label: newPayment.payment_label
      });
      toast.success('Payment recorded');
      setShowPaymentModal(null);
      setNewPayment({ amount_paid: '', payment_date: '', payment_method: 'cash', reference_note: '', payment_label: '' });
      loadFeeSummary();
      loadFeePayments();
      if (madrasahProfile?.fee_tracking_mode === 'auto') loadAutoFeeSummary();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to record payment');
    }
  };

  const handleVoidPayment = (id) => {
    setConfirmModal({ title: 'Void Payment', message: 'Void this payment? This cannot be undone.', danger: true, confirmLabel: 'Void', onConfirm: async () => {
      try {
        await api.delete(`/admin/fee-payments/${id}`);
        toast.success('Payment voided');
        loadFeeSummary();
        loadFeePayments();
        if (madrasahProfile?.fee_tracking_mode === 'auto') loadAutoFeeSummary();
      }
      catch (error) { toast.error('Failed to void payment'); }
    }});
  };

  const handleBulkSetFee = async () => {
    if (isReadOnly()) return;
    if (selectedStudentsForFee.length === 0) { toast.error('Select at least one student'); return; }
    if (!bulkFeeAmount || parseFloat(bulkFeeAmount) < 0) { toast.error('Enter a valid amount'); return; }
    try {
      await api.put('/admin/students/bulk-fee', {
        student_ids: selectedStudentsForFee,
        expected_fee: parseFloat(bulkFeeAmount),
        fee_note: bulkFeeNote || null
      });
      toast.success(`Expected fee set for ${selectedStudentsForFee.length} student(s)`);
      setShowBulkFeeModal(false);
      setBulkFeeAmount('');
      setBulkFeeNote('');
      setSelectedStudentsForFee([]);
      const res = await api.get('/admin/students');
      setStudents(res.data || []);
      loadFeeSummary();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to set fees');
    }
  };

  const handleUpdateFee = async () => {
    if (isReadOnly() || !editingFee) return;
    try {
      await api.put(`/admin/students/${editingFee.student_id}/fee`, {
        expected_fee: editingFee.expected_fee ? parseFloat(editingFee.expected_fee) : null,
        fee_note: editingFee.fee_note || null
      });
      toast.success('Expected fee updated');
      setEditingFee(null);
      loadFeeSummary();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update fee');
    }
  };

  const handleClearFee = (row) => {
    if (isReadOnly()) return;
    setConfirmModal({
      title: 'Clear Expected Fee',
      message: `Remove the expected fee for ${row.student_name}? This student will no longer appear in the Fees tab.`,
      danger: true,
      confirmLabel: 'Clear Fee',
      onConfirm: async () => {
        try {
          await api.put(`/admin/students/${row.student_id}/fee`, { expected_fee: null, fee_note: null });
          toast.success('Fee cleared');
          loadFeeSummary();
        } catch (error) { toast.error('Failed to clear fee'); }
      }
    });
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
      if (activeTab === 'fees') loadFeeData();
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

  const fetchStudentReport = async (studentId) => {
    try {
      const params = {};
      if (reportFilterSession) {
        params.session_id = reportFilterSession;
      }
      if (reportFilterSemester) {
        params.semester_id = reportFilterSemester;
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

  const fetchClassAttendance = async (classId, dateFrom, dateTo) => {
    try {
      const params = new URLSearchParams();
      if (reportSemester) params.append('semester_id', reportSemester);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      const qs = params.toString();
      const url = `/admin/classes/${classId}/attendance-performance${qs ? `?${qs}` : ''}`;
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

  const fetchClassKpis = async (classId, dateFrom, dateTo) => {
    try {
      const params = new URLSearchParams();
      if (reportSemester) params.append('semester_id', reportSemester);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      const qs = params.toString();
      const endpoint = `/admin/classes/${classId}/kpis${qs ? `?${qs}` : ''}`;
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
    if (!analyticsLoadedOnce.current) setAnalyticsLoading(true);
    setExpandedMetric(null);
    try {
      const params = new URLSearchParams();
      if (reportSemester) params.append('semester_id', reportSemester);
      if (analyticsFilterClass) params.append('class_id', analyticsFilterClass);
      if (analyticsFilterGender) params.append('gender', analyticsFilterGender);
      // Send client's local date for accurate "today" checks
      const now = new Date();
      params.append('today', `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);

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
      analyticsLoadedOnce.current = true;
    }
  };

  const fetchUpcomingUnavailable = async () => {
    try {
      const response = await api.get('/admin/teacher-availability/upcoming');
      setUpcomingUnavailable(response.data);
    } catch (error) {
      // Silently fail - not critical for overview
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
    const iconProps = { width: 18, height: 18, style: { minWidth: '18px' } };

    switch(id) {
      case 'overview':
        return <HomeIcon {...iconProps} />;
      case 'planner':
        return <CalendarIcon {...iconProps} />;
      case 'classes':
        return <BookOpenIcon {...iconProps} />;
      case 'teachers':
        return <UsersIcon {...iconProps} />;
      case 'students':
        return <UserGroupIcon {...iconProps} />;
      case 'promotion':
        return <ArrowPathIcon {...iconProps} />;
      case 'reports':
        return <ChartBarIcon {...iconProps} />;
      case 'fees':
        return <CurrencyDollarIcon {...iconProps} />;
      case 'help':
        return <QuestionMarkCircleIcon {...iconProps} />;
      case 'support':
        return <ChatBubbleLeftIcon {...iconProps} />;
      case 'sms':
        return <ChatBubbleOvalLeftIcon {...iconProps} />;
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
          <img src="/e-daarah-blackbg-logo.png" alt="e-Daarah" className="sidebar-logo-img" />
          <span className="sidebar-logo-text">e-Daarah</span>
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
              {user?.firstName?.charAt(0) || 'A'}
            </div>
            <div className="user-info">
              <div className="user-name">{user?.firstName} {user?.lastName}</div>
              <div className="user-role">{user?.role || 'Admin'}</div>
            </div>
            <ChevronUpIcon width={16} height={16} style={{ opacity: 0.5, transform: profileDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </div>
          {profileDropdownOpen && (
            <div className="profile-dropdown">
              <div className="profile-dropdown-header">
                <div className="user-avatar" style={{ width: 36, height: 36, minWidth: 36, fontSize: 14 }}>
                  {user?.firstName?.charAt(0) || 'A'}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.firstName} {user?.lastName}</div>
                  <div style={{ fontSize: 11, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
                </div>
              </div>
              <div className="profile-dropdown-divider" />
              <button className="profile-dropdown-item" onClick={() => { handleTabChange('settings'); setProfileDropdownOpen(false); setTimeout(() => document.getElementById('settings-account')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }}>
                <UserIcon width={16} height={16} />
                Account
              </button>
              <button className="profile-dropdown-item" onClick={() => { handleTabChange('settings'); setProfileDropdownOpen(false); setTimeout(() => document.getElementById('settings-password')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }}>
                <LockClosedIcon width={16} height={16} />
                Change Password
              </button>
              <button className="profile-dropdown-item" onClick={() => { handleTabChange('settings'); setProfileDropdownOpen(false); }}>
                <Cog6ToothIcon width={16} height={16} />
                Settings
              </button>
              <button className="profile-dropdown-item" onClick={() => { handleTabChange('settings'); setProfileDropdownOpen(false); setTimeout(() => document.getElementById('settings-billing')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }}>
                <CreditCardIcon width={16} height={16} />
                Billing
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
            <span className="header-title">
              {madrasahProfile?.name || 'Dashboard'}
              {madrasahProfile?.verification_status === 'verified' && <VerifiedBadge size={16} />}
            </span>
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
          onSubscribe={() => {
            handleTabChange('settings');
            setTimeout(() => document.getElementById('settings-billing')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
          }}
        />

        {/* Platform Announcements */}
        <AnnouncementBanner />

        {/* Read-Only Warning Banner */}
        {isReadOnly() && (
          <div style={{
            background: '#f5f5f5', color: '#525252', padding: '12px 20px',
            borderBottom: '1px solid #e5e5e5', textAlign: 'center', fontWeight: 500, fontSize: '14px'
          }}>
            ⚠️ {madrasahProfile?.subscription_status === 'trialing' ? 'Your trial has expired' : madrasahProfile?.subscription_status === 'past_due' ? 'Your payment is past due' : 'Your subscription is inactive'}. 
            Your account is in read-only mode.{' '}
            <button style={{ background: 'none', border: 'none', color: '#0f172a', textDecoration: 'underline', fontWeight: 600, cursor: 'pointer', fontSize: '14px', padding: 0 }}
              onClick={() => { handleTabChange('settings'); setTimeout(() => document.getElementById('settings-billing')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150); }}>
              {madrasahProfile?.subscription_status === 'past_due' ? 'Update payment method' : 'Subscribe now'}
            </button> to make changes.
          </div>
        )}

        {/* Main Content */}
        <main className="main tab-content" key={activeTab}>
          {loading && activeTab !== 'overview' && activeTab !== 'help' && activeTab !== 'settings' ? (
            <div className="stats-grid">
              {[1,2,3,4].map(i => (
                <div key={i} className="stat-card">
                  <div className="skeleton skeleton-text" style={{ width: '60%', height: '20px', marginBottom: '8px' }} />
                  <div className="skeleton skeleton-text short" style={{ height: '14px' }} />
                </div>
              ))}
            </div>
          ) : (
          <>
          {activeTab === 'overview' && (
            <>
              {/* Greeting + Context */}
              <div className="overview-greeting">
                <h2 className="page-title">
                  {(() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; })()}{user?.firstName ? `, ${user.firstName}` : ''}
                </h2>
                <span className="overview-context">
                  {(() => {
                    const activeSession = sessions.find(s => s.is_active);
                    const activeSemester = semesters.find(s => s.is_active);
                    const parts = [];
                    if (activeSession) parts.push(activeSession.name);
                    if (activeSemester) parts.push(activeSemester.name);
                    return parts.length > 0 ? parts.join(' · ') : '';
                  })()}
                </span>
              </div>

              {/* Key Metrics */}
              {analyticsLoading ? (
                <>
                  <div className="stats-grid">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="stat-card">
                        <div className="skeleton skeleton-text" style={{ width: '50%', height: '28px', marginBottom: '8px' }} />
                        <div className="skeleton skeleton-text short" style={{ height: '12px' }} />
                      </div>
                    ))}
                  </div>
                  <div className="card" style={{ marginTop: 'var(--md)' }}>
                    <div style={{ padding: 'var(--lg)' }}>
                      <div className="skeleton skeleton-text" style={{ width: '30%', height: '16px', marginBottom: '16px' }} />
                      <div className="skeleton" style={{ height: '120px' }} />
                    </div>
                  </div>
                </>
              ) : analyticsData ? (
                <>
                  <div className="insights-summary">
                    {/* Card 1: Students */}
                    {(() => {
                      const total = analyticsData.totalStudents ?? 0;
                      const dropouts = analyticsData.dropoutCount ?? 0;
                      const active = total - dropouts;
                      return (
                        <>
                        <div
                          className={`summary-card summary-card-students ${dropouts > 0 ? 'clickable' : ''} ${expandedMetric === 'dropouts' ? 'active' : ''}`}
                          onClick={() => dropouts > 0 && setExpandedMetric(expandedMetric === 'dropouts' ? null : 'dropouts')}
                        >
                          <div className="summary-label">Students</div>
                          <div className="summary-students-row">
                            <div className="summary-students-stat">
                              <span className="summary-students-num">{active}</span>
                              <span className="summary-students-sub">Active</span>
                            </div>
                            <div className="summary-students-divider" />
                            <div className="summary-students-stat">
                              <span className={`summary-students-num${dropouts > 0 ? ' has-dropouts' : ''}`}>{dropouts}</span>
                              <span className="summary-students-sub">Dropped out</span>
                            </div>
                          </div>
                          <div className="summary-status">{total} total enrolled</div>
                          {dropouts > 0 && (
                            <div className="summary-view-hint">{expandedMetric === 'dropouts' ? 'Hide' : 'View list'}</div>
                          )}
                        </div>
                        {expandedMetric === 'dropouts' && analyticsData.dropoutStudents?.length > 0 && (
                          <div className="metric-student-list">
                            <div className="metric-student-list-header">
                              <h4>{analyticsData.dropoutStudents.length} student{analyticsData.dropoutStudents.length !== 1 ? 's' : ''} dropped out</h4>
                              <button className="metric-student-list-close" onClick={() => setExpandedMetric(null)}>&times;</button>
                            </div>
                            <div className="metric-student-list-body">
                              {analyticsData.dropoutStudents.map(s => (
                                <div key={s.id} className="metric-student-row">
                                  <div className="metric-student-info">
                                    <span className="metric-student-name">{s.first_name} {s.last_name}</span>
                                    {s.class_name && <span className="metric-student-class">was in {s.class_name}</span>}
                                  </div>
                                  <span className="metric-student-rate" style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>
                                    {s.dropped_at ? new Date(s.dropped_at).toLocaleDateString() : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        </>
                      );
                    })()}
                    {/* Card 3: Poor Behaviour (hidden if behaviour recording is off) */}
                    {analyticsData.behaviorEnabled && (
                    <>
                    <div
                      className={`summary-card ${(analyticsData.poorBehaviorStudents?.length || 0) > 0 ? 'clickable' : ''} ${expandedMetric === 'behavior' ? 'active' : ''}`}
                      onClick={() => (analyticsData.poorBehaviorStudents?.length || 0) > 0 && setExpandedMetric(expandedMetric === 'behavior' ? null : 'behavior')}
                    >
                      <div className="summary-label">Poor Behaviour</div>
                      <div className="summary-value">{analyticsData.poorBehaviorStudents?.length || 0}</div>
                      <div className="summary-status">{(analyticsData.poorBehaviorStudents?.length || 0) > 0 ? 'Rated "Poor" 3+ times' : 'No recurring issues'}</div>
                      {(analyticsData.poorBehaviorStudents?.length || 0) > 0 && (
                        <div className="summary-view-hint">{expandedMetric === 'behavior' ? 'Hide' : 'View list'}</div>
                      )}
                    </div>
                    {expandedMetric === 'behavior' && analyticsData.poorBehaviorStudents?.length > 0 && (
                      <div className="metric-student-list">
                        <div className="metric-student-list-header">
                          <h4>{analyticsData.poorBehaviorStudents.length} student{analyticsData.poorBehaviorStudents.length !== 1 ? 's' : ''} with 3+ poor behaviour ratings</h4>
                          <button className="metric-student-list-close" onClick={() => setExpandedMetric(null)}>&times;</button>
                        </div>
                        <div className="metric-student-list-body">
                          {analyticsData.poorBehaviorStudents.map(s => (
                            <div key={s.id} className="metric-student-row">
                              <div className="metric-student-info">
                                <span className="metric-student-name">{s.first_name} {s.last_name}</span>
                                {s.class_name && <span className="metric-student-class">{s.class_name}</span>}
                              </div>
                              <span className="metric-student-rate low">{s.poor_count}x</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    </>
                    )}
                    {/* Card 4: Need Attention — semester-level */}
                    <div
                      className={`summary-card ${analyticsData.summary.studentsNeedingAttention > 0 ? 'clickable' : ''} ${expandedMetric === 'attention' ? 'active' : ''}`}
                      onClick={() => analyticsData.summary.studentsNeedingAttention > 0 && setExpandedMetric(expandedMetric === 'attention' ? null : 'attention')}
                    >
                      <div className="summary-label">Need Attention</div>
                      <div className="summary-value">{analyticsData.summary.studentsNeedingAttention}</div>
                      <div className="summary-status">{analyticsData.summary.studentsNeedingAttention > 0 ? 'Below 70% attendance' : 'No attendance data yet'}</div>
                      {analyticsData.summary.studentsNeedingAttention > 0 && (
                        <div className="summary-view-hint">{expandedMetric === 'attention' ? 'Hide' : 'View list'}</div>
                      )}
                    </div>
                    {expandedMetric === 'attention' && analyticsData.atRiskStudents?.length > 0 && (
                      <div className="metric-student-list">
                        <div className="metric-student-list-header">
                          <h4>{analyticsData.atRiskStudents.length} student{analyticsData.atRiskStudents.length !== 1 ? 's' : ''} below 70% attendance</h4>
                          <button className="metric-student-list-close" onClick={() => setExpandedMetric(null)}>&times;</button>
                        </div>
                        <div className="metric-student-list-body">
                          {analyticsData.atRiskStudents.map(s => (
                            <div key={s.id} className="metric-student-row">
                              <div className="metric-student-info">
                                <span className="metric-student-name">{s.first_name} {s.last_name}</span>
                                {s.class_name && <span className="metric-student-class">{s.class_name}</span>}
                              </div>
                              <span className="metric-student-rate low">{s.attendance_rate !== null ? `${s.attendance_rate}%` : '-'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Upcoming Teacher Unavailability */}
                  <div className="card" style={{ marginTop: 'var(--md)' }}>
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                      <span>Teacher Availability</span>
                      {upcomingUnavailable.length > 0 ? (
                        <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600 }}>
                          {upcomingUnavailable.length} unavailable this week
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 600 }}>
                          All available
                        </span>
                      )}
                    </div>
                    <div style={{ padding: 0 }}>
                      {upcomingUnavailable.length > 0 ? (
                        <>
                          {upcomingUnavailable.map((item, i) => {
                            const dateStr = typeof item.date === 'string' ? item.date.split('T')[0] : new Date(item.date).toISOString().split('T')[0];
                            const dateObj = new Date(dateStr + 'T00:00:00');
                            return (
                            <div key={i} style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '12px 16px',
                              borderBottom: i < upcomingUnavailable.length - 1 ? '1px solid #f3f4f6' : 'none',
                            }}>
                              <div style={{
                                minWidth: '44px',
                                height: '44px',
                                background: '#fef2f2',
                                borderRadius: '8px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                lineHeight: 1,
                              }}>
                                <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 500 }}>
                                  {dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                                </span>
                                <span style={{ fontSize: '16px', color: '#dc2626', fontWeight: 700 }}>
                                  {dateObj.getDate()}
                                </span>
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 500, fontSize: '14px' }}>{item.first_name} {item.last_name}</div>
                                <div style={{ fontSize: '13px', color: '#9ca3af', fontStyle: item.reason ? 'normal' : 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {item.reason || 'No reason given'}
                                </div>
                              </div>
                            </div>
                            );
                          })}
                          <div style={{ padding: '8px 16px', borderTop: '1px solid #f3f4f6' }}>
                            <button onClick={() => { setActiveTab('teachers'); setTeacherSubTab('availability'); }} style={{ fontSize: '13px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                              View full availability →
                            </button>
                          </div>
                        </>
                      ) : (
                        <div style={{ padding: '20px 16px', textAlign: 'center' }}>
                          <div style={{ fontSize: '14px', color: '#6b7280' }}>All teachers are available this week</div>
                          <button onClick={() => { setActiveTab('teachers'); setTeacherSubTab('availability'); }} style={{ fontSize: '13px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '8px' }}>
                            View full availability →
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Today's Status */}
                  {analyticsData.quickActions && (
                    <div className={`alert-panel ${(analyticsData.quickActions.attendanceMarkedToday || !analyticsData.quickActions.todayIsSchoolDay) && analyticsData.quickActions.classesWithoutExams === 0 ? 'success' : ''}`}>
                      <h4 className="overview-section-title">Today</h4>
                      {!analyticsData.quickActions.attendanceMarkedToday && analyticsData.quickActions.todayIsSchoolDay && (
                        <div className="alert-panel-item">
                          <span style={{ color: '#b86e00' }}>!</span>
                          <span>No attendance marked today</span>
                        </div>
                      )}
                      {analyticsData.quickActions.todayIsSchoolDay === false && (
                        <div className="alert-panel-item">
                          <span>No school today</span>
                        </div>
                      )}
                      {analyticsData.quickActions.classesWithoutExams > 0 && (
                        <div className="alert-panel-item">
                          <span style={{ color: '#b86e00' }}>!</span>
                          <span>{analyticsData.quickActions.classesWithoutExams} class{analyticsData.quickActions.classesWithoutExams !== 1 ? 'es' : ''} awaiting exam recording in {analyticsData.quickActions.activeSemesterName}</span>
                        </div>
                      )}
                      {(analyticsData.quickActions.attendanceMarkedToday || !analyticsData.quickActions.todayIsSchoolDay) && analyticsData.quickActions.classesWithoutExams === 0 && (
                        <div className="alert-panel-item">
                          <span>All caught up. No pending tasks.</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Highlights Row — compact secondary metrics */}
                  <div className="overview-highlights">
                    {/* Exam Average by Class */}
                    {analyticsData.examByClass && analyticsData.examByClass.length > 0 ? (
                      analyticsData.examByClass.map(c => (
                        <div className="overview-highlight-card" key={c.class_id}>
                          <div className="overview-highlight-label">{c.class_name} Avg</div>
                          <div className="overview-highlight-value">{c.avg_percentage}%</div>
                          <div className="overview-highlight-sub">{c.students_with_exams} student{c.students_with_exams !== 1 ? 's' : ''}</div>
                        </div>
                      ))
                    ) : (
                      <div className="overview-highlight-card">
                        <div className="overview-highlight-label">Exam Average</div>
                        <div className="overview-highlight-value">-</div>
                        <div className="overview-highlight-sub">No exams yet</div>
                      </div>
                    )}

                    {/* Month Comparison */}
                    {analyticsData.monthOverMonth && analyticsData.monthOverMonth.change !== null && analyticsData.monthOverMonth.lastRate > 0 && (
                      <div className="overview-highlight-card">
                        <div className="overview-highlight-label">vs Last Month</div>
                        <div className={`overview-highlight-value ${analyticsData.monthOverMonth.change >= 0 ? 'positive' : 'negative'}`}>
                          {analyticsData.monthOverMonth.change > 0 ? '+' : ''}{analyticsData.monthOverMonth.change.toFixed(1)}%
                        </div>
                        <div className="overview-highlight-sub">
                          {analyticsData.monthOverMonth.lastRate}% → {analyticsData.monthOverMonth.currentRate}%
                        </div>
                      </div>
                    )}

                    {/* Perfect Weeks */}
                    {analyticsData.attendanceStreaks && analyticsData.attendanceStreaks.length > 0 && (
                      <div className="overview-highlight-card">
                        <div className="overview-highlight-label">Perfect Weeks</div>
                        <div className="overview-highlight-value">{analyticsData.attendanceStreaks[0].streak_weeks}</div>
                        <div className="overview-highlight-sub">{analyticsData.attendanceStreaks[0].class_name} (last 12 wks)</div>
                      </div>
                    )}

                    {/* Top Performer */}
                    {analyticsData.topPerformer && (
                      <div className="overview-highlight-card">
                        <div className="overview-highlight-label">Top Performer</div>
                        <div className="overview-highlight-value">{analyticsData.topPerformer.percentage}%</div>
                        <div className="overview-highlight-sub">{analyticsData.topPerformer.first_name} {analyticsData.topPerformer.last_name}</div>
                      </div>
                    )}
                  </div>

                  {/* Activity Section — tables + progress */}
                  <div className="overview-columns">
                    <div>
                      {/* Attendance Compliance */}
                      {analyticsData.attendanceCompliance && analyticsData.attendanceCompliance.length > 0 && (
                        <div className="overview-widget">
                          <h4>Attendance Compliance</h4>
                          <div className="compliance-list">
                            {analyticsData.attendanceCompliance.map(c => (
                              <div key={c.id} className="compliance-row">
                                <div className="compliance-class">{c.class_name}</div>
                                {c.expected_days === 0 ? (
                                  <div className="compliance-empty">No school days yet</div>
                                ) : (
                                  <>
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
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Frequent Absences */}
                      {analyticsData.frequentAbsences && analyticsData.frequentAbsences.length > 0 && (
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
                              {analyticsData.frequentAbsences.map(s => (
                                <tr key={s.id}>
                                  <td>{s.first_name} {s.last_name}</td>
                                  <td>{s.class_name}</td>
                                  <td>{s.absence_count}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div></div>
                  </div>



                  {/* Pending Applications */}
                  {pendingAppCount > 0 && (
                    <div className="card" style={{ marginTop: 'var(--md)', cursor: 'pointer' }} onClick={() => { setActiveTab('students'); setStudentSubTab('applications'); }}>
                      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Student Applications</span>
                        <span style={{ background: '#ef4444', color: '#fff', fontSize: '12px', fontWeight: 700, borderRadius: '10px', padding: '2px 10px' }}>
                          {pendingAppCount} pending
                        </span>
                      </div>
                      <div style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>
                        You have {pendingAppCount} enrollment {pendingAppCount === 1 ? 'application' : 'applications'} to review.
                        <span style={{ color: 'var(--accent)', marginLeft: '8px' }}>Review →</span>
                      </div>
                    </div>
                  )}

                  {/* Quick Actions — separated at bottom */}
                  <div className="overview-actions">
                    <div className={`overview-action-card ${isReadOnly() ? 'disabled' : ''}`} onClick={() => { if (!isReadOnly()) { setActiveTab('planner'); setPlannerSubTab('sessions'); } }}>
                      <div className="overview-action-label">New Session</div>
                      <div className="overview-action-desc">Create academic year</div>
                    </div>
                    <div className={`overview-action-card ${isReadOnly() ? 'disabled' : ''}`} onClick={() => { if (!isReadOnly()) { setActiveTab('classes'); setShowClassForm(true); } }}>
                      <div className="overview-action-label">New Class</div>
                      <div className="overview-action-desc">Add a class group</div>
                    </div>
                    <div className={`overview-action-card ${isReadOnly() ? 'disabled' : ''}`} onClick={() => { if (!isReadOnly()) { setActiveTab('students'); setShowStudentForm(true); } }}>
                      <div className="overview-action-label">New Student</div>
                      <div className="overview-action-desc">Enroll a student</div>
                    </div>
                    {hasPlusAccess() && (
                      <div className="overview-action-card" onClick={() => { setActiveTab('reports'); setReportSubTab('attendance'); }}>
                        <div className="overview-action-label">Reports</div>
                        <div className="overview-action-desc">Detailed analytics</div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Setup checklist for new madrasahs */
                (() => {
                  const setupSteps = [
                    { title: 'Create a Session', desc: 'Set up your academic year or term.', done: sessions.length > 0, action: () => { setActiveTab('planner'); setPlannerSubTab('sessions'); } },
                    { title: 'Create a Class', desc: 'Add at least one class group.', done: classes.length > 0, action: () => { setActiveTab('classes'); setShowClassForm(true); } },
                    { title: 'Add Students', desc: 'Enroll students individually or bulk upload.', done: students.length > 0, action: () => { setActiveTab('students'); setShowStudentForm(true); } },
                    ...(madrasahProfile?.enable_fee_tracking ? [{ title: 'Set Expected Fees', desc: 'Set how much each student is expected to pay.', done: students.some(s => s.expected_fee != null), action: () => { setActiveTab('fees'); setTimeout(() => { setSelectedStudentsForFee([]); setBulkFeeAmount(''); setBulkFeeNote(''); setBulkFeeClassFilter(''); setShowBulkFeeModal(true); }, 100); } }] : []),
                  ];
                  const doneCount = setupSteps.filter(s => s.done).length;
                  const allDone = doneCount === setupSteps.length;

                  return (
                    <>
                      <div className="stats-grid">
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

                      <div className="card setup-checklist" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '18px' }}>{allDone ? "You're all set!" : 'Get Started'}</h3>
                            <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--gray)' }}>
                              {allDone ? 'Analytics will appear here once attendance is recorded.' : `${doneCount} of ${setupSteps.length} steps completed`}
                            </p>
                          </div>
                          {!allDone && (
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '3px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: 'var(--primary, #404040)', background: `conic-gradient(var(--primary, #404040) ${(doneCount / setupSteps.length) * 360}deg, var(--border) 0deg)`, position: 'relative' }}>
                              <span style={{ background: '#fff', width: '38px', height: '38px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{doneCount}/{setupSteps.length}</span>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {setupSteps.map((s, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 12px', borderRadius: '8px', background: s.done ? 'var(--lighter, #f9fafb)' : 'transparent' }}>
                              {s.done ? (
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <CheckIcon width={14} height={14} style={{ stroke: '#fff', strokeWidth: 3 }} />
                                </div>
                              ) : (
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 600, color: 'var(--gray)', flexShrink: 0 }}>{i + 1}</div>
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: '14px', color: s.done ? 'var(--gray)' : 'inherit', textDecoration: s.done ? 'line-through' : 'none' }}>{s.title}</div>
                                <div style={{ fontSize: '13px', color: 'var(--gray)', marginTop: '2px' }}>{s.desc}</div>
                              </div>
                              {s.done ? (
                                <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600, flexShrink: 0 }}>Done</span>
                              ) : (
                                <button className="btn btn-sm btn-primary" disabled={isReadOnly()} onClick={s.action} style={{ flexShrink: 0 }}>Start</button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  );
                })()
              )}
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
          )}

          {/* Teachers Tab */}
          {activeTab === 'teachers' && (
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
          )}

          {/* Students Tab */}
          {activeTab === 'students' && (
            <>
              <div className="page-header">
                <h2 className="page-title">Students</h2>
                {studentSubTab === 'list' && (
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
              <div style={{ display: 'flex', gap: '0', marginBottom: 'var(--md)', borderBottom: '2px solid #e5e7eb' }}>
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
                          className="inline-class-select"
                          value={row.class_id || ''}
                          onClick={(e) => e.stopPropagation()}
                          onChange={async (e) => {
                            const val = e.target.value;
                            if (val === '__dropout__') {
                              e.target.value = row.class_id || '';
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
                                      s.id === row.id ? { ...s, class_id: null, class_name: null } : s
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
                              s.id === row.id ? { ...s, class_id: newClassId ? Number(newClassId) : null, class_name: newClassName } : s
                            ));
                            try {
                              await api.patch(`/admin/students/${row.id}/class`, { class_id: newClassId });
                            } catch (err) {
                              setStudents(prev => prev.map(s =>
                                s.id === row.id ? { ...s, class_id: row.class_id, class_name: row.class_name } : s
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
                  data={students}
                  searchable={true}
                  searchPlaceholder="Search by name, student ID, or class..."
                  searchKeys={['student_id', 'first_name', 'last_name', 'class_name', 'parent_guardian_name']}
                  pagination={true}
                  pageSize={25}
                  emptyMessage="No students yet. Create one to get started."
                  selectable={true}
                  selectedIds={selectedStudentIds}
                  onSelectionChange={setSelectedStudentIds}
                />
              </div>

              {/* Mobile cards */}
              <div className="admin-mobile-cards students-mobile-cards">
                {students.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px 0' }}>No students yet. Create one to get started.</p>
                ) : (() => {
                  const filtered = students.filter(s => {
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
                                  className="inline-class-select"
                                  value={s.class_id || ''}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={async (e) => {
                                    const val = e.target.value;
                                    if (val === '__dropout__') {
                                      e.target.value = s.class_id || '';
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
                                              st.id === s.id ? { ...st, class_id: null, class_name: null } : st
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
                                      st.id === s.id ? { ...st, class_id: newClassId ? Number(newClassId) : null, class_name: newClassName } : st
                                    ));
                                    try {
                                      await api.patch(`/admin/students/${s.id}/class`, { class_id: newClassId });
                                    } catch (err) {
                                      setStudents(prev => prev.map(st =>
                                        st.id === s.id ? { ...st, class_id: s.class_id, class_name: s.class_name } : st
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
          )}

          {/* Fees Tab */}
          {activeTab === 'fees' && (
            <>
              <div className="page-header no-print">
                <h2 className="page-title">Fees</h2>
                {madrasahProfile?.fee_tracking_mode === 'auto' ? (
                  <button className="btn btn-primary" disabled={isReadOnly()} onClick={() => {
                    setEditingFeeSchedule(null);
                    setFeeScheduleScope('all');
                    setNewFeeSchedule({ class_id: '', student_id: '', billing_cycle: 'per_semester', amount: '', description: '' });
                    setShowFeeScheduleModal(true);
                  }}>Add Fee Schedule</button>
                ) : (
                  <button className="btn btn-primary" disabled={isReadOnly()} onClick={() => {
                    setSelectedStudentsForFee([]);
                    setBulkFeeAmount('');
                    setBulkFeeNote('');
                    setBulkFeeClassFilter('');
                    setShowBulkFeeModal(true);
                  }}>Set Expected Fee</button>
                )}
              </div>

              {madrasahProfile?.fee_tracking_mode === 'auto' && (
                <div className="report-tabs no-print" style={{ marginBottom: '16px' }}>
                  <nav className="report-tabs-nav">
                    <button className={`report-tab-btn ${feeSubTab === 'summary' ? 'active' : ''}`} onClick={() => setFeeSubTab('summary')}>Students</button>
                    <button className={`report-tab-btn ${feeSubTab === 'schedules' ? 'active' : ''}`} onClick={() => setFeeSubTab('schedules')}>Fee Schedules</button>
                    <button className={`report-tab-btn ${feeSubTab === 'report' ? 'active' : ''}`} onClick={() => { setFeeSubTab('report'); if (!feeReport) loadFeeReport(); }}>Report</button>
                  </nav>
                </div>
              )}

              {feeLoading && <div className="loading-state"><div className="loading-spinner" /></div>}

              {!feeLoading && madrasahProfile?.fee_tracking_mode === 'auto' && feeSubTab === 'schedules' && (
                <>
                  {/* Fee Schedules Management */}
                  {feeSchedules.length === 0 ? (
                    <div className="card">
                      <div className="empty">
                        <div className="empty-icon"><CurrencyDollarIcon /></div>
                        <p>No fee schedules yet. Create a fee schedule to define how much each class or student should be charged.</p>
                        <button className="btn btn-primary" style={{ marginTop: '12px' }} disabled={isReadOnly()} onClick={() => {
                          setEditingFeeSchedule(null);
                          setFeeScheduleScope('all');
                          setNewFeeSchedule({ class_id: '', student_id: '', billing_cycle: 'per_semester', amount: '', description: '' });
                          setShowFeeScheduleModal(true);
                        }}>Create Fee Schedule</button>
                      </div>
                    </div>
                  ) : (
                    <div className="card">
                      <div className="card-body" style={{ padding: 0 }}>
                        <SortableTable
                          columns={[
                            { key: 'scope', label: 'Applies To', sortable: true, sortType: 'string',
                              sortValue: (row) => row.student_name || row.class_name || 'All Students',
                              render: (row) => row.student_name ? `Student: ${row.student_name}` : row.class_name ? `Class: ${row.class_name}` : 'All Students (Default)' },
                            { key: 'billing_cycle', label: 'Billing Cycle', sortable: true, sortType: 'string',
                              render: (row) => ({ weekly: 'Weekly', monthly: 'Monthly', per_semester: 'Per Semester', per_session: 'Per Session' }[row.billing_cycle] || row.billing_cycle) },
                            { key: 'amount', label: 'Amount', sortable: true, sortType: 'number',
                              render: (row) => formatCurrency(row.amount) },
                            { key: 'description', label: 'Description', sortable: false,
                              render: (row) => row.description || '—' },
                            { key: 'is_active', label: 'Status', sortable: true, sortType: 'string',
                              render: (row) => <span className={`badge ${row.is_active ? 'badge-success' : 'badge-warning'}`}>{row.is_active ? 'Active' : 'Inactive'}</span> },
                            { key: 'actions', label: '', sortable: false,
                              render: (row) => (
                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                  <button className="btn btn-sm btn-secondary" disabled={isReadOnly()} onClick={() => {
                                    setEditingFeeSchedule(row);
                                    setFeeScheduleScope(row.student_id ? 'student' : row.class_id ? 'class' : 'all');
                                    setNewFeeSchedule({ class_id: row.class_id || '', student_id: row.student_id || '', billing_cycle: row.billing_cycle, amount: String(row.amount), description: row.description || '' });
                                    setShowFeeScheduleModal(true);
                                  }}>Edit</button>
                                  <button className="btn btn-sm btn-secondary btn-danger" disabled={isReadOnly()} onClick={() => {
                                    setConfirmModal({ title: 'Delete Fee Schedule', message: 'Are you sure you want to delete this fee schedule?', danger: true, confirmLabel: 'Delete', onConfirm: async () => {
                                      try { await api.delete(`/admin/fee-schedules/${row.id}`); loadFeeSchedules(); loadAutoFeeSummary(); toast.success('Fee schedule deleted'); }
                                      catch { toast.error('Failed to delete fee schedule'); }
                                    }});
                                  }}>Delete</button>
                                </div>
                              )}
                          ]}
                          data={feeSchedules}
                          pagination
                          pageSize={25}
                          emptyMessage="No fee schedules"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {!feeLoading && madrasahProfile?.fee_tracking_mode === 'auto' && feeSubTab === 'summary' && (
                <>
                  {/* Filters */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <select className="form-select" style={{ maxWidth: '260px' }} value={feeSemesterFilter}
                      onChange={(e) => setFeeSemesterFilter(e.target.value)}>
                      <option value="">All Time</option>
                      {semesters.map(s => <option key={s.id} value={s.id}>{s.name}{s.session_name ? ` (${s.session_name})` : ''}{s.is_active ? ' ✓' : ''}</option>)}
                    </select>
                    <select className="form-select" style={{ maxWidth: '220px' }} value={feeClassFilter}
                      onChange={(e) => setFeeClassFilter(e.target.value)}>
                      <option value="">All Classes</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  {/* Auto Summary cards */}
                  {autoFeeSummary.length > 0 && (
                    <div className="fee-summary-cards">
                      <div className="fee-summary-card">
                        <div className="fee-summary-value">{formatCurrency(autoFeeSummary.reduce((s, r) => s + r.total_fee, 0))}</div>
                        <div className="fee-summary-label">Total Expected</div>
                      </div>
                      <div className="fee-summary-card">
                        <div className="fee-summary-value">{formatCurrency(autoFeeSummary.reduce((s, r) => s + r.total_paid, 0))}</div>
                        <div className="fee-summary-label">Collected</div>
                      </div>
                      <div className="fee-summary-card">
                        <div className="fee-summary-value">{formatCurrency(autoFeeSummary.reduce((s, r) => s + Math.max(r.balance, 0), 0))}</div>
                        <div className="fee-summary-label">Outstanding</div>
                      </div>
                    </div>
                  )}

                  {autoFeeSummary.length === 0 ? (
                    <div className="card">
                      <div className="empty">
                        <div className="empty-icon"><CurrencyDollarIcon /></div>
                        <p>No auto-calculated fees yet. Create a fee schedule and assign students to classes to see calculated fees.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="card fee-table-desktop">
                        <SortableTable
                          columns={[
                            { key: 'student_name', label: 'Student', sortable: true, sortType: 'string' },
                            { key: 'class_name', label: 'Class', sortable: true, sortType: 'string' },
                            { key: 'total_fee', label: 'Expected', sortable: true, sortType: 'number',
                              render: (row) => formatCurrency(row.total_fee) },
                            { key: 'total_paid', label: 'Paid', sortable: true, sortType: 'number',
                              render: (row) => formatCurrency(row.total_paid) },
                            { key: 'balance', label: 'Balance', sortable: true, sortType: 'number',
                              render: (row) => formatCurrency(row.balance) },
                            { key: 'status', label: 'Progress', sortable: true, sortType: 'number',
                              sortValue: (row) => row.total_fee > 0 ? row.total_paid / row.total_fee : 0,
                              render: (row) => <FeeProgressBar paid={row.total_paid} total={row.total_fee} /> },
                            { key: 'actions', label: '', sortable: false,
                              render: (row) => (
                                <button className="btn btn-sm btn-primary" disabled={isReadOnly()} onClick={() => {
                                  setShowPaymentModal(row);
                                  setNewPayment({ amount_paid: '', payment_date: new Date().toISOString().split('T')[0], payment_method: 'cash', reference_note: '', payment_label: '', _labelCategory: '' });
                                }}>Record</button>
                              )}
                          ]}
                          data={autoFeeSummary}
                          searchable
                          searchPlaceholder="Search students..."
                          searchKeys={['student_name', 'class_name']}
                          pagination
                          pageSize={25}
                          emptyMessage="No fee records"
                        />
                      </div>
                      <div className="fee-mobile-cards">
                        {autoFeeSummary.map((row, idx) => (
                          <div key={idx} className="admin-mobile-card">
                            <div className="admin-mobile-card-top">
                              <div>
                                <div className="admin-mobile-card-title">{row.student_name}</div>
                                <div className="admin-mobile-card-sub">{row.class_name}{row.fee_note ? ` · ${row.fee_note}` : ''}</div>
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
                            <div className="admin-mobile-card-actions">
                              <button className="btn btn-sm btn-primary" disabled={isReadOnly()} onClick={() => {
                                setShowPaymentModal(row);
                                setNewPayment({ amount_paid: '', payment_date: new Date().toISOString().split('T')[0], payment_method: 'cash', reference_note: '', payment_label: '', _labelCategory: '' });
                              }}>Record Payment</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Payment History (shared) */}
                  {feePayments.length > 0 && (
                    <div className="card" style={{ marginTop: '20px' }}>
                      <div className="card-header">Recent Payments</div>
                      <div className="card-body" style={{ padding: 0 }}>
                        <SortableTable
                          columns={[
                            { key: 'student_name', label: 'Student', sortable: true, sortType: 'string' },
                            { key: 'amount_paid', label: 'Amount', sortable: true, sortType: 'number',
                              render: (row) => formatCurrency(row.amount_paid) },
                            { key: 'payment_date', label: 'Date', sortable: true, sortType: 'string',
                              render: (row) => new Date(row.payment_date).toLocaleDateString() },
                            { key: 'payment_method', label: 'Method', sortable: true, sortType: 'string',
                              render: (row) => ({ cash: 'Cash', bank_transfer: 'Bank Transfer', online: 'Online', other: 'Other' }[row.payment_method] || row.payment_method) },
                            { key: 'actions', label: '', sortable: false,
                              render: (row) => (
                                <button className="btn btn-sm btn-secondary btn-danger" disabled={isReadOnly()} onClick={() => handleVoidPayment(row.id)}>Void</button>
                              )}
                          ]}
                          data={feePayments}
                          pagination
                          pageSize={10}
                          emptyMessage="No payments recorded"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {!feeLoading && (!madrasahProfile?.fee_tracking_mode || madrasahProfile?.fee_tracking_mode === 'manual') && (
                <>
                  <div className="report-tabs no-print" style={{ marginBottom: '16px' }}>
                    <nav className="report-tabs-nav">
                      <button className={`report-tab-btn ${feeSubTab === 'summary' ? 'active' : ''}`} onClick={() => setFeeSubTab('summary')}>Students</button>
                      <button className={`report-tab-btn ${feeSubTab === 'report' ? 'active' : ''}`} onClick={() => { setFeeSubTab('report'); if (!feeReport) loadFeeReport(); }}>Report</button>
                    </nav>
                  </div>

                  {feeSubTab === 'summary' && (
                  <>
                  {/* Filters */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <select className="form-select" style={{ maxWidth: '260px' }} value={feeSemesterFilter}
                      onChange={(e) => setFeeSemesterFilter(e.target.value)}>
                      <option value="">All Time</option>
                      {semesters.map(s => <option key={s.id} value={s.id}>{s.name}{s.session_name ? ` (${s.session_name})` : ''}{s.is_active ? ' ✓' : ''}</option>)}
                    </select>
                    <select className="form-select" style={{ maxWidth: '220px' }} value={feeClassFilter}
                      onChange={(e) => setFeeClassFilter(e.target.value)}>
                      <option value="">All Classes</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  {/* Summary cards */}
                  {feeSummary.length > 0 && (
                    <div className="fee-summary-cards">
                      <div className="fee-summary-card">
                        <div className="fee-summary-value">{formatCurrency(feeSummary.reduce((s, r) => s + r.total_fee, 0))}</div>
                        <div className="fee-summary-label">Total Expected</div>
                      </div>
                      <div className="fee-summary-card">
                        <div className="fee-summary-value">{formatCurrency(feeSummary.reduce((s, r) => s + r.total_paid, 0))}</div>
                        <div className="fee-summary-label">Collected</div>
                      </div>
                      <div className="fee-summary-card">
                        <div className="fee-summary-value">{formatCurrency(feeSummary.reduce((s, r) => s + Math.max(r.balance, 0), 0))}</div>
                        <div className="fee-summary-label">Outstanding</div>
                      </div>
                    </div>
                  )}

                  {feeSummary.length === 0 ? (
                    <div className="card">
                      <div className="empty">
                        <div className="empty-icon"><CurrencyDollarIcon /></div>
                        <p>No fee data yet. Set an expected fee on students (via the student form or the "Set Expected Fee" button above) to start tracking.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="card fee-table-desktop">
                        <SortableTable
                          columns={[
                            { key: 'student_name', label: 'Student', sortable: true, sortType: 'string' },
                            { key: 'class_name', label: 'Class', sortable: true, sortType: 'string' },
                            { key: 'total_fee', label: 'Expected', sortable: true, sortType: 'number',
                              render: (row) => row.fee_note ? <span title={row.fee_note}>{formatCurrency(row.total_fee)} *</span> : formatCurrency(row.total_fee) },
                            { key: 'total_paid', label: 'Paid', sortable: true, sortType: 'number',
                              render: (row) => formatCurrency(row.total_paid) },
                            { key: 'balance', label: 'Balance', sortable: true, sortType: 'number',
                              render: (row) => formatCurrency(row.balance) },
                            { key: 'status', label: 'Progress', sortable: true, sortType: 'number',
                              sortValue: (row) => row.total_fee > 0 ? row.total_paid / row.total_fee : 0,
                              render: (row) => <FeeProgressBar paid={row.total_paid} total={row.total_fee} /> },
                            { key: 'actions', label: '', sortable: false,
                              render: (row) => (
                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                  <button className="btn btn-sm btn-primary" disabled={isReadOnly()} onClick={() => {
                                    setShowPaymentModal(row);
                                    setNewPayment({ amount_paid: '', payment_date: new Date().toISOString().split('T')[0], payment_method: 'cash', reference_note: '', payment_label: '', _labelCategory: '' });
                                  }}>Record</button>
                                  <button className="btn btn-sm btn-secondary" disabled={isReadOnly()} onClick={() => setEditingFee({ student_id: row.student_id, expected_fee: row.total_fee, fee_note: row.fee_note || '', student_name: row.student_name })} title="Edit fee">Edit</button>
                                  <button className="btn btn-sm btn-secondary btn-danger" disabled={isReadOnly()} onClick={() => handleClearFee(row)} title="Clear fee">×</button>
                                </div>
                              )}
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
                      <div className="fee-mobile-cards">
                        {feeSummary.map((row, idx) => (
                          <div key={idx} className="admin-mobile-card">
                            <div className="admin-mobile-card-top">
                              <div>
                                <div className="admin-mobile-card-title">{row.student_name}</div>
                                <div className="admin-mobile-card-sub">{row.class_name}{row.fee_note ? ` · ${row.fee_note}` : ''}</div>
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
                            <div className="admin-mobile-card-actions">
                              <button className="btn btn-sm btn-primary" disabled={isReadOnly()} onClick={() => {
                                setShowPaymentModal(row);
                                setNewPayment({ amount_paid: '', payment_date: new Date().toISOString().split('T')[0], payment_method: 'cash', reference_note: '', payment_label: '', _labelCategory: '' });
                              }}>Record Payment</button>
                              <button className="btn btn-sm btn-secondary" disabled={isReadOnly()} onClick={() => setEditingFee({ student_id: row.student_id, expected_fee: row.total_fee, fee_note: row.fee_note || '', student_name: row.student_name })}>Edit Fee</button>
                              <button className="btn btn-sm btn-secondary btn-danger" disabled={isReadOnly()} onClick={() => handleClearFee(row)}>Clear</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Payment History */}
                  {feePayments.length > 0 && (
                    <>
                      <div className="card fee-table-desktop" style={{ marginTop: '20px' }}>
                        <div className="card-header">Recent Payments</div>
                        <div className="card-body" style={{ padding: 0 }}>
                          <SortableTable
                            columns={[
                              { key: 'student_name', label: 'Student', sortable: true, sortType: 'string' },
                              { key: 'amount_paid', label: 'Amount', sortable: true, sortType: 'number',
                                render: (row) => formatCurrency(row.amount_paid) },
                              { key: 'payment_label', label: 'For', sortable: false,
                                render: (row) => row.payment_label || row.period_label || '—' },
                              { key: 'payment_date', label: 'Date', sortable: true, sortType: 'string',
                                render: (row) => new Date(row.payment_date).toLocaleDateString() },
                              { key: 'payment_method', label: 'Method', sortable: true, sortType: 'string',
                                render: (row) => ({ cash: 'Cash', bank_transfer: 'Bank Transfer', online: 'Online', other: 'Other' }[row.payment_method] || row.payment_method) },
                              { key: 'actions', label: '', sortable: false,
                                render: (row) => (
                                  <button className="btn btn-sm btn-secondary btn-danger" disabled={isReadOnly()} onClick={() => handleVoidPayment(row.id)}>Void</button>
                                )}
                            ]}
                            data={feePayments}
                            pagination
                            pageSize={10}
                            emptyMessage="No payments recorded"
                          />
                        </div>
                      </div>
                      <div className="fee-mobile-cards" style={{ marginTop: '20px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#0a0a0a' }}>Recent Payments</div>
                        {feePayments.map(row => (
                          <div key={row.id} className="admin-mobile-card">
                            <div className="admin-mobile-card-top">
                              <div>
                                <div className="admin-mobile-card-title">{row.student_name}</div>
                                <div className="admin-mobile-card-sub">{row.payment_label || row.period_label || ''} &middot; {({ cash: 'Cash', bank_transfer: 'Bank Transfer', online: 'Online', other: 'Other' }[row.payment_method] || row.payment_method)}</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 600, fontSize: '15px' }}>{formatCurrency(row.amount_paid)}</div>
                                <div className="admin-mobile-card-sub">{new Date(row.payment_date).toLocaleDateString()}</div>
                              </div>
                            </div>
                            <div className="admin-mobile-card-actions">
                              <button className="btn btn-sm btn-secondary btn-danger" disabled={isReadOnly()} onClick={() => handleVoidPayment(row.id)}>Void</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  </>
                  )}
                </>
              )}

              {/* Fee Report Sub-tab (shared by auto and manual modes) */}
              {!feeLoading && feeSubTab === 'report' && (
                <>
                  {/* Period selector */}
                  <div className="fee-report-filters no-print">
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <select className="form-select" style={{ maxWidth: '180px' }} value={feeReportPeriod}
                        onChange={(e) => {
                          setFeeReportPeriod(e.target.value);
                          setFeeReport(null);
                          loadFeeReport(e.target.value, feeReportSemesterId, feeReportSessionId);
                        }}>
                        <option value="semester">Semester</option>
                        <option value="session">Session</option>
                        <option value="all">All Time</option>
                      </select>
                      {feeReportPeriod === 'semester' && (
                        <select className="form-select" style={{ maxWidth: '260px' }} value={feeReportSemesterId}
                          onChange={(e) => {
                            setFeeReportSemesterId(e.target.value);
                            setFeeReport(null);
                            loadFeeReport('semester', e.target.value, feeReportSessionId);
                          }}>
                          <option value="">Active Semester</option>
                          {semesters.map(s => <option key={s.id} value={s.id}>{s.name} ({s.session_name})</option>)}
                        </select>
                      )}
                      {feeReportPeriod === 'session' && (
                        <select className="form-select" style={{ maxWidth: '220px' }} value={feeReportSessionId}
                          onChange={(e) => {
                            setFeeReportSessionId(e.target.value);
                            setFeeReport(null);
                            loadFeeReport('session', feeReportSemesterId, e.target.value);
                          }}>
                          <option value="">Active Session</option>
                          {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      )}
                    </div>
                  </div>

                  {feeReportLoading && <div className="loading-state"><div className="loading-spinner" /></div>}
                  {!feeReportLoading && feeReport && (
                    <div className="fee-report">
                      <div className="fee-report-header no-print">
                        <button className="btn btn-secondary" onClick={() => loadFeeReport()}>Refresh</button>
                        <button className="btn btn-primary" onClick={() => window.print()}>Print Report</button>
                      </div>

                      {/* Report title for print */}
                      <div className="fee-report-print-title">
                        <h2>{feeReport.madrasahName || madrasahProfile?.name || 'Madrasah'}</h2>
                        <p>Fee Collection Report &mdash; {feeReport.period?.name || 'All Time'}</p>
                        {feeReport.period?.startDate && (
                          <p style={{ fontSize: '11px', color: '#888', margin: '2px 0 0' }}>
                            {new Date(feeReport.period.startDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} &ndash; {new Date(feeReport.period.endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </p>
                        )}
                      </div>

                      {/* Period badge */}
                      <div className="fee-report-period no-print">
                        <span style={{ fontWeight: 600 }}>{feeReport.period?.name || 'All Time'}</span>
                        {feeReport.period?.startDate && (
                          <span style={{ color: 'var(--muted)', marginLeft: '8px' }}>
                            {new Date(feeReport.period.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} &ndash; {new Date(feeReport.period.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                      </div>

                      {/* Overview cards */}
                      <div className="fee-report-cards">
                        <div className="fee-report-card">
                          <div className="fee-report-card-value">{feeReport.overview.collectionRate}%</div>
                          <div className="fee-report-card-label">Collection Rate</div>
                          <div className="fee-report-card-bar">
                            <div className="fee-report-card-bar-fill" style={{
                              width: `${Math.min(feeReport.overview.collectionRate, 100)}%`,
                              backgroundColor: feeReport.overview.collectionRate >= 80 ? '#16a34a' : feeReport.overview.collectionRate >= 50 ? '#ca8a04' : '#dc2626'
                            }} />
                          </div>
                        </div>
                        <div className="fee-report-card">
                          <div className="fee-report-card-value">{formatCurrency(feeReport.overview.totalExpected)}</div>
                          <div className="fee-report-card-label">Total Expected</div>
                        </div>
                        <div className="fee-report-card">
                          <div className="fee-report-card-value" style={{ color: '#16a34a' }}>{formatCurrency(feeReport.overview.totalCollected)}</div>
                          <div className="fee-report-card-label">Collected</div>
                        </div>
                        <div className="fee-report-card">
                          <div className="fee-report-card-value" style={{ color: '#dc2626' }}>{formatCurrency(feeReport.overview.totalOutstanding)}</div>
                          <div className="fee-report-card-label">Outstanding</div>
                        </div>
                      </div>

                      {/* Student status breakdown */}
                      <div className="fee-report-section">
                        <h3 className="fee-report-section-title">Student Payment Status</h3>
                        <div className="fee-report-status-row">
                          <div className="fee-report-status-item">
                            <span className="fee-report-status-dot" style={{ backgroundColor: '#16a34a' }} />
                            <span className="fee-report-status-label">Paid</span>
                            <span className="fee-report-status-count">{feeReport.statusCounts.paid}</span>
                          </div>
                          <div className="fee-report-status-item">
                            <span className="fee-report-status-dot" style={{ backgroundColor: '#ca8a04' }} />
                            <span className="fee-report-status-label">Partial</span>
                            <span className="fee-report-status-count">{feeReport.statusCounts.partial}</span>
                          </div>
                          <div className="fee-report-status-item">
                            <span className="fee-report-status-dot" style={{ backgroundColor: '#dc2626' }} />
                            <span className="fee-report-status-label">Unpaid</span>
                            <span className="fee-report-status-count">{feeReport.statusCounts.unpaid}</span>
                          </div>
                          <div className="fee-report-status-item">
                            <span className="fee-report-status-dot" style={{ backgroundColor: '#6b7280' }} />
                            <span className="fee-report-status-label">Total Students</span>
                            <span className="fee-report-status-count">{feeReport.statusCounts.total}</span>
                          </div>
                        </div>
                        {/* Visual bar */}
                        {feeReport.statusCounts.total > 0 && (
                          <div className="fee-report-status-bar">
                            {feeReport.statusCounts.paid > 0 && (
                              <div className="fee-report-status-bar-seg" style={{ width: `${(feeReport.statusCounts.paid / feeReport.statusCounts.total) * 100}%`, backgroundColor: '#16a34a' }}
                                title={`Paid: ${feeReport.statusCounts.paid}`} />
                            )}
                            {feeReport.statusCounts.partial > 0 && (
                              <div className="fee-report-status-bar-seg" style={{ width: `${(feeReport.statusCounts.partial / feeReport.statusCounts.total) * 100}%`, backgroundColor: '#ca8a04' }}
                                title={`Partial: ${feeReport.statusCounts.partial}`} />
                            )}
                            {feeReport.statusCounts.unpaid > 0 && (
                              <div className="fee-report-status-bar-seg" style={{ width: `${(feeReport.statusCounts.unpaid / feeReport.statusCounts.total) * 100}%`, backgroundColor: '#dc2626' }}
                                title={`Unpaid: ${feeReport.statusCounts.unpaid}`} />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Class breakdown table */}
                      {feeReport.classBreakdown.length > 0 && (
                        <div className="fee-report-section">
                          <h3 className="fee-report-section-title">Collection by Class</h3>
                          <div className="table-responsive">
                          <table className="fee-report-table">
                            <thead>
                              <tr>
                                <th>Class</th>
                                <th style={{ textAlign: 'right' }}>Students</th>
                                <th style={{ textAlign: 'right' }}>Expected</th>
                                <th style={{ textAlign: 'right' }}>Collected</th>
                                <th style={{ textAlign: 'right' }}>Outstanding</th>
                                <th style={{ textAlign: 'right' }}>Rate</th>
                              </tr>
                            </thead>
                            <tbody>
                              {feeReport.classBreakdown.map((c, i) => (
                                <tr key={i}>
                                  <td data-label="">{c.class_name}</td>
                                  <td data-label="Students" style={{ textAlign: 'right' }}>{c.student_count}</td>
                                  <td data-label="Expected" style={{ textAlign: 'right' }}>{formatCurrency(c.total_expected)}</td>
                                  <td data-label="Collected" style={{ textAlign: 'right' }}>{formatCurrency(c.total_collected)}</td>
                                  <td data-label="Outstanding" style={{ textAlign: 'right', color: c.outstanding > 0 ? '#dc2626' : undefined }}>{formatCurrency(c.outstanding)}</td>
                                  <td data-label="Rate" style={{ textAlign: 'right' }}>
                                    <span style={{
                                      fontWeight: 600,
                                      color: c.collection_rate >= 80 ? '#16a34a' : c.collection_rate >= 50 ? '#ca8a04' : '#dc2626'
                                    }}>{c.collection_rate}%</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr style={{ fontWeight: 600 }}>
                                <td data-label="">Total</td>
                                <td data-label="Students" style={{ textAlign: 'right' }}>{feeReport.statusCounts.total}</td>
                                <td data-label="Expected" style={{ textAlign: 'right' }}>{formatCurrency(feeReport.overview.totalExpected)}</td>
                                <td data-label="Collected" style={{ textAlign: 'right' }}>{formatCurrency(feeReport.overview.totalCollected)}</td>
                                <td data-label="Outstanding" style={{ textAlign: 'right', color: feeReport.overview.totalOutstanding > 0 ? '#dc2626' : undefined }}>{formatCurrency(feeReport.overview.totalOutstanding)}</td>
                                <td data-label="Rate" style={{ textAlign: 'right' }}>
                                  <span style={{
                                    color: feeReport.overview.collectionRate >= 80 ? '#16a34a' : feeReport.overview.collectionRate >= 50 ? '#ca8a04' : '#dc2626'
                                  }}>{feeReport.overview.collectionRate}%</span>
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                          </div>
                        </div>
                      )}

                      {/* Monthly collection trend */}
                      {feeReport.monthlyTrend.length > 0 && (
                        <div className="fee-report-section">
                          <h3 className="fee-report-section-title">Monthly Collections (Last 6 Months)</h3>
                          <div className="fee-report-trend">
                            {(() => {
                              const maxVal = Math.max(...feeReport.monthlyTrend.map(m => m.total));
                              return feeReport.monthlyTrend.map((m, i) => {
                                const pct = maxVal > 0 ? (m.total / maxVal) * 100 : 0;
                                const [year, month] = m.month.split('-');
                                const label = new Date(year, parseInt(month) - 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
                                return (
                                  <div key={i} className="fee-report-trend-item">
                                    <div className="fee-report-trend-bar-wrap">
                                      <div className="fee-report-trend-bar" style={{ height: `${Math.max(pct, 4)}%` }} />
                                    </div>
                                    <div className="fee-report-trend-amount">{formatCurrency(m.total)}</div>
                                    <div className="fee-report-trend-label">{label}</div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      )}

                      <div className="fee-report-footer">
                        <span>{feeReport.period?.name || 'All Time'} &middot; {feeReport.mode === 'auto' ? 'Auto' : 'Manual'} tracking</span>
                        <span>Generated: {new Date(feeReport.generatedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  {!feeReportLoading && !feeReport && (
                    <div className="card">
                      <div className="empty">
                        <p>Loading report data...</p>
                      </div>
                    </div>
                  )}
                </>
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
                                fetchClassKpis(cls.id, attendanceDateFrom, attendanceDateTo);
                                fetchClassAttendance(cls.id, attendanceDateFrom, attendanceDateTo);
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
                    {reportSubTab === 'attendance' && selectedClassForPerformance && (
                      <>
                        <div className="form-group">
                          <label className="form-label">From</label>
                          <input
                            type="date"
                            className="form-input"
                            value={attendanceDateFrom}
                            onChange={(e) => {
                              setAttendanceDateFrom(e.target.value);
                              fetchClassKpis(selectedClassForPerformance.id, e.target.value, attendanceDateTo);
                              fetchClassAttendance(selectedClassForPerformance.id, e.target.value, attendanceDateTo);
                            }}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">To</label>
                          <input
                            type="date"
                            className="form-input"
                            value={attendanceDateTo}
                            onChange={(e) => {
                              setAttendanceDateTo(e.target.value);
                              fetchClassKpis(selectedClassForPerformance.id, attendanceDateFrom, e.target.value);
                              fetchClassAttendance(selectedClassForPerformance.id, attendanceDateFrom, e.target.value);
                            }}
                          />
                        </div>
                        {(attendanceDateFrom || attendanceDateTo) && (
                          <div className="form-group" style={{ alignSelf: 'flex-end' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                setAttendanceDateFrom('');
                                setAttendanceDateTo('');
                                fetchClassKpis(selectedClassForPerformance.id, '', '');
                                fetchClassAttendance(selectedClassForPerformance.id, '', '');
                              }}
                            >
                              Clear dates
                            </button>
                          </div>
                        )}
                      </>
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

              {/* Attendance Reports Tab */}
              {reportSubTab === 'attendance' && selectedClassForPerformance && (
                <>
                  {/* Attendance KPIs Section */}
                  {classKpis && classKpis.classStats && (
                    <>
                      <h3 className="subsection-title">Attendance Metrics</h3>
                      {classKpis.classStats?.total_attendance_records > 0 ? (
                      <div className="kpi-grid">
                        <div className="kpi-card blue">
                          <div className="kpi-label">Attendance Rate</div>
                          <div className="kpi-value">
                            {`${Number(classKpis.classStats.attendance_rate).toFixed(1)}%`}
                          </div>
                          <div className="kpi-insight">
                            {Number(classKpis.classStats.attendance_rate) >= 90
                              ? 'Excellent attendance! Class is consistently present.'
                              : Number(classKpis.classStats.attendance_rate) >= 80
                              ? 'Good attendance overall. Keep up the momentum.'
                              : Number(classKpis.classStats.attendance_rate) >= 70
                              ? 'Attendance needs attention. Consider follow-ups.'
                              : 'Low attendance rate. Urgent intervention needed.'}
                          </div>
                        </div>
                        {(madrasahProfile?.enable_dressing_grade !== 0 && madrasahProfile?.enable_dressing_grade !== false) && (
                        <div className="kpi-card green">
                          <div className="kpi-label">Avg Dressing</div>
                          <div className="kpi-value">
                            {classKpis.classStats?.avg_dressing_score != null
                              ? Number(classKpis.classStats.avg_dressing_score).toFixed(2)
                              : '-'}
                          </div>
                          <div className="kpi-sub">out of 4.0</div>
                          {classKpis.classStats?.avg_dressing_score != null && (
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
                            {classKpis.classStats?.avg_behavior_score != null
                              ? Number(classKpis.classStats.avg_behavior_score).toFixed(2)
                              : '-'}
                          </div>
                          <div className="kpi-sub">out of 4.0</div>
                          {classKpis.classStats?.avg_behavior_score != null && (
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
                            {classKpis.classStats?.avg_punctuality_score != null
                              ? Number(classKpis.classStats.avg_punctuality_score).toFixed(2)
                              : '-'}
                          </div>
                          <div className="kpi-sub">out of 4.0</div>
                          {classKpis.classStats?.avg_punctuality_score != null && (
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
                      ) : (
                        <div className="empty-state" style={{ padding: 'var(--lg)', textAlign: 'center' }}>
                          <p style={{ fontSize: '16px', fontWeight: 500, marginBottom: 'var(--xs)' }}>No attendance recorded yet</p>
                          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Attendance metrics will appear here once teachers start recording attendance for this class.</p>
                        </div>
                      )}

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
                          render: (row) => fmtDate(row.date)
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
                            <div className="subject-pagination">
                              <div style={{ color: 'var(--muted)', fontSize: '14px' }}>
                                Showing subject {startIndex + 1} of {totalSubjects}
                              </div>
                              <div className="subject-pagination-btns">
                                <button
                                  onClick={() => setCurrentSubjectPage(prev => Math.max(1, prev - 1))}
                                  disabled={currentSubjectPage === 1}
                                  className="btn-sm"
                                  style={{ opacity: currentSubjectPage === 1 ? 0.5 : 1 }}
                                >
                                  ← Previous
                                </button>
                                <div style={{
                                  padding: '8px 16px',
                                  backgroundColor: 'var(--accent-light)',
                                  color: 'var(--accent)',
                                  borderRadius: 'var(--radius)',
                                  fontWeight: '600',
                                  fontSize: '14px',
                                  whiteSpace: 'nowrap'
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
                                      <span style={{ color: 'var(--gray-500)' }}>N/A</span>
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
                      <BookOpenIcon width={16} height={16} />
                      Exam
                    </button>
                    <button
                      className={`subtab-btn ${rankingSubTab === 'attendance' ? 'active' : ''}`}
                      onClick={() => setRankingSubTab('attendance')}
                    >
                      <CheckCircleIcon width={16} height={16} />
                      Attendance
                    </button>
                    {(madrasahProfile?.enable_dressing_grade !== 0 && madrasahProfile?.enable_dressing_grade !== false) && (
                    <button
                      className={`subtab-btn ${rankingSubTab === 'dressing' ? 'active' : ''}`}
                      onClick={() => setRankingSubTab('dressing')}
                    >
                      <UserIcon width={16} height={16} />
                      Dressing
                    </button>
                    )}
                    {(madrasahProfile?.enable_behavior_grade !== 0 && madrasahProfile?.enable_behavior_grade !== false) && (
                    <button
                      className={`subtab-btn ${rankingSubTab === 'behavior' ? 'active' : ''}`}
                      onClick={() => setRankingSubTab('behavior')}
                    >
                      <StarIcon width={16} height={16} />
                      Behavior
                    </button>
                    )}
                    {(madrasahProfile?.enable_punctuality_grade !== 0 && madrasahProfile?.enable_punctuality_grade !== false) && (
                    <button
                      className={`subtab-btn ${rankingSubTab === 'punctuality' ? 'active' : ''}`}
                      onClick={() => setRankingSubTab('punctuality')}
                    >
                      <ClockIcon width={16} height={16} />
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
                              color: row.overall_percentage >= 80 ? 'var(--success)' :
                                     row.overall_percentage >= 70 ? '#404040' :
                                     row.overall_percentage >= 50 ? 'var(--warning)' :
                                     'var(--error)'
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
                      <PrinterIcon width={16} height={16} />
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
                        <div className="info-value">{fmtDate(new Date())}</div>
                      </div>
                    </div>
                  </div>

                  {/* Performance Summary Grid */}
                  <div className="performance-summary-grid">
                    {/* Attendance */}
                    <div className="performance-card">
                      <div className="performance-card-header">
                        <CheckCircleIcon width={20} height={20} />
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
                        <BookOpenIcon width={20} height={20} />
                        <span>Exam Performance</span>
                      </div>
                      <div className="performance-card-body">
                        {individualRankings?.rankings?.exam?.rank ? (
                          <>
                            <div className="performance-main-stat">
                              <div className="performance-big-number" style={{ color: individualRankings?.rankings.exam.percentage >= 80 ? 'var(--success)' : individualRankings?.rankings.exam.percentage >= 50 ? 'var(--warning)' : 'var(--error)' }}>
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
                        <UserIcon width={20} height={20} />
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
                        <StarIcon width={20} height={20} />
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
                        <ClockIcon width={20} height={20} />
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
                      <img src="/e-daarah-whitebg-logo.png" alt="e-Daarah" className="footer-logo" loading="lazy" />
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
                          <div className="loading-state">
                            <div className="loading-spinner"></div>
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
                                <div className="table-wrap">
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
                                </div>
                              ) : (
                                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No exam records</p>
                              )}
                            </div>

                            {/* Average Scores */}
                            <div className="insight-widget">
                              <h4>Average Student Scores</h4>
                              {teacherDetailData.avgScoresByClassSubject.length > 0 ? (
                                <div className="table-wrap">
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
                                </div>
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
                          <div className="loading-state">
                            <div className="loading-spinner"></div>
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
                                return fmtDate(row.last_activity);
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
                  <button className="btn btn-secondary btn-sm" onClick={() => { localStorage.removeItem('tour_admin_done'); setShowTour(true); }}>Replay Tour</button>
                </div>

                <HelpSection sectionKey="getting-started" title="Getting Started" items={[
                  { title: 'Create a session and semester', content: 'Go to Planner > Sessions. Click "New Session" to create an academic year (e.g. 2025/2026). Then add semesters within that session. Sessions and semesters organise your attendance and exam records by time period.' },
                  { title: 'Create classes', content: 'Go to Classes and click "New Class". Give it a name (e.g. "Junior Boys", "Grade 3"). Classes group your students and are used for attendance, exams, and reports.' },
                  { title: 'Add teachers and assign classes', content: 'Go to Teachers and click "New Teacher". Fill in their details and select which classes they teach. Teachers can then log in to mark attendance and record exams for their assigned classes.' },
                  { title: 'Add students', content: 'Go to Students and click "New Student" to add one at a time, or use "Upload CSV" to bulk-import from a spreadsheet. Each student can be assigned to a class and optionally have parent contact info for the parent portal.' },
                  { title: 'Set expected fees', content: 'Go to the Fees tab and click "Set Expected Fee". Select students (filter by class), enter the amount and an optional note, then apply. Each student\'s fee progress will be tracked automatically.' },
                ]} />

                <HelpSection sectionKey="daily-ops" title="Daily Operations" items={[
                  { title: 'How attendance works', content: 'Teachers mark attendance daily for their classes from their dashboard. As an admin, you can view attendance records under Reports > Attendance. The Overview shows alerts when attendance hasn\'t been marked for the day.' },
                  { title: 'Record exam scores', content: 'Teachers record exam scores from their dashboard under Exam Recording. They select a class, subject, and exam type, then enter scores for each student. Results appear in Reports.' },
                  { title: 'Record a fee payment', content: 'Go to Fees, find the student, and click "Record". Choose the amount, date, payment method, and what the payment is for (e.g. "March", "Week 5", "Instalment 3"). The balance updates automatically.' },
                  { title: 'Void a payment', content: 'In the Fees tab under "Recent Payments", click "Void" next to a payment to reverse it. The student\'s balance will be recalculated.' },
                ]} />

                <HelpSection sectionKey="planner" title="Academic Planner" items={[
                  { title: 'Manage sessions and semesters', content: 'Sessions represent academic years. Semesters are periods within a session (e.g. First Term, Second Term). Go to Planner > Sessions to create, edit, or delete them.' },
                  { title: 'Set up holidays', content: 'Go to Planner > Holidays to add dates when classes don\'t hold. Holidays are excluded from attendance tracking so teachers won\'t be prompted to mark attendance on those days.' },
                  { title: 'Schedule overrides', content: 'Use Planner > Overrides to mark specific dates as school days or non-school days, overriding the regular weekly schedule. Useful for make-up days or unexpected closures.' },
                ]} />

                <HelpSection sectionKey="students-classes" title="Students & Classes" items={[
                  { title: 'Edit or delete a student', content: 'Go to Students, find the student in the list, and click the edit or delete button. Deleting a student is a soft delete — their records are preserved but they no longer appear in active lists.' },
                  { title: 'Promote students', content: 'At the end of a term or year, use the Promote feature in the Students tab to move students from one class to another in bulk. Select the source class, pick students, choose the destination class, and confirm.' },
                  { title: 'Bulk upload from CSV', content: 'In the Students tab, click "Upload CSV". Download the template first, fill it in with your student data, then upload. The system will validate each row and show any errors before importing.' },
                ]} />

                {madrasahProfile?.enable_fee_tracking && (
                  <HelpSection sectionKey="fees" title="Fees" items={[
                    { title: 'Set expected fees (individual or bulk)', content: 'You can set a student\'s expected fee when creating or editing them. For multiple students, use the "Set Expected Fee" button in the Fees tab — filter by class, select students, and apply an amount to all at once.' },
                    { title: 'Edit or clear a fee', content: 'In the Fees tab, each student row has "Edit" and "Clear" buttons. Edit lets you update the amount and note. Clear removes the expected fee entirely — the student will no longer appear in the Fees tab.' },
                    { title: 'Payment labels', content: 'When recording a payment, pick a category (Monthly, Weekly, Instalment, Other) then select the specific label. This helps you track which period or purpose each payment covers.' },
                    { title: 'Track collection progress', content: 'The Fees tab shows summary cards (Total Expected, Collected, Outstanding) and a progress bar for each student. Filter by class to focus on specific groups.' },
                  ]} />
                )}

                {hasPlusAccess() && (
                  <HelpSection sectionKey="reports" title="Reports" items={[
                    { title: 'Attendance reports', content: 'Go to Reports > Attendance. Select a class and date range to see attendance rates, trends, and individual student records. You can export the data as needed.' },
                    { title: 'Exam reports and rankings', content: 'Go to Reports > Exams. View results by class, subject, and semester. Student rankings show top performers and those needing attention.' },
                    { title: 'Export reports', content: 'Most report views have an export button that downloads the data. Use this for printing, sharing with parents, or keeping offline records.' },
                  ]} />
                )}

                <HelpSection sectionKey="settings" title="Settings" items={[
                  { title: 'Update school profile', content: 'Click your profile icon in the sidebar footer, then "Settings". You can update your school name, contact info, and other details.' },
                  { title: 'Enable or disable fee tracking', content: 'In Settings, toggle the "Fee Tracking" switch to show or hide the Fees tab. When disabled, fee-related features are hidden from the sidebar and student forms.' },
                  { title: 'Parent portal access', content: 'Parents can view their children\'s reports and fee status by logging in with their phone number and a password they create during first login. If a parent forgets their password, you can reset it from the Students section.' },
                ]} />
              </>
            );
          })()}

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

          {/* SMS Tab */}
          {activeTab === 'sms' && (
            <>
              <div className="page-header">
                <h2 className="page-title">SMS</h2>
              </div>

              {smsLoading && <div className="loading-state"><div className="loading-spinner" /></div>}

              {!smsLoading && (
                <>
                  {/* Credit Balance KPIs */}
                  <div className="kpi-grid">
                    <div className="kpi-card blue">
                      <div className="kpi-label">Credits Available</div>
                      <div className="kpi-value" style={{ color: smsStatus.balance > 0 ? 'var(--black)' : '#dc2626' }}>{smsStatus.balance}</div>
                    </div>
                    <div className="kpi-card">
                      <div className="kpi-label">Sent This Month</div>
                      <div className="kpi-value">{smsStatus.sentThisMonth}</div>
                    </div>
                    <div className="kpi-card">
                      <div className="kpi-label">Total Purchased</div>
                      <div className="kpi-value">{smsStatus.totalPurchased}</div>
                    </div>
                    <div className="kpi-card">
                      <div className="kpi-label">Total Used</div>
                      <div className="kpi-value">{smsStatus.totalUsed}</div>
                    </div>
                  </div>

                  {/* Sub-tabs */}
                  <div className="report-tabs no-print">
                    <nav className="report-tabs-nav">
                      {[
                        { id: 'overview', label: 'Buy Credits' },
                        { id: 'reminders', label: 'Fee Reminders' },
                        { id: 'send', label: 'Custom Message' },
                        { id: 'history', label: 'History' }
                      ].map(t => (
                        <button key={t.id} className={`report-tab-btn ${smsSubTab === t.id ? 'active' : ''}`}
                          onClick={() => setSmsSubTab(t.id)}>
                          {t.label}
                        </button>
                      ))}
                    </nav>
                  </div>

                  {/* Buy Credits Sub-tab */}
                  {smsSubTab === 'overview' && (
                    <>
                      <div className="card">
                        <h3 style={{ marginBottom: '0.25rem' }}>Purchase SMS Credits</h3>
                        <p className="page-description" style={{ marginBottom: '1rem' }}>Each credit sends one SMS message. Credits never expire.</p>
                        <div className="kpi-grid">
                          {(smsStatus.packs?.length ? smsStatus.packs : [
                            { id: 'sms_50', credits: 50, price_cents: 300, label: '50 SMS', description: '$3.00' },
                            { id: 'sms_200', credits: 200, price_cents: 1000, label: '200 SMS', description: '$10.00' },
                            { id: 'sms_500', credits: 500, price_cents: 2000, label: '500 SMS', description: '$20.00' },
                            { id: 'sms_1000', credits: 1000, price_cents: 3500, label: '1000 SMS', description: '$35.00' },
                          ]).map(pack => (
                            <div key={pack.id} className="kpi-card" style={{
                              cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                              transition: 'border-color 0.2s, box-shadow 0.2s'
                            }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--black)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--light)'; e.currentTarget.style.boxShadow = 'none'; }}
                              onClick={() => handleBuySmsCredits(pack.id)}
                            >
                              <div className="kpi-value">{pack.credits}</div>
                              <div className="kpi-label" style={{ marginBottom: 0 }}>SMS credits</div>
                              <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--black)' }}>{pack.description}</div>
                              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{smsStatus.currency === 'NZD' ? 'NZ$' : '$'}{(pack.price_cents / 100 / pack.credits).toFixed(3)}/credit</div>
                              <button className="btn btn-primary" style={{ width: '100%', marginTop: '4px' }}>
                                Buy Now
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Purchase History — only show completed purchases */}
                      {smsPurchases.filter(p => p.status === 'completed').length > 0 && (
                        <div className="card">
                          <h3 style={{ marginBottom: '1rem' }}>Purchase History</h3>
                          <div className="table-responsive sms-table-desktop">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>Date</th>
                                  <th>Credits</th>
                                  <th>Amount</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {smsPurchases.filter(p => p.status === 'completed').map(p => (
                                  <tr key={p.id}>
                                    <td>{fmtDate(p.created_at)}</td>
                                    <td>{p.credits}</td>
                                    <td>{p.amount_cents === 0 ? 'Free' : `${(p.currency || '').toUpperCase() === 'NZD' ? 'NZ$' : '$'}${(p.amount_cents / 100).toFixed(2)}`}</td>
                                    <td>
                                      <span className="status-badge status-active">
                                        Completed
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="support-mobile-cards">
                            {smsPurchases.filter(p => p.status === 'completed').map(p => (
                              <div key={p.id} className="admin-mobile-card">
                                <div className="admin-mobile-card-top">
                                  <div>
                                    <div className="admin-mobile-card-title">{fmtDate(p.created_at)}</div>
                                    <div className="admin-mobile-card-sub">{p.credits} credits</div>
                                  </div>
                                  <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                                    {p.amount_cents === 0 ? 'Free' : `${(p.currency || '').toUpperCase() === 'NZD' ? 'NZ$' : '$'}${(p.amount_cents / 100).toFixed(2)}`}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Fee Reminders Sub-tab */}
                  {smsSubTab === 'reminders' && (
                    <>
                      {/* Auto Monthly Reminder — prominent card */}
                      <div className="card" style={{
                        marginBottom: '16px',
                        border: madrasahProfile?.auto_fee_reminder_enabled ? '1px solid #22c55e' : '1px solid var(--border, #e5e7eb)',
                        background: madrasahProfile?.auto_fee_reminder_enabled ? 'var(--surface, #f9fafb)' : undefined
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: '200px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <h3 style={{ margin: 0 }}>Auto Monthly Reminder</h3>
                              {madrasahProfile?.auto_fee_reminder_enabled && (
                                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: '10px' }}>ACTIVE</span>
                              )}
                            </div>
                            <p className="page-description" style={{ margin: 0 }}>
                              Automatically send a fee reminder to all parents every month during active semesters. No manual action needed.
                            </p>
                          </div>
                          <label className="toggle-switch" style={{ flexShrink: 0, marginTop: '2px' }}>
                            <input
                              type="checkbox"
                              checked={!!madrasahProfile?.auto_fee_reminder_enabled}
                              disabled={savingSettings}
                              onChange={async (e) => {
                                const enabled = e.target.checked;
                                const updates = { auto_fee_reminder_enabled: enabled };
                                if (enabled) {
                                  updates.auto_fee_reminder_message = madrasahProfile?.auto_fee_reminder_message
                                    || `Assalaamu Alaikum. This is a reminder from {madrasah_name} that fees for this month are now due. Please ensure payment is made at your earliest convenience. JazakAllahu Khairan.`;
                                }
                                setSavingSettings(true);
                                try {
                                  const res = await api.put('/admin/settings', updates);
                                  setMadrasahProfile(prev => ({ ...prev, ...res.data }));
                                  toast.success(enabled ? 'Auto reminder enabled' : 'Auto reminder disabled');
                                } catch (err) { toast.error('Failed to update'); }
                                setSavingSettings(false);
                              }}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </div>

                        {madrasahProfile?.auto_fee_reminder_enabled && (
                          <div style={{ marginTop: '16px', maxWidth: '520px' }}>
                            <div className="form-group" style={{ marginBottom: '12px' }}>
                              <label className="form-label">When to send</label>
                              <select
                                className="form-input"
                                style={{ width: '220px' }}
                                value={madrasahProfile?.auto_fee_reminder_timing || 'day_of_month'}
                                onChange={async (e) => {
                                  const timing = e.target.value;
                                  setMadrasahProfile(prev => ({ ...prev, auto_fee_reminder_timing: timing }));
                                  setSavingSettings(true);
                                  try {
                                    const res = await api.put('/admin/settings', { auto_fee_reminder_timing: timing });
                                    setMadrasahProfile(prev => ({ ...prev, ...res.data }));
                                    toast.success(timing === 'semester_start' ? 'Will send on semester start dates' : 'Will send on specific day of month');
                                  } catch (err) { toast.error('Failed to update'); }
                                  setSavingSettings(false);
                                }}
                              >
                                <option value="day_of_month">Specific day of month</option>
                                <option value="semester_start">Start of each semester</option>
                              </select>
                              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                                {(madrasahProfile?.auto_fee_reminder_timing || 'day_of_month') === 'semester_start'
                                  ? 'Reminder will be sent on the first day of each semester automatically.'
                                  : 'Reminder will be sent on the chosen day every month.'}
                              </span>
                            </div>

                            {(madrasahProfile?.auto_fee_reminder_timing || 'day_of_month') === 'day_of_month' && (
                            <div className="form-group" style={{ marginBottom: '12px' }}>
                              <label className="form-label">Day of month</label>
                              <input
                                type="number"
                                className="form-input"
                                style={{ width: '80px' }}
                                min={1}
                                max={28}
                                placeholder="e.g. 1"
                                value={madrasahProfile?.auto_fee_reminder_day || ''}
                                onChange={(e) => setMadrasahProfile(prev => ({ ...prev, auto_fee_reminder_day: e.target.value }))}
                                onBlur={async (e) => {
                                  const day = parseInt(e.target.value);
                                  if (!day || day < 1 || day > 28) return;
                                  setSavingSettings(true);
                                  try {
                                    const res = await api.put('/admin/settings', { auto_fee_reminder_day: day });
                                    setMadrasahProfile(prev => ({ ...prev, ...res.data }));
                                  } catch (err) { toast.error('Failed to update'); }
                                  setSavingSettings(false);
                                }}
                              />
                            </div>
                            )}

                            <div className="form-group" style={{ marginBottom: '12px' }}>
                              <label className="form-label">Message</label>
                              <textarea
                                className="form-textarea"
                                rows={3}
                                value={madrasahProfile?.auto_fee_reminder_message || ''}
                                onChange={(e) => setMadrasahProfile(prev => ({ ...prev, auto_fee_reminder_message: e.target.value }))}
                                maxLength={1600}
                                placeholder="Type your reminder message..."
                              />
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                                  Variables: {'{madrasah_name}'} {'{student_name}'} {'{first_name}'}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: (madrasahProfile?.auto_fee_reminder_message || '').length > 1400 ? '#dc2626' : 'var(--muted)' }}>
                                  {(madrasahProfile?.auto_fee_reminder_message || '').length}/1600
                                </span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <button
                                className="btn btn-primary"
                                disabled={savingSettings || !(madrasahProfile?.auto_fee_reminder_message || '').trim()}
                                onClick={async () => {
                                  setSavingSettings(true);
                                  try {
                                    const res = await api.put('/admin/settings', {
                                      auto_fee_reminder_message: madrasahProfile.auto_fee_reminder_message
                                    });
                                    setMadrasahProfile(prev => ({ ...prev, ...res.data }));
                                    toast.success('Message saved');
                                  } catch (err) { toast.error('Failed to save'); }
                                  setSavingSettings(false);
                                }}
                              >
                                {savingSettings ? 'Saving...' : 'Save Message'}
                              </button>
                              {madrasahProfile?.auto_fee_reminder_last_sent && (
                                <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                                  Last sent: {new Date(madrasahProfile.auto_fee_reminder_last_sent).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Manual Send — collapsible recipients */}
                      <div className="card">
                        <h3 style={{ marginBottom: '0.25rem' }}>Send Now</h3>
                        <p className="page-description" style={{ marginBottom: '1rem' }}>
                          Send a one-time fee reminder to selected students with outstanding balances.
                        </p>

                        <div className="form-grid">
                          <div className="form-group">
                            <label className="form-label">Send To</label>
                            <select className="form-select" value={smsReminderSendTo}
                              onChange={(e) => setSmsReminderSendTo(e.target.value)}>
                              <option value="parent">Parent / Guardian</option>
                              <option value="student">Student (direct)</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label className="form-label">Filter by Class</label>
                            <select className="form-select" value={smsReminderClass}
                              onChange={(e) => setSmsReminderClass(e.target.value)}>
                              <option value="">All Classes</option>
                              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </div>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Message</label>
                          <textarea className="form-textarea" rows={4} value={smsReminderMsg}
                            onChange={(e) => setSmsReminderMsg(e.target.value)}
                            maxLength={1600} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                              Variables: {'{madrasah_name}'}, {'{student_name}'}, {'{first_name}'}, {'{last_name}'}, {'{expected_fee}'}, {'{balance}'}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: smsReminderMsg.length > 1400 ? '#dc2626' : '#94a3b8' }}>
                              {smsReminderMsg.length}/1600
                            </span>
                          </div>
                        </div>

                        {smsReminderStudents.length === 0 ? (
                          <div className="empty-state">
                            <p>No students with outstanding balances and phone numbers found.</p>
                          </div>
                        ) : (
                          (() => {
                            const perPage = 20;
                            const totalPages = Math.ceil(smsReminderStudents.length / perPage);
                            const paged = smsReminderStudents.slice((smsReminderPage - 1) * perPage, smsReminderPage * perPage);
                            const getPhone = (s) => smsReminderSendTo === 'student' ? s.student_phone : s.parent_guardian_phone;
                            const getPhoneCode = (s) => smsReminderSendTo === 'student' ? (s.student_phone_country_code || '') : (s.parent_guardian_phone_country_code || '');
                            const formatDisplay = (s) => { const code = getPhoneCode(s); const ph = getPhone(s); return code && ph ? `${code}${ph}` : ph || '—'; };
                            const selectedStudents = smsReminderStudents.filter(s => smsSelectedStudents.includes(s.id));
                            const phoneGroups = {};
                            selectedStudents.forEach(s => {
                              const key = getPhoneCode(s) + getPhone(s);
                              if (!phoneGroups[key]) phoneGroups[key] = [];
                              phoneGroups[key].push(s);
                            });
                            const uniquePhones = Object.keys(phoneGroups).length;
                            const duplicateParents = selectedStudents.length - uniquePhones;

                            const estimateSegments = (text) => {
                              if (!text) return 1;
                              const len = text.length;
                              return len <= 160 ? 1 : Math.ceil(len / 153);
                            };
                            const estimatedCredits = Object.values(phoneGroups).reduce((total, group) => {
                              const names = group.map(s => `${s.first_name} ${s.last_name}`).join(', ');
                              const simulated = smsReminderMsg
                                .replace(/\{student_name\}/gi, names)
                                .replace(/\{first_name\}/gi, group.map(s => s.first_name).join(', '))
                                .replace(/\{last_name\}/gi, group.map(s => s.last_name).join(', '))
                                .replace(/\{madrasah_name\}/gi, madrasahProfile?.name || '')
                                .replace(/\{expected_fee\}/gi, '$0.00')
                                .replace(/\{balance\}/gi, '$0.00');
                              return total + estimateSegments(simulated);
                            }, 0);

                            return (
                              <>
                                {/* Collapsible recipient header */}
                                <div
                                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: smsShowRecipients ? '0.75rem' : 0, cursor: 'pointer', padding: '8px 0' }}
                                  onClick={() => setSmsShowRecipients(!smsShowRecipients)}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '0.75rem', transition: 'transform 0.2s', transform: smsShowRecipients ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}>&#9654;</span>
                                    <label className="form-label" style={{ margin: 0, cursor: 'pointer' }}>
                                      {smsSelectedStudents.length} of {smsReminderStudents.length} students selected
                                    </label>
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button className="btn btn-sm btn-secondary"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSmsSelectedStudents(
                                          smsSelectedStudents.length === smsReminderStudents.length ? [] : smsReminderStudents.map(s => s.id)
                                        );
                                      }}>
                                      {smsSelectedStudents.length === smsReminderStudents.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                                      {smsShowRecipients ? 'Hide' : 'Preview'}
                                    </span>
                                  </div>
                                </div>

                                {smsShowRecipients && (
                                  <>
                                    {duplicateParents > 0 && (
                                      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '8px 12px', marginBottom: '0.75rem', fontSize: '0.8125rem', color: '#1e40af' }}>
                                        {uniquePhones} SMS will be sent — {duplicateParents} student{duplicateParents !== 1 ? 's share' : ' shares'} a phone number with another student. Children of the same parent are combined into one message.
                                      </div>
                                    )}

                                    <div className="table-responsive sms-table-desktop" style={{ marginBottom: '0.5rem' }}>
                                      <table className="data-table">
                                        <thead>
                                          <tr>
                                            <th style={{ width: '40px' }}>
                                              <input type="checkbox"
                                                checked={smsSelectedStudents.length === smsReminderStudents.length}
                                                onChange={() => setSmsSelectedStudents(
                                                  smsSelectedStudents.length === smsReminderStudents.length ? [] : smsReminderStudents.map(s => s.id)
                                                )} />
                                            </th>
                                            <th>Student</th>
                                            <th>Class</th>
                                            <th>{smsReminderSendTo === 'student' ? 'Student Phone' : 'Parent Phone'}</th>
                                            <th>Balance</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {paged.map(s => (
                                            <tr key={s.id}>
                                              <td>
                                                <input type="checkbox"
                                                  checked={smsSelectedStudents.includes(s.id)}
                                                  onChange={() => setSmsSelectedStudents(prev =>
                                                    prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                                                  )} />
                                              </td>
                                              <td>{s.first_name} {s.last_name}</td>
                                              <td>{s.class_name || '—'}</td>
                                              <td>{formatDisplay(s)}</td>
                                              <td style={{ color: '#dc2626', fontWeight: '600' }}>{formatCurrency(s.balance)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>

                                    {totalPages > 1 && (
                                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                        <button className="btn btn-sm btn-secondary" disabled={smsReminderPage <= 1}
                                          onClick={() => setSmsReminderPage(p => p - 1)}>Previous</button>
                                        <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                                          Page {smsReminderPage} of {totalPages}
                                        </span>
                                        <button className="btn btn-sm btn-secondary" disabled={smsReminderPage >= totalPages}
                                          onClick={() => setSmsReminderPage(p => p + 1)}>Next</button>
                                      </div>
                                    )}

                                    {/* Mobile cards */}
                                    <div className="support-mobile-cards" style={{ marginBottom: '1rem' }}>
                                      {paged.map(s => (
                                        <div key={s.id} className="admin-mobile-card" style={{ cursor: 'pointer' }}
                                          onClick={() => setSmsSelectedStudents(prev =>
                                            prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                                          )}>
                                          <div className="admin-mobile-card-top">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                              <input type="checkbox" checked={smsSelectedStudents.includes(s.id)} readOnly />
                                              <div>
                                                <div className="admin-mobile-card-title">{s.first_name} {s.last_name}</div>
                                                <div className="admin-mobile-card-sub">{s.class_name || 'No class'} · {formatDisplay(s)}</div>
                                              </div>
                                            </div>
                                            <span style={{ color: '#dc2626', fontWeight: '600', fontSize: '0.875rem' }}>{formatCurrency(s.balance)}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                )}

                                {/* Send button — always visible */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                                  <button className="btn btn-primary" onClick={handleSendFeeReminders}
                                    disabled={smsSending || smsSelectedStudents.length === 0 || smsStatus.balance < estimatedCredits}>
                                    {smsSending ? 'Sending...' : `Send Now to ${uniquePhones} recipient${uniquePhones !== 1 ? 's' : ''}`}
                                  </button>
                                  {smsStatus.balance < estimatedCredits && estimatedCredits > 0 && (
                                    <span style={{ color: '#dc2626', fontSize: '0.875rem' }}>
                                      ~{estimatedCredits} credits needed, have {smsStatus.balance}.{' '}
                                      <button className="btn-link" style={{ fontSize: '0.875rem' }} onClick={() => setSmsSubTab('overview')}>Buy more</button>
                                    </span>
                                  )}
                                  {smsStatus.balance >= estimatedCredits && estimatedCredits > 0 && (
                                    <span style={{ color: '#64748b', fontSize: '0.875rem' }}>
                                      ~{estimatedCredits} credit{estimatedCredits !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>
                              </>
                            );
                          })()
                        )}
                      </div>
                    </>
                  )}

                  {/* Custom Message Sub-tab */}
                  {smsSubTab === 'send' && (
                    <>
                      <div className="card">
                        <h3 style={{ marginBottom: '0.25rem' }}>Send Custom Message</h3>
                        <p className="page-description" style={{ marginBottom: '1rem' }}>
                          Send an SMS to any phone number. Costs 1 credit per SMS segment.
                        </p>

                        <div style={{ maxWidth: '480px' }}>
                          <div className="form-group">
                            <label className="form-label">Phone Number</label>
                            <input type="tel" className="form-input" placeholder="+1234567890"
                              value={smsCustomPhone} onChange={(e) => setSmsCustomPhone(e.target.value)} />
                            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                              Include country code (e.g. +1 for US, +44 for UK)
                            </span>
                          </div>

                          <div className="form-group">
                            <label className="form-label">Message</label>
                            <textarea className="form-textarea" rows={4} value={smsCustomMsg}
                              onChange={(e) => setSmsCustomMsg(e.target.value)}
                              maxLength={1600} placeholder="Type your message..." />
                            <div style={{ textAlign: 'right', marginTop: '4px' }}>
                              <span style={{ fontSize: '0.75rem', color: smsCustomMsg.length > 1400 ? '#dc2626' : 'var(--muted)' }}>
                                {smsCustomMsg.length}/1600
                              </span>
                            </div>
                          </div>

                          <div className="form-actions">
                            <button className="btn btn-primary" onClick={handleSendCustomSms}
                              disabled={smsSending || !smsCustomPhone || !smsCustomMsg.trim() || smsStatus.balance < 1}>
                              {smsSending ? 'Sending...' : 'Send SMS (1 credit)'}
                            </button>
                          </div>

                          {smsStatus.balance < 1 && (
                            <p style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.75rem' }}>
                              No credits remaining. <button className="btn-link" style={{ fontSize: '0.875rem' }} onClick={() => setSmsSubTab('overview')}>Buy credits</button>
                            </p>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* History Sub-tab */}
                  {smsSubTab === 'history' && (
                    <div className="card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                        <h3 style={{ margin: 0 }}>Message History</h3>
                        <select className="form-select" style={{ maxWidth: '180px' }} value={smsHistoryFilter}
                          onChange={(e) => { setSmsHistoryFilter(e.target.value); setSmsHistoryPage(1); }}>
                          <option value="">All Types</option>
                          <option value="fee_reminder">Fee Reminders</option>
                          <option value="custom">Custom</option>
                          <option value="announcement">Announcements</option>
                        </select>
                      </div>

                      {smsHistory.length === 0 ? (
                        <div className="empty-state">
                          <p>No messages sent yet.</p>
                        </div>
                      ) : (
                        <>
                          <div className="table-responsive sms-table-desktop">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>Date</th>
                                  <th>Recipient</th>
                                  <th>Phone</th>
                                  <th>Type</th>
                                  <th>Status</th>
                                  <th>Message</th>
                                </tr>
                              </thead>
                              <tbody>
                                {smsHistory.map(m => (
                                  <tr key={m.id}>
                                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(m.created_at)}</td>
                                    <td>{m.first_name ? `${m.first_name} ${m.last_name}` : '—'}</td>
                                    <td>{m.to_phone}</td>
                                    <td>
                                      <span className={`status-badge ${m.message_type === 'fee_reminder' ? 'status-pending' : 'status-active'}`}>
                                        {m.message_type.replace('_', ' ')}
                                      </span>
                                    </td>
                                    <td>
                                      <span className={`status-badge ${m.status === 'sent' || m.status === 'delivered' ? 'status-active' : m.status === 'failed' ? 'status-inactive' : 'status-pending'}`}>
                                        {m.status}
                                      </span>
                                    </td>
                                    <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                      title={m.message_body}>
                                      {m.message_body}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Mobile cards */}
                          <div className="support-mobile-cards">
                            {smsHistory.map(m => (
                              <div key={m.id} className="admin-mobile-card">
                                <div className="admin-mobile-card-top">
                                  <div>
                                    <div className="admin-mobile-card-title">
                                      {m.first_name ? `${m.first_name} ${m.last_name}` : m.to_phone}
                                    </div>
                                    <div className="admin-mobile-card-sub">
                                      {fmtDate(m.created_at)} · {m.message_type.replace('_', ' ')}
                                    </div>
                                  </div>
                                  <span className={`status-badge ${m.status === 'sent' || m.status === 'delivered' ? 'status-active' : m.status === 'failed' ? 'status-inactive' : 'status-pending'}`}>
                                    {m.status}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem', lineHeight: '1.4' }}>
                                  {m.message_body?.length > 120 ? m.message_body.slice(0, 120) + '...' : m.message_body}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Pagination */}
                          {smsHistoryTotal > 25 && (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                              <button className="btn btn-sm btn-secondary" disabled={smsHistoryPage <= 1}
                                onClick={() => setSmsHistoryPage(p => p - 1)}>Previous</button>
                              <span style={{ padding: '0.375rem 0.75rem', fontSize: '0.875rem', color: '#64748b' }}>
                                Page {smsHistoryPage} of {Math.ceil(smsHistoryTotal / 25)}
                              </span>
                              <button className="btn btn-sm btn-secondary" disabled={smsHistoryPage >= Math.ceil(smsHistoryTotal / 25)}
                                onClick={() => setSmsHistoryPage(p => p + 1)}>Next</button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
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
              <div className="card" id="settings-password">
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
                  <div className="setting-toggle-row">
                    <div className="setting-toggle-info">
                      <span className="setting-toggle-label">Fee Tracking</span>
                      <p className="setting-toggle-desc">
                        Track student fee payments, create fee templates, and manage collections
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
                          const res = await api.put('/admin/settings', { enable_fee_tracking: newValue });
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

              {/* Teacher Availability */}
              <div className="card" style={{ marginTop: '20px' }}>
                <h3>Teacher Availability</h3>
                <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>
                  Control how teacher availability interacts with your madrasah planner.
                </p>
                <div style={{ display: 'grid', gap: '16px', maxWidth: '400px' }}>
                  <div className="setting-toggle-row">
                    <div className="setting-toggle-info">
                      <span className="setting-toggle-label">Planner-Aware Availability</span>
                      <p className="setting-toggle-desc">
                        When enabled, non-school days and holidays from your planner are automatically shown as unavailable. When disabled, availability is tracked independently of the planner.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={madrasahProfile?.availability_planner_aware !== 0 && madrasahProfile?.availability_planner_aware !== false}
                      className={`setting-switch ${(madrasahProfile?.availability_planner_aware !== 0 && madrasahProfile?.availability_planner_aware !== false) ? 'on' : ''}`}
                      disabled={savingSettings}
                      onClick={async () => {
                        const newValue = !(madrasahProfile?.availability_planner_aware !== 0 && madrasahProfile?.availability_planner_aware !== false);
                        setSavingSettings(true);
                        try {
                          const res = await api.put('/admin/settings', { availability_planner_aware: newValue });
                          setMadrasahProfile(prev => ({ ...prev, ...res.data }));
                          toast.success(`Planner-aware availability ${newValue ? 'enabled' : 'disabled'}`);
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

              {/* Fee Tracking Mode */}
              {(madrasahProfile?.enable_fee_tracking !== 0 && madrasahProfile?.enable_fee_tracking !== false) && (
                <div className="card" style={{ marginTop: '20px' }}>
                  <h3>Fee Calculation Mode</h3>
                  <p style={{ fontSize: '13px', color: 'var(--gray)', margin: '0 0 12px' }}>
                    Choose how student fees are calculated.
                  </p>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                      className={`btn ${(!madrasahProfile?.fee_tracking_mode || madrasahProfile?.fee_tracking_mode === 'manual') ? 'btn-primary' : 'btn-secondary'}`}
                      disabled={savingSettings}
                      onClick={async () => {
                        if (madrasahProfile?.fee_tracking_mode === 'manual' || !madrasahProfile?.fee_tracking_mode) return;
                        setSavingSettings(true);
                        try {
                          const res = await api.put('/admin/settings', { fee_tracking_mode: 'manual' });
                          setMadrasahProfile(prev => ({ ...prev, ...res.data }));
                          toast.success('Switched to manual fee tracking');
                        } catch (error) {
                          toast.error('Failed to update setting');
                        } finally {
                          setSavingSettings(false);
                        }
                      }}
                    >
                      Manual
                    </button>
                    <button
                      className={`btn ${madrasahProfile?.fee_tracking_mode === 'auto' ? 'btn-primary' : 'btn-secondary'}`}
                      disabled={savingSettings}
                      onClick={async () => {
                        if (madrasahProfile?.fee_tracking_mode === 'auto') return;
                        const hasPlanner = sessions.some(s => s.is_active);
                        if (!hasPlanner) {
                          toast.error('You need an active session in your Planner before enabling auto fee tracking.');
                          return;
                        }
                        setConfirmModal({
                          title: 'Switch to Auto Fee Tracking',
                          message: 'Auto fee calculation uses your Planner data (sessions, semesters, school days, and holidays) to compute expected fees. Make sure your Planner is up to date before switching.',
                          confirmLabel: 'Switch to Auto',
                          onConfirm: async () => {
                            setSavingSettings(true);
                            try {
                              const res = await api.put('/admin/settings', { fee_tracking_mode: 'auto' });
                              setMadrasahProfile(prev => ({ ...prev, ...res.data }));
                              toast.success('Switched to auto fee tracking');
                            } catch (error) {
                              toast.error(error.response?.data?.error || 'Failed to update setting');
                            } finally {
                              setSavingSettings(false);
                            }
                          }
                        });
                      }}
                    >
                      Auto
                    </button>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--gray)', marginTop: '8px' }}>
                    {(!madrasahProfile?.fee_tracking_mode || madrasahProfile?.fee_tracking_mode === 'manual')
                      ? 'Manually set expected fees per student.'
                      : 'Fees are auto-calculated from fee schedules and your Planner data.'}
                  </p>

                  {madrasahProfile?.fee_tracking_mode === 'auto' && (
                    <div className="setting-toggle-row" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                      <div className="setting-toggle-info">
                        <span className="setting-toggle-label">Prorate Mid-Period Enrollment</span>
                        <p className="setting-toggle-desc">
                          Reduce fees proportionally when a student enrolls partway through a billing period
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={!!madrasahProfile?.fee_prorate_mid_period}
                        className={`setting-switch ${madrasahProfile?.fee_prorate_mid_period ? 'on' : ''}`}
                        disabled={savingSettings}
                        onClick={async () => {
                          const newValue = !madrasahProfile?.fee_prorate_mid_period;
                          setSavingSettings(true);
                          try {
                            const res = await api.put('/admin/settings', { fee_prorate_mid_period: newValue });
                            setMadrasahProfile(prev => ({ ...prev, ...res.data }));
                            toast.success(`Proration ${newValue ? 'enabled' : 'disabled'}`);
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
                  )}
                </div>
              )}

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
                      const res = await api.put('/admin/settings', { currency: newCurrency });
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
                      <p style={{ margin: '4px 0 0 0', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {madrasahProfile.name}
                        {madrasahProfile.verification_status === 'verified' && <VerifiedBadge size={16} />}
                      </p>
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
                          ? fmtDate(madrasahProfile.trial_ends_at)
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Usage Stats */}
                  {madrasahProfile.usage && (
                    <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>Current Usage</h4>
                      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
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
                          {(madrasahProfile?.currency || 'USD') === 'NZD' ? 'NZ' : ''}${billingCycle === 'monthly' ? ((madrasahProfile?.currency || 'USD') === 'NZD' ? '21' : '12') : ((madrasahProfile?.currency || 'USD') === 'NZD' ? '209' : '120')}
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
                          {(madrasahProfile?.currency || 'USD') === 'NZD' ? 'NZ' : ''}${billingCycle === 'monthly' ? ((madrasahProfile?.currency || 'USD') === 'NZD' ? '49' : '29') : ((madrasahProfile?.currency || 'USD') === 'NZD' ? '499' : '290')}
                          <span style={{ fontSize: '14px', fontWeight: '400', color: 'var(--muted)' }}>
                            /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px' }}>
                          500 students, 50 teachers
                        </div>
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
                      className="btn primary"
                      style={{ width: '100%', marginTop: '12px' }}
                      onClick={async () => {
                        try {
                          const priceKey = `${selectedPlan}_${billingCycle}`;
                          const payload = {
                            priceKey,
                            successUrl: `${window.location.origin}/${madrasahSlug}/admin?billing=success`,
                            cancelUrl: `${window.location.origin}/${madrasahSlug}/admin?billing=canceled`
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
          </>
          )}

        </main>
      </div>

      {/* Edit Fee Modal */}
      {editingFee && (
        <div className="modal-overlay" onClick={() => setEditingFee(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Expected Fee</h3>
              <button onClick={() => setEditingFee(null)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--lighter)', borderRadius: 'var(--radius)' }}>
                <strong>{editingFee.student_name}</strong>
              </div>
              <div className="form-group">
                <label className="form-label">Expected Fee</label>
                <input type="number" className="form-input" step="0.01" min="0" placeholder="0.00"
                  value={editingFee.expected_fee}
                  onChange={(e) => setEditingFee({ ...editingFee, expected_fee: e.target.value })}
                  autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Note (optional)</label>
                <input type="text" className="form-input" placeholder="e.g. Scholarship 50%"
                  value={editingFee.fee_note}
                  onChange={(e) => setEditingFee({ ...editingFee, fee_note: e.target.value })} />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setEditingFee(null)} className="btn btn-secondary">Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleUpdateFee}
                  disabled={!editingFee.expected_fee || parseFloat(editingFee.expected_fee) < 0}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Fee Modal */}
      {showBulkFeeModal && (
        <div className="modal-overlay" onClick={() => setShowBulkFeeModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Set Expected Fee</h3>
              <button onClick={() => setShowBulkFeeModal(false)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '14px', color: 'var(--gray)', marginBottom: '16px' }}>
                Select students and set their expected fee amount.
              </p>
              <div className="form-group">
                <label className="form-label">Select Students</label>
                <select className="form-select" style={{ marginBottom: '8px' }} value={bulkFeeClassFilter}
                  onChange={(e) => setBulkFeeClassFilter(e.target.value)}>
                  <option value="">All Classes</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {(() => {
                  const filtered = bulkFeeClassFilter ? students.filter(s => String(s.class_id) === bulkFeeClassFilter) : students;
                  const filteredIds = filtered.map(s => s.id);
                  return (
                    <>
                      <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                          <thead>
                            <tr style={{ position: 'sticky', top: 0, background: 'var(--lighter, #f9fafb)', borderBottom: '1px solid var(--border)' }}>
                              <th style={{ width: '36px', padding: '8px', textAlign: 'center' }}>
                                <input type="checkbox"
                                  checked={filtered.length > 0 && filtered.every(s => selectedStudentsForFee.includes(s.id))}
                                  onChange={(e) => setSelectedStudentsForFee(prev =>
                                    e.target.checked ? [...new Set([...prev, ...filteredIds])] : prev.filter(id => !filteredIds.includes(id))
                                  )} />
                              </th>
                              <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Name</th>
                              {!bulkFeeClassFilter && <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: 'var(--gray)' }}>Class</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map(s => (
                              <tr key={s.id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                                onClick={() => setSelectedStudentsForFee(prev =>
                                  prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                                )}>
                                <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                  <input type="checkbox" checked={selectedStudentsForFee.includes(s.id)} readOnly />
                                </td>
                                <td style={{ padding: '6px 8px' }}>{s.first_name} {s.last_name}</td>
                                {!bulkFeeClassFilter && <td style={{ padding: '6px 8px', color: 'var(--gray)', fontSize: '13px' }}>{s.class_name || ''}</td>}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {selectedStudentsForFee.length > 0 && (
                        <div style={{ fontSize: '13px', color: 'var(--gray)', marginTop: '4px' }}>{selectedStudentsForFee.length} student{selectedStudentsForFee.length !== 1 ? 's' : ''} selected</div>
                      )}
                    </>
                  );
                })()}
              </div>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Expected Fee</label>
                  <input type="number" className="form-input" step="0.01" min="0" placeholder="0.00"
                    value={bulkFeeAmount}
                    onChange={(e) => setBulkFeeAmount(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Note (optional)</label>
                  <input type="text" className="form-input" placeholder="e.g. Semester 1 2025"
                    value={bulkFeeNote}
                    onChange={(e) => setBulkFeeNote(e.target.value)} />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowBulkFeeModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="button" className="btn btn-primary"
                  disabled={selectedStudentsForFee.length === 0 || !bulkFeeAmount}
                  onClick={handleBulkSetFee}>
                  Apply to {selectedStudentsForFee.length} Student{selectedStudentsForFee.length !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fee Schedule Modal */}
      {showFeeScheduleModal && (
        <div className="modal-overlay" onClick={() => setShowFeeScheduleModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingFeeSchedule ? 'Edit Fee Schedule' : 'Create Fee Schedule'}</h3>
              <button onClick={() => setShowFeeScheduleModal(false)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={async (e) => {
                e.preventDefault();
                try {
                  if (editingFeeSchedule) {
                    await api.put(`/admin/fee-schedules/${editingFeeSchedule.id}`, newFeeSchedule);
                    toast.success('Fee schedule updated');
                  } else {
                    await api.post('/admin/fee-schedules', newFeeSchedule);
                    toast.success('Fee schedule created');
                  }
                  setShowFeeScheduleModal(false);
                  loadFeeSchedules();
                  loadAutoFeeSummary();
                } catch (error) {
                  toast.error(error.response?.data?.error || 'Failed to save fee schedule');
                }
              }}>
                {!editingFeeSchedule && (
                  <div className="form-group">
                    <label className="form-label">Apply To</label>
                    <select className="form-select" value={feeScheduleScope}
                      onChange={(e) => {
                        setFeeScheduleScope(e.target.value);
                        setNewFeeSchedule(prev => ({ ...prev, class_id: '', student_id: '' }));
                      }}>
                      <option value="all">All Students (Default)</option>
                      <option value="class">Specific Class</option>
                      <option value="student">Specific Student</option>
                    </select>
                  </div>
                )}
                {feeScheduleScope === 'class' && (
                  <div className="form-group">
                    <label className="form-label">Class</label>
                    <select className="form-select" value={newFeeSchedule.class_id}
                      onChange={(e) => setNewFeeSchedule({ ...newFeeSchedule, class_id: e.target.value })} required>
                      <option value="">Select Class</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
                {feeScheduleScope === 'student' && (
                  <div className="form-group">
                    <label className="form-label">Student</label>
                    <select className="form-select" value={newFeeSchedule.student_id}
                      onChange={(e) => setNewFeeSchedule({ ...newFeeSchedule, student_id: e.target.value })} required>
                      <option value="">Select Student</option>
                      {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.student_id})</option>)}
                    </select>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Billing Cycle</label>
                  <select className="form-select" value={newFeeSchedule.billing_cycle}
                    onChange={(e) => setNewFeeSchedule({ ...newFeeSchedule, billing_cycle: e.target.value })}>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="per_semester">Per Semester</option>
                    <option value="per_session">Per Session</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Amount</label>
                  <input type="number" className="form-input" step="0.01" min="0" placeholder="0.00"
                    value={newFeeSchedule.amount}
                    onChange={(e) => setNewFeeSchedule({ ...newFeeSchedule, amount: e.target.value })}
                    required />
                </div>
                <div className="form-group">
                  <label className="form-label">Description (Optional)</label>
                  <input type="text" className="form-input" placeholder="e.g. Tuition fee, Books fee"
                    value={newFeeSchedule.description}
                    onChange={(e) => setNewFeeSchedule({ ...newFeeSchedule, description: e.target.value })} />
                </div>
                <div className="form-actions">
                  <button type="button" onClick={() => setShowFeeScheduleModal(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary">{editingFeeSchedule ? 'Update' : 'Create'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Record Payment</h3>
              <button onClick={() => setShowPaymentModal(null)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--lighter)', borderRadius: 'var(--radius)' }}>
                <strong>{showPaymentModal.student_name}</strong>
                <div style={{ fontSize: '13px', color: 'var(--gray)', marginTop: '4px' }}>
                  Balance: {formatCurrency(showPaymentModal.balance || 0)}
                </div>
              </div>
              <form onSubmit={handleRecordPayment}>
                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Amount</label>
                    <input type="number" className="form-input" step="0.01" min="0.01" placeholder="0.00"
                      value={newPayment.amount_paid}
                      onChange={(e) => setNewPayment({ ...newPayment, amount_paid: e.target.value })}
                      required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input type="date" className="form-input"
                      value={newPayment.payment_date}
                      onChange={(e) => setNewPayment({ ...newPayment, payment_date: e.target.value })}
                      required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Method</label>
                    <select className="form-select" value={newPayment.payment_method}
                      onChange={(e) => setNewPayment({ ...newPayment, payment_method: e.target.value })}>
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="online">Online</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Payment For</label>
                    {/* Category chips */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      {[{ key: 'monthly', label: 'Monthly' }, { key: 'weekly', label: 'Weekly' }, { key: 'instalment', label: 'Instalment' }, { key: 'other', label: 'Other' }].map(cat => (
                        <button key={cat.key} type="button"
                          style={{ padding: '6px 14px', borderRadius: '20px', border: '1px solid var(--border)', background: newPayment._labelCategory === cat.key ? 'var(--primary, #404040)' : 'var(--lighter, #f9fafb)', color: newPayment._labelCategory === cat.key ? '#fff' : 'inherit', fontSize: '13px', cursor: 'pointer', minHeight: '36px' }}
                          onClick={() => setNewPayment({ ...newPayment, _labelCategory: newPayment._labelCategory === cat.key ? '' : cat.key, payment_label: '', _customLabel: false })}>
                          {cat.label}
                        </button>
                      ))}
                    </div>
                    {/* Value chips based on category */}
                    {newPayment._labelCategory === 'monthly' && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => {
                          const full = ['January','February','March','April','May','June','July','August','September','October','November','December'][i];
                          return (
                            <button key={m} type="button"
                              style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: newPayment.payment_label === full ? 'var(--primary, #404040)' : '#fff', color: newPayment.payment_label === full ? '#fff' : 'inherit', fontSize: '13px', cursor: 'pointer', minHeight: '36px' }}
                              onClick={() => setNewPayment({ ...newPayment, payment_label: full })}>
                              {m}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {newPayment._labelCategory === 'weekly' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px' }}>Week</span>
                        <input type="number" className="form-input" min="1" max="52" placeholder="1-52"
                          style={{ width: '80px' }}
                          value={newPayment.payment_label ? newPayment.payment_label.replace('Week ', '') : ''}
                          onChange={(e) => {
                            const n = parseInt(e.target.value);
                            setNewPayment({ ...newPayment, payment_label: n && n >= 1 && n <= 52 ? `Week ${n}` : '' });
                          }} />
                      </div>
                    )}
                    {newPayment._labelCategory === 'instalment' && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {Array.from({length: 12}, (_, i) => i + 1).map(n => (
                          <button key={n} type="button"
                            style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: newPayment.payment_label === `Instalment ${n}` ? 'var(--primary, #404040)' : '#fff', color: newPayment.payment_label === `Instalment ${n}` ? '#fff' : 'inherit', fontSize: '13px', cursor: 'pointer', minWidth: '44px', minHeight: '36px', textAlign: 'center' }}
                            onClick={() => setNewPayment({ ...newPayment, payment_label: `Instalment ${n}` })}>
                            {n}
                          </button>
                        ))}
                      </div>
                    )}
                    {newPayment._labelCategory === 'other' && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {['Registration', 'Exam Fee'].map(label => (
                          <button key={label} type="button"
                            style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: newPayment.payment_label === label ? 'var(--primary, #404040)' : '#fff', color: newPayment.payment_label === label ? '#fff' : 'inherit', fontSize: '13px', cursor: 'pointer', minHeight: '36px' }}
                            onClick={() => setNewPayment({ ...newPayment, payment_label: label, _customLabel: false })}>
                            {label}
                          </button>
                        ))}
                        <button type="button"
                          style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: newPayment._customLabel ? 'var(--primary, #404040)' : '#fff', color: newPayment._customLabel ? '#fff' : 'inherit', fontSize: '13px', cursor: 'pointer', minHeight: '36px' }}
                          onClick={() => setNewPayment({ ...newPayment, _customLabel: true, payment_label: '' })}>
                          Custom
                        </button>
                      </div>
                    )}
                    {newPayment._customLabel && (
                      <input type="text" className="form-input" placeholder="e.g. Semester 1 2025" style={{ marginTop: '8px' }}
                        value={newPayment.payment_label}
                        onChange={(e) => setNewPayment({ ...newPayment, payment_label: e.target.value })}
                        autoFocus />
                    )}
                    {newPayment.payment_label && (
                      <div style={{ fontSize: '13px', color: 'var(--gray)', marginTop: '6px' }}>Selected: <strong>{newPayment.payment_label}</strong></div>
                    )}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Reference / Note</label>
                  <input type="text" className="form-input" placeholder="Receipt number, memo, etc."
                    value={newPayment.reference_note}
                    onChange={(e) => setNewPayment({ ...newPayment, reference_note: e.target.value })} />
                </div>
                <div className="form-actions">
                  <button type="button" onClick={() => setShowPaymentModal(null)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary">Record Payment</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <GuidedTour
        steps={adminTourSteps}
        isOpen={showTour}
        onComplete={() => { setShowTour(false); localStorage.setItem('tour_admin_done', 'true'); }}
        onSkip={() => { setShowTour(false); localStorage.setItem('tour_admin_done', 'true'); }}
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
            students: <UserGroupIcon {...iconProps} />,
            classes: <BookOpenIcon {...iconProps} />,
            fees: <CurrencyDollarIcon {...iconProps} />,
            reports: <ChartBarIcon {...iconProps} />,
          };
          const labels = { overview: 'Home', students: 'Students', classes: 'Classes', fees: 'Fees', reports: 'Reports' };
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

export default AdminDashboard;
