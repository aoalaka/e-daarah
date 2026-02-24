import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import './Legal.css';

function Terms() {
  return (
    <div className="legal-page">
      <SEO
        title="Terms of Service — e-Daarah"
        description="Terms of service for e-Daarah school management platform."
      />
      <div className="legal-container">
        <Link to="/" className="legal-back">Back to Home</Link>

        <h1>Terms of Service</h1>
        <p className="legal-updated">Last updated: February 5, 2026</p>

        <section>
          <h2>1. Agreement to Terms</h2>
          <p>
            By accessing or using e-Daarah ("the Service"), you agree to be bound by these Terms of Service.
            If you do not agree to these terms, please do not use the Service.
          </p>
        </section>

        <section>
          <h2>2. Description of Service</h2>
          <p>
            e-Daarah is a madrasah (Islamic school) management platform that provides tools for:
          </p>
          <ul>
            <li>Student enrollment and records management</li>
            <li>Teacher and staff management</li>
            <li>Attendance tracking</li>
            <li>Exam and grade recording</li>
            <li>Parent communication via report cards</li>
          </ul>
        </section>

        <section>
          <h2>3. User Accounts</h2>
          <p>
            To use certain features of the Service, you must register for an account. You agree to:
          </p>
          <ul>
            <li>Provide accurate and complete registration information</li>
            <li>Maintain the security of your password and account</li>
            <li>Notify us immediately of any unauthorized access</li>
            <li>Accept responsibility for all activities under your account</li>
          </ul>
        </section>

        <section>
          <h2>4. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service for any unlawful purpose</li>
            <li>Upload malicious code or attempt to breach security</li>
            <li>Share login credentials with unauthorized parties</li>
            <li>Scrape or collect data without authorization</li>
            <li>Impersonate others or misrepresent your affiliation</li>
          </ul>
        </section>

        <section>
          <h2>5. Data and Privacy</h2>
          <p>
            Your use of the Service is also governed by our <Link to="/privacy">Privacy Policy</Link>.
            You acknowledge that student and staff data entered into the system is your responsibility
            and you have obtained necessary consents for data processing.
          </p>
        </section>

        <section>
          <h2>6. Subscription and Payments</h2>
          <p>
            Paid features require a subscription. By subscribing, you agree to:
          </p>
          <ul>
            <li>Pay all applicable fees for your chosen plan</li>
            <li>Provide valid payment information</li>
            <li>Accept automatic renewal unless canceled before the billing date</li>
          </ul>
          <p>
            Subscriptions can be managed through your account settings. Refunds are handled
            on a case-by-case basis - please contact support for assistance.
          </p>
        </section>

        <section>
          <h2>7. Trial Period</h2>
          <p>
            New accounts receive a 14-day free trial with access to all features. After the trial:
          </p>
          <ul>
            <li>You may subscribe to continue using the Service</li>
            <li>Your data will be retained for 90 days if you do not subscribe</li>
            <li>After 90 days, inactive trial accounts may be deleted</li>
          </ul>
        </section>

        <section>
          <h2>8. Service Availability</h2>
          <p>
            We strive for high availability but do not guarantee uninterrupted service.
            We may perform maintenance or updates that temporarily affect availability.
            We will attempt to provide notice for planned maintenance.
          </p>
        </section>

        <section>
          <h2>9. Intellectual Property</h2>
          <p>
            The Service, including its design, features, and content, is owned by e-Daarah.
            Your data remains yours. By using the Service, you grant us a license to process
            your data solely to provide the Service.
          </p>
        </section>

        <section>
          <h2>10. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, e-Daarah shall not be liable for any
            indirect, incidental, special, or consequential damages arising from your use
            of the Service. Our total liability shall not exceed the amount you paid for
            the Service in the 12 months preceding the claim.
          </p>
        </section>

        <section>
          <h2>11. Termination</h2>
          <p>
            You may terminate your account at any time through your account settings.
            We may suspend, delete, or terminate accounts that violate these terms or at
            our discretion. Upon deletion, your data will be retained for 30 days, during
            which reinstatement is possible. After 30 days, data will be permanently and
            irreversibly removed. You may request a copy of your data within this 30-day window.
          </p>
        </section>

        <section>
          <h2>12. Changes to Terms</h2>
          <p>
            We may update these terms from time to time. We will notify registered users
            of material changes via email. Continued use of the Service after changes
            constitutes acceptance of the updated terms.
          </p>
        </section>

        <section>
          <h2>13. Contact</h2>
          <p>
            For questions about these Terms, please contact us at:
          </p>
          <p className="legal-contact">
            <strong>Email:</strong> support@e-daarah.com
          </p>
        </section>

        <div className="legal-footer">
          <Link to="/">Back to Home</Link>
          <Link to="/privacy">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}

export default Terms;
