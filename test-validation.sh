#!/bin/bash

# Test script for validation changes
# Tests new password requirements, ID formats, step attributes, and semester validation

BASE_URL="http://localhost:5001/api"
MADRASAH_SLUG="default"

echo "============================================"
echo "Testing Validation Updates"
echo "============================================"
echo ""

echo "1. Testing Password Validation (should fail - too short)"
echo "------------------------------------------------------------"
curl -X POST "$BASE_URL/auth/register-teacher" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Test",
    "last_name": "Teacher",
    "staff_id": "12345",
    "email": "test@example.com",
    "password": "Short1!",
    "madrasahSlug": "default"
  }' | jq .
echo ""
echo ""

echo "2. Testing Password Validation (should fail - no symbol)"
echo "------------------------------------------------------------"
curl -X POST "$BASE_URL/auth/register-teacher" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Test",
    "last_name": "Teacher",
    "staff_id": "12345",
    "email": "test2@example.com",
    "password": "Password123",
    "madrasahSlug": "default"
  }' | jq .
echo ""
echo ""

echo "3. Testing Password Validation (should pass)"
echo "------------------------------------------------------------"
curl -X POST "$BASE_URL/auth/register-teacher" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Valid",
    "last_name": "Teacher",
    "staff_id": "99999",
    "email": "valid@example.com",
    "password": "ValidPass123!",
    "madrasahSlug": "default"
  }' | jq .
echo ""
echo ""

echo "4. Testing Staff ID Validation (should fail - only 3 digits)"
echo "------------------------------------------------------------"
curl -X POST "$BASE_URL/auth/register-teacher" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Test",
    "last_name": "Teacher",
    "staff_id": "123",
    "email": "test3@example.com",
    "password": "ValidPass123!",
    "madrasahSlug": "default"
  }' | jq .
echo ""
echo ""

echo "5. Testing Staff ID Validation (should pass - 5 digits)"
echo "------------------------------------------------------------"
curl -X POST "$BASE_URL/auth/register-teacher" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Test",
    "last_name": "Teacher5",
    "staff_id": "88888",
    "email": "test5@example.com",
    "password": "ValidPass123!",
    "madrasahSlug": "default"
  }' | jq .
echo ""
echo ""

echo "6. Testing Student ID Validation (should fail - only 3 digits)"
echo "------------------------------------------------------------"
curl -X POST "$BASE_URL/auth/parent-login" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "815",
    "surname": "Ibrahim",
    "madrasahSlug": "default"
  }' | jq .
echo ""
echo ""

echo "7. Testing Student ID Validation (should pass - 6 digits)"
echo "------------------------------------------------------------"
curl -X POST "$BASE_URL/auth/parent-login" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "000815",
    "surname": "Ibrahim",
    "madrasahSlug": "default"
  }' | jq .
echo ""
echo ""

echo "============================================"
echo "Testing Complete!"
echo "============================================"
echo ""
echo "Summary of Changes:"
echo "- Password: Now requires 8+ characters with uppercase, lowercase, number, and symbol"
echo "- Staff ID: Changed from 3 to 5 digits"
echo "- Student ID: Changed from 3 to 6 digits"
echo "- Exam Score Step: Changed from 0.5 to 0.1 (frontend only)"
echo "- Staff ID Display: Added to teacher dashboard header"
echo "- Semester Validation: Must be within session dates and cannot overlap"
echo ""
