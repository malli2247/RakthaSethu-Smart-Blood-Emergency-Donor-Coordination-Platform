# RakthaSethu — Production External Services & Credentials Guide

> **CRITICAL SECURITY DIRECTIVE**
> Never commit active secrets, API keys, or database passwords to source control.
> Never paste production passwords or private tokens into chat or pull requests.
> Use environment variables, secret managers (AWS Secrets Manager, Doppler, Vault), or platform secret inject mechanisms (Render, Railway, Fly.io, Vercel, ECS).

---

## 1. External Services Overview

RakthaSethu is designed with a **pluggable, fail-safe architecture**. The application functions in development mode with simulated/local zero-config providers, and seamlessly switches to enterprise services in production when environment variables are supplied.

| Service Domain | Production Provider Options | Fallback / Dev Behavior | Registration / Console URL |
| :--- | :--- | :--- | :--- |
| **Relational Database** | PostgreSQL 16 (AWS RDS, Neon, Supabase) | Local zero-config SQLite (`dev.db`) | [neon.tech](https://neon.tech) / [supabase.com](https://supabase.com) |
| **Transactional Email** | Mailgun, SendGrid, Amazon SES, Postmark | Local mock logger | [sendgrid.com](https://sendgrid.com) / [mailgun.com](https://mailgun.com) |
| **Emergency SMS** | Twilio, Fast2SMS (India), AWS SNS | Local mock logger | [twilio.com](https://twilio.com) / [fast2sms.com](https://fast2sms.com) |
| **Geocoding & Maps** | Google Maps Platform, Mapbox, OpenStreetMap | Haversine distance calculations | [console.cloud.google.com](https://console.cloud.google.com) |
| **AI Matching Insights** | Google Gemini (1.5 Flash / Pro) | Rule-based scoring heuristic | [aistudio.google.com](https://aistudio.google.com) |
| **Object Storage** | AWS S3, Cloudinary, DigitalOcean Spaces | Secure local disk storage (`uploads/`) | [aws.amazon.com/s3](https://aws.amazon.com/s3) |

---

## 2. Complete Environment Variables Specification

### Core Infrastructure & Security

| Variable | Required in Prod | Example / Format | Purpose |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | **YES** | `production` | Enables strict cookie flags, hides SQL stack traces, enables production optimizations. |
| `PORT` | Optional | `5000` | Backend listening port (defaults to 5000). |
| `FRONTEND_URL` | **YES** | `https://rakthasethu.org` | Primary frontend web domain for CORS and verification links. |
| `BACKEND_URL` | **YES** | `https://api.rakthasethu.org` | API domain used for generating file download and verification links. |
| `CORS_ORIGINS` | **YES** | `https://rakthasethu.org,https://admin.rakthasethu.org` | Comma-delimited permitted web origins. |
| `DATABASE_URL` | **YES** | `postgresql://user:pass@host:5432/rakthasethu?sslmode=require` | Production PostgreSQL 16 connection string. |
| `JWT_ACCESS_SECRET` | **YES** | `min-64-character-cryptographically-random-string` | Signs 15-minute access tokens. |
| `JWT_REFRESH_SECRET` | **YES** | `min-64-character-cryptographically-random-string` | Signs 7-day persistent refresh tokens. |
| `JWT_ACCESS_EXPIRATION` | Optional | `15m` | Lifetime of short-lived JWT. |
| `JWT_REFRESH_EXPIRATION`| Optional | `7d` | Lifetime of refresh token. |

---

### Transactional Email (SMTP / Mailgun / SendGrid)

When `EMAIL_PROVIDER=smtp`, the backend utilizes `nodemailer` with standard TLS:

| Variable | Required in Prod | Example | Description |
| :--- | :---: | :--- | :--- |
| `EMAIL_PROVIDER` | **YES** | `smtp` | Sets email engine. Options: `smtp`, `mock`. |
| `SMTP_HOST` | **YES** | `smtp.sendgrid.net` or `email-smtp.ap-south-1.amazonaws.com` | SMTP gateway hostname. |
| `SMTP_PORT` | **YES** | `587` (STARTTLS) or `465` (SSL) | SMTP port. |
| `SMTP_USER` | **YES** | `apikey` or `smtp_user_account` | SMTP username / API key identifier. |
| `SMTP_PASS` | **YES** | `SG.xxxxxxxxxxxxxxxxxxxxxxxx` | SMTP password / API token. |
| `EMAIL_FROM` | **YES** | `RakthaSethu Alerts <alerts@rakthasethu.org>` | Verified sender address. |

---

### Emergency SMS (Twilio / Fast2SMS)

SMS is critical for real-time donor notification during `CRITICAL` blood emergencies:

| Variable | Required in Prod | Example | Description |
| :--- | :---: | :--- | :--- |
| `SMS_PROVIDER` | Optional | `twilio` or `fast2sms` | Sets SMS provider. Options: `twilio`, `fast2sms`, `mock`. |
| `TWILIO_ACCOUNT_SID` | If Twilio | `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | Twilio Account SID. |
| `TWILIO_AUTH_TOKEN` | If Twilio | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | Twilio Auth Secret. |
| `TWILIO_PHONE_NUMBER`| If Twilio | `+18005550199` | Approved Twilio SMS sending phone number. |
| `FAST2SMS_API_KEY` | If Fast2SMS | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | Fast2SMS India Quick Transactional API key. |

---

### File & Document Storage

Used for medical prescriptions, hospital registration certificates, and blood bank licenses:

| Variable | Required in Prod | Example | Description |
| :--- | :---: | :--- | :--- |
| `STORAGE_PROVIDER` | Optional | `local` or `s3` or `cloudinary` | Target storage engine. Default: `local`. |
| `UPLOAD_DIR` | If Local | `/var/rakthasethu/uploads` | Persistent directory on server volume. |
| `MAX_FILE_SIZE_MB` | Optional | `5` | Maximum upload size in megabytes. |
| `S3_BUCKET` | If S3 | `rakthasethu-medical-docs` | AWS S3 bucket name. |
| `S3_REGION` | If S3 | `ap-south-1` | AWS S3 region. |
| `S3_ACCESS_KEY` | If S3 | `AKIAIOSFODNN7EXAMPLE` | AWS IAM access key ID. |
| `S3_SECRET_KEY` | If S3 | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` | AWS IAM secret access key. |

---

### Artificial Intelligence & Maps

| Variable | Required in Prod | Example | Description |
| :--- | :---: | :--- | :--- |
| `ENABLE_AI_FEATURES` | Optional | `true` | Enables AI donor matching insights. |
| `AI_API_KEY` | If AI enabled | `AIzaSyxxxxxxxxxxxxxxxxxxxxxx` | Google AI Studio Gemini API key. |
| `AI_MODEL` | Optional | `gemini-1.5-flash` | Selected Gemini model identifier. |
| `GOOGLE_MAPS_API_KEY`| Optional | `AIzaSyxxxxxxxxxxxxxxxxxxxxxx` | Google Maps Platform API key (Places, Geocoding). |

---

## 3. How to Generate Cryptographic Secrets

Generate strong 256-bit random keys for your production deployment using Node.js or OpenSSL:

```bash
# Generate JWT_ACCESS_SECRET
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# Generate JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## 4. Production Checklist Before Going Live

1. [ ] **PostgreSQL 16**: SSL mode enforced (`sslmode=require`), database backups enabled (daily snapshot + WAL archiving).
2. [ ] **JWT Secrets**: Replace development defaults with unique 96-character hex keys.
3. [ ] **Email SPF/DKIM**: Configure DNS records (`v=spf1 include:sendgrid.net ~all` and DKIM CNAMES) on your domain to prevent blood alerts landing in spam.
4. [ ] **Twilio / Fast2SMS DLT Registration**: In India, register SMS headers & templates under TRAI DLT regulations for transactional emergency alerts.
5. [ ] **Firewall & Reverse Proxy**: Place backend behind Nginx / Cloudflare with TLS 1.3, Rate Limiting, and WAF protection.
6. [ ] **Admin Account**: Change default administrator password (`Admin@123456`) immediately after first database seed.
