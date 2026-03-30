import { ChevronDownIcon } from '@heroicons/react/24/outline';
import '../Dashboard.css';

function HelpSection({ helpExpanded, setHelpExpanded, madrasahProfile, hasPlusAccess, setShowTour }) {
  const toggleHelp = (key) => setHelpExpanded(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });
  const HelpAccordion = ({ sectionKey, title, items }) => (
    <div className="card" style={{ marginBottom: '12px' }}>
      <button onClick={() => toggleHelp(sectionKey)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: 600, textAlign: 'left' }}>
        {title}
        <ChevronDownIcon width={16} height={16} style={{ transform: helpExpanded.has(sectionKey) ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
      </button>
      {helpExpanded.has(sectionKey) && (
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {items.map((item, i) => (
            <div key={i}>
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{item.title}</div>
              <div style={{ fontSize: '13px', color: 'var(--gray)', lineHeight: '1.5' }}>{item.content}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
  return (
    <>
      <div className="page-header no-print">
        <h2 className="page-title">Help</h2>
        <button className="btn btn-secondary btn-sm" onClick={() => { localStorage.removeItem('tour_admin_done'); setShowTour(true); }}>Replay Tour</button>
      </div>

      <HelpAccordion sectionKey="getting-started" title="Getting Started" items={[
        { title: 'Create a session and semester', content: 'Go to Planner > Sessions. Click "New Session" to create an academic year (e.g. 2025/2026). Then add semesters within that session. Sessions and semesters organise your attendance and exam records by time period.' },
        { title: 'Create classes', content: 'Go to Classes and click "New Class". Give it a name (e.g. "Junior Boys", "Grade 3"). Classes group your students and are used for attendance, exams, and reports.' },
        { title: 'Add teachers and assign classes', content: 'Go to Teachers and click "New Teacher". Fill in their details and select which classes they teach. Teachers can then log in to mark attendance and record exams for their assigned classes.' },
        { title: 'Add students', content: 'Go to Students and click "New Student" to add one at a time, or use "Upload CSV" to bulk-import from a spreadsheet. Each student can be assigned to a class and optionally have parent contact info for the parent portal.' },
        { title: 'Set expected fees', content: 'Go to the Fees tab and click "Set Expected Fee". Select students (filter by class), enter the amount and an optional note, then apply. Each student\'s fee progress will be tracked automatically.' },
      ]} />

      <HelpAccordion sectionKey="daily-ops" title="Daily Operations" items={[
        { title: 'How attendance works', content: 'Teachers mark attendance daily for their classes from their dashboard. As an admin, you can view attendance records under Reports > Attendance. The Overview shows alerts when attendance hasn\'t been marked for the day.' },
        { title: 'Record exam scores', content: 'Teachers record exam scores from their dashboard under Exam Recording. They select a class, subject, and exam type, then enter scores for each student. Results appear in Reports.' },
        { title: 'Record a fee payment', content: 'Go to Fees, find the student, and click "Record". Choose the amount, date, payment method, and what the payment is for (e.g. "March", "Week 5", "Instalment 3"). The balance updates automatically.' },
        { title: 'Void a payment', content: 'In the Fees tab under "Recent Payments", click "Void" next to a payment to reverse it. The student\'s balance will be recalculated.' },
      ]} />

      <HelpAccordion sectionKey="planner" title="Academic Planner" items={[
        { title: 'Manage sessions and semesters', content: 'Sessions represent academic years. Semesters are periods within a session (e.g. First Term, Second Term). Go to Planner > Sessions to create, edit, or delete them.' },
        { title: 'Set up holidays', content: 'Go to Planner > Holidays to add dates when classes don\'t hold. Holidays are excluded from attendance tracking so teachers won\'t be prompted to mark attendance on those days.' },
        { title: 'Schedule overrides', content: 'Use Planner > Overrides to mark specific dates as school days or non-school days, overriding the regular weekly schedule. Useful for make-up days or unexpected closures.' },
      ]} />

      <HelpAccordion sectionKey="students-classes" title="Students & Classes" items={[
        { title: 'Edit or delete a student', content: 'Go to Students, find the student in the list, and click the edit or delete button. Deleting a student is a soft delete — their records are preserved but they no longer appear in active lists.' },
        { title: 'Promote students', content: 'At the end of a term or year, use the Promote feature in the Students tab to move students from one class to another in bulk. Select the source class, pick students, choose the destination class, and confirm.' },
        { title: 'Bulk upload from CSV', content: 'In the Students tab, click "Upload CSV". Download the template first, fill it in with your student data, then upload. The system will validate each row and show any errors before importing.' },
      ]} />

      {madrasahProfile?.enable_fee_tracking && (
        <HelpAccordion sectionKey="fees" title="Fees" items={[
          { title: 'Set expected fees (individual or bulk)', content: 'You can set a student\'s expected fee when creating or editing them. For multiple students, use the "Set Expected Fee" button in the Fees tab — filter by class, select students, and apply an amount to all at once.' },
          { title: 'Edit or clear a fee', content: 'In the Fees tab, each student row has "Edit" and "Clear" buttons. Edit lets you update the amount and note. Clear removes the expected fee entirely — the student will no longer appear in the Fees tab.' },
          { title: 'Payment labels', content: 'When recording a payment, pick a category (Monthly, Weekly, Instalment, Other) then select the specific label. This helps you track which period or purpose each payment covers.' },
          { title: 'Track collection progress', content: 'The Fees tab shows summary cards (Total Expected, Collected, Outstanding) and a progress bar for each student. Filter by class to focus on specific groups.' },
        ]} />
      )}

      {hasPlusAccess() && (
        <HelpAccordion sectionKey="reports" title="Reports" items={[
          { title: 'Attendance reports', content: 'Go to Reports > Attendance. Select a class and date range to see attendance rates, trends, and individual student records. You can export the data as needed.' },
          { title: 'Exam reports and rankings', content: 'Go to Reports > Exams. View results by class, subject, and semester. Student rankings show top performers and those needing attention.' },
          { title: 'Export reports', content: 'Most report views have an export button that downloads the data. Use this for printing, sharing with parents, or keeping offline records.' },
        ]} />
      )}

      <HelpAccordion sectionKey="settings" title="Settings" items={[
        { title: 'Update school profile', content: 'Click your profile icon in the sidebar footer, then "Settings". You can update your school name, contact info, and other details.' },
        { title: 'Enable or disable fee tracking', content: 'In Settings, toggle the "Fee Tracking" switch to show or hide the Fees tab. When disabled, fee-related features are hidden from the sidebar and student forms.' },
        { title: 'Parent portal access', content: 'Parents can view their children\'s reports and fee status by logging in with their phone number and a password they create during first login. If a parent forgets their password, you can reset it from the Students section.' },
      ]} />
    </>
  );
}

export default HelpSection;
