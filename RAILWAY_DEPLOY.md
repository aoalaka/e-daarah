# Railway Deployment Guide

Deploy e-daarah (Madrasah Admin) to Railway with MySQL, Backend, and Frontend.

## Prerequisites

1. [Railway account](https://railway.app)
2. GitHub repository with your code

## Deployment Steps

### 1. Create a New Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Connect your GitHub account and select this repository

### 2. Add MySQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"MySQL"**
3. Railway will automatically create the database and set `DATABASE_URL`

### 3. Initialize Database Schema

1. Click on your MySQL service
2. Go to **"Data"** tab
3. Open **"Query"** panel
4. Copy and paste the contents of `database/init.sql`
5. Execute to create all tables

### 4. Deploy Backend Service

1. Click **"+ New"** → **"GitHub Repo"**
2. Select your repo
3. In settings, set:
   - **Root Directory**: `backend`
   - **Start Command**: `npm start`

4. Add environment variables (Settings → Variables):
   ```
   NODE_ENV=production
   JWT_SECRET=<generate-a-secure-random-string>
   CORS_ORIGIN=https://your-frontend-url.railway.app
   FRONTEND_URL=https://your-frontend-url.railway.app
   ```

5. Link the MySQL database:
   - Click **"+ Variable Reference"**
   - Select `DATABASE_URL` from MySQL service

### 5. Deploy Frontend Service

1. Click **"+ New"** → **"GitHub Repo"**
2. Select your repo again
3. In settings, set:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx serve dist -s -l $PORT`

4. Add environment variable:
   ```
   VITE_API_URL=https://your-backend-url.railway.app/api
   ```

### 6. Configure Domain (Optional)

1. Click on each service → **Settings** → **Domains**
2. Generate a Railway domain or add custom domain

## Environment Variables Reference

### Backend
| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | MySQL connection (auto-set by Railway) | `mysql://user:pass@host/db` |
| `NODE_ENV` | Environment | `production` |
| `JWT_SECRET` | Secret for JWT tokens | Random 32+ char string |
| `CORS_ORIGIN` | Frontend URL | `https://frontend.railway.app` |
| `FRONTEND_URL` | For password reset links | `https://frontend.railway.app` |
| `SMTP_HOST` | Email server (optional) | `smtp.gmail.com` |
| `SMTP_PORT` | Email port (optional) | `587` |
| `SMTP_USER` | Email user (optional) | `your-email@gmail.com` |
| `SMTP_PASS` | Email password (optional) | App-specific password |

### Frontend
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://backend.railway.app/api` |

## Verify Deployment

1. **Backend Health Check**: Visit `https://your-backend.railway.app/api/health`
   - Should return: `{"status":"ok","message":"Madrasah Admin API is running"}`

2. **Frontend**: Visit `https://your-frontend.railway.app`
   - Should show the landing page

3. **Test Registration**: Go to `/register` and create a test madrasah

## Troubleshooting

### Backend won't start
- Check logs in Railway dashboard
- Verify `DATABASE_URL` is linked from MySQL service
- Ensure all required env vars are set

### Frontend shows API errors
- Verify `VITE_API_URL` points to correct backend URL
- Check CORS_ORIGIN in backend matches frontend URL
- Rebuild frontend after changing env vars

### Database connection fails
- Check MySQL service is running
- Verify `DATABASE_URL` format in backend variables
- Try adding `DB_SSL=true` if SSL is required

## Local Development

Use Docker Compose for local development:
```bash
docker-compose up --build
```

This starts:
- MySQL on port 3306
- Backend on port 5000
- Frontend on port 3000
