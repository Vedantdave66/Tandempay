# Prompt 3 of 3 — New Screens + Navigation Wiring

Load `graphify-out/GRAPH_REPORT.md`. Relevant communities: 25 (Mobile Navigation & Notifications), 59 (Mobile Pro Hub).

**Prerequisite:** Prompts 1 and 2 must be complete. This prompt creates the ReceiptScan and SmartSplit placeholder screens, registers them (plus a FriendsHub route) in RootNavigator, and adds a Friends row to ProHubScreen so users can still reach FriendsScreen now that it's off the tab bar.

---

## Files to create

- `mobile/src/screens/ReceiptScanScreen.tsx`
- `mobile/src/screens/SmartSplitScreen.tsx`

## Files to modify

- `mobile/src/navigation/RootNavigator.tsx`
- `mobile/src/screens/ProHubScreen.tsx`

---

## 1. Create ReceiptScanScreen.tsx

```tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { scale, vs, ms } from '../utils/responsive';
import { T } from '../utils/typography';

export default function ReceiptScanScreen({ navigation }: any) {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <ArrowLeft size={22} color={colors.text} />
      </TouchableOpacity>

      <View style={styles.body}>
        <View style={[styles.iconCircle, { backgroundColor: 'rgba(16,185,129,0.14)' }]}>
          <Camera size={48} color="#10B981" strokeWidth={1.5} />
        </View>
        <Text style={[styles.title, T.extrabold, { color: colors.text }]}>Scan Receipt</Text>
        <Text style={[styles.subtitle, T.regular, { color: colors.secondaryText }]}>
          Point your camera at any receipt. AI will parse every item, tax, and tip — then let each roommate claim their share.
        </Text>
        <View style={[styles.badge, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
          <Text style={[styles.badgeText, { color: '#10B981' }]}>Coming Soon</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backBtn: {
    padding: scale(16),
    alignSelf: 'flex-start',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(40),
    gap: vs(16),
    marginTop: -vs(60),
  },
  iconCircle: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(8),
  },
  title: {
    fontSize: ms(32),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: ms(16),
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
  },
  badge: {
    paddingHorizontal: scale(16),
    paddingVertical: vs(6),
    borderRadius: ms(20),
    marginTop: vs(8),
  },
  badgeText: {
    fontSize: ms(13),
    fontWeight: '600',
  },
});
```

---

## 2. Create SmartSplitScreen.tsx

```tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { scale, vs, ms } from '../utils/responsive';
import { T } from '../utils/typography';

export default function SmartSplitScreen({ navigation }: any) {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <ArrowLeft size={22} color={colors.text} />
      </TouchableOpacity>

      <View style={styles.body}>
        <View style={[styles.iconCircle, { backgroundColor: 'rgba(99,102,241,0.14)' }]}>
          <Sparkles size={48} color="#6366F1" strokeWidth={1.5} />
        </View>
        <Text style={[styles.title, T.extrabold, { color: colors.text }]}>Smart Split</Text>
        <Text style={[styles.subtitle, T.regular, { color: colors.secondaryText }]}>
          Describe the expense in plain English — "Thai food for 4, Lakshit didn't have drinks" — and AI figures out the fairest split.
        </Text>
        <View style={[styles.badge, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
          <Text style={[styles.badgeText, { color: '#6366F1' }]}>Coming Soon</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backBtn: {
    padding: scale(16),
    alignSelf: 'flex-start',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(40),
    gap: vs(16),
    marginTop: -vs(60),
  },
  iconCircle: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(8),
  },
  title: {
    fontSize: ms(32),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: ms(16),
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
  },
  badge: {
    paddingHorizontal: scale(16),
    paddingVertical: vs(6),
    borderRadius: ms(20),
    marginTop: vs(8),
  },
  badgeText: {
    fontSize: ms(13),
    fontWeight: '600',
  },
});
```

---

## 3. RootNavigator.tsx — Register 3 new screens

Add these imports alongside the existing screen imports:
```tsx
import ReceiptScanScreen from '../screens/ReceiptScanScreen';
import SmartSplitScreen from '../screens/SmartSplitScreen';
import FriendsScreen from '../screens/FriendsScreen';
```

Inside the authenticated `Stack.Group` (the one with Home, Groups, etc.), add these three entries. Place them near the other modal-style screens:
```tsx
<Stack.Screen
  name="ReceiptScan"
  component={ReceiptScanScreen}
  options={{ presentation: 'modal' }}
/>
<Stack.Screen
  name="SmartSplit"
  component={SmartSplitScreen}
  options={{ presentation: 'modal' }}
/>
<Stack.Screen
  name="FriendsHub"
  component={FriendsScreen}
  options={{ animation: 'slide_from_right' }}
/>
```

---

## 4. ProHubScreen.tsx — Add Friends row

Find the settings/navigation rows in `ProHubScreen` (they look like `{ label: 'Appearance', ... }` or similar). Add a Friends row so users can still access `FriendsScreen` now that it's been removed from the tab bar.

Add `Users2` to the lucide import if not present:
```tsx
import { ..., Users2 } from 'lucide-react-native';
```

In the rows array (or wherever the Appearance/Recurring/Export rows are rendered), add:
```tsx
{ label: 'Friends', icon: Users2, onPress: () => navigation.navigate('FriendsHub') }
```
Place it as the **first** item in the list, above Appearance.

---

## Verification

Run `cd mobile && npx tsc --noEmit`. Expect zero errors.

Test on simulator:
- Tap + FAB → tap "Scan Receipt" → ReceiptScanScreen slides up as a modal, back button dismisses
- Tap + FAB → tap "Smart Split" → SmartSplitScreen slides up, back button dismisses
- Go to Me tab → confirm a "Friends" row is visible → tap it → FriendsScreen slides in from right
- Confirm no navigation crashes or missing route warnings in the Metro console
