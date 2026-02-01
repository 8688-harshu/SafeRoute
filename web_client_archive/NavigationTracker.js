/**
 * NavigationTracker.js
 * 
 * A robust class for handling Real-Time Turn-by-Turn Navigation tracking.
 * Mimics Google Maps "Drive Mode" with smooth marker interpolation, 
 * bearing-based rotation, and camera locking.
 */

class NavigationTracker {
    /**
     * @param {L.Map} map - Leaflet map instance
     * @param {L.Icon} markerIcon - The 3D arrow icon to use for the user
     */
    constructor(map, markerIcon) {
        this.map = map;
        this.icon = markerIcon;

        // State
        this.marker = null;
        this.watchId = null;
        this.wakeLock = null;
        this.isTracking = false;
        this.isCameraLocked = true;

        // Movement & Animation
        this.lastLatLng = null;
        this.targetLatLng = null;
        this.lastHeading = 0;
        this.animationFrame = null;
        this.startTime = null;
        this.duration = 1000; // Interpolation duration (matches typical GPS update rate)

        // Bind methods for context
        this.onLocationUpdate = this.onLocationUpdate.bind(this);
        this.handleError = this.handleError.bind(this);
        this.animate = this.animate.bind(this);
    }

    /**
     * Start tracking the user's location with high accuracy.
     */
    start() {
        if (!('geolocation' in navigator)) {
            console.error("Geolocation is not supported by your browser.");
            alert("Geolocation not supported.");
            return;
        }

        console.log("Starting Navigation Tracker...");
        this.isTracking = true;
        this.requestWakeLock();

        // Use watchPosition for continuous stream
        this.watchId = navigator.geolocation.watchPosition(
            this.onLocationUpdate,
            this.handleError,
            {
                enableHighAccuracy: true, // Critical for street-level navigation
                maximumAge: 0,            // Do not use cached positions
                timeout: 5000
            }
        );

        // Detect manual panning to disable Camera Lock
        this.map.on('dragstart', () => {
            if (this.isTracking && this.isCameraLocked) {
                this.isCameraLocked = false;
                console.log("Map dragged: Camera Lock Disabled");
                // Dispatch event for UI to show "Re-center" button
                document.dispatchEvent(new CustomEvent('nav-camera-unlocked'));
            }
        });
    }

    /**
     * Stop tracking and clean up resources.
     */
    stop() {
        this.isTracking = false;

        // Clear GPS Watch
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }

        // Release Wake Lock
        if (this.wakeLock !== null) {
            this.wakeLock.release()
                .then(() => {
                    this.wakeLock = null;
                    console.log("Screen Wake Lock released.");
                });
        }

