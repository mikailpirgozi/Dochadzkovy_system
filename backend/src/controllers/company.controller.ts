import type { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import { createError } from '../middleware/errorHandler.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { generateQRCode, generateCompanySlug } from '../utils/helpers.js';

// Validation schemas
const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  slug: z.string().min(1, 'Company slug is required').optional(),
  settings: z.record(z.unknown()).optional(),
  geofence: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    radius: z.number().min(10).max(10000), // 10m to 10km
  }),
  adminUser: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
  }),
});

const updateCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required').optional(),
  settings: z.record(z.unknown()).optional(),
  geofence: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    radius: z.number().min(10).max(10000),
  }).optional(),
  isActive: z.boolean().optional(),
});

const validateCompanySchema = z.object({
  slug: z.string().min(1, 'Company slug is required'),
});

class CompanyController {
  // Get all companies (Super Admin only)
  async getAllCompanies(req: AuthenticatedRequest, res: Response): Promise<void> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              users: true,
            },
          },
        },
      }),
      prisma.company.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        companies,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });
  }

  // Get company by ID or slug
  async getCompany(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'Company ID or slug is required' });
      return;
    }

    // Check if it's a slug or ID
    const isSlug = !(/^[a-f\d]{24}$/i.exec(id)) && !id.startsWith('c');
    
    const company = await prisma.company.findUnique({
      where: isSlug ? { slug: id } : { id },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!company) {
      throw createError.notFound('Company not found');
    }

    // Check permissions - users can only see their own company unless they're super admin
     
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.companyId !== company.id) {
      throw createError.forbidden('Access denied');
    }

    res.json({
      success: true,
      data: company,
    });
  }

  // Create new company (Super Admin only)
  async createCompany(req: AuthenticatedRequest, res: Response): Promise<void> {
    const validatedData = createCompanySchema.parse(req.body);
    const { name, slug, settings, geofence, adminUser } = validatedData;

    // Generate slug if not provided
    const companySlug = slug ?? generateCompanySlug(name);

    // Check if slug already exists
    const existingCompany = await prisma.company.findUnique({
      where: { slug: companySlug },
    });

    if (existingCompany) {
      throw createError.conflict('Company slug already exists');
    }

    // Check if admin email already exists
    const existingUser = await prisma.user.findFirst({
      where: { email: adminUser.email.toLowerCase() },
    });

    if (existingUser) {
      throw createError.conflict('Admin email already exists');
    }

    // Generate QR code for the company
    const qrCode = generateQRCode(companySlug);

    // Create company and admin user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create company
      const company = await tx.company.create({
        data: {
          name,
          slug: companySlug,
          qrCode,
          settings: settings as any ?? {},
          geofence,
        },
      });

      // Hash admin password
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(adminUser.password, 12);

      // Create admin user
      const admin = await tx.user.create({
        data: {
          email: adminUser.email.toLowerCase(),
          password: hashedPassword,
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
          role: 'COMPANY_ADMIN',
          companyId: company.id,
        },
      });

      return { company, admin };
    });

    // Remove password from response
    const { password: _, ...adminWithoutPassword } = result.admin;

     
    logger.info(`Company created: ${result.company.name} (${result.company.slug}) by ${req.user?.email}`);

    res.status(201).json({
      success: true,
      data: {
        company: result.company,
        admin: adminWithoutPassword,
      },
      message: 'Company created successfully',
    });
  }

  // Update company
  async updateCompany(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const validatedData = updateCompanySchema.parse(req.body);

    // Find company
    const company = await prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      throw createError.notFound('Company not found');
    }

    // Check permissions
     
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.companyId !== company.id) {
      throw createError.forbidden('Access denied');
    }

    // Company admins can't deactivate their own company
     
    if (req.user?.role === 'COMPANY_ADMIN' && validatedData.isActive === false) {
      throw createError.forbidden('Cannot deactivate own company');
    }

    // Update company
    const updateData: Record<string, unknown> = { ...validatedData, updatedAt: new Date() };
    if (validatedData.settings) {
      updateData.settings = validatedData.settings;
    }
    
    const updatedCompany = await prisma.company.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

     
    logger.info(`Company updated: ${updatedCompany.name} by ${req.user?.email}`);

    res.json({
      success: true,
      data: updatedCompany,
      message: 'Company updated successfully',
    });
  }

  // Delete company (Super Admin only)
  async deleteCompany(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;

    // Find company
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!company) {
      throw createError.notFound('Company not found');
    }

    // Check if company has users
    if (company._count.users > 0) {
      throw createError.badRequest('Cannot delete company with existing users');
    }

    // Delete company
    await prisma.company.delete({
      where: { id },
    });

     
    logger.info(`Company deleted: ${company.name} by ${req.user?.email}`);

    res.json({
      success: true,
      message: 'Company deleted successfully',
    });
  }

  // Validate company slug (public endpoint)
  async validateCompany(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { slug } = validateCompanySchema.parse(req.params);

    const company = await prisma.company.findUnique({
      where: { 
        slug,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        settings: true,
        createdAt: true,
      },
    });

    if (!company) {
      throw createError.notFound('Company not found');
    }

    res.json({
      success: true,
      data: {
        exists: true,
        company: {
          name: company.name,
          slug: company.slug,
          settings: company.settings,
        },
      },
    });
  }

  // Get company statistics (for admins)
  async getCompanyStats(req: AuthenticatedRequest, res: Response): Promise<void> {
     
    if (!req.company) {
      throw createError.badRequest('Company context required');
    }

    const companyId = req.company.id;

    // Get various statistics
    const [
      totalUsers,
      activeUsers,
      todayAttendance,
      currentlyWorking,
      thisMonthHours,
    ] = await Promise.all([
      // Total users
      prisma.user.count({
        where: { companyId },
      }),
      
      // Active users (logged in last 30 days)
      prisma.user.count({
        where: {
          companyId,
          isActive: true,
          updatedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Today's attendance events
      prisma.attendanceEvent.count({
        where: {
          user: { companyId },
          timestamp: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),

      // Currently working (last event was CLOCK_IN)
      prisma.$queryRaw`
        SELECT COUNT(DISTINCT user_id) as count
        FROM attendance_events ae1
        WHERE ae1.user_id IN (
          SELECT id FROM users WHERE company_id = ${companyId}
        )
        AND ae1.timestamp = (
          SELECT MAX(ae2.timestamp)
          FROM attendance_events ae2
          WHERE ae2.user_id = ae1.user_id
        )
        AND ae1.type = 'CLOCK_IN'
      `,

      // This month's total hours
      prisma.$queryRaw`
        SELECT COALESCE(SUM(
          CASE 
            WHEN ae_out.timestamp IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (ae_out.timestamp - ae_in.timestamp)) / 3600
            ELSE 0
          END
        ), 0) as total_hours
        FROM attendance_events ae_in
        LEFT JOIN attendance_events ae_out ON (
          ae_out.user_id = ae_in.user_id 
          AND ae_out.type = 'CLOCK_OUT'
          AND ae_out.timestamp > ae_in.timestamp
          AND ae_out.timestamp = (
            SELECT MIN(ae3.timestamp)
            FROM attendance_events ae3
            WHERE ae3.user_id = ae_in.user_id
            AND ae3.type = 'CLOCK_OUT'
            AND ae3.timestamp > ae_in.timestamp
          )
        )
        WHERE ae_in.type = 'CLOCK_IN'
        AND ae_in.user_id IN (
          SELECT id FROM users WHERE company_id = ${companyId}
        )
        AND ae_in.timestamp >= date_trunc('month', CURRENT_DATE)
      `,
    ]);

    const stats = {
      users: {
        total: totalUsers,
        active: activeUsers,
      },
      attendance: {
        todayEvents: todayAttendance,
        currentlyWorking: (currentlyWorking as Array<{ count: number }>)[0]?.count ?? 0,
      },
      hours: {
        thisMonth: (thisMonthHours as Array<{ total_hours: number }>)[0]?.total_hours ?? 0,
      },
    };

    res.json({
      success: true,
      data: stats,
    });
  }

  // Regenerate company QR code
  async regenerateQRCode(req: AuthenticatedRequest, res: Response): Promise<void> {
     
    if (!req.company) {
      throw createError.badRequest('Company context required');
    }

    // Only company admins and super admins can regenerate QR codes
     
    if (!['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(req.user?.role ?? '')) {
      throw createError.forbidden('Insufficient permissions');
    }

    const newQRCode = generateQRCode(req.company.slug);

    const updatedCompany = await prisma.company.update({
      where: { id: req.company.id },
      data: {
        qrCode: newQRCode,
        updatedAt: new Date(),
      },
    });

     
    logger.info(`QR code regenerated for company: ${req.company.name} by ${req.user?.email}`);

    res.json({
      success: true,
      data: {
        qrCode: updatedCompany.qrCode,
      },
      message: 'QR code regenerated successfully',
    });
  }
}

export const companyController = new CompanyController();
