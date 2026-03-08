import { useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import './Help.css';

const faqs = [
  {
    category: 'Getting Started',
    questions: [
      {
        q: 'How do I create my madrasah account?',
        a: 'Click "Get Started" on the homepage and fill in your madrasah details including name, location, and institution type. You will receive a verification email to confirm your account. Once verified, you can log in and start setting up your madrasah.'
      },
      {
        q: 'What happens during the 14-day free trial?',
        a: 'During your trial, you have full access to all features including the parent portal. You can add students, teachers, track attendance, and record exams. After 14 days, you will need to subscribe to continue using the service.'
      },
      {
        q: 'How do I add teachers?',
        a: 'There are two ways. As an admin, go to your dashboard and add a teacher with their name, email, and staff ID \u2014 they will get a default password matching their staff ID. Alternatively, teachers can self-register using your madrasah registration link, where they set their own password and receive an auto-generated staff ID.'
      },
      {
        q: 'What is the Solo plan?',
        a: 'The Solo plan is designed for very small madrasahs or pilot use. It supports 1 class, 1 teacher, and up to 30 students. It includes basic attendance tracking, Quran progress, fee tracking, and a simple dashboard. It does not include the parent portal, bulk import, or advanced analytics.'
      }
    ]
  },
  {
    category: 'Sessions & Semesters',
    questions: [
      {
        q: 'How do sessions and semesters work?',
        a: 'Sessions represent academic years (e.g., 2025/2026) and semesters are terms within a session. Only one session and one semester can be active at a time. When you activate one, all others are automatically deactivated.'
      },
      {
        q: 'Can semester dates overlap?',
        a: 'No. Semester dates must be within the parent session date range and cannot overlap with other semesters in the same session.'
      }
    ]
  },
  {
    category: 'Classes & Teachers',
    questions: [
      {
        q: 'How do I create a class and assign teachers?',
        a: 'Go to the Classes section in your admin dashboard. Create a class with a name and assign school days (e.g., Monday, Wednesday). Then assign one or more teachers to the class. Teachers will only see their assigned classes.'
      },
      {
        q: 'Can a class have more than one teacher?',
        a: 'Yes. You can assign multiple teachers to the same class, which is useful for team teaching or subject-based assignments.'
      }
    ]
  },
  {
    category: 'Student Management',
    questions: [
      {
        q: 'How do I enroll a new student?',
        a: 'From the admin dashboard, go to the Students section and click "Add Student". Enter their first name, last name, gender, and a unique student ID. You can also add parent/guardian contact details, assign them to a class, and add notes.'
      },
      {
        q: 'Can I import students from a spreadsheet?',
        a: 'Bulk student upload is available on the Plus plan and above. On the Standard and Solo plans, students are added individually through the dashboard.'
      },
      {
        q: 'How do I promote students to the next class?',
        a: 'Go to the Students section and use the Promotion tool. Select the source class, choose students to promote, and pick the destination class. Bulk promotion and dropout tracking are also available.'
      }
    ]
  },
  {
    category: 'Parent Portal & Access',
    questions: [
      {
        q: "How do parents access their child's information?",
        a: "On Plus and Enterprise plans, parents log in to the parent portal using their phone number and a password they create during first login. They can view their child's attendance records, dressing and behavior performance, exam results, and fee status. They can also filter by semester."
      },
      {
        q: 'What if a parent forgets their password?',
        a: "The admin can reset a parent's password from the Students section in the admin dashboard. The parent will then be able to create a new password on the login page."
      },
      {
        q: 'Is the parent portal available on all plans?',
        a: 'No. The parent portal is available on the Plus and Enterprise plans only. It is not included in the Solo or Standard plans.'
      }
    ]
  },
  {
    category: 'Attendance',
    questions: [
      {
        q: 'How do I mark attendance?',
        a: "Teachers select a class and date from their dashboard, then mark each student as present or absent. For present students, you can also rate their dressing, behavior, and punctuality (Excellent, Good, Fair, or Poor) depending on your madrasah's settings. For absent students, select a reason (Sick, Parent Request, School Not Notified, or Other). Save all records at once with bulk save."
      },
      {
        q: 'Can I edit past attendance records?',
        a: 'Yes, you can edit attendance for any past date by selecting it from the date picker. Simply update the records and save. Note that attendance cannot be recorded for future dates.'
      },
      {
        q: 'How do I view attendance reports?',
        a: 'Admins can view class-level attendance from the dashboard. For individual students, click on a student to see their complete attendance history, including attendance rate, dressing and behavior performance summaries, and punctuality trends filtered by semester.'
      }
    ]
  },
  {
    category: 'Exams & Results',
    questions: [
      {
        q: 'How do I record exam results?',
        a: "From the teacher dashboard, select a class and go to the Exams section. Enter the subject name, exam date, and maximum score, then enter each student's score. All scores are saved in bulk. You can also mark students as absent with a reason instead of entering a score."
      },
      {
        q: 'How are results calculated?',
        a: 'Results are calculated as a percentage of the score obtained versus the maximum score. Students are ranked within their class using tie-aware ranking \u2014 students with the same percentage share the same rank.'
      },
      {
        q: 'How do I view student reports?',
        a: "Admins can view a detailed report for any student from the Students section. The report shows attendance statistics, dressing and behavior performance, exam results by subject, and overall ranking. You can filter by semester. Parents on the Plus plan can also view their child's report through the parent portal."
      }
    ]
  },
  {
    category: 'Fee Tracking',
    questions: [
      {
        q: 'How does fee tracking work?',
        a: 'Fee tracking is available on the Plus and Enterprise plans. Admins can set expected fees per student, record payments, view outstanding balances, and generate fee reports by class or semester.'
      },
      {
        q: 'Can parents see fee information?',
        a: "Yes. On Plus and Enterprise plans, parents can view their child's fee status and payment history in the parent portal (if fee tracking is enabled by the admin)."
      },
      {
        q: 'What is auto fee calculation?',
        a: 'On the Enterprise plan, admins can set up automatic fee schedules (per semester or custom billing cycles) that automatically generate fee records for students. This eliminates the need to manually set fees each term.'
      }
    ]
  },
  {
    category: 'Planner & Holidays',
    questions: [
      {
        q: 'How do I manage holidays and schedule overrides?',
        a: 'From the Planner section, select a session to view its calendar. You can add holidays (date ranges when no attendance is expected) and schedule overrides (temporary changes to school days). All changes are reflected in class schedules and attendance tracking.'
      }
    ]
  },
  {
    category: 'Billing & Subscription',
    questions: [
      {
        q: 'What payment methods do you accept?',
        a: 'We accept all major credit and debit cards through our secure payment processor, Stripe. This includes Visa, Mastercard, and American Express.'
      },
      {
        q: 'How do I upgrade or change my plan?',
        a: 'Go to Settings \u2192 Billing in your admin dashboard to manage your subscription. You can upgrade from Standard to Plus or Enterprise at any time. Annual billing is also available and saves you roughly two months.'
      },
      {
        q: 'What happens if my payment fails?',
        a: 'If a payment fails, you will receive an email notification and a banner will appear on your dashboard. Please update your payment method promptly in Settings \u2192 Billing to avoid service interruption.'
      },
      {
        q: 'Can I get a refund?',
        a: 'Refunds are handled on a case-by-case basis. Please contact our support team at support@e-daarah.com with your request and we will work with you to find a solution.'
      }
    ]
  },
  {
    category: 'Plans & Features',
    questions: [
      {
        q: 'What is included in the Solo plan?',
        a: 'The Solo plan supports 1 class, 1 teacher, and up to 30 students. It includes basic attendance tracking, Quran progress, fee tracking, and a simple dashboard. It does not include the parent portal, bulk import, or advanced analytics. Designed for very small madrasahs or pilot use.'
      },
      {
        q: 'What is the difference between Standard and Plus?',
        a: 'Standard includes unlimited classes and teachers but does not include the parent portal, fee tracking, or bulk student import. Plus adds all of these features, plus analytics and SMS capabilities.'
      },
      {
        q: 'What extra features does Enterprise offer?',
        a: 'Enterprise includes everything in Plus, with the addition of advanced analytics, automatic fee schedules, and multi-branch support.'
      }
    ]
  },
  {
    category: 'Account & Security',
    questions: [
      {
        q: 'How do I reset my password?',
        a: 'Click "Forgot Password" on the login page and enter your email address. You will receive a link to create a new password. The link expires after 1 hour for security.'
      },
      {
        q: 'Why was my account locked?',
        a: 'Accounts are temporarily locked after 5 failed login attempts to protect against unauthorized access. Wait 15 minutes and try again, or reset your password.'
      },
      {
        q: 'How do I delete my account?',
        a: 'Contact our support team at support@e-daarah.com to request account deletion. Please note that this action is permanent and all data will be removed after a 30-day grace period.'
      }
    ]
  },
  {
    category: 'Troubleshooting',
    questions: [
      {
        q: 'The page is not loading or showing errors. What should I do?',
        a: 'Try refreshing the page or logging out and back in. If the issue persists, clear your browser cache or try a different browser. For ongoing issues, contact support@e-daarah.com.'
      },
      {
        q: 'I cannot see a feature that should be available on my plan.',
        a: 'Make sure your subscription is active in Settings \u2192 Billing. Some features (like fee tracking and the parent portal) require the Plus or Enterprise plan. If you believe there is an error, contact support.'
      }
    ]
  }
];

function Help() {
  const [openItems, setOpenItems] = useState({});

  const toggleItem = (categoryIndex, questionIndex) => {
    const key = `${categoryIndex}-${questionIndex}`;
    setOpenItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="help-page">
      <SEO
        title="Help & FAQ &#8212; e-Daarah"
        description="Get help with e-Daarah. Frequently asked questions about attendance tracking, exam recording, parent access, fee tracking, and school management."
      />
      <div className="help-container">
        <Link to="/" className="help-back">&larr; Back to Home</Link>

        <div className="help-header">
          <h1>Help Center</h1>
          <p>Find answers to common questions about using e-Daarah</p>
        </div>

        <div className="help-contact-banner">
          <p>Can't find what you're looking for?</p>
          <a href="mailto:support@e-daarah.com">Contact Support</a>
        </div>

        <div className="help-content">
          {faqs.map((category, categoryIndex) => (
            <section key={categoryIndex} className="help-section">
              <h2>{category.category}</h2>
              <div className="faq-list">
                {category.questions.map((item, questionIndex) => {
                  const key = `${categoryIndex}-${questionIndex}`;
                  const isOpen = openItems[key];
                  return (
                    <div key={questionIndex} className={`faq-item ${isOpen ? 'open' : ''}`}>
                      <button
                        className="faq-question"
                        onClick={() => toggleItem(categoryIndex, questionIndex)}
                        aria-expanded={isOpen}
                      >
                        <span>{item.q}</span>
                        <span className="faq-icon">{isOpen ? '\u2212' : '+'}</span>
                      </button>
                      {isOpen && (
                        <div className="faq-answer">
                          <p>{item.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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
