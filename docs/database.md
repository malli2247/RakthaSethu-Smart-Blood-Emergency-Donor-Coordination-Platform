# RakthaSethu — Database Schema Documentation

## 1. Schema Design Philosophy

The RakthaSethu database is implemented on **PostgreSQL** using **Prisma ORM**. The design emphasizes:
- Strict relational constraints and foreign keys to prevent orphan records.
- Role-based table sub-typing (`DonorProfile`, `PatientProfile`, `Hospital`, `BloodBank`, `Volunteer`).
- Comprehensive indexing on high-frequency query fields (blood groups, geolocation coordinates, cities, and status flags).
- Non-repudiation and traceability via `Donation.certificateCode` and `AuditLog`.

---

## 2. Core Entities & Relational Map

### 1. `User`
- Central identity entity for authentication and role-based access.
- Key fields: `id` (UUID), `email` (unique), `passwordHash`, `phone`, `role` (Role Enum), `isActive`, `isVerified`.
- Relations: Cascades to sub-profiles (`donorProfile`, `hospitalProfile`, etc.), `refreshTokens`, `notifications`.

### 2. `DonorProfile`
- Stores voluntary donor biological and geographic information.
- Key fields: `bloodGroup`, `dateOfBirth`, `gender`, `lastDonationDate`, `isEligible`, `isAvailable`, `emergencyAvailable`, `totalDonations`, `livesSavedEstimate`, `latitude`, `longitude`, `hidePhoneNumber`, `hideExactAddress`.
- Indexes: `[bloodGroup]`, `[city, state]`, `[isAvailable, isEligible]`.

### 3. `Hospital` & `BloodBank`
- Licensed healthcare institutions.
- Key fields: `licenseNumber` (unique), `verificationStatus` (`PENDING`, `VERIFIED`, `REJECTED`), `contactPerson`, `contactPhone`, `latitude`, `longitude`.

### 4. `BloodRequest`
- Emergency transfusion requisition.
- Key fields: `requesterId`, `patientName`, `bloodGroup`, `unitsRequired`, `urgency` (`NORMAL`, `HIGH`, `CRITICAL`), `hospitalName`, `hospitalCity`, `requiredBy`, `status` (`PENDING` through `FULFILLED`).
- Indexes: `[bloodGroup]`, `[hospitalCity, hospitalState]`, `[status]`, `[urgency]`.

### 5. `DonorMatch`
- Many-to-many join record between `BloodRequest` and `DonorProfile`.
- Key fields: `requestId`, `donorId`, `compatibilityScore`, `distanceKm`, `status` (`PENDING`, `NOTIFIED`, `ACCEPTED`, `DECLINED`, `EXPIRED`).
- Unique constraint: `@@unique([requestId, donorId])`.

### 6. `Donation`
- Immutable verification receipt when donor gives blood.
- Key fields: `donorId`, `requestId`, `hospitalId`, `bloodBankId`, `units`, `donationDate`, `certificateCode` (unique, e.g. `RKS-M8Z9-3A7F`).

### 7. `BloodInventory`
- Cold-chain inventory items for blood banks.
- Key fields: `bloodBankId`, `bloodGroup`, `componentType` (`WHOLE_BLOOD`, `PACKED_RED_CELLS`, `PLATELETS`, `FRESH_FROZEN_PLASMA`), `units`, `batchNumber`, `collectionDate`, `expiryDate`, `status` (`AVAILABLE`, `RESERVED`, `EXPIRED`, `DISCARDED`).

### 8. `Campaign` & `CampaignRegistration`
- Community donation drives organized by hospitals or Red Cross centers.
- Tracks `targetUnits`, `registeredCount`, and individual donor attendee statuses.

### 9. `Notification` & `AuditLog`
- Real-time in-app user notifications and security audit logs tracking IP, user-agent, and entity modifications.
