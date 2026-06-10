# Prompt 2 of 3 — FAB Button + Action Menu

Load `graphify-out/GRAPH_REPORT.md`. Relevant communities: 25 (Mobile Navigation & Notifications), 16 (UI Primitive Components), 37 (Mobile Theme System).

**Prerequisite:** Prompt 1 (tab bar restructure) must be complete. This prompt adds the floating + FAB above the center spacer and the spring-animated action menu Modal. The 4-tab layout, `outerWrap`/`glassPill` container split, and `fabSpacer` style must already exist.

---

## File to modify

- `mobile/src/components/CustomTabBar.tsx`

---

## Changes

### 1. New imports

Add to the existing import block:
```tsx
import { Home, Users, Wallet, User, Plus, Camera, Sparkles, ChevronRight } from 'lucide-react-native';
import { Modal } from 'react-native';
import { initialWindowMetrics } from 'react-native-safe-area-context';
```
(`Animated`, `StyleSheet`, etc. are already imported — do not duplicate.)

### 2. New state + animated values

Add inside the component, after the existing `limelightX` / `ready` refs:
```tsx
const [menuOpen, setMenuOpen] = useState(false);
const menuAnim = useRef(new Animated.Value(0)).current;
const fabRotateAnim = useRef(new Animated.Value(0)).current;
const safeBottom = initialWindowMetrics?.insets.bottom ?? 34;
```

### 3. Open / close helpers

Add these two functions inside the component:
```tsx
const openMenu = () => {
  setMenuOpen(true);
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  Animated.parallel([
    Animated.spring(menuAnim, { toValue: 1, useNativeDriver: true, damping: 22, stiffness: 280 }),
    Animated.spring(fabRotateAnim, { toValue: 1, useNativeDriver: true, damping: 22, stiffness: 280 }),
  ]).start();
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
```

### 4. Interpolations

Add before the return statement:
```tsx
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

// Menu card bottom = safe bottom + tab bar offset + tab bar height + gap
const menuBottom = safeBottom + vs(12) + vs(72) + vs(12);
```

### 5. Return JSX — wrap in Fragment and add Modal + FAB

Change the return to this structure:

```tsx
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
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: 'rgba(0,0,0,0.38)', opacity: menuAnim },
          ]}
        />
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
          style={[styles.menuRow, styles.menuRowDivider, {
            borderBottomColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
          }]}
          activeOpacity={0.75}
          onPress={() => closeMenu(() => navigation.navigate('ReceiptScan'))}
        >
          <View style={[styles.menuIconBox, { backgroundColor: 'rgba(16,185,129,0.16)' }]}>
            <Camera size={20} color="#10B981" strokeWidth={2} />
          </View>
          <View style={styles.menuTextCol}>
            <Text style={[styles.menuTitle, { color: isDark ? '#F8FAFC' : '#020617' }]}>Scan Receipt</Text>
            <Text style={[styles.menuSub, { color: isDark ? '#94A3B8' : '#64748B' }]}>OCR auto-fills items & amounts</Text>
          </View>
          <ChevronRight size={16} color={isDark ? '#4B5563' : '#94A3B8'} />
        </TouchableOpacity>

        {/* Row 2: Smart Split */}
        <TouchableOpacity
          style={[styles.menuRow, styles.menuRowDivider, {
            borderBottomColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
          }]}
          activeOpacity={0.75}
          onPress={() => closeMenu(() => navigation.navigate('SmartSplit'))}
        >
          <View style={[styles.menuIconBox, { backgroundColor: 'rgba(99,102,241,0.16)' }]}>
            <Sparkles size={20} color="#6366F1" strokeWidth={2} />
          </View>
          <View style={styles.menuTextCol}>
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
          <View style={[styles.menuIconBox, { backgroundColor: 'rgba(245,158,11,0.16)' }]}>
            <Plus size={20} color="#F59E0B" strokeWidth={2} />
          </View>
          <View style={styles.menuTextCol}>
            <Text style={[styles.menuTitle, { color: isDark ? '#F8FAFC' : '#020617' }]}>Add Expense</Text>
            <Text style={[styles.menuSub, { color: isDark ? '#94A3B8' : '#64748B' }]}>Choose a group and enter manually</Text>
          </View>
          <ChevronRight size={16} color={isDark ? '#4B5563' : '#94A3B8'} />
        </TouchableOpacity>
      </Animated.View>
    </Modal>

    {/* ── Existing outerWrap + glassPill (unchanged from Prompt 1) ── */}
    <View style={[styles.outerWrap, { bottom: insets.bottom + vs(12) }]}>
      <View style={[styles.glassPill, { shadowOpacity: isDark ? 0.45 : 0.14 }]}>
        {/* ... all existing glass layers, limelight, tabRow ... */}
      </View>

      {/* FAB — floats above glass pill */}
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
```

**Important:** keep all the existing glass layers, limelight, and tab row JSX exactly as they are inside `glassPill`. Only add the FAB `Animated.View` as a sibling to `glassPill` inside `outerWrap`. The `<>...</>` Fragment wraps both the Modal and the outerWrap.

### 6. New StyleSheet entries

Add these to the existing `StyleSheet.create({...})`:
```tsx
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
menuRowDivider: {
  borderBottomWidth: StyleSheet.hairlineWidth,
},
menuIconBox: {
  width: scale(44),
  height: scale(44),
  borderRadius: ms(14),
  alignItems: 'center',
  justifyContent: 'center',
},
menuTextCol: {
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
```

---

## Verification

Run `cd mobile && npx tsc --noEmit`. Expect zero errors.

Test on simulator:
- Tap the + FAB → menu card springs up from below, backdrop darkens, FAB rotates to ×
- Tap backdrop → menu closes with spring, FAB rotates back to +
- Tap a menu row → menu closes, then navigates (Groups for Add Expense; ReceiptScan / SmartSplit will 404 until Prompt 3 registers those screens — that's expected)
- Haptics fire on open (medium) and close (light)
