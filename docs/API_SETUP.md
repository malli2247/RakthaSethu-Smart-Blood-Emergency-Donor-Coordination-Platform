# RakthaSethu — Complete API & Integration Configuration Guide

This guide details the complete configuration, verification, restriction, and rotation procedures for all third-party services and environment credentials powering **RakthaSethu**.

---

## 1. Architectural Overview & Destination Matrix

RakthaSethu strictly adheres to the principle of least privilege:
- **Backend Only**: Secrets, private keys, database URLs, AI API keys, and OTP auth tokens belong exclusively in the backend runtime environment.
- **Frontend / Vercel**: Only variables prefixed with `VITE_` are bundled into the browser client. They are treated as public by design.
- **Never expose secrets** in frontend bundles, logs, diagnostic endpoints, or Git repositories.

| Service | Purpose | Environment Variable(s) | Required | Destination | Secret Level |
|---|---|---|---|---|---|
| **PostgreSQL 16** | Core relational database | `DATABASE_URL` | **Yes** | Backend Hosting | Critical Secret |
| **JWT Authentication** | Session token signing | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | **Yes** | Backend Hosting | Critical Secret |
| **Google Gemini AI** | Medical triage & emergency assistant | `GEMINI_API_KEY` (alias `AI_API_KEY`), `GEMINI_MODEL` | Optional (Heuristic fallback) | Backend Hosting | Private Secret |
| **Google Maps Platform** | Geocoding & Places validation | `GOOGLE_MAPS_SERVER_KEY` (alias `GOOGLE_MAPS_API_KEY`) | Optional (Haversine fallback) | Backend Hosting | Restricted Secret |
| **Google Maps Browser** | Optional interactive map tiles | `VITE_GOOGLE_MAPS_API_KEY` | Optional (OpenStreetMap fallback) | Vercel / Frontend | Public (Domain-Restricted) |
| **Resend / Email** | Outbound password resets & alerts | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (or SMTP) | Optional in Dev, Prod Required | Backend Hosting | Private Secret |
| **Mobile OTP / SMS** | 6-digit phone verification & SMS | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` (or Fast2SMS / MSG91) | Optional in Dev, Prod Required | Backend Hosting | Private Secret |
| **Web Push (VAPID)** | W3C lock-screen emergency push | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | **Yes** for Push Alerts | Backend (`PRIVATE`), Frontend (`PUBLIC`) | Private / Public Pair |

---

## 2. Integration Setup & Dashboard Links

### A. Database (PostgreSQL 16)
- **Official Dashboard**: [AWS RDS](https://console.aws.amazon.com/rds) / [Supabase](https://supabase.com/dashboard) / [Neon](https://console.neon.tech) / [Render PostgreSQL](https://dashboard.render.com)
- **Credential**: Connection URI containing username, password, host, port, database, and SSL mode.
- **Variable**: `DATABASE_URL`
- **Destination**: Backend Hosting `.env` only.
- **Format**: `postgresql://username:password@host:5432/rakthasethu?sslmode=require&schema=public`
- **Security**: Enable SSL mode (`sslmode=require`), enforce connection pooling (PgBouncer or Prisma pool size `DATABASE_POOL_SIZE=50`), and restrict database firewall to backend IP addresses.

### B. Session Security (JWT Secrets)
- **Generation**: Generate cryptographically secure 64-character random hex strings:
  ```bash
  openssl rand -hex 32
  ```
- **Variables**:
  - `JWT_ACCESS_SECRET`: Signs 15-minute access tokens.
  - `JWT_REFRESH_SECRET`: Signs 7-day refresh tokens.
- **Destination**: Backend Hosting `.env` only.

