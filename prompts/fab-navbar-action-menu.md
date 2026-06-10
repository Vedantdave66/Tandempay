# + FAB Navbar Action Menu

## Overview
Redesign the floating tab bar from 5 equal tabs to a 4-tab + centered FAB layout. The FAB opens an animated action menu with three quick actions. Also fixes two outstanding navbar bugs (shimmer gray line + limelight size).

---

## Files to modify
- `mobile/src/navigation/MainTabNavigator.tsx`
- `mobile/src/components/CustomTabBar.tsx`
- `mobile/src/navigation/RootNavigator.tsx`
- `mobile/src/screens/ProHubScreen.tsx`

## Files to create
- `mobile/src/screens/ReceiptScanScreen.tsx`
- `mobile/src/screens/SmartSplitScreen.tsx`

---

## 1. MainTabNavigator.tsx

Remove the Friends tab. Keep only 4 tabs: Home, Groups, Payments, Me.

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

## 2. CustomTabBar.tsx — Full replacement

Replace the entire file with the following. Key changes:
- 4 tabs (Home, Groups, Payments, Me) with a center spacer for the FAB
- Outer wrapper has `overflow: 'visible'`; inner glass pill keeps `overflow: 'hidden'`
- FAB is `position: 'absolute'` inside the outer wrapper, floats above the pill
- FAB toggles a Modal-based action menu with spring animations
- Unread notification badge moves from Friends → Me
- Fixes shimmer gray line: no more `'transparent'` keyword — use explicit rgba zero
- Fixes limelight size: `LIMELIGHT_W = scale(46)`

