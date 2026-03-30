import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  HomeIcon,
  CalendarIcon,
  BookOpenIcon,
  UsersIcon,
  UserGroupIcon,
  ArrowPathIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  QuestionMarkCircleIcon,
  ChatBubbleLeftIcon,
  ChatBubbleOvalLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  UserIcon,
  LockClosedIcon,
  Cog6ToothIcon,
  CreditCardIcon,
  ArrowRightStartOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { authService } from '../../services/auth.service';
import api from '../../services/api';
import EmailVerificationBanner from '../../components/EmailVerificationBanner';
import DemoBanner from '../../components/DemoBanner';
import TrialBanner from '../../components/TrialBanner';
import AnnouncementBanner from '../../components/AnnouncementBanner';
import VerifiedBadge from '../../components/VerifiedBadge';
import GuidedTour from '../../components/GuidedTour';
import BottomTabBar from '../../components/BottomTabBar';
import { cacheData, getCachedData } from '../../utils/offlineStore';
import OfflineBanner from '../../components/OfflineBanner';
import './Dashboard.css';
import HelpSection from './sections/HelpSection';
import SupportSection from './sections/SupportSection';
import PlannerSection from './sections/PlannerSection';
import OverviewSection from './sections/OverviewSection';
import ClassesSection from './sections/ClassesSection';
import TeachersSection from './sections/TeachersSection';
import SmsSection from './sections/SmsSection';
import StudentsSection from './sections/StudentsSection';
import FeesSection from './sections/FeesSection';
import ReportsSection from './sections/ReportsSection';
import SettingsSection from './sections/SettingsSection';

