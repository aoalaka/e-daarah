import { describe, it, expect, beforeAll } from '@jest/globals';
import supertest from 'supertest';

/**
 * API integration tests for student CRUD endpoints.
 * Requires: `make dev` running (backend on localhost:5001, MySQL on localhost:3307).
 * Uses the seeded demo admin account for authentication.
 *
 * Run with: npm run test:api
 */

const API_BASE = process.env.API_BASE || 'http://localhost:5001';
const api = supertest(API_BASE);

let adminToken;
let madrasahSlug;
let createdStudentId;

beforeAll(async () => {
  // Login as demo admin
  const res = await api
    .post('/api/auth/login')
    .send({
      madrasah_slug: 'demo-madrasah',
      username: 'admin',
      password: 'admin123',
    });

  if (res.status !== 200) {
    console.error('Login failed — is `make dev` running?', res.body);
    throw new Error('Cannot run API tests without a running backend. Run `make dev` first.');
  }

  adminToken = res.body.token;
  madrasahSlug = 'demo-madrasah';
});

describe('GET /api/admin/students', () => {
  it('returns student list when authenticated', async () => {
    const res = await api
      .get('/api/admin/students')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns 401 without auth token', async () => {
    const res = await api.get('/api/admin/students');
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    const res = await api
      .get('/api/admin/students')
      .set('Authorization', 'Bearer invalid-token');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/admin/students', () => {
  it('creates a student with valid data', async () => {
    const res = await api
      .post('/api/admin/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        first_name: 'Test',
        last_name: 'Student',
        student_id: '999',
        gender: 'Male',
        parent_guardian_name: 'Test Parent',
        parent_guardian_relationship: 'Father',
        parent_guardian_phone: '21999888',
        parent_guardian_phone_country_code: '+64',
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    createdStudentId = res.body.id;
  });

  it('rejects student with missing first name', async () => {
    const res = await api
      .post('/api/admin/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        first_name: '',
        last_name: 'Student',
        student_id: '998',
        gender: 'Male',
        parent_guardian_name: 'Test Parent',
        parent_guardian_relationship: 'Father',
        parent_guardian_phone: '21999777',
        parent_guardian_phone_country_code: '+64',
      });

    expect(res.status).toBe(400);
  });

  it('rejects student with invalid gender', async () => {
    const res = await api
      .post('/api/admin/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        first_name: 'Test',
        last_name: 'Student',
        student_id: '997',
        gender: 'Unknown',
        parent_guardian_name: 'Test Parent',
        parent_guardian_relationship: 'Father',
        parent_guardian_phone: '21999666',
        parent_guardian_phone_country_code: '+64',
      });

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/admin/students/:id', () => {
  it('updates a student successfully', async () => {
    if (!createdStudentId) return;

    const res = await api
      .put(`/api/admin/students/${createdStudentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        first_name: 'Updated',
        last_name: 'Student',
        student_id: '999',
        gender: 'Male',
        parent_guardian_name: 'Test Parent',
        parent_guardian_relationship: 'Father',
        parent_guardian_phone: '21999888',
        parent_guardian_phone_country_code: '+64',
      });

    expect(res.status).toBe(200);
  });

  it('handles empty expected_fee without NaN error', async () => {
    if (!createdStudentId) return;

    const res = await api
      .put(`/api/admin/students/${createdStudentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        first_name: 'Updated',
        last_name: 'Student',
        student_id: '999',
        gender: 'Male',
        parent_guardian_name: 'Test Parent',
        parent_guardian_relationship: 'Father',
        parent_guardian_phone: '21999888',
        parent_guardian_phone_country_code: '+64',
        expected_fee: '',
      });

    // Should NOT get a 500 error about NaN
    expect(res.status).toBe(200);
  });

  it('handles null expected_fee', async () => {
    if (!createdStudentId) return;

    const res = await api
      .put(`/api/admin/students/${createdStudentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        first_name: 'Updated',
        last_name: 'Student',
        student_id: '999',
        gender: 'Male',
        parent_guardian_name: 'Test Parent',
        parent_guardian_relationship: 'Father',
        parent_guardian_phone: '21999888',
        parent_guardian_phone_country_code: '+64',
        expected_fee: null,
      });

    expect(res.status).toBe(200);
  });

  it('accepts valid expected_fee', async () => {
    if (!createdStudentId) return;

    const res = await api
      .put(`/api/admin/students/${createdStudentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        first_name: 'Updated',
        last_name: 'Student',
        student_id: '999',
        gender: 'Male',
        parent_guardian_name: 'Test Parent',
        parent_guardian_relationship: 'Father',
        parent_guardian_phone: '21999888',
        parent_guardian_phone_country_code: '+64',
        expected_fee: '150.00',
      });

    expect(res.status).toBe(200);
  });

  it('returns 404 for non-existent student', async () => {
    const res = await api
      .put('/api/admin/students/999999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        first_name: 'Ghost',
        last_name: 'Student',
        student_id: '996',
        gender: 'Male',
        parent_guardian_name: 'Test Parent',
        parent_guardian_relationship: 'Father',
        parent_guardian_phone: '21999555',
        parent_guardian_phone_country_code: '+64',
      });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/admin/students/:id', () => {
  it('deletes the test student', async () => {
    if (!createdStudentId) return;

    const res = await api
      .delete(`/api/admin/students/${createdStudentId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  it('returns 404 for already-deleted student', async () => {
    if (!createdStudentId) return;

    const res = await api
      .delete(`/api/admin/students/${createdStudentId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});
