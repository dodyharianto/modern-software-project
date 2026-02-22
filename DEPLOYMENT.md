# Deployment Guide

This guide covers different ways to share your Agentic AI Recruiter App with teammates.

## Option 1: Quick Testing with ngrok (Easiest - Recommended for Testing)

**Best for**: Quick sharing with teammates for testing

### Setup:

1. **Install ngrok**:
   - Download from: https://ngrok.com/download
   - Or use: `winget install ngrok` (Windows)
   - Sign up for a free account at ngrok.com
   - Get your auth token from https://dashboard.ngrok.com/get-started/your-authtoken
   - Configure: `ngrok config add-authtoken YOUR_TOKEN`

2. **Use the provided script** (Easiest):
   ```powershell
   .\start_public.bat
   ```
   This will start everything automatically!

3. **Or manually**:

   a. **Start your backend**:
   ```powershell
   cd backend
   .\venv\Scripts\python.exe main.py
   ```

   b. **Create ngrok tunnel for backend** (in a new terminal):
   ```powershell
   ngrok http 8000
   ```
   Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

   c. **Update frontend environment**:
   - Create `frontend/.env.local` file
   - Add: `NEXT_PUBLIC_API_URL=https://abc123.ngrok.io`
   - (Replace with your actual ngrok backend URL)

   d. **Start your frontend** (in a new terminal):
   ```powershell
   cd frontend
   npm run dev
   ```

   e. **Create ngrok tunnel for frontend** (in a new terminal):
   ```powershell
   ngrok http 3000
   ```
   Copy the HTTPS URL - **this is what you share with teammates!**

**Note**: 
- Free ngrok URLs change each time you restart. For permanent URLs, upgrade to a paid plan.
- Remember to update `frontend/.env.local` with the new backend URL if you restart ngrok.

---

## Option 2: Deploy to Cloud Services (Recommended for Production)

### Backend Deployment Options:

#### A. Railway (Easy, Free Tier Available)
1. Go to https://railway.app
2. Sign up with GitHub
3. Create new project → Deploy from GitHub repo
4. Add environment variables (OPENAI_API_KEY)
5. Railway auto-detects Python and deploys

#### B. Render (Free Tier Available)
1. Go to https://render.com
2. Create new Web Service
3. Connect your GitHub repo
4. Set build command: `cd backend && pip install -r requirements.txt`
5. Set start command: `cd backend && python main.py`
6. Add environment variables

#### C. Heroku (Paid, but reliable)
1. Install Heroku CLI
2. Login: `heroku login`
3. Create app: `heroku create your-app-name`
4. Deploy: `git push heroku main`
5. Set config vars: `heroku config:set OPENAI_API_KEY=your-key`

### Frontend Deployment Options:

#### A. Vercel (Recommended - Free, Easy)
1. Go to https://vercel.com
2. Import your GitHub repository
3. Set root directory to `frontend`
4. Add environment variable for API URL
5. Deploy automatically on git push

#### B. Netlify (Free Tier Available)
1. Go to https://netlify.com
2. Connect GitHub repo
3. Set build directory to `frontend`
4. Set build command: `npm run build`
5. Set publish directory: `.next`

---

## Option 3: Local Network Sharing (Same WiFi)

If you're all on the same network:

1. **Find your local IP**:
   ```powershell
   ipconfig
   ```
   Look for IPv4 Address (e.g., `192.168.1.100`)

2. **Start backend** (accessible on your IP):
   ```powershell
   cd backend
   .\venv\Scripts\python.exe main.py --host 0.0.0.0
   ```

3. **Update frontend API URL**:
   - Edit `frontend/next.config.js` or environment variables
   - Change API URL to: `http://YOUR_IP:8000`

4. **Start frontend**:
   ```powershell
   cd frontend
   npm run dev -- -H 0.0.0.0
   ```

5. **Share URLs**:
   - Frontend: `http://YOUR_IP:3000`
   - Backend: `http://YOUR_IP:8000`

**Note**: Make sure Windows Firewall allows connections on ports 3000 and 8000.

---

## Option 4: Docker Deployment (Advanced)

Create Docker containers for easy deployment anywhere.

### Files needed:

**backend/Dockerfile**:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**frontend/Dockerfile**:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

**docker-compose.yml** (in root):
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./data:/app/data
  
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    depends_on:
      - backend
```

Then deploy to any Docker host (DigitalOcean, AWS, etc.)

---

## Quick Setup Script for ngrok (Easiest)

Create a file `start_public.bat`:

```batch
@echo off
echo Starting backend...
start "Backend" cmd /k "cd backend && .\venv\Scripts\python.exe main.py"

timeout /t 3

echo Starting frontend...
start "Frontend" cmd /k "cd frontend && npm run dev"

timeout /t 5

echo Starting ngrok tunnels...
echo Backend tunnel:
start "Backend Tunnel" cmd /k "ngrok http 8000"

timeout /t 2

echo Frontend tunnel:
start "Frontend Tunnel" cmd /k "ngrok http 3000"

echo.
echo Check the ngrok windows for public URLs!
echo Share the frontend URL with your teammates.
pause
```

---

## Important Notes:

1. **Environment Variables**: Set in your deployment environment:
   - **OPENAI_API_KEY** (required for AI features)
   - **JWT_SECRET** (required in production; the app uses JWT for login and API auth)
2. **Authentication**: The app includes authentication (JWT, login/setup, admin). On first deploy, create the first admin user via the frontend “Create admin account” flow. Set **JWT_SECRET** to a strong random value in production.
3. **CORS**: The backend allows all origins when `ENVIRONMENT` is not `production`. For production, set `ENVIRONMENT=production` and/or restrict `allow_origins` in `main.py` to your frontend URL (e.g. `https://your-app.vercel.app`).
4. **Data Storage**: Default is **SQLite** (`backend/data/recruiter.db`). Set `USE_DATABASE=false` to use file-based storage. For production, ensure the backend has a persistent volume for `backend/data` (or use an external DB if you add support).
5. **Security**: 
   - Never commit `.env` files
   - Use environment variables for all secrets (OPENAI_API_KEY, JWT_SECRET)
   - Passwords are hashed with bcrypt; JWTs expire after 24 hours by default

---

## Recommended Quick Start:

For fastest setup to share with teammates:
1. Use **ngrok** (Option 1) - takes 5 minutes
2. Share the ngrok frontend URL
3. For permanent deployment, use **Railway + Vercel** (Option 2)

