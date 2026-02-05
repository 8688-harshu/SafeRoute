# 🚨 QUICK FIX - Run This Command

## ⚡ SINGLE COMMAND (Copy-Paste This)

**Open PowerShell as Administrator** (Right-click PowerShell → Run as Administrator)

Then paste this **SINGLE LINE**:

```powershell
New-NetFirewallRule -DisplayName "SafeRoute-Dev" -Direction Inbound -LocalPort 8000,8081,19000,19001,19002 -Protocol TCP -Action Allow -Profile Any
```

---

## ✅ AFTER RUNNING THE COMMAND

You should see:
```
Name                  : SafeRoute-Dev
DisplayName           : SafeRoute-Dev
Description           : 
DisplayGroup          : 
Group                 : 
Enabled               : True
Profile               : Any
Platform              : {}
Direction             : Inbound
Action                : Allow
EdgeTraversalPolicy   : Block
...
```

---

## 🎯 THEN DO THIS

### 1. Verify Backend is Running
```bash
curl http://localhost:8000/api/health
```
Should return: `{"status":"ok","message":"SafeRoute Backend is Running"}`

### 2. Test from Phone Browser
Open Chrome on your phone and visit:
```
http://192.168.0.136:8000/docs
```

**If you see FastAPI docs → SUCCESS!**

### 3. Update Config
Edit `mobile_app/config.js`:
```javascript
const BASE_URL = 'http://192.168.0.136:8000';
```

### 4. Start Expo
```bash
cd mobile_app
npx expo start
```

### 5. Scan QR Code
- Open Expo Go
- Scan the QR code
- App loads in 10 seconds!

---

## 🔧 IF STILL DOESN'T WORK

### Check 1: Are you Administrator?
```powershell
# Run this to check:
([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
```
Should return: `True`

### Check 2: Is backend listening on 0.0.0.0?
```bash
# Your backend command MUST be:
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
#                        ↑↑↑↑↑↑↑↑↑
#                   NOT localhost!
```

### Check 3: Same WiFi?
- Laptop and phone must be on **same WiFi network**
- Not mobile data, not different WiFi

---

## 📱 QUICK TEST URLS

Test these in your phone's browser:

1. **Health Check**
   ```
   http://192.168.0.136:8000/api/health
   ```

2. **API Docs**
   ```
   http://192.168.0.136:8000/docs
   ```

3. **Risk Zones**
   ```
   http://192.168.0.136:8000/risk-zones
   ```

**If ALL work → Your network is perfect!**

---

## ✅ FINAL CHECKLIST

- [ ] PowerShell opened as **Administrator**
- [ ] Firewall command ran successfully
- [ ] Backend running with `--host 0.0.0.0`
- [ ] Phone browser can access http://192.168.0.136:8000/docs
- [ ] Config.js updated to use local IP
- [ ] Expo started
- [ ] QR code scanned
- [ ] App works!

---

**NO MORE TUNNELS. NO MORE ERRORS. JUST WORKS!** 🚀
