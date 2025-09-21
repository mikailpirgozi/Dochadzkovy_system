import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { apiService as api } from '../services/api';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should make login request with correct data', async () => {
      const mockResponse = { 
        data: { 
          success: true,
          data: {
            user: { id: '1', email: 'test@test.com', firstName: 'Test', lastName: 'User' },
            tokens: { accessToken: 'token123', refreshToken: 'refresh123' }
          }
        }
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const loginData = {
        email: 'test@test.com',
        password: 'password123',
        companySlug: 'test-company'
      };

      const result = await api.login(loginData);

      expect(mockedAxios.post).toHaveBeenCalledWith('/auth/login', loginData);
      expect(result.success).toBe(true);
    });

    it('should handle login errors correctly', async () => {
      const mockError = {
        response: {
          data: { error: 'Invalid credentials' },
          status: 401,
        },
      };
      mockedAxios.post.mockRejectedValue(mockError);

      const loginData = {
        email: 'test@test.com',
        password: 'wrongpassword',
        companySlug: 'test-company'
      };

      const result = await api.login(loginData);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });
  });

  describe('clockIn', () => {
    it('should make clockIn request with correct data', async () => {
      const mockResponse = { 
        data: { 
          success: true,
          data: {
            id: '1',
            type: 'CLOCK_IN',
            timestamp: new Date().toISOString(),
            location: { latitude: 48.1486, longitude: 17.1077, accuracy: 10 }
          }
        }
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const clockInData = {
        qrCode: 'test-qr',
        location: { latitude: 48.1486, longitude: 17.1077, accuracy: 10 }
      };

      const result = await api.clockIn(clockInData);

      expect(mockedAxios.post).toHaveBeenCalledWith('/attendance/clock-in', clockInData);
      expect(result.success).toBe(true);
    });
  });
});