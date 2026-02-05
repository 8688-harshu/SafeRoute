import React, { useState, useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Easing } from 'react-native';
import { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

const ARROW_ICON_URL = 'https://cdn-icons-png.flaticon.com/512/149/149059.png'; // Clean Nav Arrow

export default function NavigationArrow({ location }) {
    const [heading, setHeading] = useState(0);
    const rotationAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        let subscription;
        (async () => {
            // Check permissions again if needed, or assume parent handled it
            subscription = await Location.watchHeadingAsync((obj) => {
                const newHeading = obj.trueHeading || obj.magHeading;
                setHeading(newHeading);
            });
        })();

        return () => {
            if (subscription) subscription.remove();
        };
    }, []);

    useEffect(() => {
        // Smooth rotation animation
        Animated.timing(rotationAnim, {
            toValue: heading,
            duration: 500,
            useNativeDriver: true, // Use native driver for smoother animation
            easing: Easing.linear,
        }).start();
    }, [heading]);

    if (!location) return null;

    // Interpolate rotation for style
    const rotateStr = rotationAnim.interpolate({
        inputRange: [0, 360],
        outputRange: ['0deg', '360deg']
    });

    return (
        <Marker
            coordinate={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true} // Lays flat on the map
            rotation={heading} // MapView Marker rotation prop usually handles numerical degrees directly, but for smoothness we might want to animate the view inside.
        // However, native MapView Marker rotation is quite performant. 
        // If we use the `rotation` prop of Marker, it might be jittery if we don't smooth the value. 
        // But we can also animate the Image inside.
        // Let's rely on the Marker's `rotation` prop for true flat map rotation behavior, 
        // but update state smoothly if possible. 
        // Actually, for `flat={true}`, using the Marker's `rotation` prop is BEST as it aligns with the map plane.
        >
            <Image
                source={{ uri: ARROW_ICON_URL }}
                style={{ width: 40, height: 40, transform: [{ rotate: `${heading}deg` }] }} // If flat=true, Marker rotates. If we rotate image too, we double rotate.
                // Wait.
                // If flat={true}, the marker surface rotates with the map bearing? No.
                // flat={true} means the marker billboard behavior is disabled, it lies on the ground.
                // Logic:
                // We want the arrow to point to the compass heading.
                // If we set Marker rotation={heading}, the marker container rotates.
                resizeMode="contain"
            />
        </Marker>
    );
}

// Correction:
// React Native Maps Marker `rotation` prop: "The rotation of the marker in degrees clockwise relative to the map's north."
// We should pass the raw `heading` to the Marker `rotation` prop.
// To animate it creating a "jitter-free" experience might require an Animated region or just frequent updates.
// Since `watchHeadingAsync` fires often, passing it directly is usually fine. 
// But let's refine.

/*
Refined Implementation:
Pass `rotation` directly to Marker.
Image should just be the arrow.
*/

export function TacticalNavigationArrow({ location }) {
    const [heading, setHeading] = useState(0);

    useEffect(() => {
        let sub;
        Location.watchHeadingAsync(h => {
            setHeading(h.trueHeading || h.magHeading);
        }).then(s => sub = s);
        return () => sub && sub.remove();
    }, []);

    if (!location) return null;

    return (
        <Marker
            coordinate={location.coords}
            flat={true}
            anchor={{ x: 0.5, y: 0.5 }}
            rotation={heading} // This rotates the marker to face the heading
        >
            <Image
                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/149/149059.png' }}
                style={{ width: 50, height: 50 }}
            />
        </Marker>
    );
}
