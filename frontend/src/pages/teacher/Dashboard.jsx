import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../../services/api';
import { authService } from '../../services/auth.service';
import SortableTable from '../../components/SortableTable';
import EmailVerificationBanner from '../../components/EmailVerificationBanner';
import '../admin/Dashboard.css';

function TeacherDashboard() {
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
  // Student Reports state
  const [studentReports, setStudentReports] = useState([]);
  const [reportFilterSession, setReportFilterSession] = useState('');
  const [reportFilterSemester, setReportFilterSemester] = useState('');
  const [reportFilteredSemesters, setReportFilteredSemesters] = useState([]);
  // Settings state
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const user = authService.getCurrentUser();
  const { madrasahSlug } = useParams();

  const navItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'exams', label: 'Exam Performance' },
    { id: 'reports', label: 'Student Reports' }
  ];

  // Close mobile menu when tab changes
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    fetchSessions();
    fetchClasses();
    fetchActiveSessionSemester();
  }, []);

  useEffect(() => {
    if (selectedClass && selectedSemester) {
      fetchStudents();
      fetchAttendance();
    }
  }, [selectedClass, selectedSemester, attendanceDate]);

  // Fetch exam performance when class, semester, or subject filter changes
  useEffect(() => {
    if (selectedClass && activeTab === 'exams') {
      fetchExamPerformance();
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
  }, [selectedClass, reportFilterSession, reportFilterSemester, activeTab]);

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

  const fetchClasses = async () => {
    try {
      const response = await api.get('/teacher/my-classes');
      setClasses(response.data);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
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

    // Validate that all present students have dressing and behavior grades
    const studentsWithIncompleteGrades = students.filter(student => {
      const record = attendanceRecords[student.id];
      const isPresent = record?.present === true;
      if (isPresent) {
        const hasDressing = record?.dressing_grade && record.dressing_grade !== '';
        const hasBehavior = record?.behavior_grade && record.behavior_grade !== '';
        return !hasDressing || !hasBehavior;
      }
      return false;
    });

    if (studentsWithIncompleteGrades.length > 0) {
      const firstInvalid = studentsWithIncompleteGrades[0];
      const record = attendanceRecords[firstInvalid.id];
      const missingFields = [];
      if (!record?.dressing_grade || record.dressing_grade === '') missingFields.push('Dressing');
      if (!record?.behavior_grade || record.behavior_grade === '') missingFields.push('Behavior');
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
    setEditingExamBatch({
      subject,
      exam_date: batch.exam_date,
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
      
      const response = await api.get(`/teacher/classes/${selectedClass.id}/student-reports`, { params });
      setStudentReports(response.data);
    } catch (error) {
      console.error('Failed to fetch student reports:', error);
      setStudentReports([]);
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
    authService.logout();
    navigate(`/${madrasahSlug}/login`);
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
      case 'attendance':
        return <svg {...iconProps}><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>;
      case 'exams':
        return <svg {...iconProps}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>;
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
        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={() => handleTabChange('settings')} style={{ cursor: 'pointer' }}>
            <div className="user-avatar">
              {user?.firstName?.charAt(0) || 'T'}
            </div>
            <div className="user-info">
              <div className="user-name">{user?.firstName} {user?.lastName}</div>
              <div className="user-role">Teacher {user?.staffId ? `• ${user.staffId}` : ''}</div>
            </div>
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{ opacity: 0.7 }}
            >
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6m-8-8h6m6 0h6"></path>
            </svg>
          </div>
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
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        </header>

        {/* Email Verification Banner */}
        <EmailVerificationBanner />

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
                  <div className="stat-value">{classes.length}</div>
                  <div className="stat-label">Assigned Classes</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{students.length}</div>
                  <div className="stat-label">Total Students</div>
                </div>
              </div>

              <h3 className="section-title">Your Classes</h3>
              {classes.length > 0 ? (
                <div className="quick-grid">
                  {classes.map(cls => (
                    <div
                      key={cls.id}
                      className="quick-card"
                      onClick={() => {
                        setSelectedClass(cls);
                        setActiveTab('attendance');
                      }}
                    >
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
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedClass && selectedSemester && students.length > 0 && (
                    <div className="card">
                      <div className="table-wrap">
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Student ID</th>
                              <th>Name</th>
                              <th style={{ minWidth: '140px' }}>Attendance</th>
                              <th>Absence Reason</th>
                              <th>Dressing</th>
                              <th>Behavior</th>
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

                      <div className="form-actions" style={{ padding: 'var(--md)', borderTop: 'var(--border)' }}>
                        <button onClick={saveAttendance} className="btn btn-primary" disabled={saving}>
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
                            render: (row) => new Date(row.date).toLocaleDateString()
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
                  <button onClick={openExamModal} className="btn btn-primary">
                    + Record Exam
                  </button>
                )}
              </div>

              <div className="card">
                <div className="card-body">
                  <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--md)' }}>
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
              {selectedClass && examKpis && examKpis.length > 0 && (
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

                      {/* Exam Batches - Grouped by Date/Semester */}
                      {kpi.examBatches && kpi.examBatches.map((batch, batchIndex) => (
                        <div key={batchIndex} className="card" style={{ marginBottom: 'var(--md)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--md)', padding: 'var(--sm)', backgroundColor: 'var(--gray-50)', borderRadius: 'var(--radius)' }}>
                            <div>
                              <strong style={{ fontSize: '15px' }}>
                                {new Date(batch.exam_date).toLocaleDateString()} - {batch.semester_name} (Max: {batch.max_score})
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
              )}

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
                        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 'var(--md)' }}>
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
                        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 'var(--md)' }}>
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
                            <div style={{ position: 'relative', width: '300px' }}>
                              <input
                                type="text"
                                className="form-input"
                                placeholder="Search by name or student ID..."
                                value={examStudentSearch}
                                onChange={(e) => setExamStudentSearch(e.target.value)}
                                style={{ paddingLeft: '32px' }}
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
                          <div style={{ overflowX: 'auto', maxHeight: '400px', border: 'var(--border)', borderRadius: 'var(--radius)' }}>
                            <table className="table" style={{ minWidth: '100%' }}>
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
                <h2 className="page-title">Student Reports</h2>
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
                  </div>
                </div>
              </div>

              {/* Student Reports Table */}
              {selectedClass && studentReports.length > 0 && (
                <div className="card">
                  <h3 style={{ marginBottom: 'var(--md)' }}>
                    Class Rankings - {selectedClass.name}
                  </h3>
                  <SortableTable
                    columns={[
                      {
                        key: 'rank',
                        label: 'Rank',
                        sortable: false,
                        render: (row, index) => (
                          <span style={{ 
                            fontWeight: '700', 
                            fontSize: '16px',
                            color: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : 'var(--text)'
                          }}>
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                          </span>
                        )
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
                        key: 'avg_percentage',
                        label: 'Average %',
                        sortable: true,
                        sortType: 'number',
                        render: (row) => (
                          <span style={{
                            fontWeight: '700',
                            fontSize: '18px',
                            color: row.avg_percentage >= 80 ? '#10b981' : 
                                   row.avg_percentage >= 70 ? '#22c55e' :
                                   row.avg_percentage >= 50 ? '#f59e0b' : 
                                   '#ef4444'
                          }}>
                            {row.avg_percentage}%
                          </span>
                        )
                      },
                      {
                        key: 'avg_score',
                        label: 'Avg Score',
                        sortable: true,
                        sortType: 'number',
                        render: (row) => <strong>{row.avg_score}</strong>
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
                          const percentage = parseFloat(row.avg_percentage);
                          if (percentage >= 80) {
                            return (
                              <span style={{
                                padding: '4px 10px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: '600',
                                backgroundColor: '#dcfce7',
                                color: '#166534'
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
                                backgroundColor: '#fef3c7',
                                color: '#92400e'
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
                                backgroundColor: '#fff7ed',
                                color: '#b86e00'
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
                                backgroundColor: '#fef2f2',
                                color: '#dc2626'
                              }}>
                                Needs Attention
                              </span>
                            );
                          }
                        }
                      }
                    ]}
                    data={studentReports}
                    defaultSort={{ key: 'avg_percentage', direction: 'desc' }}
                  />
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
                    <p>Please select a class to view student reports.</p>
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
                      <p style={{ margin: '4px 0 0 0' }}>{new Date(editingExamRecord.exam_date).toLocaleDateString()}</p>
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
                <div style={{ padding: 'var(--md)', backgroundColor: '#fff3cd', borderRadius: 'var(--radius)', marginBottom: 'var(--md)', border: '1px solid #ffc107' }}>
                  <p style={{ margin: 0, fontSize: '14px', color: '#856404' }}>
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
                <p style={{ margin: '0 0 8px 0' }}><strong>Date:</strong> {new Date(deleteExamBatch.exam_date).toLocaleDateString()}</p>
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
    </div>
  );
}

export default TeacherDashboard;
