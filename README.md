# Personal Investment Portfolio Tracker

## Project Overview

The Personal Investment Portfolio Tracker is a full-stack web application built with
Next.js 16 designed to help users manage and monitor their investments in stocks,
mutual funds, gold, sovereign gold bonds (SGBs), NPS, ETFs, and other asset classes
from a single unified platform.

The application provides a centralized dashboard where users can view their complete
portfolio, track real-time portfolio value, monitor profit/loss with day-gain analysis,
manage automated SIPs, set financial goals, and analyze their portfolio through
interactive charts and visual representations.

---

## Objective

The main objectives of this project are:

- To provide a centralized platform for tracking stocks, mutual funds, gold, SGBs, NPS, ETFs, and manual assets (FDs, EPF, PPF).
- To allow users to manage their investment holdings with full transaction history.
- To calculate and display portfolio value, profit/loss, and day gains in real time.
- To provide clear visual representations of portfolio performance through interactive charts.
- To automate recurring investments through SIP (Systematic Investment Plan) management.
- To support financial planning with goals and liability tracking.
- To reduce the need for manually tracking investments across multiple platforms.
- To demonstrate practical implementation of web development, REST APIs, databases,
  and data visualization.

---

## Features

- 📊 **Portfolio Dashboard** — Overview with total portfolio value, day gain/loss, and performance sparkline charts
- 📈 **Stock Tracking** — Real-time stock prices fetched via Yahoo Finance API
- 💰 **Mutual Fund Tracking** — NAV data fetched from AMFI (Association of Mutual Funds in India)
- 🥇 **Gold & Silver Tracking** — Live metal prices for physical gold and silver holdings
- 🏦 **SGB Tracking** — Sovereign Gold Bond prices fetched from NSE India
- 🏛️ **NPS Tracking** — National Pension System NAV tracking
- 📉 **Profit & Loss Calculation** — Per-holding and portfolio-level P&L with percentage returns
- 🧮 **Portfolio Value Calculation** — Aggregated across all asset classes and profiles
- 📊 **Portfolio Allocation Visualization** — Interactive pie/donut charts showing asset allocation
- 📅 **Historical Performance** — 30-day rolling snapshot charts with daily gain tracking
- 🔄 **Automated SIP Management** — Configure SIPs with date-of-month execution and auto-buy
- 🎯 **Goal Tracking** — Set financial goals (e.g., retirement, vacation) with target amounts and dates
- 💳 **Liability Management** — Track loans, EMIs, and outstanding balances
- 📥 **CSV & NSDL Import** — Bulk import holdings from brokerage CSV exports and NSDL CAS statements
- 🔀 **Profile Transfer** — Transfer holdings between family member profiles
- 🔍 **Instrument Search** — Search and add instruments from Yahoo Finance, AMFI, and NPS databases
- ➕ **Add & Manage Investments** — Full CRUD for transactions, instruments, and manual assets
- 👥 **Multi-Profile Support** — Manage portfolios for multiple family members from one account
- 📱 **Responsive UI** — Mobile-friendly dark/light mode interface with smooth animations
- 🔐 **User Authentication** — JWT-based auth with httpOnly cookies, CSRF protection, and brute-force lockout
- 🕐 **Automated Daily Cron** — Daily price refresh and portfolio snapshot generation via Vercel Cron

---

## Technologies Used

### Frontend
- **Next.js 16** (React 19) — App Router with Server & Client Components
- **TypeScript** — Type-safe codebase
- **CSS Modules** — Scoped component styling with dark/light theme support
- **Recharts** — Interactive charts (Area, Pie, Bar)
- **Framer Motion** — Smooth page transitions and micro-animations
- **Lucide React** — Icon library

### Backend
- **Next.js API Routes** — RESTful API endpoints (App Router)
- **Next.js Proxy (Middleware)** — Authentication gate, CSRF protection, and JWT verification
- **jose** — Edge-compatible JWT verification in middleware
- **jsonwebtoken** — Server-side JWT signing

### Database
- **MongoDB Atlas** — Cloud-hosted NoSQL database
- **Mongoose** — ODM for schema definition and validation

### APIs
- **Yahoo Finance API** — Real-time stock and ETF prices
- **AMFI API** — Mutual fund NAV data
- **NSE India** — Sovereign Gold Bond (SGB) prices
- **NPS Trust** — National Pension System NAV data
- **Metal Price APIs** — Live gold and silver prices in INR

### Deployment
- **Vercel** — Hosting, serverless functions, and cron jobs

