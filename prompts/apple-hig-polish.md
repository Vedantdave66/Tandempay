# TandemPay — Apple HIG Polish Pass

Load `graphify-out/GRAPH_REPORT.md`. This is a premium Apple HIG polish pass across the entire TandemPay app. Read every screen and component file listed below, then apply the changes. Do NOT alter user flows, navigation, features, information architecture, or the Canvas Mode. Do NOT touch: CanvasModeView.tsx, CharacterShape.tsx, Colors.ts, ThemeContext.tsx.

---

## GLOBAL RULES — apply to every file

### TYPOGRAPHY
- Any heading/name/title displaying a person's name or group name: increase fontSize by ~4–6ms points, add letterSpacing -0.6 to -1.0
- Any financial figure (balance, amount, total): increase fontSize by ~4–6ms points, letterSpacing -0.5 to -0.8, ensure T.extrabold
- Section headers (e.g. "Your squads", "Recent activity"): fontSize ms(18)–ms(20), T.extrabold
- Body/meta text: no change unless currently below ms(12)

### WHITESPACE
- All screen-level horizontal padding: minimum scale(20)
- All card internal padding: minimum scale(16) horizontal, vs(14) vertical
- Section header paddingTop: minimum vs(28)
- Between major sections: minimum vs(20) gap

### VISUAL NOISE REDUCTION
- Remove `borderWidth: StyleSheet.hairlineWidth` from ALL interactive controls (icon buttons, toggle buttons, pill buttons). Keep it only on TextInput fields in light mode.
- Remove `borderWidth: 1` from stat pills, count badges, info chips that are purely decorative
- Reduce `letterSpacing` on ALL-CAPS labels from >1.0 to 0.6–0.8 max
- Remove `elevation` values above 8 — cap at 6
- Any `shadowOpacity` above 0.35: reduce to 0.18 max in light mode, 0.28 max in dark mode
- Any `shadowRadius` above 16: reduce by 30%

### CORNER RADII
- Cards/containers: ms(24)–ms(28)
- Buttons (primary): ms(16)
- Buttons (ghost/secondary): ms(16)
- Input fields: ms(14)
- Small chips/badges: ms(10)–ms(12)
- Icon buttons: ms(12)–ms(14)

### TOUCH TARGETS
- Every TouchableOpacity that wraps only an icon: ensure width/height ≥ scale(44)
- Every primary action button: paddingVertical ≥ vs(15)

### PRIMARY vs SECONDARY ACTIONS
- Primary buttons: keep accent background, slightly increase paddingVertical
- Secondary/ghost buttons: reduce borderWidth to StyleSheet.hairlineWidth (not 1.5), use secondaryText color for text and icon
- Destructive actions: use colors.danger, not a bright red

---

## APPLE-STYLE ANIMATIONS

Apply these conventions to ALL Animated usages across every file.

### SPRING PARAMETERS (replace any existing spring params with these)
- Standard UI spring: `damping: 26, stiffness: 280, useNativeDriver: true`
- Gentle spring (modals, sheets sliding up): `damping: 22, stiffness: 200, useNativeDriver: true`
- Snappy spring (button feedback, tab bar): `damping: 20, stiffness: 320, useNativeDriver: true`

### TIMING ANIMATIONS
- Max duration: 320ms for transitions, 220ms for micro-interactions
- Replace any `duration > 380` with 320 max (except the splash screen sequence — keep those as-is)
- Replace linear easing with `Easing.out(Easing.cubic)` from react-native — import Easing where needed
- Never use `Animated.timing` with no easing specified — always add `easing: Easing.out(Easing.cubic)`

### PRESS FEEDBACK
- All `<TouchableOpacity>`: change `activeOpacity` from 0.88 → 0.70
- All primary CTA buttons (Sign In, Create Group, Settle, etc.): add press scale animation — wrap in `Animated.View` with `transform: [{ scale: pressAnim }]` where pressAnim springs to 0.97 on `onPressIn` and back to 1.0 on `onPressOut` using snappy spring params. Only on primary CTAs, not every touchable.

