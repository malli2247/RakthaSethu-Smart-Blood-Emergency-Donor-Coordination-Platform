# RakthaSethu — Geospatial Map & Privacy-Preserving Architecture

This document specifies the Geographic Information System (GIS) and privacy enforcement protocols powering the interactive emergency maps in RakthaSethu.

---

## 1. Map Engine & Technology Stack

* **Leaflet (`v1.9.4`)**: High-performance, lightweight, mobile-optimized vector mapping library.
* **OpenStreetMap (OSM) Tiles**: Free, publicly accessible raster tile service without proprietary API key restrictions or quotas.
* **Browser Geolocation API**: Fallback GPS acquisition on supported secure origins (`https://` or `localhost`).
* **Haversine Distance Formula**: Exact great-circle spherical distance computation:
  $$d = 2R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
  Where $R = 6,371 \text{ km}$.

---

## 2. Concentric Radius Rings & Progressive Envelopes

Implemented in `frontend/src/components/maps/EmergencyMap.tsx`.

During an active emergency search, the map visualizes concentric circles around the requisition origin:
* `5 km`: Immediate hospital catchment area (Primary Tier).
* `7 km`: Extended urban radius.
* `9 km`: Sub-metro perimeter.
* `10 km`: Standard emergency threshold.
* `15 km`: Regional peri-urban zone.
* `20 km`: Inter-city transit corridor.

### Dynamic Styling:
- Active expansion ring is rendered with an animated stroke (`dashArray: '8, 8'`) and higher fill opacity ($0.15$).
- Inactive outer rings render with subtle dashed borders ($0.05$ opacity) to provide spatial context without clutter.

---

## 3. Dual-Tier Privacy Preservation Protocol

Donor safety and privacy are paramount. To prevent location harvesting, doxxing, or unsolicited visits:

### Tier 1: Public Verified Facilities (Exact Coordinates)
- Hospitals and Licensed Blood Banks are designated emergency response points.
- Real verified GPS coordinates, official hospital names, addresses, and reception phone numbers are displayed openly for navigation.

### Tier 2: Individual Voluntary Donors (Fuzzed Cluster Representation)
- **Zero Exact Residential GPS Exposure**: Exact latitude/longitude and residential addresses of donors are **never** returned by the map layer endpoint (`/api/emergency/map-layers`).
- **Deterministic Coordinate Jitter**:
  The backend hashes the unique donor ID using MD5 and computes an offset vector:
  $$\Delta\text{lat} = \frac{(\text{hex}(0..4) \pmod{200}) - 100}{10,000} \approx \pm 1.0 \text{ km}$$
  $$\Delta\text{lng} = \frac{(\text{hex}(4..8) \pmod{200}) - 100}{10,000} \approx \pm 1.0 \text{ km}$$
- Donors appear on the map as **"Donor Density Circles"** with a $1,200\text{m}$ radius representation showing only blood group, city, and emergency availability status.
- Phone numbers of individual donors are masked (e.g., `+91 98*** **877`).
