# Troubleshooting Guide

The app requires **login** for most actions. If you see **401 Unauthorized** or redirects to login, sign in (or create the first admin account via “Create admin account” on the login page).

## Backend Won't Start

### Step 1: Test Imports
Run this to check if all dependencies are installed:
```powershell
cd backend
.\venv\Scripts\python.exe test_backend.py
```

### Step 2: Start Backend Manually
Open a **new PowerShell terminal** and run:
```powershell
cd "C:\Users\sfrgu\Desktop\SMU\Agentic AI Recruiter App\backend"
.\venv\Scripts\python.exe main.py
```

**Look for any error messages** in the terminal output.

### Step 3: Check Common Issues

**If you see "ModuleNotFoundError":**
- Make sure virtual environment is activated
- Run: `.\venv\Scripts\python.exe -m pip install -r requirements.txt`

**If you see "Port 8000 already in use":**
- Close any other applications using port 8000
- Or change the port in `main.py` (search for `uvicorn.run` and set e.g. `port=8001`)

**If you see Whisper errors:**
- The code has been updated to handle this gracefully
- Audio transcription will show a placeholder message
- You can install whisper later if needed

### Step 4: Verify Backend is Running
Once you start the backend, you should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

Then test it:
```powershell
# In another terminal (public endpoint, no auth)
Invoke-WebRequest -Uri http://localhost:8000/api/auth/needs-setup

# Most other endpoints require a valid JWT (log in via the frontend first)
```

## Frontend Can't Connect to Backend

### Check 1: Is Backend Running?
- Backend must be running on `http://localhost:8000`
- Check the terminal where you started the backend

### Check 2: Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Log in (or create the first admin account), then try creating a role
4. Look for any red error messages

### Check 3: Check Network Tab
1. Open browser DevTools (F12)
2. Go to Network tab
3. Log in, then try creating a role or loading the dashboard
4. Look for failed requests (red)
5. Click on the failed request to see the error (401 = not logged in or token expired)

## Common Error Messages

### "Failed to create role"
- Backend is not running
- Backend is running on wrong port
- CORS issue (check backend/main.py CORS settings)

### "Network Error" or "Connection Refused"
- Backend is not running
- Firewall blocking port 8000
- Backend crashed (check backend terminal)

### "Cannot GET /api/roles"
- Backend is running but route doesn't exist
- Check backend/main.py for route definitions

## Quick Fixes

### Restart Everything
1. Stop backend (Ctrl+C in backend terminal)
2. Stop frontend (Ctrl+C in frontend terminal)
3. Start backend: `cd backend && .\venv\Scripts\python.exe main.py`
4. Start frontend: `cd frontend && npm run dev`
5. Refresh browser

### Check Ports
```powershell
# Check if port 8000 is in use
netstat -ano | findstr :8000

# Check if port 3000 is in use
netstat -ano | findstr :3000
```

## Still Having Issues?

1. Check backend terminal for error messages
2. Check frontend terminal for error messages
3. Check browser console (F12) for errors
4. Make sure both servers are running in separate terminals

