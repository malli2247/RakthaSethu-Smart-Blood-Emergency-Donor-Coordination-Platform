# RakthaSethu — PWA & Offline Emergency Mode

In acute medical crises, network connectivity can be degraded or unavailable (e.g. natural disasters, remote clinics, basement hospital ICUs). RakthaSethu is designed with a **first-class offline architecture** enabling hospital staff and attendants to draft emergency requests without network connection.

---

## 1. Core Capabilities

1. **Uninterrupted Offline Requisition Intake**: Users can draft and stage complete emergency blood requisitions even when `navigator.onLine === false`.
2. **Deterministic Idempotency**: Each offline action receives a cryptographically unguessable `idempotencyKey`. The backend records processed keys in the `OfflineSyncEvent` table, guaranteeing zero duplicate blood requests when the device reconnects.
3. **Automatic Seamless Synchronization**: The client listens for the browser `online` event and immediately drains the pending queue, triggering progressive donor search immediately upon sync.
4. **Emergency National Lifelines Directory**: Standalone emergency contacts (Ambulance 108, Unified Emergency 112, Blood Helpline 104, Disaster 1077) are cached in localStorage and Service Worker for instant tap-to-call access.
5. **PWA Installability**: Installable on Android, iOS, Windows, and macOS with web app manifest and dedicated SVG icons.

---

## 2. IndexedDB Architecture

Implemented in `frontend/src/services/offlineStorage.ts`.

### Database Schema:
* **Database Name**: `rakthasethu_offline`
* **Version**: `1`
* **Stores**:
  1. `emergency_requests`: Key path `idempotencyKey`
     - Fields: `idempotencyKey`, `patientName`, `bloodGroup`, `unitsRequired`, `hospitalName`, `hospitalCity`, `contactPhone`, `urgency`, `status`, `createdAt`
  2. `offline_actions`: Key path `id` (autoIncrement)
     - Fields: `id`, `idempotencyKey`, `actionType`, `payload`, `timestamp`

### Storage Lifecycle:
```
[User Drafts Blood Request]
          │
          ▼
   Is Online?
    ├── YES ──► POST /api/requests (Live Broadcast)
    │
    └── NO  ──► Generate UUID idempotencyKey
                Save to IndexedDB ('emergency_requests')
                Stage action in ('offline_actions')
                Show Sticky Amber Offline Banner
```

---

## 3. Reconnection & Auto-Sync Workflow

1. Device re-establishes internet connectivity (`window.addEventListener('online')`).
2. Client queries all pending actions from IndexedDB `offline_actions`.
3. Client dispatches `POST /api/emergency/sync` for each item:
   ```json
   {
     "idempotencyKey": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
     "actionType": "CREATE_REQUEST",
     "payload": {
       "patientName": "Ananya Deshmukh",
       "bloodGroup": "O_NEGATIVE",
       "unitsRequired": 2,
       "hospitalName": "Apollo Hospital",
       "hospitalCity": "Hyderabad",
       "contactPhone": "+91 98119 98877",
       "urgency": "CRITICAL"
     }
   }
   ```
4. **Backend Processing**:
   - Checks `OfflineSyncEvent` table for existing `idempotencyKey`.
   - If found: returns status `ALREADY_PROCESSED` without re-creating.
   - If new: creates `BloodRequest` in database and automatically triggers `ProgressiveDonorSearchService.executeSearch(newRequest.id)` in the background.
5. Client marks local draft as `SYNCED` and clears the queue.
6. Banner displays confirmation toast: *"Successfully synchronized N offline request(s)!"*

---

## 4. Service Worker Caching (`sw.js`)

- **Cache Name**: `rakthasethu-pwa-v1`
- **Cache Strategy**: Network-first with cache fallback for HTML navigation; cache-first for immutable static CSS, JS bundles, and Leaflet map tiles.
- **Offline Fallback**: Displays the cached application shell with `OfflineBanner` if a route is requested while fully offline.
