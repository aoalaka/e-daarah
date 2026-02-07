/**
 * CSV Export Utility
 * Plus plan feature - exports data to CSV format
 */

/**
 * Convert array of objects to CSV string
 * @param {Array} data - Array of objects to convert
 * @param {Array} columns - Column definitions [{key: 'fieldName', label: 'Column Header'}]
 * @returns {string} CSV formatted string
 */
export const arrayToCSV = (data, columns) => {
  if (!data || data.length === 0) return '';

  // Header row
  const headers = columns.map(col => `"${col.label}"`).join(',');

  // Data rows
  const rows = data.map(item => {
    return columns.map(col => {
      let value = item[col.key];

      // Handle nested keys (e.g., 'user.name')
      if (col.key.includes('.')) {
        value = col.key.split('.').reduce((obj, key) => obj?.[key], item);
      }

      // Format value
      if (value === null || value === undefined) {
        return '""';
      }
      if (typeof value === 'boolean') {
        return value ? '"Yes"' : '"No"';
      }
      if (value instanceof Date) {
        return `"${value.toLocaleDateString()}"`;
      }
      // Escape quotes and wrap in quotes
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(',');
  });

  return [headers, ...rows].join('\n');
};

/**
 * Download data as CSV file
 * @param {Array} data - Array of objects
 * @param {Array} columns - Column definitions
 * @param {string} filename - Name for the downloaded file (without .csv)
 */
export const downloadCSV = (data, columns, filename) => {
  const csv = arrayToCSV(data, columns);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// Pre-defined column configurations for each export type

export const studentColumns = [
  { key: 'student_id', label: 'Student ID' },
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'gender', label: 'Gender' },
  { key: 'date_of_birth', label: 'Date of Birth' },
  { key: 'class_name', label: 'Class' },
  { key: 'parent_guardian_name', label: 'Parent/Guardian Name' },
  { key: 'parent_guardian_relationship', label: 'Relationship' },
  { key: 'student_phone', label: 'Phone' },
  { key: 'address', label: 'Address' },
];

export const attendanceColumns = [
  { key: 'date', label: 'Date' },
  { key: 'student_id', label: 'Student ID' },
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'class_name', label: 'Class' },
  { key: 'present', label: 'Present' },
  { key: 'dressing_grade', label: 'Dressing' },
  { key: 'behavior_grade', label: 'Behavior' },
  { key: 'semester_name', label: 'Semester' },
];

export const getAttendanceColumns = (enableDressing = true, enableBehavior = true) => {
  return attendanceColumns.filter(col => {
    if (col.key === 'dressing_grade' && !enableDressing) return false;
    if (col.key === 'behavior_grade' && !enableBehavior) return false;
    return true;
  });
};

export const examColumns = [
  { key: 'exam_date', label: 'Exam Date' },
  { key: 'student_id', label: 'Student ID' },
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'subject_name', label: 'Subject' },
  { key: 'score', label: 'Score' },
  { key: 'max_score', label: 'Max Score' },
  { key: 'percentage', label: 'Percentage' },
  { key: 'is_absent', label: 'Absent' },
  { key: 'notes', label: 'Notes' },
  { key: 'semester_name', label: 'Semester' },
];

/**
 * Helper to format date for filename
 * @returns {string} Date in YYYY-MM-DD format
 */
export const getDateSuffix = () => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};
