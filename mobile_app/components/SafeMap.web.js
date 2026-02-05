import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Web Placeholder Map
export default function SafeMap(props) {
    return (
        <View style={styles.container}>
            <View style={styles.placeholder}>
                <Text style={styles.text}>Map View is not fully supported on Web Preview.</Text>
                <Text style={styles.subtext}>Please test on Android/iOS Emulator or Device.</Text>

                {/* Visualizing State for Debugging */}
                {props.destination && (
                    <Text style={styles.info}>Destination: {props.destination.name}</Text>
                )}
                {props.riskZones.length > 0 && (
                    <Text style={styles.info}>Risk Zones Loaded: {props.riskZones.length}</Text>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: '100%',
        backgroundColor: '#e0e0e0',
        justifyContent: 'center',
        alignItems: 'center'
    },
    placeholder: {
        padding: 20,
        backgroundColor: 'white',
        borderRadius: 10,
        alignItems: 'center',
        elevation: 5
    },
    text: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#555',
        marginBottom: 10
    },
    subtext: {
        color: '#777',
        marginBottom: 20
    },
    info: {
        color: '#1A73E8',
        marginTop: 5
    }
});
