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
                // Handle different geometry formats if necessary, but assuming [[lat,lng],...]
                const points = route.geometry.map(c => ({ latitude: c[0], longitude: c[1] }));
                const isSelected = index === selectedRouteIndex;

                // --- USER RULE: High Risk = RED. Accidental/Medium = YELLOW. Safe = GREEN. ---
                // Priority: Backend Color > Risk Score
                let baseColor = 'rgba(15, 157, 88, 1)'; // Default Green

                if (route.color === 'RED' || route.risk_score >= 40) {
                    baseColor = 'rgba(217, 48, 37, 1)'; // Red
                } else if (route.color === 'YELLOW' || (route.risk_score >= 25 && route.risk_score < 40)) {
                    baseColor = 'rgba(251, 188, 4, 1)'; // Yellow
                }

                const isRisky = route.color === 'RED' || route.risk_score >= 40;

                let strokeColor;
                let zIndex;
                let strokeWidth;

                if (isRisky) {
                    zIndex = 20; // Risky routes on top to warn
                } else {
                    zIndex = 10;
                }

                if (isSelected) {
                    strokeWidth = 7;
                    zIndex += 50; // Selected ALWAYS on top
                    strokeColor = baseColor;
                } else {
                    strokeWidth = 5;
                    // Dimmed versions for inactive
                    // We need to parse the rgba to add opacity, simple replacement for now
                    strokeColor = baseColor.replace(', 1)', ', 0.5)');
                }

                return (
                    <Polyline
                        key={`route-${index}`}
                        coordinates={points}
                        strokeColor={strokeColor}
                        strokeWidth={strokeWidth}
                        zIndex={zIndex}
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
