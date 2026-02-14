import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import './Legal.css';

function Privacy() {
  return (
    <div className="legal-page">
      <SEO
        title="Privacy Policy — e-Daarah"
        description="Privacy policy for e-Daarah. Learn how we protect your school's data and your students' information."
      />
      <div className="legal-container">
        <Link to="/" className="legal-back">Back to Home</Link>

        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: February 5, 2026</p>

        <section>
          <h2>1. Introduction</h2>
          <p>
            e-Daarah ("we", "us", "our") is committed to protecting the privacy of our users.
            This Privacy Policy explains how we collect, use, and safeguard your information
            when you use our madrasah management platform.
          </p>
        </section>

        <section>
          <h2>2. Information We Collect</h2>

          <h3>Account Information</h3>
          <p>When you register, we collect:</p>
          <ul>
            <li>Name and email address</li>
            <li>Phone number</li>
            <li>Madrasah name and address</li>
            <li>Password (stored securely using encryption)</li>
          </ul>

          <h3>Student and Staff Data</h3>
          <p>You may enter the following data into the system:</p>
          <ul>
            <li>Student names, IDs, and contact information</li>
            <li>Teacher and staff details</li>
            <li>Attendance records</li>
            <li>Exam scores and grades</li>
            <li>Class and session information</li>
          </ul>

          <h3>Usage Information</h3>
          <p>We automatically collect:</p>
          <ul>
            <li>IP address and browser type</li>
            <li>Pages visited and features used</li>
            <li>Login timestamps and session duration</li>
          </ul>
        </section>

        <section>
          <h2>3. How We Use Your Information</h2>
          <p>We use the collected information to:</p>
          <ul>
            <li>Provide and maintain the Service</li>
            <li>Process your subscription and payments</li>
            <li>Send important notifications about your account</li>
            <li>Respond to support requests</li>
            <li>Improve our Service based on usage patterns</li>
            <li>Ensure security and prevent fraud</li>
          </ul>
        </section>

        <section>
          <h2>4. Data Storage and Security</h2>
          <p>
            Your data is stored securely on servers hosted by Railway (railway.app).
            We implement industry-standard security measures including:
          </p>
          <ul>
            <li>Encryption of data in transit (HTTPS/TLS)</li>
            <li>Secure password hashing (bcrypt)</li>
            <li>Regular automated backups</li>
            <li>Access controls and authentication</li>
            <li>Account lockout after failed login attempts</li>
          </ul>
        </section>

        <section>
          <h2>5. Data Sharing</h2>
          <p>We do not sell your personal information. We may share data with:</p>
          <ul>
            <li><strong>Service Providers:</strong> Stripe (payment processing), email services</li>
            <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
          </ul>
          <p>
            Student and staff data you enter is never shared with third parties for
            marketing or any purpose unrelated to providing the Service.
          </p>
        </section>

        <section>
          <h2>6. Data Retention</h2>
          <ul>
            <li><strong>Active Accounts:</strong> Data retained while your account is active</li>
            <li><strong>Canceled Subscriptions:</strong> Data retained for 90 days after cancellation</li>
            <li><strong>Expired Trials:</strong> Data retained for 90 days after trial expiry</li>
            <li><strong>Account Deletion:</strong> Data permanently deleted within 30 days of request</li>
          </ul>
        </section>

        <section>
          <h2>7. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li><strong>Access:</strong> Request a copy of your data</li>
            <li><strong>Correction:</strong> Update inaccurate information</li>
            <li><strong>Deletion:</strong> Request deletion of your account and data</li>
            <li><strong>Export:</strong> Download your data in a portable format</li>
            <li><strong>Restrict:</strong> Limit how we process your data</li>
          </ul>
          <p>To exercise these rights, contact us at support@e-daarah.com.</p>
        </section>

        <section>
          <h2>8. Children's Privacy</h2>
          <p>
            The Service is designed to manage student records, which may include minors.
            We rely on madrasah administrators to obtain appropriate parental consent
            before entering student information into the system. We do not knowingly
            collect personal information directly from children under 13.
          </p>
        </section>

        <section>
          <h2>9. Cookies</h2>
          <p>
            We use essential cookies for authentication and session management.
            We do not use advertising or tracking cookies. Your browser settings
            can control cookie behavior.
          </p>
        </section>

        <section>
          <h2>10. International Data Transfers</h2>
          <p>
            Our servers are located in the United States. If you access the Service
            from outside the US, your information may be transferred to and processed
            in the US. By using the Service, you consent to this transfer.
          </p>
        </section>

        <section>
          <h2>11. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy periodically. We will notify registered
            users of material changes via email. The "Last updated" date at the top
            indicates when the policy was last revised.
          </p>
        </section>

        <section>
          <h2>12. Contact Us</h2>
          <p>
            For privacy-related questions or to exercise your data rights:
          </p>
          <p className="legal-contact">
            <strong>Email:</strong> support@e-daarah.com
          </p>
        </section>

        <div className="legal-footer">
          <Link to="/">Back to Home</Link>
          <Link to="/terms">Terms of Service</Link>
        </div>
      </div>
    </div>
  );
}

export default Privacy;
