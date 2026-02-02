// Validation utility functions

// Email validation
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone validation (international format)
export const isValidPhone = (phone) => {
  if (!phone) return true; // Optional field
  const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
  return phoneRegex.test(phone);
};

// Slug validation (lowercase, alphanumeric, hyphens only)
export const isValidSlug = (slug) => {
  const slugRegex = /^[a-z0-9-]+$/;
  return slugRegex.test(slug);
};

// Staff ID validation (5 digits)
export const isValidStaffId = (staffId) => {
  const staffIdRegex = /^\d{5}$/;
  return staffIdRegex.test(staffId);
};

// Student ID validation (6 digits)
export const isValidStudentId = (studentId) => {
  const studentIdRegex = /^\d{6}$/;
  return studentIdRegex.test(studentId);
};

// Name validation (letters, spaces, hyphens, apostrophes)
export const isValidName = (name) => {
  const nameRegex = /^[a-zA-Z\s'-]+$/;
  return name && name.trim().length > 0 && nameRegex.test(name);
};

// Address field validation
export const isValidStreet = (street) => {
  return street && street.trim().length >= 3;
};

export const isValidCity = (city) => {
  const cityRegex = /^[a-zA-Z\s'-]+$/;
  return city && city.trim().length >= 2 && cityRegex.test(city);
};

export const isValidState = (state) => {
  const stateRegex = /^[a-zA-Z\s'-]+$/;
  return state && state.trim().length >= 2 && stateRegex.test(state);
};

export const isValidCountry = (country) => {
  const countryRegex = /^[a-zA-Z\s'-]+$/;
  return country && country.trim().length >= 2 && countryRegex.test(country);
};

// Password validation (min 8 characters, must contain alpha, numeric, and symbols)
export const isValidPassword = (password) => {
  if (!password || password.length < 8) return false;
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'/`~]/.test(password);
  
  return hasUpperCase && hasLowerCase && hasNumber && hasSymbol;
};

export const getPasswordStrengthMessage = () => {
  return 'Password must be at least 8 characters and contain uppercase, lowercase, number, and symbol';
};

// Date validation (not in future for past dates, not in past for future dates)
export const isValidPastDate = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  return date <= today;
};

export const isValidFutureDate = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today
  return date >= today;
};

export const isValidDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return false;
  return new Date(startDate) <= new Date(endDate);
};

// Number validation
export const isValidNumber = (value, min = 0, max = Infinity) => {
  const num = parseFloat(value);
  return !isNaN(num) && num >= min && num <= max;
};

// Score validation (0 to max_score)
export const isValidScore = (score, maxScore) => {
  if (score === '' || score === null || score === undefined) return false;
  const num = parseFloat(score);
  return !isNaN(num) && num >= 0 && num <= maxScore;
};

// Percentage validation (0-100)
export const isValidPercentage = (percentage) => {
  return isValidNumber(percentage, 0, 100);
};

// Required field validation
export const isRequired = (value) => {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value !== null && value !== undefined && value !== '';
};

// Class name validation (alphanumeric, spaces, hyphens)
export const isValidClassName = (name) => {
  const classNameRegex = /^[a-zA-Z0-9\s-]+$/;
  return name && name.trim().length > 0 && classNameRegex.test(name);
};

// Validate exam form
export const validateExamForm = (form) => {
  const errors = {};

  if (!isRequired(form.subject)) {
    errors.subject = 'Subject is required';
  }

  if (!isRequired(form.exam_date)) {
    errors.exam_date = 'Exam date is required';
  } else if (!isValidPastDate(form.exam_date)) {
    errors.exam_date = 'Exam date cannot be in the future';
  }

  if (!isRequired(form.max_score)) {
    errors.max_score = 'Max score is required';
  } else if (!isValidNumber(form.max_score, 1, 1000)) {
    errors.max_score = 'Max score must be between 1 and 1000';
  }

  // Validate student scores
  const studentErrors = [];
  form.students.forEach((student, index) => {
    const studentError = {};
    
    if (!student.is_absent) {
      if (!isRequired(student.score)) {
        studentError.score = 'Score is required';
      } else if (!isValidScore(student.score, form.max_score)) {
        studentError.score = `Score must be between 0 and ${form.max_score}`;
      }
    } else {
      if (!isRequired(student.absence_reason)) {
        studentError.absence_reason = 'Absence reason is required';
      }
    }

    if (Object.keys(studentError).length > 0) {
      studentErrors[index] = studentError;
    }
  });

  if (studentErrors.length > 0) {
    errors.students = studentErrors;
  }

  return errors;
};

// Validate attendance form
export const validateAttendanceForm = (students) => {
  const errors = [];
  
  students.forEach((student, index) => {
    const studentError = {};
    
    // Check for dressing grade if present
    if (student.dressing_grade && !['Excellent', 'Good', 'Fair', 'Poor'].includes(student.dressing_grade)) {
      studentError.dressing_grade = 'Invalid dressing grade';
    }
    
    // Check for behavior grade if present
    if (student.behavior_grade && !['Excellent', 'Good', 'Fair', 'Poor'].includes(student.behavior_grade)) {
      studentError.behavior_grade = 'Invalid behavior grade';
    }
    
    if (Object.keys(studentError).length > 0) {
      errors[index] = studentError;
    }
  });
  
  return errors;
};

// Validate session form
export const validateSessionForm = (form) => {
  const errors = {};

  if (!isRequired(form.name)) {
    errors.name = 'Session name is required';
  }

  if (!isRequired(form.start_date)) {
    errors.start_date = 'Start date is required';
  }

  if (!isRequired(form.end_date)) {
    errors.end_date = 'End date is required';
  } else if (!isValidDateRange(form.start_date, form.end_date)) {
    errors.end_date = 'End date must be after start date';
  }

  return errors;
};

// Validate semester form
export const validateSemesterForm = (form) => {
  const errors = {};

  if (!isRequired(form.session_id)) {
    errors.session_id = 'Session is required';
  }

  if (!isRequired(form.name)) {
    errors.name = 'Semester name is required';
  }

  if (!isRequired(form.start_date)) {
    errors.start_date = 'Start date is required';
  }

  if (!isRequired(form.end_date)) {
    errors.end_date = 'End date is required';
  } else if (!isValidDateRange(form.start_date, form.end_date)) {
    errors.end_date = 'End date must be after start date';
  }

  return errors;
};

// Validate class form
export const validateClassForm = (form) => {
  const errors = {};

  if (!isRequired(form.name)) {
    errors.name = 'Class name is required';
  } else if (!isValidClassName(form.name)) {
    errors.name = 'Class name can only contain letters, numbers, spaces, and hyphens';
  }

  if (!isRequired(form.description)) {
    errors.description = 'Description is required';
  }

  return errors;
};

// Validate teacher form
export const validateTeacherForm = (form, isEdit = false) => {
  const errors = {};

  if (!isRequired(form.first_name)) {
    errors.first_name = 'First name is required';
  } else if (!isValidName(form.first_name)) {
    errors.first_name = 'First name can only contain letters, spaces, hyphens, and apostrophes';
  }

  if (!isRequired(form.last_name)) {
    errors.last_name = 'Last name is required';
  } else if (!isValidName(form.last_name)) {
    errors.last_name = 'Last name can only contain letters, spaces, hyphens, and apostrophes';
  }

  if (!isEdit && !isRequired(form.staff_id)) {
    errors.staff_id = 'Staff ID is required';
  } else if (!isEdit && !isValidStaffId(form.staff_id)) {
    errors.staff_id = 'Staff ID must be exactly 5 digits';
  }

  if (!isRequired(form.email)) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(form.email)) {
    errors.email = 'Invalid email format';
  }

  if (form.phone && !isValidPhone(form.phone)) {
    errors.phone = 'Invalid phone number format';
  }

  return errors;
};

