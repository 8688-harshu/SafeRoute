import { getDistance } from 'geolib';

/**
 * Calculates safety metrics for a given route based on risk zones and environmental factors.
 * 
 * @param {Object} route - The route object containing geometry (coordinates).
 * @param {Array} riskZones - List of high-risk zones (Crime).
 * @param {Array} accidentalZones - List of accidental/hazard zones.
 * @param {String} timeOfDay - 'day' or 'night'.
 * @returns {Object} { safetyScore, cctvScore, lightScore, crimeScore, tags }
 */
export const calculateRouteSafety = (route, riskZones = [], accidentalZones = [], timeOfDay = 'day') => {
    let intersections = 0;
    let hazardIntersections = 0;

    // Polyline decoding if necessary, but assuming route.geometry is array of [lat, lng] or objects
    // The HomeScreen.js seems to expect route.geometry.coordinates or route.geometry directly.
    // Let's normalize.
    let coordinates = [];
    if (Array.isArray(route.geometry)) {
        coordinates = route.geometry; // [[lat, lng], ...]
    } else if (route.geometry && route.geometry.coordinates) {
        coordinates = route.geometry.coordinates.map(c => ({ latitude: c[1], longitude: c[0] })); // GeoJSON is [lng, lat]
    }

    // Sampling: Check every Nth point to improve performance
    const sampleRate = Math.max(1, Math.floor(coordinates.length / 50));

    for (let i = 0; i < coordinates.length; i += sampleRate) {
        let point = coordinates[i];
        // Handle array format [lat, lng] if necessary
        if (Array.isArray(point)) {
            point = { latitude: point[0], longitude: point[1] };
        }

        // 1. Check Risk Zones (Crime)
        for (const zone of riskZones) {
            const dist = getDistance(point, { latitude: zone.lat, longitude: zone.lng });
            const radius = zone.radius_meters || (zone.radius_km * 1000) || 1000;
            if (dist < radius) {
                intersections++;
                break; // Count once per point
            }
        }

        // 2. Check Accidental Zones (Hazards/Light)
        for (const zone of accidentalZones) {
            const dist = getDistance(point, { latitude: zone.lat, longitude: zone.lng });
            const radius = zone.radius_meters || (zone.radius_km * 1000) || 500;
            if (dist < radius) {
                hazardIntersections++;
                break;
            }
        }
    }

    // METRICS CALCULATION
    const totalSamples = Math.ceil(coordinates.length / sampleRate);
    const riskDensity = Math.min(1, intersections / totalSamples); // 0 to 1
    const hazardDensity = Math.min(1, hazardIntersections / totalSamples);

    // Safety Score: Baseline 100
    // Heavy penalty for risk zones (ensure it drops below 50 if ANY risk zone is hit)
    // User Rule: Risk Zone = Not Recommended.
    let penalty = 0;
    if (intersections > 0) {
        penalty += 50; // Immediate large penalty for hitting a risk zone
        penalty += (riskDensity * 40); // Add density penalty
    }
    if (hazardIntersections > 0) {
        penalty += 20; // Penalty for accidental zones
        penalty += (hazardDensity * 20);
    }

    let safetyScore = 100 - penalty;
    safetyScore = Math.max(10, Math.floor(safetyScore));

    // Stats Mapping
    // Crime: Direct correlation to risk zones
    const crimeScore = Math.floor(riskDensity * 100);

    // CCTV %: Simulated based on safety (inverse of crime) + random factor for demo
    const cctvScore = Math.max(20, 100 - (crimeScore * 1.5));

    // Light %: 
    // If night, reduce score. If hazards (often poorly lit), reduce score.
    let baseLight = timeOfDay === 'night' ? 60 : 100;
    let lightScore = baseLight - (hazardDensity * 40);

    // RECOMMENDATION LOGIC (Strict)
    let isRecommended = false;
    let badgeLabel = "Alternative";
    let badgeColor = "grey"; // default
    let isHighRisk = false;

    if (intersections > 0) {
        // Rule 1: Risk Zone Hit -> NOT Recommended, High Risk
        isRecommended = false;
        isHighRisk = true;
        badgeLabel = "High Risk";
        badgeColor = "#D93025"; // Red
    } else if (hazardIntersections > 0) {
        // Rule 2: Accidental Zone Hit -> Alternative
        isRecommended = false;
        badgeLabel = "Alternative";
        badgeColor = "#FBBC04"; // Yellow
    } else {
        // Rule 3: Clean Route -> Recommended
        isRecommended = true;
        badgeLabel = "Recommended";
        badgeColor = "#0F9D58"; // Geen
    }

    const stats = {
        safetyScore: safetyScore,
        cctvScore: Math.floor(cctvScore),
        lightScore: Math.floor(lightScore),
        crimeScore: crimeScore, // This is "Risk Level"
        isRecommended: isRecommended,
        isHighRisk: isHighRisk,
        badgeLabel: badgeLabel,
        badgeColor: badgeColor
    };



    return stats;
};
