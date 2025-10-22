# Phase 5: Push Notifications - Deployment & Testing Guide

## 🎯 Overview
This guide walks through building, deploying, and testing push notifications on your physical iPhone.

---

## Prerequisites Checklist

Before proceeding, ensure you have completed:

- ✅ APNs Authentication Key created in Apple Developer Portal
- ✅ APNs key uploaded to Firebase Console
- ✅ Bundle identifier matches everywhere (`app.json`, Firebase, Apple Developer)
- ✅ Physical iPhone device available
- ✅ iPhone connected to Mac via USB or same WiFi network
- ✅ Apple Developer account logged in on Mac

---

## Part 1: Update Bundle Identifier

### Step 1.1: Choose Your Bundle Identifier

Decide on your bundle identifier (must match Apple Developer Portal):
```
com.yourcompany.whatsappclone
```

**Replace `yourcompany` with:**
- Your company name (e.g., `com.acme.whatsappclone`)
- Your name (e.g., `com.johnsmith.whatsappclone`)
- Your username (e.g., `com.jsmith.whatsappclone`)

### Step 1.2: Update app.json

Open `/mobile/app.json` and update:

```json
{
  "expo": {
    "name": "WhatsApp Clone",
    "slug": "whatsapp-clone",
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.yourcompany.whatsappclone"  // <- UPDATE THIS
    }
  }
}
```

### Step 1.3: Update eas.json

Open `/eas.json` and update all bundle identifiers:

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false,
        "bundleIdentifier": "com.yourcompany.whatsappclone"  // <- UPDATE THIS
      }
    },
    "production": {
      "distribution": "store",
      "ios": {
        "simulator": false,
        "bundleIdentifier": "com.yourcompany.whatsappclone"  // <- UPDATE THIS
      }
    }
  }
}
```

### Step 1.4: Verify Firebase Console

Ensure your Firebase iOS app has the same bundle identifier:
1. Go to Firebase Console → Project Settings
2. Scroll to "Your apps"
3. Check iOS app bundle ID matches

---

## Part 2: Deploy Cloud Functions

### Step 2.1: Navigate to Functions Directory

```bash
cd functions
```

### Step 2.2: Install Dependencies (if needed)

```bash
npm install
```

### Step 2.3: Build TypeScript

```bash
npm run build
```

This compiles your TypeScript to JavaScript in the `lib/` directory.

### Step 2.4: Deploy to Firebase

```bash
npm run deploy
```

Or directly:
```bash
firebase deploy --only functions
```

**Expected Output:**
```
✔  Deploy complete!

Functions:
  sendMessageNotification(us-central1)