// Validate student form
export const validateStudentForm = (form, isEdit = false) => {
  const errors = {};

  if (!isRequired(form.first_name)) {
    errors.first_name = 'First name is required';
  } else if (!isValidName(form.first_name)) {
    errors.first_name = 'First name can only contain letters, spaces, hyphens, and apostrophes';
  }

  if (!isRequired(form.last_name)) {
    errors.last_name = 'Last name is required';
  } else if (!isValidName(form.last_name)) {
    errors.last_name = 'Last name can only contain letters, spaces, hyphens, and apostrophes';
  }

  if (!isEdit && !isRequired(form.student_id)) {
    errors.student_id = 'Student ID is required';
  } else if (!isEdit && !isValidStudentId(form.student_id)) {
    errors.student_id = 'Student ID must be exactly 6 digits';
  }

  if (!isRequired(form.gender)) {
    errors.gender = 'Gender is required';
  }

  if (!isRequired(form.next_of_kin_name)) {
    errors.next_of_kin_name = 'Next of kin name is required';
  } else if (!isValidName(form.next_of_kin_name)) {
    errors.next_of_kin_name = 'Next of kin name can only contain letters, spaces, hyphens, and apostrophes';
  }

  if (!isRequired(form.next_of_kin_relationship)) {
    errors.next_of_kin_relationship = 'Relationship is required';
  }

  if (!isRequired(form.next_of_kin_phone)) {
    errors.next_of_kin_phone = 'Next of kin phone is required';
  } else if (!isValidPhone(form.next_of_kin_phone)) {
    errors.next_of_kin_phone = 'Invalid phone number format';
  }

  return errors;
};

