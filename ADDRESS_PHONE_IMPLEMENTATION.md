# Address & Phone Number Updates - Implementation Guide

## Database Migration ✅ COMPLETED

Successfully applied migration with new address fields and phone country codes.

**Schema Changes:**
- **madrasahs**: Added street, city, state, country, phone_country_code
- **users**: Added street, city, state, country, phone_country_code (all required)
- **students**: Added student_phone, student_phone_country_code, street, city, state, country, next_of_kin_phone_country_code

**Sample Data**: Fresh data inserted with New Zealand addresses and +64 country codes

---

## Frontend Package Installed ✅

```json
"react-phone-input-2": "^2.15.1"
```

This package provides:
- International phone input with country flag dropdown
- Automatic country code selection
- Phone number formatting
- Validation

---

## Next Steps - Frontend Forms Update

### 1. Import Phone Input Component

Add to forms that need phone input:
```jsx
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
```

### 2. State Management Updates

**Teacher Form State**:
```jsx
const [newTeacher, setNewTeacher] = useState({ 
  first_name: '', 
  last_name: '', 
  staff_id: '', 
  email: '', 
  phone: '',
  phone_country_code: '+64',
  street: '',
  city: '',
  state: '',
  country: ''
});
```

**Student Form State**:
```jsx
const [newStudent, setNewStudent] = useState({
  first_name: '', 
  last_name: '', 
  student_id: '', 
  gender: '', 
  class_id: '',
  student_phone: '',
  student_phone_country_code: '+64',
  street: '',
  city: '',
  state: '',
  country: '',
  next_of_kin_name: '', 
  next_of_kin_relationship: '', 
  next_of_kin_phone: '',
  next_of_kin_phone_country_code: '+64',
  notes: ''
});
```

### 3. Phone Input Component Usage

Replace standard phone inputs with:
```jsx
<div className="form-group">
  <label className="form-label">Phone Number *</label>
  <PhoneInput
    country={'nz'}
    value={newTeacher.phone}
    onChange={(phone, country) => {
      setNewTeacher({ 
        ...newTeacher, 
        phone: phone.substring(country.dialCode.length),
        phone_country_code: '+' + country.dialCode
      });
    }}
    inputProps={{
      required: true,
      className: 'form-input'
    }}
    containerStyle={{ width: '100%' }}
    inputStyle={{ width: '100%', height: '42px' }}
  />
</div>
```

### 4. Address Fields

Add after phone input:
```jsx
<div className="form-group">
  <label className="form-label">Street Address *</label>
  <input
    type="text"
    className="form-input"
    value={newTeacher.street}
    onChange={(e) => setNewTeacher({ ...newTeacher, street: e.target.value })}
    placeholder="123 Main Street"
    required
  />
</div>

<div className="form-row" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--md)'}}>
  <div className="form-group">
    <label className="form-label">City *</label>
    <input
      type="text"
      className="form-input"
      value={newTeacher.city}
      onChange={(e) => setNewTeacher({ ...newTeacher, city: e.target.value })}
      placeholder="Auckland"
      required
    />
  </div>

  <div className="form-group">
    <label className="form-label">State/Region *</label>
    <input
      type="text"
      className="form-input"
      value={newTeacher.state}
      onChange={(e) => setNewTeacher({ ...newTeacher, state: e.target.value })}
      placeholder="Auckland Region"
      required
    />
  </div>
</div>

<div className="form-group">
  <label className="form-label">Country *</label>
  <input
    type="text"
    className="form-input"
    value={newTeacher.country}
    onChange={(e) => setNewTeacher({ ...newTeacher, country: e.target.value })}
    placeholder="New Zealand"
    required
  />
</div>
```

---

## Forms Requiring Updates

### Admin Dashboard (`frontend/src/pages/admin/Dashboard.jsx`)
- **Teacher Form** (lines ~990-1070):
  - Add phone country code handling
  - Add address fields (street, city, state, country)
  
- **Student Form** (lines ~1240-1340):
  - Add student phone with country code
  - Add student address fields
  - Add next of kin phone country code

### Teacher Registration (`frontend/src/pages/TeacherRegistration.jsx`)
- Add phone country code selector
- Add address fields (required)

### Madrasah Registration (`frontend/src/pages/MadrasahRegistration.jsx` or auth routes)
- Add admin address fields
- Add madrasah address fields
- Phone country code selectors

---

## Backend Route Updates

### Auth Routes (`backend/src/routes/auth.routes.js`)

**Teacher Registration** (POST `/register-teacher`):
```javascript
const { 
  firstName, lastName, staffId, email, password, phone, phone_country_code,
  street, city, state, country, madrasahSlug 
} = req.body;

// Validate all address fields
if (!street || !city || !state || !country) {
  return res.status(400).json({ error: 'Complete address is required' });
}

// Insert with address
await pool.query(
  'INSERT INTO users (madrasah_id, first_name, last_name, staff_id, email, password, phone, phone_country_code, street, city, state, country, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  [madrasahId, firstName, lastName, staffId, email, hashedPassword, phone, phone_country_code, street, city, state, country, 'teacher']
);
```

