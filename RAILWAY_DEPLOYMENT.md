# Railway Deployment Guide - Dochádzka Pro Backend

## 🚀 Quick Deploy

1. **Create Railway Account**: Go to [railway.app](https://railway.app) and sign up
2. **Create New Project**: Click "New Project" → "Deploy from GitHub repo"
3. **Connect Repository**: Select this repository
4. **Configure Service**: Select `backend` folder as root directory

## 🔧 Environment Variables

Set these environment variables in Railway dashboard:

### Required Variables
```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/attendance_pro
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
NODE_ENV=production
PORT=3000
```

### Optional Variables
```bash
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
CORS_ORIGIN=https://your-frontend.com,https://your-mobile.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
EXPO_ACCESS_TOKEN=your-expo-access-token
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=Attendance Pro <noreply@attendance-pro.com>
```

## 🗄️ Database Setup

1. **Add PostgreSQL**: In Railway dashboard, click "New" → "Database" → "PostgreSQL"
2. **Copy DATABASE_URL**: Go to PostgreSQL service → Variables → Copy DATABASE_URL
3. **Set in Backend**: Add DATABASE_URL to backend service environment variables

## 📁 Project Structure

```
backend/
├── Dockerfile          # Multi-stage Docker build
├── railway.json        # Railway configuration
├── package.json        # Dependencies and scripts
├── prisma/
│   └── schema.prisma   # Database schema
└── src/
    ├── index.ts        # Application entry point
    ├── controllers/    # API controllers
    ├── services/       # Business logic
    ├── routes/         # API routes
    └── utils/          # Utilities
```

## 🔄 Deployment Process

Railway will automatically:
1. **Build**: Use Dockerfile to build the application
2. **Install**: Run `npm ci` to install dependencies
3. **Generate**: Run `npx prisma generate` to generate Prisma client
4. **Compile**: Run `npm run build` to compile TypeScript
5. **Start**: Run `npm start` to start the server

## 🏥 Health Check

The application includes a health check endpoint at `/health` that Railway uses to monitor the service.

## 🔐 Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Request throttling
- **JWT Authentication**: Secure token-based auth
- **Input Validation**: Zod schema validation
- **Audit Logging**: Complete audit trail

## 📊 Monitoring

- **Logs**: Available in Railway dashboard
- **Metrics**: CPU, memory, and network usage
- **Health**: Automatic health checks
- **Alerts**: Configure notifications for issues

## 🚀 Production Checklist

- [ ] Set strong JWT_SECRET (32+ characters)
- [ ] Configure DATABASE_URL from Railway PostgreSQL
- [ ] Set production CORS_ORIGIN domains
- [ ] Configure SMTP for email notifications (optional)
- [ ] Set EXPO_ACCESS_TOKEN for push notifications (optional)
- [ ] Review rate limiting settings
- [ ] Test health endpoint: `https://your-app.railway.app/health`

## 🔧 Manual Commands

If needed, you can run these commands in Railway's terminal:

```bash
# Database migration
npx prisma migrate deploy

# Seed database
npm run db:seed

# Create test admin
npx tsx src/scripts/create-test-admin.ts
```

## 📱 Mobile App Configuration

After deployment, update your mobile app's API endpoint:

```typescript
// mobile/src/services/api.ts
const API_BASE_URL = 'https://your-app.railway.app';
```

## 🌐 Web Dashboard Configuration

Update web dashboard's API endpoint:

```typescript
// web-dashboard/src/lib/api.ts
const API_BASE_URL = 'https://your-app.railway.app';
```

## 🆘 Troubleshooting

### Common Issues

1. **Build Fails**: Check Node.js version (should be 20.x)
2. **Database Connection**: Verify DATABASE_URL is set correctly
3. **Environment Variables**: Ensure all required vars are set
4. **CORS Errors**: Add your frontend domains to CORS_ORIGIN

### Logs

Check Railway logs for detailed error information:
- Go to Railway dashboard
- Select your service
- Click "Logs" tab

### Support

- Railway Docs: [docs.railway.app](https://docs.railway.app)
- Railway Discord: [discord.gg/railway](https://discord.gg/railway)
