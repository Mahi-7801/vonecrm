# WhatsApp Business Platform Setup Guide

## Problem
Error: "This isn't working at the moment. Contact your provider."

## Root Cause
Facebook App is not properly configured for WhatsApp Embedded Signup.

---

## Step-by-Step Fix

### 1. Facebook Developer Console Setup

1. **Go to:** https://developers.facebook.com/apps/4257112177765455/dashboard/

2. **Switch to Live Mode:**
   - Left sidebar → **Settings** → **Basic**
   - Scroll down → Click **"Switch to Live"**
   - If prompted, complete app verification

3. **Add WhatsApp Product:**
   - Left sidebar → **Products**
   - Click **"Add Product"**
   - Find **WhatsApp** → Click **"Set up"**

4. **Configure Embedded Signup:**
   - Go to **WhatsApp** → **Quickstart**
   - Click **"Embedded Signup"**
   - Click **"Configure"** or **"Edit settings"**
   - Add **Valid OAuth Redirect URIs:**
     ```
     http://localhost:3000/onboarding/callback
     ```
   - Save configuration

5. **Verify Permissions:**
   - Go to **App Review** → **Permissions and Features**
   - Ensure these are approved:
     - `whatsapp_business_management`
     - `whatsapp_business_messaging`

### 2. Facebook Business Manager Setup

1. **Go to:** https://business.facebook.com/settings/
2. **Create or Select Business Portfolio:**
   - Business name: `mahi tech`
   - Email: `pmahi7801@gmail.com`
   - Website: `https://courses.bidalert.in/`
3. **Complete Business Verification:**
   - Go to **Security Center**
   - Enable Two-Factor Authentication
   - Submit business documents (GST certificate, etc.)

### 3. Server Configuration

Your `.env` file should have:
```env
WHATSAPP_APP_ID=4257112177765455
WHATSAPP_APP_SECRET=a4f2ce433dc64bd8badd8c7c0fe2f311
WHATSAPP_CONFIG_ID=1555035789437171
WHATSAPP_REDIRECT_URI=http://localhost:3000/onboarding/callback
WHATSAPP_GRAPH_API_VERSION=v21.0
WHATSAPP_SYSTEM_USER_TOKEN=EAAWm0gqsuckBSCRu...
```

### 4. Restart Server

```bash
cd server
npm start
```

### 5. Test the Flow

1. Open your app at `http://localhost:3000`
2. Go to **Settings** → **Onboarding**
3. Click **"Connect with Facebook"**
4. Complete the Facebook login popup
5. Select your business portfolio and phone number

---

## Alternative: Manual Setup (Skip Embedded Signup)

If Embedded Signup continues to fail, you can manually connect:

1. Go to **WhatsApp Manager:** https://business.facebook.com/wa/manage
2. Get your **Phone Number ID** and **WABA ID**
3. In your app, click **"Enter Phone Number ID Manually"**
4. Enter the IDs and click **"Connect & Verify"**

---

## Troubleshooting

### Error: "This isn't working at the moment"
- Ensure Facebook App is in **Live mode**
- Verify **Embedded Signup** is configured with correct redirect URI
- Check that **WhatsApp product** is added to the app

### Error: "No WhatsApp Business Accounts found"
- Create a WhatsApp Business Account in Facebook Business Manager
- Link a phone number to the account
- Ensure the phone number is not used on WhatsApp consumer app

### Error: "Invalid OAuth Redirect URI"
- The redirect URI in your server `.env` must match exactly what's in Facebook Developer Console
- Include `http://` or `https://` prefix
- No trailing slash unless configured that way

---

## Need Help?

If issues persist:
1. Check Facebook Developer Console → **App Events** → **Error Logs**
2. Check browser console (F12) for detailed error messages
3. Contact Meta Business Support via https://www.facebook.com/business/help
