# 🏏 7Brothers Box Cricket Tournament Management System

A production-ready, full-stack **Box Cricket Tournament Management Web Application** designed for rapid guest registrations, real-time ball-by-ball scorekeeping, automated single-elimination knockout tournament brackets, and print-ready PDF/CSV reports.

Built with a **Single Vercel Project Architecture**: React (Vite) frontend + Vercel Serverless API functions + MongoDB Atlas deployed together in **one single repository**.

---

## 🌟 Key Features

### 👤 Two User Roles
1. **GUEST (No Login Required)**:
   - Register team instantly without email/password.
   - Live deadline countdown (Asia/Kolkata timezone awareness).
   - Instant validation against duplicate team names and duplicate player contact numbers.
   - Live real-time scoreboard & Cricbuzz-style full scorecard with auto-polling.
   - Interactive Knockout Bracket tree view.

2. **ADMIN (Secure JWT Authentication)**:
   - Protected dashboard with tournament metrics.
   - Create, edit, and manage tournaments (Overs, Players per team, Deadlines, Venues).
   - Registration management with private player phone numbers.
   - **Verification gate**: Admin confirms final team list before generating fixtures.
   - **Automated Knockout Bracket Algorithm**: Supports any team count ($N = 4, 6, 8, 10, 12, 16$) with mathematically correct preliminary rounds and byes.
   - **Dedicated Mobile-First Scorer**: Big tactile mobile buttons ($0, 1, 2, 3, 4, 5, 6, W, +Wd, +Nb, +B, +Lb$), undo delivery, strike rotation, target chase logic.
   - **Automatic Knockout Advancement**: Match completion automatically advances the winning team to the next round slot in MongoDB and eliminates the losing team.
   - **Print & PDF Reports**: Full A4 registrations sheet, individual team registration passes, and notice-board fixture sheets generated from live MongoDB data.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, React Router v7, Lucide Icons
- **Backend**: Vercel Serverless Functions (`/api/*`), Node.js
- **Database**: MongoDB Atlas with Mongoose (with connection pooling singleton pattern for serverless reuse)
- **PDF & Exports**: `jspdf`, `jspdf-autotable`, CSV exporter
- **Authentication**: JWT, bcrypt password hashing

---

## 📁 Repository Structure

```
7Brothers/
├── api/                       # Vercel Serverless Functions
│   ├── auth/                  # login.js, me.js, init.js
│   ├── tournaments/           # index.js, [id].js
│   ├── registrations/         # index.js, [id].js
│   ├── teams/                 # confirm.js
│   ├── matches/               # index.js, [id].js, generate.js
│   ├── scoring/               # ball.js, undo.js, status.js
│   └── exports/               # data.js
├── models/                    # Mongoose Database Models
│   ├── Admin.js
│   ├── Tournament.js
│   ├── Team.js
│   ├── Player.js
│   ├── Match.js
│   └── BallDelivery.js
├── lib/                       # Backend Utilities
│   ├── db.js                  # Serverless Mongoose connection pooling
│   ├── auth.js                # JWT & Admin authentication
│   └── bracket.js             # Knockout bracket algorithm
├── src/                       # Frontend React Application
│   ├── components/            # Navbar, Footer, KnockoutBracketView, etc.
│   ├── pages/
│   │   ├── public/            # HomePage, RegisterTeam, LiveScores, Scorecard, Bracket
│   │   └── admin/             # Dashboard, Tournaments, Registrations, Fixtures, Scorer, Reports
│   ├── layouts/               # PublicLayout, AdminLayout
│   ├── context/               # AuthContext.jsx
│   ├── services/              # Unified API client (relative /api paths)
│   ├── utils/                 # exportPdf.js, exportCsv.js
│   └── index.css              # Dark neon sports theme & print styles
├── public/                    # Static assets
├── package.json               # Shared dependencies
├── vite.config.js             # Vite + dev serverless API middleware
├── vercel.json                # Vercel single-project rewrite configuration
└── .env.example               # Environment variables template
```

---

## 🚀 Getting Started (Local Development)

### 1. Clone & Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/box_cricket?retryWrites=true&w=majority
JWT_SECRET=super_secret_box_cricket_jwt_key_2026_change_in_production
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin@123
ADMIN_EMAIL=admin@boxcricket.com
```

### 3. Run Development Server
```bash
npm run dev
```
The application will launch at `http://localhost:5173`.
Both the React frontend and the `/api/*` serverless functions are served simultaneously through Vite's local development middleware!

---

## ☁️ Deployment on Vercel (Single Project)

1. Push this repository to **GitHub**.
2. Go to [Vercel Dashboard](https://vercel.com) and click **"New Project"**.
3. Import your GitHub repository.
4. Framework Preset: **Vite**
   - **Root Directory**: `./` (leave default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. In **Environment Variables**, add the four required variables:
   - `MONGODB_URI`: Your MongoDB Atlas connection string.
   - `JWT_SECRET`: A secure random string for JWT token generation.
   - `ADMIN_EMAIL`: `admin@boxcricket.com` (or your chosen admin email).
   - `ADMIN_PASSWORD`: `AdminCricket@2026` (or your chosen secure password).
6. Click **Deploy**!

> **Vercel Routing Note**: `vercel.json` is already configured to automatically route `/api/*` to the serverless functions in `api/` and route all frontend routes `/(.*)` to `index.html`.

---

## 🔒 Verification & Rules Enforced

| Rule | Implementation Details |
|---|---|
| **Registration Deadline** | Validated on every backend request against `new Date(tournament.regDeadline)`. Late submissions are strictly rejected. |
| **Duplicate Team Name** | Case-insensitive trimmed MongoDB compound unique index `{ tournament: 1, normalizedName: 1 }`. |
| **Duplicate Contact Numbers** | Normalized 10-digit unique indexes: `{ tournament: 1, captainPhone: 1 }` and `{ tournament: 1, phone: 1 }`. |
| **Admin Team Confirmation** | Fixtures cannot be generated while registration is open or before Admin explicitly verifies and confirms the registered team list. |
| **Knockout Bracket Math** | Accurately generates $N - 1$ matches with appropriate preliminary matches and mathematical byes for non-power-of-two team counts ($6, 10, 12$, etc.). |
| **Automatic Advancement** | Completing a match automatically places the winner into the next round match slot and eliminates the loser in MongoDB. |
| **PDF & CSV Reports** | A4 formatted tournament sheets generated directly from live database records with confidentiality checks for admin exports. |

---

## 🏆 Default Admin Credentials
- **Username**: `admin`
- **Password**: `admin@123`
- **Email**: `admin@boxcricket.com`
*(Auto-seeded on first run)*
