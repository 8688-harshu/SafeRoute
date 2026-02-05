# ============================================================================
# SafeRoute LAN Setup - The Firewall Nuke Script
# ============================================================================
# Purpose: Brute-force configure Windows to allow local network development
# Run as: Right-click → Run with PowerShell (as Administrator)
# ============================================================================

# Force Administrator Privileges
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "❌ NOT RUNNING AS ADMINISTRATOR!" -ForegroundColor Red
    Write-Host "Right-click this script and select 'Run as Administrator'" -ForegroundColor Yellow
    pause
    exit
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                                ║" -ForegroundColor Cyan
Write-Host "║          SAFEROUTE LAN SETUP - FIREWALL NUKE MODE             ║" -ForegroundColor Cyan
Write-Host "║                                                                ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# STEP 1: THE FIREWALL NUKE
# ============================================================================
Write-Host "🔥 STEP 1: NUKING FIREWALL RESTRICTIONS..." -ForegroundColor Yellow
Write-Host ""

# Remove old rules if they exist
Remove-NetFirewallRule -DisplayName "SafeRoute-Dev" -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName "SafeRoute Backend" -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName "Expo Metro" -ErrorAction SilentlyContinue

# Create new comprehensive rule
New-NetFirewallRule `
    -DisplayName "SafeRoute-Dev" `
    -Direction Inbound `
    -LocalPort 8000,8081,19000,19001,19002 `
    -Protocol TCP `
    -Action Allow `
    -Profile Any `
    -Enabled True | Out-Null

Write-Host "✅ Firewall Rules Created:" -ForegroundColor Green
Write-Host "   • Port 8000 (FastAPI Backend) - OPEN" -ForegroundColor Green
Write-Host "   • Port 8081 (Expo Metro) - OPEN" -ForegroundColor Green
Write-Host "   • Ports 19000-19002 (Expo Dev) - OPEN" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 2: THE IP DETECTOR
# ============================================================================
Write-Host "🔍 STEP 2: DETECTING YOUR NETWORK CONFIGURATION..." -ForegroundColor Yellow
Write-Host ""

# Get WiFi IPv4 address
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | 
    Where-Object { $_.InterfaceAlias -like "*Wi-Fi*" -or $_.InterfaceAlias -like "*Wireless*" -or $_.InterfaceAlias -like "*Ethernet*" } | 
    Where-Object { $_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" -or $_.IPAddress -like "172.*" } | 
    Select-Object -First 1).IPAddress

if (-not $ipAddress) {
    Write-Host "❌ CRITICAL: Could not detect local IP address!" -ForegroundColor Red
    Write-Host "   Make sure you're connected to WiFi" -ForegroundColor Yellow
    pause
    exit
}

# Display IP in huge text
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                                                                ║" -ForegroundColor Green
Write-Host "║              YOUR LAPTOP IP ADDRESS IS:                        ║" -ForegroundColor Green
Write-Host "║                                                                ║" -ForegroundColor Green
Write-Host "║                  $ipAddress                           ║" -ForegroundColor White -BackgroundColor DarkGreen
Write-Host "║                                                                ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Check network profile
$networkProfile = (Get-NetConnectionProfile | Where-Object { $_.IPv4Connectivity -eq "Internet" } | Select-Object -First 1).NetworkCategory

if ($networkProfile -eq "Public") {
    Write-Host "⚠️  WARNING: Your network is set to 'PUBLIC' profile!" -ForegroundColor Red
    Write-Host "   This may block local connections even with firewall rules." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Do you want to switch to 'PRIVATE' network? (Recommended)" -ForegroundColor Yellow
    $response = Read-Host "   Type 'yes' to switch"
    
    if ($response -eq "yes") {
        Get-NetConnectionProfile | Where-Object { $_.IPv4Connectivity -eq "Internet" } | Set-NetConnectionProfile -NetworkCategory Private
        Write-Host "   ✅ Network switched to PRIVATE" -ForegroundColor Green
    }
} else {
    Write-Host "✅ Network Profile: PRIVATE (Good for development)" -ForegroundColor Green
}

Write-Host ""

# ============================================================================
# STEP 3: BACKEND LAUNCHER INSTRUCTIONS
# ============================================================================
Write-Host "🚀 STEP 3: BACKEND STARTUP COMMAND" -ForegroundColor Yellow
Write-Host ""
Write-Host "Copy and run this command in your backend directory:" -ForegroundColor Cyan
Write-Host ""
Write-Host "cd backend" -ForegroundColor White
Write-Host ".\venv\Scripts\activate" -ForegroundColor White
Write-Host "uvicorn main:app --host 0.0.0.0 --port 8000 --reload" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host ""
Write-Host "✅ This makes the backend accessible from ANY device on your network" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 4: CONFIG.JS GENERATOR
# ============================================================================
Write-Host "📝 STEP 4: UPDATING MOBILE APP CONFIG..." -ForegroundColor Yellow
Write-Host ""

$configPath = "mobile_app\config.js"
$configContent = @"
// SafeRoute Configuration - Auto-Generated
// Last Updated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

/**
 * NETWORK CONFIGURATION
 * 
 * DEVELOPMENT MODE: Use local IP for fast, stable connection
 * PRODUCTION MODE: Use deployed backend URL
 */

// 🔧 CHANGE THIS TO SWITCH MODES
const USE_LOCAL_NETWORK = true;  // Set to false for production/tunnel

// 🌐 Your laptop's IP address (auto-detected)
const LOCAL_IP = '$ipAddress';
const LOCAL_PORT = '8000';

// 🚀 Production/Tunnel URL (if needed)
const PRODUCTION_URL = 'https://your-backend.herokuapp.com';

// 📡 Automatic selection
const BASE_URL = USE_LOCAL_NETWORK 
  ? ``http://`${LOCAL_IP}:`${LOCAL_PORT}``
  : PRODUCTION_URL;

console.log(``[SafeRoute] Mode: `${USE_LOCAL_NETWORK ? 'LOCAL NETWORK' : 'PRODUCTION'}``);
console.log(``[SafeRoute] Connecting to: `${BASE_URL}``);

export const API_URL = BASE_URL;

export const ENDPOINTS = {
    HEALTH: '/api/health',
    SEARCH: '/api/search',
    SAFE_ROUTE: '/safe-route',
    RISK_ZONES: '/risk-zones',
    SOS: '/api/sos',
    REPORT: '/report-unsafe'
};
"@

# Write config file
$configContent | Out-File -FilePath $configPath -Encoding UTF8 -Force

Write-Host "✅ Config file updated: $configPath" -ForegroundColor Green
Write-Host "   • Mode: LOCAL NETWORK" -ForegroundColor Green
Write-Host "   • Backend: http://$ipAddress:8000" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 5: SANITY CHECK INSTRUCTIONS
# ============================================================================
Write-Host "🧪 STEP 5: SANITY CHECK - TEST BEFORE RUNNING APP" -ForegroundColor Yellow
Write-Host ""
Write-Host "Before opening Expo, verify the connection works:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1️⃣  Start your backend (see Step 3 command above)" -ForegroundColor White
Write-Host ""
Write-Host "2️⃣  Open Chrome on your PHONE and visit:" -ForegroundColor White
Write-Host ""
Write-Host "   http://$ipAddress:8000/docs" -ForegroundColor White -BackgroundColor DarkMagenta
Write-Host ""
Write-Host "3️⃣  You should see the FastAPI Swagger documentation" -ForegroundColor White
Write-Host ""
Write-Host "4️⃣  If it works, your network is configured correctly!" -ForegroundColor Green
Write-Host "    If it fails, check:" -ForegroundColor Yellow
Write-Host "    • Backend is running" -ForegroundColor Yellow
Write-Host "    • Phone is on same WiFi" -ForegroundColor Yellow
Write-Host "    • Firewall rules are active (run this script again)" -ForegroundColor Yellow
Write-Host ""

# ============================================================================
# FINAL SUMMARY
# ============================================================================
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    SETUP COMPLETE! ✅                          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 QUICK REFERENCE CARD:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Your IP:        $ipAddress" -ForegroundColor White
Write-Host "Backend URL:    http://$ipAddress:8000" -ForegroundColor White
Write-Host "API Docs:       http://$ipAddress:8000/docs" -ForegroundColor White
Write-Host "Health Check:   http://$ipAddress:8000/api/health" -ForegroundColor White
Write-Host ""
Write-Host "Firewall:       ✅ OPEN (Ports 8000, 8081, 19000-19002)" -ForegroundColor Green
Write-Host "Config:         ✅ UPDATED (mobile_app/config.js)" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 NEXT STEPS:" -ForegroundColor Yellow
Write-Host "1. Start backend: uvicorn main:app --host 0.0.0.0 --port 8000 --reload" -ForegroundColor White
Write-Host "2. Test in phone browser: http://$ipAddress:8000/docs" -ForegroundColor White
Write-Host "3. Start Expo: npx expo start" -ForegroundColor White
Write-Host "4. Scan QR code and enjoy FAST, STABLE connections!" -ForegroundColor White
Write-Host ""
Write-Host "💡 TIP: Bookmark this URL on your phone for quick testing:" -ForegroundColor Cyan
Write-Host "   http://$ipAddress:8000/api/health" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
pause
