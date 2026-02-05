# SafeRoute Startup Guide

To run the project correctly another time, follow these **3 steps** in order. Open a separate terminal for each step.

### **Step 1: Start the Backend**
Go to the `backend` folder and run:
```powershell
cd backend
python main.py
```
*Wait for it to say `Application startup complete.`*

### **Step 2: Start the Backend Tunnel**
Go to the `backend` folder and run this to let your phone talk to your laptop:
```powershell
cd backend
npx localtunnel --port 8000 --subdomain saferoute-active-check
```
*If it says "Subdomain in use", change `saferoute-app-sriram` to something like `saferoute-sriram-2` and update the URL in `mobile_app/config.js`.*

### **Step 3: Start the Mobile App**
Go to the `mobile_app` folder and run:
```powershell
cd mobile_app
npx expo start --tunnel
```
*Scan the QR code with your phone.*

---

### **Common Fixes if things don't work:**

1. **"Status Code 503" or "Tunnel Unavailable":**
   - This means the tunnel in **Step 2** died. Close that terminal and run the command again. 
   - Ensure the URL in `mobile_app/config.js` exactly matches the URL shown in the terminal.

2. **"Network Error" or "Red Dot" in App:**
   - Ensure Step 1 and Step 2 are both running.
   - Try refreshing the app on your phone (press 'r' in the Expo terminal).

3. **Map is Blank:**
   - Double check that your Google Maps API Key is active in `mobile_app/app.json`.