```

### Step 2.5: Verify Deployment

1. Go to Firebase Console → Functions
2. You should see `sendMessageNotification` listed
3. Status should be "Active"

**If deployment fails:**
- Ensure Firebase CLI is logged in: `firebase login`
- Check Firebase project is set: `firebase use <project-id>`
- Verify Node version: `node --version` (should be 18+)

---

## Part 3: Build App with EAS

### Step 3.1: Install EAS CLI (if not already installed)

```bash
npm install -g eas-cli
```

### Step 3.2: Login to Expo

```bash
eas login
```

Enter your Expo account credentials.

### Step 3.3: Configure EAS

If first time using EAS for this project:

```bash
cd mobile
eas build:configure
```

This will update `eas.json` (we already created it, so it might just verify).

### Step 3.4: Build for iOS (Internal Distribution)

```bash
eas build --platform ios --profile preview
```

**What happens:**
1. EAS uploads your code to Expo servers
2. Code is built on Expo's servers (takes 15-30 minutes)
3. You get a link to download the `.ipa` file or install directly

**During the build, you may be asked:**
- Generate new iOS credentials? → **Yes** (if first time)
- Select Apple Team → Choose your team
- Generate push notification key? → **No** (we already configured APNs manually)

### Step 3.5: Install on Device

**Option A: Install via QR Code (Easiest)**
1. After build completes, you'll get a QR code
2. Open Camera app on iPhone
3. Point at QR code
4. Tap the notification to install
5. Go to Settings → General → Device Management → Trust developer

**Option B: Install via EAS CLI**
```bash
eas device:create
```
Follow prompts to register your device, then re-run build.

**Option C: Download IPA and install via Xcode**
1. Download `.ipa` from build page
2. Open Xcode → Window → Devices and Simulators
3. Connect iPhone
4. Drag `.ipa` to device

---

## Part 4: Testing Notifications

### Test Setup

You'll need **two test accounts** and ideally **two devices** (or one device + simulator for sending).

**Test Accounts:**
- User A: `test1@example.com` (your iPhone)
- User B: `test2@example.com` (another device or simulator)

### Test 4.1: Register Push Token

1. **Open app on iPhone** (User A)
2. **Sign in** with test1@example.com
3. **Check logs in Xcode** (optional):
   - Open Xcode → Window → Devices and Simulators
   - Select your iPhone
   - Click "Open Console"
   - Look for: `✅ Push token registered and saved to Firestore`
4. **Verify in Firebase Console**:
   - Go to Firestore
   - Navigate to `users` collection
   - Open test1 user document
   - You should see `pushToken` field (starts with `ExponentPushToken[...]`)

### Test 4.2: Foreground Notification (App Open)

**Setup:**
- User A: iPhone with app **OPEN**, viewing Chats screen
- User B: Another device/simulator

**Steps:**
1. User B sends message to User A
2. **Expected on User A's iPhone:**
   - Banner notification appears at top
   - Sound plays
   - Console shows: `📬 Notification received in foreground`

**If notification doesn't appear:**
- Check notification permissions: Settings → Notifications → WhatsApp Clone → Allow Notifications
- Check console for errors
- Verify Cloud Function ran (Firebase Console → Functions → Logs)

### Test 4.3: Background Notification (App Backgrounded)

**Setup:**
- User A: iPhone with app in **BACKGROUND** (press home button)
- User B: Another device/simulator

**Steps:**
1. User B sends message to User A
2. **Expected on User A's iPhone:**
   - Notification appears in notification center
   - Sound plays
   - Tap notification → **App opens to conversation**

**If notification doesn't appear:**
- Check notification permissions
- Ensure app is not force-quit (swipe up in app switcher) - try with app just backgrounded first
- Check Firebase Function logs for errors

### Test 4.4: Killed App Notification (App Force Quit)

**Setup:**
- User A: iPhone with app **FORCE QUIT** (swipe up in app switcher)
- User B: Another device/simulator

**Steps:**
1. User B sends message to User A
2. **Expected on User A's iPhone:**
   - Notification appears
   - Sound plays
   - Tap notification → **App launches and opens to conversation**

### Test 4.5: Group Notifications

**Setup:**
- Create a group with User A, User B, User C
- User A on iPhone, User B sends message

**Steps:**
1. User B sends message in group
2. **Expected on User A's iPhone:**
   - Notification title: "Group Name"
   - Notification body: "User B: Message text"
3. Verify User B doesn't receive notification for their own message

### Test 4.6: Image Notifications

**Steps:**
1. User B sends image with caption to User A
2. **Expected notification:**
   - Title: "User B" (or group name)
   - Body: "📷 Caption text" or "📷 Image"

---

## Part 5: Troubleshooting

### Issue: No push token registered

**Symptoms:**
- Console shows: `⚠️ No push token received`
- No `pushToken` field in Firestore

**Solutions:**
1. Ensure you're on **physical device** (not simulator)
2. Check notification permissions granted
3. Check EAS project ID in `app.json`:
   ```json
   "extra": {
     "eas": {
       "projectId": "your-project-id"
     }
   }
   ```
4. Verify APNs key uploaded to Firebase

### Issue: Token registered but notifications not received

**Check Cloud Function:**
1. Go to Firebase Console → Functions → Logs
2. Look for `sendMessageNotification` execution
3. Check for errors

**Common errors:**
- "Invalid push token" → Token format wrong, re-register
- "DeviceNotRegistered" → Old token, user needs to re-login
- "MessageTooBig" → Message content too large

**Check Expo Push Status:**
1. Go to https://expo.dev/
2. Click on your project
3. Go to "Push Notifications" tab
4. Check for delivery issues

### Issue: Notification received but app doesn't open to conversation

**Check deep linking:**
1. Look in console for: `📨 Navigating to conversation: xxx`
2. If missing, check notification data structure
3. Verify `conversationId` is in notification data

**Test notification data:**
```typescript
// In handleNotificationTap, log the data:
console.log('Notification data:', JSON.stringify(data, null, 2));
```

### Issue: Cloud Function not deploying

**Solutions:**
1. Check Node version: `node --version` (need 18+)
2. Update Firebase CLI: `npm install -g firebase-tools`
3. Check Firebase project: `firebase use --add`
4. Check billing enabled (Functions requires Blaze plan)

### Issue: Build fails on EAS

**Common solutions:**
1. Clear cache: `eas build --platform ios --profile preview --clear-cache`
2. Check bundle identifier matches Apple Developer
3. Verify Apple Developer membership is active
4. Check credentials: `eas credentials`

---

## Part 6: Monitoring & Maintenance

### Monitor Cloud Function Performance

**Firebase Console:**
1. Functions → sendMessageNotification
2. Check: Invocations, Errors, Execution time
3. Set up alerts for errors

**Logs:**
```bash
firebase functions:log --only sendMessageNotification
```

### Monitor Notification Delivery

**Expo Dashboard:**
1. Go to https://expo.dev/accounts/[your-account]/projects/[project]/push-notifications
2. View delivery statistics
3. Check error rates

### Update Push Tokens

Users should automatically get new tokens when:
- App updates
- Device changes
- Token expires

**Verify token is fresh:**
- Check `pushTokenUpdatedAt` field in Firestore
- If > 30 days old, consider it stale

---

## Part 7: Production Deployment

When ready for production:

### Step 7.1: Build for Production

```bash
eas build --platform ios --profile production
```

### Step 7.2: Submit to TestFlight

```bash
eas submit --platform ios
```

### Step 7.3: Add Testers

1. Go to App Store Connect
2. TestFlight → Internal Testing
3. Add testers' emails
4. Send invitations

### Step 7.4: Monitor Production Notifications

- Set up Firebase alerts for function errors
- Monitor Expo push notification dashboard
- Track user feedback on notification issues

---

## Quick Reference Commands

```bash
# Deploy Cloud Functions
cd functions && npm run deploy

# Build for iOS (preview)
cd mobile && eas build --platform ios --profile preview

# Build for iOS (production)
cd mobile && eas build --platform ios --profile production

# Submit to TestFlight
eas submit --platform ios

# View function logs
firebase functions:log --only sendMessageNotification

# Check device logs (when connected)
# Xcode → Window → Devices and Simulators → Open Console
```

---

## Success Criteria

Phase 5 is complete when:

- ✅ Push tokens register on sign in
- ✅ Foreground notifications appear
- ✅ Background notifications appear
- ✅ Tapping notification opens correct conversation
- ✅ Group notifications work correctly
- ✅ Image notifications have proper format
- ✅ Sender doesn't receive own notifications
- ✅ Cloud Function executes without errors

---

## Next Steps

After Phase 5 is complete and tested:
- **Phase 6:** Polish & Testing
  - UI/UX improvements
  - Message actions (copy, delete)
  - Settings screens
  - Performance optimization

---

**Need Help?** If you encounter issues:
1. Check console logs on device
2. Check Firebase Function logs
3. Verify notification permissions
4. Test with a simpler message first
5. Ask for debugging help if stuck!

Good luck! 🚀

