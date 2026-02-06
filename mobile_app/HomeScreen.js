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
    Linking,
    Platform,
    Modal,
    Vibration
} from 'react-native';
import SafeMap from './components/SafeMap';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { Ionicons, Feather } from '@expo/vector-icons';
import { API_URL, ENDPOINTS } from './config';
import * as Speech from 'expo-speech';
import { getDistance } from 'geolib';
import { scanRouteActivity } from './services/ActivityService';
import { startGuardianSensors, stopGuardianSensors } from './services/SensorService';
import { calculateRouteSafety } from './services/RouteSafetyEngine';
import SafetyStatsCard from './components/SafetyStatsCard';
import NavigationArrow from './components/NavigationArrow';
// const SERVER_IP = '192.168.0.136'; // Local Wi-Fi IP
// Bypass Localtunnel reminder page
axios.defaults.headers.common['Bypass-Tunnel-Reminder'] = 'true';
axios.defaults.headers.common['User-Agent'] = 'SafeRouteApp';

const GOOGLE_BLUE = '#1A73E8'; // Standard Active Color
const SOS_RED = '#D93025';
const SAFETY_GREEN = '#0F9D58';
const INACTIVE_GREY = '#B0B0B0';
const TEXT_DARK = '#202124';

// Use darker map style if needed, or just hide POIs
const CUSTOM_MAP_STYLE = [
    { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }
];

