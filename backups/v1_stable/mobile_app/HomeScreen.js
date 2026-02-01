import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    TextInput,
    FlatList,
    Keyboard,
    Linking
} from 'react-native';
import MapView, { Marker, Polyline, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons'; // Standard Expo Icons

// --- CONFIGURATION ---
const API_URL = 'http://192.168.0.136:8000';

const GOOGLE_BLUE = '#1A73E8';
const SOS_RED = '#D93025';
const SAFETY_GREEN = '#0F9D58';

export default function HomeScreen({ onLogout }) {
    // State
    const [location, setLocation] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // Navigation State
    const [destination, setDestination] = useState(null);
    const [transportMode, setTransportMode] = useState('driving'); // driving, cycling, walking
    const [routes, setRoutes] = useState([]);
    const [allRoutes, setAllRoutes] = useState([]);
    const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

    // Data State
    const [riskZones, setRiskZones] = useState([]);
    const [loadingRoute, setLoadingRoute] = useState(false);

    // Refs
    const mapRef = useRef(null);

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Allow location access to use SafeRoute.');
                return;
            }
            let location = await Location.getCurrentPositionAsync({});
            setLocation(location);

            // Auto-center map on user
            if (mapRef.current) {
                mapRef.current.animateToRegion({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    latitudeDelta: 0.015,
                    longitudeDelta: 0.0121,
                }, 1000);
            }
        })();

        // Fetch Risk Zones
        axios.get(`${API_URL}/risk-zones`)
            .then(response => {
                console.log('Fetched Risk Zones:', response.data.length);
                setRiskZones(response.data);
            })
            .catch(err => console.error('Failed to fetch risk zones:', err));

    }, []);

    // --- Actions ---

    const handleSearch = async (text) => {
        setSearchQuery(text);
        if (text.length > 2) {
            try {
                const response = await axios.get(`${API_URL}/api/search?query=${text}`);
                setSearchResults(response.data);
                setIsSearching(true);
            } catch (error) {
                console.log('Search Error:', error);
            }
        } else {
            setSearchResults([]);
            setIsSearching(false);
        }
    };

    const selectDestination = (item) => {
        setDestination(item);
        setSearchQuery(item.name);
        setSearchResults([]);
        setIsSearching(false);
        Keyboard.dismiss();

        // Zoom map to show both points
        if (location && mapRef.current) {
            mapRef.current.fitToCoordinates([
                { latitude: location.coords.latitude, longitude: location.coords.longitude },
                { latitude: item.lat, longitude: item.lng }
            ], {
                edgePadding: { top: 150, right: 50, bottom: 300, left: 50 },
                animated: true,
            });
        }
    };

    const handleModeSelect = (mode) => {
        setTransportMode(mode);
        // Add a slight delay to let state update, then re-fetch if destination is set
        if (destination) {
            // We need to pass the new mode explicitly because closure capture might see old state
            fetchSafeRoutes(mode);
        }
    };

    // Wrapper to use current state
    const startNavigation = () => {
        fetchSafeRoutes(transportMode);
    };

    const fetchSafeRoutes = async (mode) => {
        if (!destination || !location) return;

        setLoadingRoute(true);
        setAllRoutes([]); // Clear previous
        try {
            // Determine day/night
            const hour = new Date().getHours();
            const timeOfDay = (hour >= 18 || hour < 6) ? 'night' : 'day';

            const payload = {
                origin: `${location.coords.latitude},${location.coords.longitude}`,
                destination: `${destination.lat},${destination.lng}`,
                travel_mode: mode, // Use the passed mode
                time_of_day: timeOfDay,
                crowd_density: "medium"
            };

            const targetUrl = `${API_URL}/safe-route`;
            console.log('Sending Request To:', targetUrl, JSON.stringify(payload));

            // Increased timeout to 30s because calculation is heavy
            const response = await axios.post(targetUrl, payload, { timeout: 30000 });

            if (response.data && response.data.length > 0) {
                setAllRoutes(response.data);
                const bestRoute = response.data[0];

                // Set Routes for legacy polyline support if needed, but we use map loop now
                const coords = bestRoute.geometry.map(c => ({
                    latitude: c[0],
                    longitude: c[1]
                }));
                setRoutes(coords);
            } else {
                Alert.alert('No Routes', 'No safe routes found to this destination.');
            }

        } catch (error) {
            console.error("--- ROUTE FETCH ERROR ---", error.message);
            Alert.alert("Route Error", "Could not fetch safe routes. Check backend.");
        } finally {
            setLoadingRoute(false);
        }
    };

    const openGoogleMaps = () => {
        if (!destination) return;
        const modeMap = { driving: 'd', cycling: 'b', walking: 'w' };
        // Deep link to Google Maps Navigation
        const url = `google.navigation:q=${destination.lat},${destination.lng}&mode=${modeMap[transportMode]}`;

        Linking.canOpenURL(url).then(supported => {
            if (supported) {
                Linking.openURL(url);
            } else {
                Alert.alert('Error', 'Google Maps is not installed on this device.');
            }
        });
    };

    const handleSOS = async () => {
        try {
            const phone = await SecureStore.getItemAsync('user_phone');
            const currentLocation = await Location.getCurrentPositionAsync({});

            await axios.post(`${API_URL}/api/sos`, {
                phone: phone || 'Unknown',
                lat: currentLocation.coords.latitude,
                lng: currentLocation.coords.longitude
            });
            Alert.alert('SOS SENT', 'Emergency contacts notified!');
        } catch (e) {
            Alert.alert('SOS FAILED', 'Check connection.');
        }
    };

    // Icons Map
    const ICONS = {
        driving: 'car-sport',
        cycling: 'bicycle',
        walking: 'walk'
    };

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                    latitude: 37.78825,
                    longitude: -122.4324,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                }}
                showsUserLocation={true}
            >
                {/* Risk Zones - Visualized from DB */}
                {riskZones.map((zone, index) => (
                    <Circle
                        key={`zone-${index}`}
                        center={{ latitude: zone.lat, longitude: zone.lng }}
                        radius={(zone.radius || 1) * 1000}
                        fillColor="rgba(217, 48, 37, 0.2)"
                        strokeColor="rgba(217, 48, 37, 0.5)"
                        strokeWidth={1}
                    />
                ))}

                {destination && (
                    <Marker coordinate={{ latitude: destination.lat, longitude: destination.lng }} title={destination.name} />
                )}

                {/* Route Lines - Multi-Route Visualization */}
                {allRoutes.map((route, index) => {
                    const points = route.geometry.map(c => ({ latitude: c[0], longitude: c[1] }));
                    const isSelected = index === selectedRouteIndex;

                    // 1. Determine Base Color (Risk Based)
                    let riskColor = GOOGLE_BLUE; // Default 'Fast'
                    if (route.risk_level === 'HIGH') riskColor = SOS_RED;
                    if (route.risk_level === 'SAFE') riskColor = SAFETY_GREEN;

                    // 2. Selection Logic (Grey out unselected)
                    const displayColor = isSelected ? riskColor : '#9AA0A6'; // Google Maps inactive grey
                    const strokeWidth = isSelected ? 6 : 4;
                    const zIndex = isSelected ? 100 : 1; // Bring selected to front

                    return (
                        <Polyline
                            key={route.route_id || index}
                            coordinates={points}
                            strokeColor={displayColor}
                            strokeWidth={strokeWidth}
                            zIndex={zIndex}
                            tappable={true}
                            onPress={() => setSelectedRouteIndex(index)}
                        />
                    );
                })}
            </MapView>

            {/* Search & Mode Container */}
            <View style={styles.topContainer}>
                {/* Search Box */}
                <View style={styles.searchBar}>
                    <TouchableOpacity onPress={onLogout} style={styles.menuButton}>
                        <Ionicons name="menu" size={24} color="#555" />
                    </TouchableOpacity>

                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search SafeRoute..."
                        value={searchQuery}
                        onChangeText={handleSearch}
                    />
                    <View style={styles.avatar}><Text style={styles.avatarText}>U</Text></View>
                </View>

                {/* Mode Selector - Visible when not searching text */}
                {!isSearching && (
                    <View style={styles.modeContainer}>
                        {['driving', 'cycling', 'walking'].map(mode => (
                            <TouchableOpacity
                                key={mode}
                                style={[styles.modeButton, transportMode === mode && styles.modeSelected]}
                                onPress={() => handleModeSelect(mode)}
                            >
                                <Ionicons name={ICONS[mode]} size={20} color={transportMode === mode ? 'white' : '#5F6368'} />
                                <Text style={[styles.modeText, transportMode === mode && { color: 'white' }]}>
                                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Search Results */}
                {isSearching && searchResults.length > 0 && (
                    <View style={styles.resultsList}>
                        <FlatList
                            data={searchResults}
                            keyExtractor={(item, index) => index.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.resultItem} onPress={() => selectDestination(item)}>
                                    <Ionicons name="location-outline" size={20} color="#666" style={{ marginRight: 10 }} />
                                    <Text style={styles.resultText}>{item.name}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                )}
            </View>

            {/* SOS Button */}
            {!destination && (
                <View style={styles.fabContainer}>
                    <TouchableOpacity style={[styles.fab, styles.sosFab]} onPress={handleSOS}>
                        <Text style={styles.sosText}>SOS</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Bottom Sheet */}
            {destination && (
                <View style={styles.bottomSheet}>
                    <Text style={styles.sheetTitle}>{destination.name}</Text>

                    <FlatList
                        data={allRoutes}
                        keyExtractor={(item, index) => index.toString()}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        renderItem={({ item, index }) => (
                            <TouchableOpacity
                                style={[styles.routeCard, selectedRouteIndex === index && styles.selectedCard]}
                                onPress={() => setSelectedRouteIndex(index)}
                            >
                                <View style={styles.cardHeader}>
                                    <Text style={[styles.timeText, { color: item.risk_level === 'SAFE' ? SAFETY_GREEN : '#D93025' }]}>
                                        {item.duration_text}
                                    </Text>
                                    {item.risk_level === 'SAFE' && (
                                        <View style={styles.badge}>
                                            <Text style={styles.badgeText}>✔ SAFE MATCH</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.detailsText}>
                                    {item.distance_text} • Risk Score: {Math.round(item.risk_score)}
                                </Text>
                                <View style={styles.tagRow}>
                                    {item.tags && item.tags.map((tag, i) => (
                                        <Text key={i} style={styles.tagText}>{tag}</Text>
                                    ))}
                                </View>

                                {selectedRouteIndex === index && (
                                    <View style={styles.actionRow}>
                                        <TouchableOpacity style={styles.goButton} onPress={openGoogleMaps}>
                                            <Ionicons name="navigate" size={18} color="white" style={{ marginRight: 5 }} />
                                            <Text style={styles.goButtonText}>Start Navigation</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            !loadingRoute ? (
                                <TouchableOpacity style={styles.findButton} onPress={startNavigation}>
                                    <Text style={styles.findButtonText}>Find Safe Routes</Text>
                                </TouchableOpacity>
                            ) : <ActivityIndicator size="large" color={GOOGLE_BLUE} style={{ marginTop: 20 }} />
                        }
                    />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    map: { width: '100%', height: '100%' },

    topContainer: {
        position: 'absolute',
        top: 50,
        width: '100%',
        paddingHorizontal: 16,
        zIndex: 10,
        alignItems: 'center'
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        height: 50,
        borderRadius: 25,
        paddingHorizontal: 15,
        width: '100%',
        elevation: 5,
        shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5
    },
    searchInput: { flex: 1, fontSize: 16, marginLeft: 10 },
    menuButton: { padding: 5 },
    avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#8AB4F8', justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: 'white', fontWeight: 'bold' },

    // Results
    resultsList: {
        marginTop: 10,
        width: '100%',
        backgroundColor: 'white',
        borderRadius: 10,
        elevation: 5,
        maxHeight: 200,
    },
    resultItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        flexDirection: 'row',
        alignItems: 'center'
    },
    resultText: { fontSize: 16 },

    // Mode Selector
    modeContainer: {
        flexDirection: 'row',
        marginTop: 12,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 5,
        elevation: 4,
        shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3
    },
    modeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 16,
    },
    modeSelected: {
        backgroundColor: GOOGLE_BLUE,
    },
    modeText: {
        marginLeft: 6,
        fontSize: 14,
        fontWeight: 'bold',
        color: '#5F6368'
    },

    // FAB
    fabContainer: {
        position: 'absolute',
        bottom: 200,
        right: 20,
    },
    fab: {
        width: 60, height: 60, borderRadius: 30,
        justifyContent: 'center', alignItems: 'center',
        elevation: 5, backgroundColor: 'white'
    },
    sosFab: { backgroundColor: SOS_RED },
    sosText: { color: 'white', fontWeight: 'bold' },

    // Bottom Sheet
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        height: '45%',
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        elevation: 20,
        shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10,
    },
    sheetTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, color: '#202124' },

    routeCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        elevation: 2
    },
    selectedCard: {
        borderColor: GOOGLE_BLUE,
        borderWidth: 2,
        backgroundColor: '#F8F9FA'
    },
    cardHeader: {
        flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8
    },
    timeText: { fontSize: 22, fontWeight: 'bold' },
    badge: {
        backgroundColor: SAFETY_GREEN,
        borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4
    },
    badgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
    detailsText: { fontSize: 14, color: '#5F6368', marginBottom: 8 },
    tagRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    tagText: { color: GOOGLE_BLUE, fontSize: 12, fontWeight: '600' },

    findButton: {
        backgroundColor: GOOGLE_BLUE, height: 50, borderRadius: 25,
        justifyContent: 'center', alignItems: 'center', elevation: 5
    },
    findButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },

    actionRow: { marginTop: 8 },
    goButton: {
        backgroundColor: GOOGLE_BLUE, height: 45, borderRadius: 25,
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        elevation: 2
    },
    goButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