**Madrasah Registration** (POST `/register-madrasah`):
```javascript
const {
  madrasahName, madrasahSlug, madrasahPhone, madrasahPhoneCountryCode,
  madrasahStreet, madrasahCity, madrasahState, madrasahCountry,
  adminFirstName, adminLastName, adminEmail, adminPassword, 
  adminPhone, adminPhoneCountryCode,
  adminStreet, adminCity, adminState, adminCountry
} = req.body;

// Insert madrasah with address
const [madrasahResult] = await pool.query(
  'INSERT INTO madrasahs (name, slug, phone, phone_country_code, street, city, state, country, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  [madrasahName, madrasahSlug, madrasahPhone, madrasahPhoneCountryCode, madrasahStreet, madrasahCity, madrasahState, madrasahCountry, true]
);

// Insert admin with address
await pool.query(
  'INSERT INTO users (madrasah_id, first_name, last_name, email, password, phone, phone_country_code, street, city, state, country, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  [madrasahId, adminFirstName, adminLastName, adminEmail, hashedPassword, adminPhone, adminPhoneCountryCode, adminStreet, adminCity, adminState, adminCountry, 'admin']
);
```

### Admin Routes (`backend/src/routes/admin.routes.js`)

**Create Teacher** (POST `/teachers`):
```javascript
const { first_name, last_name, staff_id, email, phone, phone_country_code, street, city, state, country } = req.body;

// Validate
const errors = validateTeacher(req.body);
if (errors.length > 0) {
  return res.status(400).json({ error: errors.join(', ') });
}

const defaultPassword = staff_id; // Use staff_id as default password
const hashedPassword = await bcrypt.hash(defaultPassword, 10);

const [result] = await pool.query(
  'INSERT INTO users (madrasah_id, first_name, last_name, staff_id, email, password, phone, phone_country_code, street, city, state, country, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  [madrasahId, first_name, last_name, staff_id, email, hashedPassword, phone, phone_country_code, street, city, state, country, 'teacher']
);
```

**Create Student** (POST `/students`):
```javascript
const { 
  first_name, last_name, student_id, gender, class_id, 
  student_phone, student_phone_country_code, 
  street, city, state, country,
  next_of_kin_name, next_of_kin_relationship, next_of_kin_phone, next_of_kin_phone_country_code, notes 
} = req.body;

// Validate
const errors = validateStudent(req.body);
if (errors.length > 0) {
  return res.status(400).json({ error: errors.join(', ') });
}

const [result] = await pool.query(
  `INSERT INTO students (
    madrasah_id, first_name, last_name, student_id, gender, class_id,
    student_phone, student_phone_country_code, street, city, state, country,
    next_of_kin_name, next_of_kin_relationship, next_of_kin_phone, next_of_kin_phone_country_code, notes
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    madrasahId, first_name, last_name, student_id, gender, class_id || null,
    student_phone, student_phone_country_code, street, city, state, country,
    next_of_kin_name, next_of_kin_relationship, next_of_kin_phone, next_of_kin_phone_country_code, notes
  ]
);
```

---

## Testing Checklist

### Backend API
- [ ] POST `/admin/teachers` with address fields
- [ ] PUT `/admin/teachers/:id` with address update
- [ ] POST `/admin/students` with address and phone
- [ ] PUT `/admin/students/:id` with address update
- [ ] POST `/auth/register-teacher` with address
- [ ] POST `/auth/register-madrasah` with both addresses

### Frontend Forms
- [ ] Admin can create teacher with phone + address
- [ ] Admin can edit teacher with address preservation
- [ ] Admin can create student with all fields
- [ ] Phone input shows country flag dropdown
- [ ] Phone number formats correctly
- [ ] Address validation works (required fields)
- [ ] Form reset clears all address fields

### Data Display
- [ ] Teacher list shows phone with country code
- [ ] Student list shows address info
- [ ] Edit forms pre-populate address fields
- [ ] Report generation includes address

---

## CSS Styling for Phone Input

Add to your CSS:
```css
.react-tel-input {
  font-family: inherit;
}

.react-tel-input .form-control {
  width: 100%;
  height: 42px;
  padding: 8px 14px 8px 58px;
  border: var(--border);
  border-radius: var(--radius);
  font-size: var(--text-base);
}

.react-tel-input .flag-dropdown {
  border: var(--border);
  border-right: none;
  border-radius: var(--radius) 0 0 var(--radius);
  background-color: var(--bg-primary);
}

.react-tel-input .selected-flag:hover,
.react-tel-input .selected-flag:focus {
  background-color: var(--gray-50);
}
```

---

## Summary

**Completed:**
- ✅ Database migration with address fields
- ✅ Backend validation utilities updated
- ✅ Frontend package installed (react-phone-input-2)

**Remaining:**
- ⏳ Update all forms to include phone country code selectors
- ⏳ Update all forms to include address fields (street, city, state, country)
- ⏳ Update backend routes to accept new fields
- ⏳ Update validation in forms
- ⏳ Test end-to-end workflows

**Implementation Priority:**
1. Teacher creation form (most used)
2. Student creation form
3. Madrasah registration
4. Teacher self-registration
5. Edit forms for all entities

---

**Date**: February 2, 2026  
**Status**: Migration complete, form updates pending
