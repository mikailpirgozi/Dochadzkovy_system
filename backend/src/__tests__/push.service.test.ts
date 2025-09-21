import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PushService } from '../services/push.service.js';
import { prisma } from '../utils/database.js';

// Mock Prisma
vi.mock('../utils/database.js', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
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

// Mock Expo SDK
vi.mock('expo-server-sdk', () => {
  const mockExpo = {
    isExpoPushToken: vi.fn(),
    chunkPushNotifications: vi.fn(),
    sendPushNotificationsAsync: vi.fn(),
  };
  
  return {
    Expo: vi.fn().mockImplementation(() => mockExpo),
    isExpoPushToken: mockExpo.isExpoPushToken,
  };
});

describe('PushService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('sendToUsers', () => {
    it('should send push notifications to users with valid tokens', async () => {
      const mockUsers = [
        {
          id: 'user1',
          pushToken: 'ExponentPushToken[valid-token-1]',
          firstName: 'John',
          lastName: 'Doe',
        },
        {
          id: 'user2',
          pushToken: 'ExponentPushToken[valid-token-2]',
          firstName: 'Jane',
          lastName: 'Smith',
        },
      ];

      const mockTickets = [
        { id: 'ticket1', status: 'ok' },
        { id: 'ticket2', status: 'ok' },
      ];

      (prisma.user.findMany as any).mockResolvedValue(mockUsers);
      
      // Mock Expo methods
      const { Expo } = await import('expo-server-sdk');
      const mockExpoInstance = new Expo();
      (Expo.isExpoPushToken as any).mockReturnValue(true);
      (mockExpoInstance.chunkPushNotifications as any).mockReturnValue([
        [{ to: 'ExponentPushToken[valid-token-1]', title: 'Test', body: 'Message' }],
        [{ to: 'ExponentPushToken[valid-token-2]', title: 'Test', body: 'Message' }],
      ]);
      (mockExpoInstance.sendPushNotificationsAsync as any).mockResolvedValue(mockTickets);

      const result = await PushService.sendToUsers(['user1', 'user2'], {
        title: 'Test',
        body: 'Message',
        data: { type: 'general' }
      });

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['user1', 'user2'] },
          pushToken: { not: null },
          isActive: true,
        },
        select: {
          id: true,
          pushToken: true,
          firstName: true,
          lastName: true,
        },
      });

      expect(result).toEqual(mockTickets);
    });

    it('should handle users without push tokens', async () => {
      const mockUsers = [
        {
          id: 'user1',
          pushToken: null,
          firstName: 'John',
          lastName: 'Doe',
        },
      ];

      (prisma.user.findMany as any).mockResolvedValue([]);

      const result = await PushService.sendToUsers(['user1'], {
        title: 'Test',
        body: 'Message',
        data: { type: 'general' }
      });

      expect(result).toEqual([]);
    });
  });

  describe('sendGeofenceViolation', () => {
    it('should send geofence violation notifications', async () => {
      const mockUser = {
        id: 'user1',
        pushToken: 'ExponentPushToken[valid-token]',
        firstName: 'John',
        lastName: 'Doe',
      };

      const mockTickets = [{ id: 'ticket1', status: 'ok' }];

      (prisma.user.findMany as any).mockResolvedValue([mockUser]);
      
      // Mock Expo methods
      const { Expo } = await import('expo-server-sdk');
      const mockExpoInstance = new Expo();
      (Expo.isExpoPushToken as any).mockReturnValue(true);
      (mockExpoInstance.chunkPushNotifications as any).mockReturnValue([
        [{ to: 'ExponentPushToken[valid-token]', title: 'Upozornenie na polohu', body: 'Si mimo pracoviska už viac ako 5 minút. Nezabudni sa odpipnúť!' }],
      ]);
      (mockExpoInstance.sendPushNotificationsAsync as any).mockResolvedValue(mockTickets);

      const result = await PushService.sendGeofenceViolation('user1', 'Test message', 'Test location');

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['user1'] },
          pushToken: { not: null },
          isActive: true,
        },
        select: {
          id: true,
          pushToken: true,
          firstName: true,
          lastName: true,
        },
      });

      expect(result).toEqual(mockTickets);
    });
  });

  describe('sendBreakReminder', () => {
    it('should send break reminder notification', async () => {
      const mockUser = {
        id: 'user1',
        pushToken: 'ExponentPushToken[valid-token]',
        firstName: 'John',
        lastName: 'Doe',
      };

      const mockTickets = [{ id: 'ticket1', status: 'ok' }];

      (prisma.user.findMany as any).mockResolvedValue([mockUser]);
      
      // Mock Expo methods
      const { Expo } = await import('expo-server-sdk');
      const mockExpoInstance = new Expo();
      (Expo.isExpoPushToken as any).mockReturnValue(true);
      (mockExpoInstance.chunkPushNotifications as any).mockReturnValue([
        [{ 
          to: 'ExponentPushToken[valid-token]', 
          title: 'Pripomienka na obed', 
          body: 'Obed trvá už 65 minút. Nezabudni sa vrátiť!' 
        }],
      ]);
      (mockExpoInstance.sendPushNotificationsAsync as any).mockResolvedValue(mockTickets);

      const result = await PushService.sendBreakReminder('user1', 65);

      expect(result).toEqual(mockTickets);
    });
  });

  describe('updateUserPushToken', () => {
    it('should update user push token successfully', async () => {
      const mockUser = {
        id: 'user1',
        pushToken: 'ExponentPushToken[new-token]',
      };

      // Mock Expo methods
      const { Expo } = await import('expo-server-sdk');
      const mockExpoInstance = new Expo();
      (Expo.isExpoPushToken as any).mockReturnValue(true);

      (prisma.user.update as any).mockResolvedValue(mockUser);

      const result = await PushService.updateUserPushToken('user1', 'ExponentPushToken[new-token]', 'ios');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user1' },
        data: {
          pushToken: 'ExponentPushToken[new-token]',
          pushTokenUpdatedAt: expect.any(Date),
        },
      });

      expect(result).toEqual(mockUser);
    });

    it('should reject invalid push token format', async () => {
      // Mock Expo methods
      const { Expo } = await import('expo-server-sdk');
      const mockExpoInstance = new Expo();
      (Expo.isExpoPushToken as any).mockReturnValue(false);

      await expect(
        PushService.updateUserPushToken('user1', 'invalid-token', 'ios')
      ).rejects.toThrow('Invalid push token format');
    });
  });

  describe('error handling', () => {
    it('should handle push notification API errors', async () => {
      const mockUsers = [
        {
          id: 'user1',
          pushToken: 'ExponentPushToken[valid-token]',
          firstName: 'John',
          lastName: 'Doe',
        },
      ];

      (prisma.user.findMany as any).mockResolvedValue(mockUsers);
      
      // Mock Expo methods
      const { Expo } = await import('expo-server-sdk');
      const mockExpoInstance = new Expo();
      (Expo.isExpoPushToken as any).mockReturnValue(true);
      (mockExpoInstance.chunkPushNotifications as any).mockReturnValue([
        [{ to: 'ExponentPushToken[valid-token]', title: 'Test', body: 'Message' }],
      ]);
      (mockExpoInstance.sendPushNotificationsAsync as any).mockRejectedValue(new Error('API Error'));

      const result = await PushService.sendToUsers(['user1'], {
        title: 'Test',
        body: 'Message',
        data: { type: 'general' }
      });

      // Should return empty array on error
      expect(result).toEqual([]);
    });
  });
});