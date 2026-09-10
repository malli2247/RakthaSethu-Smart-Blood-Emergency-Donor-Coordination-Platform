# 🩸 RakthaSethu — Complete Full-Stack Blood Donation & Emergency Blood Connect Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-rose.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-cyan.svg)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-darkblue.svg)](https://www.prisma.io/)

**RakthaSethu** is a production-grade, modular, and scalable humanitarian web platform connecting **voluntary blood donors, patients in critical need, patient attendants, hospitals, blood banks, volunteers, and system administrators**. The platform minimizes the critical minutes needed to locate and confirm compatible blood donors during life-threatening medical emergencies.

---

## 🚀 Key Features by User Role

### 1. 🩸 Voluntary Blood Donors
- **1-Click Availability Toggles**: Seamlessly toggle between "Available to Donate" and "Emergency Critical Ready".
- **Dynamic Eligibility Tracker**: Automatically calculates donation intervals (90 days for whole blood) and next eligible date.
- **Controlled In-App Communication**: Phone numbers and exact addresses remain masked (`+91 98****3210`) until the donor explicitly accepts a matching request.
- **Donation History & Digital Certificates**: View verified donation timeline with unique cryptographic certificate codes (`RKS-M8Z9-3A7F`).
- **Lives Saved Estimator**: Real-time counter of total units donated and lives potentially saved (1 unit = up to 3 lives).

### 2. 🏥 Patients & Patient Attendants
- **Rapid Emergency Broadcast Wizard**: Submit urgent blood requirements in 3 simple steps (Patient Name, Blood Group, Units, Hospital, Deadline, Clinical Context).
- **AI-Powered Urgency Triage Helper**: Analyzes clinical diagnoses and recommends urgency classifications (`CRITICAL`, `HIGH`, or `NORMAL`).
- **Live Match Tracker**: Visual 5-step lifecycle progress bar (`PENDING` → `MATCHING` → `DONOR_ACCEPTED` → `DONATION_CONFIRMED` → `FULFILLED`).
- **Direct Phone Connect**: Instant unlocked contact details when a matched donor accepts.

### 3. 🏢 Hospitals & Medical Centers
- **Clinical Request Management**: Originate and monitor requisition orders for admitted patients.
- **Donor Arrival Verification**: Confirm donor arrival, collect units, and officially fulfill requests.
- **Official Certificate Issuance**: Auto-generate verified certificates for arriving donors.
- **License Verification Guard**: Administrative verification required before receiving elevated clinical privileges.

### 4. 🧪 Certified Blood Banks
- **Refrigerated Cold-Chain Inventory Ledger**: Track units across components: Whole Blood, Packed Red Cells (PRBC), Platelets, and Fresh Frozen Plasma (FFP).
- **Automated Expiry & Low-Stock Alerts**: Proactive warnings for units expiring within 7 days and blood groups below 5 units.
- **Batch Ledger**: Batch number tracking, collection dates, and status transitions (`AVAILABLE`, `RESERVED`, `EXPIRED`, `DISCARDED`).

### 5. 🤝 Humanitarian Volunteers
- **Service Area Dispatch**: Receive alerts for high and critical emergency requests in local districts.
- **Direct Coordination**: Contact patient attendants and arriving donors to expedite hospital reception.

### 6. 🛡️ System Administrators
- **Executive Command Center**: Real-time KPI cards (Total Users, Active Donors, Total Requests, Fulfilled Requests, Fulfillment Rate %).
- **Interactive Analytics**: Visual bar charts powered by Recharts.
- **Organization Verification Queue**: Review hospital and blood bank medical licenses, approve or reject credentials with verification notes.
- **User Directory**: Centralized access management with 1-click account activation/deactivation.

### 7. 🤖 Modular AI Assistant Layer
- **Emergency Chatbot**: Answers blood compatibility, donation eligibility, and emergency action questions with medical safety disclaimers.
- **Zero-Dependency Fallback Engine**: Works out-of-the-box using an intelligent clinical heuristic rules engine even if an external LLM API key is not configured!

---

## 🧬 Red Blood Cell (RBC) Compatibility Matrix

RakthaSethu implements precise clinical transfusion logic:

| Recipient | Can Receive From (RBC) | Notes |
|---|---|---|
| **O-** | **O-** | Can only receive O- red cells |
| **O+** | **O-, O+** | |
| **A-** | **O-, A-** | |
| **A+** | **O-, O+, A-, A+** | |
| **B-** | **O-, B-** | |
| **B+** | **O-, O+, B-, B+** | |
| **AB-** | **O-, A-, B-, AB-** | |
| **AB+** | **All 8 Groups** | **Universal RBC Recipient** |

> **Universal RBC Donor**: **O-Negative (O-)** can be safely given to all recipients in emergency trauma.

---

## 📊 Multi-Factor Donor Scoring Algorithm

$$\text{Score} = W_{\text{compat}} (40) + W_{\text{exact}} (10) + W_{\text{avail}} (20) + W_{\text{urgency}} (15) + W_{\text{dist}} (15) + W_{\text{exp}} (5)$$

- **Compatibility (40 pts)**: Prerequisite check via RBC matrix.
- **Exact Match Bonus (10 pts)**: Prioritizes exact matches over universal donor substitutes.
- **Availability (20 pts)**: Active donors currently ready to donate.
- **Emergency Bonus (15 pts)**: Critical requests prioritize donors flagged as `emergencyAvailable`.
- **Proximity (15 pts)**: Haversine great-circle distance within configurable radius (5km - 100km).
- **Experience (5 pts)**: Verified past donation history bonus.

