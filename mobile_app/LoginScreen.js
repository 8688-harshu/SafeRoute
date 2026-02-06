import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    TouchableWithoutFeedback,
    Keyboard,
    Alert,
    ScrollView,
    Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from './config';

const { width } = Dimensions.get('window');

export default function LoginScreen({ onLoginSuccess }) {
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [showOtp, setShowOtp] = useState(false);
    const [loading, setLoading] = useState(false);

    const checkCriminalRecord = async (phoneNumber) => {
        try {
            // Normalize: Ensure +91 prefix
            const normalized = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
            console.log(`[Security] Checking blacklist for: ${normalized}`);

            const response = await axios.get(`${API_URL}/api/check-blacklist?phone=${encodeURIComponent(normalized)}`, {
                headers: { 'bypass-tunnel-reminder': 'true' }
            });
            return response.data.blocked;
        } catch (error) {
            console.error('[Security Check Failed]', error);
            // Default to safe if offline, logic can be stricter for high-sec apps
            return false;
        }
    };

    const handleGetOtp = async () => {
        if (phone.length < 10) {
            Alert.alert("Invalid Input", "Please enter a valid phone number");
            return;
        }

        setLoading(true);
        // Step 1: Run the Check
        const isCriminal = await checkCriminalRecord(phone);
        setLoading(false);

        // Step 2: Decide
        if (isCriminal) {
            Alert.alert(
                "ACCESS DENIED",
                "Security Alert: This number is associated with a restricted profile. You cannot access SafeRoute.",
                [{ text: "OK" }]
            );
            return; // STOP HERE. Do not send OTP.
        }

        // Step 3: Proceed if Clean
        setShowOtp(true);
    };

    const handleVerify = () => {
        if (otp.length < 4) {
            Alert.alert("Invalid OTP", "Please enter the OTP.");
            return;
        }
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setLoading(false);
            console.log("Login Successful for:", phone);
            onLoginSuccess(phone);
        }, 500);
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <LinearGradient
                colors={['#0f0c29', '#302b63', '#24243e']} // Cyberpunk Midnight Gradient
                style={styles.background}
            >
                {/* Decorative Circles */}
                <View style={[styles.circle, styles.circle1]} />
                <View style={[styles.circle, styles.circle2]} />

                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.container}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Header Content */}
                        <View style={styles.header}>
                            <Ionicons name="finger-print-outline" size={64} color="#00f2ff" style={{ opacity: 0.9 }} />
                            <Text style={styles.appName}>SafeRoute</Text>
                            <Text style={styles.tagline}>SECURE ACCESS PORTAL</Text>
                        </View>

                        {/* Glass Card (Static View instead of Animated.View) */}
                        <View style={styles.glassCard}>
                            <Text style={styles.welcomeText}>Identity Verification</Text>
                            <Text style={styles.instructionText}>Authenticate to continue</Text>

                            {/* Phone Input */}
                            <View style={styles.inputContainer}>
                                <Ionicons name="smartphone-outline" size={20} color="#00f2ff" style={styles.inputIcon} />
                                <Text style={styles.prefix}>+91</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Mobile Number"
                                    placeholderTextColor="rgba(255,255,255,0.4)"
                                    keyboardType="phone-pad"
                                    maxLength={10}
                                    value={phone}
                                    onChangeText={setPhone}
                                    editable={!showOtp}
                                />
                            </View>

                            {/* OTP Input (Conditional) */}
                            {showOtp && (
                                <View style={[styles.inputContainer, { marginTop: 25 }]}>
                                    <Ionicons name="lock-closed-outline" size={20} color="#00f2ff" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter OTP Code"
                                        placeholderTextColor="rgba(255,255,255,0.4)"
                                        keyboardType="number-pad"
                                        maxLength={6}
                                        value={otp}
                                        onChangeText={setOtp}
                                    />
                                </View>
                            )}

                            {/* Hero Button */}
                            <TouchableOpacity
                                onPress={showOtp ? handleVerify : handleGetOtp}
                                activeOpacity={0.8}
                                style={styles.buttonWrapper}
                            >
                                <LinearGradient
                                    colors={['#ff416c', '#ff4b2b']} // Sunset Orange Gradient
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.heroButton}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <Text style={styles.buttonText}>
                                            {showOtp ? "SECURE LOGIN" : "REQUEST OTP"}
                                        </Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                        </View>

                        <Text style={styles.footerText}>Protected by SafeRoute Security Systems v2.1</Text>

                    </ScrollView>
                </KeyboardAvoidingView>
                <StatusBar style="light" />
            </LinearGradient>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
        width: '100%',
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40
    },
    // Decorative Circles
    circle: {
        position: 'absolute',
        borderRadius: 200,
        backgroundColor: '#00f2ff',
        opacity: 0.08,
    },
    circle1: {
        width: 300,
        height: 300,
        top: -50,
        left: -80,
    },
    circle2: {
        width: 200,
        height: 200,
        bottom: 100,
        right: -40,
        backgroundColor: '#ff416c',
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    appName: {
        fontSize: 42,
        fontWeight: 'bold',
        color: 'white',
        letterSpacing: 2,
        marginTop: 10,
        textShadowColor: '#00f2ff',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    tagline: {
        fontSize: 12,
        color: '#00f2ff',
        letterSpacing: 4,
        marginTop: 5,
        fontWeight: '600'
    },
    glassCard: {
        width: width * 0.85,
        backgroundColor: 'rgba(255, 255, 255, 0.08)', // Frosted Glass
        borderRadius: 25,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        padding: 30,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    welcomeText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
        alignSelf: 'flex-start',
        marginBottom: 5
    },
    instructionText: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.5)',
        alignSelf: 'flex-start',
        marginBottom: 30
    },
    inputContainer: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.2)',
        paddingVertical: 12,
    },
    inputIcon: {
        marginRight: 15,
    },
    prefix: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginRight: 10,
    },
    input: {
        flex: 1,
        color: 'white',
        fontSize: 16,
        letterSpacing: 1,
    },
    buttonWrapper: {
        width: '100%',
        marginTop: 40,
        borderRadius: 50,
        shadowColor: '#ff4b2b',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
    },
    heroButton: {
        width: '100%',
        height: 55,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    footerText: {
        marginTop: 40,
        color: 'rgba(255,255,255,0.3)',
        fontSize: 10,
        letterSpacing: 1,
    }
});
