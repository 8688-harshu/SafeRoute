import React from 'react';
import MapView, { Marker, Polyline, Circle } from 'react-native-maps';
import { StyleSheet } from 'react-native';

const GOOGLE_BLUE = '#1A73E8';
const SOS_RED = '#D93025';
const SAFETY_GREEN = '#0F9D58';

export default function SafeMap({
    mapRef,
    initialRegion,
    showsUserLocation,
    riskZones,
    accidentalZones, // New Prop
    destination,
    allRoutes,
    selectedRouteIndex,
    setSelectedRouteIndex,
    activityMarkers = [],
    children
}) {
    return (
        <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={initialRegion}
            showsUserLocation={showsUserLocation}
        >
            {/* Risk Zones (Red) */}
            {Array.isArray(riskZones) && riskZones.map((zone, index) => (
                <Circle
                    key={`risk-${index}`}
                    center={{ latitude: zone.lat, longitude: zone.lng }}
                    radius={zone.radius_meters || (zone.radius_km * 1000) || 2000}
                    fillColor="rgba(217, 48, 37, 0.2)"
                    strokeColor="rgba(217, 48, 37, 0.5)"
                    strokeWidth={1}
                />
            ))}

            {/* Accidental Zones (Yellow) */}
            {Array.isArray(accidentalZones) && accidentalZones.map((zone, index) => (
                <Circle
                    key={`accidental-${index}`}
                    center={{ latitude: zone.lat, longitude: zone.lng }}
                    radius={zone.radius_meters || (zone.radius_km * 1000) || 500}
                    fillColor="rgba(251, 188, 4, 0.2)" // Google Yellow
                    strokeColor="rgba(251, 188, 4, 0.6)"
                    strokeWidth={1}
                />
            ))}

            {destination && (
                <Marker coordinate={{ latitude: destination.lat, longitude: destination.lng }} title={destination.name} />
            )}

            {/* Activity Scanner Light Markers */}
            {activityMarkers.map((m, i) => (
                <Marker
                    key={`activity-${i}`}
                    coordinate={{ latitude: m.lat, longitude: m.lng }}
                    pinColor={m.type === 'bright' ? '#FBBC04' : '#5F6368'} // Yellow for active, Grey for dead
                    title={m.type === 'bright' ? `${m.count} Shops Open` : 'No activity'}
                />
            ))}

            {/* Multi-Route Rendering - STRICT RISK COLORING */}
            {Array.isArray(allRoutes) && allRoutes.map((route, index) => {
                // Ensure coordinates: standard backend usually returns [[lat,lng],...]
                const points = Array.isArray(route.geometry)
                    ? route.geometry.map(c => ({ latitude: c[0], longitude: c[1] }))
                    : [];

                const isSelected = index === selectedRouteIndex;

                // Color Determination Helper
                const getRouteColor = (r) => {
                    // 1. Use Frontend Calculated Stats (Preferred)
                    if (r.stats) {
                        const { safetyScore, isHighRisk, badgeLabel } = r.stats;

                        // Condition 3: High Risk Zone -> RED
                        if (isHighRisk || (safetyScore !== undefined && safetyScore < 50)) {
                            return '#D50000';
                        }

                        // Condition 2: Accidental Zone / Medium -> YELLOW
                        if (badgeLabel === 'Alternative' || (safetyScore >= 50 && safetyScore <= 80)) {
                            return '#FFD600';
                        }

                        // Condition 1: Safe Route -> GREEN
                        if (safetyScore > 80) {
                            return '#00C853';
                        }
                    }

                    // 2. Fallback: Raw Backend Data
                    // Adjust thresholds as needed based on your backend 'risk_score' scale
                    if (r.color === 'RED' || (r.risk_score && r.risk_score >= 40)) return '#D50000';
                    if (r.color === 'YELLOW' || (r.risk_score && r.risk_score >= 20)) return '#FFD600';

                    return '#00C853'; // Default Safe
                };

                const baseColor = getRouteColor(route);

                return (
                    <Polyline
                        key={`route-${index}`}
                        coordinates={points}
                        strokeColor={isSelected ? baseColor : `${baseColor}80`} // Add transparency if not selected
                        strokeWidth={isSelected ? 6 : 4}
                        zIndex={isSelected ? 50 : 10}
                        tappable={true}
                        onPress={() => setSelectedRouteIndex(index)}
                    />
                );
            })}

            {/* Custom Children (e.g. Navigation Arrow) */}
            {children}
        </MapView>
    );
}


const styles = StyleSheet.create({
    map: { width: '100%', height: '100%' },
});
