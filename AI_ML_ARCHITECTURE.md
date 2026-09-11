# RakthaSethu — AI/ML Architecture & Intelligence Engine

This document provides a comprehensive technical reference for the Artificial Intelligence (AI) and Machine Learning (ML) systems embedded into the RakthaSethu platform.

---

## 1. Architectural Philosophy

In critical healthcare and emergency transfusion workflows, AI systems must be:
1. **Deterministic & Fail-Safe**: A machine learning model failure must never halt an emergency blood requisition. Fallback logic runs in constant time if models or external services are unreachable.
2. **Transparent & Explainable**: Multi-factor scoring breaks down every factor (distance, response probability, compatibility, readiness) so clinical coordinators and admins can inspect why candidates were prioritized.
3. **Privacy-Enforcing**: User privacy is maintained at the data layer. Exact donor residential coordinates and personal identifiers are never passed to inference engines or frontends.

---

## 2. Multi-Factor Smart Donor Match Scoring

The Smart Donor Match Engine calculates a normalized ranking score between **0 and 100** for each prospective donor in an emergency radius.

$$\text{Score} = w_{\text{compat}} \cdot S_{\text{compat}} + w_{\text{dist}} \cdot S_{\text{dist}} + w_{\text{avail}} \cdot S_{\text{avail}} + w_{\text{prob}} \cdot S_{\text{prob}} + w_{\text{exp}} \cdot S_{\text{exp}} + S_{\text{bonus}}$$

### Factor Weights & Computation:
1. **RBC Compatibility ($S_{\text{compat}}$)**:
   - Exact Blood Group Match: **30 points**
   - Universal Donor / Compatible Sub-Group (e.g., O- for A+): **22 points**
2. **Geospatial Proximity ($S_{\text{dist}}$)**:
   - Donors within $\le 3\text{km}$: **25 points**
   - Donors within $3\text{km} - 7\text{km}$: **20 points**
   - Donors within $7\text{km} - 15\text{km}$: **15 points**
   - Donors $> 15\text{km}$: Linearly decayed score
3. **Availability & Emergency Readiness ($S_{\text{avail}}$)**:
   - Actively marked `emergencyAvailable = true`: **15 points**
   - Profile availability status `AVAILABLE_NOW`: **10 points**
4. **ML Response Probability ($S_{\text{prob}}$)**:
   - Predicted acceptance likelihood $\times 15$ (**up to 15 points**)
5. **Historical Reliability & Experience ($S_{\text{exp}}$)**:
   - Total verified successful donations and badge status: **up to 10 points**
6. **Exact Blood Group Match Bonus ($S_{\text{bonus}}$)**:
   - Direct isogroup transfusion preference: **+5 points**

---

## 3. Calibrated ML Response Probability Model

Implemented in `backend/src/modules/ml/responsePredictionService.ts`.

### Mathematical Formulation
The response probability $P(\text{Acceptance})$ is computed via a calibrated sigmoid logistic function:

$$P(\text{Response}) = \sigma\left(\beta_0 + \sum_{i=1}^{k} \beta_i x_i\right) = \frac{1}{1 + e^{-z}}$$

Where $z$ is the linear feature combination:

$$z = -0.35 - 0.085 \cdot d + 0.18 \cdot n_{\text{donations}} + 0.95 \cdot I_{\text{emergency}} + 0.45 \cdot I_{\text{recent}} + \gamma_{\text{urgency}} + \delta_{\text{hour}}$$

### Feature Coefficients:
* **Distance Decay ($\beta_{\text{dist}} = -0.085$)**: Reflects physical travel friction.
* **Donation Track Record ($\beta_{\text{donations}} = +0.18$)**: Reflects altruistic propensity from past fulfilled requests.
* **Emergency Flag ($\beta_{\text{emergency}} = +0.95$)**: Donors actively opted-in for priority emergency push notifications.
* **Recency Bonus ($\beta_{\text{recent}} = +0.45$)**: Donors active in the platform within the past 14 days.
* **Urgency Multiplier ($\gamma_{\text{urgency}}$)**:
  - `CRITICAL`: $+0.40$
  - `HIGH`: $+0.20$
  - `NORMAL`: $0.00$
* **Time-of-Day Penalty ($\delta_{\text{hour}}$)**:
  - Night hours (23:00 to 06:00): $-0.65$
  - Day hours: $0.00$

All outputs are bounded in $[0.05, 0.98]$ and recorded in the database model `ModelPrediction` for ongoing performance tracking.

---

## 4. 7-Day Regional Demand Forecasting & Inventory Burn Rate

Implemented in `backend/src/modules/ml/demandForecastingService.ts`.

### Algorithm Logic:
1. **Historical Velocity Analysis**:
   - Analyzes real consumption velocity over a 30-day sliding window from `BloodRequest`.
   - Weights `CRITICAL` requests with a $1.5\times$ severity factor.
2. **Demographic & ABO Baseline Blending**:
   - Blends empirical demand with regional ABO population frequencies:
     - $O^+: 38\%$
     - $B^+: 30\%$
     - $A^+: 20\%$
     - $AB^+: 6\%$
     - $O^-: 2.5\%$
     - $B^-: 1.8\%$
     - $A^-: 1.2\%$
     - $AB^-: 0.5\%$
3. **Burn Rate & Stockout Countdown**:
   $$\text{Daily Burn Rate} = \frac{\text{Expected Weekly Demand}}{7}$$
   $$\text{Estimated Days to Stockout} = \frac{\text{Current Stock Units}}{\text{Daily Burn Rate}}$$
4. **Shortage Risk Tiers**:
   - `CRITICAL`: $< 2.0$ days of inventory remaining
   - `HIGH`: $2.0 - 4.0$ days remaining
   - `MODERATE`: $4.0 - 7.0$ days remaining
   - `STABLE`: $> 7.0$ days remaining

---

## 5. Voice Blood Requisition Intake & NLP Entity Parser

Implemented in `backend/src/modules/ai/voiceParserService.ts` and `frontend/src/components/emergency/VoiceRequestModal.tsx`.

### Workflow:
1. Attendant or nurse taps microphone on `CreateRequestPage.tsx` or `Navbar.tsx`.
2. Browser Web Speech API or audio recorder captures speech transcript in English or Hindi.
3. Fast regex and clinical NLP entity extraction parses:
   - **Blood Group**: Maps `"O negative"`, `"O ve"`, `"A positive"`, `"बी पॉजिटिव"`, etc. to standard enum `O_NEGATIVE`.
   - **Units Required**: Extracts numerical digits or word numbers (`"two units"`, `"do bottle"` $\rightarrow 2$).
   - **Hospital / Location**: Identifies clinical facility names (`"Apollo"`, `"NIMS"`, `"Care Hospital"`).
   - **Urgency Level**: Maps keywords like `"accident"`, `"ICU"`, `"surgery"`, `"emergency"` to `CRITICAL` or `HIGH`.
4. **Human Verification Safeguard**: The parsed entities are presented in an interactive confirmation preview modal before any database record is created.

---

## 6. Request Trust & Anti-Spam Scoring

Implemented in `backend/src/modules/ml/fraudDetectionService.ts`.

- Evaluates account age, duplicate requisitions across same hospital within 24 hours, and contact verification status.
- Generates a **Request Trust Score (0-100%)**.
- Requests scoring $< 50\%$ are flagged for admin review in the Live Command Center without interrupting emergency care.
