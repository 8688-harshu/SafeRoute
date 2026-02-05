import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ImageBackground,
    KeyboardAvoidingView,
    Platform,
    LayoutAnimation,
    UIManager,
    ActivityIndicator
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import axios from 'axios';
import { API_URL } from './config';
import { Alert } from 'react-native';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const GOOGLE_BLUE = '#1A73E8';

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
            return false; // Fail safe (let user try to login if service is down)
        }
    };

    const handleGetOtp = async () => {
        if (phone.length < 10) {
            alert("Please enter a valid phone number");
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
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowOtp(true);
        // Simulate OTP send
    };

    const handleVerify = () => {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setLoading(false);
            console.log("Login Successful for:", phone);
            onLoginSuccess(phone);
        }, 500); // Faster transition
    };

    return (
        <ImageBackground
            source={require('./assets/bg.png')}
            style={styles.background}
            resizeMode="cover"
        >
            <View style={styles.overlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.container}
                >
                    <View style={styles.card}>
                        <Text style={styles.title}>Welcome back</Text>
                        <Text style={styles.subtitle}>Login to continue</Text>

                        {/* Phone Input */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.prefix}>🇮🇳 +91</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Phone Number"
                                keyboardType="phone-pad"
                                maxLength={10}
                                value={phone}
                                onChangeText={setPhone}
                            />
                        </View>

                        {/* OTP Input (Conditional) */}
                        {showOtp && (
                            <View style={[styles.inputContainer, { marginTop: 15 }]}>
                                <TextInput
                                    style={[styles.input, { textAlign: 'center' }]}
                                    placeholder="Enter OTP"
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    value={otp}
                                    onChangeText={setOtp}
                                />
                            </View>
                        )}

                        {/* Action Button */}
                        <TouchableOpacity
                            style={styles.button}
                            onPress={showOtp ? handleVerify : handleGetOtp}
                            activeOpacity={0.8}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.buttonText}>
                                    {showOtp ? "Verify & Login" : "Get OTP"}
                                </Text>
                            )}
                        </TouchableOpacity>

                    </View>
                </KeyboardAvoidingView>
            </View>
            <StatusBar style="dark" />
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
        width: '100%',
        height: '100%'
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.85)', // Light overlay
        justifyContent: 'center',
        padding: 20
    },
    container: {
        width: '100%',
        alignItems: 'center'
    },
    card: {
        width: '100%',
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 30,
        elevation: 10, // Android Shadow
        shadowColor: '#000', // iOS Shadow
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        alignItems: 'center'
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#202124',
        marginBottom: 5
    },
    subtitle: {
        fontSize: 16,
        color: '#5F6368',
        marginBottom: 30
    },
    inputContainer: {
        width: '100%',
        height: 55,
        backgroundColor: '#F1F3F4',
        borderRadius: 50, // Pill Shape
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20
    },
    prefix: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#202124',
        marginRight: 10
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#202124',
        height: '100%'
    },
    button: {
        width: '100%',
        height: 55,
        backgroundColor: GOOGLE_BLUE,
        borderRadius: 50, // Pill Shape
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 30,
        elevation: 4,
        shadowColor: GOOGLE_BLUE,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold'
    }
});
