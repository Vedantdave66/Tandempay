# TandemPay Design Specification

**Source of truth for all design decisions in the TandemPay mobile app.**  
Every value documented here is derived directly from source code as of June 2026.  
When in doubt, the code is authoritative; this doc should be updated to match.

---

## Table of Contents

1. [Color System](#1-color-system)
2. [Typography](#2-typography)
3. [Spacing Scale](#3-spacing-scale)
4. [Border Radius](#4-border-radius)
5. [Animation & Motion](#5-animation--motion)
6. [Character System](#6-character-system)
7. [Component Patterns](#7-component-patterns)
8. [Screen Layout Rules](#8-screen-layout-rules)
9. [Icon Library](#9-icon-library)
10. [Fable-Originated Design Decisions](#10-fable-originated-design-decisions)

---

## 1. Color System

### Architecture

The color system is a three-layer stack:

1. **Static palette** — `mobile/src/constants/Colors.ts`: `Colors.light` and `Colors.dark` define base semantic tokens.
2. **Accent presets** — `ACCENT_PRESETS` in the same file: 6 named themes, each with light/dark accent hex, glow arrays, hero gradient, and card gradient.
3. **Runtime merge** — `mobile/src/context/ThemeContext.tsx`: `ThemeProvider` blends `Colors[theme]` with the active `ACCENT_PRESETS[accentKey]` and exposes the result as `colors` via `useTheme()`.

Consumers always call `const { colors, isDark } = useTheme()` — never import `Colors` directly.

### Semantic Tokens (forest/dark — the app default)

| Token | Light | Dark |
|---|---|---|
| `text` | `#020617` | `#F8FAFC` |
| `secondaryText` | `#475569` | `#94A3B8` |
| `tertiaryText` | `#94A3B8` | `#64748B` |
| `faintText` | `#94A3B8` | `#6B7280` |
| `background` | `#F1F5F9` | `#0A0D0B` |
| `surface` | `#FFFFFF` | `#141815` |
| `surfaceHover` | `#F8FAFC` | `#1A1E1B` |
| `border` | `#E2E8F0` | `rgba(255,255,255,0.08)` |
| `accent` | preset (forest light: `#16A34A`) | preset (forest dark: `#27E06A`) |
| `accentDark` | `#15803D` | `#062B16` |
| `accentLight` | `#DCFCE7` | `rgba(39,224,106,0.12)` |
| `accentBg` | `accent + '18'` (alpha) | `accent + '1F'` |
| `accentBgFaint` | `accent + '0F'` | `accent + '0F'` |
| `tint` | (same as accent) | (same as accent) |
| `tabIconDefault` | `#94A3B8` | `#4B5563` |
| `tabIconSelected` | (same as accent) | (same as accent) |
| `primary` | `#020617` | `#F8FAFC` |
| `danger` | `#DC2626` | `#EF4444` |
| `dangerBg` | `#FEE2E2` | `rgba(239,68,68,0.14)` |
| `warning` | `#F59E0B` | `#F59E0B` |
| `gold` | `#B45309` | `#F2C200` |
| `warningBg` | `#FEF3C7` | `rgba(242,194,0,0.14)` |
| `warningBright` | `#B45309` | `#F2C200` |
| `shadow` | `rgba(15,40,30,0.06)` | `rgba(0,0,0,0.4)` |
| `cardShadow` | `rgba(15,40,30,0.10)` | `rgba(0,0,0,0.5)` |
| `indigo` | `#6366F1` | `#818CF8` |

### Dynamic Tokens (from accent preset + theme)

| Token | Derivation |
|---|---|
| `heroGradient` | `preset.heroGradLight` or `preset.heroGradDark` — 3-stop array |
| `cardGradient` | `preset.cardGradLight` or `preset.cardGradDark` — 4-stop array |
| `groupGlow` | `preset.glowLight` or `preset.glowDark` — 4-stop array |

### GroupCard-Specific Tokens

| Token | Light | Dark |
|---|---|---|
| `groupBoxFill` | `#FFFFFF` | `#0C0F0D` |
| `groupBoxBorder` | `rgba(0,0,0,0.05)` | `rgba(255,255,255,0.06)` |
| `groupBoxShadow` | `rgba(20,60,35,0.14)` | `transparent` |
| `groupLabel` | `#15803D` | `#22C55E` |
| `groupOwe` | `#B45309` | `#F2C200` |
| `groupOwed` | `#16A34A` | `#27E06A` |
| `groupOthersFill` | `#E2E8F0` | `#1E231F` |
| `groupOthersInk` | `#475569` | `#CBD5E1` |
| `groupNameInk` | `#020617` | `#FFFFFF` |

### Accent Presets

Six named accent presets. Each has `light` and `dark` accent values plus gradient arrays.

| Key | Light Accent | Dark Accent |
|---|---|---|
| `forest` (default) | `#16A34A` | `#27E06A` |
| `ocean` | `#2563EB` | `#60A5FA` |
| `sunset` | `#EA580C` | `#FB923C` |
| `candy` | `#DB2777` | `#F472B6` |
| `grape` | `#7C3AED` | `#A78BFA` |
| `slate` | `#475569` | `#94A3B8` |

**Glow arrays** (4 stops, outer→inner for dark, inner→outer for light) and **gradient arrays** are defined per-preset in `Colors.ts`. When accent changes, `heroGradient` and `cardGradient` automatically update.

### SettleUpScreen Local Tokens

`SettleUpScreen.tsx` uses a local `tok()` function for screen-specific overrides:

| Token | Light | Dark |
|---|---|---|
| bg | `#E9F2EB` | `#0A0D0B` |
| card | `#FFFFFF` | `#141815` |
| green | accent | accent |
| gold | `#B07E00` | `#F2C200` |

### SplashScreen Hardcoded Colors

| Role | Value |
|---|---|
| Background | `#060A07` |
| Logo green | `#22C55E` |

---

## 2. Typography

### Font Family

**Plus Jakarta Sans** is the sole typeface. Loaded via `expo-google-fonts`.

| Weight Name | Font Family String | CSS Weight |
|---|---|---|
| `T.regular` | `PlusJakartaSans_400Regular` | 400 |
| `T.semibold` | `PlusJakartaSans_600SemiBold` | 600 |
| `T.bold` | `PlusJakartaSans_700Bold` | 700 |
| `T.extrabold` | `PlusJakartaSans_800ExtraBold` | 800 |

Import: `import { T } from '../utils/typography'`

Usage: `style={[T.bold, { fontSize: ms(16) }]}`

### Type Scale

All font sizes use `ms(n)` (moderate scale) against a 390pt baseline (iPhone 14 Pro).

| Role | `ms()` arg | Approx pt | Weight | Notes |
|---|---|---|---|---|
| Splash wordmark | `ms(46)` | ~46 | extrabold | letterSpacing -1.4 |
| Hero balance | `ms(52)` | ~52 | extrabold | letterSpacing -1.5, lineHeight 56 |
| Net balance value | `ms(32)` | ~32 | extrabold | letterSpacing -1.2 |
| Section title | `ms(20)` | ~20 | bold | letterSpacing -0.5 |
| Landing hero text | `ms(40)` | ~40 | extrabold | letterSpacing -1.6 |
| CTA button | `17` (fixed) | 17 | semibold | — |
| Body / card text | `ms(15)`–`ms(16)` | ~15–16 | regular/semibold | — |
| Tab label | `ms(10)` | ~10 | semibold | letterSpacing 0.3 |
| Tagline | `ms(14)` | ~14 | regular | letterSpacing 0.3, opacity 0.42 |

### Letter Spacing Conventions

- Display / hero: `-1.2` to `-1.6`
- Section headings: `-0.5`
- Wordmark: `-0.4` (Logo component), `-1.4` (SplashScreen)
- Body copy: `0` (default)
- Small labels: `+0.3`

---

## 3. Spacing Scale

### Design Baseline

**iPhone 14 Pro — 390 × 844 logical points.**

### Scale Functions

Defined in `mobile/src/utils/responsive.ts`:

| Function | Formula | Use for |
|---|---|---|
| `scale(n)` | `(SCREEN_W / 390) * n` | widths, horizontal padding/margins |
| `vs(n)` | `(SCREEN_H / 844) * n` | heights, vertical padding/margins |
| `ms(n, factor=0.5)` | `n + (scale(n) - n) * 0.5` | font sizes, border radii |
| `wp(pct)` | `SCREEN_W * pct / 100` | percentage-width layouts |
| `hp(pct)` | `SCREEN_H * pct / 100` | percentage-height layouts |

All three apply `PixelRatio.roundToNearestPixel` before returning.

**Breakpoints:**
- `isSmallScreen`: `SCREEN_W < 375`
- `isTablet`: `SCREEN_W >= 700`

### Common Spacing Values

| Context | Value | Notes |
|---|---|---|
| Screen horizontal padding | `scale(20)` | Used across most screens |
| Screen top padding | `vs(12)`–`vs(16)` | Below safe area |
| Card internal padding | `scale(18)`–`scale(24)` | |
| Section gap | `vs(14)`–`vs(20)` | Between cards or sections |
| Bottom sheet handle | width `scale(36)`, height `vs(4)` | |
| Min touch target | `scale(44)` × `scale(44)` | Icon buttons, back buttons |
| Primary button height | `vs(54)` | |
| Input height | `vs(52)` | Login/register fields |

---

## 4. Border Radius

All border radii use `ms(n)` so they scale gently across screen sizes.

| Use Case | `ms()` arg | Approx pt | Location |
|---|---|---|---|
| Bottom sheet top corners | `ms(28)` | ~28 | Sheets, ReceiptScanScreen, CanvasModeView |
| Group card | `ms(28)` | ~28 | GroupCard |
| Large modal / form card | `ms(24)` | ~24 | LoginScreen, SettleUpScreen cards |
| Menu card (tab bar) | `ms(24)` | ~24 | CustomTabBar menu |
| Glass pill tab bar | `ms(36)` | ~36 | CustomTabBar pill |
| Standard card / tile | `ms(20)` | ~20 | Expense rows, activity items |
| Shape tile (char picker) | `16` (fixed) | 16 | CharacterSetupModal |
| Icon menu box | `ms(14)` | ~14 | CustomTabBar menu icon boxes |
| Button / toggle | `ms(13)`–`ms(16)` | ~13–16 | Inputs, toggles, primary buttons |
| Color swatch | `16` (fixed) / `borderRadius 999` | — | CharacterSetupModal, CTA buttons |
| FAB | `scale(27)` | ~27 | CustomTabBar FAB |
| Limelight (tab indicator) | `ms(17)` | ~17 | CustomTabBar active highlight |
| Dock card | `ms(18)` | ~18 | CanvasModeView dock |
| Hub ring | orbit ring radii | — | CanvasModeView |
| Password strength bar | `ms(8)` | ~8 | RegisterScreen |
| Title pill | `999` | — | GroupCard title |
| CTA buttons | `99` | — | LandingScreen, OnboardingScreen |

---

## 5. Animation & Motion

### Spring Configs

| Context | Damping | Stiffness | Notes |
|---|---|---|---|
| `PressableScale` (default press) | 20 | 320 | All pressable elements |
| FAB rotate + menu slide | 22 | 280 | CustomTabBar |
| Tab bar limelight | 22 | 280 | CustomTabBar |
| Character rise (Dashboard) | 18 | 220 | DashboardScreen entry |
| Bottom sheet | 24 | 220 | DashboardScreen sheet |
| Receipt result card | 22 | 200 | ReceiptScanScreen |
| Hub heartbeat (canvas) | 18 | 120 | CanvasModeView, slow pulse |

### Timing Animations

| Context | Duration | Easing |
|---|---|---|
| Skeleton breathing (each dir) | 700ms | `Easing.inOut(Easing.ease)` |
| Activity list item entry | 220ms | `Easing.out(Easing.cubic)` |
| Stagger per activity item | 30ms | — |
| Character blink (each phase) | 80ms | default |
| Settle arrow bounce loop | 600ms | `Easing.inOut(Easing.ease)` |
| Canvas ring rotation | 90000ms | `Easing.linear` |
| Splash exit | 320ms | `Easing.out(Easing.cubic)` |
| LandingScreen entry | sequential | `Easing.out(Easing.cubic)` |

### Splash Screen 7-Beat Sequence

`SplashScreen.tsx` runs a linear choreography on mount:

1. **Dot** — single green point fades in
2. **Line** — expands horizontally to `scale(120)` wide, height 3, borderRadius 2
3. **Wordmark converge** — "Tandem" and "Pay" slide in from sides, line shrinks
4. **Ripple + tagline** — ripple pulse and `'Split together.'` fades in
5. **Heartbeat** — logo pulses once
6. **Exit** — scale 1→1.045, opacity 1→0 in 320ms with `Easing.out(Easing.cubic)`
7. **Atmosphere** — two background discs (480px @ 0.07 opacity, 760px @ 0.035)

### Character Blink

Random interval: 3000–5000ms. Animation: `scaleY` 1→0→1, 80ms per phase.

### PanResponder Eye Tracking (CharacterSetupModal)

- `eyeX` / `eyeY`: `±5px` from `gesture.dx * 0.25` / `gesture.dy * 0.25`
- Body `skewX`: `eyeX` −5→+5 maps linearly to `'-6deg'`→`'6deg'`

### Hub Heartbeat (CanvasModeView)

Spring: `damping:18, stiffness:120`. Scale 1→1.022→1. Repeat delay: 1300ms.

### PressableScale Defaults

- `scaleTo`: 0.97
- Optional `rotateTo` (e.g. `GroupCard` uses `'-0.5deg'`)
- Optional haptic: `'light'` | `'medium'` | `'none'`

---

## 6. Character System

### Overview

Characters are the avatar system. Each user has a character with a shape, color, and nickname. They appear throughout the app as presence indicators.

### Shapes

| Key | Description |
|---|---|
| `rect` | Tall rectangle with rounded top |
| `tall` | Narrow, very tall |
| `semi` | Wide, short — semicircle/pill body |
| `round` | Round with mouth, most expressive |

### Eye Styles

| Key | Rendering |
|---|---|
| `ball` | White circle + dark pupil + glint + secondary glint |
| `dot` | Small dark circle + white top-left shine |

### Color Palette (8 options)

`['#3ECF8E', '#6366F1', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#14B8A6', '#F97316']`

### Size Configs (CharacterShape.tsx `MINI_CONFIGS`)

All values in logical pixels (design baseline 390pt).

#### Cluster (smallest, in group card clusters)
| Shape | W | H |
|---|---|---|
| rect | 20 | 32 |
| tall | 14 | 40 |
| semi | 36 | 20 |
| round | 26 | 32 |

#### Mini
| Shape | W | H |
|---|---|---|
| rect | 32 | 52 |
| tall | 22 | 64 |
| semi | 56 | 30 |
| round | 40 | 52 |

#### Hero
| Shape | W | H |
|---|---|---|
| rect | 56 | 96 |
| tall | 40 | 116 |
| semi | 100 | 54 |
| round | 72 | 96 |

#### Card
| Shape | W | H | TL | TR | Notes |
|---|---|---|---|---|---|
| rect | 38 | 64 | 7 | 7 | — |
| tall | 28 | 80 | 4 | 4 | — |
| semi | 66 | 54 | 33 | 33 | — |
| round | 50 | 64 | 25 | 25 | mouthLeft:11, mouthTop:36 |

#### Single Shape Preview (CharacterSetupModal hero)
| Shape | W | H |
|---|---|---|
| rect | 108 | 177 |
| tall | 75 | 218 |
| semi | 190 | 102 |
| round | 136 | 177 |

Container height: 260px.

### Character Rendering Layers

Applied in order (bottom to top):

1. **Colored body** — solid fill with shape-appropriate border radius
2. **Gloss highlight** — top 28% of body, `rgba(255,255,255,0.22)`
3. **Ground shadow** — bottom 18% of body, `rgba(0,0,0,0.18)`
4. **AO shadow** — left edge 8% width, `rgba(0,0,0,0.10)`
5. **Eyes** — two eyes, positioned per shape
6. **Mouth** — round shape only, positioned at `mouthLeft`/`mouthTop`

### Character Picker Rules

- **Nickname**: required, maxLength 30, `textAlign: 'center'`
- **Shape tiles**: `minHeight: 88`, `padding: 10`, `borderRadius: 16`, `borderWidth: 2`
- **Color swatches**: `32×32`, `borderRadius: 16`; selected state: `borderWidth: 3`, `borderColor: '#FFFFFF'`
- **Onboarding swatches**: `40×40`, `borderRadius: 20`
- **CTA button**: `backgroundColor: colors.accent`, text `'#FFFFFF'`, `fontSize: 17`

### Character Render Locations

| Location | Size Variant |
|---|---|
| Group card cluster | `cluster` |
| Dashboard greeting | `mini` or `hero` |
| Canvas dock members | `mini` |
| CanvasModeView hub | `hero` |
| GroupCard tilted members | `card` |
| CharacterSetupModal preview | `SINGLE_SHAPE_CONFIG` (custom) |
| LandingScreen background | floating `mini` with breathing scale |

### GroupCard Character Tilt Array

Characters render at fixed tilts (degrees): `[{body:-4,name:-8}, {body:2,name:4}, {body:0,name:6}, {body:7,name:-10}]`. Max 4 characters shown.

---

## 7. Component Patterns

### CustomTabBar (Glass Pill)

**File:** `mobile/src/components/CustomTabBar.tsx`

- **Pill fill**: dark `rgba(22,22,26,0.86)`, light `rgba(248,248,252,0.86)`
- **Pill border**: dark `rgba(255,255,255,0.10)`, light `rgba(255,255,255,0.85)`, width `0.8`
- **Pill radius**: `ms(36)`
- **Dark-only**: shimmer gradient along top edge of pill
- **Limelight** (active tab indicator): `scale(46)` × `scale(34)`, radius `ms(17)`
  - Dark: `colors.accent + '28'`, Light: `colors.accent + '1F'`
  - Shadow opacity: dark 0.55, light 0.35, radius 12
- **FAB**: `scale(54)` × `scale(54)`, radius `scale(27)`, shadow opacity 0.45, radius 14
  - Plus icon rotates 45° on open: spring `damping:22, stiffness:280`
- **Menu card**: radius `ms(24)`, dark `rgba(22,22,26,0.97)`, light `rgba(248,248,252,0.97)`, border `0.8`
- **Menu entry animation**: `translateY` `vs(20)→0`, scale `0.9→1.0`, spring `damping:22, stiffness:280`
- **4 tabs**: Home (`Home` icon), Groups (`Users`), Payments (`Wallet`), Me (`User`)
  - Icon size: 22, active strokeWidth 2.4, inactive 1.6
  - Label: `ms(10)`, letterSpacing 0.3
- **Menu rows**:
  - Scan Receipt: icon bg `#10B981`
  - Smart Split: icon bg `#6366F1`
  - Add Expense: icon bg `#F59E0B`
  - Icon box: `scale(44)` × `scale(44)`, radius `ms(14)`
- **Unread badge**: color `#E05252`, size `scale(8)` × `scale(8)`, position `top:-2, right:-4`

### GroupCard

**File:** `mobile/src/components/GroupCard.tsx`

- **Container**: radius `ms(28)`, `PressableScale scaleTo=0.98, rotateTo="-0.5deg"`
- **Background**: `LinearGradient` using `colors.cardGradient`
  - Dark locations: `[0, 0.35, 0.68, 1]`
  - Light locations: `[0, 0.30, 0.56, 1]`
- **Crown icon**: size 12, color `#FBBF24`, for group creator
- **Title pill**: `borderRadius: 999`, `height: vs(60)`
- **Stat pill**: radius `ms(22)`, `minHeight: vs(60)`
- **Balance pill**: `minHeight: vs(60)`, arrow button `scale(44)` × `scale(44)`, radius `scale(22)`

### PressableScale

**File:** `mobile/src/components/PressableScale.tsx`

Universal press primitive. All interactive elements that scale on press use this.

- Default `scaleTo`: 0.97
- Spring: `damping: 20, stiffness: 320`
- Optional `rotateTo` (string, e.g. `'-0.5deg'`)
- Optional `haptic`: `'light'` | `'medium'` | `'none'`

**Do not** use raw `TouchableOpacity` or `Pressable` for elements that need press animation — use `PressableScale`.

### SkeletonBlock

**File:** `mobile/src/components/SkeletonBlock.tsx`

Breathing opacity animation — **no spinners**.

- Dark: opacity oscillates `0.08 → 0.18`
- Light: opacity oscillates `0.06 → 0.14`
- Background: dark `#FFFFFF`, light `#000000`
- Duration: 700ms each direction, `Easing.inOut(Easing.ease)`
- `delay` prop enables staggered wave effect across multiple blocks

Use during loading states on any data-driven content.

### CanvasModeView (Physics Canvas)

**File:** `mobile/src/components/CanvasModeView.tsx`

- **BG gradient**: dark `['#050810','#080C12','#060A10']`, light `['#F0F4FF','#EEF2FC','#F2F6FF']`
- **Hub**: radius `HUB_R=82`, border `1.5`, color `colors.accent + '80'`
- **Expense bubble hues** (HSL): `[335, 218, 158, 40, 272, 52]`
- **Bubble size range**: `MIN_R=44`, `MAX_R=70`, default `BUBBLE_R=54`
- **Physics**: Brownian motion + hub repel (`minDist = HUB_R + bubbleR + 26`) + sibling repel
- **Speed clamp**: max `0.70`, min `0.08`
- **Orbit rings**: 296px, 428px (inner); 560px (outer, rotates at 90s linear)
- **Star field**: 40 stars, golden-angle scatter, sizes `2.0 / 1.2 / 0.6`
- **Nebula**: 3 shadow layers behind hub — radii 40/70/110, opacity 0.18/0.10/0.06
- **Detail sheet**: `maxHeight: 420`, `borderTopRadius: ms(28)`, handle color `accent+'30'`
- **Dock**: up to 6 members, card radius `ms(18)`, border `1.5`

### Bottom Sheets

Consistent pattern across `DashboardScreen`, `ReceiptScanScreen`, `GroupDetailScreen`:

- `borderTopLeftRadius: ms(28)`, `borderTopRightRadius: ms(28)`
- Handle: width `scale(36)`, height `vs(4)`, centered
- Entry: spring `damping:22–24, stiffness:200–220`
- Background: `colors.surface`

### Hero Gradient Headers

Used in `GroupDetailScreen` and implicitly elsewhere:

- `LinearGradient` with `colors.heroGradient` (3-stop array)
- `locations: [0, 0.35, 1]`
- Angle: vertical (top to bottom)

### Logo Component

**File:** `mobile/src/components/Logo.tsx`

- **"Tandem"**: `fontWeight: 800`, `color: colors.text`, `letterSpacing: -0.4`
- **Slash**: width 2, height `fontSize * 1.15`, color `colors.accent`, borderRadius 1, `rotate: '18deg'`, opacity 0.85, `marginHorizontal: Math.round(fontSize * 0.18)`
- **"Pay"**: `fontWeight: 800`, `color: colors.accent`, `letterSpacing: -0.4`
- Takes a `fontSize` prop; all other dimensions derived from it

---

## 8. Screen Layout Rules

### Safe Area

All screens use `react-native-safe-area-context`. Standard pattern:

```tsx
<SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
```

Bottom safe area is handled either by the tab bar or explicit `edges={['bottom']}` on full-screen modals.

### Screen Background

Always `colors.background`. Never hardcode a screen background color — the background changes with accent preset.

### Header Pattern

Most screens use a custom header (not React Navigation's default):

- Back button: `scale(44)` × `scale(44)`, radius `ms(14)`, `colors.surface` fill
- Title: `ms(18)`–`ms(20)`, `T.bold`, `colors.text`
- Optional action button (right): same hit target `scale(44)` × `scale(44)`

Screens with hero gradient headers (`GroupDetailScreen`):
- `LinearGradient` spans from safe area top through ~35% of viewport
- Content overlaid with absolute positioning

### Scroll Content

- `contentContainerStyle`: include bottom padding for tab bar + safe area
- Typical bottom inset: `vs(100)` or more to clear the floating tab bar

### Full-Screen Overlays (SplashScreen, LandingScreen)

- Absolute fill, `backgroundColor` hardcoded (not theme-aware)
- `SplashScreen`: `'#060A07'`
- `LandingScreen`: dark overlay `rgba(0,0,0,0.5)` / `rgba(0,0,0,0.3)` over floating characters

### Modals as Stack Screens

Modals (`ReceiptScanScreen` result, etc.) are presented as stack routes, not native modals, giving consistent animation control via React Navigation. Exception: `CharacterSetupModal` is a native `<Modal>` — it doubles as an app-level gate in `RootNavigator` for users without a character, outside any navigator.

### Loading States

Always use `SkeletonBlock` during data fetching. Never show an empty screen or spinner. Stagger skeleton blocks with `delay` prop for wave effect.

### Empty States

Empty state containers include a character illustration at `hero` or `mini` size, a short message in `colors.secondaryText`, and optionally a CTA button.

---

## 9. Icon Library

**Library:** `lucide-react-native`

All icons are imported from `lucide-react-native`. No other icon library is used.

### Standard Icon Sizes

| Use Case | Size |
|---|---|
| Tab bar icons | 22 |
| Navigation / action buttons | 20 |
| Inline / label icons | 16–18 |
| Crown (GroupCard creator) | 12 |
| Unread badge dot | `scale(8)` |

### Tab Bar Icons

| Tab | Icon | strokeWidth |
|---|---|---|
| Home | `Home` | 2.4 (active), 1.6 (inactive) |
| Groups | `Users` | 2.4 / 1.6 |
| Payments | `Wallet` | 2.4 / 1.6 |
| Me | `User` | 2.4 / 1.6 |

### Color Convention

- Active / accent icons: `colors.accent`
- Inactive icons: `colors.tabIconDefault`
- Text-colored icons: `colors.text` or `colors.secondaryText`
- White icons on colored backgrounds: `'#FFFFFF'`
- Crown: `'#FBBF24'`

### Menu Row Icons (FAB Menu)

| Action | Icon | Container Color |
|---|---|---|
| Scan Receipt | Camera / Scan | `#10B981` |
| Smart Split | Sparkles / Zap | `#6366F1` |
| Add Expense | Plus / Receipt | `#F59E0B` |

Icon container: `scale(44)` × `scale(44)`, radius `ms(14)`, icon `size: 20`, color `'#FFFFFF'`.

---

## 10. Fable-Originated Design Decisions

This section documents decisions where the AI assistant (Claude / Fable) made a design call that was accepted and is now canonical. These are non-obvious choices that need documentation to prevent future drift.

### 10.1 Glass-Morphism Tab Bar

The floating pill tab bar uses blurred, semi-transparent fills with a very subtle border rather than a solid opaque bar. **Decision rationale:** preserves visual continuity with screen content beneath the bar; reinforces the "light" feel of the UI. The dark border value `rgba(255,255,255,0.10)` was chosen to remain visible without competing with content. The light border `rgba(255,255,255,0.85)` creates a hard-edge glass feel.

### 10.2 No Spinners — Skeleton Loaders Only

The `SkeletonBlock` component replaces all loading spinners. **Decision rationale:** Skeleton loaders communicate shape and structure of incoming content, reducing perceived wait time and layout shift. The breathing animation (`Easing.inOut(Easing.ease)`, 700ms) is deliberately slow to feel calm rather than urgent.

### 10.3 Brownian Motion Bubble Physics (CanvasModeView)

Expense bubbles move with Brownian noise rather than deterministic orbits. Speed is clamped `[0.08, 0.70]` to prevent jitter (too slow = stagnant) and blur (too fast = unreadable). Hub and sibling repulsion prevents overlap without locking bubbles to fixed positions.

### 10.4 Character Eye Tracking via PanResponder

The `CharacterSetupModal` uses `PanResponder` to track drag gestures and offset eye positions `±5px` with a `0.25` damping factor. Body skews `±6deg` based on eye X position. **Decision rationale:** makes the character feel alive and responsive during customization, encouraging engagement with the picker.

### 10.5 `ms()` for Border Radii and Font Sizes

Both border radii and font sizes use the moderate-scale function (not `scale()` or `vs()`). `ms()` with `factor=0.5` applies half the horizontal scale delta, preventing these from growing disproportionately on large screens while still adapting.

### 10.6 Accent-Aware Gradients

Rather than a single gradient per theme, each accent preset ships its own `heroGradient` and `cardGradient`. This ensures the gradient tint always harmonizes with the active accent color. Changing the accent in `AppearanceScreen` updates both the accent token and the background gradients simultaneously.

### 10.7 Character Shape Gloss + Shadow Layers

The character rendering pipeline applies four decorative layers on top of the body fill (gloss, ground shadow, AO edge, then eyes). This mimics a soft 3D appearance without actual 3D rendering, giving characters depth and surface quality at very small sizes.

### 10.8 `PressableScale` as the Universal Press Primitive

All tappable elements use `PressableScale` rather than `TouchableOpacity`. **Decision rationale:** unified spring config (`damping:20, stiffness:320`) means every press in the app feels identical and snappy. Optional `rotateTo` prop enables subtle card tilts without extra code.

### 10.9 Haptic Taxonomy

Three levels used:
- `Haptics.selectionAsync()` — navigating options, tab switches
- `Haptics.impactAsync(ImpactFeedbackStyle.Light)` — confirmations, toggles
- `Haptics.impactAsync(ImpactFeedbackStyle.Medium)` — FAB open, major actions
- `Haptics.notificationAsync(NotificationFeedbackType.Success/Error)` — settlement, payment completion

### 10.10 SettleUpScreen Local Token Override

`SettleUpScreen` deliberately uses a local `tok()` function to hardcode its dark `bg: '#0A0D0B'` and `gold: '#F2C200'` rather than relying on the global theme. **Decision rationale:** the settle screen is a high-stakes moment; its color treatment (deep dark background, gold hero amount) is intentionally distinct to signal importance and focus.

### 10.11 SplashScreen Hardcoded to `#060A07`

The splash screen background is not theme-aware — it always renders dark forest green near-black. **Decision rationale:** the splash runs before the theme is hydrated from AsyncStorage, so it must be deterministic. The choice of `#060A07` (not pure black) provides warmth that matches the forest default accent.

### 10.12 Button Text Color Inversions

- **LoginScreen** CTA: text `'#1A1A1A'` (dark, not white) — the button background is light-colored in both modes
- **RegisterScreen** CTA: `isDark ? '#064E3B' : 'white'` — dark mode uses deep green to contrast against the bright accent button
- **Onboarding / Landing CTA**: always `'#FFFFFF'` — these buttons use opaque accent backgrounds

### 10.13 Logo Slash Geometry

The slash between "Tandem" and "Pay" is a thin rectangle (width 2, height `fontSize * 1.15`) rotated 18 degrees. Margin is `Math.round(fontSize * 0.18)` on each side, derived from the font size so spacing scales proportionally at every size.

---

*Last updated: 2026-06-13. Regenerate this document by reading all files in `mobile/src/screens/`, `mobile/src/components/`, `mobile/src/constants/Colors.ts`, `mobile/src/context/ThemeContext.tsx`, and `mobile/src/utils/`.* 