```tsx
import React, { useState, useRef, useCallback } from 'react';
import {
  View, TouchableOpacity, Text, StyleSheet,
  Animated, LayoutChangeEvent, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { initialWindowMetrics } from 'react-native-safe-area-context';
import { Home, Users, Wallet, User, Plus, Camera, Sparkles, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import { scale, vs, ms } from '../utils/responsive';
import { T } from '../utils/typography';

const TABS = [
  { key: 'Home',     icon: Home,   label: 'Home'     },
  { key: 'Groups',   icon: Users,  label: 'Groups'   },
  { key: 'Payments', icon: Wallet, label: 'Payments' },
  { key: 'Me',       icon: User,   label: 'Me'       },
];

const LIMELIGHT_W = scale(46);

export default function CustomTabBar({ state, navigation }: any) {
  const { colors, isDark } = useTheme();
  const { unreadCount } = useNotifications();
  const insets = useSafeAreaInsets();
  const safeBottom = initialWindowMetrics?.insets.bottom ?? 34;

  // Limelight
  const tabCenters = useRef<number[]>([]);
  const limelightX = useRef(new Animated.Value(-999)).current;
  const [ready, setReady] = useState(false);

  // FAB menu
  const [menuOpen, setMenuOpen] = useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current;
  const fabRotateAnim = useRef(new Animated.Value(0)).current;

  const moveLimelight = useCallback((index: number) => {
    const cx = tabCenters.current[index];
    if (cx === undefined) return;
    Animated.spring(limelightX, {
      toValue: cx - LIMELIGHT_W / 2,
      useNativeDriver: true,
      tension: 200,
      friction: 28,
    }).start();
    if (!ready) setReady(true);
  }, [limelightX, ready]);

  const handleLayout = (e: LayoutChangeEvent, index: number) => {
    const { x, width } = e.nativeEvent.layout;
    tabCenters.current[index] = x + width / 2;
    if (index === state.index) moveLimelight(index);
  };

  const openMenu = () => {
    setMenuOpen(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.spring(menuAnim, { toValue: 1, useNativeDriver: true, damping: 22, stiffness: 280 }).start();
    Animated.spring(fabRotateAnim, { toValue: 1, useNativeDriver: true, damping: 22, stiffness: 280 }).start();
  };

  const closeMenu = (callback?: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.spring(menuAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 280 }),
      Animated.spring(fabRotateAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 280 }),
    ]).start(() => {
      setMenuOpen(false);
      callback?.();
    });
  };

  const fabRotateInterp = fabRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const menuTranslateY = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [vs(20), 0],
  });
  const menuScale = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.0],
  });

  // Tab bar bottom position (same as outerWrap)
  const tabBarBottom = insets.bottom + vs(12);
  // Tab bar approximate height
  const tabBarHeight = vs(13) + 22 + vs(3) + ms(10) + vs(6); // paddingTop + icon + gap + label + paddingBottom ≈ 72
  // Menu sits just above the tab bar
  const menuBottom = safeBottom + vs(12) + tabBarHeight + vs(12);

  const renderTabBtn = (navIndex: number, layoutIndex: number) => {
    const tab = TABS[navIndex];
    const isFocused = state.index === navIndex;
    const IconComp = tab.icon;
    const showBadge = tab.key === 'Me' && unreadCount > 0;

    return (
      <TouchableOpacity
        key={tab.key}
        style={styles.tabBtn}
        activeOpacity={0.88}
        onLayout={e => handleLayout(e, navIndex)}
        onPress={() => {
          Haptics.selectionAsync();
          moveLimelight(navIndex);
          const event = navigation.emit({
            type: 'tabPress',
            target: state.routes[navIndex].key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(state.routes[navIndex].name);
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
  };

  return (
    <>
      {/* ── Action Menu Modal ── */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="none"
        onRequestClose={() => closeMenu()}
        statusBarTranslucent
      >
        {/* Backdrop */}
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={() => closeMenu()}
        >
          <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.38)', opacity: menuAnim }]} />
        </TouchableOpacity>

        {/* Menu card */}
        <Animated.View
          style={[
            styles.menuCard,
            {
              bottom: menuBottom,
              backgroundColor: isDark ? 'rgba(22,22,26,0.97)' : 'rgba(248,248,252,0.97)',
              borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.85)',
              transform: [{ translateY: menuTranslateY }, { scale: menuScale }],
              opacity: menuAnim,
            },
          ]}
        >
          {/* Row 1: Scan Receipt */}
          <TouchableOpacity
            style={[styles.menuRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }]}
            activeOpacity={0.75}
            onPress={() => closeMenu(() => navigation.navigate('ReceiptScan'))}
          >
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(16,185,129,0.16)' }]}>
              <Camera size={20} color="#10B981" strokeWidth={2} />
            </View>
            <View style={styles.menuText}>
              <Text style={[styles.menuTitle, { color: isDark ? '#F8FAFC' : '#020617' }]}>Scan Receipt</Text>
              <Text style={[styles.menuSub, { color: isDark ? '#94A3B8' : '#64748B' }]}>OCR auto-fills items & amounts</Text>
            </View>
            <ChevronRight size={16} color={isDark ? '#4B5563' : '#94A3B8'} />
          </TouchableOpacity>

          {/* Row 2: Smart Split */}
          <TouchableOpacity
            style={[styles.menuRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }]}
            activeOpacity={0.75}
            onPress={() => closeMenu(() => navigation.navigate('SmartSplit'))}
          >
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(99,102,241,0.16)' }]}>
              <Sparkles size={20} color="#6366F1" strokeWidth={2} />
            </View>
            <View style={styles.menuText}>
              <Text style={[styles.menuTitle, { color: isDark ? '#F8FAFC' : '#020617' }]}>Smart Split</Text>
              <Text style={[styles.menuSub, { color: isDark ? '#94A3B8' : '#64748B' }]}>AI splits from your description</Text>
            </View>
            <ChevronRight size={16} color={isDark ? '#4B5563' : '#94A3B8'} />
          </TouchableOpacity>

          {/* Row 3: Add Expense */}
          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.75}
            onPress={() => closeMenu(() => navigation.navigate('Groups'))}
          >
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(245,158,11,0.16)' }]}>
              <Plus size={20} color="#F59E0B" strokeWidth={2} />
            </View>
            <View style={styles.menuText}>
              <Text style={[styles.menuTitle, { color: isDark ? '#F8FAFC' : '#020617' }]}>Add Expense</Text>
              <Text style={[styles.menuSub, { color: isDark ? '#94A3B8' : '#64748B' }]}>Choose a group and enter manually</Text>
            </View>
            <ChevronRight size={16} color={isDark ? '#4B5563' : '#94A3B8'} />
          </TouchableOpacity>
        </Animated.View>
      </Modal>

      {/* ── Navbar + FAB wrapper ── */}
      <View style={[styles.outerWrap, { bottom: tabBarBottom }]}>
        {/* Glass pill */}
        <View style={[
          styles.glassPill,
          { shadowOpacity: isDark ? 0.45 : 0.14 },
        ]}>
          {/* Layer 1: frosted fill */}
          <View style={[StyleSheet.absoluteFillObject, {
            backgroundColor: isDark ? 'rgba(22,22,26,0.86)' : 'rgba(248,248,252,0.86)',
            borderRadius: ms(36),
          }]} />

          {/* Layer 2: glass ring */}
          <View style={[StyleSheet.absoluteFillObject, {
            borderRadius: ms(36),
            borderWidth: 0.8,
            borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.85)',
          }]} />

          {/* Layer 3: top shimmer — dark mode only (avoids gray artifact from transparent interpolation) */}
          {isDark && (
            <LinearGradient
              colors={['rgba(255,255,255,0.07)', 'rgba(22,22,26,0)']}
              style={{
                position: 'absolute',
                top: 0, left: 0, right: 0,
                height: vs(20),
                borderRadius: ms(36),
              }}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              pointerEvents="none"
            />
          )}

          {/* Limelight pill */}
          <Animated.View
            style={[
              styles.limelightPill,
              {
                backgroundColor: isDark ? colors.accent + '28' : colors.accent + '1F',
                shadowColor: colors.accent,
                shadowOpacity: isDark ? 0.55 : 0.35,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 0 },
                transform: [{ translateX: limelightX }],
              },
              !ready && { opacity: 0 },
            ]}
          />

          {/* Tab row: [tab][tab][spacer][tab][tab] */}
          <View style={styles.tabRow}>
            {renderTabBtn(0, 0)}
            {renderTabBtn(1, 1)}
            <View style={styles.fabSpacer} />
            {renderTabBtn(2, 2)}
            {renderTabBtn(3, 3)}
          </View>
        </View>

        {/* FAB — floats above pill */}
        <Animated.View
          style={[
            styles.fab,
            {
              backgroundColor: colors.accent,
              shadowColor: colors.accent,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.fabInner}
            activeOpacity={0.85}
            onPress={menuOpen ? () => closeMenu() : openMenu}
          >
            <Animated.View style={{ transform: [{ rotate: fabRotateInterp }] }}>
              <Plus size={24} color="#FFFFFF" strokeWidth={2.4} />
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
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
  limelightPill: {
    position: 'absolute',
    top: vs(9),
    width: LIMELIGHT_W,
    height: scale(34),
    borderRadius: ms(17),
    zIndex: 1,
  },
  tabRow: {
    flexDirection: 'row',
    paddingTop: vs(13),
    paddingBottom: vs(6),
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: vs(3),
    minHeight: scale(44),
  },
  fabSpacer: {
    flex: 1,
  },
  iconWrap: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: '#E05252',
    zIndex: 3,
  },
  label: {
    fontSize: ms(10),
    letterSpacing: 0.3,
  },
  fab: {
    position: 'absolute',
    bottom: vs(6),
    alignSelf: 'center',
    width: scale(54),
    height: scale(54),
    borderRadius: scale(27),
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 14,
    zIndex: 20,
  },
  fabInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: scale(27),
  },
  menuCard: {
    position: 'absolute',
    left: scale(20),
    right: scale(20),
    borderRadius: ms(24),
    borderWidth: 0.8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.20,
    shadowRadius: 32,
    elevation: 24,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: vs(14),
    paddingHorizontal: scale(16),
    gap: scale(14),
  },
  menuIcon: {
    width: scale(44),
    height: scale(44),
    borderRadius: ms(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    flex: 1,
    gap: vs(2),
  },
  menuTitle: {
    fontSize: ms(15),
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  menuSub: {
    fontSize: ms(12),
  },
});
```

