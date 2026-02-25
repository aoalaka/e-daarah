import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../services/api';
import './ParentReport.css';

function ParentReport() {
  const fmtDate = (d) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const navigate = useNavigate();
  const { madrasahSlug } = useParams();
  const [student, setStudent] = useState(null);
  const [madrasah, setMadrasah] = useState({});
  const [attendance, setAttendance] = useState({ records: [], totalDays: 0, presentDays: 0, attendanceRate: 0 });
  const [dressingBehavior, setDressingBehavior] = useState({ avgDressing: null, avgBehavior: null, avgPunctuality: null });
  const [exams, setExams] = useState([]);
  const [examsBySubject, setExamsBySubject] = useState({});
  const [rankings, setRankings] = useState({ attendance: {}, exam: {}, dressing: {}, behavior: {}, punctuality: {} });
  const [sessions, setSessions] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [filteredSemesters, setFilteredSemesters] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [loading, setLoading] = useState(true);
  const [quranProgress, setQuranProgress] = useState([]);
  const [quranPosition, setQuranPosition] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('parentToken');
    if (!token) {
      navigate(`/${madrasahSlug}/parent-login`);
      return;
    }
    fetchReport();
  }, [selectedSession, selectedSemester]);

  // Filter semesters when session changes
  useEffect(() => {
    if (selectedSession) {
      const filtered = semesters.filter(s => s.session_id === parseInt(selectedSession));
      setFilteredSemesters(filtered);
      if (selectedSemester && !filtered.find(s => s.id === parseInt(selectedSemester))) {
        setSelectedSemester('');
      }
    } else {
      setFilteredSemesters(semesters);
    }
  }, [selectedSession, semesters]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedSemester) params.append('semester_id', selectedSemester);
      else if (selectedSession) params.append('session_id', selectedSession);

      const url = params.toString() ? `/auth/parent/report?${params}` : '/auth/parent/report';
      const response = await api.get(url);
      const data = response.data;

      setStudent(data.student);
      setMadrasah(data.madrasah || {});
      setAttendance(data.attendance);
      setDressingBehavior(data.dressingBehavior || { avgDressing: null, avgBehavior: null, avgPunctuality: null });
      setExams(data.exams);
      setRankings(data.rankings || { attendance: {}, exam: {}, dressing: {}, behavior: {}, punctuality: {} });
      setSessions(data.sessions || []);
      setSemesters(data.semesters || []);
      setQuranProgress(data.quranProgress || []);
      setQuranPosition(data.quranPosition || null);

      // Group exams by subject with stats
      const grouped = data.exams.reduce((acc, exam) => {
        const subject = exam.subject || 'Other';
        if (!acc[subject]) acc[subject] = [];
        acc[subject].push(exam);
        return acc;
      }, {});

      const examStats = {};
      Object.keys(grouped).forEach(subject => {
        const subjectExams = grouped[subject];
        const scores = subjectExams
          .filter(e => !e.is_absent && e.score != null)
          .map(e => (e.score / e.max_score) * 100);
        examStats[subject] = {
          exams: subjectExams,
          count: subjectExams.length,
          avgScore: scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null,
          highestScore: scores.length > 0 ? Math.max(...scores).toFixed(1) : null,
          lowestScore: scores.length > 0 ? Math.min(...scores).toFixed(1) : null,
        };
      });
      setExamsBySubject(examStats);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to load report');
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('parentToken');
        localStorage.removeItem('parentStudent');
        navigate(`/${madrasahSlug}/parent-login`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('parentToken');
    localStorage.removeItem('parentStudent');
    delete api.defaults.headers.common['Authorization'];
    navigate(`/${madrasahSlug}/parent-login`);
  };

  const getGradeLabel = (avg) => {
    if (avg >= 3.5) return 'Excellent';
    if (avg >= 2.5) return 'Good';
    if (avg >= 1.5) return 'Fair';
    return 'Needs Improvement';
  };

  const getStatColor = (value, thresholds = { high: 90, mid: 80 }) => {
    if (value >= thresholds.high) return '#404040';
    if (value >= thresholds.mid) return '#525252';
    return '#737373';
  };

  const getGradeColor = (avg) => {
    if (avg >= 3.5) return '#404040';
    if (avg >= 2.5) return '#525252';
    return '#737373';
  };

  if (loading) {
    return (
      <div className="parent-portal">
        <div className="parent-loading">Loading report...</div>
      </div>
    );
  }

  const filterLabel = () => {
    const sessionName = selectedSession && sessions.find(s => s.id === parseInt(selectedSession))?.name;
    const semesterName = selectedSemester && semesters.find(s => s.id === parseInt(selectedSemester))?.name;
    if (sessionName && semesterName) return `${sessionName} — ${semesterName}`;
    if (sessionName) return sessionName;
    return 'All Sessions';
  };

  return (
    <div className="parent-portal">
      {/* Header */}
      <header className="parent-header no-print">
        <h1>Student Report</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      {/* Main Content */}
      <main className="parent-content">
        {/* Report Card */}
        <div className="report-card">
          {/* Print Header */}
          <div className="print-header">
            {madrasah?.logo_url && (
              <img src={madrasah.logo_url} alt="" className="print-logo" />
            )}
            <h1 className="madrasah-name">{madrasah?.name || 'Madrasah'}</h1>
            <div className="report-subtitle">Student Performance Report</div>
          </div>

          {/* Report Card Header */}
          <div className="report-card-header no-print-border">
            <div className="report-card-title">
              <h2>Student Performance Report</h2>
              <div className="report-period">{filterLabel()}</div>
            </div>
            <button
              className="print-btn no-print"
              onClick={() => window.print()}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              Print
            </button>
          </div>

          {/* Filters */}
          <div className="report-filters no-print">
            <div className="filter-group">
              <label>Session</label>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
              >
                <option value="">All Sessions</option>
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.is_active ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Semester</label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
              >
                <option value="">All Semesters</option>
                {filteredSemesters.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.is_active ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Student Info Grid */}
          <div className="student-info-section">
            <div className="student-info-grid">
              <div className="info-item">
                <div className="info-label">Student Name</div>
                <div className="info-value">{student?.first_name} {student?.last_name}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Student ID</div>
                <div className="info-value">{student?.student_id}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Class</div>
                <div className="info-value">{student?.class_name || 'Not assigned'}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Report Date</div>
                <div className="info-value">{fmtDate(new Date())}</div>
              </div>
            </div>
          </div>

          {/* Performance Summary Grid - 4 Cards */}
          <div className="performance-grid">
            {/* Attendance Card */}
            <div className="perf-card">
              <div className="perf-card-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span>Attendance</span>
              </div>
              <div className="perf-card-body">
                {attendance.totalDays > 0 ? (
                  <>
                    <div className="perf-main">
                      <div className="perf-number" style={{ color: getStatColor(parseFloat(attendance.attendanceRate)) }}>
                        {attendance.attendanceRate}%
                      </div>
                      <div className="perf-label">Attendance Rate</div>
                    </div>
                    <div className="perf-details">
                      <div className="perf-row">
                        <span>Present:</span>
                        <strong style={{ color: '#404040' }}>{attendance.presentDays} days</strong>
                      </div>
                      <div className="perf-row">
                        <span>Absent:</span>
                        <strong style={{ color: '#0a0a0a' }}>{attendance.totalDays - attendance.presentDays} days</strong>
                      </div>
                      <div className="perf-row">
                        <span>Total Days:</span>
                        <strong>{attendance.totalDays}</strong>
                      </div>
                    </div>
                    {rankings.attendance?.rank && (
                      <div className="perf-rank">
                        Rank #{rankings.attendance.rank} of {rankings.attendance.total_students}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="perf-empty">No attendance records yet</div>
                )}
              </div>
            </div>

            {/* Exam Performance Card */}
            <div className="perf-card">
              <div className="perf-card-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
                <span>Exam Performance</span>
              </div>
              <div className="perf-card-body">
                {rankings.exam?.rank ? (
                  <>
                    <div className="perf-main">
                      <div className="perf-number" style={{ color: getStatColor(rankings.exam.percentage, { high: 80, mid: 70 }) }}>
                        {rankings.exam.percentage}%
                      </div>
                      <div className="perf-label">Overall Score</div>
                    </div>
                    <div className="perf-details">
                      <div className="perf-row">
                        <span>Exams Taken:</span>
                        <strong>{exams.filter(e => !e.is_absent).length}</strong>
                      </div>
                      <div className="perf-row">
                        <span>Exams Missed:</span>
                        <strong style={{ color: '#0a0a0a' }}>{exams.filter(e => e.is_absent).length}</strong>
                      </div>
                      <div className="perf-row">
                        <span>Total Exams:</span>
                        <strong>{exams.length}</strong>
                      </div>
                    </div>
                    <div className="perf-rank">
                      Rank #{rankings.exam.rank} of {rankings.exam.total_students}
                    </div>
                  </>
                ) : (
                  <div className="perf-empty">No exam records yet</div>
                )}
              </div>
            </div>

            {/* Dressing Standards Card */}
            {(madrasah?.enable_dressing_grade !== 0 && madrasah?.enable_dressing_grade !== false) && (
            <div className="perf-card">
              <div className="perf-card-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <span>Dressing Standards</span>
              </div>
              <div className="perf-card-body">
                {dressingBehavior.avgDressing !== null ? (
                  <>
                    <div className="perf-main">
                      <div className="perf-number" style={{ color: getGradeColor(dressingBehavior.avgDressing) }}>
                        {dressingBehavior.avgDressing.toFixed(1)}
                      </div>
                      <div className="perf-label">Average Grade (out of 4.0)</div>
                    </div>
                    <div className="perf-details">
                      <div className="perf-row">
                        <span>Grade:</span>
                        <strong>{getGradeLabel(dressingBehavior.avgDressing)}</strong>
                      </div>
                    </div>
                    {rankings.dressing?.rank && (
                      <div className="perf-rank">
                        Rank #{rankings.dressing.rank} of {rankings.dressing.total_students}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="perf-empty">No dressing records yet</div>
                )}
              </div>
            </div>
            )}

            {/* Behavior & Conduct Card */}
            {(madrasah?.enable_behavior_grade !== 0 && madrasah?.enable_behavior_grade !== false) && (
            <div className="perf-card">
              <div className="perf-card-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                <span>Behavior & Conduct</span>
              </div>
              <div className="perf-card-body">
                {dressingBehavior.avgBehavior !== null ? (
                  <>
                    <div className="perf-main">
                      <div className="perf-number" style={{ color: getGradeColor(dressingBehavior.avgBehavior) }}>
                        {dressingBehavior.avgBehavior.toFixed(1)}
                      </div>
                      <div className="perf-label">Average Grade (out of 4.0)</div>
                    </div>
                    <div className="perf-details">
                      <div className="perf-row">
                        <span>Grade:</span>
                        <strong>{getGradeLabel(dressingBehavior.avgBehavior)}</strong>
                      </div>
                    </div>
                    {rankings.behavior?.rank && (
                      <div className="perf-rank">
                        Rank #{rankings.behavior.rank} of {rankings.behavior.total_students}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="perf-empty">No behavior records yet</div>
                )}
              </div>
            </div>
            )}

            {/* Punctuality Card */}
            {(madrasah?.enable_punctuality_grade !== 0 && madrasah?.enable_punctuality_grade !== false) && (
            <div className="perf-card">
              <div className="perf-card-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>Punctuality</span>
              </div>
              <div className="perf-card-body">
                {dressingBehavior.avgPunctuality !== null ? (
                  <>
                    <div className="perf-main">
                      <div className="perf-number" style={{ color: getGradeColor(dressingBehavior.avgPunctuality) }}>
                        {dressingBehavior.avgPunctuality.toFixed(1)}
                      </div>
                      <div className="perf-label">Average Grade (out of 4.0)</div>
                    </div>
                    <div className="perf-details">
                      <div className="perf-row">
                        <span>Grade:</span>
                        <strong>{getGradeLabel(dressingBehavior.avgPunctuality)}</strong>
                      </div>
                    </div>
                    {rankings.punctuality?.rank && (
                      <div className="perf-rank">
                        Rank #{rankings.punctuality.rank} of {rankings.punctuality.total_students}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="perf-empty">No punctuality records yet</div>
                )}
              </div>
            </div>
            )}
          </div>

          {/* Detailed Exam Scores by Subject */}
          {Object.keys(examsBySubject).length > 0 && (
            <div className="exam-detail-section">
              <h3 className="section-title">Exam Scores by Subject</h3>
              <div className="exam-subjects">
                {Object.entries(examsBySubject).map(([subject, data]) => (
                  <div key={subject} className="subject-block">
                    <div className="subject-header">
                      <h4 className="subject-name">{subject}</h4>
                      <div className="subject-stats">
                        {data.avgScore && (
                          <span className="stat-badge">Avg: <strong>{data.avgScore}%</strong></span>
                        )}
                        {data.highestScore != null && (
                          <span className="stat-badge success">High: <strong>{data.highestScore}%</strong></span>
                        )}
                        {data.lowestScore != null && (
                          <span className="stat-badge">Low: <strong>{data.lowestScore}%</strong></span>
                        )}
                      </div>
                    </div>
                    <div className="exam-table">
                      <div className="exam-table-header">
                        <span>Date</span>
                        <span>Type</span>
                        <span>Score</span>
                        <span>%</span>
                      </div>
                      {data.exams.map(exam => (
                        <div key={exam.id} className="exam-table-row">
                          <span className="exam-date">
                            {new Date(exam.exam_date).toLocaleDateString('en-NZ', {
                              year: 'numeric', month: 'short', day: 'numeric'
                            })}
                          </span>
                          <span className="exam-type">{exam.exam_type || '—'}</span>
                          {exam.is_absent ? (
                            <>
                              <span className="exam-absent-tag">Absent</span>
                              <span>—</span>
                            </>
                          ) : (
                            <>
                              <span className="exam-score-cell">
                                {exam.score}<span className="score-max">/{exam.max_score}</span>
                              </span>
                              <span className="exam-pct" style={{
                                color: ((exam.score / exam.max_score) * 100) >= 70 ? '#404040' :
                                       ((exam.score / exam.max_score) * 100) >= 50 ? '#737373' : '#0a0a0a'
                              }}>
                                {((exam.score / exam.max_score) * 100).toFixed(1)}%
                              </span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Qur'an Progress */}
          {(quranProgress.length > 0 || quranPosition) && (
            <div className="exam-scores-section">
              <h3>Qur'an Progress</h3>

              {quranPosition && (
                <div className="performance-grid" style={{ marginBottom: 'var(--md)' }}>
                  <div className="performance-card">
                    <div className="perf-label">Current Surah</div>
                    <div className="perf-value">{quranPosition.current_surah_number}. {quranPosition.current_surah_name}</div>
                  </div>
                  <div className="performance-card">
                    <div className="perf-label">Current Juz</div>
                    <div className="perf-value">{quranPosition.current_juz || '—'}</div>
                  </div>
                </div>
              )}

              {quranProgress.length > 0 && (
                <div className="subject-block">
                  <table className="subject-exam-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Surah</th>
                        <th>Ayahs</th>
                        <th>Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quranProgress.map(r => (
                        <tr key={r.id}>
                          <td>{fmtDate(r.date)}</td>
                          <td>{r.type === 'hifz' || r.type === 'memorization_new' ? 'Hifdh' : r.type === 'revision' || r.type === 'memorization_revision' ? 'Revision' : 'Tilawah'}</td>
                          <td>{r.surah_number}. {r.surah_name}</td>
                          <td>{r.ayah_from && r.ayah_to ? `${r.ayah_from}–${r.ayah_to}` : '—'}</td>
                          <td>
                            <span className={`grade-badge ${r.grade === 'Excellent' ? 'excellent' : r.grade === 'Good' ? 'good' : r.grade === 'Fair' ? 'fair' : 'poor'}`}>
                              {r.grade}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* School Overall Comment */}
          {student?.notes && (
            <div className="overall-comment">
              <h3>School Overall Comment</h3>
              <div className="comment-display">{student.notes}</div>
            </div>
          )}

          {/* Report Footer */}
          <div className="report-footer">
            <div className="powered-by">
              <img src="/e-daarah-whitebg-logo.png" alt="e-Daarah" className="footer-logo" />
            </div>
          </div>
        </div>
      </main>

    </div>
  );
}

export default ParentReport;
