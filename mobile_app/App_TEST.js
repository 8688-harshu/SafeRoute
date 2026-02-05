import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';

export default function App() {
    const testSOS = () => {
        Alert.alert('✅ APP WORKS', 'SafeRoute is running correctly!');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>SafeRoute</Text>
            <Text style={styles.subtitle}>Test Version</Text>

            <TouchableOpacity style={styles.button} onPress={testSOS}>
                <Text style={styles.buttonText}>TEST APP</Text>
            </TouchableOpacity>

            <Text style={styles.info}>If you see this, the app is working!</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1A73E8',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 18,
        color: '#666',
        marginBottom: 40,
    },
    button: {
        backgroundColor: '#D93025',
        paddingHorizontal: 40,
        paddingVertical: 15,
        borderRadius: 25,
        marginBottom: 20,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    info: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
    },
});
