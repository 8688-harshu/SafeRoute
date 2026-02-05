# Deployment Master Plan for SafeRoute

Welcome to the production phase! I have prepared your backend for the cloud and will guide you through the transition.

## 🟢 PHASE 1: Backend Deployment (Render.com)

We will deploy your Python FastAPI backend to Render's Free Tier.

### 1. Prepare your Code (Done)
I have already updated your `requirements.txt` to include production-grade libraries (`gunicorn`, `uvicorn[standard]`).

### 2. Push to GitHub
Render needs your code to be on GitHub. Run these commands to push your project:

```bash
# Initialize git if you haven't (run in the root SafeRoute folder)
git init
git add .
git commit -m "Ready for deployment"

# Link to your new GitHub Repo (Create a NEW repo on github.com first!)
# Replace URL with your actual repo URL
git remote add origin https://github.com/YOUR_USERNAME/SafeRoute.git
git branch -M main
git push -u origin main
```

### 3. Deploy on Render
1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click **New +** -> **Web Service**
3. Connect your GitHub account and select the `SafeRoute` repo.
4. Use these settings:
   - **Name**: `saferoute-api`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Environment Variables**:
     - `FIREBASE_CREDENTIALS`: (Copy content of `serviceAccountKey.json`) *
       *(Note: Uploading JSON keys to git is risky. For Render, copy the content of json and paste it into a 'Secret File' on Render named `backend/serviceAccountKey.json` OR use an ENV var pathway. For simplicity now, if you pushed the json to private repo, it works, but be careful.)*

---

## 🟡 PHASE 2: Frontend Connection (The Switch)

Once Render finishes building, it will give you a URL like: `https://saferoute-api.onrender.com`.

### Update your App Config
Go to `mobile_app/config.js` and update line 9:

```javascript
// REPLACE THIS:
// const BASE_URL = 'http://192.168.x.x:8000'; 
// OR
// const BASE_URL = 'https://saferoute-official-2026.loca.lt';

// WITH THIS (Your new Cloud URL):
const BASE_URL = 'https://saferoute-api.onrender.com'; 
```

---

## 🔴 PHASE 3: The Build (Generate APK)

Now we build the Android App file (`.apk`) that you can share.

### 1. Install EAS CLI (Run in `mobile_app` folder)
```powershell
npm install -g eas-cli
```

### 2. Login to Expo
```powershell
eas login
```

### 3. Configure Build (Done)
I have already checked your `eas.json` file. It is configured for `preview` (APK) builds.

### 4. Build the APK
Run this command to start the cloud build:
```powershell
eas build -p android --profile preview
```

### 5. Download
- Wait ~10-15 minutes.
- Expo will give you a link to download the `.apk`.
- Install it on your phone!

---

### 📝 Summary Checklist
- [ ] Create GitHub Repo & Push Code
- [ ] Create Render Web Service
- [ ] Wait for Render URL (Green Checkmark)
- [ ] Update `mobile_app/config.js` with Render URL
- [ ] Run `eas build -p android --profile preview`
