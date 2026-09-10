# RakthaSethu — REST API Reference

Base URL: `http://localhost:5000/api`

---

## 1. Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new user with role-specific profile data | None |
| `POST` | `/api/auth/login` | Authenticate with email & password, returns JWT | None |
| `POST` | `/api/auth/refresh-token` | Rotate refresh token and issue new access token | None |
| `POST` | `/api/auth/logout` | Revoke active refresh token | None |
| `GET` | `/api/auth/me` | Fetch currently authenticated user and profile | Bearer Token |
| `POST` | `/api/auth/change-password` | Update account password | Bearer Token |

---

## 2. Donor Matching Engine (`/api/matching`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/matching/find-donors` | Find & rank compatible donors (Masked phone/address) | Optional |
| `GET` | `/api/matching/request/:requestId` | Get ranked matches for a blood request | Bearer Token |
| `POST` | `/api/matching/request/:requestId/run` | Execute matching algorithm for request | Bearer Token |

---

## 3. Emergency Blood Requests (`/api/requests`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/requests` | List requests with filters (status, urgency, bloodGroup, city) | Optional |
| `GET` | `/api/requests/:id` | Get single request details | Optional |
| `POST` | `/api/requests` | Create emergency blood request & start auto-match | Bearer Token |
| `PATCH` | `/api/requests/:id/status` | Advance lifecycle status (guarded by FSM) | Bearer Token |
| `POST` | `/api/requests/matches/:matchId/respond` | Donor accepts or declines a match | Bearer (Donor) |

---

## 4. Donor Management (`/api/donors`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/donors/profile` | Get authenticated donor profile | Bearer (Donor) |
| `PATCH` | `/api/donors/profile` | Update availability toggles and privacy | Bearer (Donor) |
| `GET` | `/api/donors/stats` | Get impact metrics (lives saved, donations) | Bearer (Donor) |
| `GET` | `/api/donors/matches` | Get emergency blood requests matched to donor | Bearer (Donor) |
| `GET` | `/api/donors/history` | Get verified donation timeline and certificates | Bearer (Donor) |
| `POST` | `/api/donors/record-donation` | Record completed donation manually | Bearer (Donor) |

---

## 5. Hospital Facility (`/api/hospitals`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/hospitals/profile` | Get hospital facility profile | Bearer (Hospital) |
| `PATCH` | `/api/hospitals/profile` | Update hospital details and contact person | Bearer (Hospital) |
| `GET` | `/api/hospitals/requests` | List requests originating from this hospital | Bearer (Hospital) |
| `POST` | `/api/hospitals/confirm-donation` | Confirm donor arrival, record units, issue certificate | Bearer (Verified Hosp) |

---

## 6. Blood Bank & Inventory (`/api/blood-banks`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/blood-banks/profile` | Get blood bank facility profile | Bearer (Bank) |
| `GET` | `/api/blood-banks/inventory` | Get cold-chain stock batches, alerts & expiry warnings | Bearer (Bank) |
| `POST` | `/api/blood-banks/inventory` | Add new refrigerated batch | Bearer (Verified Bank) |
| `PATCH` | `/api/blood-banks/inventory/:id` | Update batch status (Available, Reserved, Expired) | Bearer (Verified Bank) |

---

## 7. Campaigns (`/api/campaigns`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/campaigns` | List active & upcoming community blood drives | Optional |
| `GET` | `/api/campaigns/:id` | Get campaign details & attendee count | Optional |
| `POST` | `/api/campaigns` | Create donation drive | Bearer (Org/Admin) |
| `POST` | `/api/campaigns/:campaignId/register` | Donor registers for camp slot | Bearer (Donor) |
| `DELETE` | `/api/campaigns/:campaignId/register` | Donor cancels camp registration | Bearer (Donor) |

---

## 8. Admin & Governance (`/api/admin`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/admin/stats` | System-wide KPIs & emergency fulfillment rate | Bearer (Admin) |
| `GET` | `/api/admin/users` | List registered platform accounts with search & pagination | Bearer (Admin) |
| `PATCH` | `/api/admin/users/:id/status` | Activate or deactivate user access | Bearer (Admin) |
| `GET` | `/api/admin/verifications` | View pending hospital & blood bank license queue | Bearer (Admin) |
| `PATCH` | `/api/admin/verifications/:type/:id` | Approve or reject medical organization license | Bearer (Admin) |

---

## 9. Modular AI Layer (`/api/ai`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/ai/classify-urgency` | Analyze clinical notes & recommend urgency level | Optional |
| `POST` | `/api/ai/chat` | FAQ & emergency chatbot with medical disclaimers | Optional |
