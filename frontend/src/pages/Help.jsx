
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import SEO from '../components/SEO';
import './Help.css';
import { authService } from '../services/auth.service';

// Helper: get user role and plan from localStorage (or authService)
function getUserContext() {
  let user = null;
  let plan = null;
  try {
    user = authService.getUser?.() || JSON.parse(localStorage.getItem('user'));
    plan = user?.madrasah?.pricingPlan || user?.madrasah?.plan || user?.plan || null;
  } catch (e) {}
  return {
    role: user?.role || null,
    plan: plan,
    madrasah: user?.madrasah || null,
    user,
  };
}

// Comprehensive help content for each role/plan
const helpContent = {
  admin: [
    {
      category: 'Dashboard Overview',
      items: [
        'The admin dashboard provides full control over your madrasah: manage sessions, semesters, classes, teachers, students, fees, reports, SMS, and more.',
        'Navigation is on the left sidebar. Use the top bar for quick actions and notifications.'
      ]
    },
    {
      category: 'Sessions & Semesters',
      items: [
        'Create and manage academic sessions (years) and semesters. Only one session and one semester can be active at a time.',
        'When activating a session/semester, all others are automatically deactivated.',
        'Semester dates must be within the parent session and cannot overlap.'
      ]
    },
    {
      category: 'Classes & Teachers',
      items: [
        'Create classes and assign teachers. Each class can have multiple teachers (e.g., for team teaching).',
        'Assign school days for each class (e.g., Monday, Wednesday).',
        'Teachers can only access their assigned classes.'
      ]
    },
    {
      category: 'Student Management',
      items: [
        'Add students individually or (on Plus/Enterprise) import in bulk from a spreadsheet.',
        'Each student can be assigned to a class and have parent/guardian contact info.',
        'Parents log in using their phone number and a password they create. If a parent forgets their password, the admin can reset it from the Students section.',
      ]
    },
    {
      category: 'Attendance Tracking',
      items: [
        'View class-level and individual student attendance, including dressing, behavior, and punctuality grades.',
        'Teachers record attendance daily for their assigned classes.',
        'Admins can edit any attendance record.'
      ]
    },
    {
      category: 'Exam Performance',
      items: [
        'View and analyze exam results by class, subject, and semester.',
        'Students are ranked using tie-aware ranking. Export results for printing/sharing.'
      ]
    },
    {
      category: 'Fee Tracking',
      items: [
        'Track student fees (Plus/Enterprise only). Record payments, view summaries, and export reports.',
        'Admins can record payments, view outstanding balances, and generate fee reports by class or semester.',
        'Auto fee calculation and schedules are available on Enterprise.',
        'Parents can view fee status and payment history in the parent portal (if enabled).',
      ]
    },
    {
      category: 'Planner & Holidays',
      items: [
        'Plan school terms, holidays, and schedule overrides. All changes are reflected in class schedules.'
      ]
    },
    {
      category: 'Parent Portal',
      items: [
        'On Plus/Enterprise, parents can log in to view their child’s attendance, grades, and exam results.',
        'Admins can reset parent access codes and view parent login activity.'
      ]
    },
    {
      category: 'Promotions & Rollovers',
      items: [
        'Promote students to the next class at the end of a session/semester.',
        'Bulk promotion and dropout tracking are available.'
      ]
    },
    {
      category: 'Subscription & Billing',
      items: [
        'Manage your plan and billing in Settings → Billing.',
        'Upgrade/downgrade at any time. Annual billing saves ~2 months.',
        'If a payment fails, you will receive an email notification and see a banner in your dashboard. Please update your payment method promptly to avoid service interruption.'
      ]
    },
    {
      category: 'Troubleshooting & Support',
      items: [
        'If you encounter issues, try refreshing the page or logging out and back in.',
        'For technical support, email support@e-daarah.com.'
      ]
    },
    {
      category: 'Plan Differences',
      items: [
        'Solo: 1 class, 1 teacher, up to 30 students. No parent portal, no fee tracking, and no bulk import. Designed for very small madrasahs or pilot use.',
        'Standard: Unlimited classes/teachers, no parent portal, no fee tracking.',
        'Plus: Adds parent portal, bulk import, fee tracking, analytics.',
        'Enterprise: Adds advanced analytics, auto fee schedules, multi-branch support.'
      ]
    }
  ],
  teacher: [
    {
      category: 'Dashboard Overview',
      items: [
        'Your dashboard shows assigned classes, today’s schedule, and quick links to take attendance or record exams.',
        'Navigation is on the left sidebar.'
      ]
    },
    {
      category: 'Class Assignment',
      items: [
        'You can only access classes assigned by your admin.',
        'If you’re missing a class, contact your admin.'
      ]
    },
    {
      category: 'Attendance Recording',
      items: [
        'Mark attendance for each student: Present, Absent, Late, or Excused.',
        'Grade dressing, behavior, and punctuality (if enabled).',
        'Bulk save attendance for the whole class.'
      ]
    },
    {
      category: 'Exam Recording',
      items: [
        'Record exam scores by class, subject, and exam type.',
        'Edit or delete exam records as needed.'
      ]
    },
    {
      category: 'Qur’an Tracker',
      items: [
        'If enabled, update each student’s Qur’an memorization or reading progress.'
      ]
    },
    {
      category: 'Reports & Exports',
      items: [
        'View exam results and attendance summaries for your classes.',
        'Export reports for printing or sharing.'
      ]
    },
    {
      category: 'Availability',
      items: [
        'Mark days you are unavailable. Admins will see this in their dashboard.'
      ]
    },
    {
      category: 'Settings',
      items: [
        'Update your password and profile info in Settings.'
      ]
    },
    {
      category: 'Plan Differences',
      items: [
        'Solo: 1 class, 1 teacher, basic features only.',
        'Standard: All core features except parent portal and fee tracking.',
        'Plus/Enterprise: Adds parent portal, fee tracking, Qur’an tracker, analytics.'
      ]
    },
    {
      category: 'Troubleshooting & Support',
      items: [
        'If you have trouble accessing a class or feature, contact your admin.',
        'For technical support, email support@e-daarah.com.'
      ]
    }
  ]
};

