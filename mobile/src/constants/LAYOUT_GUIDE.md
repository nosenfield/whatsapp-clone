# Layout & Safe Area Guide

**Universal configuration for iOS safe areas and spacing**

---

## Safe Area Constants

All safe area values are stored in `src/constants/layout.ts` and automatically exported through `src/constants/index.ts`.

### Available Constants

```typescript
import { SAFE_AREA, getBottomSafeArea, SPACING, HEIGHTS } from '../constants';
```

#### SAFE_AREA
- `SAFE_AREA.TOP` - Top safe area (status bar) = 44px on iOS
- `SAFE_AREA.BOTTOM` - Bottom safe area (home indicator) = 34px on iOS X+
- `SAFE_AREA.BOTTOM_LEGACY` - Bottom safe area for older iPhones = 20px

#### Helper Functions
- `getBottomSafeArea()` - Returns the appropriate bottom padding for the device

#### SPACING
Standard spacing values for consistent UI:
- `XS: 4px`
- `SM: 8px`
- `MD: 16px`
- `LG: 24px`
- `XL: 32px`
- `XXL: 40px`

#### HEIGHTS
Common component heights:
- `TAB_BAR: 49px`
- `HEADER: 44px`
- `INPUT: 40px`
- `BUTTON: 50px`

---

## Usage Examples

### Example 1: Bottom Input/Search Bar
For components at the bottom of the screen (like message input):

```typescript
import { getBottomSafeArea } from '../constants/layout';

<View style={[styles.container, { paddingBottom: getBottomSafeArea() + 8 }]}>
  <TextInput placeholder="Type message..." />
</View>
```

### Example 2: Full Screen Container
For screens that need safe area on all sides:

```typescript
import { SAFE_AREA } from '../constants';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: SAFE_AREA.TOP,
    paddingBottom: SAFE_AREA.BOTTOM,
  },
});
```

### Example 3: Using Spacing Constants
```typescript
import { SPACING } from '../constants';

const styles = StyleSheet.create({
  card: {
    padding: SPACING.MD,      // 16px
    marginBottom: SPACING.SM,  // 8px
    gap: SPACING.XS,          // 4px
  },
});
```

### Example 4: List with Safe Bottom Padding
```typescript
import { getBottomSafeArea } from '../constants';

<FlatList
  data={items}
  contentContainerStyle={{
    paddingBottom: getBottomSafeArea() + 16
  }}
/>
```

---

## Design Rules

### ✅ DO:
1. **Always leave space for status bar** - Use `SAFE_AREA.TOP` or let the header handle it
2. **Always respect home indicator** - Use `getBottomSafeArea()` for bottom elements
3. **Use spacing constants** - Consistent spacing across the app
4. **Test on different devices** - iPhone SE, iPhone 14, iPhone 14 Pro Max

### ❌ DON'T:
1. **Don't hardcode pixel values** - Use constants instead
2. **Don't ignore safe areas** - Content will overlap system UI
3. **Don't mix spacing values** - Stick to the SPACING constants
4. **Don't assume all iPhones are the same** - Use helper functions

---

## Where Safe Areas Are Applied

✅ **Already Applied:**
- `app/new-conversation.tsx` - Search bar at bottom
- `src/components/MessageInput.tsx` - Message input at bottom

⏳ **Apply to These Screens:**
- Any new bottom sheets or modals
- Any custom headers or footers
- Any floating action buttons
- Any full-screen overlays

---

## Testing Checklist

When adding a new screen, verify:
- [ ] Top content doesn't hide under status bar
- [ ] Bottom content doesn't hide under home indicator
- [ ] Keyboard doesn't cover input fields
- [ ] Works on iPhone SE (smallest screen)
- [ ] Works on iPhone 14 Pro Max (largest screen)
- [ ] Works on iPhone X+ (with home indicator)

---

## Platform Differences

**iOS:**
- Status bar: 44px
- Home indicator: 34px (X and newer)
- Tab bar: 49px

**Android:**
- Safe areas handled by system
- Constants return 0 on Android
- Use `react-native-safe-area-context` for advanced scenarios

---

**Reference:** All constants defined in `src/constants/layout.ts`

