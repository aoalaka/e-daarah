import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  CheckIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';
import UsageIndicator from '../../../components/UsageIndicator';
import '../Dashboard.css';

function OverviewSection({
  sessions,
  semesters,
  classes,
  students,
  teachers,
  madrasahProfile,
  hasPlusAccess,
  isReadOnly,
  fmtDate,
  setShowTour,
  setActiveTab,
  setReportSubTab,
  pendingAppCount,
  reportSemester,
  user,
}) {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const analyticsLoadedOnce = useRef(false);
  const [analyticsFilterClass, setAnalyticsFilterClass] = useState('');
  const [analyticsFilterGender, setAnalyticsFilterGender] = useState('');
  const [expandedMetric, setExpandedMetric] = useState(null); // 'attention' | 'struggling' | null
  const [upcomingUnavailable, setUpcomingUnavailable] = useState([]);

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

  // Fetch analytics when component mounts or dependencies change
  useEffect(() => {
    if (madrasahProfile) {
      fetchAnalytics();
      fetchUpcomingUnavailable();
    }
  }, [reportSemester, madrasahProfile]);

  return (
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
                  {upcomingUnavailable.length} unavailable in next 2 weeks
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
                    <button onClick={() => { setActiveTab('teachers'); }} style={{ fontSize: '13px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      View full availability →
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ padding: '20px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>All teachers are available this week</div>
                  <button onClick={() => { setActiveTab('teachers'); }} style={{ fontSize: '13px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '8px' }}>
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
            <div className="card" style={{ marginTop: 'var(--md)', cursor: 'pointer' }} onClick={() => { setActiveTab('students'); }}>
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
            <div className={`overview-action-card ${isReadOnly() ? 'disabled' : ''}`} onClick={() => { if (!isReadOnly()) { setActiveTab('planner'); } }}>
              <div className="overview-action-label">New Session</div>
              <div className="overview-action-desc">Create academic year</div>
            </div>
            <div className={`overview-action-card ${isReadOnly() ? 'disabled' : ''}`} onClick={() => { if (!isReadOnly()) { setActiveTab('classes'); } }}>
              <div className="overview-action-label">New Class</div>
              <div className="overview-action-desc">Add a class group</div>
            </div>
            <div className={`overview-action-card ${isReadOnly() ? 'disabled' : ''}`} onClick={() => { if (!isReadOnly()) { setActiveTab('students'); } }}>
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
            { title: 'Create a Session', desc: 'Set up your academic year or term.', done: sessions.length > 0, action: () => { setActiveTab('planner'); } },
            { title: 'Create a Class', desc: 'Add at least one class group.', done: classes.length > 0, action: () => { setActiveTab('classes'); } },
            { title: 'Add Students', desc: 'Enroll students individually or bulk upload.', done: students.length > 0, action: () => { setActiveTab('students'); } },
            ...(madrasahProfile?.enable_fee_tracking ? [{ title: 'Set Expected Fees', desc: 'Set how much each student is expected to pay.', done: students.some(s => s.expected_fee != null), action: () => { setActiveTab('fees'); } }] : []),
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
  );
}

export default OverviewSection;
