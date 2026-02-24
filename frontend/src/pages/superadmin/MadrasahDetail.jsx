import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import './SuperAdmin.css';

// Check if we're on the admin subdomain
const isAdminSubdomain = () => window.location.hostname.startsWith('admin.');
const getBasePath = () => isAdminSubdomain() ? '' : '/superadmin';

function MadrasahDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('superAdminToken');
    if (!token) {
      navigate(`${getBasePath()}/login`);
      return;
    }
    fetchMadrasah();
  }, [id]);

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('superAdminToken')}` }
  });

  const fetchMadrasah = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/superadmin/madrasahs/${id}`, getAuthHeader());
      setData(response.data);
      setSelectedPlan(response.data.madrasah.pricing_plan || 'trial');
    } catch (error) {
      if (error.response?.status === 401) {
        navigate(`${getBasePath()}/login`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePlan = async () => {
    try {
      await api.patch(
        `/superadmin/madrasahs/${id}/plan`,
        { plan: selectedPlan },
        getAuthHeader()
      );
      alert('Plan updated successfully');
      fetchMadrasah();
    } catch (error) {
      alert('Failed to update plan');
    }
  };

  const handleSuspend = async () => {
    const reason = prompt('Reason for suspension:');
    if (!reason) return;

    try {
      await api.post(`/superadmin/madrasahs/${id}/suspend`, { reason }, getAuthHeader());
      fetchMadrasah();
    } catch (error) {
      alert('Failed to suspend madrasah');
    }
  };

  const handleReactivate = async () => {
    try {
      await api.post(`/superadmin/madrasahs/${id}/reactivate`, {}, getAuthHeader());
      fetchMadrasah();
    } catch (error) {
      alert('Failed to reactivate madrasah');
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.delete(`/superadmin/madrasahs/${id}`, {
        ...getAuthHeader(),
        data: { confirmName: deleteConfirmName }
      });
      setShowDeleteModal(false);
      setDeleteConfirmName('');
      fetchMadrasah();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete madrasah');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleReinstate = async () => {
    if (!confirm('Are you sure you want to reinstate this madrasah? All users will regain access.')) return;
    try {
      await api.post(`/superadmin/madrasahs/${id}/reinstate`, {}, getAuthHeader());
      fetchMadrasah();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to reinstate madrasah');
    }
  };

  if (loading) return <div className="superadmin"><p>Loading...</p></div>;
  if (!data) return <div className="superadmin"><p>Madrasah not found</p></div>;

  const { madrasah, users, studentCount, recentActivity, usageStats } = data;
  const isDeleted = !!madrasah.deleted_at;
  const deletedDate = isDeleted ? new Date(madrasah.deleted_at) : null;
  const permanentDeleteDate = deletedDate ? new Date(deletedDate.getTime() + 30 * 86400000) : null;
  const nameMatches = deleteConfirmName.trim().toLowerCase() === (madrasah.name || '').trim().toLowerCase();

  return (
    <div className="superadmin">
      <header className="superadmin-header">
        <div className="header-left">
          <Link to={`${getBasePath()}/dashboard`} className="back-link">← Back</Link>
          <h1>{madrasah.name}</h1>
        </div>
      </header>

      <main className="superadmin-main">
        {/* Deleted Banner */}
        {isDeleted && (
          <div className="deleted-banner">
            <strong>This madrasah was deleted on {deletedDate.toLocaleDateString()}.</strong>
            <span> Data will be permanently removed on {permanentDeleteDate.toLocaleDateString()}. Reinstate to restore access.</span>
          </div>
        )}

        {/* Madrasah Info */}
        <section className="detail-section">
          <h2>Details</h2>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Slug</label>
              <span><code>{madrasah.slug}</code></span>
            </div>
            <div className="detail-item">
              <label>Status</label>
              <span>
                {isDeleted ? (
                  <span className="status deleted">Deleted</span>
                ) : madrasah.suspended_at ? (
                  <span className="status suspended">Suspended</span>
                ) : madrasah.is_active ? (
                  <span className="status active">Active</span>
                ) : (
                  <span className="status inactive">Inactive</span>
                )}
              </span>
            </div>
            <div className="detail-item">
              <label>Phone</label>
              <span>{madrasah.phone || '-'}</span>
            </div>
            <div className="detail-item">
              <label>Location</label>
              <span>{[madrasah.city, madrasah.region, madrasah.country].filter(Boolean).join(', ') || '-'}</span>
            </div>
            <div className="detail-item">
              <label>Created</label>
              <span>{new Date(madrasah.created_at).toLocaleDateString()}</span>
            </div>
            <div className="detail-item">
              <label>Students</label>
              <span>{studentCount}{madrasah.pricing_plan === 'enterprise' ? '' : ` / ${madrasah.pricing_plan === 'plus' ? '300' : '75'}`}</span>
            </div>
          </div>

          {madrasah.suspended_at && !isDeleted && (
            <div className="suspended-notice">
              <strong>Suspended:</strong> {madrasah.suspended_reason}
              <br />
              <small>Since: {new Date(madrasah.suspended_at).toLocaleString()}</small>
            </div>
          )}
        </section>

        {/* Plan Management */}
        {!isDeleted && (
        <section className="detail-section">
          <h2>Subscription</h2>
          <div className="plan-manager">
            <select value={selectedPlan} onChange={(e) => setSelectedPlan(e.target.value)}>
              <option value="trial">Trial (Free)</option>
              <option value="standard">Standard ($12/mo)</option>
              <option value="plus">Plus ($29/mo)</option>
              <option value="enterprise">Enterprise (Custom)</option>
            </select>
            <button
              onClick={handleUpdatePlan}
              className="btn primary"
              disabled={selectedPlan === (madrasah.pricing_plan || 'trial')}
            >
              Update Plan
            </button>
          </div>
          <div style={{ marginTop: '8px', fontSize: '13px', color: '#666' }}>
            <strong>Status:</strong> {madrasah.subscription_status || 'trialing'}
            {madrasah.trial_ends_at && (
              <span> · <strong>Trial ends:</strong> {new Date(madrasah.trial_ends_at).toLocaleDateString()}</span>
            )}
          </div>
        </section>
        )}

        {/* Actions */}
        <section className="detail-section">
          <h2>Actions</h2>
          <div className="action-buttons">
            {isDeleted ? (
              <button onClick={handleReinstate} className="btn success">
                Reinstate Madrasah
              </button>
            ) : (
              <>
                {madrasah.suspended_at ? (
                  <button onClick={handleReactivate} className="btn success">
                    Reactivate Madrasah
                  </button>
                ) : (
                  <button onClick={handleSuspend} className="btn danger">
                    Suspend Madrasah
                  </button>
                )}
                <button onClick={() => setShowDeleteModal(true)} className="btn danger-outline">
                  Delete Madrasah
                </button>
              </>
            )}
          </div>
        </section>

        {/* Usage Stats */}
        {usageStats && (
          <section className="detail-section">
            <h2>Usage Statistics</h2>
            <div className="usage-stats-grid">
              <div className="usage-stat">
                <div className="usage-stat-value">{usageStats.totalAttendance?.toLocaleString() || 0}</div>
                <div className="usage-stat-label">Attendance Records</div>
                <div className="usage-stat-sub">{usageStats.attendance30d || 0} last 30 days</div>
              </div>
              <div className="usage-stat">
                <div className="usage-stat-value">{usageStats.totalExams?.toLocaleString() || 0}</div>
                <div className="usage-stat-label">Exam Records</div>
                <div className="usage-stat-sub">{usageStats.exams30d || 0} last 30 days</div>
              </div>
              <div className="usage-stat">
                <div className="usage-stat-value">{usageStats.totalClasses || 0}</div>
                <div className="usage-stat-label">Classes</div>
              </div>
              <div className="usage-stat">
                <div className="usage-stat-value">{usageStats.totalSessions || 0}</div>
                <div className="usage-stat-label">Sessions</div>
                <div className="usage-stat-sub">{usageStats.totalSemesters || 0} semesters</div>
              </div>
              <div className="usage-stat">
                <div className="usage-stat-value">{usageStats.attendanceDays || 0}</div>
                <div className="usage-stat-label">Attendance Days</div>
              </div>
              <div className="usage-stat">
                <div className="usage-stat-value">{usageStats.assignedTeachers || 0}</div>
                <div className="usage-stat-label">Teachers Assigned</div>
              </div>
              <div className="usage-stat">
                <div className="usage-stat-value">
                  {usageStats.lastAttendanceDate
                    ? new Date(usageStats.lastAttendanceDate).toLocaleDateString()
                    : '—'}
                </div>
                <div className="usage-stat-label">Last Attendance</div>
              </div>
              <div className="usage-stat">
                <div className="usage-stat-value">
                  {usageStats.lastActiveAt
                    ? new Date(usageStats.lastActiveAt).toLocaleDateString()
                    : '—'}
                </div>
                <div className="usage-stat-label">Last Active</div>
              </div>
            </div>

            {/* Feature Adoption */}
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '20px 0 12px', color: '#333' }}>Feature Adoption</h3>
            <div className="feature-adoption">
              <span className={`feature-indicator ${(usageStats.totalSessions || 0) > 0 ? 'adopted' : 'not-adopted'}`}>
                {(usageStats.totalSessions || 0) > 0 ? '✓' : '○'} Sessions Setup
              </span>
              <span className={`feature-indicator ${(usageStats.totalClasses || 0) > 0 ? 'adopted' : 'not-adopted'}`}>
                {(usageStats.totalClasses || 0) > 0 ? '✓' : '○'} Classes Created
              </span>
              <span className={`feature-indicator ${(usageStats.assignedTeachers || 0) > 0 ? 'adopted' : 'not-adopted'}`}>
                {(usageStats.assignedTeachers || 0) > 0 ? '✓' : '○'} Teachers Assigned
              </span>
              <span className={`feature-indicator ${(usageStats.totalAttendance || 0) > 0 ? 'adopted' : 'not-adopted'}`}>
                {(usageStats.totalAttendance || 0) > 0 ? '✓' : '○'} Attendance Tracking
              </span>
              <span className={`feature-indicator ${(usageStats.totalExams || 0) > 0 ? 'adopted' : 'not-adopted'}`}>
                {(usageStats.totalExams || 0) > 0 ? '✓' : '○'} Exam Recording
              </span>
              <span className={`feature-indicator ${users.length > 1 ? 'adopted' : 'not-adopted'}`}>
                {users.length > 1 ? '✓' : '○'} Multiple Users
              </span>
            </div>
          </section>
        )}

        {/* Users */}
        <section className="detail-section">
          <h2>Users ({users.length})</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Last Login</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.first_name} {user.last_name}</td>
                  <td>{user.email}</td>
                  <td><span className={`role-badge ${user.role}`}>{user.role}</span></td>
                  <td>
                    {user.last_login_at
                      ? new Date(user.last_login_at).toLocaleDateString()
                      : <span className="text-muted">Never</span>}
                  </td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Activity Log */}
        <section className="detail-section">
          <h2>Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <p className="empty">No recent activity recorded yet. Activity will appear here as admins and teachers use the platform.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>User Type</th>
                  <th>Details</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <span className={`activity-action ${log.action?.toLowerCase()}`}>
                        {log.action}
                      </span>
                    </td>
                    <td>{log.resource}{log.resource_id ? ` #${log.resource_id}` : ''}</td>
                    <td><span className={`role-badge ${log.user_type}`}>{log.user_type}</span></td>
                    <td>
                      {log.details && typeof log.details === 'object' && Object.keys(log.details).length > 0 && (
                        <span className="details-preview">
                          {Object.entries(log.details)
                            .filter(([, v]) => v !== undefined && v !== null)
                            .slice(0, 3)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(', ')}
                        </span>
                      )}
                    </td>
                    <td>{new Date(log.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => { setShowDeleteModal(false); setDeleteConfirmName(''); }}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete {madrasah.name}</h3>
            <p className="delete-modal-warning">
              This will immediately revoke access for all users. All data (students, teachers, attendance, exams) will be soft-deleted and retained for <strong>30 days</strong> before permanent removal.
            </p>
            <p className="delete-modal-warning">
              During the 30-day window, the madrasah can be reinstated.
            </p>
            <label className="delete-modal-label">
              Type <strong>{madrasah.name}</strong> to confirm:
            </label>
            <input
              type="text"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder={madrasah.name}
              className="delete-modal-input"
              autoFocus
            />
            <div className="delete-modal-actions">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmName(''); }}
                className="btn secondary"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="btn danger"
                disabled={!nameMatches || deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Delete Madrasah'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MadrasahDetail;
