# 🩸 RakthaSethu — Production-Ready Full-Stack Humanitarian Blood Connect Platform

[![Build & Test Status](https://github.com/rakthasethu/rakthasethu/actions/workflows/ci.yml/badge.svg)](https://github.com/rakthasethu/rakthasethu/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-rose.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-cyan.svg)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.19-darkblue.svg)](https://www.prisma.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)

**RakthaSethu** is a hardened, production-ready full-stack humanitarian blood donation and emergency blood-connect platform. It connects **voluntary blood donors, patients in critical need, patient attendants, hospitals, blood banks, disaster volunteers, and system administrators** to minimize the vital minutes required to locate and confirm compatible blood donors during life-or-death medical emergencies.

---

## 📑 Core Documentation Index

- **[PRODUCTION_READINESS_REPORT.md](./PRODUCTION_READINESS_REPORT.md)**: Full verification matrix across all 41 audit phases, test coverage, and security certifications.
- **[PRODUCTION_AUDIT.md](./PRODUCTION_AUDIT.md)**: Technical vulnerability audit, architectural risk assessments, and remediation ledger.
- **[PRODUCTION_CREDENTIALS.md](./PRODUCTION_CREDENTIALS.md)**: Configuration guide for PostgreSQL, SMTP Email, Twilio/Fast2SMS, Google Maps, S3/Cloudinary, and Gemini AI.

---

## 🛡️ Production Hardening & Architecture Highlights

### 1. Zero-Trust Donor Privacy
- **Automatic PII Masking:** Phone numbers are masked by default (`+91 98****1234`) and exact street addresses are withheld from public search endpoints.
- **Permissioned Unmasking:** Direct contact information is unlocked **only** when a donor explicitly accepts an emergency match request, visible exclusively to the verified requester and hospital staff.

### 2. Deterministic Authorization & IDOR Elimination
- **Strict Entity Ownership:** Requesters can only cancel or manage their own requisitions. Blood banks can only adjust stock within their verified inventory ledger.
- **Role-Based Finite State Machine:** Transitions from `PENDING` through `FULFILLED` are guarded by state machines preventing arbitrary or unauthorized status tampering.

### 3. Fail-Safe Multi-Channel Notifications
- **Non-Blocking Execution:** Asynchronous email (Nodemailer SMTP) and SMS (Twilio / Fast2SMS) alerts run concurrently. External provider failures never abort core database transactions.

### 4. Dual-Database Engine Compatibility
- **Zero-Config Local Development:** Pre-configured with SQLite (`backend/prisma/dev.db`) for rapid local feature iteration and integration testing without Docker.
- **Enterprise Production:** Production-ready PostgreSQL 16 schema (`schema.postgresql.prisma`) featuring compound B-Tree indexes on `[bloodGroup]`, `[city, state]`, and `[status]` alongside foreign key cascade enforcement.

### 5. Sanitized Logging & Defense-in-Depth
- **Redacted Telemetry:** Sensitive parameters (passwords, JWT access/refresh tokens, API keys, OTPs) are scrubbed from production console logs.
- **Anti-Brute Force Lockout:** 5 consecutive failed login attempts lock account access for 15 minutes.
- **Secure File Upload Pipeline:** Strict MIME verification (`JPEG`, `PNG`, `PDF`), 5MB size ceiling, and unguessable UUID-generated filenames with `nosniff` security headers.

---

## 🧬 Red Blood Cell (RBC) Transfusion Compatibility Matrix

RakthaSethu implements medically precise clinical transfusion logic:

| Recipient Blood Group | Compatible Donor Blood Groups (RBC) | Transfusion Notes |
| :---: | :---: | :--- |
| **O-** | **O-** | Can only receive O- red blood cells |
| **O+** | **O-, O+** | Compatible with all O donors |
| **A-** | **O-, A-** | Compatible with Rh- negative O & A |
| **A+** | **O-, O+, A-, A+** | Compatible with O & A donors |
| **B-** | **O-, B-** | Compatible with Rh- negative O & B |
| **B+** | **O-, O+, B-, B+** | Compatible with O & B donors |
| **AB-** | **O-, A-, B-, AB-** | Can receive any Rh- negative red cells |
| **AB+** | **All 8 Blood Groups** | **Universal RBC Recipient** |

> **Universal RBC Donor**: **O-Negative (O-)** can be safely administered to any recipient in emergency trauma situations where recipient blood typing cannot be completed in time.

---

## 📊 Multi-Factor Donor Ranking Score (0 - 100)

$$\text{Score} = W_{\text{compat}} (40) + W_{\text{exact}} (10) + W_{\text{avail}} (20) + W_{\text{urgency}} (15) + W_{\text{dist}} (15) + W_{\text{exp}} (5)$$

1. **Prerequisite Compatibility (40 pts):** Verified against RBC transfusion matrix.
2. **Exact Group Match Bonus (10 pts):** Prioritizes exact matches to conserve universal O- stocks.
3. **Availability Readiness (20 pts):** Active donors with availability enabled.
4. **Emergency Priority (15 pts):** Critical requests prioritize donors flagged as `emergencyAvailable`.
5. **Geographical Proximity (15 pts):** Calculated using the Haversine spherical distance formula.
6. **Past Donation Reliability (5 pts):** Verified past donations increase candidate reliability score.

---

## 🛠️ Technology Stack

```
Frontend:   React 18  •  TypeScript 5.6  •  Vite  •  Tailwind CSS  •  TanStack Query v5  •  Lucide Icons
Backend:    Node.js 20 LTS  •  Express  •  TypeScript  •  Prisma ORM  •  Zod  •  Nodemailer  •  Multer
Database:   PostgreSQL 16 (Production)  /  SQLite (Local Dev & Testing)
DevOps:     Docker Multi-Stage  •  Docker Compose  •  Nginx Alpine  •  GitHub Actions CI
```

---

## 🚀 Deployment & Installation Guide

### Option A: Local Zero-Config Development (Fastest)

```bash
# 1. Clone repository
git clone https://github.com/rakthasethu/rakthasethu.git
cd rakthasethu

# 2. Setup and start Backend
cd backend
npm install
npx prisma db push
npm run seed
npm run dev

# 3. Setup and start Frontend (in another terminal)
cd ../frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

### Option B: Production Docker Compose

```bash
# 1. Prepare environment
cp .env.production.example .env

# 2. Build and launch containers
docker compose up --build -d

# 3. Apply migrations and initial seed
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run seed
```
Access the application at **`http://localhost:5173`** and the API at **`http://localhost:5000`**.

---

## 🔑 Pre-Configured Seed Accounts

For verification and testing in staging/demo environments:

| Role | Email | Password | Features Verified |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@rakthasethu.org` | `Admin@123456` | KPIs, Verifications, Audit Logs, User Controls |
| **Hospital** | `apollo.hospital@rakthasethu.org` | `Demo@123456` | Requisitions, Donor Arrival Verification |
| **Blood Bank** | `redcross.bloodbank@rakthasethu.org` | `Demo@123456` | Cold-chain inventory, Batch ledger, Stock alerts |
| **Donor (O-)** | `donor.oneg@rakthasethu.org` | `Demo@123456` | Universal donor profile, Emergency requests |
| **Donor (B+)** | `donor.bpos@rakthasethu.org` | `Demo@123456` | Active donor profile, History & certificates |
| **Patient** | `patient@rakthasethu.org` | `Demo@123456` | Live emergency broadcast, Matched donor cards |
| **Volunteer** | `volunteer@rakthasethu.org` | `Demo@123456` | Emergency dispatch tasks, Coordination |

---

## 🧪 Automated Testing & Verification

Run the comprehensive Vitest test suites:
```bash
cd backend
npm test
```

Verifies:
- 100% of the 64 Red Blood Cell transfusion compatibility combinations.
- Haversine distance calculations and multi-factor ranking scoring engine.
- PII phone/email/address privacy masking rules.
- Request finite state machine terminal state protections.
- IDOR access boundaries and role security.
- Email/SMS notification resilience under unconfigured conditions.
- AI urgency classifier and emergency chatbot safety.

---

## 📜 Humanitarian & Clinical Disclaimer

*RakthaSethu is a voluntary humanitarian technology platform designed to facilitate contact between donors and families in need. The platform does not sell blood, provide clinical diagnoses, or replace emergency healthcare services. In an acute life-threatening medical emergency, immediately contact national emergency medical services (e.g. 112 / 108 / 911) or proceed to the nearest hospital emergency department.*
