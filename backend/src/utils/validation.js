// Validation helper functions for backend

// Email validation
export const isValidEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone validation
export const isValidPhone = (phone) => {
  if (!phone) return true; // Optional
  const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
  return phoneRegex.test(phone);
};

// Staff ID validation (5 digits)
export const isValidStaffId = (staffId) => {
  if (!staffId) return false;
  const staffIdRegex = /^\d{5}$/;
  return staffIdRegex.test(staffId);
};

// Student ID validation (6 digits)
export const isValidStudentId = (studentId) => {
  if (!studentId) return false;
  const studentIdRegex = /^\d{6}$/;
  return studentIdRegex.test(studentId);
};

// Name validation
export const isValidName = (name) => {
  if (!name) return false;
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > 100) return false;
  const nameRegex = /^[a-zA-Z\s'-]+$/;
  return nameRegex.test(trimmed);
};

// Address field validation
export const isValidStreet = (street) => {
  if (!street) return false;
  return street.trim().length >= 3 && street.trim().length <= 255;
};

export const isValidCity = (city) => {
  if (!city) return false;
  const trimmed = city.trim();
  if (trimmed.length < 2 || trimmed.length > 100) return false;
  const cityRegex = /^[a-zA-Z\s'-]+$/;
  return cityRegex.test(trimmed);
};

export const isValidState = (state) => {
  if (!state) return false;
  const trimmed = state.trim();
  if (trimmed.length < 2 || trimmed.length > 100) return false;
  const stateRegex = /^[a-zA-Z\s'-]+$/;
  return stateRegex.test(trimmed);
};

export const isValidCountry = (country) => {
  if (!country) return false;
  const trimmed = country.trim();
  if (trimmed.length < 2 || trimmed.length > 100) return false;
  const countryRegex = /^[a-zA-Z\s'-]+$/;
  return countryRegex.test(trimmed);
};

export const isValidCountryCode = (code) => {
  if (!code) return false;
  // Country codes are like +1, +44, +64, etc.
  const codeRegex = /^\+[0-9]{1,4}$/;
  return codeRegex.test(code);
};

// Password validation (min 8 characters with uppercase, lowercase, number, and symbol)
export const isValidPassword = (password) => {
  if (!password || password.length < 8) return false;
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'/`~]/.test(password);
  
  return hasUpperCase && hasLowerCase && hasNumber && hasSymbol;
};

// Date validation
export const isValidDate = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

export const isValidDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return false;
  return new Date(startDate) <= new Date(endDate);
};

export const isValidPastDate = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return date <= today;
};

// Number validation
export const isValidNumber = (value, min = 0, max = Infinity) => {
  const num = parseFloat(value);
  return !isNaN(num) && num >= min && num <= max;
};

// Required field validation
export const isRequired = (value) => {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value !== null && value !== undefined && value !== '';
};

// Gender validation
export const isValidGender = (gender) => {
  return gender === 'Male' || gender === 'Female';
};

// Grade validation
export const isValidGrade = (grade) => {
  const validGrades = ['Excellent', 'Good', 'Fair', 'Poor'];
  return !grade || validGrades.includes(grade);
};

// Absence reason validation
export const isValidAbsenceReason = (reason) => {
  const validReasons = ['Sick', 'Parent Request', 'School Not Notified', 'Other'];
  return validReasons.includes(reason);
};

// Validate teacher data
export const validateTeacher = (data, isUpdate = false) => {
  const errors = [];

  if (!isValidName(data.first_name)) {
    errors.push('Invalid first name');
  }

  if (!isValidName(data.last_name)) {
    errors.push('Invalid last name');
  }

  if (!isUpdate && !isValidStaffId(data.staff_id)) {
    errors.push('Staff ID must be exactly 5 digits');
  }

  if (!isValidEmail(data.email)) {
    errors.push('Invalid email format');
  }

  if (!isValidPhone(data.phone)) {
    errors.push('Phone number is required');
  }

  if (!isValidCountryCode(data.phone_country_code)) {
    errors.push('Invalid country code');
  }

  if (!isValidStreet(data.street)) {
    errors.push('Street address is required');
  }

  if (!isValidCity(data.city)) {
    errors.push('City is required');
  }

  if (!isValidState(data.state)) {
    errors.push('State/Region is required');
  }

  if (!isValidCountry(data.country)) {
    errors.push('Country is required');
  }

  return errors;
};

// Validate student data
export const validateStudent = (data, isUpdate = false) => {
  const errors = [];

  if (!isValidName(data.first_name)) {
    errors.push('Invalid first name');
  }

  if (!isValidName(data.last_name)) {
    errors.push('Invalid last name');
  }

  if (!isUpdate && !isValidStudentId(data.student_id)) {
    errors.push('Student ID must be exactly 6 digits');
  }

  if (!isValidGender(data.gender)) {
    errors.push('Gender must be Male or Female');
  }

  if (data.email && !isValidEmail(data.email)) {
    errors.push('Invalid email format');
  }

  if (data.phone && !isValidPhone(data.phone)) {
    errors.push('Invalid phone number format');
  }

  if (data.phone_country_code && !isValidCountryCode(data.phone_country_code)) {
    errors.push('Invalid country code');
  }

  if (data.street && !isValidStreet(data.street)) {
    errors.push('Invalid street address');
  }

  if (data.city && !isValidCity(data.city)) {
    errors.push('Invalid city');
  }

  if (data.state && !isValidState(data.state)) {
    errors.push('Invalid state/region');
  }

  if (data.country && !isValidCountry(data.country)) {
    errors.push('Invalid country');
  }

  if (data.date_of_birth && !isValidDate(data.date_of_birth)) {
    errors.push('Invalid date of birth');
  }

  if (!isValidName(data.parent_guardian_name)) {
    errors.push('Invalid next of kin name');
  }

  if (!isRequired(data.parent_guardian_relationship)) {
    errors.push('Next of kin relationship is required');
  }

  if (!isValidPhone(data.parent_guardian_phone)) {
    errors.push('Next of kin phone number is required');
  }

  if (!isValidCountryCode(data.parent_guardian_phone_country_code)) {
    errors.push('Next of kin country code is required');
  }

  return errors;
};

// Validate session data
export const validateSession = (data) => {
  const errors = [];

  if (!isRequired(data.name)) {
    errors.push('Session name is required');
  }

  if (!isValidDate(data.start_date)) {
    errors.push('Invalid start date');
  }

  if (!isValidDate(data.end_date)) {
    errors.push('Invalid end date');
  }

  if (data.start_date && data.end_date && !isValidDateRange(data.start_date, data.end_date)) {
    errors.push('End date must be after start date');
  }

  return errors;
};

// Validate semester data
export const validateSemester = (data) => {
  const errors = [];

  if (!isRequired(data.session_id)) {
    errors.push('Session is required');
  }

  if (!isRequired(data.name)) {
    errors.push('Semester name is required');
  }

  if (!isValidDate(data.start_date)) {
    errors.push('Invalid start date');
  }

  if (!isValidDate(data.end_date)) {
    errors.push('Invalid end date');
  }

  if (data.start_date && data.end_date && !isValidDateRange(data.start_date, data.end_date)) {
    errors.push('End date must be after start date');
  }

  return errors;
};

// Validate class data
export const validateClass = (data) => {
  const errors = [];

  if (!isRequired(data.name)) {
    errors.push('Class name is required');
  }

  if (!isRequired(data.description)) {
    errors.push('Description is required');
  }

  return errors;
};

// Validate attendance data
export const validateAttendance = (data) => {
  const errors = [];

  if (!isRequired(data.student_id)) {
    errors.push('Student ID is required');
  }

  if (!isRequired(data.date)) {
    errors.push('Date is required');
  }

  if (!isValidPastDate(data.date)) {
    errors.push('Attendance date cannot be in the future');
  }

  if (data.dressing_grade && !isValidGrade(data.dressing_grade)) {
    errors.push('Invalid dressing grade');
  }

  if (data.behavior_grade && !isValidGrade(data.behavior_grade)) {
    errors.push('Invalid behavior grade');
  }

  return errors;
};

// Validate exam performance data
export const validateExamPerformance = (data, maxScore) => {
  const errors = [];

  if (!isRequired(data.subject)) {
    errors.push('Subject is required');
  }

  if (!isValidDate(data.exam_date)) {
    errors.push('Invalid exam date');
  }

  if (!isValidPastDate(data.exam_date)) {
    errors.push('Exam date cannot be in the future');
  }

  if (!isValidNumber(maxScore, 1, 1000)) {
    errors.push('Max score must be between 1 and 1000');
  }

  if (!data.is_absent) {
    if (!isRequired(data.score)) {
      errors.push('Score is required for present students');
    } else if (!isValidNumber(data.score, 0, maxScore)) {
      errors.push(`Score must be between 0 and ${maxScore}`);
    }
  } else {
    if (!isRequired(data.absence_reason)) {
      errors.push('Absence reason is required');
    } else if (!isValidAbsenceReason(data.absence_reason)) {
      errors.push('Invalid absence reason');
    }
  }

  return errors;
};