function AdminDashboard() {
  // Format date as "01 Sep 2025"
  const fmtDate = (d) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const [activeTab, setActiveTab] = useState('overview');
  const [sessions, setSessions] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const initialLoadDone = useRef(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const [reportSemester, setReportSemester] = useState('');
  const [reportSubTab, setReportSubTab] = useState('attendance');
  const [reportFilterSession, setReportFilterSession] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);
  // Settings state
  const [savingSettings, setSavingSettings] = useState(false);
  const [madrasahProfile, setMadrasahProfile] = useState(null);
  // Fee tracking state
  const [helpExpanded, setHelpExpanded] = useState(new Set());
  const [showTour, setShowTour] = useState(false);
  const user = authService.getCurrentUser();
  const navigate = useNavigate();
  const { madrasahSlug } = useParams();

  // Close mobile menu when tab changes
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Helper to check if user has Plus-level access (Plus plan OR active trial)
  const hasPlusAccess = () => {
    if (!madrasahProfile) return false;
    const plan = madrasahProfile.pricing_plan;
    const status = madrasahProfile.subscription_status;
    // Plus and enterprise plans have access
    if (plan === 'plus' || plan === 'enterprise') return true;
    // Active trial users get Plus-level access
    if (status === 'trialing') {
      const trialEndsAt = madrasahProfile.trial_ends_at;
      if (!trialEndsAt) return true; // No end date means trial is active
      return new Date(trialEndsAt) > new Date();
    }
    return false;
  };

  // Helper to check if the account is in read-only mode (expired trial or inactive subscription)
  const formatCurrency = (amount) => {
    const cur = madrasahProfile?.currency || 'USD';
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur }).format(amount); }
    catch { return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(amount); }
  };

  const isReadOnly = () => {
    if (!madrasahProfile) return false;
    const status = madrasahProfile.subscription_status;
    // Expired trial = read-only
    if (status === 'trialing') {
      const trialEndsAt = madrasahProfile.trial_ends_at;
      if (trialEndsAt && new Date(trialEndsAt) <= new Date()) return true;
    }
    // Canceled, expired, or past due subscription = read-only
    if (status === 'canceled' || status === 'expired' || status === 'past_due') return true;
    return false;
  };

  const navGroups = [
    { items: [{ id: 'overview', label: 'Overview' }] },
    { label: 'Manage', items: [
      { id: 'classes', label: 'Classes' },
      { id: 'teachers', label: 'Teachers' },
      { id: 'students', label: 'Students' },
      ...(madrasahProfile?.enable_fee_tracking ? [{ id: 'fees', label: 'Fees' }] : []),
    ]},
    { label: 'Tools', items: [
      { id: 'planner', label: 'Planner' },
      ...(hasPlusAccess() ? [{ id: 'reports', label: 'Reports' }] : []),
      { id: 'sms', label: 'SMS' },
    ]},
    { label: 'Help', items: [
      { id: 'help', label: 'Help' },
      { id: 'support', label: 'Support' },
    ]},
  ];

  // Primary tabs for mobile bottom bar
  const bottomTabIds = ['overview', 'students', 'classes', ...(madrasahProfile?.enable_fee_tracking ? ['fees'] : ['reports'])];
  const isBottomTab = bottomTabIds.includes(activeTab);

  useEffect(() => {
    loadData();
    // Handle ?tab=sms&purchase=success from Stripe redirect
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const purchase = params.get('purchase');
    if (tab === 'sms') {
      setActiveTab('sms');
      if (purchase === 'success') {
        toast.success('SMS credits purchased successfully!');
      } else if (purchase === 'cancelled') {
        toast.info('SMS credit purchase was cancelled.');
      }
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Update browser tab title based on active tab
  useEffect(() => {
    const labels = { overview: 'Overview', classes: 'Classes', teachers: 'Teachers', students: 'Students', fees: 'Fees', planner: 'Planner', reports: 'Reports', sms: 'SMS', help: 'Help', support: 'Support', settings: 'Settings' };
    document.title = `${labels[activeTab] || 'Dashboard'} — E-Daarah`;
  }, [activeTab]);

  // Keyboard shortcut: "/" to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        const input = document.querySelector('.table-search-input') || document.querySelector('.mobile-cards-search input');
        input?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-trigger guided tour for first-time users
  useEffect(() => {
    if (!loading && !localStorage.getItem('tour_admin_done')) {
      const timer = setTimeout(() => setShowTour(true), 800);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const adminTourSteps = [
    { target: '.sidebar-nav', title: 'Navigation', content: 'Use the sidebar to switch between sections.' },
    { target: '.setup-checklist', title: 'Getting Started', content: 'Follow these steps to set up your school. Each step links to the right page.' },
    { target: '.insights-summary', title: 'Key Metrics', content: 'See attendance rates, students needing attention, and performance at a glance.' },
    { target: '.alert-panel', title: "Today's Status", content: 'Check if there are pending tasks like unmarked attendance or missing exams.' },
    { target: '.overview-actions', title: 'Quick Actions', content: 'Jump to creating a session, class, or student.' },
    { target: '[data-tour="planner"]', title: 'Academic Planner', content: 'Set up your academic year: sessions, semesters, and holidays.' },
    { target: '[data-tour="students"]', title: 'Students', content: 'Add students individually or bulk-upload from a spreadsheet.' },
    { target: '.sidebar-footer', title: 'Your Profile', content: 'Access settings, billing, and log out from here.' },
  ];

  const loadData = async () => {
    if (!initialLoadDone.current) setLoading(true);
    try {
      const [sessionsRes, semestersRes, classesRes, teachersRes, studentsRes, profileRes] = await Promise.all([
        api.get('/admin/sessions'),
        api.get('/admin/semesters'),
        api.get('/classes'),
        api.get('/admin/teachers'),
        api.get('/admin/students'),
        api.get('/admin/profile')
      ]);
      const sessionsData = sessionsRes.data || [];
      const semestersData = semestersRes.data || [];

      setSessions(sessionsData);
      setSemesters(semestersData);
      setClasses(classesRes.data || []);
      setTeachers(teachersRes.data || []);
      setStudents(studentsRes.data || []);
      setMadrasahProfile(profileRes.data);

      cacheData('admin-sessions', sessionsData);
      cacheData('admin-semesters', semestersData);
      cacheData('admin-classes', classesRes.data || []);
      cacheData('admin-teachers', teachersRes.data || []);
      cacheData('admin-students', studentsRes.data || []);
      if (profileRes.data) cacheData('admin-profile', profileRes.data);

      // Set default filters to active session and semester
      const activeSession = sessionsData.find(s => s.is_active);
      const activeSemester = semestersData.find(s => s.is_active);

      if (activeSession) {
        setReportFilterSession(String(activeSession.id));
      }
      if (activeSemester) {
        setReportSemester(String(activeSemester.id));
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      if (!error.response) {
        const [cSessions, cSemesters, cClasses, cTeachers, cStudents, cProfile] = await Promise.all([
          getCachedData('admin-sessions'),
          getCachedData('admin-semesters'),
          getCachedData('admin-classes'),
          getCachedData('admin-teachers'),
          getCachedData('admin-students'),
          getCachedData('admin-profile')
        ]);
        if (cSessions) setSessions(cSessions.data);
        if (cSemesters) setSemesters(cSemesters.data);
        if (cClasses) setClasses(cClasses.data);
        if (cTeachers) setTeachers(cTeachers.data);
        if (cStudents) setStudents(cStudents.data);
        if (cProfile) setMadrasahProfile(cProfile.data);
      }
    } finally {
      setLoading(false);
      initialLoadDone.current = true;
    }
  };

  const handleLogout = () => {
    const user = authService.getCurrentUser();
    const isDemo = user?.isDemo;
    authService.logout();
    navigate(isDemo ? '/demo' : `/${madrasahSlug}/login`);
  };

  // Close profile dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNavIcon = (id) => {
    const iconProps = { width: 18, height: 18, style: { minWidth: '18px' } };

    switch(id) {
      case 'overview':
        return <HomeIcon {...iconProps} />;
      case 'planner':
        return <CalendarIcon {...iconProps} />;
      case 'classes':
        return <BookOpenIcon {...iconProps} />;
      case 'teachers':
        return <UsersIcon {...iconProps} />;
      case 'students':
        return <UserGroupIcon {...iconProps} />;
      case 'promotion':
        return <ArrowPathIcon {...iconProps} />;
      case 'reports':
        return <ChartBarIcon {...iconProps} />;
      case 'fees':
        return <CurrencyDollarIcon {...iconProps} />;
      case 'help':
        return <QuestionMarkCircleIcon {...iconProps} />;
      case 'support':
        return <ChatBubbleLeftIcon {...iconProps} />;
      case 'sms':
        return <ChatBubbleOvalLeftIcon {...iconProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="dashboard">
      {/* Mobile Sidebar Overlay */}
      <div
        className={`sidebar-overlay ${mobileMenuOpen ? 'visible' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Sidebar - Dark Theme */}
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <img src="/e-daarah-blackbg-logo.png" alt="E-Daarah" className="sidebar-logo-img" />
          <span className="sidebar-logo-text">E-Daarah</span>
          <button 
            className="sidebar-collapse-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label="Toggle sidebar"
          >
            {sidebarCollapsed ? <ChevronRightIcon width={16} height={16} /> : <ChevronLeftIcon width={16} height={16} />}
          </button>
        </div>
        <nav className="sidebar-nav">
          {navGroups.map((group, gi) => (
            <div key={gi} className="nav-group">
              {group.label && !sidebarCollapsed && <div className="nav-group-label">{group.label}</div>}
              {gi > 0 && sidebarCollapsed && <div className="nav-group-divider" />}
              {group.items.map(item => (
                <button
                  key={item.id}
                  data-tour={item.id}
                  className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => handleTabChange(item.id)}
                >
                  {getNavIcon(item.id)}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer" ref={profileDropdownRef}>
          <div className="sidebar-user" onClick={() => setProfileDropdownOpen(!profileDropdownOpen)} style={{ cursor: 'pointer' }}>
            <div className="user-avatar">
              {user?.firstName?.charAt(0) || 'A'}
            </div>
            <div className="user-info">
              <div className="user-name">{user?.firstName} {user?.lastName}</div>
              <div className="user-role">{user?.role || 'Admin'}</div>
            </div>
            <ChevronUpIcon width={16} height={16} style={{ opacity: 0.5, transform: profileDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </div>
          {profileDropdownOpen && (
            <div className="profile-dropdown">
              <div className="profile-dropdown-header">
                <div className="user-avatar" style={{ width: 36, height: 36, minWidth: 36, fontSize: 14 }}>
                  {user?.firstName?.charAt(0) || 'A'}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.firstName} {user?.lastName}</div>
                  <div style={{ fontSize: 11, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
                </div>
              </div>
              <div className="profile-dropdown-divider" />
              <button className="profile-dropdown-item" onClick={() => { handleTabChange('settings'); setProfileDropdownOpen(false); setTimeout(() => document.getElementById('settings-account')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }}>
                <UserIcon width={16} height={16} />
                Account
              </button>
              <button className="profile-dropdown-item" onClick={() => { handleTabChange('settings'); setProfileDropdownOpen(false); setTimeout(() => document.getElementById('settings-password')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }}>
                <LockClosedIcon width={16} height={16} />
                Change Password
              </button>
              <button className="profile-dropdown-item" onClick={() => { handleTabChange('settings'); setProfileDropdownOpen(false); }}>
                <Cog6ToothIcon width={16} height={16} />
                Settings
              </button>
              <button className="profile-dropdown-item" onClick={() => { handleTabChange('settings'); setProfileDropdownOpen(false); setTimeout(() => document.getElementById('settings-billing')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }}>
                <CreditCardIcon width={16} height={16} />
                Billing
              </button>
              <div className="profile-dropdown-divider" />
              <button className="profile-dropdown-item logout" onClick={handleLogout}>
                <ArrowRightStartOnRectangleIcon width={16} height={16} />
                Log out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Wrapper */}
      <div className={`main-wrapper ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Header */}
        <header className="header">
          <div className="header-left">
            <button
              className={`menu-toggle ${mobileMenuOpen ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <span className="menu-toggle-icon">
                <span></span>
                <span></span>
                <span></span>
              </span>
            </button>
            <span className="header-title">
              {madrasahProfile?.name || 'Dashboard'}
              {madrasahProfile?.verification_status === 'verified' && <VerifiedBadge size={16} />}
            </span>
          </div>
          <div className="header-actions">
          </div>
        </header>

        {/* Email Verification Banner */}
        <EmailVerificationBanner />

        {/* Demo Banner */}
        <DemoBanner />

        {/* Trial Banner */}
        <TrialBanner
          trialEndsAt={madrasahProfile?.trial_ends_at}
          subscriptionStatus={madrasahProfile?.subscription_status}
          pricingPlan={madrasahProfile?.pricing_plan}
          onSubscribe={() => {
            handleTabChange('settings');
            setTimeout(() => document.getElementById('settings-billing')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
          }}
        />

        {/* Platform Announcements */}
        <AnnouncementBanner />

        {/* Offline Banner */}
        <OfflineBanner />

        {/* Read-Only Warning Banner */}
        {isReadOnly() && (
          <div className="no-print" style={{
            background: '#f5f5f5', color: '#525252', padding: '12px 20px',
            borderBottom: '1px solid #e5e5e5', textAlign: 'center', fontWeight: 500, fontSize: '14px'
          }}>
            ⚠️ {madrasahProfile?.subscription_status === 'trialing' ? 'Your trial has expired' : madrasahProfile?.subscription_status === 'past_due' ? 'Your payment is past due' : 'Your subscription is inactive'}. 
            Your account is in read-only mode.{' '}
            <button style={{ background: 'none', border: 'none', color: '#0f172a', textDecoration: 'underline', fontWeight: 600, cursor: 'pointer', fontSize: '14px', padding: 0 }}
              onClick={() => { handleTabChange('settings'); setTimeout(() => document.getElementById('settings-billing')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150); }}>
              {madrasahProfile?.subscription_status === 'past_due' ? 'Update payment method' : 'Subscribe now'}
            </button> to make changes.
          </div>
        )}

        {/* Main Content */}
        <main className="main tab-content" key={activeTab}>
          {loading && activeTab !== 'overview' && activeTab !== 'help' && activeTab !== 'settings' ? (
            <div className="stats-grid">
              {[1,2,3,4].map(i => (
                <div key={i} className="stat-card">
                  <div className="skeleton skeleton-text" style={{ width: '60%', height: '20px', marginBottom: '8px' }} />
                  <div className="skeleton skeleton-text short" style={{ height: '14px' }} />
                </div>
              ))}
            </div>
          ) : (
          <>
          {activeTab === 'overview' && <OverviewSection sessions={sessions} semesters={semesters} classes={classes} students={students} teachers={teachers} madrasahProfile={madrasahProfile} hasPlusAccess={hasPlusAccess} isReadOnly={isReadOnly} fmtDate={fmtDate} setShowTour={setShowTour} setActiveTab={setActiveTab} setReportSubTab={setReportSubTab} pendingAppCount={0} reportSemester={reportSemester} user={user} />}

          {/* Planner Tab */}
          {activeTab === 'planner' && <PlannerSection sessions={sessions} setSessions={setSessions} semesters={semesters} setSemesters={setSemesters} classes={classes} isReadOnly={isReadOnly} fmtDate={fmtDate} madrasahProfile={madrasahProfile} setConfirmModal={setConfirmModal} loadData={loadData} />}

          {/* Classes Tab */}
          {activeTab === 'classes' && (
            <ClassesSection
              classes={classes}
              setClasses={setClasses}
              teachers={teachers}
              weekDays={weekDays}
              isReadOnly={isReadOnly}
              fmtDate={fmtDate}
              setConfirmModal={setConfirmModal}
              madrasahProfile={madrasahProfile}
              loadData={loadData}
              setActiveTab={setActiveTab}
            />
          )}

          {/* Teachers Tab */}
          {activeTab === 'teachers' && (
            <TeachersSection
              teachers={teachers}
              setTeachers={setTeachers}
              classes={classes}
              weekDays={weekDays}
              isReadOnly={isReadOnly}
              fmtDate={fmtDate}
              setConfirmModal={setConfirmModal}
              madrasahProfile={madrasahProfile}
              loadData={loadData}
              setActiveTab={setActiveTab}
              sessions={sessions}
            />
          )}

          {/* Students Tab */}
          {activeTab === 'students' && (
            <StudentsSection
              students={students}
              setStudents={setStudents}
              classes={classes}
              sessions={sessions}
              semesters={semesters}
              madrasahProfile={madrasahProfile}
              isReadOnly={isReadOnly}
              hasPlusAccess={hasPlusAccess}
              fmtDate={fmtDate}
              setConfirmModal={setConfirmModal}
              loadData={loadData}
              setActiveTab={setActiveTab}
            />
          )}

          {/* Fees Tab */}
          {activeTab === 'fees' && <FeesSection students={students} setStudents={setStudents} classes={classes} sessions={sessions} semesters={semesters} madrasahProfile={madrasahProfile} isReadOnly={isReadOnly} formatCurrency={formatCurrency} fmtDate={fmtDate} setConfirmModal={setConfirmModal} />}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <ReportsSection
              classes={classes}
              sessions={sessions}
              semesters={semesters}
              students={students}
              teachers={teachers}
              madrasahProfile={madrasahProfile}
              hasPlusAccess={hasPlusAccess}
              isReadOnly={isReadOnly}
              fmtDate={fmtDate}
              setConfirmModal={setConfirmModal}
              reportSubTab={reportSubTab}
              setReportSubTab={setReportSubTab}
              reportSemester={reportSemester}
              setReportSemester={setReportSemester}
              reportFilterSession={reportFilterSession}
              setReportFilterSession={setReportFilterSession}
            />
          )}

          {/* Help Tab */}
          {activeTab === 'help' && <HelpSection helpExpanded={helpExpanded} setHelpExpanded={setHelpExpanded} madrasahProfile={madrasahProfile} hasPlusAccess={hasPlusAccess} setShowTour={setShowTour} />}

          {/* Support Tab */}
          {activeTab === 'support' && <SupportSection fmtDate={fmtDate} />}

          {/* SMS Tab */}
          {activeTab === 'sms' && <SmsSection classes={classes} madrasahProfile={madrasahProfile} setMadrasahProfile={setMadrasahProfile} savingSettings={savingSettings} setSavingSettings={setSavingSettings} formatCurrency={formatCurrency} fmtDate={fmtDate} />}

          {/* Settings Tab */}
          {activeTab === 'settings' && <SettingsSection madrasahProfile={madrasahProfile} setMadrasahProfile={setMadrasahProfile} user={user} fmtDate={fmtDate} isReadOnly={isReadOnly} hasPlusAccess={hasPlusAccess} sessions={sessions} setConfirmModal={setConfirmModal} />}
          </>
          )}

        </main>
      </div>


      <GuidedTour
        steps={adminTourSteps}
        isOpen={showTour}
        onComplete={() => { setShowTour(false); localStorage.setItem('tour_admin_done', 'true'); }}
        onSkip={() => { setShowTour(false); localStorage.setItem('tour_admin_done', 'true'); }}
      />

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{confirmModal.title}</h3>
              <button onClick={() => setConfirmModal(null)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '14px', color: '#525252', lineHeight: 1.6 }}>{confirmModal.message}</p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setConfirmModal(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }} className={`btn ${confirmModal.danger ? 'btn-danger' : 'btn-primary'}`}>
                {confirmModal.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Tab Bar */}
      <BottomTabBar
        tabs={bottomTabIds.map(id => {
          const iconProps = { width: 20, height: 20 };
          const icons = {
            overview: <HomeIcon {...iconProps} />,
            students: <UserGroupIcon {...iconProps} />,
            classes: <BookOpenIcon {...iconProps} />,
            fees: <CurrencyDollarIcon {...iconProps} />,
            reports: <ChartBarIcon {...iconProps} />,
          };
          const labels = { overview: 'Home', students: 'Students', classes: 'Classes', fees: 'Fees', reports: 'Reports' };
          return { id, label: labels[id] || id, icon: icons[id] };
        })}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onMoreClick={() => setMobileMenuOpen(true)}
        moreActive={!isBottomTab}
      />
    </div>
  );
}

export default AdminDashboard;
