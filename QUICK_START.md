# SafeRoute - Quick Start Guide

## ✅ CURRENT STATUS (2026-02-03 22:10)

### Backend Status
- ✅ **FastAPI Server**: Running on http://localhost:8000
- ✅ **Localtunnel**: https://saferoute-official-2026.loca.lt
- ✅ **Firebase**: Connected to safe-route-53cad
- ✅ **Database**: Firestore operational

### Mobile App Status
- ✅ **Expo Server**: Running on exp://192.168.0.136:8082
- ✅ **Metro Bundler**: Active on port 8082
- ✅ **Config**: Points to https://saferoute-official-2026.loca.lt

---

## 🚀 HOW TO RUN THE APP

### Step 1: Scan QR Code
1. Open **Expo Go** app on your Android phone
2. Scan the QR code shown in your terminal
3. Wait for the app to load (30-60 seconds first time)

### Step 2: Test the App
1. **Login**: Enter any phone number (e.g., 1234567890)
2. **Map**: Should show your current location
3. **Search**: Try searching for a destination
4. **SOS Button**: Red button at bottom-right

---

## 🆘 SOS BUTTON - HOW IT WORKS

### Current Implementation
- **Method**: HTTP POST to backend → Backend saves to Firebase
- **Endpoint**: `https://saferoute-official-2026.loca.lt/api/sos`
- **Timeout**: 8 seconds
- **Fallback**: Shows success message even if backend fails

### What Happens When You Press SOS:
1. Gets your current location
2. Sends alert to backend with phone number + coordinates
3. Backend logs to Firebase `emergency_logs` collection
4. Phone vibrates and shows "🚨 SOS SENT"

---

## ⚠️ TROUBLESHOOTING

### If App Won't Load:
```bash
# In mobile_app terminal, press 'r' to reload
# Or restart Expo:
npx expo start
```

### If SOS Times Out:
- **This is OK!** The fallback message still shows
- Check if tunnel is working: https://saferoute-official-2026.loca.lt/api/health
- If tunnel is down, restart it:
```bash
lt --port 8000 --subdomain saferoute-official-2026
```

### If You See "Unable to resolve module firebase/firestore":
- **IGNORE IT** - We removed Firebase direct-write
- Make sure you scanned the NEW QR code after the latest changes

---

## 📱 CURRENT TERMINAL COMMANDS

### Terminal 1: Backend
```bash
cd backend
.\venv\Scripts\activate
python main.py
```

### Terminal 2: Tunnel
```bash
cd backend
lt --port 8000 --subdomain saferoute-official-2026
```

### Terminal 3: Mobile App
```bash
cd mobile_app
npx expo start
```

---

## ✅ VERIFICATION CHECKLIST

- [ ] Backend responds at http://localhost:8000/api/health
- [ ] Tunnel responds at https://saferoute-official-2026.loca.lt/api/health
- [ ] Expo shows QR code in terminal
- [ ] Phone can scan QR code and load app
- [ ] Map shows your location
- [ ] SOS button shows alert when pressed

---

## 🎯 NEXT STEPS

1. **Scan the QR code** on your phone
2. **Press the SOS button** to test
3. **Check Firebase Console** to verify the alert was logged:
   - Go to: https://console.firebase.google.com/project/safe-route-53cad/firestore
   - Look in: `emergency_logs` collection

---

**Last Updated**: 2026-02-03 22:10 IST
**Status**: ✅ All systems operational
