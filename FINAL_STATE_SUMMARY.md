# SafeRoute - Current State Summary
(As of User Request Step 377)

## 1. Backend Logic (`risk_engine.py`)
- **Bow-Shape Multi-Route Strategy**: Active.
- **Route Generation**:
  - Calculates **Direct Route** (Fastest).
  - Calculates **Left Bow** (30% Offset).
  - Calculates **Right Bow** (30% Offset).
- **Fallback Mechanism**:
  - If "Unique Route Detector" (Tolerance 1%) finds only 1 distinct route, the system FORCES a second route check using `alternatives=true` from OSRM.
- **Output**: Returns list of `RouteResponse` objects including detailed `risk_score` and `geometry`.

## 2. Frontend Visualization (`HomeScreen.js`)
- **Strict Risk Coloring**:
  - **RED** (`rgba(217, 48, 37, 1)`): If `risk_score >= 40` (Touches any Risk Zone).
  - **GREEN** (`rgba(15, 157, 88, 1)`): If `risk_score < 40` (Safe).
- **Z-Index Priority**:
  - Selected Route: Highest (Top).
  - Risky Routes: High (Above Safe routes, to warn user).
  - Safe Routes: Standard.
- **Interaction**:
  - All routes are `tappable` (Android support enabled).
  - Tapping a route selects it and updates the specific steps/tags in the bottom sheet.

## 3. Data Integrity
- **Coordinates**: Backend swaps `[Lat, Lng]` (Internal) to `[Lng, Lat]` (API) correctly.
- **Zones**: Firebase Risk Zones are loaded and impact the `risk_score`.

## Next Steps (Recommendations)
- Continue testing with diverse geolocations to fine-tune the "Bow Offset" ratio if routes are too wide or too narrow.
- Verified that "Medium" risk zones currently turn the route RED (Threshold >= 40). Adjust if "Yellow" is desired for Medium risk.
