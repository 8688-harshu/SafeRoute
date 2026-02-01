# SafeRoute Frontend Report

## 1. Executive Summary
The SafeRoute project maintains two distinct frontend implementations:
1.  **Web Client (`web_client/`)**: A functional, browser-based Single Page Application (SPA) currently running and verifiable.
2.  **Flutter App (`frontend/`)**: A mobile application codebase designed for Android/iOS, currently in a development state but not buildable in this specific environment due to missing Flutter SDK.

---

## 2. Flutter App Analysis (`frontend/`)
**Status**: Code Complete (Development)
**Framework**: Flutter (Dart)

### Key Components

#### A. Main UI (`lib/screens/home_screen.dart`)
*   **Map Integration**: Uses `google_maps_flutter` package to display a full-screen interactive map.
*   **User Input**:
    *   One-tap SOS button constantly visible.
    *   Floating input card for "Origin" and "Destination".
    *   Report button to crowd-source unsafe areas.
*   **Route Visualization**:
    *   Polyline rendering logic to draw routes on the map.
    *   Color-coded safety segments (Green/Yellow/Red).
*   **Interactive Details**: Bottom sheet modal displays detailed route safety scores and step-by-step risk factors.

#### B. API Communication (`lib/services/api_service.dart`)
*   **Backend Connection**: Configured to connect to `http://10.0.2.2:8000` (standard Android emulator localhost alias).
*   **Data Models**: Strongly typed `RouteResponse` class to parse JSON from the backend.
*   **Error Handling**: Basic try/catch blocks for network requests with user-facing SnackBar notifications.

#### C. Design System (`lib/theme.dart`)
*   **Color Palette**:
    *   Primary: Google Blue (`#4285F4`)
    *   Safety Indicators: Green (`#34A853`), Yellow (`#FBBC05`), Red (`#EA4335`)
*   **Typography**: Uses standard `Roboto` font with a clean, Material 3 design execution.
*   **Components**: Custom styles for Input Fields (pill-shaped, clean borders) and Elevated Buttons.

### Missing/To-Do
*   **Real Geometry**: The current `home_screen.dart` uses mock coordinates for drawing the polyline (`LatLng` arithmetic) instead of decoding the actual geometry string from the backend. This is a critical functionality gap to fix for a production app.
*   **Location Services**: Logic for "My Location" is present but requires native permission handling.

---

## 3. Web Client Analysis (`web_client/`)
**Status**: Active & Running
**URL**: `http://localhost:5500/index.html`

### Key Features
*   **Visual Fidelity**: Implements a "Glassmorphism" design with a sidebar overlay similar to Google Maps.
*   **Functionality**:
    *   Successfully fetches and displays routes from the Python backend.
    *   Toggles for "Day/Night" mode and "Crowd Density".
    *   Interactive Leaflet Map with risk zone circles (e.g., Dhoolpet).
*   **Readiness**: This is the primary way to demonstrate the project's logic right now.

## 4. Recommendations
1.  **For Demonstration**: Continue using the **Web Client** as it connects seamlessly to the running backend and visualizes the "Safety vs. Time" tradeoff effectively.
2.  **For Mobile Dev**: Update `frontend/lib/screens/home_screen.dart` to properly decode the `geometry` string from the API response into a list of `LatLng` points for the Polyline, replacing the current mock loop.
