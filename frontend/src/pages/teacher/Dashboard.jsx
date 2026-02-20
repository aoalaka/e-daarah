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
  // Overview state
  const [overviewData, setOverviewData] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const user = authService.getCurrentUser();
  const { madrasahSlug } = useParams();

  const navItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'attendance', label: 'Attendance' },
    ...(madrasahProfile?.enable_quran_tracking !== 0 && madrasahProfile?.enable_quran_tracking !== false ? [{ id: 'quran', label: "Qur'an Tracker" }] : []),
    { id: 'exams', label: 'Exam Recording' },
    { id: 'reports', label: 'Exam Reports' }
  ];

  // Close mobile menu when tab changes
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  // Helper to check if the account is in read-only mode (expired trial or inactive subscription)
  const isReadOnly = () => {
    if (!madrasahProfile) return false;
    const status = madrasahProfile.subscription_status;
    if (status === 'trialing') {
      const trialEndsAt = madrasahProfile.trial_ends_at;
      if (trialEndsAt && new Date(trialEndsAt) <= new Date()) return true;
    }
    if (status === 'canceled' || status === 'expired') return true;
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

  // Re-fetch school day info when class changes (class may have its own school days)
  useEffect(() => {
    fetchSchoolDayInfo(selectedClass?.id || null);
  }, [selectedClass?.id]);

  // Validate attendance date against school day rules
  useEffect(() => {
    validateAttendanceDate(attendanceDate);
  }, [attendanceDate, schoolDayInfo]);

  useEffect(() => {
    if (selectedClass && selectedSemester) {
      fetchStudents();
      fetchAttendance();
    }
  }, [selectedClass, selectedSemester, attendanceDate]);

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
    }
  }, [selectedClass, activeTab]);

  // Fetch exam performance when class, semester, or subject filter changes
  useEffect(() => {
    if (selectedClass && activeTab === 'exams') {
      fetchExamPerformance();
      setCurrentSubjectPage(1); // Reset to first page when filters change
    }
  }, [selectedClass, examFilterSession, examFilterSemester, selectedSubject, activeTab]);

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
  }, [selectedClass, reportFilterSession, reportFilterSemester, reportFilterSubject, activeTab]);

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

  const fetchAttendanceHistory = async () => {
    if (!historyClass) return;
    try {
      const params = selectedSemester ? `?semester_id=${selectedSemester.id}` : '';
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
      
      // Auto-select active semester
      const activeSemester = semestersData.find(s => {
        const isActive = s.is_active === 1 || s.is_active === true || s.is_active === '1';
        console.log(`Checking semester ${s.name}: is_active=${s.is_active}, matches=${isActive}`);
        return isActive;
      });
      
      console.log('Active semester found:', activeSemester);
      
      if (activeSemester) {
        console.log('Setting active semester:', {
          id: activeSemester.id,
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
      toast.error('Failed to load semesters');
    }
  };

  const fetchActiveSessionSemester = async () => {
    try {
      const response = await api.get('/teacher/active-session-semester');
      setActiveSession(response.data.session);
      setActiveSemester(response.data.semester);
    } catch (error) {
      console.error('Failed to fetch active session/semester:', error);
    }
  };

  const fetchSchoolDayInfo = async (classId = null) => {
    try {
      const params = classId ? `?classId=${classId}` : '';
      const response = await api.get(`/teacher/school-day-info${params}`);
      setSchoolDayInfo(response.data);
    } catch (error) {
      console.error('Failed to fetch school day info:', error);
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
    } catch (error) {
      console.error('Failed to fetch madrasah info:', error);
    }
  };

  const fetchSurahList = async () => {
    try {
      const response = await api.get('/teacher/quran/surahs');
      setSurahs(response.data);
    } catch (error) {
      console.error('Failed to fetch surahs:', error);
    }
  };

  const fetchQuranProgress = async (classId) => {
    if (!classId || !activeSemester) return;
    try {
      const response = await api.get(`/teacher/classes/${classId}/quran-progress`, {
        params: { semester_id: activeSemester.id }
      });
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
    if (!selectedClass || !activeSemester || !quranSelectedStudent) return;
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
        semester_id: activeSemester.id,
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
      toast.success(quranPassed ? 'Passed — position updated ✓' : 'Repeat recorded — student to come back');
      fetchStudentPosition(quranSelectedStudent.id);
      fetchStudentHistory(quranSelectedStudent.id);
      fetchQuranPositions(selectedClass.id);
      fetchQuranProgress(selectedClass.id);
      setQuranAyahTo('');
      setQuranGrade('Good');
      setQuranPassed(true);
      setQuranNotes('');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save');
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

  const handleDeleteQuranRecord = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    try {
      await api.delete(`/teacher/quran-progress/${id}`);
      toast.success('Deleted');
      if (selectedClass) {
        fetchQuranProgress(selectedClass.id);
        fetchQuranPositions(selectedClass.id);
      }
      if (quranSelectedStudent) {
        fetchStudentHistory(quranSelectedStudent.id);
        fetchStudentPosition(quranSelectedStudent.id);
      }
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await api.get('/teacher/my-classes');
      setClasses(response.data);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const fetchOverview = async () => {
    setOverviewLoading(true);
    try {
      const response = await api.get(`/teacher/overview?date=${getLocalDate()}`);
      setOverviewData(response.data);
    } catch (error) {
      console.error('Failed to fetch overview:', error);
    } finally {
      setOverviewLoading(false);
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
    try {
      console.log('Fetching students for class:', selectedClass.id);
      const response = await api.get(`/teacher/classes/${selectedClass.id}/students`);
      console.log('Students fetched:', response.data);
      setStudents(response.data);
      
      if (response.data.length === 0) {
        toast.error('No students found in this class');
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
      toast.error('Failed to load students');
      setStudents([]);
    }
  };

  const fetchAttendance = async () => {
    if (!selectedClass || !selectedSemester) {
      console.log('Cannot fetch attendance - missing class or semester');
      return;
    }
    
    try {
      console.log(`Fetching attendance for class ${selectedClass.id}, date ${attendanceDate}, semester ${selectedSemester.id}`);
      const response = await api.get(`/teacher/classes/${selectedClass.id}/attendance/${attendanceDate}?semester_id=${selectedSemester.id}`);
      
      console.log('Attendance data received:', response.data);
      
      if (response.data.length === 0) {
        // No attendance for this date - clear all records (blank slate)
        console.log('No attendance records for this date - showing blank form');
        setAttendanceRecords({});
      } else {
        // Map existing attendance records
        const records = {};
        response.data.forEach(record => {
          records[record.student_id] = {
            present: record.present,
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
    }
  };

  const fetchExamPerformance = async () => {
    if (!selectedClass) return;
    try {
      const params = {};
      
      // Add semester filter if selected
      if (examFilterSemester) {
        params.semesterId = examFilterSemester;
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
    if (!selectedClass || !selectedSemester || students.length === 0) {
      toast.error('Please select a class and ensure there are students');
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
    try {
      const records = students.map(student => ({
        student_id: student.id,
        present: attendanceRecords[student.id]?.present ?? false,
        absence_reason: attendanceRecords[student.id]?.absence_reason || null,
        dressing_grade: attendanceRecords[student.id]?.dressing_grade || '',
        behavior_grade: attendanceRecords[student.id]?.behavior_grade || '',
        punctuality_grade: attendanceRecords[student.id]?.punctuality_grade || '',
        notes: attendanceRecords[student.id]?.notes || ''
      }));

      console.log('Saving attendance:', { semester_id: selectedSemester.id, date: attendanceDate, records });

      await api.post(`/teacher/classes/${selectedClass.id}/attendance/bulk`, {
        semester_id: selectedSemester.id,
        date: attendanceDate,
        records,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });

      toast.success('Attendance saved successfully!');
      
      // Move to next day and clear attendance records
      const nextDay = new Date(attendanceDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = getLocalDate(nextDay);
      setAttendanceDate(nextDayStr);
      setAttendanceRecords({}); // Clear records for blank form
    } catch (error) {
      console.error('Failed to save attendance:', error);
      toast.error(error.response?.data?.error || 'Failed to save attendance');
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
      await api.post(`/teacher/classes/${selectedClass.id}/exam-performance/bulk`, examForm);
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
    if (sessions.length === 0 || semesters.length === 0) {
      toast.error('No sessions or semesters available');
      return;
    }
    
    // Initialize exam form with active session/semester (or first available) and all students
    const defaultSession = activeSession || sessions[0];
    const defaultSemester = activeSemester || semesters[0];
    
    setExamForm({
      session_id: defaultSession.id,
      semester_id: defaultSemester.id,
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
      
      if (reportFilterSession) {
        params.sessionId = reportFilterSession;
      }
      if (reportFilterSemester) {
        params.semesterId = reportFilterSemester;
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
      case 'attendance':
        return <svg {...iconProps}><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>;
      case 'quran':
        return <svg {...iconProps}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>;
      case 'exams':
        return <svg {...iconProps}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>;
      case 'reports':
        return <svg {...iconProps}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>;
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points={sidebarCollapsed ? "9 18 15 12 9 6" : "15 18 9 12 15 6"}></polyline>
            </svg>
          </button>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
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
          <button
            className="nav-item"
            onClick={() => setShowTour(true)}
            title="Tour guide"
            style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.1)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <span>Guide</span>
          </button>
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, transform: profileDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
          </div>
          {profileDropdownOpen && (
            <div className="profile-dropdown">
              <div className="profile-dropdown-header">
                <div className="user-avatar" style={{ width: 36, height: 36, minWidth: 36, fontSize: 14 }}>
                  {user?.firstName?.charAt(0) || 'T'}
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
            ⚠️ Your {madrasahProfile?.subscription_status === 'trialing' ? 'school\'s trial has expired' : 'school\'s subscription is inactive'}. 
            Your account is in read-only mode. Contact your administrator.
          </div>
        )}

        {/* Main Content */}
        <main className="main">
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
                <div className="card">
                  <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <p>Loading overview...</p>
                  </div>
                </div>
              ) : overviewData ? (
                <>
                  {/* Quick Stats */}
                  <div className="insights-summary">
                    {/* This Week */}
                    <div className="summary-card">
                      <div className="summary-value">
                        {overviewData.stats.this_week_rate !== null ? `${overviewData.stats.this_week_rate}%` : '-'}
                      </div>
                      <div className="summary-label">This Week</div>
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
                      <div className="summary-value">{overviewData.stats.attendance_rate !== null ? `${overviewData.stats.attendance_rate}%` : '-'}</div>
                      <div className="summary-label">Semester Average</div>
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

                      {/* Mobile Card View */}
                      {students.map(student => (
                        <div key={student.id} className="mobile-student-card">
                          <div className="student-header">
                            <div>
                              <div className="student-name">{student.first_name} {student.last_name}</div>
                              <div className="student-id">{student.student_id}</div>
                            </div>
                          </div>

                          <div className="form-section">
                            <div className="form-label">Attendance</div>
                            <div className="radio-group">
                              <label className="radio-label">
                                <input
                                  type="radio"
                                  name={`attendance-mobile-${student.id}`}
                                  checked={attendanceRecords[student.id]?.present === true}
                                  onChange={() => {
                                    updateAttendanceRecord(student.id, 'present', true);
                                    updateAttendanceRecord(student.id, 'absence_reason', '');
                                  }}
                                />
                                <span>Present</span>
                              </label>
                              <label className="radio-label">
                                <input
                                  type="radio"
                                  name={`attendance-mobile-${student.id}`}
                                  checked={attendanceRecords[student.id]?.present === false}
                                  onChange={() => {
                                    updateAttendanceRecord(student.id, 'present', false);
                                    updateAttendanceRecord(student.id, 'dressing_grade', '');
                                    updateAttendanceRecord(student.id, 'behavior_grade', '');
                                    updateAttendanceRecord(student.id, 'punctuality_grade', '');
                                  }}
                                />
                                <span>Absent</span>
                              </label>
                            </div>
                          </div>

                          {attendanceRecords[student.id]?.present === false && (
                            <div className="form-section">
                              <label className="form-label">Absence Reason</label>
                              <select
                                value={attendanceRecords[student.id]?.absence_reason || ''}
                                onChange={(e) => updateAttendanceRecord(student.id, 'absence_reason', e.target.value)}
                              >
                                <option value="">Select reason...</option>
                                <option value="Sick">Sick</option>
                                <option value="Parent Request">Parent Request</option>
                                <option value="School Not Notified">School Not Notified</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                          )}

                          {attendanceRecords[student.id]?.present === true && (
                            <>
                              {(madrasahProfile?.enable_dressing_grade !== 0 && madrasahProfile?.enable_dressing_grade !== false) && (
                              <div className="form-section">
                                <label className="form-label">Dressing</label>
                                <select
                                  value={attendanceRecords[student.id]?.dressing_grade || ''}
                                  onChange={(e) => updateAttendanceRecord(student.id, 'dressing_grade', e.target.value)}
                                >
                                  <option value="">Select...</option>
                                  <option value="Excellent">Excellent</option>
                                  <option value="Good">Good</option>
                                  <option value="Fair">Fair</option>
                                  <option value="Poor">Poor</option>
                                </select>
                              </div>
                              )}

                              {(madrasahProfile?.enable_behavior_grade !== 0 && madrasahProfile?.enable_behavior_grade !== false) && (
                              <div className="form-section">
                                <label className="form-label">Behavior</label>
                                <select
                                  value={attendanceRecords[student.id]?.behavior_grade || ''}
                                  onChange={(e) => updateAttendanceRecord(student.id, 'behavior_grade', e.target.value)}
                                >
                                  <option value="">Select...</option>
                                  <option value="Excellent">Excellent</option>
                                  <option value="Good">Good</option>
                                  <option value="Fair">Fair</option>
                                  <option value="Poor">Poor</option>
                                </select>
                              </div>
                              )}

                              {(madrasahProfile?.enable_punctuality_grade !== 0 && madrasahProfile?.enable_punctuality_grade !== false) && (
                              <div className="form-section">
                                <label className="form-label">Punctuality</label>
                                <select
                                  value={attendanceRecords[student.id]?.punctuality_grade || ''}
                                  onChange={(e) => updateAttendanceRecord(student.id, 'punctuality_grade', e.target.value)}
                                >
                                  <option value="">Select...</option>
                                  <option value="Excellent">Excellent</option>
                                  <option value="Good">Good</option>
                                  <option value="Fair">Fair</option>
                                  <option value="Poor">Poor</option>
                                </select>
                              </div>
                              )}
                            </>
                          )}

                          <div className="form-section">
                            <label className="form-label">Notes (Optional)</label>
                            <textarea
                              value={attendanceRecords[student.id]?.notes || ''}
                              onChange={(e) => updateAttendanceRecord(student.id, 'notes', e.target.value)}
                              placeholder="Add any notes..."
                              rows="2"
                            />
                          </div>
                        </div>
                      ))}

                      <div className="form-actions form-actions-sticky">
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
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--md)', padding: 'var(--sm)', backgroundColor: 'var(--gray-50)', borderRadius: 'var(--radius)' }}>
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
                                      backgroundColor: 'var(--gray-100)',
                                      color: 'var(--gray-700)'
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
                                      backgroundColor: 'var(--success-light)',
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
                                    backgroundColor: 'var(--error-light)',
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
                              <svg
                                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#666' }}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
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

          {/* Qur'an Progress Tab */}
          {activeTab === 'quran' && (
            <>
              <div className="page-header">
                <h2 className="page-title">Qur'an Progress</h2>
              </div>

              {!selectedClass ? (
                <div className="card" style={{ padding: 'var(--lg)', textAlign: 'center' }}>
                  <p className="empty">Select a class from the sidebar to record Qur'an progress</p>
                </div>
              ) : (
                <>
                  {/* Sub-tabs */}
                  <div className="report-tabs" style={{ marginBottom: 'var(--md)' }}>
                    <nav className="report-tabs-nav">
                      <button className={`report-tab-btn ${quranSubTab === 'record' ? 'active' : ''}`} onClick={() => setQuranSubTab('record')}>Record Session</button>
                      <button className={`report-tab-btn ${quranSubTab === 'positions' ? 'active' : ''}`} onClick={() => { setQuranSubTab('positions'); fetchQuranPositions(selectedClass?.id); }}>Class Overview</button>
                      <button className={`report-tab-btn ${quranSubTab === 'history' ? 'active' : ''}`} onClick={() => { setQuranSubTab('history'); fetchQuranProgress(selectedClass?.id); }}>History</button>
                    </nav>
                  </div>

                  {/* Record Session Sub-tab — Teacher picks type first, then records */}
                  {quranSubTab === 'record' && (
                    <div style={{ display: 'grid', gap: 'var(--md)' }}>
                      {/* Step 1: Choose session type */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--md)' }}>
                        {[
                          { value: 'tilawah', label: 'Tilawah', sub: 'Recitation / Reading', desc: 'Student reads from the mushaf' },
                          { value: 'hifz', label: 'Hifdh', sub: 'Memorization', desc: 'Student recites from memory' },
                          { value: 'revision', label: 'Muraja\'ah', sub: 'Revision', desc: 'Reviewing previously memorized' }
                        ].map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setQuranSessionType(opt.value)}
                            style={{
                              padding: 'var(--lg)',
                              border: quranSessionType === opt.value ? '2px solid #0a0a0a' : '1px solid #e5e5e5',
                              borderRadius: 'var(--radius)',
                              background: quranSessionType === opt.value ? '#0a0a0a' : '#fff',
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: 'all 0.15s'
                            }}
                          >
                            <div style={{ fontSize: '16px', fontWeight: '700', color: quranSessionType === opt.value ? '#fff' : '#0a0a0a' }}>{opt.label}</div>
                            <div style={{ fontSize: '12px', fontWeight: '500', color: quranSessionType === opt.value ? 'rgba(255,255,255,0.7)' : '#999', marginTop: '2px' }}>{opt.sub}</div>
                            <div style={{ fontSize: '12px', color: quranSessionType === opt.value ? 'rgba(255,255,255,0.5)' : '#bbb', marginTop: '6px' }}>{opt.desc}</div>
                          </button>
                        ))}
                      </div>

                      {/* Step 2: Select student + date */}
                      <div className="card" style={{ padding: 'var(--lg)', borderTop: '3px solid #0a0a0a' }}>
                        <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#999', marginBottom: 'var(--sm)' }}>
                          Recording: {quranSessionType === 'tilawah' ? 'Tilawah (Recitation)' : quranSessionType === 'hifz' ? 'Hifdh (Memorization)' : 'Muraja\'ah (Revision)'}
                        </div>
                        <div className="form-grid form-grid-2">
                          <div className="form-group">
                            <label className="form-label">Student</label>
                            <select
                              className="form-select"
                              value={quranSelectedStudent?.id || ''}
                              onChange={e => handleSelectQuranStudent(e.target.value)}
                            >
                              <option value="">Select student…</option>
                              {students.map(s => (
                                <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="form-group">
                            <label className="form-label">Date</label>
                            <input type="date" className="form-input" value={quranDate} max={getLocalDate()} onChange={e => setQuranDate(e.target.value)} />
                          </div>
                        </div>
                      </div>

                      {/* Step 3: Show position for selected type & record form */}
                      {quranSelectedStudent && quranStudentPosition && (
                        <>
                          {/* Current Position — only for the selected session type */}
                          <div className="card" style={{ padding: 'var(--lg)' }}>
                            <h3 style={{ margin: '0 0 var(--sm) 0', fontSize: '15px', fontWeight: '600' }}>
                              {quranSelectedStudent.first_name}'s {quranSessionType === 'tilawah' ? 'Tilawah' : quranSessionType === 'hifz' ? 'Hifdh' : 'Revision'} Position
                            </h3>
                            {(() => {
                              const pos = quranSessionType === 'hifz' ? quranStudentPosition.hifz
                                : quranSessionType === 'tilawah' ? quranStudentPosition.tilawah
                                : quranStudentPosition.revision;
                              return pos ? (
                                <div style={{ padding: '12px', background: '#fafafa', borderRadius: 'var(--radius)', border: '1px solid #e5e5e5' }}>
                                  <div style={{ fontSize: '14px' }}>
                                    <strong>{pos.surah_number}. {pos.surah_name}</strong>
                                    {pos.ayah && <span style={{ color: '#999' }}> — up to Ayah {pos.ayah}</span>}
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>Juz {pos.juz}</div>
                                </div>
                              ) : (
                                <p style={{ color: '#999', fontSize: '14px', margin: 0 }}>
                                  Not started yet — this will be {quranSelectedStudent.first_name}'s first {quranSessionType === 'tilawah' ? 'tilawah' : quranSessionType === 'hifz' ? 'hifdh' : 'revision'} session.
                                </p>
                              );
                            })()}
                          </div>

                          {/* Record Form */}
                          <div className="card" style={{ padding: 'var(--lg)' }}>
                            {/* Surah & Ayah */}
                            <div className="form-grid form-grid-3" style={{ gap: '12px' }}>
                              <div className="form-group">
                                <label className="form-label">Surah</label>
                                <select className="form-select" value={quranSurah} onChange={e => { setQuranSurah(e.target.value); setQuranAyahFrom(''); setQuranAyahTo(''); }}>
                                  <option value="">Select Surah</option>
                                  {surahs.map(s => (
                                    <option key={s.n} value={s.n}>{s.n}. {s.name} (Juz {s.juz})</option>
                                  ))}
                                </select>
                              </div>
                              <div className="form-group">
                                <label className="form-label">Ayah From *</label>
                                <input type="number" className="form-input" min="1"
                                  max={quranSurah ? surahs.find(s => s.n === parseInt(quranSurah))?.ayahs : undefined}
                                  placeholder="e.g. 1" value={quranAyahFrom} onChange={e => setQuranAyahFrom(e.target.value)} />
                              </div>
                              <div className="form-group">
                                <label className="form-label">Ayah To *</label>
                                <input
                                  type="number" className="form-input" min="1"
                                  max={quranSurah ? surahs.find(s => s.n === parseInt(quranSurah))?.ayahs : undefined}
                                  placeholder={quranSurah ? `max ${surahs.find(s => s.n === parseInt(quranSurah))?.ayahs || ''}` : 'e.g. 10'}
                                  value={quranAyahTo} onChange={e => setQuranAyahTo(e.target.value)}
                                />
                              </div>
                            </div>

                            {/* Grade + Pass/Fail + Notes */}
                            <div className="form-grid form-grid-3" style={{ gap: '12px', marginTop: '12px' }}>
                              <div className="form-group">
                                <label className="form-label">Grade</label>
                                <select className="form-select" value={quranGrade} onChange={e => setQuranGrade(e.target.value)}>
                                  <option value="Excellent">Excellent</option>
                                  <option value="Good">Good</option>
                                  <option value="Fair">Fair</option>
                                  <option value="Needs Improvement">Needs Improvement</option>
                                </select>
                              </div>
                              <div className="form-group">
                                <label className="form-label">Outcome</label>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                  <button
                                    type="button"
                                    onClick={() => setQuranPassed(true)}
                                    style={{
                                      flex: 1,
                                      padding: '8px',
                                      borderRadius: '6px',
                                      border: `2px solid ${quranPassed ? '#16a34a' : '#e5e5e5'}`,
                                      background: quranPassed ? 'rgba(22,163,74,0.08)' : '#fff',
                                      color: quranPassed ? '#16a34a' : '#999',
                                      fontWeight: '600',
                                      fontSize: '13px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Pass
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setQuranPassed(false)}
                                    style={{
                                      flex: 1,
                                      padding: '8px',
                                      borderRadius: '6px',
                                      border: `2px solid ${!quranPassed ? '#dc2626' : '#e5e5e5'}`,
                                      background: !quranPassed ? 'rgba(220,38,38,0.08)' : '#fff',
                                      color: !quranPassed ? '#dc2626' : '#999',
                                      fontWeight: '600',
                                      fontSize: '13px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Repeat
                                  </button>
                                </div>
                              </div>
                              <div className="form-group">
                                <label className="form-label">Notes</label>
                                <input type="text" className="form-input" placeholder="Optional notes…" value={quranNotes} onChange={e => setQuranNotes(e.target.value)} />
                              </div>
                            </div>

                            {/* Info message based on pass/fail */}
                            <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: '13px', background: quranPassed ? 'rgba(22,163,74,0.06)' : 'rgba(220,38,38,0.06)', color: quranPassed ? '#16a34a' : '#dc2626', border: `1px solid ${quranPassed ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)'}` }}>
                              {quranPassed
                                ? (quranSessionType === 'revision'
                                    ? 'Student passed — revision recorded.'
                                    : 'Student passed — their position will advance to the new ayah.')
                                : 'Student did not pass — they need to repeat this assignment next time. Position stays the same.'
                              }
                            </div>

                            <div className="form-actions" style={{ marginTop: 'var(--md)' }}>
                              <button className="btn btn-primary" onClick={handleSaveQuranProgress} disabled={quranSaving || isReadOnly()}>
                                {quranSaving ? 'Saving…' : quranPassed ? 'Save & Advance' : 'Save as Repeat'}
                              </button>
                            </div>
                          </div>

                          {/* Student's Recent History — filtered to selected type */}
                          {quranStudentHistory.filter(r => r.type === quranSessionType).length > 0 && (
                            <div className="card" style={{ padding: 'var(--lg)' }}>
                              <h3 style={{ margin: '0 0 var(--sm) 0', fontSize: '15px', fontWeight: '600' }}>Recent {quranSessionType === 'tilawah' ? 'Tilawah' : quranSessionType === 'hifz' ? 'Hifdh' : 'Revision'} Sessions</h3>
                              <div className="table-wrap">
                                <table className="table">
                                  <thead>
                                    <tr>
                                      <th>Date</th>
                                      <th>Surah</th>
                                      <th>Ayahs</th>
                                      <th>Grade</th>
                                      <th>Result</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {quranStudentHistory.filter(r => r.type === quranSessionType).map(r => (
                                      <tr key={r.id}>
                                        <td>{fmtDate(r.date)}</td>
                                        <td>{r.surah_number}. {r.surah_name}</td>
                                        <td>{r.ayah_from && r.ayah_to ? `${r.ayah_from}–${r.ayah_to}` : r.ayah_from ? `From ${r.ayah_from}` : '—'}</td>
                                        <td>
                                          <span className={`badge ${r.grade === 'Excellent' ? 'badge-success' : r.grade === 'Good' ? 'badge-info' : r.grade === 'Fair' ? 'badge-warning' : 'badge-danger'}`}>
                                            {r.grade}
                                          </span>
                                        </td>
                                        <td>
                                          <span style={{ color: r.passed ? '#16a34a' : '#dc2626', fontWeight: '600', fontSize: '13px' }}>
                                            {r.passed ? 'Passed' : 'Repeat'}
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

                      {/* No student selected prompt */}
                      {!quranSelectedStudent && (
                        <div className="card" style={{ padding: 'var(--xl)', textAlign: 'center' }}>
                          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📖</div>
                          <p style={{ color: 'var(--muted)', fontSize: '14px', margin: 0 }}>Select a student who has come to recite or read</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Class Overview Sub-tab */}
                  {quranSubTab === 'positions' && (
                    <div className="card" style={{ padding: 'var(--md)' }}>
                      <h3 style={{ margin: '0 0 var(--md) 0', fontSize: '16px' }}>Class Overview — Current Positions</h3>
                      {quranPositions.length === 0 ? (
                        <p className="empty">No students found in this class.</p>
                      ) : (
                        <div className="table-wrap">
                          <table className="table">
                            <thead>
                              <tr>
                                <th>Student</th>
                                <th>Hifdh Position</th>
                                <th>Tilawah Position</th>
                                <th>Revision Position</th>
                                <th>Last Updated</th>
                              </tr>
                            </thead>
                            <tbody>
                              {quranPositions.map(s => (
                                <tr key={s.id}>
                                  <td style={{ fontWeight: '500' }}>{s.first_name} {s.last_name}</td>
                                  <td>
                                    {s.current_surah_name ? (
                                      <span>{s.current_surah_number}. {s.current_surah_name}{s.current_ayah ? ` (Ayah ${s.current_ayah})` : ''}</span>
                                    ) : (
                                      <span style={{ color: 'var(--muted)' }}>Not started</span>
                                    )}
                                  </td>
                                  <td>
                                    {s.tilawah_surah_name ? (
                                      <span>{s.tilawah_surah_number}. {s.tilawah_surah_name}{s.tilawah_ayah ? ` (Ayah ${s.tilawah_ayah})` : ''}</span>
                                    ) : (
                                      <span style={{ color: 'var(--muted)' }}>Not started</span>
                                    )}
                                  </td>
                                  <td>
                                    {s.revision_surah_name ? (
                                      <span>{s.revision_surah_number}. {s.revision_surah_name}{s.revision_ayah ? ` (Ayah ${s.revision_ayah})` : ''}</span>
                                    ) : (
                                      <span style={{ color: 'var(--muted)' }}>Not started</span>
                                    )}
                                  </td>
                                  <td>{s.last_updated ? fmtDate(s.last_updated) : '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* History Sub-tab */}
                  {quranSubTab === 'history' && (
                    <div className="card" style={{ padding: 'var(--md)' }}>
                      <h3 style={{ margin: '0 0 var(--md) 0', fontSize: '16px' }}>Progress History</h3>
                      {quranRecords.length === 0 ? (
                        <p className="empty">No records found for this semester.</p>
                      ) : (
                        <div className="table-wrap">
                          <table className="table">
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>Student</th>
                                <th>Type</th>
                                <th>Surah</th>
                                <th>Ayahs</th>
                                <th>Grade</th>
                                <th>Result</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {quranRecords.map(r => (
                                <tr key={r.id}>
                                  <td>{fmtDate(r.date)}</td>
                                  <td>{r.first_name} {r.last_name}</td>
                                  <td>
                                    <span className={`badge ${r.type === 'hifz' ? 'badge-success' : r.type === 'revision' ? 'badge-info' : 'badge-muted'}`}>
                                      {r.type === 'hifz' ? 'Hifdh' : r.type === 'revision' ? 'Revision' : 'Tilawah'}
                                    </span>
                                  </td>
                                  <td>{r.surah_number}. {r.surah_name}</td>
                                  <td>{r.ayah_from && r.ayah_to ? `${r.ayah_from}–${r.ayah_to}` : r.ayah_from ? `From ${r.ayah_from}` : '—'}</td>
                                  <td>
                                    <span className={`badge ${r.grade === 'Excellent' ? 'badge-success' : r.grade === 'Good' ? 'badge-info' : r.grade === 'Fair' ? 'badge-warning' : 'badge-danger'}`}>
                                      {r.grade}
                                    </span>
                                  </td>
                                  <td>
                                    <span style={{ color: r.passed ? '#16a34a' : '#dc2626', fontWeight: '600', fontSize: '13px' }}>
                                      {r.passed ? '✓ Pass' : '✕ Repeat'}
                                    </span>
                                  </td>
                                  <td>
                                    {!isReadOnly() && (
                                      <button className="btn btn-sm btn-danger" onClick={() => handleDeleteQuranRecord(r.id)}>✕</button>
                                    )}
                                  </td>
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--sm)' }}>
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
    </div>
  );
}

export default TeacherDashboard;
