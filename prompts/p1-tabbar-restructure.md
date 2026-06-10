# Prompt 1 of 3 — Tab Bar Restructure + Bug Fixes

Load `graphify-out/GRAPH_REPORT.md`. Relevant communities: 25 (Mobile Navigation & Notifications), 16 (UI Primitive Components), 37 (Mobile Theme System).

This prompt fixes two outstanding navbar bugs and restructures the tab bar from 5 tabs to 4 tabs + a center FAB spacer. Do NOT add any FAB button or action menu logic yet — that is a separate prompt.

---

## Files to modify

- `mobile/src/navigation/MainTabNavigator.tsx`
- `mobile/src/components/CustomTabBar.tsx`

---

## 1. MainTabNavigator.tsx — Remove the Friends tab

Remove `FriendsScreen` from the tab navigator entirely. Keep exactly 4 tabs: **Home, Groups, Payments, Me**.

```tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DashboardScreen from '../screens/DashboardScreen';
import PaymentsScreen from '../screens/PaymentsScreen';
import GroupsScreen from '../screens/GroupsScreen';
import ProHubScreen from '../screens/ProHubScreen';
import CustomTabBar from '../components/CustomTabBar';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: true,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarBackground: () => null,
      }}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Groups" component={GroupsScreen} />
      <Tab.Screen name="Payments" component={PaymentsScreen} />
      <Tab.Screen name="Me" component={ProHubScreen} options={{ tabBarLabel: 'Me' }} />
    </Tab.Navigator>
  );
}
```

---

## 2. CustomTabBar.tsx — Three changes

### Change A: Fix `LIMELIGHT_W`
Change line:
```tsx
const LIMELIGHT_W = scale(52);
```
To:
```tsx
const LIMELIGHT_W = scale(46);
```

### Change B: Fix shimmer gray line in light mode
The `LinearGradient` shimmer layer uses the `'transparent'` keyword which React Native interpolates as `rgba(0,0,0,0)`, creating a gray band in light mode.

Replace the entire shimmer `LinearGradient` block:
```tsx
{/* Layer 3: top-edge shimmer */}
<LinearGradient
  colors={[
    isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.60)',
    'transparent',
  ]}
  style={{
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: vs(20),
    borderRadius: ms(36),
  }}
  start={{ x: 0.5, y: 0 }}
  end={{ x: 0.5, y: 1 }}
  pointerEvents="none"
/>
```

With this (dark-mode only, explicit zero alpha):
```tsx
{/* Layer 3: top-edge shimmer — dark mode only to avoid gray artifact */}
{isDark && (
  <LinearGradient
    colors={['rgba(255,255,255,0.07)', 'rgba(22,22,26,0)']}
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: vs(20),
      borderRadius: ms(36),
    }}
    start={{ x: 0.5, y: 0 }}
    end={{ x: 0.5, y: 1 }}
    pointerEvents="none"
  />
)}
```

### Change C: Restructure to 4 tabs + center FAB spacer

Update the `TABS` array to 4 items (removing Friends, moving unread badge to Me):
```tsx
const TABS = [
  { key: 'Home',     icon: Home,   label: 'Home'     },
  { key: 'Groups',   icon: Users,  label: 'Groups'   },
  { key: 'Payments', icon: Wallet, label: 'Payments' },
  { key: 'Me',       icon: User,   label: 'Me'       },
];
```

Update the import line — remove `Bell`, it is no longer needed:
```tsx
import { Home, Users, Wallet, User } from 'lucide-react-native';
```

Move the unread badge from `tab.key === 'Friends'` to `tab.key === 'Me'`:
```tsx
const showBadge = tab.key === 'Me' && unreadCount > 0;
```

Replace the tab row render so it has 5 visual slots — 2 tabs, a center spacer, 2 more tabs:
```tsx
{/* Tab buttons */}
<View style={styles.tabRow}>
  {TABS.slice(0, 2).map((tab, index) => {
    const isFocused = state.index === index;
    const IconComp = tab.icon;
    const showBadge = tab.key === 'Me' && unreadCount > 0;
    return (
      <TouchableOpacity
        key={tab.key}
        style={styles.tabBtn}
        activeOpacity={0.88}
        onLayout={e => handleLayout(e, index)}
        onPress={() => {
          Haptics.selectionAsync();
          moveLimelight(index);
          const event = navigation.emit({
            type: 'tabPress',
            target: state.routes[index].key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(state.routes[index].name);
          }
        }}
      >
        <View style={styles.iconWrap}>
          <IconComp
            size={22}
            color={isFocused ? colors.accent : colors.tabIconDefault}
            strokeWidth={isFocused ? 2.4 : 1.6}
          />
          {showBadge && <View style={styles.badge} />}
        </View>
        <Text style={[styles.label, T.semibold, { color: isFocused ? colors.accent : colors.tabIconDefault }]}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  })}

  {/* Center spacer — FAB will float here in the next prompt */}
  <View style={styles.fabSpacer} />

  {TABS.slice(2).map((tab, sliceIndex) => {
    const index = sliceIndex + 2;
    const isFocused = state.index === index;
    const IconComp = tab.icon;
    const showBadge = tab.key === 'Me' && unreadCount > 0;
    return (
      <TouchableOpacity
        key={tab.key}
        style={styles.tabBtn}
        activeOpacity={0.88}
        onLayout={e => handleLayout(e, index)}
        onPress={() => {
          Haptics.selectionAsync();
          moveLimelight(index);
          const event = navigation.emit({
            type: 'tabPress',
            target: state.routes[index].key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(state.routes[index].name);
          }
        }}
      >
        <View style={styles.iconWrap}>
          <IconComp
            size={22}
            color={isFocused ? colors.accent : colors.tabIconDefault}
            strokeWidth={isFocused ? 2.4 : 1.6}
          />
          {showBadge && <View style={styles.badge} />}
        </View>
        <Text style={[styles.label, T.semibold, { color: isFocused ? colors.accent : colors.tabIconDefault }]}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  })}
</View>
```

Add `fabSpacer` to the StyleSheet:
```tsx
fabSpacer: {
  flex: 1,
},
```

Also update the outer container — rename it to `outerWrap` and move `overflow: 'hidden'` to the inner glass container only. This is needed so the FAB (added in the next prompt) can float above the pill without being clipped.

Change the container JSX structure from a flat `<View style={styles.container}>` to a two-level wrapper:

```tsx
<View style={[
  styles.outerWrap,
  { bottom: insets.bottom + vs(12) },
]}>
  <View style={[
    styles.glassPill,
    { shadowOpacity: isDark ? 0.45 : 0.14 },
  ]}>
    {/* all glass layers + limelight + tabRow go here */}
  </View>
</View>
```

Update the StyleSheet:
- Rename `container` → `glassPill` (keeps `overflow: 'hidden'`, borderRadius, shadow)
- Add `outerWrap`:
```tsx
outerWrap: {
  position: 'absolute',
  left: scale(20),
  right: scale(20),
},
glassPill: {
  borderRadius: ms(36),
  overflow: 'hidden',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowRadius: 24,
  elevation: 16,
},
```
Remove `position: 'absolute'`, `bottom: 0`, `left`, `right` from `glassPill` — those now live on `outerWrap`.

---

## Verification

Run `cd mobile && npx tsc --noEmit`. Expect zero errors. Test on simulator: confirm the tab bar shows 4 tabs with a gap in the center, no shimmer gray line in light mode, and the limelight pill no longer spills over the label area.
