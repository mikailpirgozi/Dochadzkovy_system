import type { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import { createError } from '../middleware/errorHandler.js';
import { getConfig } from '../utils/environment.js';
import type { 
  AuthenticatedRequest, 
  LoginRequest, 
  RegisterRequest, 
  LoginResponse,
  JWTPayload,
  TokenPair 
} from '../types/index.js';

const config = getConfig();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  companySlug: z.string().min(1, 'Company slug is required'),
});

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  companySlug: z.string().min(1, 'Company slug is required'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  email: z.string().email('Invalid email format').optional(),
  settings: z.record(z.unknown()).optional(),
});

const updateDeviceSchema = z.object({
  deviceId: z.string().min(1, 'Device ID is required'),
  pushToken: z.string().optional(),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Generate JWT tokens
const generateTokens = (userId: string, companyId: string, role: string): TokenPair => {
  const payload: JWTPayload = {
    userId,
    companyId,
    role: role as JWTPayload['role'],
  };

  const accessToken = jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  } as jwt.SignOptions);

  const refreshToken = jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);

  return { accessToken, refreshToken };
};

// Hash password
const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// Verify password
const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

class AuthController {
  // Login user
  async login(req: AuthenticatedRequest, res: Response): Promise<void> {
    const validatedData = loginSchema.parse(req.body) as LoginRequest;
    const { email, password, companySlug } = validatedData;

    // Find company
    const company = await prisma.company.findUnique({
      where: { 
        slug: companySlug,
        isActive: true,
      },
    });

    if (!company) {
      throw createError.notFound('Company not found');
    }

    // Find user in the company
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        companyId: company.id,
        isActive: true,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            qrCode: true,
            settings: true,
            geofence: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!user) {
      throw createError.unauthorized('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      throw createError.unauthorized('Invalid credentials');
    }

    // Generate tokens
    const tokens = generateTokens(user.id, user.companyId, user.role);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    const response: LoginResponse = {
      user: userWithoutPassword,
      tokens,
    };

    logger.logAuth('login', user.id, user.email);

    res.json({
      success: true,
      data: response,
      message: 'Login successful',
    });
  }

  // Register new user
  async register(req: AuthenticatedRequest, res: Response): Promise<void> {
    const validatedData = registerSchema.parse(req.body) as RegisterRequest;
    const { email, password, firstName, lastName, companySlug } = validatedData;

    // Find company
    const company = await prisma.company.findUnique({
      where: { 
        slug: companySlug,
        isActive: true,
      },
    });

    if (!company) {
      throw createError.notFound('Company not found');
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        companyId: company.id,
      },
    });

    if (existingUser) {
      throw createError.conflict('User already exists in this company');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        companyId: company.id,
        role: 'EMPLOYEE', // Default role
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            qrCode: true,
            settings: true,
            geofence: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    // Generate tokens
    const tokens = generateTokens(user.id, user.companyId, user.role);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    const response: LoginResponse = {
      user: userWithoutPassword,
      tokens,
    };

    logger.logAuth('register', user.id, user.email);

    res.status(201).json({
      success: true,
      data: response,
      message: 'Registration successful',
    });
  }

  // Refresh access token
  async refreshToken(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { refreshToken } = refreshTokenSchema.parse(req.body);

    try {
      const decoded = jwt.verify(refreshToken, config.JWT_SECRET) as JWTPayload;

      // Verify user still exists and is active
      const user = await prisma.user.findUnique({
        where: { 
          id: decoded.userId,
          isActive: true,
        },
        include: {
          company: {
            select: {
              id: true,
              isActive: true,
            },
          },
        },
      });

       
      if (!user || !user.company?.isActive) {
        throw createError.unauthorized('User or company not found or inactive');
      }

      // Generate new tokens
      const tokens = generateTokens(user.id, user.companyId, user.role);

      logger.logAuth('refresh-token', user.id);

      res.json({
        success: true,
        data: tokens,
        message: 'Token refreshed successfully',
      });
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw createError.unauthorized('Invalid refresh token');
      }
      throw error;
    }
  }

  // Logout user
  logout(req: AuthenticatedRequest, res: Response): void {
    // In a stateless JWT system, logout is handled client-side
    // Here we could add token blacklisting if needed
    
     
    logger.logAuth('logout', req.user?.id);

    res.json({
      success: true,
      message: 'Logout successful',
    });
  }

  // Get user profile
  getProfile(req: AuthenticatedRequest, res: Response): void {
     
    if (!req.user) {
      throw createError.unauthorized('User not found');
    }

    const { password: _, ...userWithoutPassword } = req.user;

    res.json({
      success: true,
      data: userWithoutPassword,
    });
  }

  // Update user profile
  async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
     
    if (!req.user) {
      throw createError.unauthorized('User not found');
    }

    const validatedData = updateProfileSchema.parse(req.body);

    // Check if email is being changed and if it's already taken
    if (validatedData.email && validatedData.email !== req.user.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: validatedData.email.toLowerCase(),
          companyId: req.user.companyId,
          id: { not: req.user.id },
        },
      });

      if (existingUser) {
        throw createError.conflict('Email already taken');
      }
    }

    // Update user
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (validatedData.firstName) updateData.firstName = validatedData.firstName;
    if (validatedData.lastName) updateData.lastName = validatedData.lastName;
    if (validatedData.email) updateData.email = validatedData.email.toLowerCase();
    if (validatedData.settings) updateData.settings = validatedData.settings;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            qrCode: true,
            settings: true,
            geofence: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    const { password: _, ...userWithoutPassword } = updatedUser;

    logger.logAuth('update-profile', req.user.id);

    res.json({
      success: true,
      data: userWithoutPassword,
      message: 'Profile updated successfully',
    });
  }

  // Change password
  async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
     
    if (!req.user) {
      throw createError.unauthorized('User not found');
    }

    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(currentPassword, req.user.password);
    if (!isCurrentPasswordValid) {
      throw createError.badRequest('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        password: hashedNewPassword,
        updatedAt: new Date(),
      },
    });

    logger.logAuth('change-password', req.user.id);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  }

  // Update device information
  async updateDevice(req: AuthenticatedRequest, res: Response): Promise<void> {
     
    if (!req.user) {
      throw createError.unauthorized('User not found');
    }

    const { deviceId, pushToken } = updateDeviceSchema.parse(req.body);

    // Update user device information
    const deviceUpdateData: Record<string, unknown> = {
      deviceId,
      updatedAt: new Date(),
    };

    if (pushToken !== undefined) {
      deviceUpdateData.pushToken = pushToken;
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: deviceUpdateData,
    });

    logger.logAuth('update-device', req.user.id);

    res.json({
      success: true,
      message: 'Device updated successfully',
    });
  }

  // Forgot password (placeholder - would need email service)
  forgotPassword(_req: AuthenticatedRequest, res: Response): void {
    // This would typically send a password reset email
    // For now, just return success to prevent email enumeration
    
    res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent',
    });
  }

  // Reset password (placeholder - would need token validation)
  resetPassword(_req: AuthenticatedRequest, res: Response): void {
    // This would validate a password reset token and update the password
    
    res.json({
      success: true,
      message: 'Password reset successfully',
    });
  }
}

export const authController = new AuthController();
