# RAKTHASETHU — PRODUCTION READINESS CODEBASE AUDIT

**Date of Audit**: September 2026  
**Auditor**: Antigravity Principal System Architect & DevOps Engineer  
**Repository**: RakthaSethu Full-Stack Humanitarian Blood Donation Platform  
**Target Domains**: https://rakthasethu.in (Web) | https://api.rakthasethu.in (API)

---

## 1. Executive Summary

RakthaSethu is designed as a high-stakes, humanitarian emergency blood connect platform connecting Donors, Patients/Attendants, Hospitals, Blood Banks, Volunteers, and Administrators. 

The existing foundation is solid:
- Clean modular Express/TypeScript backend with Zod validation, JWT authentication, and Prisma ORM.
- Complete React 18 + Vite + Tailwind CSS + Lucide icons frontend with 23 dedicated pages.
- 100% passing blood compatibility logic and multi-factor donor matching algorithm.
- Zero-config development database configured for rapid local testing.

However, moving to **real-world production deployment** requires closing critical gaps in:
1. **Access Control & IDOR Prevention**: Certain endpoints lack strict record-level ownership checks.
2. **Donor Privacy Hardening**: Contact details must be masked until a donor explicitly accepts a request.
3. **Password Lifecycle**: Missing forgot/reset password flows and account lockout guards.
4. **Resilient Notification Infrastructure**: In-app notifications exist, but external Email (SMTP/Resend) and SMS (Twilio/Fast2SMS) services require proper abstractions with guaranteed graceful degradation if third-party providers fail.
5. **Secure Object Storage / File Uploads**: Architecture for hospital verification documents and donor medical fitness certificates.
6. **Audit Trail**: Tracking lifecycle state changes and administrative actions in the database.
7. **Production Environment & Deployment Configuration**: Strict configuration schemas, CI/CD pipeline, Nginx/Domain architecture, and sanitized logging.

---

## 2. Detailed Component Audit

### 2.1 Authentication & User Security
| Item | Current State | Production Requirement | Action Required |
| :--- | :--- | :--- | :--- |
| **Registration & Login** | Implemented with bcrypt (10 rounds) & JWT | Production-ready with rate limiting | Retain & strengthen with brute-force tracking |
| **Password Reset** | Not implemented | Secure token generation with 1-hour expiry | Add orgotPassword & esetPassword |
| **Email Verification** | Mock/auto for donors | Token-based verification flow | Add verification token generation and confirmation |
| **Token Rotation** | Implemented with RefreshToken model | Token revocation on logout & refresh | Ensure automatic invalidation on password change |
| **Brute Force Protection** | IP-based rate limiting on /login | Account lockout after 5 consecutive failures | Add account failure counter & lockout window |
| **Credentials Exposure** | Password hashes excluded in response | Strict sanitization across all queries | Verify select projections never leak passwordHash |

### 2.2 Authorization & Access Control (RBAC & IDOR)
| Item | Current State | Production Vulnerability / Gap | Action Required |
| :--- | :--- | :--- | :--- |
| **Role Verification** | equireRole(...) middleware active | Global role checks exist | Retain |
| **Request Status Updates** | Guarded by uthenticateToken only | **CRITICAL IDOR**: Any authenticated user could change another user's blood request status | Enforce ownership: only requester or Admin can cancel; assigned hospital/admin can confirm |
| **Blood Bank Inventory** | updateInventoryStatus updates by ID only | **CRITICAL IDOR**: A blood bank could modify another blood bank's stock | Enforce ownership: inventory item must belong to caller's loodBankId |
| **Donor & Hospital Profiles** | Keyed to eq.user.id | Securely scoped to authenticated user | Retain |
| **Admin Endpoints** | Guarded by equireRole('ADMIN') | Securely restricted to Admin role | Add audit logging for all admin actions |

### 2.3 Donor Privacy & Medical Confidentiality
| Item | Current State | Production Vulnerability / Gap | Action Required |
| :--- | :--- | :--- | :--- |
| **Phone Number** | Masked in indRankedDonors | **DATA LEAK RISK**: getRequestById includes raw phone/email in matches | Strictly mask donor phone and email in request matches UNLESS match status is ACCEPTED |
| **Exact Address** | Kept in DonorProfile.address | Do not expose exact residential addresses publicly | Only expose City, State, and approximate distance (Km) |
| **Medical Disclaimers** | Present in AI service | Must be visible across matching and emergency flows | Include clear advisory notices |

