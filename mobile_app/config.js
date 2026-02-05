// SafeRoute Configuration
import { Platform } from 'react-native';

/**
 * BACKEND CONNECTIVITY
 * CONNECTED TO: Local Network (WiFi)
 * HOST IP: 10.53.58.167
 */
// ⬇️ UNCOMMENT THIS FOR PRODUCTION (RENDER)
// const BASE_URL = 'https://saferoute-api.onrender.com';
// ⬇️ USE THIS FOR LOCAL DEVELOPMENT
const BASE_URL = 'http://192.168.0.136:8000'; // Local WiFi IP

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

