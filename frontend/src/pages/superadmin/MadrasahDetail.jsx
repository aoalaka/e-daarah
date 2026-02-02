import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import './SuperAdmin.css';

function MadrasahDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('superAdminToken');
    if (!token) {
      navigate('/superadmin/login');
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
      setSelectedPlan(response.data.madrasah.subscription_plan);
    } catch (error) {
      if (error.response?.status === 401) {
        navigate('/superadmin/login');
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

  if (loading) return <div className="superadmin"><p>Loading...</p></div>;
  if (!data) return <div className="superadmin"><p>Madrasah not found</p></div>;

  const { madrasah, users, studentCount, recentActivity } = data;

  return (
    <div className="superadmin">
      <header className="superadmin-header">
        <div className="header-left">
          <Link to="/superadmin/dashboard" className="back-link">← Back</Link>
          <h1>{madrasah.name}</h1>
        </div>
      </header>

      <main className="superadmin-main">
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
                {madrasah.suspended_at ? (
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
              <span>{studentCount} / {madrasah.max_students}</span>
            </div>
          </div>

          {madrasah.suspended_at && (
            <div className="suspended-notice">
              <strong>Suspended:</strong> {madrasah.suspended_reason}
              <br />
              <small>Since: {new Date(madrasah.suspended_at).toLocaleString()}</small>
            </div>
          )}
        </section>

        {/* Plan Management */}
        <section className="detail-section">
          <h2>Subscription</h2>
          <div className="plan-manager">
            <select value={selectedPlan} onChange={(e) => setSelectedPlan(e.target.value)}>
              <option value="starter">Starter ($29/mo)</option>
              <option value="professional">Professional ($79/mo)</option>
              <option value="enterprise">Enterprise (Custom)</option>
            </select>
            <button
              onClick={handleUpdatePlan}
              className="btn primary"
              disabled={selectedPlan === madrasah.subscription_plan}
            >
              Update Plan
            </button>
          </div>
        </section>

        {/* Actions */}
        <section className="detail-section">
          <h2>Actions</h2>
          <div className="action-buttons">
            {madrasah.suspended_at ? (
              <button onClick={handleReactivate} className="btn success">
                Reactivate Madrasah
              </button>
            ) : (
              <button onClick={handleSuspend} className="btn danger">
                Suspend Madrasah
              </button>
            )}
          </div>
        </section>

        {/* Users */}
        <section className="detail-section">
          <h2>Users ({users.length})</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.first_name} {user.last_name}</td>
                  <td>{user.email}</td>
                  <td><span className={`role-badge ${user.role}`}>{user.role}</span></td>
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
            <p className="empty">No recent activity</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>User Type</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((log) => (
                  <tr key={log.id}>
                    <td>{log.action}</td>
                    <td>{log.resource}</td>
                    <td>{log.user_type}</td>
                    <td>{new Date(log.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}

export default MadrasahDetail;
