import { Accelerometer, Gyroscope } from 'expo-sensors';
import { Vibration } from 'react-native';

let accelSubscription = null;
let gyroSubscription = null;

// Shake detection state
let shakeCount = 0;
let lastShakeTime = 0;
const SHAKE_THRESHOLD = 2.5;
const SHAKE_WINDOW = 500; // ms

// Fall detection state
let isInFreeFall = false;
let freeFallStartTime = 0;
const FREE_FALL_THRESHOLD = 0.3; // G-force near 0
const FREE_FALL_DURATION = 100; // ms
const IMPACT_THRESHOLD = 2.5; // G-force spike

export const startGuardianSensors = (onShakeSOS, onFallDetected) => {
    // 1. Accelerometer for Shake and Fall
    Accelerometer.setUpdateInterval(50); // 20Hz for responsiveness
    accelSubscription = Accelerometer.addListener(data => {
        const { x, y, z } = data;
        const gForce = Math.sqrt(x * x + y * y + z * z);

        // --- SHAKE DETECTION ---
        const now = Date.now();
        if (gForce > SHAKE_THRESHOLD) {
            if (now - lastShakeTime < SHAKE_WINDOW) {
                shakeCount++;
            } else {
                shakeCount = 1;
            }
            lastShakeTime = now;

            if (shakeCount >= 3) {
                shakeCount = 0;
                Vibration.vibrate([0, 500, 200, 500]);
                onShakeSOS(); // Trigger Callback
            }
        }

        // --- FALL DETECTION (Phase 1: Free Fall) ---
        if (gForce < FREE_FALL_THRESHOLD) {
            if (!isInFreeFall) {
                isInFreeFall = true;
                freeFallStartTime = now;
            }
        } else {
            // Check if we just came out of a free fall state
            if (isInFreeFall && (now - freeFallStartTime) > FREE_FALL_DURATION) {
                // If we hit hard immediately after free fall
                if (gForce > IMPACT_THRESHOLD) {
                    onFallDetected();
                }
            }
            isInFreeFall = false;
        }
    });

    // 2. Gyroscope for Fall Confirmation (optional but requested)
    Gyroscope.setUpdateInterval(50);
    gyroSubscription = Gyroscope.addListener(data => {
        // Gyro can be used to detect tumble/rotation during fall for higher accuracy
        // But for this logic, we rely on the Accelerometer peaks as requested.
    });
};

export const stopGuardianSensors = () => {
    if (accelSubscription) {
        accelSubscription.remove();
        accelSubscription = null;
    }
    if (gyroSubscription) {
        gyroSubscription.remove();
        gyroSubscription = null;
    }
    isInFreeFall = false;
    shakeCount = 0;
};
