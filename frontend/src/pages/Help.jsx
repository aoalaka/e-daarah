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
        a: 'Click "Get Started" on the homepage and fill in your madrasah details including name, location, and institution type. You\'ll receive a verification email to confirm your account. Once verified, you can log in and start setting up your madrasah.'
      },
      {
        q: 'What happens during the 14-day free trial?',
        a: 'During your trial, you have full access to all features including the parent portal. You can add students, teachers, track attendance, and record exams. After 14 days, you\'ll need to subscribe to continue using the service.'
      },
      {
        q: 'How do I add teachers?',
        a: 'There are two ways. As an admin, go to your dashboard and add a teacher with their name, email, and staff ID — they\'ll get a default password matching their staff ID. Alternatively, teachers can self-register using your madrasah\'s registration link, where they\'ll set their own password and receive an auto-generated staff ID.'
      }
    ]
  },
  {
    category: 'Student Management',
    questions: [
      {
        q: 'How do I enroll a new student?',
        a: 'From the admin dashboard, go to the Students section and click "Add Student". Enter their first name, last name, gender, and a unique student ID. You can also add parent/guardian contact details, assign them to a class, and add notes. On Plus and Enterprise plans, a parent access code is automatically generated.'
      },
      {
        q: 'Can I import students from a spreadsheet?',
        a: 'Bulk student upload is available on the Plus plan and above. On the Standard plan, students are added individually through the dashboard.'
      },
      {
        q: 'How do parents access their child\'s information?',
        a: 'On the Plus and Enterprise plans, each student receives a unique access code when enrolled. Parents log in to the parent portal with the student ID, access code, and madrasah name to view attendance records, dressing and behavior performance, and exam results. They can also filter by semester.'
      }
    ]
  },
  {
    category: 'Attendance',
    questions: [
      {
        q: 'How do I mark attendance?',
        a: 'Teachers select a class and date from their dashboard, then mark each student as present or absent. For present students, you can also rate their dressing, behavior, and punctuality (Excellent, Good, Fair, or Poor) depending on your madrasah\'s settings. For absent students, select a reason (Sick, Parent Request, School Not Notified, or Other). Save all records at once with bulk save.'
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
        a: 'From the teacher dashboard, select a class and go to the Exams section. Enter the subject name, exam date, and maximum score, then enter each student\'s score. All scores are saved in bulk. You can also mark students as absent with a reason instead of entering a score.'
      },
      {
        q: 'How are results calculated?',
        a: 'Results are calculated as a percentage of the score obtained versus the maximum score. Students are ranked within their class using tie-aware ranking — students with the same percentage share the same rank.'
      },
      {
        q: 'How do I view student reports?',
        a: 'Admins can view a detailed report for any student from the Students section. The report shows attendance statistics, dressing and behavior performance, exam results by subject, and overall ranking. You can filter by semester. Parents on the Plus plan can also view their child\'s report through the parent portal.'
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
        a: 'Go to Settings → Billing in your admin dashboard to manage your subscription. You can upgrade from Standard ($12/mo) to Plus ($29/mo) at any time. Annual billing is also available and saves you roughly two months.'
      },
      {
        q: 'Can I get a refund?',
        a: 'Refunds are handled on a case-by-case basis. Please contact our support team at support@e-daarah.com with your request and we\'ll work with you to find a solution.'
      },
      {
        q: 'What happens if my payment fails?',
        a: 'If a payment fails, we\'ll notify you via email and retry the payment a few times. You\'ll have a grace period to update your payment method before access is restricted.'
      }
    ]
  },
  {
    category: 'Account & Security',
    questions: [
      {
        q: 'How do I reset my password?',
        a: 'Click "Forgot Password" on the login page and enter your email address. You\'ll receive a link to create a new password. The link expires after 1 hour for security.'
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
        title="Help & FAQ — e-daarah"
        description="Get help with e-daarah. Frequently asked questions about attendance tracking, exam recording, parent access, and school management."
      />
      <div className="help-container">
        <Link to="/" className="help-back">← Back to Home</Link>

        <div className="help-header">
          <h1>Help Center</h1>
          <p>Find answers to common questions about using e-daarah</p>
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
                        <span className="faq-icon">{isOpen ? '−' : '+'}</span>
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
