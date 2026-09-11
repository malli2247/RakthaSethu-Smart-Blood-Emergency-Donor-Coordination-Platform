# RakthaSethu — Progressive Emergency Donor Search & Coordination

This document details the progressive donor discovery algorithm, automated escalation protocols, and real-time emergency coordination rooms.

---

## 1. The Progressive Search Problem

Broadcasting an emergency blood requisition to all donors in an entire state or country overwhelms blood donors with false alarms, causes notification fatigue, and contacts donors who are too far away to reach the patient in time.

Conversely, restricting a search only to a rigid 5 km zone can fail if no matching donors are available in that immediate vicinity.

### The Solution: Progressive Radius Expansion
RakthaSethu implements an automated progressive radius expansion model:

$$5\text{km} \longrightarrow 7\text{km} \longrightarrow 9\text{km} \longrightarrow 10\text{km} \longrightarrow 15\text{km} \longrightarrow 20\text{km} \longrightarrow 25\text{km} \longrightarrow 50\text{km} \longrightarrow 100\text{km}$$

---

## 2. Algorithm Execution Lifecycle

Implemented in `backend/src/services/progressiveDonorSearchService.ts`.

### Step-by-Step Flow:
1. **Target Candidate Pool Sizing**:
   $$\text{Target Donors} = \max(\text{Units Required} \times 3, 5)$$
   *(Ensures redundancy in case contacted donors are busy, traveling, or in surgery).*
2. **Sequential Radius Stepping**:
   For each radius $R_k$ in sequence:
   - Queries all eligible donors whose great-circle distance $d \le R_k$.
   - Verifies RBC Transfusion Compatibility:
     - $O^-$ can donate to all groups.
     - Isogroup matching prioritized (+5 bonus).
   - Verifies eligibility window (last donation $\ge 90$ days ago).
3. **Cumulative Non-Duplication**:
   - Discovered donor IDs are registered in a set $\mathcal{D}$.
   - Subsequent expansions only add new donors ($d \in (R_{k-1}, R_k]$).
   - Each attempt record is persisted in `SearchRadiusAttempt` with discovery count and sufficiency flag.
4. **Early Termination on Sufficiency**:
   - If $|\mathcal{D}| \ge \text{Target Donors}$, the algorithm immediately halts further expansion to prevent notification noise.
5. **AI Ranking & Phased Dispatch**:
   - All candidates in $\mathcal{D}$ are scored via Multi-Factor Smart Match Scoring.
   - Top candidates receive high-priority push, SMS, and in-app alerts.

---

## 3. Automated AI Escalation Protocol

If the progressive expansion reaches the maximum operational radius ($100\text{km}$) without fulfilling the candidate quota, the system marks `isEscalated = true` and triggers a 3-tier escalation plan:

| Priority | Protocol Action | Target Channel | Description |
| :---: | :--- | :--- | :--- |
| **1** | Inter-Facility Blood Bank Exchange | Certified Regional Blood Banks | Auto-queries inventory across neighboring certified blood banks within 75km for direct unit transfer. |
| **2** | Expand ABO Compatibility | Alternative RBC Donors | Relaxes strict isogroup preference to include all universal compatible donors ($O^-$). |
| **3** | Volunteer Field Coordinator Activation | On-Call Volunteer Network | Notifies regional volunteer ambassadors to coordinate emergency transportation. |

---

## 4. Emergency Coordination Room (`/coordination/:id`)

When a donor accepts an emergency alert, an `EmergencyCoordinationRoom` is activated.

### Key Capabilities:
* **Turn-by-Turn Navigation**: One-tap Google Maps / OpenStreetMap directions link directly to the emergency hospital reception.
* **Controlled Real-Time Chat**:
  - Pre-defined quick buttons prevent slow typing during transit:
    - *"I am en route (ETA 15 mins)"*
    - *"Heavy traffic, delay +10 mins"*
    - *"Arrived at hospital entrance"*
    - *"At Blood Bank counter / OT reception"*
  - Custom text messages permitted for critical clarifications.
* **Verified Arrival Confirmation**:
  - Hospital staff or attendants verify donor arrival with a single tap (`POST /api/coordination/rooms/:roomId/arrival`).
  - Automatically updates `unitsSecured` and closes room upon quota completion.