        // Stop Animation Loop
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        console.log("Navigation Tracker stopped.");
    }

    /**
     * Re-centers the camera on the user and re-enables lock.
     */
    recenter() {
        this.isCameraLocked = true;
        if (this.marker) {
            this.map.flyTo(this.marker.getLatLng(), 20, {
                animate: true,
                duration: 0.5
            });
        }
        console.log("Camera Locked to User.");
    }

    /**
     * Request Screen Wake Lock to keep device awake during driving.
     */
    async requestWakeLock() {
        if ('wakeLock' in navigator) {
            try {
                this.wakeLock = await navigator.wakeLock.request('screen');
                console.log("Screen Wake Lock active.");

                // Re-acquire lock if visibility changes (e.g. switching tabs)
                document.addEventListener('visibilitychange', async () => {
                    if (this.wakeLock !== null && document.visibilityState === 'visible') {
                        this.wakeLock = await navigator.wakeLock.request('screen');
                    }
                });
            } catch (err) {
                console.warn(`Wake Lock FAILED: ${err.name}, ${err.message}`);
            }
        }
    }

    /**
     * Handle new GPS coordinates.
     */
    onLocationUpdate(position) {
        const { latitude, longitude, heading, speed } = position.coords;
        const newLatLng = L.latLng(latitude, longitude);
        const timestamp = performance.now();

        // 1. Initial Fix
        if (!this.marker) {
            this.marker = L.marker(newLatLng, {
                icon: this.icon,
                zIndexOffset: 1000
            }).addTo(this.map);

            this.lastLatLng = newLatLng;
            this.targetLatLng = newLatLng;
            this.map.setView(newLatLng, 20); // Zoom in for Drive Mode

            if (heading !== null && !isNaN(heading)) {
                this.rotateMarker(heading);
            }
            return;
        }

        // 2. Continuous Update (Smooth Transition)
        this.lastLatLng = this.marker.getLatLng(); // Start from current displayed pos
        this.targetLatLng = newLatLng;
        this.startTime = timestamp;

        // 3. Handle Heading/Bearing
        let targetHeading = heading;

        // Fallback: If device doesn't provide heading (e.g. some laptops), calculate from movement
        if ((targetHeading === null || isNaN(targetHeading)) && speed > 0.5) {
            targetHeading = this.calculateBearing(
                this.lastLatLng.lat, this.lastLatLng.lng,
                newLatLng.lat, newLatLng.lng
            );
        }

        // Apply Rotation
        if (targetHeading !== null && !isNaN(targetHeading)) {
            // Smooth rotation is handled via CSS transition on the icon element
            this.rotateMarker(targetHeading);
        }

        // 4. Start Interpolation Loop (if not already running)
        if (!this.animationFrame) {
            this.animate(timestamp);
        }
    }

    /**
     * Animation Loop (Linear Interpolation)
     */
    animate(currentTime) {
        if (!this.isTracking) return;

        if (!this.startTime) this.startTime = currentTime;
        const elapsed = currentTime - this.startTime;
        const progress = Math.min(elapsed / this.duration, 1.0); // Cap at 1.0

        if (this.lastLatLng && this.targetLatLng) {
            // Lerp (Linear Interpolation) for Lat/Lng
            const currentLat = this.lastLatLng.lat + (this.targetLatLng.lat - this.lastLatLng.lat) * progress;
            const currentLng = this.lastLatLng.lng + (this.targetLatLng.lng - this.lastLatLng.lng) * progress;
            const interpolatedPos = L.latLng(currentLat, currentLng);

            // Move Marker
            this.marker.setLatLng(interpolatedPos);

            // Camera Lock Logic
            if (this.isCameraLocked) {
                // Pan map to follow user
                this.map.panTo(interpolatedPos, { animate: false });
            }
        }

        // Continue loop if not finished, or if we expect continuous updates
        // We keep loop running or restart it on next update. 
        // For smoother continuous driving, we usually just keep updating target.
        if (progress < 1.0) {
            this.animationFrame = requestAnimationFrame(this.animate);
        } else {
            this.animationFrame = null;
        }
    }

    rotateMarker(degrees) {
        this.lastHeading = degrees;
        const arrow = document.getElementById('user-arrow'); // SVGs inside Leaflet DivIcon
        if (arrow) {
            // The SVG element itself will rotate.
            // Ensure CSS 'transition: transform 0.5s linear' is set on #user-arrow
            arrow.style.transform = `rotate(${degrees}deg)`;
        }
    }

    calculateBearing(startLat, startLng, destLat, destLng) {
        const startLatRad = startLat * (Math.PI / 180);
        const startLngRad = startLng * (Math.PI / 180);
        const destLatRad = destLat * (Math.PI / 180);
        const destLngRad = destLng * (Math.PI / 180);

        const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
        const x = Math.cos(startLatRad) * Math.sin(destLatRad) -
            Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);

        const brng = Math.atan2(y, x);
        const brngDeg = brng * (180 / Math.PI);
        return (brngDeg + 360) % 360;
    }

    handleError(err) {
        console.warn(`GPS Error (${err.code}): ${err.message}`);
    }
}