### Tools
- Git & GitHub
- Visual Studio Code
- npm

---

## Project Structure

```text
portfolio/
│
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/           # Login, logout, session endpoints
│   │   │   ├── cron/           # Daily price refresh & snapshot cron job
│   │   │   ├── goals/          # Financial goals CRUD
│   │   │   ├── holdings/       # Aggregated holdings computation
│   │   │   ├── import/         # CSV & NSDL PDF import
│   │   │   ├── instruments/    # Instrument CRUD & search
│   │   │   ├── liabilities/    # Loans & EMI tracking
│   │   │   ├── manualassets/   # FD, EPF, PPF, SGB management
│   │   │   ├── marketassets/   # Market asset operations
│   │   │   ├── prices/         # Price refresh & metal prices
│   │   │   ├── settings/       # Clear data & transfer profiles
│   │   │   ├── sips/           # SIP configuration CRUD
│   │   │   ├── snapshots/      # Daily portfolio snapshots
│   │   │   └── transactions/   # Transaction CRUD
│   │   │
│   │   ├── auth/
│   │   │   └── login/          # Login page
│   │   │
│   │   ├── dashboard/
│   │   │   ├── history/        # Historical performance charts
│   │   │   ├── holdings/       # Detailed holdings view
│   │   │   ├── import/         # Import CSV/NSDL page
│   │   │   ├── instruments/    # Instrument management page
│   │   │   ├── manualassets/   # Manual assets page (FD, EPF, Gold, SIP)
│   │   │   ├── planning/       # Goals & liabilities page
│   │   │   ├── transactions/   # Transaction history page
│   │   │   └── transfer/       # Profile transfer page
│   │   │
│   │   ├── globals.css         # Global styles & theme variables
│   │   ├── layout.tsx          # Root layout with metadata
│   │   └── page.tsx            # Landing/redirect page
│   │
│   ├── components/
│   │   ├── GaugeMeter.tsx      # Portfolio health gauge
│   │   ├── NumberInput.tsx      # Formatted currency input
│   │   ├── ProfileContext.tsx   # Profile state management
│   │   ├── Select.tsx           # Custom dropdown component
│   │   ├── ThemeToggle.tsx      # Dark/light mode toggle
│   │   └── CsrfProvider.tsx     # CSRF header provider
│   │
│   ├── lib/
│   │   ├── auth.ts             # JWT signing, verification, cookies
│   │   ├── db.ts               # MongoDB connection singleton
│   │   ├── portfolioEngine.ts  # Holdings aggregation engine
│   │   └── prices/
│   │       ├── yahoo.ts        # Yahoo Finance price fetcher
│   │       ├── amfi.ts         # AMFI mutual fund NAV fetcher
│   │       ├── gold.ts         # Gold & silver price fetcher
│   │       ├── sgb.ts          # SGB price fetcher from NSE
│   │       ├── nps.ts          # NPS NAV fetcher
│   │       └── index.ts        # Unified price refresh orchestrator
│   │
│   ├── models/
│   │   ├── User.ts             # User schema (auth, rate limiting)
│   │   ├── Instrument.ts       # Instrument schema (stocks, MFs, etc.)
│   │   ├── Transaction.ts      # Buy/sell transaction schema
│   │   ├── ManualAssets.ts     # Manual asset schema (FD, EPF, etc.)
│   │   ├── SIP.ts              # SIP configuration schema
│   │   ├── DailySnapshots.ts   # Daily portfolio snapshot schema
│   │   ├── Goal.ts             # Financial goal schema
│   │   ├── Liability.ts        # Loan/liability schema
│   │   └── UserProfile.ts     # User profile schema
│   │
│   ├── proxy.ts                # Edge middleware (auth, CSRF, JWT verify)
│   └── types/                  # TypeScript type definitions
│
├── public/                     # Static assets
├── next.config.ts              # Next.js configuration
├── package.json
├── tsconfig.json
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB instance)
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Soham0798/portfolio-app.git
   cd portfolio-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory:
   ```env
   MongoDBUri=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   CRON_SECRET=your_cron_secret
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Security

- **JWT Authentication** with httpOnly, secure, SameSite cookies
- **CSRF Protection** via custom `x-portfolio-action` header on all mutations
- **Edge JWT Verification** using `jose` library in proxy middleware
- **Brute-Force Protection** with DB-backed failed login attempt tracking and 15-minute account lockout after 5 failed attempts
- **Data Isolation** — All API endpoints enforce `userId` scoping to prevent cross-user data access
