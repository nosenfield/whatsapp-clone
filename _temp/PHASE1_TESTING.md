# Phase 1 Testing Guide - Authentication & Navigation

**Created:** October 20, 2025  
**Status:** Ready for Testing

---

## ✅ What Was Built

### Authentication Screens
- ✅ `app/(auth)/login.tsx` - Login screen with email/password
- ✅ `app/(auth)/register.tsx` - Registration screen with validation
- ✅ Form validation (email format, password length, matching passwords)
- ✅ Error handling with user-friendly messages
- ✅ Loading states with activity indicators

### Tab Navigation
- ✅ `app/(tabs)/_layout.tsx` - Tab bar with Chats and Profile tabs
- ✅ `app/(tabs)/chats.tsx` - Chats list screen (empty state)
- ✅ `app/(tabs)/profile.tsx` - Profile screen with user info

### Protected Routes
- ✅ `app/index.tsx` - Auto-redirects based on auth state
- ✅ Loading spinner during auth check
- ✅ Automatic navigation on sign in/out

---

## 🧪 Testing Checklist

### Prerequisites
1. Ensure Firebase is properly configured:
   - Check `.env` file exists with all `EXPO_PUBLIC_FIREBASE_*` variables
   - Verify Firebase project has Authentication enabled
   - Confirm Firestore database is created

2. Start the development server:
   ```bash
   cd mobile
   npx expo start --clear
   ```

3. Open the app on your device or simulator

---

### Test 1: Initial App Load
**Expected Behavior:**
- [ ] App shows loading spinner briefly
- [ ] App redirects to login screen (if not authenticated)

**Pass Criteria:** ✅ Login screen appears

---

### Test 2: Sign Up Flow
**Steps:**
1. On login screen, tap "Sign Up"
2. Fill in the form:
   - Name: "Test User"
   - Email: "test@example.com"
   - Password: "password123"
   - Confirm Password: "password123"
3. Tap "Create Account"

**Expected Behavior:**
- [ ] Loading indicator appears on button
- [ ] User is created in Firebase Authentication
- [ ] User document is created in Firestore
- [ ] App redirects to Chats screen
- [ ] Tab bar is visible at bottom

**Pass Criteria:** ✅ Lands on Chats screen showing "No Conversations Yet"

**Validation Tests:**
- [ ] Empty name → Shows error alert
- [ ] Invalid email (no @) → Shows error alert
- [ ] Password < 6 chars → Shows error alert
- [ ] Passwords don't match → Shows error alert
- [ ] Email already exists → Shows "email already in use" error

---

### Test 3: Sign Out
**Steps:**
1. From Chats screen, tap "Profile" tab
2. Scroll down and tap "Sign Out"
3. Confirm in the alert dialog

**Expected Behavior:**
- [ ] Alert appears asking for confirmation
- [ ] After confirming, user is signed out
- [ ] App redirects to login screen

**Pass Criteria:** ✅ Returns to login screen

---

### Test 4: Sign In Flow
**Steps:**
1. On login screen, enter:
   - Email: "test@example.com"
   - Password: "password123"
2. Tap "Sign In"

**Expected Behavior:**
- [ ] Loading indicator appears
- [ ] User is authenticated
- [ ] App redirects to Chats screen

**Pass Criteria:** ✅ Successfully signs in and lands on Chats screen

**Error Scenarios:**
- [ ] Wrong password → Shows "Incorrect password" error
- [ ] Non-existent email → Shows "No account found" error
- [ ] Invalid email format → Shows "Invalid email" error

---

### Test 5: Auth Persistence
**Steps:**
1. Sign in successfully
2. Close the app completely (swipe up from app switcher)
3. Reopen the app

**Expected Behavior:**
- [ ] App shows loading spinner briefly
- [ ] User remains signed in
- [ ] App goes directly to Chats screen (no login required)

**Pass Criteria:** ✅ User stays authenticated across app restarts

---

### Test 6: Profile Screen
**Steps:**
1. Navigate to Profile tab
2. Verify displayed information

**Expected Behavior:**
- [ ] User's name is displayed
- [ ] User's email is displayed
- [ ] Profile avatar placeholder is visible
- [ ] Settings options are visible (Edit Profile, Notifications, Privacy)
- [ ] Sign Out button is at the bottom
- [ ] App version is shown

**Pass Criteria:** ✅ All user info displays correctly

---

### Test 7: Navigation
**Steps:**
1. Tap between Chats and Profile tabs multiple times

**Expected Behavior:**
- [ ] Tab switching is smooth
- [ ] Active tab is highlighted in blue
- [ ] Inactive tab is gray
- [ ] Screen content updates correctly

**Pass Criteria:** ✅ Tab navigation works smoothly

---

### Test 8: Multiple Accounts
**Steps:**
1. Sign out
2. Create a second account: "test2@example.com"
3. Sign out
4. Sign back in with first account
5. Sign out
6. Sign back in with second account

**Expected Behavior:**
- [ ] Each account maintains separate identity
- [ ] Profile shows correct user for each account
- [ ] No data mixing between accounts

**Pass Criteria:** ✅ Multiple accounts work independently

---

## 🐛 Known Issues

### Expected Issues (Not Implemented Yet):
- ❌ Tapping FAB on Chats screen does nothing (Phase 2 feature)
- ❌ Tapping profile options does nothing (Phase 6 feature)
- ❌ No actual conversations show up (Phase 2 feature)

### Report Any Other Issues:
If you encounter unexpected behavior, note:
1. What you did (steps to reproduce)
2. What you expected to happen
3. What actually happened
4. Any error messages in terminal/console

---

## 📊 Success Criteria

**Phase 1 is complete when:**
- ✅ All 8 tests pass
- ✅ No critical bugs found
- ✅ Auth flow feels smooth and responsive
- ✅ Error messages are clear and helpful
- ✅ Navigation is intuitive

---

## 🎯 What's Next

After Phase 1 is verified working:
- **Phase 2:** Implement messaging functionality
  - User discovery and conversation creation
  - Message sending/receiving
  - Real-time synchronization
  - Offline support

---

## 💡 Testing Tips

1. **Check Terminal Logs:** Useful debug info appears in the Expo terminal
2. **Firebase Console:** Verify users are being created in Authentication section
3. **Clear Cache:** If things seem broken, try `npx expo start --clear`
4. **Restart App:** Some changes require a full app restart

---

## 🔧 Troubleshooting

### "Firebase not initialized" error
- Verify `.env` file exists in `mobile/` directory
- Check all `EXPO_PUBLIC_FIREBASE_*` variables are set
- Restart the Expo dev server

### Can't sign up/sign in
- Check internet connection
- Verify Firebase Authentication is enabled in console
- Check Firebase security rules allow user creation

### App crashes on load
- Check terminal for error messages
- Try clearing cache: `npx expo start --clear`
- Verify SQLite database initializes correctly

---

**Happy Testing! 🚀**

