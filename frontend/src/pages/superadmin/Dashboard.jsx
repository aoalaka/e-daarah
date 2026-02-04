import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import './SuperAdmin.css';

// Check if we're on the admin subdomain
const isAdminSubdomain = () => window.location.hostname.startsWith('admin.');
const getBasePath = () => isAdminSubdomain() ? '' : '/superadmin';

function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('madrasahs');
  const [stats, setStats] = useState(null);
  const [madrasahs, setMadrasahs] = useState([]);
  const [recentRegistrations, setRecentRegistrations] = useState([]);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', plan: '', search: '' });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [securityPage, setSecurityPage] = useState(1);
  const [securityPagination, setSecurityPagination] = useState(null);

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
  }, []);

  useEffect(() => {
    fetchMadrasahs();
  }, [filter, page]);

  useEffect(() => {
    if (activeTab === 'security') {
      fetchSecurityEvents();
    }
  }, [activeTab, securityPage]);

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

  return (
    <div className="superadmin">
      <header className="superadmin-header">
        <div className="header-left">
          <img src="/e-daarah-blackbg-logo.png" alt="e-daarah" className="header-logo-img" />
          <span className="header-logo-text">e-daarah</span>
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
              <div className="stat-value">{stats.totalStudents}</div>
              <div className="stat-label">Total Students</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.totalUsers}</div>
              <div className="stat-label">Total Users</div>
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
            className={`tab ${activeTab === 'review' ? 'active' : ''}`}
            onClick={() => setActiveTab('review')}
          >
            Review Queue {recentRegistrations.length > 0 && <span className="badge">{recentRegistrations.length}</span>}
          </button>
          <button
            className={`tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            Security Events
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
  );
}

export default SuperAdminDashboard;
