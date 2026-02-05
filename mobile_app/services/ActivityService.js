import axios from 'axios';

// Google Maps API Key for Places (already verified in previous steps)
const GOOGLE_PLACES_KEY = 'AIzaSyDWZuf9_o9SPiv7UHw26CgMUMM0fwS9Hko';

/**
 * ActivityService
 * Scans for open businesses along a route to determine night safety.
 */
export const scanRouteActivity = async (routeCoords) => {
    if (!routeCoords || routeCoords.length === 0) return { markers: [], score: 'Unknown' };

    // 1. Sample points every ~500m (roughly every 5th-10th point depending on resolution)
    // For this simulation/demo, we pick points at intervals
    const sampleSize = Math.max(1, Math.floor(routeCoords.length / 5));
    const samples = [];
    for (let i = 0; i < routeCoords.length; i += sampleSize) {
        samples.push(routeCoords[i]);
    }
    // Always include the last point
    if (samples[samples.length - 1] !== routeCoords[routeCoords.length - 1]) {
        samples.push(routeCoords[routeCoords.length - 1]);
    }

    const activityMarkers = [];
    let openShopsCount = 0;

    try {
        const promises = samples.map(async (point) => {
            const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${point[0]},${point[1]}&radius=300&type=store|gas_station|hospital|police&opennow=true&key=${GOOGLE_PLACES_KEY}`;

            const resp = await axios.get(url);
            const results = resp.data.results || [];

            if (results.length > 0) {
                openShopsCount += results.length;
                return {
                    lat: point[0],
                    lng: point[1],
                    type: 'bright', // Yellow light
                    count: results.length
                };
            } else {
                return {
                    lat: point[0],
                    lng: point[1],
                    type: 'dark', // Grey light
                    count: 0
                };
            }
        });

        const results = await Promise.all(promises);

        // Final Score Calculation
        let livelinessScore = 'Desolate';
        if (openShopsCount > 10) livelinessScore = 'Very Busy';
        else if (openShopsCount > 5) livelinessScore = 'Busy Street';
        else if (openShopsCount > 2) livelinessScore = 'Fairly Active';

        return {
            markers: results,
            score: livelinessScore
        };

    } catch (error) {
        console.error('[ActivityService] Scan Failed:', error);
        return { markers: [], score: 'Error scanning' };
    }
};
