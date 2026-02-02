import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import api from '../../services/api';
import '../admin/Dashboard.css';

function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [myClasses, setMyClasses] = useState([]);
  const user = authService.getCurrentUser();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const classesRes = await api.get('/teacher/my-classes').catch(() => ({ data: [] }));
      setMyClasses(classesRes.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <div className="admin-layout">
      <header className="topbar">
        <div className="topbar-left">
          <h1>Madrasah Admin - Teacher</h1>
        </div>
        <div className="topbar-right">
          <span className="user-name">{user?.name}</span>
          <button onClick={handleLogout} className="logout">Logout</button>
        </div>
      </header>

      <div className="content-wrapper">
        <aside className="sidenav">
          <button 
            className={activeTab === 'overview' ? 'active' : ''}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={activeTab === 'classes' ? 'active' : ''}
            onClick={() => setActiveTab('classes')}
          >
            My Classes
          </button>
          <button 
            className={activeTab === 'attendance' ? 'active' : ''}
            onClick={() => setActiveTab('attendance')}
          >
            Attendance
          </button>
        </aside>

        <main className="main-area">
          {activeTab === 'overview' && (
            <div>
              <h2>Overview</h2>
              <div className="stats">
                <div className="stat-box">
                  <div className="stat-number">{myClasses.length}</div>
                  <div className="stat-label">My Classes</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'classes' && (
            <div>
              <div className="section-header">
                <h2>My Classes</h2>
              </div>

              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Class Name</th>
                      <th>School Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myClasses.map(cls => {
                      let schoolDays = 'Not set';
                      try {
                        if (cls.school_days) {
                          const days = typeof cls.school_days === 'string' 
                            ? JSON.parse(cls.school_days) 
                            : cls.school_days;
                          schoolDays = Array.isArray(days) ? days.join(', ') : 'Not set';
                        }
                      } catch (error) {
                        console.error('Error parsing school_days:', error);
                      }
                      
                      return (
                        <tr key={cls.id}>
                          <td>{cls.name}</td>
                          <td>{schoolDays}</td>
                        </tr>
                      );
                    })}
                    {myClasses.length === 0 && (
                      <tr>
                        <td colSpan="2" style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                          No classes assigned yet. Contact admin to assign you to classes.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div>
              <h2>Attendance</h2>
              <p style={{ color: '#666' }}>Select a class from "My Classes" to record attendance.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default TeacherDashboard;