### 2.4 Blood Request & Emergency Workflow
| Item | Current State | Production Gap | Action Required |
| :--- | :--- | :--- | :--- |
| **State Machine** | Validated via VALID_STATUS_TRANSITIONS | Transitions from PENDING to FULFILLED | Retain state machine guards |
| **Donation Confirmation** | Implemented in confirmHospitalDonation | Generates certificate & fulfills request | Ensure verified hospital status is required (equireVerified) |
| **Concurrency & Transactions** | Used in registration and donation | Atomic state updates | Wrap all multi-table mutations in prisma. |
| **Audit Logs** | AuditLog model exists in schema | Not currently populated during request changes | Add automatic audit log recording |

### 2.5 Blood Bank Inventory Control
| Item | Current State | Production Gap | Action Required |
| :--- | :--- | :--- | :--- |
| **Stock Addition** | Implemented with auto-expiry calculation | Working | Retain |
| **Negative Stock Prevention** | units updated directly | **RISK**: Could be set to negative units | Enforce units >= 0 check and validation |
| **Audit Log** | Not recorded | Stock changes must have an audit trail | Log stock intake, reservations, and discards |

### 2.6 Notifications, Email & SMS
| Item | Current State | Production Gap | Action Required |
| :--- | :--- | :--- | :--- |
| **In-App Notifications** | Saved in database, marked as read | Working | Retain |
| **Email Service** | Basic SMTP config | Missing unified email service with rich templates | Implement EmailService with Nodemailer / SMTP / Resend and graceful fallback |
| **SMS Service** | Config flag only | No provider abstraction | Implement SmsService with Twilio / Fast2SMS adapter and explicit unconfigured warnings |
| **Resilience** | Notification failure could abort workflow | Must never crash primary transactions | Wrap external alerts in non-blocking background promises |

### 2.7 Secure File Uploads
| Item | Current State | Production Gap | Action Required |
| :--- | :--- | :--- | :--- |
| **Upload Endpoints** | Not implemented | Needed for hospital licenses and donor reports | Implement UploadService with MIME validation, 5MB limit, UUID filenames, and secure access |

### 2.8 Logging, Error Handling & Health Monitoring
| Item | Current State | Production Gap | Action Required |
| :--- | :--- | :--- | :--- |
| **Error Responses** | Centralized in errorHandler.ts | Development stack traces hidden in prod | Ensure consistent { success, message, code } and no SQL disclosure |
| **Production Logging** | Basic console.log | Unredacted logs could leak tokens/secrets | Implement Logger with redaction of passwords, tokens, and authorization headers |
| **Startup Validation** | Not implemented | App starts even if critical configs are missing | Implement startup environment schema validation |

### 2.9 Deployment, Docker & CI/CD
| Item | Current State | Production Gap | Action Required |
| :--- | :--- | :--- | :--- |
| **Database Migrations** | prisma db push used for dev | Production requires versioned migrations | Generate PostgreSQL migrations in prisma/migrations/ |
| **Environment Separation** | Single .env | Need .env.example, .env.development, .env.production.example | Create standardized environment templates |
| **Docker Configuration** | docker-compose.yml present | Needs production multi-stage Dockerfiles | Add health checks, non-root users, and production build flags |
| **CI/CD** | None | Need automated GitHub Actions pipeline | Create .github/workflows/ci.yml |
| **Domain & Reverse Proxy** | None | Needed for akthasethu.in and pi.rakthasethu.in | Document Nginx configuration, SSL certbot, and DNS records |

---

## 3. Prioritized Implementation Roadmap

1. **Phase A — Environment Configuration & Startup Validator**: Create .env.example, .env.production.example, centralized Zod config validator with graceful warnings.
2. **Phase B — Database & Migration Pipeline**: Versioned PostgreSQL migrations, safe seeding safeguards.
3. **Phase C — Authentication & Password Recovery**: Forgot/reset password, email verification tokens, account lockout.
4. **Phase D — RBAC & IDOR Elimination**: Require ownership checks on blood requests, inventories, and profiles.
5. **Phase E — Donor Privacy Protection**: Strict phone/email masking until donor acceptance.
6. **Phase F — Resilient Notification, Email & SMS Services**: Plug-in email/SMS service with rich templates and fail-safe execution.
7. **Phase G — Blood Bank Inventory Safety & Audit Logging**: Non-negative inventory enforcement, transaction safety, audit trail.
8. **Phase H — Secure File Uploads**: Validated file upload service for hospital documents and certificates.
9. **Phase I — Sanitized Logging & Production Error Handling**: Redacted logger and safe error responses.
10. **Phase J — Admin Dashboard Enhancements**: Audit log viewer and verification management.
11. **Phase K — Docker, CI/CD & Deployment Architecture**: Dockerfiles, GitHub Actions, Nginx config for akthasethu.in.
12. **Phase L — End-to-End Testing & Verification**: Full integration test suite covering the entire humanitarian lifecycle and edge cases.
