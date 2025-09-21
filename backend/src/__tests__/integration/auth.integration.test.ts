import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../index.js';
import { prisma } from '../../utils/database.js';
import bcrypt from 'bcryptjs';
import type { Server } from 'http';
import type { Company, User } from '@prisma/client';

describe('Auth Integration Tests', () => {
  let server: Server;
  let testCompany: Company;
  let testUser: User;

  beforeAll(async () => {
    // Start the server
    server = app.listen(0);
    
    // Create test data
    testCompany = await prisma.company.create({
      data: {
        name: 'Test Company Integration',
        slug: 'test-company-integration',
        qrCode: 'test-qr-integration',
        geofence: {
          latitude: 48.1486,
          longitude: 17.1077,
          radius: 100,
        },
        isActive: true,
      },
    });

    const hashedPassword = await bcrypt.hash('testpassword123', 12);
    testUser = await prisma.user.create({
      data: {
        email: 'integration@test.com',
        password: hashedPassword,
        firstName: 'Integration',
        lastName: 'Test',
        role: 'EMPLOYEE',
        companyId: testCompany.id,
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.user.deleteMany({
      where: { companyId: testCompany.id },
    });
    await prisma.company.delete({
      where: { id: testCompany.id },
    });
    
  // Close server
  server.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Reset any test state if needed
  });

  describe('POST /api/auth/login', () => {
    it('should successfully login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'integration@test.com',
          password: 'testpassword123',
          companySlug: 'test-company-integration',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            id: testUser.id,
            email: 'integration@test.com',
            firstName: 'Integration',
            lastName: 'Test',
            role: 'EMPLOYEE',
          },
          tokens: {
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
          },
        },
      });

      // Verify tokens are valid JWT
      expect(response.body.data.tokens.accessToken).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
      expect(response.body.data.tokens.refreshToken).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
    });

    it('should reject login with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'testpassword123',
          companySlug: 'test-company-integration',
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid email or password',
      });
    });

    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'integration@test.com',
          password: 'wrongpassword',
          companySlug: 'test-company-integration',
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid email or password',
      });
    });

    it('should reject login with invalid company slug', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'integration@test.com',
          password: 'testpassword123',
          companySlug: 'nonexistent-company',
        })
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Company not found',
      });
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'integration@test.com',
          // Missing password and companySlug
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('validation'),
      });
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'testpassword123',
          companySlug: 'test-company-integration',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid email format'),
      });
    });
  });

  describe('GET /api/auth/me', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Get access token for authenticated requests
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'integration@test.com',
          password: 'testpassword123',
          companySlug: 'test-company-integration',
        });

      accessToken = loginResponse.body.data.tokens.accessToken;
    });

    it('should return user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Company-Slug', 'test-company-integration')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: testUser.id,
          email: 'integration@test.com',
          firstName: 'Integration',
          lastName: 'Test',
          role: 'EMPLOYEE',
          company: {
            id: testCompany.id,
            name: 'Test Company Integration',
            slug: 'test-company-integration',
          },
        },
      });
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('X-Company-Slug', 'test-company-integration')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'No token provided',
      });
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .set('X-Company-Slug', 'test-company-integration')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid token',
      });
    });

    it('should reject request without company slug', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Company slug required',
      });
    });
  });

  describe('POST /api/auth/logout', () => {
    let accessToken: string;

    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'integration@test.com',
          password: 'testpassword123',
          companySlug: 'test-company-integration',
        });

      accessToken = loginResponse.body.data.tokens.accessToken;
    });

    it('should successfully logout with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Company-Slug', 'test-company-integration')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Logged out successfully',
      });
    });

    it('should reject logout without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('X-Company-Slug', 'test-company-integration')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'No token provided',
      });
    });
  });
});
