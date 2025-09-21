import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Request, Response } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { prisma } from '../utils/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock Prisma
vi.mock('../utils/database.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    company: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

// Mock jwt
vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn(),
  },
}));

// Mock logger
vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock environment
vi.mock('../utils/environment.js', () => ({
  env: {
    JWT_SECRET: 'test-secret',
    JWT_EXPIRES_IN: '7d',
    JWT_REFRESH_EXPIRES_IN: '30d',
  },
  getConfig: vi.fn().mockReturnValue({
    JWT_SECRET: 'test-secret',
    JWT_EXPIRES_IN: '7d',
    JWT_REFRESH_EXPIRES_IN: '30d',
  }),
}));

describe('AuthController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: any;

  beforeEach(() => {
    mockReq = {
      body: {},
      headers: {},
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      cookie: vi.fn().mockReturnThis(),
      clearCookie: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const mockCompany = {
        id: 'company1',
        name: 'Test Company',
        slug: 'test-company',
        isActive: true,
      };

      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        password: 'hashedPassword',
        firstName: 'John',
        lastName: 'Doe',
        role: 'EMPLOYEE',
        companyId: 'company1',
        isActive: true,
        company: mockCompany,
      };

      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
        companySlug: 'test-company',
      };

      (prisma.company.findUnique as any).mockResolvedValue(mockCompany);
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);
      (jwt.sign as any)
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      await authController.login(mockReq as any, mockRes as Response);

      expect(prisma.company.findUnique).toHaveBeenCalledWith({
        where: { slug: 'test-company', isActive: true },
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          email: 'test@example.com',
          companyId: 'company1',
          isActive: true,
        },
        include: { company: true },
      });

      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: expect.objectContaining({
            id: 'user1',
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
          }),
          tokens: {
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
          },
        },
      });
    });

    it('should reject login with invalid company slug', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
        companySlug: 'invalid-company',
      };

      (prisma.company.findUnique as any).mockResolvedValue(null);

      await authController.login(mockReq as any, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Neplatné prihlasovacie údaje',
      });
    });

    it('should reject login with invalid email', async () => {
      const mockCompany = {
        id: 'company1',
        slug: 'test-company',
        isActive: true,
      };

      mockReq.body = {
        email: 'invalid@example.com',
        password: 'password123',
        companySlug: 'test-company',
      };

      (prisma.company.findUnique as any).mockResolvedValue(mockCompany);
      (prisma.user.findUnique as any).mockResolvedValue(null);

      await authController.login(mockReq as any, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Neplatné prihlasovacie údaje',
      });
    });

    it('should reject login with invalid password', async () => {
      const mockCompany = {
        id: 'company1',
        slug: 'test-company',
        isActive: true,
      };

      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        password: 'hashedPassword',
        companyId: 'company1',
        isActive: true,
      };

      mockReq.body = {
        email: 'test@example.com',
        password: 'wrongpassword',
        companySlug: 'test-company',
      };

      (prisma.company.findUnique as any).mockResolvedValue(mockCompany);
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(false);

      await authController.login(mockReq as any, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Neplatné prihlasovacie údaje',
      });
    });

    it('should reject login for inactive user', async () => {
      const mockCompany = {
        id: 'company1',
        slug: 'test-company',
        isActive: true,
      };

      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        password: 'hashedPassword',
        companyId: 'company1',
        isActive: false, // Inactive user
      };

      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
        companySlug: 'test-company',
      };

      (prisma.company.findUnique as any).mockResolvedValue(mockCompany);
      (prisma.user.findUnique as any).mockResolvedValue(null); // findUnique with isActive: true returns null

      await authController.login(mockReq as any, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Neplatné prihlasovacie údaje',
      });
    });
  });

  describe('register', () => {
    it('should successfully register new user', async () => {
      const mockCompany = {
        id: 'company1',
        slug: 'test-company',
        isActive: true,
      };

      const mockUser = {
        id: 'user1',
        email: 'newuser@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'EMPLOYEE',
        companyId: 'company1',
        isActive: true,
        company: mockCompany,
      };

      mockReq.body = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Doe',
        companySlug: 'test-company',
        role: 'EMPLOYEE',
      };

      (prisma.company.findUnique as any).mockResolvedValue(mockCompany);
      (prisma.user.findUnique as any).mockResolvedValue(null); // Email not taken
      (bcrypt.hash as any).mockResolvedValue('hashedPassword');
      (prisma.user.create as any).mockResolvedValue(mockUser);
      (jwt.sign as any)
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      await authController.register(mockReq as any, mockRes as Response);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'newuser@example.com',
          password: 'hashedPassword',
          firstName: 'Jane',
          lastName: 'Doe',
          role: 'EMPLOYEE',
          companyId: 'company1',
        },
        include: { company: true },
      });

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: expect.objectContaining({
            id: 'user1',
            email: 'newuser@example.com',
          }),
          tokens: {
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
          },
        },
      });
    });

    it('should reject registration with existing email', async () => {
      const mockCompany = {
        id: 'company1',
        slug: 'test-company',
        isActive: true,
      };

      const existingUser = {
        id: 'existing-user',
        email: 'existing@example.com',
      };

      mockReq.body = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Doe',
        companySlug: 'test-company',
      };

      (prisma.company.findUnique as any).mockResolvedValue(mockCompany);
      (prisma.user.findUnique as any).mockResolvedValue(existingUser);

      await authController.register(mockReq as any, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Používateľ s týmto emailom už existuje',
      });
    });

    it('should reject registration with invalid company', async () => {
      mockReq.body = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Doe',
        companySlug: 'invalid-company',
      };

      (prisma.company.findUnique as any).mockResolvedValue(null);

      await authController.register(mockReq as any, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Firma nebola nájdená',
      });
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh access token', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        isActive: true,
        company: {
          id: 'company1',
          isActive: true,
        },
      };

      mockReq.body = {
        refreshToken: 'valid-refresh-token',
      };

      (jwt.verify as any).mockReturnValue({
        userId: 'user1',
        companyId: 'company1',
        type: 'refresh',
      });
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (jwt.sign as any).mockReturnValue('new-access-token');

      await authController.refreshToken(mockReq as any, mockRes as Response);

      expect(jwt.verify).toHaveBeenCalledWith('valid-refresh-token', 'test-secret');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          accessToken: 'new-access-token',
        },
      });
    });

    it('should reject invalid refresh token', async () => {
      mockReq.body = {
        refreshToken: 'invalid-refresh-token',
      };

      (jwt.verify as any).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authController.refreshToken(mockReq as any, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Neplatný refresh token',
      });
    });
  });

  describe('logout', () => {
    it('should successfully logout user', () => {
      authController.logout(mockReq as any, mockRes as Response);

      expect(mockRes.clearCookie).toHaveBeenCalledWith('refreshToken');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Úspešne odhlásený',
      });
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
        companySlug: 'test-company',
      };

      (prisma.company.findUnique as any).mockRejectedValue(new Error('Database error'));

      await authController.login(mockReq as any, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Interná chyba servera',
      });
    });

    it('should handle bcrypt errors gracefully', async () => {
      const mockCompany = {
        id: 'company1',
        slug: 'test-company',
        isActive: true,
      };

      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        password: 'hashedPassword',
        companyId: 'company1',
        isActive: true,
      };

      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
        companySlug: 'test-company',
      };

      (prisma.company.findUnique as any).mockResolvedValue(mockCompany);
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockRejectedValue(new Error('Bcrypt error'));

      await authController.login(mockReq as any, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Interná chyba servera',
      });
    });
  });
});
