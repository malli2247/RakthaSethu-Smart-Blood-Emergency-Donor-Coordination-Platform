# RakthaSethu — Local Setup & Deployment Guide

## 1. Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **PostgreSQL**: v14+ (Local instance or Docker container)
- **Docker & Docker Compose** (Optional, for containerized run)

---

## 2. Quick Start with Docker (Recommended)

1. Clone or navigate to the project root:
   ```bash
   cd C:\Users\boyam\.gemini\antigravity\scratch\rakthasethu
   ```

2. Copy the environment variables:
   ```bash
   cp .env.example .env
   ```

3. Launch all services (PostgreSQL, Backend API, and Frontend SPA):
   ```bash
   docker compose up -d
   ```

4. Run database migrations and seed realistic demo data:
   ```bash
   docker compose exec backend npx prisma migrate deploy
   docker compose exec backend npm run seed
   ```

5. Access the applications:
   - **Frontend UI**: `http://localhost:5173`
   - **Backend API**: `http://localhost:5000/api`
   - **API Health Check**: `http://localhost:5000/api/health`

---

## 3. Local Development (Without Docker)

### Backend Setup:
```bash
cd backend
cp ../.env.example .env
npm install

# Generate Prisma Client
npx prisma generate

# Apply migrations or push schema
npx prisma db push

# Seed demo users, donors, hospitals, and requests
npm run seed

# Run the backend API server
npm run dev
```

### Frontend Setup:
```bash
cd frontend
npm install

# Start Vite development server
npm run dev
```

---

## 4. Demo Login Accounts

| Role | Email | Password | Features |
|---|---|---|---|
| **Admin** | `admin@rakthasethu.org` | `Admin@123456` | KPIs, Verifications, User Access Controls |
| **Hospital** | `apollo.hospital@rakthasethu.org` | `Demo@123456` | Patient Requisitions, Confirm Arrivals |
| **Blood Bank** | `redcross.bloodbank@rakthasethu.org` | `Demo@123456` | Cold-chain inventory, Batch management |
| **Donor (O-)** | `donor.oneg@rakthasethu.org` | `Demo@123456` | Universal donor profile, Emergency requests |
| **Donor (B+)** | `donor.bpos@rakthasethu.org` | `Demo@123456` | Active donor profile, History & certificates |
| **Patient** | `patient@rakthasethu.org` | `Demo@123456` | Live emergency broadcast, Matched donor cards |
| **Volunteer** | `volunteer@rakthasethu.org` | `Demo@123456` | Emergency dispatch tasks, Coordination |

---

## 5. Running Automated Tests

Run unit and integration test suites:
```bash
cd backend
npm run test
```