### C. Google Gemini AI Integration
- **Official Dashboard**: [Google AI Studio](https://aistudio.google.com/)
- **How to Obtain**:
  1. Sign in to Google AI Studio.
  2. Click **Get API key** -> **Create API key in new project**.
  3. Copy the generated key.
- **Variables**:
  - `GEMINI_API_KEY`: API Key (starts with `AIzaSy...`)
  - `GEMINI_MODEL`: Default `gemini-1.5-flash` (or `gemini-2.0-flash`)
  - `ENABLE_AI_FEATURES`: `true`
- **Destination**: Backend Hosting `.env` only. NEVER put in Vercel or frontend.
- **Key Restrictions**: In Google Cloud Console, restrict the key's API usage strictly to **Generative Language API**.
- **Limits & Pricing**: Free tier includes 15 requests per minute (RPM) and 1 million tokens per minute (TPM). Pay-as-you-go pricing is $0.075 per 1M input tokens.
- **Resilience**: If Gemini is unconfigured or rate-limited, RakthaSethu's built-in clinical heuristic engine seamlessly answers emergency compatibility and donation guidelines without interrupting operations.

### D. Google Maps Platform
- **Official Dashboard**: [Google Cloud Console](https://console.cloud.google.com/google/maps-apis)
- **How to Obtain**:
  1. Create a project in Google Cloud Console and link a billing account.
  2. Navigate to **APIs & Services** -> **Library** and enable:
     - **Geocoding API**
     - **Places API** (optional)
     - **Maps JavaScript API** (optional)
  3. Navigate to **Credentials** -> **Create Credentials** -> **API Key**.
- **Variables**:
  - `GOOGLE_MAPS_SERVER_KEY` (Backend): Server-side key used for geocoding hospital addresses.
  - `VITE_GOOGLE_MAPS_API_KEY` (Frontend, optional): Browser key if custom Google Maps tiles are enabled.
- **Key Restrictions**:
  - **Server Key**: Set **Application restrictions** to *IP addresses* (enter your backend server static IP). Under **API restrictions**, restrict strictly to *Geocoding API*.
  - **Browser Key**: Set **Application restrictions** to *Websites (HTTP referrers)*: `https://rakthasethu.in/*`, `https://*.vercel.app/*`.
- **Limits & Pricing**: $200 free monthly credit (covers ~40,000 geocoding requests).
- **Resilience**: RakthaSethu uses OpenStreetMap tiles and the mathematical spherical Haversine distance formula by default. Matching operates 100% reliably even if Google Maps is unconfigured.

### E. Email Delivery (Resend / SMTP)
- **Official Dashboard**: [Resend Console](https://resend.com/overview)
- **How to Obtain**:
  1. Sign up on Resend.
  2. Navigate to **API Keys** -> **Create API Key** (Permission: *Sending access*).
  3. Navigate to **Domains** and verify your sending domain (e.g., `rakthasethu.org`) by configuring SPF, DKIM, and DMARC DNS records.
- **Variables**:
  - `EMAIL_PROVIDER=resend`
  - `RESEND_API_KEY`: Starts with `re_...`
  - `RESEND_FROM_EMAIL`: `RakthaSethu Alerts <alerts@rakthasethu.org>` (for testing before domain verification, you can use `onboarding@resend.dev`)
- **Alternative (SMTP)**:
  - `EMAIL_PROVIDER=smtp`
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`
- **Destination**: Backend Hosting `.env` only.
- **Limits & Pricing**: Resend free tier includes 3,000 emails/month (100 emails/day). Pro tier is $20/month for 50,000 emails.

### F. Mobile OTP & SMS Service
- **Providers Supported**:
  1. **Twilio** (Global / India): [Twilio Console](https://console.twilio.com/)
  2. **Fast2SMS** (India DLT Quick & OTP route): [Fast2SMS Dev Portal](https://www.fast2sms.com/dev/bulkV2)
  3. **MSG91** (India DLT Enterprise): [MSG91 Dashboard](https://control.msg91.com/)
- **Variables (Twilio)**:
  - `OTP_PROVIDER=twilio`
  - `TWILIO_ACCOUNT_SID`: Account SID (starts with `AC...`)
  - `TWILIO_AUTH_TOKEN`: Auth Token
  - `TWILIO_PHONE_NUMBER`: Phone Number (e.g. `+1234567890`)
  - `OTP_VERIFY_SERVICE_ID`: (Optional) Twilio Verify Service SID (`VA...`)
- **Variables (Fast2SMS)**:
  - `OTP_PROVIDER=fast2sms`
  - `FAST2SMS_API_KEY`: API Key
- **Variables (MSG91)**:
  - `OTP_PROVIDER=msg91`
  - `MSG91_AUTH_KEY`: Auth Key
  - `MSG91_TEMPLATE_ID`: DLT Template ID
  - `MSG91_SENDER_ID`: Approved DLT Header (default `RKTHST`)
- **Destination**: Backend Hosting `.env` only.
- **Staging / Dev Safe Mode**: When `OTP_DEV_MODE=true`, OTPs are generated cryptographically and logged to server logs without sending real SMS, enabling zero-cost local testing. In production without `OTP_DEV_MODE`, mock SMS is strictly rejected.

### G. Web Push Notifications (VAPID)
- **Generation**:
  Generate standard RFC-8292 VAPID key pair:
  ```bash
  npx web-push generate-vapid-keys
  ```
- **Variables**:
  - `VAPID_PUBLIC_KEY`: 87-character public base64url key (placed in Backend `.env` and `VITE_VAPID_PUBLIC_KEY` in Frontend).
  - `VAPID_PRIVATE_KEY`: 43-character private base64url key (Backend ONLY).
  - `VAPID_SUBJECT`: Contact email or URL (e.g., `mailto:admin@rakthasethu.org`).
- **Cost**: 100% Free (native browser standard via Mozilla/Google push services).

---

## 3. Deployment Environments & Hosting Setup

### A. Vercel (Frontend Client)
1. In the Vercel dashboard, navigate to **Project Settings** -> **Environment Variables**.
2. Configure strictly the public variables:
   ```env
   VITE_API_URL=https://api.rakthasethu.org
   VITE_VAPID_PUBLIC_KEY=BD3wUSOHMziCiqA6EoULEnRcC7ouASGCDyyQ_0L7HSImy-ByJqC9ooZsVGGyUnBMPwig_hf5I0FOMtD5IGhtpxA
   ```
   *(Optional if using Google Maps JS in browser)*:
   ```env
   VITE_GOOGLE_MAPS_API_KEY=AIzaSy...
   ```
3. **DO NOT** add database passwords, JWT secrets, Gemini keys, or Resend keys to Vercel!
4. **Vercel Rewrites**: `frontend/vercel.json` routes all client paths to `/index.html` for React Router SPA execution.

### B. Backend Hosting (Render, Railway, Fly.io, or AWS)
1. In your backend platform dashboard, navigate to **Environment Variables**.
2. Set all server-side variables:
   ```env
   NODE_ENV=production
   PORT=5000
   FRONTEND_URL=https://rakthasethu.in
   CORS_ORIGINS=https://rakthasethu.in,https://rakthasethu.vercel.app
   DATABASE_URL=postgresql://user:password@db-host:5432/rakthasethu?sslmode=require
   JWT_ACCESS_SECRET=your_generated_64_char_hex_access_secret
   JWT_REFRESH_SECRET=your_generated_64_char_hex_refresh_secret
   GEMINI_API_KEY=AIzaSy...
   RESEND_API_KEY=re_...
   RESEND_FROM_EMAIL=RakthaSethu Alerts <alerts@rakthasethu.org>
   OTP_PROVIDER=twilio
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=...
   TWILIO_PHONE_NUMBER=+1234567890
   VAPID_PUBLIC_KEY=BD3w...
   VAPID_PRIVATE_KEY=PO8b...
   VAPID_SUBJECT=mailto:admin@rakthasethu.org
   ```

---

## 4. Verification & Testing

### How to Test Integrations Safely:
1. **Admin Health Audit**:
   - Log in as an administrator on RakthaSethu.
   - Navigate to the **Admin Dashboard** (`/admin`).
   - View the **External Integrations & Provider Health** panel.
   - All 6 services display real-time status:
     - `Configured` (green)
     - `Needs Verification` (amber)
     - `Unavailable` (slate)
     - `Connected` (emerald)
2. **Safe Email Test**:
   - On the Admin Dashboard, click **Test Email Delivery**.
   - Dispatches a single diagnostic test email to the logged-in admin email address.
   - Does NOT send unsolicited emails to actual donors.
3. **Automated Integration Test Suite**:
   ```bash
   cd backend
   npm test
   ```
   Executes 141 tests covering:
   - `MapsService` (offline centroid resolution, health checks)
   - `AiService` (Gemini API handling, timeouts, privacy guardrails)
   - `EmailService` (Resend & SMTP routing, diagnostic dispatch)
   - `SmsService` & `OtpService` (Twilio Verify, Fast2SMS, MSG91, production mock rejection)
   - `WebPushService` (VAPID key verification, phone masking)
   - Rare blood donor anti-triangulation and zero-exposure rules.

---

## 5. Security, Key Rotation & Incident Response

### If an API Key is Accidentally Exposed:
1. **Rotate Immediately in Provider Dashboard**:
   - **Gemini**: Go to [Google AI Studio](https://aistudio.google.com/), delete the compromised key, and generate a new one.
   - **Resend**: Go to [Resend API Keys](https://resend.com/api-keys), delete the key, and create a new key.
   - **Twilio**: Go to [Twilio Console](https://console.twilio.com/), create a secondary Auth Token, switch it in backend environment variables, and delete the primary token.
   - **Google Maps**: In [Google Cloud Console](https://console.cloud.google.com/), delete the key and generate a new restricted key.
2. **Update Backend Hosting**:
   - Update the variable in your hosting platform (Render/Railway/AWS).
   - Trigger a restart or redeployment.
3. **Verify Git History**:
   - Ensure the secret is NOT committed in Git history.
   - If committed, run `git filter-repo` or BFG Repo-Cleaner to purge from history.

---

## 6. Common Configuration Errors & Solutions

| Error Message / Symptom | Cause | Solution |
|---|---|---|
| `535 5.7.0 Invalid credentials` | Incorrect SMTP username or password | Switch to Resend (`RESEND_API_KEY`) or verify SMTP credentials. |
| `HTTP 403 Forbidden` from Gemini | Gemini API key invalid or Generative Language API disabled | Enable Generative Language API in Google Cloud Console or regenerate key in Google AI Studio. |
| `HTTP 429 Too Many Requests` | Provider rate limit exceeded | RakthaSethu will automatically fall back to clinical heuristics or queue retries. Increase quota in provider console. |
| `REQUEST_DENIED` from Google Maps | Geocoding API not enabled or IP restriction mismatch | In Google Cloud Console, enable Geocoding API and add backend IP to whitelist. |
| `VAPID keys not configured` | Missing or truncated VAPID keys | Generate new keys with `npx web-push generate-vapid-keys` and update backend/frontend. |
| `Mobile verification temporarily unavailable` | No SMS provider configured in production | Set `OTP_PROVIDER=twilio` (or `fast2sms`) with valid credentials, or set `OTP_DEV_MODE=true` on staging. |