### MODALS AND SHEETS
- Any bottom sheet or modal that slides up: ensure it uses spring (not timing) with gentle spring params
- Initial translateY should start at 500 (off-screen), not 300 or 280

### LIST ITEM ENTRANCE
- On screens where a list loads from API (DashboardScreen recent activity, GroupDetailScreen expenses, PaymentsScreen): add a staggered fade-in on first load.
- Each item: `Animated.timing(anim, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true })`
- Staggered by 40ms per item, starting after data loads. Cap stagger at 5 items (items 6+ appear instantly).
- Store entrance animValues in a `useRef` array sized to the data length.

### TAB BAR
- The existing limelight spring in CustomTabBar: update to `tension: 200, friction: 28` for a more settled feel.

---

## FILE-SPECIFIC CHANGES

### mobile/src/components/SplashScreen.tsx

**FIX THE GLOW** — the current `styles.glow` has `backgroundColor: LOGO_GREEN` which renders as a solid green circle. Replace with layered radial glow:

1. Replace the single `glowOpacity` ref with four separate Animated.Values:
```tsx
const glowLayers = useRef([0.22, 0.13, 0.08, 0.04].map(
  () => new Animated.Value(0)
)).current;
```

2. Replace `glowAnim` with a parallel animation driving each layer to its max:
```tsx
const glowAnim = Animated.parallel(
  glowLayers.map((anim, i) =>
    Animated.timing(anim, {
      toValue: [0.22, 0.13, 0.08, 0.04][i],
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    })
  )
);
```

3. Replace the single glow `<Animated.View>` in JSX with four concentric circles:
```tsx
{[140, 260, 380, 500].map((size, i) => (
  <Animated.View
    key={i}
    pointerEvents="none"
    style={{
      position: 'absolute',
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: LOGO_GREEN,
      opacity: glowLayers[i],
    }}
  />
))}
```

4. Remove the old `glow` entry from StyleSheet entirely.

Also apply Apple animation polish to the splash sequence:
- `dividerAnim` spring: `damping: 18, stiffness: 220`
- `payAnim` timing duration: 300
- `letterAnimations` timing duration: 240
- `heartbeatAnim` springs: `damping: 10, stiffness: 240`

---

### mobile/src/screens/DashboardScreen.tsx
- heroName: ms(26)→ms(32), letterSpacing -1.0
- statPillValue: ms(20)→ms(26), letterSpacing -0.8
- statPillLabel letterSpacing: 1.1→0.6
- statPill: remove borderWidth and borderColor
- bellButton: remove borderWidth
- countBadge: remove borderWidth
- heroCard borderRadius: ms(24)→ms(28), padding scale(20)→scale(24)
- heroTop marginBottom: vs(16)→vs(20)
- sectionHeader paddingTop: vs(26)→vs(32)
- newButton shadow: shadowOpacity 0.44→0.22, shadowRadius 12→8
- recent activity card borderRadius: ms(20)→ms(26), soften shadow per global rules
- activity row icon container borderRadius: ms(12)→ms(16)
- activity row dividers: `isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'`
- Add staggered list entrance animation to recent activity rows (per global animation rules)

---

### mobile/src/components/GroupCard.tsx
**KEEP all characters, cluster layout, gradients, and tilts unchanged.**
- card TouchableOpacity shadow: shadowOpacity `isDark?0:0.14`→`isDark?0:0.07`, shadowRadius 18→10, shadowOffset.height 8→4
- titlePill shadow: shadowOpacity `isDark?0:0.25`→`isDark?0:0.10`
- clusterRow paddingTop: vs(20)→vs(24)
- stats paddingHorizontal: scale(22)→scale(24), paddingBottom: vs(22)→vs(26)
- card border: `borderWidth: 0` in dark mode, hairline in light mode only

---