// Validate login form
export const validateLoginForm = (form) => {
  const errors = {};

  if (!isRequired(form.email)) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(form.email)) {
    errors.email = 'Invalid email format';
  }

  if (!isRequired(form.password)) {
    errors.password = 'Password is required';
  }

  if (!isRequired(form.role)) {
    errors.role = 'Role is required';
  }

  return errors;
};

// Validate parent login form
export const validateParentLoginForm = (form) => {
  const errors = {};

  if (!isRequired(form.studentId)) {
    errors.studentId = 'Student ID is required';
  } else if (!isValidStudentId(form.studentId)) {
    errors.studentId = 'Student ID must be exactly 6 digits';
  }

  if (!isRequired(form.surname)) {
    errors.surname = 'Surname is required';
  }

  return errors;
};

// Validate teacher registration form
export const validateTeacherRegistrationForm = (form) => {
  const errors = validateTeacherForm(form, false);

  if (!isRequired(form.password)) {
    errors.password = 'Password is required';
  } else if (!isValidPassword(form.password)) {
    errors.password = getPasswordStrengthMessage();
  }

  if (!isRequired(form.confirmPassword)) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return errors;
};

// Validate madrasah registration form
export const validateMadrasahRegistrationForm = (form) => {
  const errors = {};

  if (!isRequired(form.madrasahName)) {
    errors.madrasahName = 'Madrasah name is required';
  }

  if (!isRequired(form.slug)) {
    errors.slug = 'Slug is required';
  } else if (!isValidSlug(form.slug)) {
    errors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens';
  }

  if (form.phone && !isValidPhone(form.phone)) {
    errors.phone = 'Invalid phone number format';
  }

  if (!isRequired(form.adminFirstName)) {
    errors.adminFirstName = 'Admin first name is required';
  } else if (!isValidName(form.adminFirstName)) {
    errors.adminFirstName = 'First name can only contain letters, spaces, hyphens, and apostrophes';
  }

  if (!isRequired(form.adminLastName)) {
    errors.adminLastName = 'Admin last name is required';
  } else if (!isValidName(form.adminLastName)) {
    errors.adminLastName = 'Last name can only contain letters, spaces, hyphens, and apostrophes';
  }

  if (!isRequired(form.adminEmail)) {
    errors.adminEmail = 'Admin email is required';
  } else if (!isValidEmail(form.adminEmail)) {
    errors.adminEmail = 'Invalid email format';
  }

  if (!isRequired(form.adminPassword)) {
    errors.adminPassword = 'Password is required';
  } else if (!isValidPassword(form.adminPassword)) {
    errors.adminPassword = getPasswordStrengthMessage();
  }

  if (!isRequired(form.confirmPassword)) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (form.adminPassword !== form.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return errors;
};
