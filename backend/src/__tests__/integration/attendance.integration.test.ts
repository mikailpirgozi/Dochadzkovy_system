import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../index.js';
import { prisma } from '../../utils/database.js';
import bcrypt from 'bcryptjs';
import type { Server } from 'http';
import type { Company, User } from '@prisma/client';

describe('Attendance Integration Tests', () => {
  let server: Server;
  let testCompany: Company;
  let testUser: User;
  let accessToken: string;

  beforeAll(async () => {
    // Start the server
    server = app.listen(0);
    
    // Create test data
    testCompany = await prisma.company.create({
      data: {
        name: 'Attendance Test Company',
        slug: 'attendance-test-company',
        qrCode: 'attendance-test-qr',
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
        email: 'attendance@test.com',
        password: hashedPassword,
        firstName: 'Attendance',
        lastName: 'Test',
        role: 'EMPLOYEE',
        companyId: testCompany.id,
        isActive: true,
      },
    });

    // Get access token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'attendance@test.com',
        password: 'testpassword123',
        companySlug: 'attendance-test-company',
      });

    accessToken = loginResponse.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.attendanceEvent.deleteMany({
      where: { userId: testUser.id },
    });
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
    // Clean attendance events before each test
    await prisma.attendanceEvent.deleteMany({
      where: { userId: testUser.id },
    });
  });

  describe('POST /api/attendance/clock-in', () => {
    it('should successfully clock in with valid QR code and location', async () => {
      const response = await request(app)
        .post('/api/attendance/clock-in')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Company-Slug', 'attendance-test-company')
        .send({
          qrCode: 'attendance-test-qr',
          location: {
            latitude: 48.1486,
            longitude: 17.1077,
            accuracy: 10,
          },
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          userId: testUser.id,
          type: 'CLOCK_IN',
          timestamp: expect.any(String),
          qrVerified: true,
          location: {
            latitude: 48.1486,
            longitude: 17.1077,
            accuracy: 10,
          },
        },
      });

      // Verify event was created in database
      const event = await prisma.attendanceEvent.findFirst({
        where: { userId: testUser.id, type: 'CLOCK_IN' },
      });
      expect(event).toBeTruthy();
    });

    it('should reject clock in with invalid QR code', async () => {
      const response = await request(app)
        .post('/api/attendance/clock-in')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Company-Slug', 'attendance-test-company')
        .send({
          qrCode: 'invalid-qr-code',
          location: {
            latitude: 48.1486,
            longitude: 17.1077,
            accuracy: 10,
          },
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Neplatný QR kód'),
      });
    });

    it('should reject clock in outside geofence', async () => {
      const response = await request(app)
        .post('/api/attendance/clock-in')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Company-Slug', 'attendance-test-company')
        .send({
          qrCode: 'attendance-test-qr',
          location: {
            latitude: 48.2486, // Far from company location
            longitude: 17.2077,
            accuracy: 10,
          },
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('mimo pracoviska'),
      });
    });

    it('should reject clock in when already clocked in', async () => {
      // First clock in
      await request(app)
        .post('/api/attendance/clock-in')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Company-Slug', 'attendance-test-company')
        .send({
          qrCode: 'attendance-test-qr',
          location: {
            latitude: 48.1486,
            longitude: 17.1077,
            accuracy: 10,
          },
        })
        .expect(200);

      // Try to clock in again
      const response = await request(app)
        .post('/api/attendance/clock-in')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Company-Slug', 'attendance-test-company')
        .send({
          qrCode: 'attendance-test-qr',
          location: {
            latitude: 48.1486,
            longitude: 17.1077,
            accuracy: 10,
          },
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('prihlásený'),
      });
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/attendance/clock-in')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Company-Slug', 'attendance-test-company')
        .send({
          // Missing qrCode and location
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('validation'),
      });
    });
  });

  describe('POST /api/attendance/clock-out', () => {
    beforeEach(async () => {
      // Clock in first
      await request(app)
        .post('/api/attendance/clock-in')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Company-Slug', 'attendance-test-company')
        .send({
          qrCode: 'attendance-test-qr',
          location: {
            latitude: 48.1486,
            longitude: 17.1077,
            accuracy: 10,
          },
        });
    });

    it('should successfully clock out when clocked in', async () => {
      const response = await request(app)
        .post('/api/attendance/clock-out')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Company-Slug', 'attendance-test-company')
        .send({
          location: {
            latitude: 48.1486,
            longitude: 17.1077,
            accuracy: 10,
          },
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          userId: testUser.id,
          type: 'CLOCK_OUT',
          timestamp: expect.any(String),
          location: {
            latitude: 48.1486,
            longitude: 17.1077,
            accuracy: 10,
          },
        },
      });

      // Verify event was created in database
      const event = await prisma.attendanceEvent.findFirst({
        where: { userId: testUser.id, type: 'CLOCK_OUT' },
      });
      expect(event).toBeTruthy();
    });

    it('should reject clock out when not clocked in', async () => {
      // Clock out first to reset state
      await request(app)
        .post('/api/attendance/clock-out')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Company-Slug', 'attendance-test-company')
        .send({
          location: {
            latitude: 48.1486,
            longitude: 17.1077,
            accuracy: 10,
          },
        });

      // Try to clock out again
      const response = await request(app)
        .post('/api/attendance/clock-out')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Company-Slug', 'attendance-test-company')
        .send({
          location: {
            latitude: 48.1486,
            longitude: 17.1077,
            accuracy: 10,
          },
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('prihlásený'),
      });
    });
  });

  describe('GET /api/attendance/status', () => {
    it('should return CLOCKED_OUT when no events', async () => {
      const response = await request(app)
        .get('/api/attendance/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Company-Slug', 'attendance-test-company')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          status: 'CLOCKED_OUT',
          lastEvent: null,
        },
      });
    });

    it('should return CLOCKED_IN when clocked in', async () => {
      // Clock in first
      await request(app)
        .post('/api/attendance/clock-in')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Company-Slug', 'attendance-test-company')
        .send({
          qrCode: 'attendance-test-qr',
          location: {
            latitude: 48.1486,
            longitude: 17.1077,
            accuracy: 10,
          },
        });

      const response = await request(app)
        .get('/api/attendance/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Company-Slug', 'attendance-test-company')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          status: 'CLOCKED_IN',
          lastEvent: {
            type: 'CLOCK_IN',
            timestamp: expect.any(String),
          },
        },
      });
    });
  });

  describe('POST /api/attendance/break/start', () => {
    beforeEach(async () => {
      // Clock in first
      await request(app)
        .post('/api/attendance/clock-in')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Company-Slug', 'attendance-test-company')
        .send({
          qrCode: 'attendance-test-qr',
          location: {
            latitude: 48.1486,
            longitude: 17.1077,
            accuracy: 10,
          },
        });
    });

    it('should successfully start break when clocked in', async () => {
      const response = await request(app)
        .post('/api/attendance/break/start')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Company-Slug', 'attendance-test-company')
        .send({
          type: 'BREAK',
          location: {
            latitude: 48.1486,
            longitude: 17.1077,
            accuracy: 10,
          },
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          userId: testUser.id,
          type: 'BREAK_START',
          timestamp: expect.any(String),
        },
      });
    });

    it('should reject break start when not clocked in', async () => {
      // Clock out first
      await request(app)
        .post('/api/attendance/clock-out')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Company-Slug', 'attendance-test-company')
        .send({
          location: {
            latitude: 48.1486,
            longitude: 17.1077,
            accuracy: 10,
          },
        });

      const response = await request(app)
        .post('/api/attendance/break/start')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Company-Slug', 'attendance-test-company')
        .send({
          type: 'BREAK',
          location: {
            latitude: 48.1486,
            longitude: 17.1077,
            accuracy: 10,
          },
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('prihlásený'),
      });
    });
  });

  describe('Authorization and Authentication', () => {
    it('should reject requests without token', async () => {
      const response = await request(app)
        .post('/api/attendance/clock-in')
        .set('X-Company-Slug', 'attendance-test-company')
        .send({
          qrCode: 'attendance-test-qr',
          location: {
            latitude: 48.1486,
            longitude: 17.1077,
            accuracy: 10,
          },
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'No token provided',
      });
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .post('/api/attendance/clock-in')
        .set('Authorization', 'Bearer invalid-token')
        .set('X-Company-Slug', 'attendance-test-company')
        .send({
          qrCode: 'attendance-test-qr',
          location: {
            latitude: 48.1486,
            longitude: 17.1077,
            accuracy: 10,
          },
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid token',
      });
    });

    it('should reject requests without company slug', async () => {
      const response = await request(app)
        .post('/api/attendance/clock-in')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          qrCode: 'attendance-test-qr',
          location: {
            latitude: 48.1486,
            longitude: 17.1077,
            accuracy: 10,
          },
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Company slug required',
      });
    });
  });
});