### mobile/src/screens/GroupDetailScreen.tsx
- groupName: ms(22)→ms(26), letterSpacing -0.8
- rowAmount: ms(17)→ms(20), letterSpacing -0.6
- balanceChipValue: ms(18)→ms(22), letterSpacing -0.6
- rowTitle: ms(15)→ms(16)
- headerGradient: remove borderBottomWidth entirely
- row: remove hairline border, add soft shadow per global rules
- row borderRadius: ms(18)→ms(20)
- scrollContent padding: scale(16)→scale(20), gap vs(10)→vs(14)
- primaryBtn borderRadius: ms(13)→ms(16), paddingVertical vs(12)→vs(15)
- ghostBtn borderRadius: ms(13)→ms(16), paddingVertical vs(12)→vs(15), borderWidth hairlineWidth
- tabBtn paddingVertical: vs(12)→vs(15)
- canvasToggleBtn borderRadius: ms(11)→ms(14)
- Add staggered entrance on expense list load (per global animation rules)

---

### mobile/src/screens/SettleUpScreen.tsx
- Any borderWidth 1 → StyleSheet.hairlineWidth
- shadowOpacity > 0.35: reduce per global rules
- Copy field rows: paddingVertical +vs(2), borderRadius ms(12)→ms(16)
- Primary CTA: paddingVertical vs(17), borderRadius ms(16)

---

### mobile/src/screens/LoginScreen.tsx + RegisterScreen.tsx
- TextInput height: vs(52), borderRadius ms(14)
- Primary button: paddingVertical vs(17), borderRadius ms(16), fontSize ms(16), letterSpacing 0.2
- Form card: dark mode remove borderWidth, light mode keep hairline
- Password strength bar borderRadius: ms(4)→ms(8)

---

### mobile/src/screens/LandingScreen.tsx + ForgotPasswordScreen.tsx
- Primary CTA: paddingVertical ≥ vs(17), borderRadius ms(16)
- Feature row/card borders: remove in dark mode
- shadowOpacity > 0.3: reduce per global rules

---

### mobile/src/screens/AddExpenseScreen.tsx
- All TextInput: borderRadius ms(14), height vs(52)
- Amount field: fontSize ms(28)+, T.extrabold, letterSpacing -1.0
- Primary submit: paddingVertical vs(17), borderRadius ms(16)

---

### mobile/src/screens/CreateGroupScreen.tsx
- Inputs and buttons: same as AddExpenseScreen
- Member chips: borderRadius ms(20), remove borderWidth in dark mode

---

### mobile/src/screens/PaymentsScreen.tsx
- Payment rows: borderRadius ms(20), no hairline in dark, soft shadow
- Amount figures: T.extrabold, letterSpacing -0.5
- Section headers: fontSize ms(18), T.extrabold
- Add staggered entrance animation

---

### mobile/src/screens/FriendsScreen.tsx
- Friend rows: remove hairline in dark, soft shadow
- Action buttons: ≥ scale(44) touch targets

---

### mobile/src/screens/NotificationsScreen.tsx + ActivityScreen.tsx + PendingRequestsScreen.tsx
- Rows: remove hairline dividers, use background differentiation instead
- Icon containers: borderRadius ms(16)
- Time labels: colors.faintText, fontSize ms(11)
- Add staggered entrance animation

---

### mobile/src/screens/ProHubScreen.tsx
- Feature rows: borderRadius ms(22), remove borderWidth in dark
- CTA buttons: paddingVertical vs(15), borderRadius ms(16)
- Pro badge: reduce shadow, borderRadius ms(10)

---

### mobile/src/screens/GroupsScreen.tsx
- Section header spacing matches DashboardScreen
- Empty state: paddingVertical vs(32)

---

### mobile/src/components/CustomTabBar.tsx
- tabRow paddingTop: vs(10)→vs(13), paddingBottom vs(4)→vs(6)
- tabBtn: add minHeight scale(44)
- label letterSpacing: 0→0.3
- limelightCone height: vs(52)→vs(48)
- limelight spring: tension 200, friction 28

---

## VERIFICATION
1. Run `npx tsc --noEmit` from `mobile/` — fix every error before committing
2. Confirm no file imports reanimated or BlurView
3. Confirm GroupCard still renders CharacterShape cluster unchanged
4. Confirm SplashScreen glow is 4 concentric circles with no solid-fill disc
5. Commit: `polish: Apple HIG pass — all screens + animations`
