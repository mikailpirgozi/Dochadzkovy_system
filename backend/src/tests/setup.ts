import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';

// Global test setup
beforeAll(() => {
  // Setup global test environment
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-key';
  process.env.JWT_EXPIRES_IN = '7d';
  process.env.JWT_REFRESH_EXPIRES_IN = '30d';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
});

afterAll(async () => {
  // Cleanup after all tests
});

beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
  vi.resetAllMocks();
});

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock Date.now for consistent testing
const mockDate = new Date('2024-01-15T10:00:00Z');
vi.setSystemTime(mockDate);

// Global mocks that apply to all tests
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockReturnValue('mock-jwt-token'),
    verify: vi.fn().mockReturnValue({ userId: 'user1', companyId: 'company1' }),
  },
}));

// Mock environment variables
vi.mock('../utils/environment.js', () => ({
  validateEnvironment: vi.fn().mockReturnValue({
    NODE_ENV: 'test',
    JWT_SECRET: 'test-secret-key',
    JWT_EXPIRES_IN: '7d',
    JWT_REFRESH_EXPIRES_IN: '30d',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
    CORS_ORIGIN: 'http://localhost:3000',
    PORT: 3000,
    SMTP_HOST: '',
    SMTP_PORT: 587,
    SMTP_USER: '',
    SMTP_PASS: '',
    SMTP_FROM: '',
    EXPO_ACCESS_TOKEN: '',
    RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000,
    RATE_LIMIT_MAX_REQUESTS: 100,
    LOG_LEVEL: 'info',
    ADMIN_DASHBOARD_URL: 'http://localhost:3001',
    MAX_FILE_SIZE: 10 * 1024 * 1024,
    ALLOWED_FILE_TYPES: 'image/jpeg,image/png,application/pdf',
  }),
  getConfig: vi.fn().mockReturnValue({
    NODE_ENV: 'test',
    JWT_SECRET: 'test-secret-key',
    JWT_EXPIRES_IN: '7d',
    JWT_REFRESH_EXPIRES_IN: '30d',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
    CORS_ORIGIN: 'http://localhost:3000',
    PORT: 3000,
    SMTP_HOST: '',
    SMTP_PORT: 587,
    SMTP_USER: '',
    SMTP_PASS: '',
    SMTP_FROM: '',
    EXPO_ACCESS_TOKEN: '',
    RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000,
    RATE_LIMIT_MAX_REQUESTS: 100,
    LOG_LEVEL: 'info',
    ADMIN_DASHBOARD_URL: 'http://localhost:3001',
    MAX_FILE_SIZE: 10 * 1024 * 1024,
    ALLOWED_FILE_TYPES: 'image/jpeg,image/png,application/pdf',
  }),
}));

// Mock logger to prevent console spam
vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock Prisma client
vi.mock('../utils/database.js', () => ({
  prisma: {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    company: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    attendanceEvent: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    locationLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    alert: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    correction: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    businessTrip: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Export common test utilities
export const createMockUser = (overrides = {}) => ({
  id: 'user1',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'EMPLOYEE',
  companyId: 'company1',
  isActive: true,
  settings: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockCompany = (overrides = {}) => ({
  id: 'company1',
  name: 'Test Company',
  slug: 'test-company',
  qrCode: 'test-qr-code',
  settings: {},
  geofence: {
    latitude: 48.1486,
    longitude: 17.1077,
    radius: 100,
  },
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockAttendanceEvent = (overrides = {}) => ({
  id: 'event1',
  userId: 'user1',
  companyId: 'company1',
  type: 'CLOCK_IN',
  timestamp: new Date(),
  location: {
    latitude: 48.1486,
    longitude: 17.1077,
    accuracy: 10,
  },
  qrVerified: true,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockBusinessTrip = (overrides = {}) => ({
  id: 'trip1',
  userId: 'user1',
  companyId: 'company1',
  destination: 'Prague',
  purpose: 'Client meeting',
  estimatedStart: new Date('2024-01-15T09:00:00Z'),
  estimatedEnd: new Date('2024-01-15T17:00:00Z'),
  status: 'PENDING',
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});
