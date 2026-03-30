import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import api from '../../../services/api';
import '../Dashboard.css';

function SupportSection({ fmtDate }) {
  const [supportTickets, setSupportTickets] = useState([]);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: '', message: '', priority: 'normal' });
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [ticketReply, setTicketReply] = useState('');

  const fetchTickets = async () => {
    try {
      const response = await api.get('/admin/tickets');
      setSupportTickets(response.data || []);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/tickets', newTicket);
      setNewTicket({ subject: '', message: '', priority: 'normal' });
      setShowTicketForm(false);
      fetchTickets();
      toast.success('Ticket submitted successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create ticket');
    }
  };

  const handleViewTicket = async (id) => {
    try {
      const response = await api.get(`/admin/tickets/${id}`);
      setSelectedTicket(response.data.ticket);
      setTicketMessages(response.data.messages || []);
      setTicketReply('');
    } catch (error) {
      toast.error('Failed to load ticket');
    }
  };

  const handleReplyToTicket = async () => {
    if (!ticketReply.trim()) return;
    try {
      await api.post(`/admin/tickets/${selectedTicket.id}/reply`, { message: ticketReply });
      setTicketReply('');
      handleViewTicket(selectedTicket.id);
      fetchTickets();
    } catch (error) {
      toast.error('Failed to send reply');
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  return (
    <>
      <div className="section-header">
        <h2>Support</h2>
        <button className="btn btn-primary" onClick={() => setShowTicketForm(!showTicketForm)}>
          {showTicketForm ? 'Cancel' : '+ New Ticket'}
        </button>
      </div>

      <p className="support-intro">
        Need help? Submit a support ticket and our team will get back to you.
      </p>

      {showTicketForm && (
        <div className="card ticket-form">
          <form onSubmit={handleCreateTicket}>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Subject</label>
              <input
                className="form-input"
                type="text"
                value={newTicket.subject}
                onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                placeholder="Brief description of your issue"
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Priority</label>
              <select
                className="form-select"
                value={newTicket.priority}
                onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Message</label>
              <textarea
                className="form-textarea"
                value={newTicket.message}
                onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                placeholder="Describe your issue in detail..."
                rows={5}
                required
              />
            </div>
            <div className="form-actions" style={{ borderTop: 'none', marginTop: 0, paddingTop: 0, justifyContent: 'flex-start' }}>
              <button type="submit" className="btn btn-primary">Submit Ticket</button>
            </div>
          </form>
        </div>
      )}

      {selectedTicket ? (
        <div className="card">
          <button className="btn btn-secondary btn-sm" onClick={() => setSelectedTicket(null)} style={{ marginBottom: '16px' }}>
            ← Back to tickets
          </button>
          <div className="ticket-detail-header">
            <h3>{selectedTicket.subject}</h3>
            <div className="ticket-detail-meta">
              <span className={`ticket-status ticket-status-${selectedTicket.status}`}>
                {selectedTicket.status.replace('_', ' ')}
              </span>
              <span>{new Date(selectedTicket.created_at).toLocaleString()}</span>
            </div>
          </div>

          <div className="ticket-messages">
            {ticketMessages.map((msg) => (
              <div key={msg.id} className={`ticket-message ${msg.sender_type === 'super_admin' ? 'ticket-message-support' : 'ticket-message-user'}`}>
                <div className="ticket-message-header">
                  <strong>{msg.sender_type === 'super_admin' ? 'Support Team' : 'You'}</strong>
                  <span>{new Date(msg.created_at).toLocaleString()}</span>
                </div>
                <p className="ticket-message-body">{msg.message}</p>
              </div>
            ))}
          </div>

          {selectedTicket.status !== 'closed' && (
            <div className="ticket-reply-area">
              <textarea
                value={ticketReply}
                onChange={(e) => setTicketReply(e.target.value)}
                placeholder="Type your reply..."
                rows={3}
              />
              <button className="btn btn-primary" onClick={handleReplyToTicket} disabled={!ticketReply.trim()}>
                Send Reply
              </button>
            </div>
          )}
        </div>
      ) : supportTickets.length === 0 ? (
        <div className="card">
          <div className="empty">
            <p>No support tickets yet.</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>Click "+ New Ticket" to submit your first support request.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="table-wrap support-table-desktop">
              <table className="table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Messages</th>
                    <th>Updated</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {supportTickets.map((t) => (
                    <tr key={t.id}>
                      <td><strong>{t.subject}</strong></td>
                      <td>
                        <span className={`ticket-status ticket-status-${t.status}`}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="ticket-priority">{t.priority}</td>
                      <td>{t.message_count}</td>
                      <td style={{ fontSize: '13px', color: '#666' }}>{fmtDate(t.updated_at)}</td>
                      <td>
                        <button className="btn-sm btn-edit" onClick={() => handleViewTicket(t.id)}>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards for tickets */}
            <div className="support-mobile-cards">
              {supportTickets.map((t) => (
                <div key={t.id} className="admin-mobile-card">
                  <div className="admin-mobile-card-top">
                    <div>
                      <div className="admin-mobile-card-title">{t.subject}</div>
                      <div className="admin-mobile-card-sub">
                        {t.message_count} message{t.message_count !== 1 ? 's' : ''} · {fmtDate(t.updated_at)}
                      </div>
                    </div>
                    <span className={`ticket-status ticket-status-${t.status}`}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="admin-mobile-card-actions">
                    <button className="btn btn-sm btn-secondary" onClick={() => handleViewTicket(t.id)}>View</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default SupportSection;
