# CORS Error Fix - Deployment Instructions

## Problem
Your Vercel frontend (`https://seva-link-rose.vercel.app`) is being blocked by CORS when trying to access your Render backend (`https://sevalink.onrender.com`).

## Solution Applied
Updated `server/index.js` with proper CORS configuration that allows your Vercel domain.

## Steps to Deploy the Fix

### 1. Commit and Push Changes
```bash
git add server/index.js
git commit -m "Fix CORS configuration for production deployment"
git push origin main
```

### 2. Update Render Environment Variables
Go to your Render dashboard and ensure this environment variable is set:

```
CLIENT_URL=https://seva-link-rose.vercel.app
```

### 3. Redeploy on Render
After pushing to GitHub, Render should automatically redeploy. If not:
1. Go to Render dashboard
2. Click on your service
3. Click "Manual Deploy" → "Deploy latest commit"

### 4. Wait for Deployment
- Wait 2-3 minutes for Render to rebuild and deploy
- Check deployment logs for any errors

### 5. Test the Fix
1. Go to `https://seva-link-rose.vercel.app`
2. Try to log in
3. CORS error should be resolved

## What Was Changed

**Before:**
```javascript
app.use(cors({
  origin: true, // Allowed all origins
  credentials: true
}));
```

**After:**
```javascript
const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://seva-link-rose.vercel.app',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

## Troubleshooting

### If CORS error persists:

1. **Check Render logs:**
   - Look for "CORS blocked origin:" messages
   - Verify the CLIENT_URL environment variable is set

2. **Clear browser cache:**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Or open in incognito/private mode

3. **Verify environment variables:**
   - Render: `CLIENT_URL=https://seva-link-rose.vercel.app`
   - Vercel: `REACT_APP_API_URL=https://sevalink.onrender.com`

4. **Check deployment status:**
   - Ensure Render deployment completed successfully
   - Check for any build errors in Render logs

## Quick Deploy Commands

```bash
# Commit the fix
git add .
git commit -m "Fix CORS for production"
git push origin main

# Render will auto-deploy
# Check status at: https://dashboard.render.com
```

---

**After deployment, the CORS error will be resolved!** ✅
