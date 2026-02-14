import { useState, useEffect, Component } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../../services/api';
import './SuperAdmin.css';

// Check if we're on the admin subdomain
const isAdminSubdomain = () => window.location.hostname.startsWith('admin.');
const getBasePath = () => isAdminSubdomain() ? '' : '/superadmin';

// Error boundary to prevent white screen crashes
class DashboardErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('Dashboard crash:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h2>Something went wrong</h2>
          <p style={{ color: '#666', margin: '12px 0' }}>{this.state.error?.message}</p>
          <button onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            style={{ padding: '10px 20px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Safe JSON parse helper
const safeParseJSON = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
};

function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('madrasahs');
  const [stats, setStats] = useState(null);
  const [madrasahs, setMadrasahs] = useState([]);
  const [recentRegistrations, setRecentRegistrations] = useState([]);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [engagement, setEngagement] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', plan: '', search: '' });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [securityPage, setSecurityPage] = useState(1);
  const [securityPagination, setSecurityPagination] = useState(null);
  const [churnRisks, setChurnRisks] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [ticketOpenCount, setTicketOpenCount] = useState(0);
  const [ticketFilter, setTicketFilter] = useState('open');
  const [announcementForm, setAnnouncementForm] = useState({ title: '', message: '', type: 'info', target_plans: [], expires_at: '' });
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [ticketReply, setTicketReply] = useState('');
  // Email broadcast state
  const [emailBroadcastForm, setEmailBroadcastForm] = useState({ subject: '', message: '', emails: '', testEmail: '' });
  const [emailBroadcasts, setEmailBroadcasts] = useState([]);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [emailSending, setEmailSending] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const superAdmin = JSON.parse(localStorage.getItem('superAdmin') || '{}');

  useEffect(() => {
    const token = localStorage.getItem('superAdminToken');
    if (!token) {
      navigate(`${getBasePath()}/login`);
      return;
    }
    fetchDashboard();
    fetchMadrasahs();
    fetchRecentRegistrations();
    fetchEngagement();
    fetchRevenue();
    fetchChurnRisks();
    fetchAnnouncements();
    fetchTickets();
  }, []);

  useEffect(() => {
    fetchMadrasahs();
  }, [filter, page]);

  useEffect(() => {
    if (activeTab === 'security') {
      fetchSecurityEvents();
    }
  }, [activeTab, securityPage]);

  useEffect(() => {
    if (activeTab === 'tickets') {
      fetchTickets();
    }
  }, [ticketFilter]);

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('superAdminToken')}` }
  });

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/superadmin/dashboard', getAuthHeader());
      setStats(response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        handleLogout();
      }
    }
  };

  const fetchMadrasahs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.plan) params.append('plan', filter.plan);
      if (filter.search) params.append('search', filter.search);
      params.append('page', page);

      const response = await api.get(`/superadmin/madrasahs?${params}`, getAuthHeader());
      setMadrasahs(response.data.madrasahs);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to fetch madrasahs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentRegistrations = async () => {
    try {
      const response = await api.get('/superadmin/registrations/recent?days=14', getAuthHeader());
      setRecentRegistrations(response.data.registrations || []);
    } catch (error) {
      console.error('Failed to fetch recent registrations:', error);
    }
  };

  const fetchSecurityEvents = async () => {
    try {
      const response = await api.get(`/superadmin/security-events?page=${securityPage}`, getAuthHeader());
      setSecurityEvents(response.data.events || []);
      setSecurityPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to fetch security events:', error);
    }
  };

  const fetchEngagement = async () => {
    try {
      const response = await api.get('/superadmin/engagement', getAuthHeader());
      setEngagement(response.data);
    } catch (error) {
      console.error('Failed to fetch engagement:', error);
    }
  };

  const fetchRevenue = async () => {
    try {
      const response = await api.get('/superadmin/revenue', getAuthHeader());
      setRevenue(response.data);
    } catch (error) {
      console.error('Failed to fetch revenue:', error);
    }
  };

  const fetchChurnRisks = async () => {
    try {
      const response = await api.get('/superadmin/churn-risks', getAuthHeader());
      setChurnRisks(response.data.atRisk || []);
    } catch (error) {
      console.error('Failed to fetch churn risks:', error);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const response = await api.get('/superadmin/announcements', getAuthHeader());
      setAnnouncements(response.data.announcements || []);
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    }
  };

  const fetchEmailBroadcasts = async () => {
    try {
      const response = await api.get('/superadmin/email-broadcasts', getAuthHeader());
      setEmailBroadcasts(response.data || []);
    } catch (error) {
      console.error('Failed to fetch email broadcasts:', error);
    }
  };

  const fetchEmailTemplates = async () => {
    try {
      const response = await api.get('/superadmin/email-templates', getAuthHeader());
      setEmailTemplates(response.data || []);
    } catch (error) {
      console.error('Failed to fetch email templates:', error);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !emailBroadcastForm.subject || !emailBroadcastForm.message) {
      toast.error('Template name, subject, and message are required'); return;
    }
    try {
      await api.post('/superadmin/email-templates', {
        name: templateName.trim(),
        subject: emailBroadcastForm.subject,
        message: emailBroadcastForm.message
      }, getAuthHeader());
      toast.success(`Template "${templateName.trim()}" saved`);
      setTemplateName('');
      fetchEmailTemplates();
    } catch (error) {
      toast.error('Failed to save template');
    }
  };

  const handleLoadTemplate = (template) => {
    setEmailBroadcastForm({ ...emailBroadcastForm, subject: template.subject, message: template.message });
  };

  const handleDeleteTemplate = async (id) => {
    if (!confirm('Delete this template?')) return;
    try {
      await api.delete(`/superadmin/email-templates/${id}`, getAuthHeader());
      fetchEmailTemplates();
    } catch (error) {
      alert('Failed to delete template');
    }
  };

  const fetchTickets = async () => {
    try {
      const response = await api.get(`/superadmin/tickets?status=${ticketFilter}`, getAuthHeader());
      setTickets(response.data.tickets || []);
      setTicketOpenCount(response.data.openCount || 0);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    try {
      await api.post('/superadmin/announcements', {
        ...announcementForm,
        target_plans: announcementForm.target_plans.length > 0 ? announcementForm.target_plans : null,
        expires_at: announcementForm.expires_at || null
      }, getAuthHeader());
      setAnnouncementForm({ title: '', message: '', type: 'info', target_plans: [], expires_at: '' });
      setShowAnnouncementForm(false);
      fetchAnnouncements();
    } catch (error) {
      alert('Failed to create announcement');
    }
  };

  const handleToggleAnnouncement = async (id, isActive) => {
    try {
      await api.put(`/superadmin/announcements/${id}`, { is_active: !isActive }, getAuthHeader());
      fetchAnnouncements();
    } catch (error) {
      alert('Failed to update announcement');
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await api.delete(`/superadmin/announcements/${id}`, getAuthHeader());
      fetchAnnouncements();
    } catch (error) {
      alert('Failed to delete announcement');
    }
  };

  const handleSendBroadcast = async (isTest = false) => {
    const { subject, message, emails, testEmail } = emailBroadcastForm;
    if (!subject || !message) { alert('Subject and message are required'); return; }
    if (isTest && !testEmail) { alert('Enter a test email address'); return; }

    // Parse email list
    const emailList = emails.split(/[\n,;]+/).map(e => e.trim()).filter(e => e && e.includes('@'));
    if (!isTest && emailList.length === 0) { alert('Add at least one recipient email'); return; }
    if (!isTest && !confirm(`Send this email to ${emailList.length} recipient${emailList.length !== 1 ? 's' : ''}?`)) return;

    setEmailSending(true);
    try {
      const payload = { subject, message };
      if (isTest) {
        payload.testEmail = testEmail;
      } else {
        payload.emails = emailList;
      }
      const response = await api.post('/superadmin/email-broadcast', payload, getAuthHeader());
      const { sent, failed, total } = response.data;
      alert(isTest ? `Test email sent to ${testEmail}` : `Sent: ${sent}, Failed: ${failed}, Total: ${total}`);
      if (!isTest) {
        setEmailBroadcastForm({ subject: '', message: '', emails: '', testEmail: '' });
        fetchEmailBroadcasts();
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to send broadcast');
    } finally {
      setEmailSending(false);
    }
  };

  const handleViewTicket = async (id) => {
    try {
      const response = await api.get(`/superadmin/tickets/${id}`, getAuthHeader());
      setSelectedTicket(response.data.ticket);
      setTicketMessages(response.data.messages || []);
      setTicketReply('');
    } catch (error) {
      alert('Failed to load ticket');
    }
  };

  const handleReplyTicket = async () => {
    if (!ticketReply.trim()) return;
    try {
      await api.post(`/superadmin/tickets/${selectedTicket.id}/reply`, { message: ticketReply }, getAuthHeader());
      setTicketReply('');
      handleViewTicket(selectedTicket.id);
      fetchTickets();
    } catch (error) {
      alert('Failed to send reply');
    }
  };

  const handleCloseTicket = async (id) => {
    try {
      await api.patch(`/superadmin/tickets/${id}/status`, { status: 'resolved' }, getAuthHeader());
      if (selectedTicket?.id === id) {
        setSelectedTicket({ ...selectedTicket, status: 'resolved' });
      }
      fetchTickets();
    } catch (error) {
      alert('Failed to close ticket');
    }
  };

  const handleSuspend = async (id, name) => {
    if (!confirm(`Suspend ${name}? Users will not be able to log in.`)) return;

    const reason = prompt('Reason for suspension:');
    try {
      await api.post(`/superadmin/madrasahs/${id}/suspend`, { reason }, getAuthHeader());
      fetchMadrasahs();
      fetchDashboard();
      fetchRecentRegistrations();
    } catch (error) {
      alert('Failed to suspend madrasah');
    }
  };

  const handleReactivate = async (id) => {
    try {
      await api.post(`/superadmin/madrasahs/${id}/reactivate`, {}, getAuthHeader());
      fetchMadrasahs();
      fetchDashboard();
      fetchRecentRegistrations();
    } catch (error) {
      alert('Failed to reactivate madrasah');
    }
  };

  const handleVerify = async (id, status) => {
    const notes = status === 'flagged' ? prompt('Reason for flagging:') : null;
    try {
      await api.patch(`/superadmin/madrasahs/${id}/verify`, { status, notes }, getAuthHeader());
      fetchRecentRegistrations();
      fetchDashboard();
    } catch (error) {
      alert('Failed to update verification status');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('superAdminToken');
    localStorage.removeItem('superAdmin');
    navigate(`${getBasePath()}/login`);
  };

  const formatEventType = (type) => {
    const types = {
      login_success: 'Login',
      login_failed: 'Failed Login',
      account_locked: 'Account Locked',
      password_changed: 'Password Changed',
      logout: 'Logout'
    };
    return types[type] || type;
  };

  const daysSince = (dateStr) => {
    if (!dateStr) return Infinity;
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  };

  const formatTimeAgo = (dateStr) => {
    const days = daysSince(dateStr);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  return (
    <DashboardErrorBoundary>
    <div className="superadmin">
      <header className="superadmin-header">
        <div className="header-left">
          <img src="/e-daarah-blackbg-logo.png" alt="e-Daarah" className="header-logo-img" />
          <span className="header-logo-text">e-Daarah</span>
          <span className="platform-label">Platform</span>
        </div>
        <div className="header-right">
          <span className="admin-name">{superAdmin.firstName} {superAdmin.lastName}</span>
          <button onClick={handleLogout} className="btn-link">Logout</button>
        </div>
      </header>

      <main className="superadmin-main">
        {/* Stats Cards */}
        {stats && (
          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.totalMadrasahs}</div>
              <div className="stat-label">Total Madrasahs</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.activeMadrasahs}</div>
              <div className="stat-label">Active</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.totalStudents?.toLocaleString()}</div>
              <div className="stat-label">Total Students</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.totalUsers}</div>
              <div className="stat-label">Total Users</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">${stats.mrr || 0}</div>
              <div className="stat-label">MRR</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.activeThisWeek || 0}</div>
              <div className="stat-label">Active This Week</div>
            </div>
            <div className="stat-card highlight" onClick={() => setActiveTab('review')} style={{ cursor: 'pointer' }}>
              <div className="stat-value">{stats.recentRegistrations}</div>
              <div className="stat-label">New (7 days)</div>
            </div>
          </section>
        )}

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'madrasahs' ? 'active' : ''}`}
            onClick={() => setActiveTab('madrasahs')}
          >
            All Madrasahs
          </button>
          <button
            className={`tab ${activeTab === 'engagement' ? 'active' : ''}`}
            onClick={() => setActiveTab('engagement')}
          >
            Engagement
          </button>
          <button
            className={`tab ${activeTab === 'revenue' ? 'active' : ''}`}
            onClick={() => setActiveTab('revenue')}
          >
            Revenue
          </button>
          <button
            className={`tab ${activeTab === 'churn' ? 'active' : ''}`}
            onClick={() => setActiveTab('churn')}
          >
            Churn Risk {churnRisks.length > 0 && activeTab !== 'churn' && <span className="badge warning-badge">{churnRisks.length}</span>}
          </button>
          <button
            className={`tab ${activeTab === 'announcements' ? 'active' : ''}`}
            onClick={() => setActiveTab('announcements')}
          >
            Announcements
          </button>
          <button
            className={`tab ${activeTab === 'email-broadcast' ? 'active' : ''}`}
            onClick={() => { setActiveTab('email-broadcast'); fetchEmailBroadcasts(); fetchEmailTemplates(); }}
          >
            Email Broadcast
          </button>
          <button
            className={`tab ${activeTab === 'tickets' ? 'active' : ''}`}
            onClick={() => setActiveTab('tickets')}
          >
            Tickets {ticketOpenCount > 0 && <span className="badge">{ticketOpenCount}</span>}
          </button>
          <button
            className={`tab ${activeTab === 'review' ? 'active' : ''}`}
            onClick={() => setActiveTab('review')}
          >
            Review Queue {recentRegistrations.filter(r => r.verification_status !== 'verified').length > 0 && <span className="badge">{recentRegistrations.filter(r => r.verification_status !== 'verified').length}</span>}
          </button>
          <button
            className={`tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            Security
          </button>
        </div>

        {/* Madrasahs Tab */}
        {activeTab === 'madrasahs' && (
          <>
            <section className="filters">
              <input
                type="text"
                placeholder="Search madrasahs..."
                value={filter.search}
                onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                className="search-input"
              />
              <select
                value={filter.status}
                onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="inactive">Inactive</option>
              </select>
              <select
                value={filter.plan}
                onChange={(e) => setFilter({ ...filter, plan: e.target.value })}
              >
                <option value="">All Plans</option>
                <option value="trial">Trial</option>
                <option value="standard">Standard</option>
                <option value="plus">Plus</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </section>

            <section className="table-section">
              <h2>Madrasahs</h2>
              {loading ? (
                <p>Loading...</p>
              ) : (
                <>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Slug</th>
                        <th>Plan</th>
                        <th>Users</th>
                        <th>Students</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {madrasahs.map((m) => (
                        <tr key={m.id} className={m.suspended_at ? 'suspended' : ''}>
                          <td>{m.name}</td>
                          <td><code>{m.slug}</code></td>
                          <td>
                            <span className={`plan-badge ${m.pricing_plan || m.subscription_plan || 'trial'}`}>
                              {m.pricing_plan || m.subscription_plan || 'trial'}
                            </span>
                          </td>
                          <td>{m.user_count}</td>
                          <td>{m.student_count}</td>
                          <td>
                            {m.suspended_at ? (
                              <span className="status suspended">Suspended</span>
                            ) : m.is_active ? (
                              <span className="status active">Active</span>
                            ) : (
                              <span className="status inactive">Inactive</span>
                            )}
                          </td>
                          <td>{new Date(m.created_at).toLocaleDateString()}</td>
                          <td className="actions">
                            <Link to={`${getBasePath()}/madrasahs/${m.id}`} className="btn-small">
                              View
                            </Link>
                            {m.suspended_at ? (
                              <button
                                onClick={() => handleReactivate(m.id)}
                                className="btn-small success"
                              >
                                Reactivate
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSuspend(m.id, m.name)}
                                className="btn-small danger"
                              >
                                Suspend
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {pagination && (
                    <div className="pagination">
                      <button
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                      >
                        Previous
                      </button>
                      <span>Page {page} of {pagination.pages}</span>
                      <button
                        disabled={page >= pagination.pages}
                        onClick={() => setPage(page + 1)}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        )}

        {/* Engagement Tab */}
        {activeTab === 'engagement' && (
          <section className="table-section">
            <h2>Engagement Overview</h2>
            <p className="section-desc">Track how actively each madrasah is using the platform.</p>

            {engagement?.summary && (
              <div className="engagement-summary">
                <div className="mini-stat">
                  <span className="mini-value">{engagement.summary.activeThisWeek}</span>
                  <span className="mini-label">Active this week</span>
                </div>
                <div className="mini-stat">
                  <span className="mini-value">{engagement.summary.activeThisMonth}</span>
                  <span className="mini-label">Active this month</span>
                </div>
                <div className="mini-stat warning">
                  <span className="mini-value">{engagement.summary.dormantCount}</span>
                  <span className="mini-label">Dormant (30d+)</span>
                </div>
                <div className="mini-stat">
                  <span className="mini-value">{engagement.summary.attendanceThisWeek}</span>
                  <span className="mini-label">Attendance records (7d)</span>
                </div>
                <div className="mini-stat">
                  <span className="mini-value">{engagement.summary.examsThisWeek}</span>
                  <span className="mini-label">Exam records (7d)</span>
                </div>
              </div>
            )}

            {engagement?.engagement?.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Madrasah</th>
                    <th>Plan</th>
                    <th>Users</th>
                    <th>Students</th>
                    <th>Activity (7d)</th>
                    <th>Attendance (30d)</th>
                    <th>Exams (30d)</th>
                    <th>Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {engagement.engagement.map((m) => (
                    <tr key={m.id} className={!m.last_login || daysSince(m.last_login) > 30 ? 'warning-row' : ''}>
                      <td>
                        <Link to={`${getBasePath()}/madrasahs/${m.id}`} className="madrasah-link">
                          {m.name}
                        </Link>
                      </td>
                      <td>
                        <span className={`plan-badge ${m.pricing_plan || 'trial'}`}>
                          {m.pricing_plan || 'trial'}
                        </span>
                      </td>
                      <td>{m.user_count}</td>
                      <td>{m.student_count}</td>
                      <td>
                        <span className={`activity-count ${m.activity_7d > 0 ? 'active' : 'none'}`}>
                          {m.activity_7d}
                        </span>
                      </td>
                      <td>{m.attendance_30d}</td>
                      <td>{m.exams_30d}</td>
                      <td>
                        {m.last_login ? (
                          <span className={daysSince(m.last_login) > 14 ? 'text-warning' : ''}>
                            {formatTimeAgo(m.last_login)}
                          </span>
                        ) : (
                          <span className="text-muted">Never</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="empty-state">No engagement data available yet.</p>
            )}
          </section>
        )}

        {/* Revenue Tab */}
        {activeTab === 'revenue' && (
          <section className="table-section">
            <h2>Revenue & Growth</h2>
            <p className="section-desc">Monthly recurring revenue, plan distribution, and growth trends.</p>

            {revenue && (
              <>
                <div className="revenue-cards">
                  <div className="revenue-card primary">
                    <div className="revenue-value">${revenue.mrr} <span style={{ fontSize: '0.5em', opacity: 0.7 }}>USD</span></div>
                    <div className="revenue-label">Monthly Recurring Revenue</div>
                  </div>
                  <div className="revenue-card">
                    <div className="revenue-value">{revenue.payingCustomers}</div>
                    <div className="revenue-label">Paying Customers</div>
                  </div>
                  <div className="revenue-card">
                    <div className="revenue-value">{revenue.trialCount}</div>
                    <div className="revenue-label">On Trial</div>
                  </div>
                  <div className="revenue-card">
                    <div className="revenue-value">{revenue.conversionRate}%</div>
                    <div className="revenue-label">Trial Conversion</div>
                  </div>
                  {revenue.pastDueCount > 0 && (
                    <div className="revenue-card danger">
                      <div className="revenue-value">{revenue.pastDueCount}</div>
                      <div className="revenue-label">Past Due</div>
                    </div>
                  )}
                  {revenue.canceledCount > 0 && (
                    <div className="revenue-card">
                      <div className="revenue-value">{revenue.canceledCount}</div>
                      <div className="revenue-label">Canceled</div>
                    </div>
                  )}
                </div>

                {/* Growth Trend */}
                {revenue.growthTrend?.length > 0 && (
                  <div className="growth-section">
                    <h3>Signups by Month</h3>
                    <div className="growth-chart">
                      {revenue.growthTrend.map((item) => {
                        const max = Math.max(...revenue.growthTrend.map(g => g.signups), 1);
                        return (
                          <div key={item.month} className="growth-bar-wrapper">
                            <div className="growth-count">{item.signups}</div>
                            <div
                              className="growth-bar"
                              style={{ height: `${Math.max((item.signups / max) * 120, 4)}px` }}
                            />
                            <div className="growth-month">{item.month.slice(5)}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Plan Distribution */}
                <div className="plan-distribution">
                  <h3>Plan Distribution</h3>
                  <div className="plan-dist-grid">
                    {['trial', 'standard', 'plus', 'enterprise'].map(plan => {
                      const items = revenue.planDistribution?.filter(p => p.pricing_plan === plan) || [];
                      const total = items.reduce((sum, i) => sum + i.count, 0);
                      return (
                        <div key={plan} className="plan-dist-item">
                          <span className={`plan-badge ${plan}`}>{plan}</span>
                          <span className="plan-dist-count">{total}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {/* Churn Risk Tab */}
        {activeTab === 'churn' && (
          <section className="table-section">
            <h2>Churn Risk Alerts</h2>
            <p className="section-desc">Paid madrasahs showing signs of disengagement. Consider proactive outreach.</p>

            {churnRisks.length === 0 ? (
              <p className="empty-state">No at-risk madrasahs detected. All paid customers are active.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Madrasah</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Risk Level</th>
                    <th>Last Login</th>
                    <th>Last Attendance</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {churnRisks.map((r) => (
                    <tr key={r.id} className={r.risk_level === 'critical' ? 'warning-row' : ''}>
                      <td>
                        <Link to={`${getBasePath()}/madrasahs/${r.id}`} className="madrasah-link">
                          {r.name}
                        </Link>
                      </td>
                      <td>
                        <span className={`plan-badge ${r.pricing_plan}`}>{r.pricing_plan}</span>
                      </td>
                      <td>
                        <span className={`status-badge ${r.subscription_status === 'active' ? '' : 'danger'}`}>
                          {r.subscription_status || 'unknown'}
                        </span>
                      </td>
                      <td>
                        <span className={`risk-badge ${r.risk_level}`}>{r.risk_level}</span>
                      </td>
                      <td>
                        {r.last_login ? (
                          <span className="text-warning">{formatTimeAgo(r.last_login)}</span>
                        ) : (
                          <span className="text-muted">Never</span>
                        )}
                      </td>
                      <td>
                        {r.last_attendance ? (
                          <span>{formatTimeAgo(r.last_attendance)}</span>
                        ) : (
                          <span className="text-muted">Never</span>
                        )}
                      </td>
                      <td>
                        <Link to={`${getBasePath()}/madrasahs/${r.id}`} className="btn-small">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {/* Announcements Tab */}
        {activeTab === 'announcements' && (
          <section className="table-section">
            <div className="section-header-row">
              <div>
                <h2>Platform Announcements</h2>
                <p className="section-desc">Broadcast messages to madrasah admins. Shown as banners on their dashboards.</p>
              </div>
              <button className="btn primary" onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}>
                {showAnnouncementForm ? 'Cancel' : '+ New Announcement'}
              </button>
            </div>

            {showAnnouncementForm && (
              <form onSubmit={handleCreateAnnouncement} className="announcement-form">
                <div className="form-row">
                  <div className="form-group" style={{ flex: 2 }}>
                    <label>Title</label>
                    <input
                      type="text"
                      value={announcementForm.title}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                      placeholder="e.g., Scheduled Maintenance"
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Type</label>
                    <select
                      value={announcementForm.type}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, type: e.target.value })}
                    >
                      <option value="info">Info</option>
                      <option value="warning">Warning</option>
                      <option value="success">Success</option>
                      <option value="update">Update</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Message</label>
                  <textarea
                    value={announcementForm.message}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, message: e.target.value })}
                    placeholder="Announcement message..."
                    rows={3}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Target Plans (leave empty for all)</label>
                    <div className="plan-checkboxes">
                      {['trial', 'standard', 'plus', 'enterprise'].map(plan => (
                        <label key={plan} className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={announcementForm.target_plans.includes(plan)}
                            onChange={(e) => {
                              const plans = e.target.checked
                                ? [...announcementForm.target_plans, plan]
                                : announcementForm.target_plans.filter(p => p !== plan);
                              setAnnouncementForm({ ...announcementForm, target_plans: plans });
                            }}
                          />
                          {plan}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Expires At (optional)</label>
                    <input
                      type="datetime-local"
                      value={announcementForm.expires_at}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, expires_at: e.target.value })}
                    />
                  </div>
                </div>
                <button type="submit" className="btn primary">Publish Announcement</button>
              </form>
            )}

            {announcements.length === 0 ? (
              <p className="empty-state">No announcements yet.</p>
            ) : (
              <div className="announcements-list">
                {announcements.map((a) => (
                  <div key={a.id} className={`announcement-item ${a.type} ${!a.is_active ? 'inactive' : ''}`}>
                    <div className="announcement-content">
                      <div className="announcement-header">
                        <span className={`announcement-type ${a.type}`}>{a.type}</span>
                        <strong>{a.title}</strong>
                        {!a.is_active && <span className="status inactive">Inactive</span>}
                      </div>
                      <p>{a.message}</p>
                      <div className="announcement-meta">
                        <span>Created {new Date(a.created_at).toLocaleDateString()}</span>
                        {a.expires_at && <span> · Expires {new Date(a.expires_at).toLocaleDateString()}</span>}
                        {a.target_plans && <span> · Plans: {safeParseJSON(a.target_plans).join(', ')}</span>}
                        {a.dismiss_count !== undefined && <span> · {a.dismiss_count} dismissed</span>}
                      </div>
                    </div>
                    <div className="announcement-actions">
                      <button
                        className={`btn-small ${a.is_active ? 'warning' : 'success'}`}
                        onClick={() => handleToggleAnnouncement(a.id, a.is_active)}
                      >
                        {a.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        className="btn-small danger"
                        onClick={() => handleDeleteAnnouncement(a.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Email Broadcast Tab */}
        {activeTab === 'email-broadcast' && (
          <section className="table-section">
            <div className="section-header-row">
              <div>
                <h2>Email Broadcast</h2>
                <p className="section-desc">Send marketing emails to potential clients using the e-Daarah email template.</p>
              </div>
            </div>

            {/* Saved Templates */}
            {emailTemplates.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#525252', marginBottom: '6px', display: 'block' }}>Load Template</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {emailTemplates.map((t) => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f5f5f5', borderRadius: '6px', padding: '6px 10px', fontSize: '13px' }}>
                      <button
                        type="button"
                        onClick={() => handleLoadTemplate(t)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '13px', color: '#1a1a1a', fontWeight: '500' }}
                      >
                        {t.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTemplate(t.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', fontSize: '14px', color: '#999', lineHeight: 1 }}
                        title="Delete template"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={(e) => e.preventDefault()} className="announcement-form">
              <div className="form-group">
                <label>Subject</label>
                <input
                  type="text"
                  value={emailBroadcastForm.subject}
                  onChange={(e) => setEmailBroadcastForm({ ...emailBroadcastForm, subject: e.target.value })}
                  placeholder="e.g., Stop tracking attendance on paper"
                  required
                />
              </div>
              <div className="form-group">
                <label>Message</label>
                <textarea
                  value={emailBroadcastForm.message}
                  onChange={(e) => setEmailBroadcastForm({ ...emailBroadcastForm, message: e.target.value })}
                  placeholder={"Assalamu Alaykum,\n\nWe built **e-Daarah** to help madrasahs like yours.\n\n## What you get\n\n- Track attendance in seconds\n- Record and share exam results\n- Give parents real-time access\n\nStart your free trial at [e-daarah.com](https://www.e-daarah.com)"}
                  rows={10}
                  required
                />
                <span style={{ fontSize: '12px', color: '#888', marginTop: '4px', display: 'block' }}>
                  Supports: **bold**, *italic*, - bullet lists, ## headings, [link text](url)
                </span>
              </div>

              {/* Save as template */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Template name"
                  style={{ flex: 1, maxWidth: '240px', padding: '6px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px' }}
                />
                <button
                  type="button"
                  className="btn-small"
                  onClick={handleSaveTemplate}
                  disabled={!templateName.trim() || !emailBroadcastForm.subject || !emailBroadcastForm.message}
                  style={{ opacity: templateName.trim() && emailBroadcastForm.subject && emailBroadcastForm.message ? 1 : 0.5 }}
                >
                  Save Template
                </button>
              </div>

              <div className="form-group">
                <label>Recipient Emails (one per line, or comma/semicolon separated)</label>
                <textarea
                  value={emailBroadcastForm.emails}
                  onChange={(e) => setEmailBroadcastForm({ ...emailBroadcastForm, emails: e.target.value })}
                  placeholder={"admin@school1.com\nadmin@school2.com\nadmin@school3.com"}
                  rows={5}
                />
                {emailBroadcastForm.emails && (
                  <span style={{ fontSize: '12px', color: '#888', marginTop: '4px', display: 'block' }}>
                    {emailBroadcastForm.emails.split(/[\n,;]+/).filter(e => e.trim() && e.includes('@')).length} valid email(s)
                  </span>
                )}
              </div>

              <div className="form-group">
                <label>Test Email (optional — preview before sending)</label>
                <input
                  type="email"
                  value={emailBroadcastForm.testEmail}
                  onChange={(e) => setEmailBroadcastForm({ ...emailBroadcastForm, testEmail: e.target.value })}
                  placeholder="your@email.com"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => handleSendBroadcast(true)}
                  disabled={emailSending || !emailBroadcastForm.testEmail}
                  style={{ opacity: emailBroadcastForm.testEmail ? 1 : 0.5 }}
                >
                  {emailSending ? 'Sending...' : 'Send Test'}
                </button>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => handleSendBroadcast(false)}
                  disabled={emailSending}
                >
                  {emailSending ? 'Sending...' : 'Send Broadcast'}
                </button>
              </div>
            </form>

            {emailBroadcasts.length > 0 && (
              <>
                <h3 style={{ marginTop: '32px', marginBottom: '12px', fontSize: '16px', fontWeight: '600' }}>History</h3>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Sent</th>
                      <th>Failed</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emailBroadcasts.map((b) => (
                      <tr key={b.id}>
                        <td>{b.subject}</td>
                        <td>{b.sent_count}</td>
                        <td>{b.failed_count}</td>
                        <td>
                          <span className={`status ${b.status === 'sent' ? 'active' : b.status === 'failed' ? 'suspended' : ''}`}>
                            {b.status || 'sent'}
                          </span>
                        </td>
                        <td>{new Date(b.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </section>
        )}

        {/* Support Tickets Tab */}
        {activeTab === 'tickets' && (
          <section className="table-section">
            <h2>Support Tickets</h2>
            <p className="section-desc">Manage support requests from madrasah administrators.</p>

            <div className="ticket-filters">
              {['open', 'in_progress', 'resolved', 'closed', ''].map(status => (
                <button
                  key={status || 'all'}
                  className={`btn-small ${ticketFilter === status ? 'active-filter' : ''}`}
                  onClick={() => setTicketFilter(status)}
                >
                  {status === '' ? 'All' : status.replace('_', ' ')}
                </button>
              ))}
            </div>

            {selectedTicket ? (
              <div className="ticket-detail">
                <button className="btn-small" onClick={() => setSelectedTicket(null)}>← Back to list</button>
                <div className="ticket-header-detail">
                  <h3>{selectedTicket.subject}</h3>
                  <div className="ticket-meta">
                    <span className={`ticket-status ${selectedTicket.status}`}>{selectedTicket.status.replace('_', ' ')}</span>
                    <span className={`ticket-priority ${selectedTicket.priority}`}>{selectedTicket.priority}</span>
                    {selectedTicket.madrasah_name && <span>from <strong>{selectedTicket.madrasah_name}</strong></span>}
                    <span>{new Date(selectedTicket.created_at).toLocaleString()}</span>
                  </div>
                </div>

                <div className="ticket-messages">
                  {ticketMessages.map((msg) => (
                    <div key={msg.id} className={`ticket-message ${msg.sender_type}`}>
                      <div className="message-header">
                        <strong>{msg.sender_type === 'super_admin' ? 'You' : 'User'}</strong>
                        <span>{new Date(msg.created_at).toLocaleString()}</span>
                      </div>
                      <p>{msg.message}</p>
                    </div>
                  ))}
                </div>

                {selectedTicket.status !== 'closed' && (
                  <div className="ticket-reply-form">
                    <textarea
                      value={ticketReply}
                      onChange={(e) => setTicketReply(e.target.value)}
                      placeholder="Type your reply..."
                      rows={3}
                    />
                    <div className="ticket-reply-actions">
                      <button className="btn primary" onClick={handleReplyTicket} disabled={!ticketReply.trim()}>
                        Send Reply
                      </button>
                      {selectedTicket.status !== 'resolved' && (
                        <button className="btn secondary" onClick={() => handleCloseTicket(selectedTicket.id)}>
                          Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : tickets.length === 0 ? (
              <p className="empty-state">No tickets match the current filter.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Madrasah</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Messages</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.id} className={t.priority === 'urgent' ? 'warning-row' : ''}>
                      <td><strong>{t.subject}</strong></td>
                      <td>
                        {t.madrasah_name ? (
                          <Link to={`${getBasePath()}/madrasahs/${t.madrasah_id}`} className="madrasah-link">
                            {t.madrasah_name}
                          </Link>
                        ) : '-'}
                      </td>
                      <td><span className={`ticket-status ${t.status}`}>{t.status.replace('_', ' ')}</span></td>
                      <td><span className={`ticket-priority ${t.priority}`}>{t.priority}</span></td>
                      <td>{t.message_count}</td>
                      <td>{formatTimeAgo(t.updated_at)}</td>
                      <td>
                        <button className="btn-small" onClick={() => handleViewTicket(t.id)}>View</button>
                        {t.status !== 'resolved' && t.status !== 'closed' && (
                          <button className="btn-small success" onClick={() => handleCloseTicket(t.id)}>Resolve</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {/* Review Queue Tab */}
        {activeTab === 'review' && (
          <section className="table-section">
            <h2>Recent Registrations (Last 14 Days)</h2>
            <p className="section-desc">Review new madrasah registrations to verify they are legitimate Islamic schools.</p>

            {recentRegistrations.length === 0 ? (
              <p className="empty-state">No recent registrations to review.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Location</th>
                    <th>Website</th>
                    <th>Admin</th>
                    <th>Email Verified</th>
                    <th>Registered</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRegistrations.map((r) => (
                    <tr key={r.id} className={r.verification_status === 'flagged' ? 'flagged' : ''}>
                      <td>
                        <strong>{r.name}</strong>
                        <br />
                        <code className="slug">{r.slug}</code>
                      </td>
                      <td>{r.institution_type || '-'}</td>
                      <td>{r.city}, {r.country}</td>
                      <td>
                        {r.website ? (
                          <a href={r.website} target="_blank" rel="noopener noreferrer" className="external-link">
                            Visit
                          </a>
                        ) : (
                          <span className="muted">None</span>
                        )}
                      </td>
                      <td>
                        {r.admin_first_name} {r.admin_last_name}
                        <br />
                        <span className="email">{r.admin_email}</span>
                      </td>
                      <td>
                        {r.admin_email_verified ? (
                          <span className="status active">Yes</span>
                        ) : (
                          <span className="status inactive">No</span>
                        )}
                      </td>
                      <td>{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="actions">
                        <Link to={`${getBasePath()}/madrasahs/${r.id}`} className="btn-small">
                          View
                        </Link>
                        {r.verification_status !== 'verified' && (
                          <button
                            onClick={() => handleVerify(r.id, 'verified')}
                            className="btn-small success"
                          >
                            Approve
                          </button>
                        )}
                        {r.verification_status !== 'flagged' && (
                          <button
                            onClick={() => handleVerify(r.id, 'flagged')}
                            className="btn-small warning"
                          >
                            Flag
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {/* Security Events Tab */}
        {activeTab === 'security' && (
          <section className="table-section">
            <h2>Security Events</h2>
            <p className="section-desc">Login attempts, lockouts, and other security-related events.</p>

            {securityEvents.length === 0 ? (
              <p className="empty-state">No security events recorded yet.</p>
            ) : (
              <>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Event</th>
                      <th>User</th>
                      <th>Madrasah</th>
                      <th>IP Address</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {securityEvents.map((e, idx) => (
                      <tr key={e.id || idx} className={e.event_type === 'account_locked' ? 'warning-row' : ''}>
                        <td>{new Date(e.created_at).toLocaleString()}</td>
                        <td>
                          <span className={`event-type ${e.event_type}`}>
                            {formatEventType(e.event_type)}
                          </span>
                        </td>
                        <td>
                          {e.user_email || '-'}
                          {e.first_name && <br />}
                          {e.first_name && <span className="muted">{e.first_name} {e.last_name}</span>}
                        </td>
                        <td>{e.madrasah_name || '-'}</td>
                        <td><code>{e.ip_address || '-'}</code></td>
                        <td>
                          {e.details && (
                            <span className="details-preview">
                              {typeof e.details === 'string' ? e.details : JSON.stringify(e.details).substring(0, 50)}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {securityPagination && securityPagination.pages > 1 && (
                  <div className="pagination">
                    <button
                      disabled={securityPage === 1}
                      onClick={() => setSecurityPage(securityPage - 1)}
                    >
                      Previous
                    </button>
                    <span>Page {securityPage} of {securityPagination.pages}</span>
                    <button
                      disabled={securityPage >= securityPagination.pages}
                      onClick={() => setSecurityPage(securityPage + 1)}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </main>
    </div>
    </DashboardErrorBoundary>
  );
}

export default SuperAdminDashboard;
