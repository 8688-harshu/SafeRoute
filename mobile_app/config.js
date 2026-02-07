// SafeRoute Configuration
import { Platform } from 'react-native';

/**
 * BACKEND CONNECTIVITY
 * CONNECTED TO: Local Network (WiFi) or Production
 */
// ⬇️ PRODUCTION URL (Render)
const PROD_URL = 'https://saferoute-api.onrender.com';

// ⬇️ LOCAL URL (Your Laptop IP - Update if IP changes)
const LOCAL_URL = 'http://192.168.0.136:8000';

// 🚀 Automatic Environment Detection
// Use Local URL if in Development Mode (running with `npx expo start`)
// Use Production URL if built for release (EAS Build / App Store)
const BASE_URL = __DEV__ ? LOCAL_URL : PROD_URL;

console.log(`[SafeRoute] Connecting to Backend: ${BASE_URL}`);

export const API_URL = BASE_URL;

export const ENDPOINTS = {
    HEALTH: '/api/health',
    SEARCH: '/api/search',
    SAFE_ROUTE: '/safe-route',
    RISK_ZONES: '/risk-zones',
    SOS: '/api/sos',
    REPORT: '/report-unsafe'
};

