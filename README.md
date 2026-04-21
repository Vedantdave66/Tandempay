# 💸 SplitEase — Group Expense Manager

A modern, dark-mode fintech-style app for tracking shared expenses, simplifying debts, and settling up with friends.

**[Live Demo →](tandempay.ca)**

## ✨ Features

- **Create groups** with friends for trips, roommates, dinners, etc.
- **Track expenses** — who paid and how to split
- **Smart settlements** — greedy algorithm minimizes the number of payments
- **JWT authentication** with secure password hashing
- **Beautiful dark UI** with glassmorphism and micro-animations

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, TailwindCSS v4, Vite |
| **Backend** | FastAPI, SQLAlchemy (async), Pydantic |
| **Database** | SQLite (local dev) / PostgreSQL (production) |
| **Auth** | JWT + bcrypt |

## 🚀 Quick Start (Local Development)

### Prerequisites
- **Node.js** ≥ 18
- **Python** ≥ 3.11

### 1. Clone & set up environment

```bash
git clone https://github.com/YOUR_USERNAME/splitease.git
cd splitease

# Backend
cd backend
cp .env.example .env    # Edit .env if needed
pip install -r requirements.txt
```

### 2. Start the backend

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

API docs available at `http://localhost:8000/docs`

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` → Register → Create a group → Add expenses → View settlements!

## ☁️ Deploy to Render (Free)

This project includes a `render.yaml` Blueprint for one-click deployment.

### Steps:
1. Push this repo to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
3. Connect your GitHub repo
4. Render auto-detects `render.yaml` and creates:
   - `splitease-api` — Python web service
   - `splitease-web` — Static site (React)
   - `splitease-db` — Free PostgreSQL database
5. After deploy, **update the env vars**:
   - On `splitease-api`: set `CORS_ORIGINS` to `https://splitease-web.onrender.com`
   - On `splitease-web`: set `VITE_API_URL` to `https://splitease-api.onrender.com/api`
6. Trigger a redeploy on both services

> **Note:** Render free tier spins down services after 15 min of inactivity. The first request after sleep takes ~30-60 seconds.

## 📁 Project Structure

```
├── render.yaml              # Render deployment blueprint
├── docker-compose.yml        # Local PostgreSQL (optional)
├── backend/
│   ├── .env.example          # Environment template
│   ├── requirements.txt
│   ├── build.sh              # Render build script
│   └── app/
│       ├── main.py           # FastAPI entry point
│       ├── config.py         # Settings (auto-detects DB type)
│       ├── database.py       # Async SQLAlchemy
│       ├── models.py         # 5 database models
│       ├── schemas.py        # Pydantic schemas
│       ├── routes/
│       │   ├── auth.py       # Register, Login, JWT
│       │   ├── groups.py     # Group CRUD + members
│       │   └── expenses.py   # Expense CRUD + splitting
│       └── services/
│           └── balance_service.py  # Balances + settlements
└── frontend/
    ├── vite.config.ts
    └── src/
        ├── App.tsx
        ├── context/AuthContext.tsx
        ├── services/api.ts
        ├── components/        # 7 reusable components
        └── pages/             # 4 pages
```

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login (returns JWT) |
| GET | `/api/auth/me` | Current user |
| POST | `/api/groups` | Create group |
| GET | `/api/groups` | List groups |
| GET | `/api/groups/:id` | Group details |
| POST | `/api/groups/:id/members` | Add member (by email) |
| POST | `/api/groups/:id/expenses` | Add expense |
| GET | `/api/groups/:id/expenses` | List expenses |
| GET | `/api/groups/:id/balances` | User balances |
| GET | `/api/groups/:id/settlements` | Settlement suggestions |

## 📄 License

MIT