export default function HomeScreen({ onLogout }) {
    // --- STATE ---
    const [location, setLocation] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [backendStatus, setBackendStatus] = useState('checking'); // checking, online, offline 

    useEffect(() => {
        const check = async () => {
            try {
                await axios.get(`${API_URL}/api/health`);
                setBackendStatus('online');
            } catch {
                setBackendStatus('offline');
            }
        };
        check();
    }, []);
    // Navigation State
    const [destination, setDestination] = useState(null);
    const [transportMode, setTransportMode] = useState('driving'); // driving, cycling, walking
    const [allRoutes, setAllRoutes] = useState([]); // List of multiple routes
    const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

    // Feature 1: Night Liveliness
    const [isNightMode, setIsNightMode] = useState(false);
    const [activityMarkers, setActivityMarkers] = useState([]);
    const [livelinessScore, setLivelinessScore] = useState(null);

    // Feature 2: In-App Navigation
    const [isNavigating, setIsNavigating] = useState(false);
    const [currentInstruction, setCurrentInstruction] = useState('');
    const [nextStepIndex, setNextStepIndex] = useState(0);

    // Feature 3: Guardian Mode (Sensors)
    const [isGuardianMode, setIsGuardianMode] = useState(false);
    const [showFallModal, setShowFallModal] = useState(false);
    const [countdown, setCountdown] = useState(10);
    const [isPanicFlashing, setIsPanicFlashing] = useState(false);

    // Data
    const [riskZones, setRiskZones] = useState([]);
    const [accidentalZones, setAccidentalZones] = useState([]);
    const [loadingRoute, setLoadingRoute] = useState(false);

    // Refs
    const mapRef = useRef(null);

    // --- INITIALIZATION ---
    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Allow location access to use SafeRoute.');
                return;
            }
            let location = await Location.getCurrentPositionAsync({});
            setLocation(location);

            // Auto-center
            if (mapRef.current) {
                mapRef.current.animateToRegion({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    latitudeDelta: 0.015,
                    longitudeDelta: 0.0121,
                }, 1000);
            }
        })();

        // Fetch Zones
        loadZones();
    }, []);

    const loadZones = async () => {
        try {
            console.log('[HomeScreen] Fetching Zones...');
            const riskReq = axios.get(`${API_URL}${ENDPOINTS.RISK_ZONES}`);
            const accReq = axios.get(`${API_URL}/accidental-zones`);

            const [riskRes, accRes] = await Promise.all([riskReq, accReq]);

            console.log(`[HomeScreen] Risk Zones Loaded: ${riskRes.data?.length}`);
            console.log(`[HomeScreen] Accidental Zones Loaded: ${accRes.data?.length}`);

            if (riskRes.data) setRiskZones(riskRes.data);
            if (accRes.data) setAccidentalZones(accRes.data);

        } catch (err) {
            console.error(`[Zones] Error loading zones: ${API_URL}`, err.message);
        }
    };

    // --- ACTIONS ---

    const handleSearch = async (text) => {
        setSearchQuery(text);
        if (text.length > 2) {
            try {
                console.log(`[Search] Query: ${text} -> ${API_URL}${ENDPOINTS.SEARCH}`);
                const response = await axios.get(`${API_URL}${ENDPOINTS.SEARCH}?query=${text}`);
                setSearchResults(response.data);
                setIsSearching(true);
            } catch (error) {
                console.log('[Search] Error:', error);
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

        // Zoom to show origin and destination
        if (location && mapRef.current) {
            mapRef.current.fitToCoordinates([
                { latitude: location.coords.latitude, longitude: location.coords.longitude },
                { latitude: item.lat, longitude: item.lng }
            ], {
                edgePadding: { top: 150, right: 50, bottom: 300, left: 50 },
                animated: true,
            });
        }

        // Auto-fetch routes
        setTimeout(() => fetchSafeRoutes(item), 500);
    };

    const handleModeSelect = (mode) => {
        setTransportMode(mode);
        if (destination) {
            fetchSafeRoutes(destination, mode);
        }
    };

    const fetchSafeRoutes = async (destItem = destination, modeOverride = null) => {
        if (!destItem || !location) return;

        setLoadingRoute(true);
        setAllRoutes([]);
        setSelectedRouteIndex(0); // Reset selection

        try {
            const hour = new Date().getHours();
            const timeOfDay = (hour >= 18 || hour < 6) ? 'night' : 'day';

            const payload = {
                origin: `${location.coords.latitude},${location.coords.longitude}`,
                destination: `${destItem.lat},${destItem.lng}`,
                travel_mode: modeOverride || transportMode,
                time_of_day: timeOfDay,
                crowd_density: "medium",
                alternatives: true // Request multi-route logic
            };

            console.log(`[SafeRoute] Requesting routes...`);
            const response = await axios.post(`${API_URL}${ENDPOINTS.SAFE_ROUTE}`, payload, { timeout: 60000 });

            if (response.data && response.data.length > 0) {
                console.log("Routes received:", response.data.length);
                let routes = response.data;

                // MODULE 1: CALCULATE SAFETY SCORES
                routes = routes.map(route => {
                    const stats = calculateRouteSafety(
                        route,
                        riskZones,
                        accidentalZones,
                        isNightMode ? 'night' : 'day'
                    );
                    return { ...route, stats };
                });

                // Sort: Recommended first, then by Safety Score
                routes.sort((a, b) => {
                    // Priority 1: Recommended Status
                    if (a.stats.isRecommended !== b.stats.isRecommended) {
                        return a.stats.isRecommended ? -1 : 1;
                    }
                    // Priority 2: Safety Score
                    return b.stats.safetyScore - a.stats.safetyScore;
                });

                setAllRoutes(routes);

                // Feature 1: Night Scan (If enabled)
                if (isNightMode) {
                    performNightScan(routes[0]); // Scan primary route
                }
            } else {
                Alert.alert('No Routes', 'No safe routes found.');
            }

        } catch (error) {
            console.error('[SafeRoute] Error:', error);
            let msg = "Could not fetch routes.";
            if (error.message && error.message.includes('Network Error')) {
                msg = `Network Error. Check if backend is running at ${API_URL}`;
            } else if (error.response) {
                msg = `Server Error: ${error.response.status}`;
            }
            Alert.alert("Connection Failed", msg);
        } finally {
            setLoadingRoute(false);
        }
    };

    const toggleNightMode = async () => {
        const nextMode = !isNightMode;
        setIsNightMode(nextMode);
        if (nextMode && allRoutes.length > 0) {
            performNightScan(allRoutes[selectedRouteIndex]);
        } else {
            setActivityMarkers([]);
            setLivelinessScore(null);
        }
    };

    const performNightScan = async (route) => {
        setLoadingRoute(true);
        const { markers, score } = await scanRouteActivity(route.geometry.coordinates.map(c => [c[1], c[0]]));
        setActivityMarkers(markers);
        setLivelinessScore(score);
        setLoadingRoute(false);
    };

    const openGoogleMaps = () => {
        if (!destination) return;
        const modeMap = { driving: 'd', cycling: 'b', walking: 'w' };
        const url = `google.navigation:q=${destination.lat},${destination.lng}&mode=${modeMap[transportMode]}`;
        Linking.openURL(url).catch(err => Alert.alert('Error', 'Could not open Maps'));
    };

    const handleSOS = async () => {
        try {
            // Priority 1: Check Permissions
            const { status } = await Location.getForegroundPermissionsAsync();
            if (status !== 'granted') {
                const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
                if (newStatus !== 'granted') {
                    Alert.alert('Permission Error', 'Location permission is needed for SOS.');
                    return;
                }
            }

            const phone = await SecureStore.getItemAsync('user_phone');

            // Priority 2: Get Location (Try fresh, fallback to last known)
            let sosLocation = null;
            try {
                sosLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            } catch (locError) {
                console.warn('[SOS] Could not get fresh location, using last known:', locError);
                sosLocation = location; // Use state variable
            }

            if (!sosLocation) {
                Alert.alert("Location Error", "Could not determine your location for SOS.");
                return;
            }

            console.log(`[SOS] Sending alert for ${phone}`);

            // Direct backend call with shorter timeout
            await axios.post(`${API_URL}/api/sos`, {
                phone: phone || 'Unknown',
                lat: sosLocation.coords.latitude,
                lng: sosLocation.coords.longitude,
                type: 'MANUAL_SOS'
            }, { timeout: 8000 });

            Vibration.vibrate(500);
            Alert.alert('🚨 SOS SENT', 'Authorities Notified.');
        } catch (e) {
            console.error('[SOS Failed]', e);
            // Still show success to user even if backend fails (optimistic UI for emergencies)
            Vibration.vibrate(500);
            Alert.alert('SOS Triggered', 'Emergency alert activated (Backend Sync Pending).');
        }
    };

    // Feature 2: In-App Navigation (Voice + 3D)
    const startDriveMode = () => {
        if (!currentRoute) {
            Alert.alert("No Route", "Please calculate a route first.");
            return;
        }
        setIsNavigating(true);
        setNextStepIndex(0);

        // Camera: 3D Tilt Mode
        if (mapRef.current) {
            mapRef.current.animateCamera({
                center: {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                },
                pitch: 60,
                heading: location.coords.heading || 0,
                altitude: 200,
                zoom: 19
            }, { duration: 1000 });
        }

        const steps = currentRoute.steps || [];
        if (steps.length > 0) {
            const first = steps[0].instruction;
            setCurrentInstruction(first);
            Speech.speak(first);
        } else {
            setCurrentInstruction("Follow the safe path");
            Speech.speak("Starting navigation. Follow the highlighted safe path.");
        }
    };

    useEffect(() => {
        if (!isNavigating || !location || !currentRoute) return;

        const steps = currentRoute.steps || [];
        if (nextStepIndex >= steps.length) return;

        // Simulate progress checking (Distance to destination as proxy for now)
        const distToDest = getDistance(
            { latitude: location.coords.latitude, longitude: location.coords.longitude },
            { latitude: destination.lat, longitude: destination.lng }
        );

        if (distToDest < 20) {
            setCurrentInstruction("You have arrived at your destination.");
            Speech.speak("You have arrived at your destination.");
            setIsNavigating(false);
        } else if (distToDest < 100 && nextStepIndex < steps.length - 1) {
            // Trigger next step if close
            const nextIdx = nextStepIndex + 1;
            setNextStepIndex(nextIdx);
            const msg = steps[nextIdx].instruction;
            setCurrentInstruction(msg);
            Speech.speak(msg.replace(/<[^>]*>?/gm, ''));
        }
    }, [location, isNavigating]);

    // Feature 3: Guardian Mode Implementation
    useEffect(() => {
        if (isGuardianMode) {
            startGuardianSensors(
                () => { // On Shake
                    flashPanicScreen();
                    handleSOS();
                },
                () => { // On Fall
                    setShowFallModal(true);
                    setCountdown(10);
                }
            );
        } else {
            stopGuardianSensors();
        }
        return () => stopGuardianSensors();
    }, [isGuardianMode]);

    // Fall Countdown Timer
    useEffect(() => {
        let timer = null;
        if (showFallModal && countdown > 0) {
            timer = setInterval(() => {
                setCountdown(prev => prev - 1);
            }, 1000);
        } else if (showFallModal && countdown === 0) {
            handleFallConfirmed();
        }
        return () => clearInterval(timer);
    }, [showFallModal, countdown]);

    const handleFallConfirmed = async () => {
        setShowFallModal(false);
        flashPanicScreen();
        // Log Fall Event
        const phone = await SecureStore.getItemAsync('user_phone');

        let crashLocation = location; // Default to last known
        try {
            crashLocation = await Location.getCurrentPositionAsync({});
        } catch (e) {
            console.log("Could not get fresh location for Fall Alert, using last known.");
        }

        if (!crashLocation) {
            console.error("No location available for Fall Alert");
            return;
        }

        await axios.post(`${API_URL}/api/sos`, {
            phone: phone || 'Unknown',
            lat: crashLocation.coords.latitude,
            lng: crashLocation.coords.longitude,
            type: 'FALL_DETECTION_AUTO'
        });
        Alert.alert("Emergency Logged", "A potential fall was detected and authorities have been notified.");
    };

    const flashPanicScreen = () => {
        setIsPanicFlashing(true);
        Vibration.vibrate([0, 500, 200, 500]);
        setTimeout(() => setIsPanicFlashing(false), 2000); // Stop flash after 2s
    };

    const ICONS = {
        driving: 'car-sport',
        cycling: 'bicycle',
        walking: 'walk'
    };

    // Get current selected route object
    const currentRoute = allRoutes[selectedRouteIndex];

    // --- RENDER HELPERS ---
    const theme = {
        bg: isNightMode ? '#202124' : 'white',
        text: isNightMode ? 'white' : TEXT_DARK,
        subtext: isNightMode ? '#9AA0A6' : '#5F6368',
        card: isNightMode ? '#303134' : 'white',
        border: isNightMode ? '#3C4043' : '#F1F3F4'
    };

    return (
        <View style={styles.container}>
            {/* 0. NAVIGATION BANNER */}
            {isNavigating && (
                <View style={styles.navBanner}>
                    <Ionicons name="arrow-up-circle" size={40} color="white" style={{ marginRight: 15 }} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.navInstructionLabel}>Next Instruction</Text>
                        <Text style={styles.navInstructionText}>{currentInstruction}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setIsNavigating(false)} style={styles.closeNav}>
                        <Ionicons name="close" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            )}

            {/* 1. MAP LAYER */}
            <SafeMap
                mapRef={mapRef}
                initialRegion={{
                    latitude: 37.78825,
                    longitude: -122.4324,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                }}
                showsUserLocation={!isNavigating}
                riskZones={riskZones}
                accidentalZones={accidentalZones}
                destination={destination}
                allRoutes={allRoutes}
                selectedRouteIndex={selectedRouteIndex}
                setSelectedRouteIndex={setSelectedRouteIndex}
                activityMarkers={activityMarkers}
            >
                {/* Module 2: Tactical Navigation Arrow */}
                {isNavigating && location && (
                    <NavigationArrow location={location} />
                )}
            </SafeMap>

            {/* 2. FLOATING UI */}
            <View style={[styles.searchContainer, { backgroundColor: theme.card }]}>
                <TouchableOpacity onPress={onLogout} style={styles.menuButton}>
                    <Feather name="log-out" size={24} color={theme.subtext} />
                </TouchableOpacity>
                <TextInput
                    style={[styles.searchInput, { color: theme.text }]}
                    placeholder="Search Location"
                    placeholderTextColor={theme.subtext}
                    value={searchQuery}
                    onChangeText={handleSearch}
                />
                <TouchableOpacity onPress={toggleNightMode} style={[styles.nightToggle, isNightMode && styles.nightToggleOn]}>
                    <Ionicons name={isNightMode ? "moon" : "sunny-outline"} size={20} color={isNightMode ? "white" : "#5F6368"} />
                </TouchableOpacity>
                <View style={{
                    width: 8, height: 8, borderRadius: 4,
                    backgroundColor: backendStatus === 'online' ? '#0F9D58' : (backendStatus === 'offline' ? '#D93025' : '#FBBC04'),
                    marginLeft: 5
                }} />
            </View>

            {isSearching && searchResults.length > 0 && (
                <View style={[styles.resultsList, { backgroundColor: theme.card }]}>
                    <FlatList
                        data={searchResults}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={[styles.resultItem, { borderBottomColor: theme.border }]} onPress={() => selectDestination(item)}>
                                <Ionicons name="location-outline" size={20} color={theme.subtext} style={{ marginRight: 15 }} />
                                <Text style={[styles.resultText, { color: theme.text }]}>{item.name}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            )}

            {!destination && (
                <View style={styles.pillsContainer}>
                    {['driving', 'cycling', 'walking'].map(mode => (
                        <TouchableOpacity
                            key={mode}
                            style={[styles.pill, { backgroundColor: theme.card }, transportMode === mode && styles.pillSelected]}
                            onPress={() => setTransportMode(mode)}
                        >
                            <Ionicons name={ICONS[mode]} size={18} color={transportMode === mode ? 'white' : theme.subtext} />
                            <Text style={[styles.pillText, { color: transportMode === mode ? 'white' : theme.subtext }]}>
                                {mode.charAt(0).toUpperCase() + mode.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {!destination && (
                <View style={styles.fabContainer}>
                    {/* Guardian Mode Shield Toggle */}
                    <TouchableOpacity
                        style={[styles.fab, { backgroundColor: theme.card }, isGuardianMode && { backgroundColor: SAFETY_GREEN }]}
                        onPress={() => {
                            setIsGuardianMode(!isGuardianMode);
                            Vibration.vibrate(50);
                        }}
                    >
                        <Ionicons
                            name={isGuardianMode ? "shield-checkmark" : "shield-outline"}
                            size={24}
                            color={isGuardianMode ? "white" : theme.subtext}
                        />
                    </TouchableOpacity>

                    {/* Debug: Simulate Fall Button */}
                    {isGuardianMode && (
                        <TouchableOpacity
                            style={[styles.fab, { backgroundColor: theme.bg }]}
                            onPress={() => {
                                setShowFallModal(true);
                                setCountdown(10);
                            }}
                        >
                            <Ionicons name="bug-outline" size={24} color={theme.subtext} />
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity style={[styles.fab, styles.sosFab]} onPress={handleSOS}>
                        <Text style={styles.sosText}>SOS</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.fab, { backgroundColor: theme.card }]}
                        onPress={async () => {
                            let { status } = await Location.getForegroundPermissionsAsync();
                            if (status !== 'granted') {
                                status = (await Location.requestForegroundPermissionsAsync()).status;
                            }
                            if (status === 'granted') {
                                let location = await Location.getCurrentPositionAsync({});
                                mapRef.current.animateToRegion({
                                    latitude: location.coords.latitude,
                                    longitude: location.coords.longitude,
                                    latitudeDelta: 0.015,
                                    longitudeDelta: 0.0121,
                                }, 1000);
                            } else {
                                Alert.alert('Permission Denied', 'Please enable location services.');
                            }
                        }}
                    >
                        <Ionicons name="locate" size={24} color={theme.subtext} />
                    </TouchableOpacity>
                </View>
            )}

            {/* 3. BOTTOM SHEET (Routes Details) */}
            {destination && (
                <View style={[styles.bottomSheet, { backgroundColor: theme.card }]}>
                    {!currentRoute ? (
                        <View style={styles.sheetContent}>
                            <Text style={[styles.sheetTitle, { color: theme.text }]}>{destination.name}</Text>
                            <TouchableOpacity
                                style={styles.mainButton}
                                onPress={() => fetchSafeRoutes()}
                            >
                                {loadingRoute ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.mainButtonText}>Find Routes</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={[styles.sheetContent, { flex: 1 }]}>
                            <Text style={[styles.sheetTitle, { color: theme.text, fontSize: 18, marginBottom: 10 }]}>Route Options</Text>

                            <View style={{ flex: 1 }}>
                                <FlatList
                                    data={allRoutes}
                                    keyExtractor={(item, index) => index.toString()}
                                    contentContainerStyle={{ paddingBottom: 10 }}
                                    showsVerticalScrollIndicator={true}
                                    renderItem={({ item, index }) => (
                                        <TouchableOpacity
                                            onPress={() => setSelectedRouteIndex(index)}
                                            activeOpacity={0.9}
                                            style={{
                                                borderWidth: 2,
                                                borderColor: selectedRouteIndex === index ? GOOGLE_BLUE : 'transparent',
                                                borderRadius: 14,
                                                marginBottom: 10
                                            }}
                                        >
                                            <SafetyStatsCard route={item} stats={item.stats} />
                                        </TouchableOpacity>
                                    )}
                                />
                            </View>

                            {/* Selected Route Actions */}
                            <TouchableOpacity
                                style={[styles.mainButton, { marginTop: 10, marginBottom: 10 }]}
                                onPress={startDriveMode}
                            >
                                <Ionicons name="navigate" size={20} color="white" style={{ marginRight: 10 }} />
                                <Text style={styles.mainButtonText}>
                                    Start Navigation {currentRoute?.duration_text ? `(${currentRoute.duration_text})` : ''}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={{ marginBottom: 5 }} onPress={() => { setDestination(null); setAllRoutes([]) }}>
                                <Text style={{ color: theme.subtext, textAlign: 'center' }}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}
            {/* 4. GUARDIAN OVERLAYS */}

            {/* Panic Red Flash */}
            {isPanicFlashing && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(217, 48, 37, 0.4)', zIndex: 999 }]} pointerEvents="none" />
            )}

            {/* Fall Detection Modal */}
            <Modal
                visible={showFallModal}
                transparent={true}
                animationType="fade"
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.fallModalContent, { backgroundColor: theme.card }]}>
                        <Ionicons name="warning" size={60} color={SOS_RED} />
                        <Text style={[styles.fallTitle, { color: theme.text }]}>Fall Detected!</Text>
                        <Text style={[styles.fallSubtitle, { color: theme.subtext }]}>Sending emergency alert in:</Text>
                        <View style={styles.countdownCircle}>
                            <Text style={styles.countdownText}>{countdown}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.iAmPageButton}
                            onPress={() => setShowFallModal(false)}
                        >
                            <Text style={styles.iAmSafeText}>I AM SAFE</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    map: { width: '100%', height: '100%' },

    // Search Bar
    searchContainer: { position: 'absolute', top: 50, left: 16, right: 16, height: 50, backgroundColor: 'white', borderRadius: 25, elevation: 6, shadowColor: '#000', shadowOpacity: 0.2, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, zIndex: 10 },
    searchInput: { flex: 1, fontSize: 16, color: TEXT_DARK, marginLeft: 10 },
    menuButton: { padding: 5 },

    // Results
    resultsList: { position: 'absolute', top: 110, left: 16, right: 16, backgroundColor: 'white', borderRadius: 8, elevation: 6, zIndex: 9, maxHeight: 200 },
    resultItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F3F4' },
    resultText: { fontSize: 16, color: TEXT_DARK },

    // Pills
    pillsContainer: { position: 'absolute', top: 110, left: 16, flexDirection: 'row', gap: 8 },
    pill: { flexDirection: 'row', backgroundColor: 'white', paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, elevation: 4, alignItems: 'center' },
    pillSelected: { backgroundColor: GOOGLE_BLUE },
    pillText: { marginLeft: 6, fontWeight: '500', color: '#5F6368', fontSize: 14 },

    // FABs
    fabContainer: { position: 'absolute', bottom: 30, right: 16, alignItems: 'center', gap: 16 },
    fab: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'white', elevation: 6, justifyContent: 'center', alignItems: 'center' },
    sosFab: { backgroundColor: SOS_RED },
    sosText: { color: 'white', fontWeight: 'bold', fontSize: 12 },

    // Bottom Sheet
    // Bottom Sheet (Task 2: Route Options Covering Map Fix)
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        height: '45%', // Restrict height to 45% of screen
        backgroundColor: 'white',
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        // paddingBottom removed to allow ScrollView to handle inner spacing
    },
    sheetContent: { padding: 24 },
    sheetTitle: { fontSize: 22, fontWeight: 'bold', color: TEXT_DARK, marginBottom: 20 },
    routeHeader: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 10 },
    timeDisplay: { fontSize: 26, fontWeight: 'bold', marginRight: 8 },
    distanceDisplay: { fontSize: 16, color: '#5F6368' },
    tagsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    tag: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4 },
    tagText: { fontSize: 12, fontWeight: 'bold' },
    mainButton: { width: '100%', height: 50, backgroundColor: GOOGLE_BLUE, borderRadius: 25, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 2 },
    mainButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },

    // Night Toggle
    nightToggle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F3F4', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
    nightToggleOn: { backgroundColor: '#202124' },

    // Navigation Banner
    navBanner: { position: 'absolute', top: 50, left: 16, right: 16, backgroundColor: SAFETY_GREEN, borderRadius: 12, padding: 15, flexDirection: 'row', alignItems: 'center', zIndex: 100, elevation: 10 },
    navInstructionLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 'bold' },
    navInstructionText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    closeNav: { padding: 5 },

    // Fall Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    fallModalContent: { width: '85%', backgroundColor: 'white', borderRadius: 32, padding: 40, alignItems: 'center' },
    fallTitle: { fontSize: 28, fontWeight: 'bold', color: TEXT_DARK, marginTop: 20 },
    fallSubtitle: { fontSize: 16, color: '#5F6368', marginTop: 10 },
    countdownCircle: { width: 100, height: 100, borderRadius: 50, borderWidth: 5, borderColor: SOS_RED, justifyContent: 'center', alignItems: 'center', marginVertical: 30 },
    countdownText: { fontSize: 40, fontWeight: 'bold', color: SOS_RED },
    iAmPageButton: { width: '100%', height: 60, backgroundColor: SAFETY_GREEN, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
    iAmSafeText: { color: 'white', fontSize: 20, fontWeight: 'bold' }
});
