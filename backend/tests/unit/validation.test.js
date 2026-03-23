import { describe, it, expect } from '@jest/globals';
import {
  isValidEmail,
  normalizePhone,
  isValidPhone,
  isValidStaffId,
  isValidStudentId,
  isValidName,
  isValidCountryCode,
  isValidPassword,
  isValidDate,
  isValidDateRange,
  isValidNumber,
  isRequired,
  isValidGender,
  isValidGrade,
  validateStudent,
  validateTeacher,
} from '../../src/utils/validation.js';

describe('isValidEmail', () => {
  it('accepts valid emails', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name@domain.co')).toBe(true);
    expect(isValidEmail('admin@madrasah.com')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
    expect(isValidEmail('notanemail')).toBe(false);
    expect(isValidEmail('missing@')).toBe(false);
    expect(isValidEmail('@nodomain.com')).toBe(false);
    expect(isValidEmail('spaces in@email.com')).toBe(false);
  });
});

describe('normalizePhone', () => {
  it('strips non-digit characters', () => {
    expect(normalizePhone('021-123-456')).toBe('21123456');
    expect(normalizePhone('(021) 123 456')).toBe('21123456');
  });

  it('strips leading zeros', () => {
    expect(normalizePhone('021123456')).toBe('21123456');
    expect(normalizePhone('0021123456')).toBe('21123456');
  });

  it('strips country code prefix when provided', () => {
    expect(normalizePhone('6421123456', '+64')).toBe('21123456');
    expect(normalizePhone('2348012345678', '+234')).toBe('8012345678');
  });

  it('handles empty/null input', () => {
    expect(normalizePhone('')).toBe('');
    expect(normalizePhone(null)).toBe('');
    expect(normalizePhone(undefined)).toBe('');
  });

  it('does not strip non-matching country code', () => {
    expect(normalizePhone('21123456', '+64')).toBe('21123456');
  });
});

describe('isValidStaffId', () => {
  it('accepts 5-digit IDs', () => {
    expect(isValidStaffId('12345')).toBe(true);
    expect(isValidStaffId('00001')).toBe(true);
  });

  it('rejects non-5-digit IDs', () => {
    expect(isValidStaffId('1234')).toBe(false);
    expect(isValidStaffId('123456')).toBe(false);
    expect(isValidStaffId('abcde')).toBe(false);
    expect(isValidStaffId('')).toBe(false);
    expect(isValidStaffId(null)).toBe(false);
  });
});

describe('isValidStudentId', () => {
  it('accepts 3-10 digit IDs', () => {
    expect(isValidStudentId('123')).toBe(true);
    expect(isValidStudentId('1234567890')).toBe(true);
    expect(isValidStudentId('015')).toBe(true);
  });

  it('rejects invalid IDs', () => {
    expect(isValidStudentId('12')).toBe(false);
    expect(isValidStudentId('12345678901')).toBe(false);
    expect(isValidStudentId('abc')).toBe(false);
    expect(isValidStudentId('')).toBe(false);
  });
});

describe('isValidName', () => {
  it('accepts valid names', () => {
    expect(isValidName('Ahmad')).toBe(true);
    expect(isValidName("O'Brien")).toBe(true);
    expect(isValidName('Mary-Jane')).toBe(true);
    expect(isValidName('Al Farooq')).toBe(true);
  });

  it('rejects invalid names', () => {
    expect(isValidName('')).toBe(false);
    expect(isValidName(null)).toBe(false);
    expect(isValidName('   ')).toBe(false);
    expect(isValidName('Name123')).toBe(false);
    expect(isValidName('a'.repeat(101))).toBe(false);
  });
});

describe('isValidCountryCode', () => {
  it('accepts valid codes', () => {
    expect(isValidCountryCode('+1')).toBe(true);
    expect(isValidCountryCode('+64')).toBe(true);
    expect(isValidCountryCode('+234')).toBe(true);
    expect(isValidCountryCode('+9234')).toBe(true);
  });

  it('rejects invalid codes', () => {
    expect(isValidCountryCode('64')).toBe(false);
    expect(isValidCountryCode('+12345')).toBe(false);
    expect(isValidCountryCode('')).toBe(false);
    expect(isValidCountryCode(null)).toBe(false);
    expect(isValidCountryCode('+')).toBe(false);
  });
});

describe('isValidPassword', () => {
  it('accepts strong passwords', () => {
    expect(isValidPassword('MyPass1!')).toBe(true);
    expect(isValidPassword('Str0ng@Pass')).toBe(true);
  });

  it('rejects weak passwords', () => {
    expect(isValidPassword('short1!')).toBe(false);       // too short
    expect(isValidPassword('nouppercase1!')).toBe(false);  // no uppercase
    expect(isValidPassword('NOLOWERCASE1!')).toBe(false);  // no lowercase
    expect(isValidPassword('NoNumbers!')).toBe(false);     // no number
    expect(isValidPassword('NoSymbol1')).toBe(false);      // no symbol
    expect(isValidPassword('')).toBe(false);
    expect(isValidPassword(null)).toBe(false);
  });
});