---

## 🛠️ Technology Stack

### Frontend
- **React 18** with **TypeScript** & **Vite**
- **Tailwind CSS** with blood & healthcare visual theme
- **React Router v6** with role-based route guards
- **TanStack React Query v5** & **Axios** with JWT refresh interceptors
- **Lucide React** icons & **Recharts** for analytics

### Backend
- **Node.js** & **Express.js** with **TypeScript**
- **Prisma ORM** with **PostgreSQL** relational database
- **JWT Authentication** (Short-lived access tokens + rotated refresh tokens)
- **Password Hashing**: `bcryptjs`
- **Security**: `Helmet`, `CORS`, and `express-rate-limit`
- **Validation**: Strict `Zod` schemas for all endpoints

---

## 📂 Project Structure

```
rakthasethu/
├── backend/
│   ├── src/
│   │   ├── config/             # Environment, database, logger, constants
│   │   ├── middleware/         # Auth, RBAC, error handler, rate limiter, validate
│   │   ├── modules/
│   │   │   ├── auth/           # Login, register, refresh tokens, passwords
│   │   │   ├── matching/       # Compatibility matrix, Haversine distance, ranking engine
│   │   │   ├── requests/       # Blood request CRUD, lifecycle state machine
│   │   │   ├── donors/         # Profiles, availability toggles, history, stats
│   │   │   ├── hospitals/      # Hospital profiles, donation confirmations
│   │   │   ├── bloodbanks/     # Inventory management, stock warnings, batch ledger
│   │   │   ├── volunteers/     # Coordination tasks, service areas
│   │   │   ├── campaigns/      # Donation drives, donor registrations
│   │   │   ├── notifications/  # User in-app notifications
│   │   │   ├── admin/          # Verifications, metrics, user directory
│   │   │   └── ai/             # AI service (smart triage, FAQ chatbot, fallback rules)
│   │   ├── utils/              # Haversine distance, compatibility helpers, response wrappers
│   │   ├── app.ts              # Express application configuration
│   │   └── server.ts           # Server bootstrap
│   ├── prisma/
│   │   ├── schema.prisma       # Relational PostgreSQL schema
│   │   └── seed.ts             # Comprehensive seed script for all roles & blood groups
│   ├── tests/                  # Vitest unit & integration test suites
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable UI (Navbar, Footer, Badges, StatCards, AiChatWidget)
│   │   ├── layouts/            # PublicLayout, DashboardLayout
│   │   ├── pages/
│   │   │   ├── public/         # Landing, FindBlood, Compatibility, Campaigns, HowItWorks, FAQ
│   │   │   ├── auth/           # Login, Multi-role Register
│   │   │   ├── donor/          # Donor Dashboard, Profile, Requests, History
│   │   │   ├── patient/        # Patient Dashboard, Create Request Wizard, Match Viewer
│   │   │   ├── hospital/       # Hospital Dashboard, Manage Requests & Confirmations
│   │   │   ├── bloodbank/      # Blood Bank Dashboard, Inventory Tracker
│   │   │   ├── volunteer/      # Volunteer Hub & Coordination
│   │   │   └── admin/          # Command Center, User Registry, Verifications
│   │   ├── contexts/           # AuthContext
│   │   ├── services/           # Axios API modules
│   │   ├── types/              # Full TypeScript contracts matching backend entities
│   │   ├── routes/             # Role-based protected routes
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── Dockerfile
│   └── package.json
│
├── docs/
│   ├── architecture.md         # Detailed system design, data flow, scoring algorithm
│   ├── database.md             # Schema entities, relations, indexes, cascades
│   ├── api.md                  # REST endpoint definitions with request/response contracts
│   └── setup.md                # Development, Docker, and deployment guide
├── docker-compose.yml          # Containerized Postgres, Backend, and Frontend
├── .env.example
├── .gitignore
└── package.json
```

---

## 🔑 Demo Login Credentials

The development database seed includes pre-configured demo accounts for every role:

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

## 🚀 Getting Started

### 1. Launch with Docker Compose (Recommended)
```bash
cp .env.example .env
docker compose up -d
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run seed
```

### 2. Run Locally (Development Mode)
```bash
# In backend directory:
cd backend
npm install
npx prisma generate
npx prisma db push
npm run seed
npm run dev

# In frontend directory (new terminal):
cd frontend
npm install
npm run dev
```

Visit **`http://localhost:5173`** to access the web application!

---

## 🧪 Testing

Run the automated Vitest test suites:
```bash
cd backend
npm run test
```

Includes unit tests for:
- All 64 permutations of the Red Blood Cell (RBC) compatibility matrix
- Haversine distance and candidate scoring formula
- Finite State Machine request status transitions
- AI urgency classification and medically disclaimed chatbot
- End-to-end emergency lifecycle workflow

---

## 📜 Humanitarian & Medical Disclaimer

*RakthaSethu is a voluntary humanitarian technology connector. The platform does not directly provide medical treatments, clinical diagnoses, or blood sales. In an acute life-threatening emergency, always contact local national emergency services (e.g. 112 / 108 / 911) or visit the nearest hospital emergency department immediately.*