---

## 3. Create ReceiptScanScreen.tsx

```tsx
// mobile/src/screens/ReceiptScanScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Camera, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { scale, vs, ms } from '../utils/responsive';
import { T } from '../utils/typography';

export default function ReceiptScanScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();

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
        <View style={[styles.pill, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
          <Text style={[styles.pillText, { color: '#10B981' }]}>Coming Soon</Text>
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
  pill: {
    paddingHorizontal: scale(16),
    paddingVertical: vs(6),
    borderRadius: ms(20),
    marginTop: vs(8),
  },
  pillText: {
    fontSize: ms(13),
    fontWeight: '600',
  },
});
```

---

## 4. Create SmartSplitScreen.tsx

```tsx
// mobile/src/screens/SmartSplitScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Sparkles, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { scale, vs, ms } from '../utils/responsive';
import { T } from '../utils/typography';

export default function SmartSplitScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();

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
        <View style={[styles.pill, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
          <Text style={[styles.pillText, { color: '#6366F1' }]}>Coming Soon</Text>
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
  pill: {
    paddingHorizontal: scale(16),
    paddingVertical: vs(6),
    borderRadius: ms(20),
    marginTop: vs(8),
  },
  pillText: {
    fontSize: ms(13),
    fontWeight: '600',
  },
});
```

---

## 5. RootNavigator.tsx — Register new screens + FriendsHub

Add these imports:
```tsx
import ReceiptScanScreen from '../screens/ReceiptScanScreen';
import SmartSplitScreen from '../screens/SmartSplitScreen';
import FriendsScreen from '../screens/FriendsScreen';
```

Inside the authenticated `Stack.Group`, add these three new Stack.Screen entries alongside the existing ones:
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

## 6. ProHubScreen.tsx — Add Friends row

Find the settings/menu rows in ProHubScreen (the list of navigation rows like Appearance, Recurring, etc.). Add a Friends row so users can still reach FriendsScreen now that it's off the tab bar.

Find where other nav rows are defined (look for `label: 'Appearance'` or similar) and add:
```tsx
{ label: 'Friends', icon: Users2, onPress: () => navigation.navigate('FriendsHub') }
```
Import `Users2` from `lucide-react-native` if not already imported. Place the Friends row near the top of the list, before Appearance.

---

## Final step

Run `cd mobile && npx tsc --noEmit` and fix any TypeScript errors. Common ones to watch for:
- `navigation` prop type on new screens — use `any` if needed for now
- Missing route name in navigation type declarations (if any exist)