describe('isValidDate', () => {
  it('accepts valid dates', () => {
    expect(isValidDate('2025-01-15')).toBe(true);
    expect(isValidDate('2025-12-31')).toBe(true);
  });

  it('rejects invalid dates', () => {
    expect(isValidDate('')).toBe(false);
    expect(isValidDate(null)).toBe(false);
    expect(isValidDate('not-a-date')).toBe(false);
  });
});

describe('isValidDateRange', () => {
  it('accepts valid ranges', () => {
    expect(isValidDateRange('2025-01-01', '2025-06-30')).toBe(true);
    expect(isValidDateRange('2025-01-01', '2025-01-01')).toBe(true);
  });

  it('rejects invalid ranges', () => {
    expect(isValidDateRange('2025-06-30', '2025-01-01')).toBe(false);
    expect(isValidDateRange(null, '2025-01-01')).toBe(false);
  });
});

describe('isValidNumber', () => {
  it('validates numbers within range', () => {
    expect(isValidNumber(5, 0, 10)).toBe(true);
    expect(isValidNumber('5', 0, 10)).toBe(true);
    expect(isValidNumber(0, 0, 10)).toBe(true);
  });

  it('rejects out-of-range or non-numbers', () => {
    expect(isValidNumber(-1, 0, 10)).toBe(false);
    expect(isValidNumber(11, 0, 10)).toBe(false);
    expect(isValidNumber('abc')).toBe(false);
    expect(isValidNumber('')).toBe(false);
    expect(isValidNumber(NaN)).toBe(false);
  });
});

describe('isRequired', () => {
  it('accepts non-empty values', () => {
    expect(isRequired('hello')).toBe(true);
    expect(isRequired(0)).toBe(true);
    expect(isRequired(false)).toBe(true);
  });

  it('rejects empty values', () => {
    expect(isRequired('')).toBe(false);
    expect(isRequired('   ')).toBe(false);
    expect(isRequired(null)).toBe(false);
    expect(isRequired(undefined)).toBe(false);
  });
});

describe('isValidGender', () => {
  it('accepts Male and Female', () => {
    expect(isValidGender('Male')).toBe(true);
    expect(isValidGender('Female')).toBe(true);
  });

  it('rejects other values', () => {
    expect(isValidGender('male')).toBe(false);
    expect(isValidGender('Other')).toBe(false);
    expect(isValidGender('')).toBe(false);
  });
});

describe('isValidGrade', () => {
  it('accepts valid grades and empty', () => {
    expect(isValidGrade('Excellent')).toBe(true);
    expect(isValidGrade('Good')).toBe(true);
    expect(isValidGrade('Fair')).toBe(true);
    expect(isValidGrade('Poor')).toBe(true);
    expect(isValidGrade(null)).toBe(true);
    expect(isValidGrade(undefined)).toBe(true);
  });

  it('rejects invalid grades', () => {
    expect(isValidGrade('Amazing')).toBe(false);
    expect(isValidGrade('bad')).toBe(false);
  });
});

describe('validateStudent', () => {
  const validStudent = {
    first_name: 'Ahmad',
    last_name: 'Khan',
    student_id: '015',
    gender: 'Male',
    parent_guardian_name: 'Ali Khan',
    parent_guardian_relationship: 'Father',
    parent_guardian_phone: '21123456',
    parent_guardian_phone_country_code: '+64',
  };

  it('returns no errors for valid student', () => {
    expect(validateStudent(validStudent)).toEqual([]);
  });

  it('catches missing first name', () => {
    const errors = validateStudent({ ...validStudent, first_name: '' });
    expect(errors).toContain('Invalid first name');
  });

  it('catches invalid gender', () => {
    const errors = validateStudent({ ...validStudent, gender: 'Unknown' });
    expect(errors).toContain('Gender must be Male or Female');
  });

  it('catches invalid email when provided', () => {
    const errors = validateStudent({ ...validStudent, email: 'bad-email' });
    expect(errors).toContain('Invalid email format');
  });

  it('allows missing optional fields', () => {
    const errors = validateStudent(validStudent);
    expect(errors).toEqual([]);
  });

  it('catches invalid student ID on create', () => {
    const errors = validateStudent({ ...validStudent, student_id: 'ab' }, false);
    expect(errors).toContain('Student ID must be exactly 6 digits');
  });

  it('skips student ID validation on update', () => {
    const errors = validateStudent({ ...validStudent, student_id: 'ab' }, true);
    expect(errors).not.toContain('Student ID must be exactly 6 digits');
  });
});

describe('validateTeacher', () => {
  const validTeacher = {
    first_name: 'Fatima',
    last_name: 'Ali',
    staff_id: '12345',
    email: 'fatima@test.com',
    phone: '21123456',
    phone_country_code: '+64',
    street: '123 Main Street',
    city: 'Auckland',
    state: 'Auckland',
    country: 'New Zealand',
  };

  it('returns no errors for valid teacher', () => {
    expect(validateTeacher(validTeacher)).toEqual([]);
  });

  it('catches missing required fields', () => {
    const errors = validateTeacher({ ...validTeacher, first_name: '', email: '' });
    expect(errors).toContain('Invalid first name');
    expect(errors).toContain('Invalid email format');
  });

  it('skips staff ID validation on update', () => {
    const errors = validateTeacher({ ...validTeacher, staff_id: '' }, true);
    expect(errors).not.toContain('Staff ID must be exactly 5 digits');
  });
});
