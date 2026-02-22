# Agentic AI Recruiter App

A comprehensive recruiting web application powered by CrewAI agents and OpenAI, designed to streamline the entire recruitment workflow.

**Quick links:** [Setup](#setup) · [Authentication](#authentication) · [API Endpoints](#api-endpoints) · [Deployment](DEPLOYMENT.md) · [Troubleshooting](TROUBLESHOOTING.md) · [AI Agents](AGENTS_SUMMARY.md)

## Prerequisites

- **Python 3.9+** (backend)
- **Node.js 18+** and npm (frontend)
- **OpenAI API key** (required for AI features)
- Optional: [Gmail API](GMAIL_SETUP.md) for email monitoring; [Evaluation Agent](EVALUATION_AGENT_SETUP.md) details

## Features

- **Authentication**: Login with **email** and password. When there are no users, the login page shows a one-time “Create the first admin account” form. Admins can create users and **edit user email** from the Admin page.
- **Job Description Parsing**: Upload and automatically parse job descriptions from PDFs
- **HR Briefing Processing**: Transcribe and extract key details from HR verbal briefings
- **Candidate Pipeline Management**: Kanban board for tracking candidates through stages
- **Intelligent Outreach**: AI-generated personalized outreach messages
- **Email Monitoring**: Track candidate replies and sentiment
- **Interview Analysis**: Transcribe interviews and extract structured insights
- **Candidate Evaluation**: LLM-powered chat interface for candidate analysis
- **Consent Management**: Region-compliant consent form generation
- **Simulation Agent**: Generate mock candidate responses for POC

## Tech Stack

### Backend
- Python 3.9+
- FastAPI
- **Database: SQLite** (`backend/data/recruiter.db`) — roles, candidates, users, briefings, etc. Set `USE_DATABASE=false` to use file-based storage instead.
- CrewAI
- OpenAI API
- Whisper (audio transcription)
- PyPDF2 (PDF parsing)

### Frontend
- Next.js / React
- TypeScript
- Tailwind CSS

## Authentication

Login and access control use **JWT (JSON Web Tokens)** and **role-based** checks. Unauthenticated users are redirected to the login page; admin-only routes require the `admin` role.

### Technologies and frameworks

| Layer        | Technology | Purpose |
|-------------|------------|---------|
| **Backend auth** | **FastAPI** (middleware + routes) | Enforces JWT on `/api/*` and admin role on `/api/admin/*`. |
| **Tokens**       | **python-jose** (JWT)             | Issues and verifies JWTs (HS256). Token payload includes `sub` (user id) and `exp`. |
| **Passwords**    | **bcrypt**                       | One-way hashing; passwords are truncated to 72 bytes before hashing (bcrypt limit). |
| **User storage** | **SQLAlchemy + SQLite**          | `users` table (id, email, password_hash, role, created_at). Same DB as app data. |
| **Frontend auth**| **React Context** (`lib/auth.tsx`) | Holds `user`, `token`, `login`, `logout`, `setup`; token stored in `localStorage`. |
| **HTTP client**  | **Axios** (interceptors)         | Adds `Authorization: Bearer <token>` to requests; on 401, clears token and redirects to `/login`. |

### Backend flow

1. **Public routes (no token):**  
   `POST /api/auth/login`, `POST /api/auth/setup`, `GET /api/auth/needs-setup`.  
   All other `/api/*` requests require a valid `Authorization: Bearer <token>` header.

2. **Middleware** (`auth_middleware` in `main.py`):  
   For every `/api/*` request except the three above, it reads the Bearer token, decodes the JWT with `JWT_SECRET`, loads the user by `sub` from the `users` table, and attaches `request.state.user`.  
   For `/api/admin/*` it also checks `user.role == "admin"` and returns 403 if not.

3. **Password handling** (`services/auth_service.py`):  
   Passwords are hashed with **bcrypt** (password UTF-8 bytes truncated to 72 before hashing).  
   JWTs are created with **python-jose** (HS256, expiry e.g. 24 hours).  
   User CRUD and lookup use the same SQLite DB and SQLAlchemy `User` model.

4. **First-time setup:**  
   When there are no users, `POST /api/auth/setup` creates the first user with role `admin` and returns a JWT.  
   After that, only `POST /api/auth/login` and (for admins) `POST /api/admin/users` create new accounts.

### Frontend flow

1. **Auth context** (`lib/auth.tsx`):  
   On load, reads token from `localStorage` and calls `GET /api/auth/me` to set `user`.  
   Exposes `login`, `setup`, `logout`, and `fetchUser` to the app.

2. **Login page** (`pages/login.tsx`):  
   On load, calls `GET /api/auth/needs-setup`. If no users exist, shows “Create the first admin account” and submits to `POST /api/auth/setup`. Otherwise shows the normal **email + password** login and submits to `POST /api/auth/login`.  
   On success, stores the returned token and user, then redirects to `/`.

3. **Axios** (`lib/axios.ts`):  
   Request interceptor adds `Authorization: Bearer <token>` when a token exists.  
   Response interceptor: on 401 (except for login/setup), removes the token and redirects to `/login`.

4. **Route protection** (`components/Layout.tsx`):  
   If there is no authenticated user and the path is not `/login`, redirect to `/login`.  
   If the path is `/admin` and `user.role !== "admin"`, redirect to `/`.  
   Nav shows “Admin” and “Logout” only when appropriate (admin link only for admins).

### Auth and admin API endpoints

- `GET /api/auth/needs-setup` — Returns `{ "needs_setup": true }` when there are no users (no auth).
- `POST /api/auth/setup` — Body: `{ "email", "password" }`. Creates first admin user (no auth).
- `POST /api/auth/login` — Body: `{ "email", "password" }`. Returns `{ "access_token", "token_type": "bearer", "user" }` (no auth).
- `GET /api/auth/me` — Returns current user (requires valid Bearer token).
- `GET /api/admin/users` — List users (admin only).
- `POST /api/admin/users` — Body: `{ "email", "password", "role": "user" | "admin" }`. Create user (admin only).
- `PATCH /api/admin/users/{user_id}` — Body: `{ "email" }`. Update a user’s email (admin only).

### Security notes

- Set **`JWT_SECRET`** in production (e.g. in `.env`); do not use the default.
- Passwords are hashed with bcrypt; never stored in plain text.
- All app API routes (roles, candidates, briefings, etc.) require a valid JWT after the auth middleware runs.

## Setup


### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```
On Windows you can use `install_fix.bat` or `python install_packages.py` (same dependencies; retry logic for file locks). All features (auth, SQLite, CrewAI, Whisper, etc.) are covered by `requirements.txt`.

4. Create a `.env` file in `backend` (optional but recommended) with at least:
```
OPENAI_API_KEY=your_key_here
JWT_SECRET=your-random-secret-for-production
```
Set `JWT_SECRET` in production; the app has a default for development only.

5. Run the backend server:
```bash
python main.py
# Or: uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`. On first run, the database and `backend/data` are created if missing. **First time:** open the frontend and use “Create admin account” to create the first user.

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

### Sharing via ngrok

To share the app publicly (e.g. for demos), use ngrok pointing to the **frontend** port:

```bash
ngrok http 3000
```

**Important:** Use port **3000** (frontend), not 8000 (backend). If you use `ngrok http 8000`, you'll see `{"message":"Agentic AI Recruiter API"}` instead of the dashboard, because the backend API is served directly.

**First visit:** Free ngrok shows a "You are about to visit..." warning. Click **Visit Site** to proceed. The app adds `ngrok-skip-browser-warning` to API requests so they work after that.

## Project Structure

```
.
├── backend/
│   ├── agents/          # CrewAI agents
│   ├── database/        # SQLAlchemy models, SQLite (recruiter.db)
│   ├── services/        # Storage, auth, PDF, audio, etc.
│   ├── scripts/         # One-off scripts (e.g. assign_roles_creator, mark_negative_candidates)
│   ├── rules/           # Consent rules configuration
│   ├── main.py          # FastAPI application
│   ├── requirements.txt
│   ├── install_fix.bat  # Windows: pip install with retry (requires existing venv)
│   ├── install_packages.py  # Alternative: pip install from requirements.txt with retry
│   └── data/            # Created at runtime: roles, candidates, recruiter.db, etc.
├── frontend/
│   ├── pages/           # Next.js pages
│   ├── components/      # React components
│   └── ...
└── ...
```

## API Endpoints

### Authentication (see [Authentication](#authentication) for details)
- `GET /api/auth/needs-setup` - Check if first-time setup is needed (no auth)
- `POST /api/auth/setup` - Create first admin user (no auth)
- `POST /api/auth/login` - Login with email and password; returns JWT and user (no auth)
- `GET /api/auth/me` - Current user (Bearer token required)
- `GET /api/admin/users` - List users (admin only)
- `POST /api/admin/users` - Create user (admin only)
- `PATCH /api/admin/users/{user_id}` - Update user email (admin only)

### Roles
- `GET /api/roles` - Get all roles
- `POST /api/roles` - Create new role
- `GET /api/roles/{role_id}` - Get role details
- `PUT /api/roles/{role_id}` - Update role
- `DELETE /api/roles/{role_id}` - Delete role

### Job Descriptions
- `POST /api/roles/{role_id}/jd` - Upload and parse JD PDF
- `GET /api/roles/{role_id}/jd` - Get parsed JD
- `PUT /api/roles/{role_id}/jd` - Update JD fields

### Candidates
- `POST /api/roles/{role_id}/candidates` - Upload candidate PDF
- `GET /api/roles/{role_id}/candidates` - Get all candidates
- `GET /api/roles/{role_id}/candidates/{candidate_id}` - Get candidate details
- `POST /api/roles/{role_id}/candidates/{candidate_id}/outreach` - Generate outreach message
- `PUT /api/roles/{role_id}/candidates/{candidate_id}/status` - Update candidate status

### HR Briefings
- `POST /api/hr-briefings` - Upload HR briefing audio
- `GET /api/hr-briefings` - Get all briefings
- `GET /api/roles/{role_id}/hr-briefing` - Get role briefing

### Interviews
- `POST /api/roles/{role_id}/candidates/{candidate_id}/interview` - Upload interview audio
- `GET /api/roles/{role_id}/candidates/{candidate_id}/interview` - Get interview data

### Evaluation
- `POST /api/roles/{role_id}/candidates/{candidate_id}/evaluate` - Evaluate candidate (chat)

### Consents
- `POST /api/consents/generate` - Generate consent form
- `GET /api/consents` - Get all consents

### Simulation
- `POST /api/simulation/candidate-reply` - Generate simulated candidate reply
- `POST /api/roles/{role_id}/candidates/{candidate_id}/simulate-outreach-reply` - Simulate candidate reply to outreach (body: `{ "reply_type": "positive" | "negative" }`). Negative replies mark the candidate as not pushing forward.
- `POST /api/roles/{role_id}/candidates/{candidate_id}/simulate-consent-reply` - Simulate consent form reply (body: `{ "consent_status": "consented" | "declined" }`)

## Documentation

| Document | Description |
|----------|-------------|
| [README.md](README.md) | This file — overview, setup, auth, API |
| [DEPLOYMENT.md](DEPLOYMENT.md) | How to share or deploy (ngrok, cloud, Docker) |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Common issues and fixes |
| [AGENTS_SUMMARY.md](AGENTS_SUMMARY.md) | All AI agents and how they are used |
| [GMAIL_SETUP.md](GMAIL_SETUP.md) | Optional Gmail API setup for email monitoring |
| [EVALUATION_AGENT_SETUP.md](EVALUATION_AGENT_SETUP.md) | Evaluation agent architecture and context |

## Development Notes

- **Database:** The app uses **SQLite** by default. The database file is `backend/data/recruiter.db` (see `backend/database/models.py` for the path and `DATABASE_FILE`). App data (roles, candidates, briefings, users, etc.) is stored there. Set `USE_DATABASE=false` to use file-based storage instead of SQLite.
- PDFs and audio files are stored in organized directory structure
- CrewAI agents handle all AI-powered processing
- OpenAI API is used for LLM operations
- Whisper is used for audio transcription

## License

MIT

## End
