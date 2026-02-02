import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../services/api';
import './ParentReport.css';

function ParentReport() {
  const navigate = useNavigate();
  const { madrasahSlug } = useParams();
  const [student, setStudent] = useState(null);
  const [attendance, setAttendance] = useState({ records: [], totalDays: 0, presentDays: 0, attendanceRate: 0 });
  const [dressingBehavior, setDressingBehavior] = useState({ avgDressing: null, avgBehavior: null });
  const [exams, setExams] = useState([]);
  const [examsBySubject, setExamsBySubject] = useState({});
  const [classPosition, setClassPosition] = useState({ position: null, totalStudents: null });
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [loading, setLoading] = useState(true);

  // Helper function to get ordinal suffix for numbers (1st, 2nd, 3rd, etc.)
  const getOrdinalSuffix = (num) => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  };

  useEffect(() => {
    // Check if parent is logged in
    const token = localStorage.getItem('parentToken');
    console.log('Parent token from localStorage:', token ? `${token.substring(0, 20)}...` : 'None');
    
    if (!token) {
      console.log('No parent token found, redirecting to login');
      navigate(`/${madrasahSlug}/parent-login`);
      return;
    }
    
    // Set auth header for this specific request
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    console.log('Authorization header set:', api.defaults.headers.common['Authorization'] ? 'Yes' : 'No');
    
    fetchReport();
  }, [selectedSemester]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const url = selectedSemester
        ? `/auth/parent/report?semester_id=${selectedSemester}`
        : '/auth/parent/report';

      console.log('Fetching parent report:', url);
      const response = await api.get(url);
      console.log('Parent report response:', response.data);
      setStudent(response.data.student);
      setAttendance(response.data.attendance);
      setDressingBehavior(response.data.dressingBehavior || { avgDressing: null, avgBehavior: null });
      setExams(response.data.exams);
      setClassPosition(response.data.classPosition || { position: null, totalStudents: null });
      
      // Group exams by subject and calculate statistics
      const groupedExams = response.data.exams.reduce((acc, exam) => {
        const subject = exam.subject || 'Other';
        if (!acc[subject]) {
          acc[subject] = [];
        }
        acc[subject].push(exam);
        return acc;
      }, {});
      
      // Calculate statistics for each subject
      const examStats = {};
      Object.keys(groupedExams).forEach(subject => {
        const subjectExams = groupedExams[subject];
        const scores = subjectExams.filter(e => !e.is_absent && e.score != null).map(e => e.score);
        const avgScore = scores.length > 0 
          ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
          : null;
        const highestScore = scores.length > 0 ? Math.max(...scores) : null;
        const lowestScore = scores.length > 0 ? Math.min(...scores) : null;
        
        examStats[subject] = {
          exams: subjectExams,
          count: subjectExams.length,
          avgScore,
          highestScore,
          lowestScore
        };
      });
      
      setExamsBySubject(examStats);
      setSemesters(response.data.semesters || []);
    } catch (error) {
      console.error('Parent report error:', error);
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

  const getGradeClass = (grade) => {
    const classes = {
      'Excellent': 'excellent',
      'Good': 'good',
      'Fair': 'fair',
      'Poor': 'poor'
    };
    return classes[grade] || '';
  };

  const calculateGradeStats = (grades) => {
    const counts = grades.reduce((acc, grade) => {
      acc[grade] = (acc[grade] || 0) + 1;
      return acc;
    }, {});
    return counts;
  };

  if (loading) {
    return (
      <div className="parent-portal">
        <div className="parent-loading">Loading report...</div>
      </div>
    );
  }

  const dressingStats = calculateGradeStats(attendance.dressingGrades || []);
  const behaviorStats = calculateGradeStats(attendance.behaviorGrades || []);

  return (
    <div className="parent-portal">
      {/* Header */}
      <header className="parent-header">
        <h1>Student Report</h1>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </header>

      {/* Main Content */}
      <main className="parent-content">
        {/* Student Info */}
        <div className="student-card">
          <h2 className="student-name">{student?.first_name} {student?.last_name}</h2>
          <div className="student-meta">
            <div className="student-meta-item">
              <span>Student ID:</span>
              <span>{student?.student_id}</span>
            </div>
            <div className="student-meta-item">
              <span>Class:</span>
              <span>{student?.class_name || 'Not assigned'}</span>
            </div>
            <div className="student-meta-item">
              <span>Gender:</span>
              <span>{student?.gender}</span>
            </div>
            {classPosition.position && classPosition.totalStudents && (
              <div className="student-meta-item">
                <span>Class Position:</span>
                <span className="position-badge">
                  {classPosition.position}{getOrdinalSuffix(classPosition.position)} of {classPosition.totalStudents}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Semester Filter */}
        <div className="filter-card">
          <label htmlFor="semester">Filter by Semester</label>
          <select
            id="semester"
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
          >
            <option value="">All Semesters</option>
            {semesters.map(sem => (
              <option key={sem.id} value={sem.id}>
                {sem.session_name} - {sem.name} {sem.is_active ? '(Active)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Attendance Stats */}
        <div className="stats-row">
          <div className="stat-item">
            <div className="value">{attendance.totalDays}</div>
            <div className="label">Total Days</div>
          </div>
          <div className="stat-item">
            <div className="value success">{attendance.presentDays}</div>
            <div className="label">Present</div>
          </div>
          <div className="stat-item">
            <div className="value">
              {attendance.attendanceRate != null 
                ? `${attendance.attendanceRate}%` 
                : 'N/A'}
            </div>
            <div className="label">Rate</div>
          </div>
          <div className="stat-item">
            <div className="value danger">
              {attendance.totalDays != null && attendance.presentDays != null
                ? attendance.totalDays - attendance.presentDays
                : 0}
            </div>
            <div className="label">Absent</div>
          </div>
        </div>

        {/* Performance Metrics */}
        {(dressingBehavior.avgDressing !== null || dressingBehavior.avgBehavior !== null) && (
          <div className="stats-row" style={{ marginTop: '20px' }}>
            {dressingBehavior.avgDressing !== null && (
              <div className="stat-item">
                <div className="value" style={{ color: dressingBehavior.avgDressing >= 3 ? '#10b981' : dressingBehavior.avgDressing >= 2.5 ? '#f59e0b' : '#ef4444' }}>
                  {dressingBehavior.avgDressing.toFixed(2)}
                </div>
                <div className="label">Avg Dressing</div>
                <div className="label" style={{ fontSize: '10px', opacity: 0.7 }}>out of 4.0</div>
              </div>
            )}
            {dressingBehavior.avgBehavior !== null && (
              <div className="stat-item">
                <div className="value" style={{ color: dressingBehavior.avgBehavior >= 3 ? '#10b981' : dressingBehavior.avgBehavior >= 2.5 ? '#f59e0b' : '#ef4444' }}>
                  {dressingBehavior.avgBehavior.toFixed(2)}
                </div>
                <div className="label">Avg Behavior</div>
                <div className="label" style={{ fontSize: '10px', opacity: 0.7 }}>out of 4.0</div>
              </div>
            )}
          </div>
        )}

        {/* Dressing Performance */}
        <div className="report-section">
          <div className="section-header">Dressing</div>
          <div className="section-body">
            {Object.keys(dressingStats).length > 0 ? (
              <div className="grade-pills">
                {Object.entries(dressingStats).map(([grade, count]) => (
                  <div key={grade} className="grade-pill">
                    <span className={`grade-dot ${getGradeClass(grade)}`}></span>
                    <span className="grade-name">{grade}</span>
                    <span className="grade-count">{count} days</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No dressing grades recorded</p>
            )}
          </div>
        </div>

        {/* Behavior Performance */}
        <div className="report-section">
          <div className="section-header">Behavior</div>
          <div className="section-body">
            {Object.keys(behaviorStats).length > 0 ? (
              <div className="grade-pills">
                {Object.entries(behaviorStats).map(([grade, count]) => (
                  <div key={grade} className="grade-pill">
                    <span className={`grade-dot ${getGradeClass(grade)}`}></span>
                    <span className="grade-name">{grade}</span>
                    <span className="grade-count">{count} days</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No behavior grades recorded</p>
            )}
          </div>
        </div>

        {/* Exam Performance */}
        <div className="report-section">
          <div className="section-header">Exam Performance</div>
          <div className="section-body">
            {Object.keys(examsBySubject).length > 0 ? (
              <div className="exam-by-subject">
                {Object.entries(examsBySubject).map(([subject, data]) => (
                  <div key={subject} className="subject-exam-section">
                    <div className="subject-header">
                      <h4 className="subject-name">{subject}</h4>
                      <div className="subject-stats">
                        {data.avgScore && (
                          <span className="stat-badge">
                            Avg: <strong>{data.avgScore}</strong>
                          </span>
                        )}
                        {data.highestScore != null && (
                          <span className="stat-badge success">
                            High: <strong>{data.highestScore}</strong>
                          </span>
                        )}
                        {data.lowestScore != null && (
                          <span className="stat-badge">
                            Low: <strong>{data.lowestScore}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="exam-list">
                      {data.exams.map(exam => (
                        <div key={exam.id} className="exam-row">
                          <div className="exam-info">
                            <div className="exam-date">
                              {new Date(exam.exam_date).toLocaleDateString('en-NZ', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </div>
                            {exam.exam_type && (
                              <div className="exam-type-badge">{exam.exam_type}</div>
                            )}
                            {exam.notes && <div className="exam-notes">{exam.notes}</div>}
                          </div>
                          <div className="exam-score-section">
                            {exam.is_absent ? (
                              <span className="exam-absent">Absent</span>
                            ) : (
                              <>
                                <span className="exam-score">{exam.score}</span>
                                {exam.max_score && (
                                  <span className="exam-max-score">/ {exam.max_score}</span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No exam records</p>
            )}
          </div>
        </div>

        {/* Teacher Comments */}
        {student?.notes && (
          <div className="report-section">
            <div className="section-header">Teacher Comments</div>
            <div className="section-body">
              <div className="comment-box">{student.notes}</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default ParentReport;
