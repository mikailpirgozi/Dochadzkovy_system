import { Server as SocketIOServer, type Socket } from 'socket.io';
import type { Server } from 'http';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/database.js';
import type { User } from '@prisma/client';

interface AuthenticatedSocket extends Socket {
  user: User;
  companyId: string;
}

interface JWTPayload {
  userId: string;
  companyId: string;
  role: string;
}

export class WebSocketService {
  private static io: SocketIOServer | null = null;
  private static readonly connectedUsers = new Map<string, AuthenticatedSocket>();

  /**
   * Initialize WebSocket server
   */
  static initialize(server: Server): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: [
          ...(process.env.CORS_ORIGIN ?? "http://localhost:8081,http://localhost:5173,http://localhost:5174,http://localhost:5175,http://192.168.1.22:8081,exp://192.168.1.22:8081,https://web-dashboard-production-b123.up.railway.app,https://dochadzkovy-system-web.vercel.app").split(',')
        ],
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.io.use(this.authenticateSocket.bind(this));
    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket as AuthenticatedSocket);
    });

    // console.log('WebSocket server initialized');
  }

  /**
   * Authenticate socket connection
   */
  private static authenticateSocket(socket: Socket, next: (err?: Error) => void): void {
    const authenticate = async (): Promise<void> => {
      try {
        const token = socket.handshake.auth.token ?? socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          next(new Error('Authentication token required'));
          return;
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          next(new Error('JWT secret not configured'));
          return;
        }
        const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          include: { company: true }
        });

        if (!user || !user.isActive) {
          next(new Error('Invalid user'));
          return;
        }

        (socket as AuthenticatedSocket).user = user;
        (socket as AuthenticatedSocket).companyId = user.companyId;
        next();
      } catch (_error) {
        next(new Error('Authentication failed'));
      }
    };

    authenticate().catch(() => {
      next(new Error('Authentication failed'));
    });
  }

  /**
   * Handle new socket connection
   */
  private static handleConnection(socket: AuthenticatedSocket): void {
    // console.log(`User ${socket.user.firstName} ${socket.user.lastName} connected to live dashboard`);
    
    // Store connected user
    this.connectedUsers.set(socket.id, socket);
    
    // Join company room
    const companyRoom = `company_${socket.companyId}`;
    socket.join(companyRoom);
    
    // Join user-specific room
    const userRoom = `user_${socket.user.id}`;
    socket.join(userRoom);

    // Send initial data
    void this.sendInitialDashboardData(socket).catch((_error: unknown) => {
      // console.error('Error sending initial dashboard data:', error);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      // console.log(`User ${socket.user.firstName} ${socket.user.lastName} disconnected`);
      this.connectedUsers.delete(socket.id);
    });

    // Handle live location updates
    socket.on('location_update', (locationData: Record<string, unknown>) => {
    void this.handleLocationUpdate(socket, locationData).catch((_error: unknown) => {
      // console.error('Error handling location update:', error);
    });
    });

    // Handle dashboard data requests
    socket.on('request_dashboard_data', () => {
      void this.sendInitialDashboardData(socket).catch((_error: unknown) => {
        // console.error('Error sending dashboard data:', error);
      });
    });

    // Handle live chart data requests
    socket.on('request_chart_data', (chartType: string) => {
      void this.sendChartData(socket, chartType).catch((_error: unknown) => {
        // console.error('Error sending chart data:', error);
      });
    });

    // Handle live employee status requests
    socket.on('request_employee_status', () => {
      void this.sendEmployeeStatus(socket).catch((_error: unknown) => {
        // console.error('Error sending employee status:', error);
      });
    });
  }

  /**
   * Send initial dashboard data to connected socket
   */
  private static async sendInitialDashboardData(socket: AuthenticatedSocket): Promise<void> {
    try {
      // Import DashboardService dynamically to avoid circular imports
      const { DashboardService } = await import('./dashboard.service.js');
      
      const dashboardStats = await DashboardService.getDashboardStats(socket.companyId);
      const liveEmployees = await DashboardService.getLiveEmployeeLocations(socket.companyId);
      
      socket.emit('dashboard_stats', dashboardStats);
      socket.emit('live_employees', liveEmployees);
    } catch (_error) {
      // console.error('Error sending initial dashboard data:', error);
      socket.emit('error', { message: 'Failed to load dashboard data' });
    }
  }

  /**
   * Send chart data to connected socket
   */
  private static async sendChartData(socket: AuthenticatedSocket, chartType: string): Promise<void> {
    try {
      const { DashboardService } = await import('./dashboard.service.js');
      
      let chartData;
      switch (chartType) {
        case 'weekly':
          chartData = await DashboardService.getWeeklyChartData(socket.companyId);
          break;
        case 'monthly':
          chartData = await DashboardService.getMonthlyChartData(socket.companyId);
          break;
        case 'comparison':
          chartData = await DashboardService.getComparisonChartData(socket.companyId, 'week');
          break;
        default:
          socket.emit('error', { message: 'Invalid chart type' });
          return;
      }
      
      socket.emit('chart_data', { type: chartType, data: chartData });
    } catch (_error) {
      // console.error('Error sending chart data:', error);
      socket.emit('error', { message: 'Failed to load chart data' });
    }
  }

  /**
   * Send employee status to connected socket
   */
  private static async sendEmployeeStatus(socket: AuthenticatedSocket): Promise<void> {
    try {
      const { DashboardService } = await import('./dashboard.service.js');
      
      const employeeStats = await DashboardService.getEmployeeStatistics(
        socket.companyId,
        'day',
        new Date()
      );
      
      socket.emit('employee_status', employeeStats);
    } catch (_error) {
      // console.error('Error sending employee status:', error);
      socket.emit('error', { message: 'Failed to load employee status' });
    }
  }

  /**
   * Handle location update from mobile app
   */
  private static async handleLocationUpdate(socket: AuthenticatedSocket, locationData: Record<string, unknown>): Promise<void> {
    try {
      const latitude = locationData.latitude as number;
      const longitude = locationData.longitude as number;
      const accuracy = locationData.accuracy as number;

      // Save location to database
      await prisma.locationLog.create({
        data: {
          userId: socket.user.id,
          latitude,
          longitude,
          accuracy,
          timestamp: new Date()
        }
      });

      // Broadcast location update to company room (excluding sender)
      const companyRoom = `company_${socket.companyId}`;
      socket.to(companyRoom).emit('employee_location_update', {
        userId: socket.user.id,
        name: `${socket.user.firstName} ${socket.user.lastName}`,
        location: locationData,
        timestamp: new Date().toISOString()
      });
    } catch (_error) {
      // console.error('Error handling location update:', error);
    }
  }

  /**
   * Broadcast attendance event to company
   */
  static broadcastAttendanceEvent(companyId: string, event: Record<string, unknown>): void {
    if (!this.io) {
      return;
    }

    const companyRoom = `company_${companyId}`;
    this.io.to(companyRoom).emit('attendance_event', {
      type: event.type,
      userId: event.userId,
      userName: event.userName,
      timestamp: event.timestamp,
      location: event.location
    });

    // Also update dashboard stats
    this.updateDashboardStats(companyId).catch((_error: unknown) => {
      // console.error('Error updating dashboard stats:', error);
    });
  }

  /**
   * Broadcast alert to company
   */
  static broadcastAlert(companyId: string, alert: Record<string, unknown>): void {
    if (!this.io) {
      return;
    }

    const companyRoom = `company_${companyId}`;
    this.io.to(companyRoom).emit('new_alert', {
      id: alert.id,
      type: alert.type,
      message: alert.message,
      userId: alert.userId,
      userName: alert.userName,
      timestamp: alert.createdAt,
      severity: (alert.severity as string) || 'medium'
    });

    // Also send to specific user
    const userRoom = `user_${alert.userId as string}`;
    this.io.to(userRoom).emit('personal_alert', {
      id: alert.id,
      type: alert.type,
      message: alert.message,
      timestamp: alert.createdAt,
      severity: (alert.severity as string) || 'medium'
    });
  }

  /**
   * Update dashboard stats for company
   */
  private static async updateDashboardStats(companyId: string): Promise<void> {
    try {
      // Import DashboardService dynamically to avoid circular imports
      const { DashboardService } = await import('./dashboard.service.js');
      
      const dashboardStats = await DashboardService.getDashboardStats(companyId);
      const liveEmployees = await DashboardService.getLiveEmployeeLocations(companyId);
      
      const companyRoom = `company_${companyId}`;
      this.io?.to(companyRoom).emit('dashboard_stats_update', dashboardStats);
      this.io?.to(companyRoom).emit('live_employees_update', liveEmployees);
    } catch (_error) {
      // console.error('Error updating dashboard stats:', error);
    }
  }

  /**
   * Send notification to specific user
   */
  static sendNotificationToUser(userId: string, notification: Record<string, unknown>): void {
    if (!this.io) {
      return;
    }

    const userRoom = `user_${userId}`;
    this.io.to(userRoom).emit('notification', notification);
  }

  /**
   * Send notification to all company users
   */
  static sendNotificationToCompany(companyId: string, notification: Record<string, unknown>): void {
    if (!this.io) {
      return;
    }

    const companyRoom = `company_${companyId}`;
    this.io.to(companyRoom).emit('notification', notification);
  }

  /**
   * Get connected users count for company
   */
  static getConnectedUsersCount(companyId: string): number {
    if (!this.io) {
      return 0;
    }

    const companyRoom = `company_${companyId}`;
    const room = this.io.sockets.adapter.rooms.get(companyRoom);
    return room?.size ?? 0;
  }

  /**
   * Get all connected users for company
   */
  static getConnectedUsers(companyId: string): Array<{ id: string; name: string; role: string }> {
    const connectedUsers: Array<{ id: string; name: string; role: string }> = [];
    
    this.connectedUsers.forEach((socket) => {
      if (socket.companyId === companyId) {
        connectedUsers.push({
          id: socket.user.id,
          name: `${socket.user.firstName} ${socket.user.lastName}`,
          role: socket.user.role
        });
      }
    });
    
    return connectedUsers;
  }

  /**
   * Broadcast chart data update to company
   */
  static async broadcastChartUpdate(companyId: string, chartType: string): Promise<void> {
    if (!this.io) {
      return;
    }

    try {
      const { DashboardService } = await import('./dashboard.service.js');
      
      let chartData;
      switch (chartType) {
        case 'weekly':
          chartData = await DashboardService.getWeeklyChartData(companyId);
          break;
        case 'monthly':
          chartData = await DashboardService.getMonthlyChartData(companyId);
          break;
        case 'comparison':
          chartData = await DashboardService.getComparisonChartData(companyId, 'week');
          break;
        default:
          return;
      }
      
      const companyRoom = `company_${companyId}`;
      this.io.to(companyRoom).emit('chart_data_update', { type: chartType, data: chartData });
    } catch (_error) {
      // console.error('Error broadcasting chart update:', error);
    }
  }

  /**
   * Broadcast employee status update to company
   */
  static async broadcastEmployeeStatusUpdate(companyId: string): Promise<void> {
    if (!this.io) {
      return;
    }

    try {
      const { DashboardService } = await import('./dashboard.service.js');
      
      const employeeStats = await DashboardService.getEmployeeStatistics(
        companyId,
        'day',
        new Date()
      );
      
      const companyRoom = `company_${companyId}`;
      this.io.to(companyRoom).emit('employee_status_update', employeeStats);
    } catch (_error) {
      // console.error('Error broadcasting employee status update:', error);
    }
  }

  /**
   * Broadcast live activity feed update
   */
  static broadcastActivityUpdate(companyId: string, activity: Record<string, unknown>): void {
    if (!this.io) {
      return;
    }

    const companyRoom = `company_${companyId}`;
    this.io.to(companyRoom).emit('activity_update', {
      id: activity.id,
      type: activity.type,
      userId: activity.userId,
      userName: activity.userName,
      description: activity.description,
      timestamp: activity.timestamp,
      data: activity.data
    });
  }
}
