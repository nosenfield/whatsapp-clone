# Phase 5: Push Notifications - Quick Start

## ✅ What's Been Done (Code Complete!)

All push notification code is implemented and ready to test:

### Mobile App (Complete)
- ✅ Notification service with token registration
- ✅ Permission requests on sign in/sign up
- ✅ Push token saved to Firestore
- ✅ Notification handlers (foreground, background, tap)
- ✅ Deep linking to conversations
- ✅ Auth store integration

### Cloud Functions (Complete)
- ✅ `sendMessageNotification` function
- ✅ Triggers on new message creation
- ✅ Fetches recipient push tokens
- ✅ Handles groups and direct messages
- ✅ Handles image messages
- ✅ Uses Expo Push API for delivery

### Configuration Files (Complete)
- ✅ `eas.json` for builds
- ✅ Type definitions updated
- ✅ No linting errors

---

## 🎯 Your Action Items (To Complete Phase 5)

Follow these steps IN ORDER:

### Step 1: APNs Setup (15 minutes)
📖 **Follow:** `_docs/APNS_SETUP_GUIDE.md`

**Quick summary:**
1. Create APNs Authentication Key in Apple Developer Portal
2. Download `.p8` file (ONE TIME ONLY - save it!)
3. Note Key ID and Team ID
4. Upload key to Firebase Console → Cloud Messaging
5. Verify "Configured" status

### Step 2: Update Bundle Identifier (2 minutes)

**Choose your bundle ID:** `com.yourcompany.whatsappclone`

**Update in 3 places:**

1. `/mobile/app.json`:
```json
"ios": {
  "bundleIdentifier": "com.yourcompany.whatsappclone"
}
```

2. `/eas.json`:
```json
"preview": {
  "ios": {
    "bundleIdentifier": "com.yourcompany.whatsappclone"
  }
},
"production": {
  "ios": {
    "bundleIdentifier": "com.yourcompany.whatsappclone"
  }
}
```

3. Verify Firebase Console iOS app has same bundle ID

### Step 3: Deploy Cloud Function (5 minutes)

```bash
cd functions
npm install  # If needed
npm run build
npm run deploy
```

**Verify:** Firebase Console → Functions → `sendMessageNotification` should be listed

### Step 4: Build & Install on iPhone (30 minutes)

```bash
cd mobile
eas build --platform ios --profile preview
```

**Wait for build to complete** (15-30 minutes)

**Install on iPhone:**
- Scan QR code with iPhone Camera app
- Or download IPA and install via Xcode

**Trust app:**
- Settings → General → Device Management → Trust developer

### Step 5: Test Notifications (15 minutes)

📖 **Follow:** `_docs/PHASE5_DEPLOYMENT_GUIDE.md` (Part 4: Testing)

**Quick tests:**
1. **Foreground:** App open → receive message → see banner
2. **Background:** App backgrounded → receive message → tap → opens conversation
3. **Killed:** Force quit app → receive message → tap → launches to conversation

---

## 📋 Verification Checklist

Before marking Phase 5 complete, verify:

- [ ] APNs key uploaded to Firebase (shows "Configured")
- [ ] Bundle identifier matches in all 3 places
- [ ] Cloud Function deployed successfully
- [ ] App installed on physical iPhone
- [ ] Push token appears in Firestore after sign in
- [ ] Foreground notifications work
- [ ] Background notifications work
- [ ] Tapping notification opens conversation
- [ ] Group notifications show sender name
- [ ] Image notifications work

---

## 🚨 If You Get Stuck

### "No push token registered"
- Must use **physical device** (not simulator)
- Check notification permissions granted
- Verify EAS project ID in `app.json`

### "Notification not received"
- Check Firebase Function logs for errors
- Verify `pushToken` field exists in Firestore user document
- Test with simple text message first

### "Build fails"
- Verify bundle ID matches Apple Developer Portal
- Check Apple Developer membership is active
- Try: `eas build --platform ios --profile preview --clear-cache`

### "Function not deploying"
- Verify Firebase project set: `firebase use --add`
- Check billing enabled (Functions requires Blaze plan)
- Update Firebase CLI: `npm install -g firebase-tools`

---

## 📚 Full Documentation

For detailed instructions and troubleshooting:
- **APNs Setup:** `_docs/APNS_SETUP_GUIDE.md`
- **Deployment & Testing:** `_docs/PHASE5_DEPLOYMENT_GUIDE.md`

---

## 🎉 After Phase 5

Once notifications are working:
- ✅ Phase 5 complete!
- 🎯 Next: Phase 6 - Polish & Testing
  - UI/UX improvements
  - Message actions
  - Settings screens
  - Performance optimization
  - TestFlight deployment

---

**Estimated Time:** 1-2 hours (including build time)

**Need Help?** Check deployment guide troubleshooting section or ask for help!

Good luck! 🚀

