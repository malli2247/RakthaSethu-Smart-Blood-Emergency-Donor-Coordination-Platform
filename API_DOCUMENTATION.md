# RakthaSethu — API Documentation Reference

Base URL: `http://localhost:5000/api`

All JSON responses follow the standardized envelope:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation successful",
  "data": { ... }
}
```

---

## 1. Emergency & Progressive Search (`/api/emergency`)

### `GET /api/emergency/events`
* **Description**: Server-Sent Events (SSE) persistent stream for zero-latency live events.
* **Authentication**: Optional / Public. Exempt from aggressive rate limiting.
* **Event Types**: `heartbeat`, `status_change`, `donor_matched`, `search_step`.

### `POST /api/emergency/search`
* **Description**: Triggers progressive radius expansion search for an emergency blood request.
* **Authentication**: Required (`Bearer <token>`).
* **Request Body**:
  ```json
  {
    "requestId": "cm7...req_id",
    "customSequence": [5, 7, 9, 10, 15, 20]
  }
  ```
* **Response**: Returns `searchSteps`, scored `candidates` with breakdown, and `escalationPlan` if candidates are insufficient.

### `GET /api/emergency/search/:requestId`
* **Description**: Fetches current status, radius history, and ranked candidate donors for a request.
* **Authentication**: Optional.

### `GET /api/emergency/command-center`
* **Description**: Live emergency metrics: active counts, capacity stats, live requests feed, and AI shortage alerts.
* **Authentication**: Optional.

### `GET /api/emergency/map-layers`
* **Description**: Privacy-preserving geospatial points: active requests, verified hospitals, blood banks, and fuzzed donor zones (1.2km offset).
* **Query Parameters**: `bloodGroup`, `urgency`.
* **Authentication**: Optional.

### `POST /api/emergency/simulate`
* **Description**: Runs an end-to-end simulated emergency scenario for admin testing and verification.
* **Request Body**:
  ```json
  {
    "bloodGroup": "O_NEGATIVE",
    "unitsRequired": 2,
    "urgency": "CRITICAL",
    "hospitalName": "Apollo Emergency",
    "city": "Hyderabad",
    "state": "Telangana",
    "latitude": 17.4325,
    "longitude": 78.4072
  }
  ```

### `POST /api/emergency/sync`
* **Description**: Idempotent offline queue synchronizer.
* **Request Body**:
  ```json
  {
    "idempotencyKey": "uuid-v4-key",
    "actionType": "CREATE_REQUEST",
    "payload": { ... }
  }
  ```

---

## 2. Emergency Coordination Room (`/api/coordination`)

### `GET /api/coordination/requests/:requestId`
* **Description**: Returns coordination room details, accepted donors with travel estimates, navigation links, and message history.
* **Authentication**: Optional.

### `POST /api/coordination/rooms/:roomId/messages`
* **Description**: Posts a message to the coordination room. Supports quick predefined messages or custom text.
* **Authentication**: Required (`Bearer <token>`).
* **Request Body**:
  ```json
  {
    "message": "I am en route (ETA 15 mins)",
    "messageType": "PREDEFINED",
    "isPredefined": true
  }
  ```

### `POST /api/coordination/rooms/:roomId/arrival`
* **Description**: Confirms donor physical arrival at hospital reception; increments secured units.
* **Authentication**: Required (`Bearer <token>`).
* **Request Body**:
  ```json
  {
    "donorId": "donor_profile_id"
  }
  ```

---

## 3. AI & Machine Learning Intelligence (`/api/ai`)

### `POST /api/ai/voice-request`
* **Description**: Parses raw speech-to-text transcript and extracts clinical entities.
* **Request Body**:
  ```json
  {
    "transcript": "Urgent need two units of O negative blood at Apollo hospital Hyderabad for emergency accident"
  }
  ```
* **Response**: Extracted `bloodGroup`, `unitsRequired`, `hospitalName`, `urgency`, `confidence`, and `missingFields`.

### `GET /api/ai/demand-forecast`
* **Description**: 7-day regional demand projections across all 8 ABO groups with trend analysis and shortage risk classifications.
* **Authentication**: Optional.

### `GET /api/ai/shortage-forecast/:bloodBankId`
* **Description**: Blood bank-specific inventory burn rates, stockout countdowns, expiring units, and proactive mitigation recommendations.
* **Authentication**: Optional.

### `POST /api/ai/classify-urgency`
* **Description**: Clinical triage helper classifying medical reason notes into `CRITICAL`, `HIGH`, or `NORMAL`.
* **Request Body**:
  ```json
  {
    "medicalReason": "Massive post-partum hemorrhage during emergency C-section in labor room"
  }
  ```

### `POST /api/ai/chat`
* **Description**: Interactive clinical assistant answering compatibility, donation eligibility, and protocol queries.
* **Request Body**:
  ```json
  {
    "question": "Can an A+ donor donate blood to an AB+ recipient?"
  }
  ```

### `POST /api/ai/evaluate-trust`
* **Description**: Computes request trust score (0-100%) and fraud flags.
* **Authentication**: Required (`Bearer <token>`).

---

## 4. Core Modules Summary

* **Authentication**:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/me`
  - `POST /api/auth/logout`
* **Blood Requests**:
  - `GET /api/requests`
  - `GET /api/requests/:id`
  - `POST /api/requests`
  - `PATCH /api/requests/:id/status`
* **Donors**:
  - `GET /api/donors/profile`
  - `PATCH /api/donors/profile`
  - `GET /api/donors/stats`
  - `GET /api/donors/history`
  - `POST /api/donors/record-donation`
* **Blood Banks**:
  - `GET /api/blood-banks/profile`
  - `GET /api/blood-banks/inventory`
  - `POST /api/blood-banks/inventory`
  - `PATCH /api/blood-banks/inventory/:id`
* **Campaigns**:
  - `GET /api/campaigns`
  - `POST /api/campaigns`
  - `POST /api/campaigns/:id/register`
* **Admin**:
  - `GET /api/admin/stats`
  - `GET /api/admin/users`
  - `PATCH /api/admin/users/:id/status`
  - `GET /api/admin/verifications`
  - `PATCH /api/admin/verifications/:type/:id`
