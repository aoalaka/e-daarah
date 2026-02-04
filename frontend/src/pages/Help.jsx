import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Help.css';

const faqs = [
  {
    category: 'Getting Started',
    questions: [
      {
        q: 'How do I create my madrasah account?',
        a: 'Click "Get Started" on the homepage and fill in your madrasah details. You\'ll receive a verification email to confirm your account. Once verified, you can log in and start setting up your madrasah.'
      },
      {
        q: 'What happens during the 14-day free trial?',
        a: 'During your trial, you have full access to all features. You can add students, teachers, track attendance, and create exams. After 14 days, you\'ll need to subscribe to continue using the service.'
      },
      {
        q: 'How do I invite teachers to join?',
        a: 'Go to Settings → Teachers and click "Add Teacher". Enter their email address and they\'ll receive an invitation to create their account and join your madrasah.'
      }
    ]
  },
  {
    category: 'Student Management',
    questions: [
      {
        q: 'How do I enroll a new student?',
        a: 'Navigate to Students → Add Student. Fill in the student\'s details including name, date of birth, and parent contact information. You can also assign them to a class immediately.'
      },
      {
        q: 'Can I import students from a spreadsheet?',
        a: 'Currently, students need to be added individually through the dashboard. We\'re working on bulk import functionality for a future update.'
      },
      {
        q: 'How do parents access their child\'s information?',
        a: 'Parents receive a unique access code when their child is enrolled. They can use this code on the parent portal to view attendance records and report cards.'
      }
    ]
  },
  {
    category: 'Attendance',
    questions: [
      {
        q: 'How do I mark attendance?',
        a: 'Go to Attendance from the main menu. Select the date and class, then mark each student as present, absent, late, or excused. Don\'t forget to save your changes.'
      },
      {
        q: 'Can I edit past attendance records?',
        a: 'Yes, you can edit attendance for any past date. Simply select the date from the calendar and make your changes. All edits are logged for accountability.'
      },
      {
        q: 'How do I view attendance reports?',
        a: 'Attendance statistics are shown on the dashboard. For detailed reports, go to Students and click on an individual student to see their complete attendance history.'
      }
    ]
  },
  {
    category: 'Exams & Grades',
    questions: [
      {
        q: 'How do I create an exam?',
        a: 'Go to Exams → Create Exam. Select the term, class, and subject. Set the maximum marks and exam date. Once created, you can enter individual student scores.'
      },
      {
        q: 'How are grades calculated?',
        a: 'Grades are calculated as a percentage of marks obtained vs maximum marks. The grading scale (A, B, C, etc.) can be configured in your madrasah settings.'
      },
      {
        q: 'How do I generate report cards?',
        a: 'Go to Report Cards, select the term and class, then click "Generate". Report cards compile all exam results and attendance for the selected period. Parents can view these through the parent portal.'
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
        a: 'Go to Settings → Billing and click "Manage Subscription". You can upgrade, downgrade, or change your billing frequency at any time. Changes take effect on your next billing date.'
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
