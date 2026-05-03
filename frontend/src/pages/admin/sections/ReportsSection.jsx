import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  BookOpenIcon,
  UserIcon,
  CheckCircleIcon,
  StarIcon,
  ClockIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';
import SortableTable from '../../../components/SortableTable';
import { downloadCSV, attendanceColumns, getAttendanceColumns, examColumns, getDateSuffix } from '../../../utils/csvExport';
import '../Dashboard.css';

function ReportsSection({
  classes,
  sessions,
  semesters,
  students,
  teachers,
  madrasahProfile,
  hasPlusAccess,
  isReadOnly,
  fmtDate,
  setConfirmModal,
  reportSubTab,
  setReportSubTab,
  reportSemester,
  setReportSemester,
  reportFilterSession,
  setReportFilterSession,
  cohortPeriods = [],
}) {
  const schedulingMode = madrasahProfile?.scheduling_mode || 'academic';
  const isCohort = schedulingMode === 'cohort';

  // Reports-specific state
  const [reportFilterCohortPeriod, setReportFilterCohortPeriod] = useState('');
  const [selectedStudentForReport, setSelectedStudentForReport] = useState(null);
  const [studentReport, setStudentReport] = useState(null);
  const [classAttendance, setClassAttendance] = useState([]);
  const [classExams, setClassExams] = useState([]);
  const [classKpis, setClassKpis] = useState(null);
  const [attendanceDateFrom, setAttendanceDateFrom] = useState('');
  const [attendanceDateTo, setAttendanceDateTo] = useState('');
  const [selectedClassForPerformance, setSelectedClassForPerformance] = useState(null);
  const [examKpis, setExamKpis] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [currentSubjectPage, setCurrentSubjectPage] = useState(1);
  const subjectsPerPage = 1; // Show one subject at a time
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [reportFilteredSemesters, setReportFilteredSemesters] = useState([]);
  const [reportFilterSemester, setReportFilterSemester] = useState('');
  const [reportFilterSubject, setReportFilterSubject] = useState('all');
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [reportAvailableSubjects, setReportAvailableSubjects] = useState([]);
  const [studentReports, setStudentReports] = useState([]);
  const [rankingSubTab, setRankingSubTab] = useState('exam');
  const [attendanceRankings, setAttendanceRankings] = useState([]);
  const [dressingRankings, setDressingRankings] = useState([]);
  const [behaviorRankings, setBehaviorRankings] = useState([]);
  const [punctualityRankings, setPunctualityRankings] = useState([]);
  const [individualRankings, setIndividualRankings] = useState(null);
  // Teacher Activity state
  const [teacherPerformanceData, setTeacherPerformanceData] = useState(null);
  const [teacherPerformanceLoading, setTeacherPerformanceLoading] = useState(false);
  const [selectedTeacherForDetail, setSelectedTeacherForDetail] = useState(null);
  const [teacherDetailData, setTeacherDetailData] = useState(null);
  const [teacherDetailLoading, setTeacherDetailLoading] = useState(false);

  // Fee Report state
  const [feeReportData, setFeeReportData] = useState(null);
  const [feeReportLoading, setFeeReportLoading] = useState(false);
  const [feeReportClassFilter, setFeeReportClassFilter] = useState('');
  const [feeReportFamilyFilter, setFeeReportFamilyFilter] = useState('');

  // Courses Report state
  const [coursesList, setCoursesList] = useState([]);
  const [courseReportClassId, setCourseReportClassId] = useState('');
  const [courseReportCourseId, setCourseReportCourseId] = useState('');
  const [courseReportData, setCourseReportData] = useState(null);
  const [courseReportLoading, setCourseReportLoading] = useState(false);
  const [courseReportView, setCourseReportView] = useState('coverage'); // 'coverage' or 'matrix'
  const [matrixPage, setMatrixPage] = useState(1);
  const MATRIX_PAGE_SIZE = 10;

  const fetchCoursesList = async () => {
    try {
      const res = await api.get('/admin/courses');
      setCoursesList(res.data || []);
    } catch {
      toast.error('Failed to load courses');
    }
  };

  const fetchCourseReport = async (courseId, classId) => {
    if (!courseId || !classId) {
      setCourseReportData(null);
      return;
    }
    setCourseReportLoading(true);
    setMatrixPage(1);
    try {
      const res = await api.get(`/admin/courses/${courseId}/report?class_id=${classId}`);
      setCourseReportData(res.data);
    } catch {
      toast.error('Failed to load course report');
      setCourseReportData(null);
    } finally {
      setCourseReportLoading(false);
    }
  };

  const fetchFeeReport = async (classId) => {
    setFeeReportLoading(true);
    try {
      const params = new URLSearchParams();
      if (classId) params.append('class_id', classId);
      const res = await api.get(`/admin/fee-report/families?${params}`);
      setFeeReportData(res.data);
    } catch {
      toast.error('Failed to load fee report');
    } finally {
      setFeeReportLoading(false);
    }
  };

  // Initialize reportFilterSemester from active semester
  useEffect(() => {
    const activeSemester = semesters.find(s => s.is_active);
    if (activeSemester) {
      setReportFilterSemester(String(activeSemester.id));
    }
  }, [semesters]);

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
  }, [selectedClassForPerformance, reportFilterSession, reportFilterSemester, reportFilterCohortPeriod, reportFilterSubject, reportSubTab]);

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
  }, [selectedClassForPerformance, reportFilterSession, reportFilterSemester, reportFilterCohortPeriod, reportSubTab, rankingSubTab]);

  // Reset subject filter when class changes
  useEffect(() => {
    if (selectedClassForPerformance) {
      setSelectedSubject('all');
    }
  }, [selectedClassForPerformance]);

  // Fetch teacher performance when Teacher Activity sub-tab is selected
  useEffect(() => {
    if (reportSubTab === 'teacher-performance' && madrasahProfile && hasPlusAccess()) {
      fetchTeacherPerformance();
    }
  }, [reportSubTab, madrasahProfile]);

  // Re-fetch individual student report when filters or student changes
  useEffect(() => {
    if (reportSubTab === 'individual' && selectedStudentForReport?.id) {
      fetchStudentReport(selectedStudentForReport.id);
      fetchIndividualRankings(selectedStudentForReport.id);
    }
  }, [reportFilterSession, reportFilterSemester, reportFilterCohortPeriod, selectedStudentForReport?.id]);

  // --- Functions ---

  const fetchStudentReport = async (studentId) => {
    try {
      const params = {};
      if (isCohort) {
        if (reportFilterCohortPeriod) params.cohort_period_id = reportFilterCohortPeriod;
      } else {
        if (reportFilterSession) params.session_id = reportFilterSession;
        if (reportFilterSemester) params.semester_id = reportFilterSemester;
      }

      const response = await api.get(`/admin/students/${studentId}/report`, { params });
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
    } catch (error) {
      toast.error('Failed to update comment');
    }
  };

  const fetchClassAttendance = async (classId, dateFrom, dateTo) => {
    try {
      const params = new URLSearchParams();
      if (isCohort) {
        if (reportFilterCohortPeriod) params.append('cohort_period_id', reportFilterCohortPeriod);
      } else {
        if (reportSemester) params.append('semester_id', reportSemester);
      }
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
      const params = new URLSearchParams();
      if (isCohort) {
        if (reportFilterCohortPeriod) params.append('cohort_period_id', reportFilterCohortPeriod);
      } else {
        if (reportSemester) params.append('semester_id', reportSemester);
      }
      const qs = params.toString();
      const url = `/admin/classes/${classId}/exam-performance${qs ? `?${qs}` : ''}`;
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

      if (isCohort) {
        if (reportFilterCohortPeriod) params.cohortPeriodId = reportFilterCohortPeriod;
      } else {
        if (reportFilterSession) params.sessionId = reportFilterSession;
        if (reportFilterSemester) params.semesterId = reportFilterSemester;
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
      if (isCohort) {
        if (reportFilterCohortPeriod) params.cohortPeriodId = reportFilterCohortPeriod;
      } else {
        if (reportFilterSession) params.sessionId = reportFilterSession;
        if (reportFilterSemester) params.semesterId = reportFilterSemester;
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
      if (isCohort) {
        if (reportFilterCohortPeriod) params.cohortPeriodId = reportFilterCohortPeriod;
      } else {
        if (reportFilterSession) params.sessionId = reportFilterSession;
        if (reportFilterSemester) params.semesterId = reportFilterSemester;
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
      if (isCohort) {
        if (reportFilterCohortPeriod) params.cohortPeriodId = reportFilterCohortPeriod;
      } else {
        if (reportFilterSession) params.sessionId = reportFilterSession;
        if (reportFilterSemester) params.semesterId = reportFilterSemester;
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
      if (isCohort) {
        if (reportFilterCohortPeriod) params.cohortPeriodId = reportFilterCohortPeriod;
      } else {
        if (reportFilterSession) params.sessionId = reportFilterSession;
        if (reportFilterSemester) params.semesterId = reportFilterSemester;
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
      if (isCohort) {
        if (reportFilterCohortPeriod) params.cohortPeriodId = reportFilterCohortPeriod;
      } else {
        if (reportFilterSession) params.sessionId = reportFilterSession;
        if (reportFilterSemester) params.semesterId = reportFilterSemester;
      }
      const response = await api.get(`/admin/students/${studentId}/all-rankings`, { params });
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

  return (
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
                  {(madrasahProfile?.enable_fee_tracking !== 0 && madrasahProfile?.enable_fee_tracking !== false) && (
                    <button
                      onClick={() => { setReportSubTab('fee-report'); fetchFeeReport(); }}
                      className={`report-tab-btn ${reportSubTab === 'fee-report' ? 'active' : ''}`}
                    >
                      Fee Report
                    </button>
                  )}
                  {(madrasahProfile?.enable_learning_tracker !== 0 && madrasahProfile?.enable_learning_tracker !== false) && (
                    <button
                      onClick={() => { setReportSubTab('courses-report'); fetchCoursesList(); }}
                      className={`report-tab-btn ${reportSubTab === 'courses-report' ? 'active' : ''}`}
                    >
                      Courses
                    </button>
                  )}
                </nav>
              </div>

              {/* Filters */}
              <div className="card no-print">
                <div className="card-body">
                  <div className="form-grid">
                    {isCohort ? (
                      <div className="form-group">
                        <label className="form-label">Filter by Cohort Period</label>
                        <select
                          className="form-select"
                          value={reportFilterCohortPeriod}
                          onChange={(e) => setReportFilterCohortPeriod(e.target.value)}
                        >
                          <option value="">All Periods</option>
                          {cohortPeriods.map(period => (
                            <option key={period.id} value={period.id}>
                              {period.name} {period.is_active ? '(Active)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}
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
                      <img src="/e-daarah-whitebg-logo.png" alt="E-Daarah" className="footer-logo" loading="lazy" />
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

              {/* Fee Report Tab */}
              {reportSubTab === 'fee-report' && (
                <>
                  {/* Filters */}
                  <div className="card no-print" style={{ marginBottom: 'var(--md)' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <select
                        className="form-select"
                        style={{ maxWidth: '200px' }}
                        value={feeReportClassFilter}
                        onChange={e => {
                          setFeeReportClassFilter(e.target.value);
                          setFeeReportFamilyFilter('');
                          fetchFeeReport(e.target.value || undefined);
                        }}
                      >
                        <option value="">All classes</option>
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      {feeReportData?.families?.length > 0 && (
                        <select
                          className="form-select"
                          style={{ maxWidth: '240px' }}
                          value={feeReportFamilyFilter}
                          onChange={e => setFeeReportFamilyFilter(e.target.value)}
                        >
                          <option value="">All families</option>
                          {feeReportData.families.map((f, i) => {
                            const label = f.guardianName
                              ? `${f.guardianName}${f.children.length > 1 ? ` (${f.children.length} students)` : ` — ${f.children[0]?.studentName}`}`
                              : f.children.map(c => c.studentName).join(', ');
                            return <option key={i} value={i}>{label}</option>;
                          })}
                        </select>
                      )}
                      <button
                        className="btn btn-secondary"
                        style={{ marginLeft: 'auto' }}
                        onClick={() => window.print()}
                      >
                        <PrinterIcon width={14} height={14} style={{ marginRight: '6px' }} />
                        {feeReportFamilyFilter !== '' ? 'Print statement' : 'Print all'}
                      </button>
                    </div>
                  </div>

                  {feeReportLoading ? (
                    <div className="empty">Loading fee report…</div>
                  ) : !feeReportData ? (
                    <div className="empty">Select filters above to generate the report.</div>
                  ) : (() => {
                    const visibleFamilies = feeReportFamilyFilter !== ''
                      ? [feeReportData.families[parseInt(feeReportFamilyFilter)]].filter(Boolean)
                      : feeReportData.families;
                    const visibleTotal = visibleFamilies.reduce((s, f) => s + f.grandTotal, 0);
                    const visiblePaid = visibleFamilies.reduce((s, f) => s + f.grandPaid, 0);
                    const visibleBalance = visibleTotal - visiblePaid;
                    return (
                    <>
                      {/* Print-only header */}
                      <div className="print-only" style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid #000' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontSize: '20px', fontWeight: 700 }}>{madrasahProfile?.name || 'Madrasah'}</div>
                            <div style={{ fontSize: '13px', color: '#555', marginTop: '2px' }}>Fee Statement</div>
                            {feeReportFamilyFilter !== '' && visibleFamilies[0] && (
                              <div style={{ fontSize: '13px', marginTop: '6px' }}>
                                <span style={{ fontWeight: 600 }}>{visibleFamilies[0].guardianName || 'Parent / Guardian'}</span>
                                {visibleFamilies[0].guardianPhone && <span style={{ marginLeft: '8px', color: '#555' }}>{visibleFamilies[0].guardianPhone}</span>}
                              </div>
                            )}
                          </div>
                          <div style={{ textAlign: 'right', fontSize: '12px', color: '#555' }}>
                            <div>Printed: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                            <div style={{ marginTop: '4px', fontSize: '11px', color: '#999' }}>Powered by E-Daarah</div>
                          </div>
                        </div>
                      </div>

                      {/* Grand totals */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                        {[
                          { label: 'Total Expected', value: visibleTotal, cls: '' },
                          { label: 'Total Paid', value: visiblePaid, cls: 'fee-paid' },
                          { label: 'Outstanding', value: visibleBalance, cls: visibleBalance > 0 ? 'fee-unpaid' : 'fee-paid' },
                        ].map(({ label, value, cls }) => (
                          <div key={label} className="card" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>{label}</div>
                            <div className={`fee-grand-value ${cls}`} style={{ fontSize: '24px', fontWeight: 700 }}>
                              {feeReportData.currency} {value.toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>

                      {visibleFamilies.length === 0 ? (
                        <div className="empty">No fee data found.</div>
                      ) : visibleFamilies.map((family, fi) => (
                        <div key={fi} className="card" style={{ marginBottom: '16px', overflow: 'hidden', padding: 0, borderRadius: '8px' }}>
                          {/* Family header */}
                          <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                            <div>
                              <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                                {family.guardianName || 'Parent / Guardian'}
                              </span>
                              {family.guardianPhone && (
                                <span style={{ marginLeft: '10px', fontSize: '12px', color: 'var(--muted)' }}>{family.guardianPhone}</span>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                              <span style={{ color: 'var(--gray)' }}>Expected: <strong>{feeReportData.currency} {family.grandTotal.toFixed(2)}</strong></span>
                              <span style={{ color: 'var(--gray)' }}>Paid: <strong style={{ color: '#166534' }}>{feeReportData.currency} {family.grandPaid.toFixed(2)}</strong></span>
                              {family.grandBalance > 0 && (
                                <span style={{ color: '#dc2626', fontWeight: 600 }}>Outstanding: {feeReportData.currency} {family.grandBalance.toFixed(2)}</span>
                              )}
                            </div>
                          </div>

                          {/* Per-child sections */}
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {family.children.map((child, ci) => (
                                <div key={ci} style={{ borderTop: '1px solid var(--light)' }}>
                                  {/* Child name header */}
                                  <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '10px 16px',
                                  }}>
                                    <div>
                                      <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{child.studentName}</span>
                                      <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--muted)' }}>{child.className}</span>
                                    </div>
                                    <span className={`status-badge ${child.status === 'paid' ? 'active' : child.status === 'partial' ? 'warning' : child.status === 'unpaid' ? 'inactive' : ''}`}>
                                      {child.status === 'paid' ? 'Paid' : child.status === 'partial' ? 'Partial' : child.status === 'unpaid' ? 'Unpaid' : 'No fee set'}
                                    </span>
                                  </div>

                                  {/* Expected / Paid / Balance summary */}
                                  {child.totalOwed > 0 && (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: '1px solid var(--light)' }}>
                                      {[
                                        { label: 'Expected', val: `${feeReportData.currency} ${child.totalOwed.toFixed(2)}`, color: 'var(--text-primary)' },
                                        { label: 'Paid', val: `${feeReportData.currency} ${child.totalPaid.toFixed(2)}`, color: '#166534' },
                                        { label: 'Outstanding', val: `${feeReportData.currency} ${child.totalBalance.toFixed(2)}`, color: child.totalBalance > 0 ? '#c1121f' : '#166534' },
                                      ].map(({ label, val, color }, idx) => (
                                        <div key={label} style={{
                                          padding: '12px 16px',
                                          borderRight: idx < 2 ? '1px solid var(--light)' : 'none',
                                          textAlign: 'center',
                                        }}>
                                          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>{label}</div>
                                          <div style={{ fontSize: '14px', fontWeight: 700, color }}>{val}</div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Payments table */}
                                  {child.recentPayments.length > 0 && (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                      <thead>
                                        <tr style={{ background: 'var(--bg)' }}>
                                          {['Date', 'Period', 'Description', 'Amount', 'Method'].map(h => (
                                            <th key={h} style={{ padding: '7px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid var(--light)' }}>{h}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {child.recentPayments.map((p, pi) => (
                                          <tr key={pi} style={{ borderBottom: '1px solid var(--lighter)' }}>
                                            <td style={{ padding: '8px 16px' }}>{fmtDate(p.date)}</td>
                                            <td style={{ padding: '8px 16px', color: 'var(--gray)' }}>{p.period || '—'}</td>
                                            <td style={{ padding: '8px 16px', color: 'var(--gray)' }}>{p.label || '—'}</td>
                                            <td style={{ padding: '8px 16px', fontWeight: 600 }}>{feeReportData.currency} {p.amount.toFixed(2)}</td>
                                            <td style={{ padding: '8px 16px', color: 'var(--gray)', textTransform: 'capitalize' }}>{p.method?.replace('_', ' ') || '—'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}
                                </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      {/* Print-only footer */}
                      <div className="print-only" style={{ marginTop: '32px', paddingTop: '12px', borderTop: '1px solid #ccc', fontSize: '11px', color: '#999', textAlign: 'center' }}>
                        {madrasahProfile?.name || 'Madrasah'} &nbsp;·&nbsp; Powered by E-Daarah &nbsp;·&nbsp; E-Daarah.com
                      </div>
                    </>
                    );
                  })()}
                </>
              )}

              {reportSubTab === 'courses-report' && (
                <>
                  <div className="card no-print" style={{ marginBottom: 'var(--md)' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <select
                        className="form-select"
                        value={courseReportClassId}
                        onChange={e => {
                          const cid = e.target.value;
                          setCourseReportClassId(cid);
                          setCourseReportCourseId('');
                          setCourseReportData(null);
                        }}
                        style={{ maxWidth: '240px' }}
                      >
                        <option value="">Select class…</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>

                      <select
                        className="form-select"
                        value={courseReportCourseId}
                        onChange={e => {
                          const courseId = e.target.value;
                          setCourseReportCourseId(courseId);
                          fetchCourseReport(courseId, courseReportClassId);
                        }}
                        disabled={!courseReportClassId}
                        style={{ maxWidth: '240px' }}
                      >
                        <option value="">Select course…</option>
                        {coursesList
                          .filter(c => !courseReportClassId || (c.class_ids || []).includes(parseInt(courseReportClassId)))
                          .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>

                      {courseReportData && (
                        <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
                          <button
                            className={`btn btn-sm ${courseReportView === 'coverage' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setCourseReportView('coverage')}
                          >Unit coverage</button>
                          <button
                            className={`btn btn-sm ${courseReportView === 'matrix' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setCourseReportView('matrix')}
                          >Student matrix</button>
                        </div>
                      )}
                    </div>
                  </div>

                  {courseReportLoading ? (
                    <div className="empty">Loading course report…</div>
                  ) : !courseReportData ? (
                    <div className="empty">Select a class and course to generate the report.</div>
                  ) : (
                    <>
                      {/* Class current position banner */}
                      {courseReportData.class_current_unit && (
                        <div className="card" style={{ marginBottom: 16, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, borderLeft: `4px solid ${courseReportData.course.colour || '#0d9488'}` }}>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Class current unit</div>
                            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginTop: 2 }}>
                              {courseReportData.class_current_unit.display_order}. {courseReportData.class_current_unit.title}
                            </div>
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                            {courseReportData.class_current_unit.display_order} of {courseReportData.units.length} units
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                        <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Students</div>
                          <div style={{ fontSize: '22px', fontWeight: 700 }}>{courseReportData.total_students}</div>
                        </div>
                        <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Units</div>
                          <div style={{ fontSize: '22px', fontWeight: 700 }}>{courseReportData.units.length}</div>
                        </div>
                        <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Units taught</div>
                          <div style={{ fontSize: '22px', fontWeight: 700, color: '#166534' }}>
                            {courseReportData.unit_stats.filter(u => u.was_taught || u.total_records > 0).length}
                          </div>
                        </div>
                      </div>

                      {courseReportView === 'coverage' ? (
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                          <div className="card-header">Unit coverage</div>
                          <div>
                            {courseReportData.unit_stats.length === 0 ? (
                              <div className="empty" style={{ padding: '24px' }}>No units in this course.</div>
                            ) : courseReportData.unit_stats.map((u, idx) => (
                              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderTop: idx === 0 ? 'none' : '1px solid var(--light)' }}>
                                <div style={{ flexShrink: 0, width: 28, height: 28, borderRadius: '50%', background: 'var(--lighter)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 }}>{idx + 1}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 600, fontSize: 14 }}>{u.title}</div>
                                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                                    {u.last_recorded_date
                                      ? `Last recorded ${fmtDate ? fmtDate(u.last_recorded_date) : u.last_recorded_date.slice(0,10)}${u.last_recorded_by ? ` by ${u.last_recorded_by}` : ''}`
                                      : 'Not yet taught'}
                                  </div>
                                </div>
                                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                                  <div style={{ fontWeight: 700, fontSize: 14, color: u.coverage_pct === 100 ? '#166534' : u.coverage_pct === 0 ? '#9ca3af' : '#b86e00' }}>
                                    {u.students_recorded} / {courseReportData.total_students}
                                  </div>
                                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{u.coverage_pct}% covered</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (() => {
                        const matrix = courseReportData.student_matrix;
                        const totalPages = Math.max(1, Math.ceil(matrix.length / MATRIX_PAGE_SIZE));
                        const page = Math.min(matrixPage, totalPages);
                        const pageRows = matrix.slice((page - 1) * MATRIX_PAGE_SIZE, page * MATRIX_PAGE_SIZE);
                        return (
                          <div className="card" style={{ padding: 0 }}>
                            <div className="card-header">Student progress matrix</div>
                            {matrix.length === 0 ? (
                              <div className="empty" style={{ padding: '24px' }}>No students in this class.</div>
                            ) : (
                              <>
                                <div style={{ overflow: 'auto' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                    <thead>
                                      <tr style={{ background: 'var(--bg)' }}>
                                        <th style={{ position: 'sticky', left: 0, background: 'var(--bg)', padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--light)', minWidth: 140 }}>Student</th>
                                        {courseReportData.units.map((u, idx) => (
                                          <th key={u.id} title={u.title} style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--light)', minWidth: 36 }}>{idx + 1}</th>
                                        ))}
                                        <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--light)' }}>Passed</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {pageRows.map(s => (
                                        <tr key={s.id}>
                                          <td style={{ position: 'sticky', left: 0, background: '#fff', padding: '8px 12px', fontWeight: 500, borderBottom: '1px solid var(--lighter)' }}>{s.first_name} {s.last_name}</td>
                                          {courseReportData.units.map(u => {
                                            const passed = s.passed_unit_ids.includes(u.id);
                                            return (
                                              <td key={u.id} style={{ padding: '6px', textAlign: 'center', borderBottom: '1px solid var(--lighter)' }}>
                                                {passed
                                                  ? <span style={{ color: '#166534', fontSize: 14 }}>✓</span>
                                                  : <span style={{ color: '#cbd5e1', fontSize: 14 }}>—</span>}
                                              </td>
                                            );
                                          })}
                                          <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: s.passed_count === courseReportData.units.length ? '#166534' : 'var(--text-primary)', borderBottom: '1px solid var(--lighter)' }}>
                                            {s.passed_count} / {courseReportData.units.length}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                                {totalPages > 1 && (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '12px 16px', borderTop: '1px solid var(--light)', fontSize: 13 }}>
                                    <button className="btn btn-sm btn-secondary" disabled={page === 1} onClick={() => setMatrixPage(page - 1)}>Prev</button>
                                    <span style={{ color: 'var(--muted)' }}>Showing {(page - 1) * MATRIX_PAGE_SIZE + 1}–{Math.min(page * MATRIX_PAGE_SIZE, matrix.length)} of {matrix.length}</span>
                                    <button className="btn btn-sm btn-secondary" disabled={page === totalPages} onClick={() => setMatrixPage(page + 1)}>Next</button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })()}
                    </>
                  )}
                </>
              )}

            </>
  );
}

export default ReportsSection;