function Help() {
  const [openSections, setOpenSections] = useState({});
  const location = useLocation();
  const { role, plan } = getUserContext();

  // Pick help content based on role (default to admin)
  const sections = helpContent[role === 'teacher' ? 'teacher' : 'admin'];

  const toggleSection = (idx) => {
    setOpenSections((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="help-page">
      <SEO
        title="Help & FAQ — e-Daarah"
        description="Comprehensive help for all admin and teacher dashboard features, including plan differences."
      />
      <div className="help-container">
        <Link to="/" className="help-back">← Back to Home</Link>

        <div className="help-header">
          <h1>Help Center</h1>
          <p>
            {role === 'teacher'
              ? 'Find answers to common questions about using your teacher dashboard.'
              : 'Find answers to common questions about managing your madrasah as an admin.'}
          </p>
        </div>

        <div className="help-contact-banner">
          <p>Can't find what you're looking for?</p>
          <a href="mailto:support@e-daarah.com">Contact Support</a>
        </div>

        <div className="help-content">
          {sections.map((section, idx) => (
            <section key={idx} className="help-section">
              <button
                className="faq-question"
                onClick={() => toggleSection(idx)}
                aria-expanded={!!openSections[idx]}
                style={{ fontWeight: 600, fontSize: '16px', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '12px 0', cursor: 'pointer' }}
              >
                {section.category}
                <span className="faq-icon" style={{ float: 'right' }}>{openSections[idx] ? '−' : '+'}</span>
              </button>
              {openSections[idx] && (
                <ul className="faq-list" style={{ marginLeft: 0, paddingLeft: 16 }}>
                  {section.items.map((item, i) => (
                    <li key={i} style={{ marginBottom: 8, fontSize: '15px', color: 'var(--gray)' }}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <div className="help-footer">
          <div className="help-footer-contact">
            <h3>Still need help?</h3>
            <p>Our support team is here to assist you.</p>
            <a href="mailto:support@e-daarah.com" className="help-email-btn">
              Email Support
            </a>
          </div>
        </div>

        <div className="help-links">
          <Link to="/">Home</Link>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/privacy">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}

export default Help;
