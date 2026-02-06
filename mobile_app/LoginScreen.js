import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    LayoutAnimation,
    UIManager,
    ActivityIndicator,
    TouchableWithoutFeedback,
    Keyboard,
    Alert,
    ScrollView // <--- Task 1: Import ScrollView
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from './config';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
            return false; // Fail safe
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
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
                colors={['#0F2027', '#203A43', '#2C5364']}
                style={styles.background}
            >
                {/* Task 1: KeyboardAvoidingView with behavior */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.container}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
                >
                    {/* Task 1: ScrollView with specific contentContainerStyle */}
                    <ScrollView
                        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.innerContainer}>
                            {/* Header Slogan */}
                            <View style={styles.header}>
                                <Ionicons name="shield-checkmark" size={60} color="#FFC837" />
                                <Text style={styles.appName}>SafeRoute</Text>
                                <Text style={styles.tagline}>Navigate with Confidence</Text>
                            </View>

                            {/* Glassmorphism Card */}
                            <View style={styles.glassCard}>
                                <Text style={styles.welcomeText}>Welcome Back</Text>
                                <Text style={styles.instructionText}>Enter your details to continue</Text>

                                {/* Phone Input */}
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="call-outline" size={20} color="rgba(255,255,255,0.7)" style={{ marginRight: 10 }} />
                                    <Text style={styles.prefix}>+91</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Phone Number"
                                        placeholderTextColor="rgba(255,255,255,0.4)"
                                        keyboardType="phone-pad"
                                        maxLength={10}
                                        value={phone}
                                        onChangeText={setPhone}
                                    />
                                </View>

                                {/* OTP Input (Animated) */}
                                {showOtp && (
                                    <View style={[styles.inputWrapper, { marginTop: 20 }]}>
                                        <Ionicons name="key-outline" size={20} color="rgba(255,255,255,0.7)" style={{ marginRight: 10 }} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Enter OTP"
                                            placeholderTextColor="rgba(255,255,255,0.4)"
                                            keyboardType="number-pad"
                                            maxLength={6}
                                            value={otp}
                                            onChangeText={setOtp}
                                        />
                                    </View>
                                )}

                                {/* Action Button */}
                                <TouchableOpacity
                                    onPress={showOtp ? handleVerify : handleGetOtp}
                                    activeOpacity={0.8}
                                    style={styles.touchableButton}
                                >
                                    <LinearGradient
                                        colors={['#FF8008', '#FFC837']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.gradientButton}
                                    >
                                        {loading ? (
                                            <ActivityIndicator color="#0F2027" />
                                        ) : (
                                            <Text style={styles.buttonText}>
                                                {showOtp ? "VERIFY & LOGIN" : "GET OTP"}
                                            </Text>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>

                            </View>
                        </View>
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
        justifyContent: 'center',
    },
    container: {
        flex: 1,
    },
    innerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        width: '100%'
    },
    header: {
        alignItems: 'center',
        marginBottom: 40
    },
    appName: {
        fontSize: 36,
        fontWeight: 'bold',
        color: 'white',
        marginTop: 10,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4
    },
    tagline: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 5,
        letterSpacing: 1
    },
    glassCard: {
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        padding: 30,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10
    },
    welcomeText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: 'white',
        alignSelf: 'flex-start'
    },
    instructionText: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        alignSelf: 'flex-start',
        marginBottom: 30
    },
    inputWrapper: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.3)',
        paddingVertical: 10
    },
    prefix: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
        marginRight: 10
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: 'white'
    },
    touchableButton: {
        width: '100%',
        marginTop: 40,
        borderRadius: 30,
        shadowColor: '#FF8008',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 10
    },
    gradientButton: {
        width: '100%',
        height: 55,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center'
    },
    buttonText: {
        color: '#0F2027',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1
    }
});
