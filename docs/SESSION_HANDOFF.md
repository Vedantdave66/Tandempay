# TandemPay — Session Handoff for Claude
**Last updated:** 2026-06-20
**Repo:** https://github.com/Vedantdave66/Tandempay
**Stack:** FastAPI backend (Vercel Python) · React/Vite frontend (Vercel) · React Native mobile (Expo/EAS)
**Prod URLs:** `https://tandempay.ca` (frontend) · `https://api.tandempay.ca` (backend)

---

## Where the project stands right now

- **Production is live and healthy.**
- **Production readiness score: ~83/100** — closed beta safe.
- **All 11 production hardening fixes are merged and deployed** (see below).
- **R1–R5 of the post-launch roadmap are all merged into `main`** — Settle Up redesign, Interac email auto-confirm, Pro subscription billing, recurring expenses, and CSV/PDF export are live in production. See "Roadmap status" below; the table that previously listed these as remaining is now stale.
- **Mobile UI revamp (Dashboard/Groups/GroupDetail/Friends/Profile/TabBar/AddExpense + LimelightNav tab bar) shipped 2026-06-06** via PRs #123, #124, #125 — all merged into `main`.
- **Mobile polish pass (2026-06-07/08) shipped via PRs #132–#141** — PaymentsScreen rewrite, GroupCard/GroupDetail/SettleUp fixes, ToastBanner artifact fix, Dashboard dark-mode label fix, notifications array guard, ProHub character modal + invite + accent theming. See section below.
- **Canvas Mode + Apple HIG polish session (2026-06-08/09) shipped via PRs #142–#149** — splash animation, gradient tokens, hardcoded-green audit, CanvasModeView redesign, HIG pass across all 14 screens, floating liquid glass tab bar, AppearanceScreen, accent color fix (accentBg/accentBgFaint/accentLight now dynamic), CanvasModeView carousel dock with direct-drag. All merged into `main`.
- **June 13 sprint shipped via PRs #184–#195** — P0 fixes, receipt scanner rebuilt on Gemini 2.5 Flash, onboarding/landing redesign, group invite links, and escalating nudge system. See section below.
- **Pro screens + design spec session (2026-06-13) shipped via PRs #197–#204** — `DESIGN_SPEC.md` added, `SubscriptionScreen` built, `ExportScreen` and `RecurringScreen` fully wired to real API endpoints, all "Coming Soon" alerts replaced with proper states/upsell cards, light-mode Pro card and hero card border fixes. PRs #202 and #203 are still **open**. See section below.
- **Smart Split shipped via PRs #205–#207** — Gemini NLP backend route, full 3-phase mobile UI (input → review → error), logging/retry robustness, conversational intents, and voice input via Gemini multimodal. All merged. See section below.
- **2026-06-20 session shipped via PRs #211–#212** — theme crossfade animation, edit expense UI restoration, timezone import fix, SQLAlchemy lazy-load guard in settlements, and Wealthsimple/Tangerine/Interac central email parsers. See section below.
- **Latest Alembic head: `20260613_add_nudge_fields_to_settlement_records`** (chain: `... → a107c01bd8f1` → `20260612_add_push_token_to_users` → `20260613_add_invite_token_to_groups` → `20260613_add_nudge_fields_to_settlement_records`). Both new migrations have been run against prod Supabase.

---

## Strategic direction

TandemPay = "Splitwise for Canadian roommates, free settlement on Interac." Wedge audience is roommates with recurring shared bills. Interac e-Transfer is the primary settlement path (free, ~30 sec), with **auto-confirmation via email parsing as the unique magic**. Stripe Connect stays as a backup "Pay by card" option. Monetization is Pro subscription at $3.99/mo or $29.99/yr. Pro headline feature is recurring expenses.

---

## What was completed this session (2026-06-03)

### Full production readiness code review
Claude reviewed the entire codebase and scored it **66/100**. All 11 critical/major issues were fixed across two PRs, bringing it to **83/100**.

### PR #100 — fix/groups-api-items-fallback → main (4 critical fixes)
1. `stripe_routes.py` — Webhook transfer validation fallthrough fixed; payment only marked succeeded after verified transfer
2. `schemas.py` + `auth.py` — `character_shape/color/nickname` added to `UserUpdate`; mobile character setup now actually saves
3. `auth.py` — `forgot_password` commit order fixed; token persisted before email sent
4. `payments.py` — Raw Stripe error no longer exposed to client
5. `test_stripe_webhook.py` — test_a + test_c updated with mock Charge/Transfer chain
6. `CurvedMenu.tsx` — Orphaned `setIsHovered` → `setIsOpen`, removed `{isPinned &&}` block

### PR #101 — fix/production-hardening → main (7 major fixes)
7. `config.py` — JWT expiry 1440 → 60 minutes
8. `models.py` — `RevokedToken` model added
9. `auth.py` — `create_access_token` stamps jti, `get_current_user` checks revocation, `POST /api/auth/logout` added
10. `schemas.py` — `validate_password_complexity` added to `UserRegister` + `PasswordResetConfirm`
11. `auth.py` — `@limiter.limit("5/hour")` on `/register`
12. `alembic/versions/20d7c91bb5df` — `revoked_tokens` migration (run against prod)
13. `settlements.py` — Settlement amount validated against actual debt
14. `groups.py` — `list_groups` N+1 replaced with correlated SQL scalar subquery
15. `expenses.py` — `create_expense` + `update_expense` N+1 replaced with batched WHERE IN
16. `auth.py` — Admin endpoints rate-limited + AuditLog entries added

---

## Mobile UI revamp session (2026-06-06) — branch `feat/revamp-friends-profile-tabbar-addexpense`

### What shipped
- **PR #123** "feat: full mobile UI revamp (A+B+C)" → **MERGED** into `main` (Dashboard, Groups, GroupDetail, Friends, Profile, TabBar, AddExpense rewrites)
- **PR #124** "fix: post-revamp follow-ups" → **MERGED** into `main`. Included: PaymentsScreen null-guards + array-extraction for paginated API responses, `ThemeToggle` added to Dashboard header, `Logo.tsx` slash-thickness fix, `GroupCard` clipping/alignment fixes, `CharacterShape` taller `semi` shape in card variant, ProHub "Customise character" Alert copy
- **PR #125** "feat: LimelightNav tab bar + recurring merge-conflict fixes" → **OPEN**, base `main`, head `feat/revamp-friends-profile-tabbar-addexpense`. Contains:
  - Full rewrite of `mobile/src/components/CustomTabBar.tsx` — "LimelightNav" pattern: `Animated.spring`-driven indicator that measures each tab's center-X via `onLayout` and glides to the active tab (`useNativeDriver: true`, `tension: 180, friction: 20`), plus a `LinearGradient` cone-glow beneath it
  - Recurring-bug fix commit (see below)

### ⚠️ Recurring systemic bug — watch for this every time `main` merges into this branch
Every `git merge origin/main` (or merge of `main`) into `feat/revamp-friends-profile-tabbar-addexpense` reintroduces two bugs that apparently live unresolved in `main` itself:
1. **`mobile/src/constants/Colors.ts`** — duplicate keys `accentBg`, `accentBgFaint`, `warningBg`, `warningBright`, `faintText` declared twice in both the `light` and `dark` palettes (once early in the object, once again under the `// Faint variants used for chips, pills, icon tiles` comment). Causes TS1117 "duplicate object literal property" errors. **Fix:** delete the *first* declarations, keep the later "Faint variants" block (it wins at runtime per JS object-literal semantics — last write wins).
2. **`mobile/src/screens/DashboardScreen.tsx`** — `styles` defines `safe: { flex: 1 }` but the JSX references `styles.screen`, causing TS2339 errors. **Fix:** rename `safe` → `screen`.

This was hit and fixed identically **three separate times** in one session (commits `9947e42`, then again, then `f3e4bcb`). If you're merging `main` into a feature branch and `npx tsc --noEmit` lights up with these exact errors, apply the same two fixes — don't waste time re-diagnosing.

### Stranded-commit pattern (also recurring)
Twice this session, a PR merged into `main` while follow-up commits kept landing on the same feature branch — leaving them stranded (not in `main`, not covered by any open PR). Detection: `git merge-base --is-ancestor <latest-sha> origin/main` returns false, or `git log --oneline origin/main..origin/<branch>` lists unmerged commits. **Resolution both times:** open a fresh follow-up PR from the same branch into `main` (PR #124, then PR #125) rather than trying to amend a merged PR.

### Pending for next session
- **PR #125 needs review/merge.** Manual checks still outstanding: limelight indicator animation on device, light/dark palette rendering.
- After #125 merges, re-check for stranded commits before starting new mobile work — the pattern is likely to repeat if anyone pushes to this branch concurrently.

---

---

## Mobile polish session (2026-06-07/08) — PRs #132–#141

All PRs listed below are **open** (awaiting merge into `main`) unless otherwise noted.

### PR #132 — fix/payments-screen-polish
- Full rewrite of `PaymentsScreen.tsx`: T.* typography on all Text, colored shadows (green `#16A34A` shadow on CTAs, white-card shadow on content), `activeOpacity` 0.82/0.88/0.70, `StyleSheet.hairlineWidth` borders, `fontVariant: ['tabular-nums']` on money amounts, haptics wired via ambient `expo-haptics.d.ts` declaration.
- Created `mobile/src/types/expo-haptics.d.ts` ambient type declaration (package was missing from package.json).

### PR #133 — fix/nav-card-fixes (batch of 4)
- **GroupDetailScreen `handleInitiateSettlement` deleted** — settle button now navigates directly to `'SettleUp'` with `payment` params (no more Alert dialog).
- **CustomTabBar BlurView removed** — `expo-blur` crashes at runtime ("native view manager not found"); replaced with solid `rgba` View (`rgba(12,15,12,0.97)` dark / `rgba(255,255,255,0.97)` light).
- **GroupCard character overlap fixed** — `clusterRow paddingTop` reduced, `paddingBottom` added, `marginTop` on pill container pulled back from `-22` to `-14` so names no longer disappear behind the pill.
- **GroupDetailScreen back button** — `colors.accentDark` (#062B16) invisible in dark mode; changed to `isDark ? colors.accent : colors.accentDark`.

### PR #134 — feat/group-detail-header-gradient (originally settle-up-hero-gradient, rebased)
- SettleUpScreen hero gradient: taller padding, more vivid dark colors (#16A34A top), `locations [0, 0.28, 0.62, 1]`, `start`/`end` props, `CharacterShape variant` confirmed as `"card"`.
- GroupDetailScreen header gradient: replaced muddy dark colors with `['#11833F','#0A4C29','#0A0D0B']` dark / `['#BDEECB','#DBF3E2','#FFFFFF']` light, `locations [0, 0.35, 1]`.

### PR #135 — fix/settle-up-fixes
- **Settlement duplicate guard**: `settlementsApi.create` is now skipped when `payment.id` already exists (was causing 500 MissingGreenlet on repeated Settle Up opens from GroupDetailScreen).
- **SettleUpScreen status bar bleed**: replaced `SafeAreaView` with `View` + `useSafeAreaInsets`; header moved inside `LinearGradient`; `heroGrad paddingTop = insets.top + vs(16)`.
- `CharacterShape variant` reverted `"hero"` → `"card"` (hero is not a valid variant).

### PR #136 — fix/settle-up-status-bar
- Removed `<StatusBar translucent />` from `SettleUpScreen` — it's a global singleton and was making the status bar transparent on every screen in the app.

### PR #137 — feat/group-detail-header-gradient *(merged into main)*
- GroupDetailScreen header gradient vivid update (see PR #134 description above — this was the PR that shipped it).

### PR #138 — feat/group-detail-status-bar-bleed *(merged into main)*
- GroupDetailScreen status bar bleed fix: `useFocusEffect` + `StatusBar.setTranslucent(true)` scoped to this screen (cleaned up on blur), `SafeAreaView` → `View`, `paddingTop: insets.top + vs(8)` inline on `LinearGradient`.

### PR #139 — fix/toast-banner-offscreen *(merged into main)*
- **Root cause found for green border artifact visible on every screen**: `ToastBanner` in `NotificationContext.tsx` was positioned `top: 50` with `translateY: -80` when hidden → effective top = -30px, leaving 14px of green-bordered rounded bottom visible above viewport.
- Fix: both `new Animated.Value(-80)` and exit `toValue: -80` changed to `-200`, putting the hidden position at `top: 50 + translateY: -200 = -150px` (fully off-screen).

### PR #140 — fix/dashboard-settle-polish *(merged into main)*
- **DashboardScreen "YOU'RE OWED" label invisible in dark mode**: was `colors.accentDark` (#062B16); changed to `isDark ? colors.accent : colors.accentDark` on both the label and dollar amount.
- **GroupCard green shadow artifact at horizontal scroll edge**: `shadowColor` changed from green-tinted `#0A3020` to `#000` on the card's outer shadow.
- **SettleUpScreen spinner stuck on error**: `setLoading(false)` now called explicitly in the `catch` block and before the `initError` early return.
- **`notifications.some is not a function`**: `notificationsApi.list()` response in `NotificationContext` now coerced to array (`Array.isArray(raw) ? raw : raw?.items ?? []`) before being stored in state.
- DashboardScreen `notificationsApi.list()` call in recent-activity also coerced to array.

### PR #141 — feat/prohub-appearance *(merged into main)*
- **ProHubScreen — Customise character**: chip button now opens `CharacterSetupModal` (was showing "coming soon" Alert). `CharacterSetupModal.handleSave` now calls `onClose?.()` after `refreshUser()` so the modal auto-dismisses on save.
- **ProHubScreen — Invite a friend**: requests Contacts permission via `expo-contacts`, then opens native Share sheet with invite message/link. `expo-contacts` installed.
- **ProHubScreen — Appearance bottom sheet**: tapping "Appearance" opens a slide-up Modal with 6 accent color swatches (40pt circles, white checkmark on selected) + Light/Dark segmented toggle + Done button.
- **`Colors.ts` — `ACCENT_PRESETS`**: added `ACCENT_PRESETS` map (Forest/Ocean/Sunset/Candy/Grape/Slate) each with `{ light, dark, glowLight, glowDark }` values. Exported `AccentKey` type.
- **`ThemeContext` — accent theming**: added `accentKey` state (default `'forest'`, persisted via `AsyncStorage`), `setAccent(key)` exported from `useTheme()`. On accent change, overrides `colors.accent`, `colors.accentDark`, `colors.tint`, `colors.tabIconSelected`, `colors.groupGlow` — flows to all `useTheme()` consumers instantly. `ColorPalette` type defined to relax literal types on overrideable fields.
- **`expo-haptics` installed**: resolves crash in `GroupDetailScreen` where `import * as Haptics from 'expo-haptics'` could not be resolved.

---

## Canvas Mode + appearance session (2026-06-08/09) — PRs #142–#146

All PRs listed below are **merged** unless otherwise noted.

### PR #142 — feat: logo splash screen animation on app launch *(merged)*
- `SplashAnimationScreen.tsx` — logo lettermark fades and scales in on launch using `Animated` (no reanimated). Replaces the default Expo splash with a branded transition.

### PR #143 — feat: accent-aware splash glow + gradient tokens *(merged)*
- `GroupCard` / `GroupDetail` / `SettleUp` gradient tokens updated to use `colors.heroGradient` from `ThemeContext` instead of hardcoded greens.
- Splash glow tint reads `colors.accent` so it adapts when the user changes accent preset.

### PR #144 — fix: replace hardcoded green hex values with colors.accent *(merged)*
- Audit of all screens and components: every hardcoded `#16A34A`, `#4ADE80`, `#10B981`, `#22C55E`, etc. replaced with `colors.accent` / `colors.accentDark` / `colors.gold` tokens from `useTheme()`.
- Ensures the Ocean/Sunset/Candy/Grape/Slate accent presets introduced in PR #141 actually propagate everywhere.

### PR #145 — feat: ProHub canvas redesign + auth screen polish *(merged)*
- **CanvasModeView full visual redesign**: star field (28 golden-ratio dots), nebula glow, glassmorphism hub with breathing `Animated.loop` scale, dynamic HSL bubble colors with emoji prefixes (`expenseEmoji()`), gradient friend dock as absolute canvas overlay with centered avatars, `colors.accent`-tinted orbit rings.
- **Auth screen branding**: `<Logo />` replaces hardcoded "Tandem" text on LandingScreen, LoginScreen, RegisterScreen, ForgotPasswordScreen.
- **Password visibility toggle**: Eye/EyeOff icon on password fields in LoginScreen and RegisterScreen (`showPassword` state).

### PR #146 — fix: canvas mode polish pass + diagnostic fixes *(merged)*
- **TypeScript errors cleared**: `tok()` in `SettleUpScreen` called with 1 arg (needs 2 — added `colors.accent`); `AddExpenseScreen` typed `Props` interface clashed with navigator generic (cast to `any`); `handoff/` directory added to `tsconfig.json` exclude to stop stale corrected file from causing compile errors.
- **CanvasModeView full restore** after remote rebase reverted visual changes: BUBBLE_PALETTES → dynamic HSL + `expenseEmoji()`, `HUB_Y_CENTER` constant → dynamic `hubYCenter` + `hubYCenterRef`, `canvasGrad` → `colors.heroGradient`, hub → `Animated.View` glassmorphism + breathing, star field + nebula glow, accent orbit rings, bubble dismiss button + payer `CharacterShape`, `character_shape` fallback `'semi'` → `'rect'` everywhere.
- **Dock moved inside canvas** as absolute `LinearGradient` overlay — no more hard-edged bottom strip; avatar row centered.
- **Drag ghost → member's CharacterShape** — `dragGhostRef` removed; `ghost` state drives a floating `CharacterShape (variant="mini")` under the finger during drag.

---

## Apple HIG polish + appearance session (2026-06-09/10) — PRs #147–#149

All PRs are **merged** into `main`.

### PR #147 — polish: Apple HIG pass — all screens + animations *(merged)*
- Comprehensive Apple HIG polish across 14 screens: SettleUpScreen, LoginScreen, RegisterScreen, LandingScreen, ForgotPasswordScreen, AddExpenseScreen, CreateGroupScreen, PaymentsScreen, FriendsScreen, NotificationsScreen, ActivityScreen, PendingRequestsScreen, ProHubScreen, GroupsScreen.
- Global rules applied: `StyleSheet.hairlineWidth` on all decorative borders (was 1–1.5px); shadow reduction (max `shadowOpacity` 0.18 light / 0.28 dark, `shadowRadius` capped, `elevation` ≤ 6); corner radii unified (cards `ms(24-28)`, buttons `ms(16)`, inputs `ms(14)`, chips `ms(10-12)`); touch targets ≥ `scale(44)` on all icon-only buttons; `paddingVertical ≥ vs(15-17)` on CTAs.
- Stagger list entrance animations on PaymentsScreen and FriendsScreen: `useRef` array of `Animated.Value`, `Animated.stagger(40ms, sequence)`, 220ms per item, capped at 5.
- ALL-CAPS `letterSpacing` reduced to 0.6–0.8; negative `letterSpacing` on large financial text (−0.5 to −1.0).
- `GroupCard` shadow/border reductions; `SplashScreen` 4-concentric-circle glow.

### PR #148 — feat: floating liquid glass tab bar + stability fixes *(merged)*
- **CustomTabBar complete redesign**: position absolute floating pill (`left/right scale(20)`, `borderRadius ms(36)`), three composited glass layers — frosted fill (`rgba` semi-transparent), glass ring (0.8px border), top-edge shimmer (`LinearGradient`, dark-mode only). No `BlurView`.
- **Limelight indicator**: `Animated.spring` (`tension: 200, friction: 28`) pill glides behind active tab icon. `onLayout` measures each tab center-X; `LIMELIGHT_W = scale(46)`, height `scale(34)`, `borderRadius ms(17)` — icon-only, never covers label.
- **`MainTabNavigator`**: `tabBarStyle` set to `{ position: 'absolute', backgroundColor: 'transparent', borderTopWidth: 0, elevation: 0 }` so screens inset correctly under floating bar.
- **`CharacterSetupModal`**: replaced `useSafeAreaInsets()` hook with `initialWindowMetrics` static value — fixes crash inside RN `<Modal>` which has no `SafeAreaProvider` context.
- **NotificationsScreen**: guard against undefined/paginated API response — `Array.isArray(raw) ? raw : raw?.items ?? []`.

### PR #149 — feat: ProHub appearance screen, floating tab bar, HIG polish + canvas carousel *(merged)*
- **`AppearanceScreen.tsx`** (new full-screen): live phone mock preview showing `colors.heroGradient` + `colors.cardGradient` reactive to current accent/theme; 3-per-row accent swatch grid with `<Check>` checkmark; Light/Dark toggle with `<Sun>`/`<Moon>` icons; `Haptics.selectionAsync()` on every selection. Navigated to via `navigation.navigate('Appearance')`.
- **`ThemeContext`**: `accentBg`, `accentBgFaint`, `accentLight` now computed from current accent hex (alpha suffix `'1F'`/`'18'`/`'0F'`/`'26'`). Added to `ColorPalette` `Omit` list so hardcoded forest-green values in `Colors.ts` no longer bleed through. **Fixes the known "accent colors bleed" open item.**
- **`ProHubScreen`**: hero `LinearGradient` uses `colors.heroGradient` token (was hardcoded hex); bottom-sheet `<Modal>` appearance block removed; Appearance row calls `navigation.navigate('Appearance')`.
- **`RootNavigator`**: `AppearanceScreen` registered as `name="Appearance"` stack screen with `slide_from_right` animation.
- **CustomTabBar fixes**: `overflow: 'hidden'` restored (layer clipping); shimmer conditional on `isDark`; limelight shadow reduced (`shadowOpacity` 0.40/0.20, `shadowRadius` 8).
- **CanvasModeView carousel dock v1**: replaced flat avatar row with center-snapping `Animated.ScrollView` carousel. Focused card: scale 1.0, full opacity, elevated shadow, raised `vs(6)`. Adjacent cards: scale 0.78, opacity 0.52. Separate stationary drag handle above carousel (later replaced in v2).
- **CanvasModeView carousel dock v2** (direct-drag, same PR branch): removed separate drag handle and "↑ DRAG TO ASSIGN ↑" label. `panHandlers` attached directly to each `Animated.View` card. `PanResponder` updated with vertical-priority detection: `onStartShouldSetPanResponder: () => false` (ScrollView sees touch first), `onMoveShouldSetPanResponder: (_, gs) => |dy| > 6 && |dy| > |dx| × 1.3` (only claim clearly-upward drags). Haptic `Light` on drag grant, `Medium` on drop. Cards: scale `[0.76, 1, 0.76]`, opacity `[0.45, 1, 0.45]`, translateY `[vs(8), 0, vs(8)]`. `CARD_W = scale(72)`, `CARD_MX = scale(12)`.

---

## June 13 sprint — PRs #184–#195

All PRs listed below are **merged** into `main` unless otherwise noted.

### P0 fixes (PRs #184–#190) — all merged
Six quick-hit production bugs fixed and shipped:
1. Gemini receipt prompt improved to handle negative modifiers and multiple total lines (PR #184)
2. Non-ASCII characters stripped from `receipts.py` (PR #188 hotfix, direct to main)
3–6. Additional P0 fixes — see individual PR descriptions on GitHub for details.

### PR #189 — feat: characters-first onboarding carousel + cinematic landing + pre-registration character picker *(merged)*
- **LandingScreen** rebuilt: cinematic `LinearGradient` hero, `Animated` entrance sequence, characters displayed as interactive preview row. Live canvas behind the CTA. "Join free" routes to character picker before registration.
- **Onboarding carousel**: characters-first flow — user picks Kai/Max/Rue/Zo on first launch before creating account. Animated dot indicators, swipe-through slides.
- **Pre-registration character picker**: character selection persisted via `AsyncStorage` and applied on `POST /api/auth/register`, so the chosen character is set from account creation.

### PR #190 — fix: bulletproof camera open timing, permission guard, cancel handling, and group picker error states in ReceiptScanScreen *(merged)*
- **`ReceiptScanScreen.tsx`**: camera launch deferred with `setTimeout(open, 150)` to avoid race between navigator transition and native camera init; permission check added before open; cancel handling gracefully dismisses without error toast; group picker error state surfaced.
- **`receipts.py`** (backend): receipt scanner fully rebuilt on **Gemini 2.5 Flash** (`gemini-2.5-flash-preview-05-20`). Multi-step JSON extraction with aggressive fallback chain — tries full parse, then `json.repair`, then regex extraction of individual fields. Merchant name returned as expense title. Indestructible parser: never returns a 500 regardless of Gemini output shape.
- Alembic: no schema changes — receipt scan is a stateless route.

### PR #192 — feat: group invite links (backend + mobile + web) *(merged)*
- **Backend** — 4 new routes on `backend/app/routes/groups.py`:
  - `GET /api/groups/join/{token}` — unauthenticated preview (group name, member count, creator name)
  - `POST /api/groups/join/{token}` — authenticated join; idempotent (returns existing membership); notifies creator
  - `POST /api/groups/{group_id}/invite/generate` — creator only; idempotent (returns existing token)
  - `DELETE /api/groups/{group_id}/invite` — creator only; nulls `invite_token`
- **Alembic migration** `20260613_add_invite_token_to_groups` — `IF NOT EXISTS` column + unique index on `groups.invite_token`.
- **Mobile** — `GroupDetailScreen`: "Invite" ghost button (creator only) calls `generateInvite` then opens native Share sheet with `tandempay://join/{token}` deep link. `RootNavigator`: `Linking` deep link handler reads `/join/:token`, joins if authed, stores token in `AsyncStorage` if not. `LoginScreen` + `RegisterScreen`: post-auth check consumes stored pending token. `app.json`: `"scheme": "tandempay"` added.
- **Web** — `frontend/src/pages/JoinPage.tsx`: public landing at `/join/:token` showing group preview with App Store CTA and "Open in App" deep link button.

### PR #193 — feat: escalating nudge system *(merged)*
- **`backend/app/services/nudge_service.py`** (new file):
  - `send_nudge(settlement, session)` — fetches debtor/creditor/group, sends push via `push_for_user()` + email via `send_notification_email()`, increments `nudge_count`, sets `last_nudged_at`. Fire-and-forget; never raises.
  - `run_nudge_job()` — queries all `pending` settlements with `nudge_count < 3` matching the timing windows (count 0: `created_at ≤ now − 3d`; count 1: `last_nudged_at ≤ now − 4d`; count 2: `last_nudged_at ≤ now − 7d`). Sends nudge per record and logs total.
- **Copy**: count 0 — "Friendly reminder 👋 / You owe {creditor} ${amount} in {group}"; count 1 — "Still outstanding 💸 / {creditor} is waiting on ${amount}"; count 2 — "Final reminder / Don't forget — you owe {creditor} ${amount}".
- **`backend/app/main.py`**: `run_nudge_job` registered with `CronTrigger(hour=9, minute=0, timezone="America/Toronto")`, id `"nudge_tick"`.
- **Alembic migration** `20260613_add_nudge_fields_to_settlement_records` — adds `nudge_count INTEGER NOT NULL DEFAULT 0` and `last_nudged_at TIMESTAMP WITH TIME ZONE` to `settlement_records` (both `IF NOT EXISTS`). **Confirmed applied to prod** — `nudge_count` incrementing in production verified manually.

### PR #194 + PR #195 — temp debug endpoint added then removed *(both merged)*
- `POST /api/debug/run-nudge-job` added to manually trigger `run_nudge_job()` for testing, then removed once the nudge system was verified in production. No net code change.

---

## R2 — Interac Email Parsing — ✅ DONE (merged 2026-06-03, PRs #104, #105, #106)

### Infrastructure (DONE)
- SendGrid account created
- `tandempay.ca` domain authenticated in SendGrid (CNAMEs + TXT added to Namecheap)
- Inbound Parse configured: `inbound.tandempay.ca` → `https://api.tandempay.ca/api/interac/inbound`
- MX record added: `inbound` → `mx.sendgrid.net` priority 10
- SendGrid API key created (`tandempay-inbound`) with Inbound Parse + Mail Send permissions
- `SENDGRID_WEBHOOK_SECRET` added to Vercel backend environment variables

### Code — all merged into `main`

| # | Item | Status |
|---|---|---|
| R2-1 | `InteracEmailLog` model + Alembic migration `7af805ecb0e7` | ✅ DONE |
| R2-2 | `email_parser.py` — bank regex patterns (Big 5 + NBC + credit unions) | ✅ DONE |
| R2-3 | `interac_matcher.py` — fuzzy name matching + `confirm_settlement` | ✅ DONE |
| R2-4 | `interac_routes.py` — `POST /api/interac/inbound` SendGrid webhook, `SENDGRID_WEBHOOK_SECRET` in `config.py`, router registered in `main.py` | ✅ DONE — confirmed live in `backend/app/routes/interac_routes.py` on `main` |
| R2-5 | `PaymentRecordCard.tsx` — green "Auto-confirmed via Interac" pill, shown when `status === 'settled' && auto_confirmed && method === 'interac'` | ✅ DONE — confirmed live on `main` (line ~94) |
| — | `auto_confirmed` boolean added to `SettlementRecord` model + schema; Alembic migration `a107c01bd8f1`; `confirm_settlement` stamps the field | ✅ DONE |

Landed via PR #104 (webhook route + auto_confirmed field + frontend badge), PR #105 (Interac email parsing follow-ups across web pages), and PR #106 (R1 Settle Up redesign bundled with Interac auto-confirm wiring).

### Still to verify (non-code / ops)
1. Confirm Alembic migrations `7af805ecb0e7` and `a107c01bd8f1` have been run against prod Supabase (latest head is `a107c01bd8f1` — see "Critical reference points"):
   ```
   $env:DATABASE_URL="postgresql+asyncpg://..." ; alembic upgrade head
   ```
2. Test end-to-end in prod: send a real Interac e-Transfer, forward the confirmation email to `anything@inbound.tandempay.ca`, verify the settlement auto-confirms and the badge appears.

### Misc completed UI items (from this and prior sessions, all live on `main`)
- Balance bars in group Balances tab: character avatars centred (fixed-width container)
- GroupCard web + mobile: subtle grey border, gradient extended, "you're owed" bolder
- Dashboard: "Customise" button moved to top-right badge on character avatar
- CurvedMenu: "TandemPay" wordmark is sole hover/pin trigger; duplicate text removed
- INCOMING/OUTGOING stat cards on dashboard: now clickable, show per-group/per-person breakdown
- GroupCard dark mode: visible box fills, tilt cluster, balance colours

## Free vs Pro feature split

Free tier: Unlimited groups/members, equal-split expenses, debt simplification, Settle Up via Interac (with auto-confirm) or Stripe backup, manual fallback, friend system, notifications, activity feed, 30-day history, CAD only, dark/light mode, web + mobile.

Pro tier ($3.99/mo or $29.99/yr): Recurring expenses (HEADLINE), itemized split + receipt OCR, advanced split types, multi-currency, cross-group dashboard, push notifications, unlimited history, expense categories + summaries, CSV/PDF export, priority support.

## Roadmap status — R1–R5 are ALL DONE and merged into `main`

The table below previously listed these as "remaining roadmap after R2." That was stale — verification against GitHub on 2026-06-06 shows every item is merged and live:

| # | Item | Status | Evidence |
|---|---|---|---|
| R1 | Settle Up modal redesign (Interac primary, card secondary) | ✅ DONE | PR #106 "feat: R1 Settle Up redesign + rebrand + Interac auto-confirm" (merged 2026-06-03) |
| R2 | Interac email parsing | ✅ DONE | See section above |
| R3 | Pro subscription billing infrastructure | ✅ DONE | PR #5 "feat: Pro subscription billing infrastructure (R3)" (merged 2026-05-22) — `subscription_tier`/`stripe_customer_id` on `users`, migration `20260522_add_subscription_fields` |
| R4 | Recurring expenses feature | ✅ DONE | PR #6 "feat: Recurring Expenses Automation (Phase 4 R4)" (merged 2026-05-22) — `RecurringExpense` model, `recurring_routes.py`, `reminder_scheduler.py`/`scheduler.py`, migration `20260522_add_recurring_expenses`, integration tests in PR #50 |
| R5 | CSV/PDF export | ✅ DONE | PR #7 "feat: CSV/PDF Export (Phase 4 R5)" (merged 2026-05-22), refined in PR #24 "restructure tab nav + Pro hub, Recurring, Export screens" |
| R5+ | Multi-currency, itemized split, receipt OCR, mobile Pro tier | ✅ DONE (UI scaffolding at minimum) | PR #21 "Feat/mobile pro tier", PR #24 (Pro hub/Export/OCR screens), PR #25 (OCR copy fix), PR #20 (crown badge + `/pro-success` page + checkout wiring) |

**Nothing from the original R1–R5 roadmap remains open.** If there's a next phase (R6+), it hasn't been documented yet — define it fresh rather than trusting the old table.

---

## Pro screens + design spec session (2026-06-13) — PRs #197–#204

All PRs listed below are **merged** into `main` unless otherwise noted.

### PR #197 — docs: add DESIGN_SPEC.md *(merged)*
- `DESIGN_SPEC.md` added at repo root as source-of-truth for the TandemPay design language. 10 sections covering the color system (all semantic tokens + 6 accent presets), typography, spacing scale, border radii, animation/motion configs, character system, component patterns, screen layout rules, icon library, and 13 Fable-originated design decisions with rationale. Intended as the reference for all future code changes and AI agents — replaces guessing at design values.

### PR #198 — feat: add SubscriptionScreen UI with stubbed IAP (RevenueCat TODO) *(merged)*
- **`SubscriptionScreen.tsx`** (new): Monthly/Annual toggle with `Animated.spring` pill; Free plan card; Pro card with `LinearGradient` header; "Save 40%" badge + `$2.92/mo` with crossed-out `$4.99` in annual mode; CTA detects `Platform.OS` to show "Continue with Apple Pay" or "Continue with Google Pay"; `purchasePro()` stub logs `TODO: wire RevenueCat`; Restore purchases link; Terms/Privacy footer; already-Pro confirmation state with crown icon.
- `RootNavigator`: `Subscription` screen registered with `slide_from_right` animation.
- `ProHubScreen`: "Upgrade to Pro →" button now navigates to `SubscriptionScreen` (was opening a web URL).

### PR #199 — feat: wire ExportScreen to real CSV and PDF export endpoints *(merged)*
- Removed the Pro-gate `Alert` that redirected non-Pro users to the web. Non-Pro users now see a full upsell card with "Upgrade to Pro" CTA → `navigation.navigate('Subscription')`.
- Pro users see CSV and PDF export cards with per-button loading spinners. Export flow (`FileSystem.downloadAsync` → `Sharing.shareAsync`) was already correct — no changes to download logic.

### PR #200 — feat: wire RecurringScreen create and delete for Pro users *(merged)*
- **`api.ts`**: added `recurringApi.delete(id)` → `DELETE /api/recurring/{id}`.
- **`RecurringScreen.tsx`**: Frequency options expanded to include `biweekly`; start date is now user-entered (YYYY-MM-DD TextInput, validated before submit); swipe-to-delete on each row (core RN `PanResponder` + `Animated`, no new deps) — swipe left > `scale(48)` reveals red Delete button, confirms via Alert, optimistic remove with rollback on error; non-Pro upsell now navigates to `SubscriptionScreen` instead of `Linking.openURL`.

### PR #201 — fix: replace all Coming Soon alerts with proper states or upsell cards *(merged)*
- Batch cleanup across multiple screens:
  - `ProHubScreen`: Notifications row now navigates to `NotificationsScreen`; Privacy and Security row removed (unbuilt); `handleProAction` navigates to `SubscriptionScreen`.
  - `ExportScreen` + `RecurringScreen` + `ProUpgradeScreen`: all `Linking.openURL` Pro-gate redirects replaced with `navigation.navigate('Subscription')`.
  - `PaymentsScreen`: Stripe Connect Alert replaced with `Linking.openURL` to `tandempay.ca/account`.

### PR #202 — fix: add Export/Recurring to ProHub nav, polish SubscriptionScreen Pro card *(merged)*
- `ProHubScreen`: Export and Recurring rows added between Notifications and Invite a friend (FileDown/RefreshCw icons); price pill gets shimmer animation (opacity 0.7→1.0 loop, 1800ms).
- `SubscriptionScreen` Pro card: feature order rewritten (AI Receipt Scanning → Recurring → Export → Priority Support); CTA label shows price (`Go Pro at $4.99/mo`); social proof line ("Trusted by roommates across Canada") added below features.

### PR #203 — feat: redesign Me section screens to Apple HIG + DESIGN_SPEC standard *(merged)*
Full redesign of all five Me-section screens (`ProHubScreen`, `AppearanceScreen`, `ExportScreen`, `RecurringScreen`, `SubscriptionScreen`) to share the same primitives as `DashboardScreen`/`GroupDetailScreen`:
- `ProHubScreen`: `LinearGradient(heroGradient)` hero card, shimmer price pill, four labeled settings sections (Account / Preferences / Social / Support) in `ms(20)` surface cards with row dividers, `PressableScale` on every row.
- `AppearanceScreen`: 3×2 spring-animated accent swatch grid, two-option Light/Dark pill cards, live preview card showing heroGradient + cardGradient + tab bar mock.
- `ExportScreen` + `RecurringScreen` + `SubscriptionScreen`: DESIGN_SPEC-compliant spacing, `SafeAreaView` from `react-native-safe-area-context`, `SkeletonBlock` loading states, FAB for RecurringScreen, `PressableScale` on all primary actions.

### PR #204 — fix: Pro card always dark background, character card border in light mode *(merged)*
- `SubscriptionScreen` Pro card gradient hardcoded to `['#0D2B18','#0F3320','#0A1F12']` — always dark regardless of theme (was using `colors.cardGradient` which is near-white in light mode, making white text invisible).
- Crown icon changed from `#fff` to `#F2C200` (gold). Feature check icons changed to `colors.accent` (readable on always-dark background).
- Price pill text: `isDark ? colors.accent : '#0D2B18'` — dark ink on white pill in light mode.
- Hero card in light mode: collapses gradient to `colors.surface` + adds `1px borderColor: colors.border` for definition against light background.

---

## Smart Split session (2026-06-13/14) — PRs #205–#207

All PRs are **merged** into `main`.

### PR #205 — feat: build Smart Split with Gemini NLP parsing and full review UI *(merged)*
- **Backend** — `POST /api/smart-split`: accepts `description`, `group_id`, `member_ids`; fetches member names from DB; sends to Gemini 2.5 Flash; returns `{ title, total, splits[], needs_total }` or `{ parse_failed: true }`. Same four-step JSON extraction pipeline as `receipts.py` (direct → strip fences → regex → `ast.literal_eval`).
- **`api.ts`**: `SmartSplitApi` added with typed request/response interfaces.
- **`SmartSplitScreen.tsx`** (full rewrite) — three phases:
  - **Input**: group picker bottom sheet (spring animation, `ms(28)` border radius), animated cycling placeholder on `TextInput` (fade 300ms, 3s interval), member chips with include/exclude toggle, `PressableScale` "Split it →" CTA, `SkeletonBlock` loading state.
  - **Review**: editable title and total (`ms(32) T.extrabold letterSpacing -1.2 colors.accent`), `colors.warning` border + helper text when `needs_total: true`, per-member editable amount pills, live remaining-amount warning when splits ≠ total, Add Expense CTA → `POST /api/groups/{id}/expenses` → `navigation.goBack()`.
  - **Error**: amber `round` CharacterShape, "Couldn't parse that", retry + start-over links.

### PR #206 — fix: make smart split parsing more robust with logging and retry *(merged)*
- Structured logging via `logger = logging.getLogger("tandempay.smart_split")` — every request emits `smart_split request/prompt/gemini_raw/parsed_ok/first_attempt_failed/result` log lines through the existing `JsonFormatter` → Vercel logs.
- Prompt hardened: explicit JSON-only instruction, amount format examples (`$85`, `85.00`, `"eighty-five dollars"`), vague-split guidance (`"split evenly"` → divide equally).
- Retry logic: if all four extraction steps fail, a simpler fallback prompt is tried once (`extract title + total only`). On fallback success, zero-amount splits are synthesized for all members so the review screen renders and the user can fill in amounts. `parse_failed: true` only returned if both Gemini calls produce complete garbage.

### PR #207 — feat: Smart Split conversational intents + voice input *(merged)*
- **Backend** — `POST /api/smart-split` expanded with 6-intent detection prompt: `parse_expense`, `exclude_member`, `add_to_group`, `create_group`, `adjust_split`, `clarify`. New `POST /api/smart-split/voice` accepts multipart audio and sends to Gemini 2.5 Flash multimodal API as base64 `inline_data`.
- **`api.ts`**: `SmartSplitEntry` updated (added `name`, `included`), `SmartSplitResponse` expanded with all intent fields, `smartSplitApi.parseVoice()` added using raw `fetch` for multipart form-data.
- **`SmartSplitScreen.tsx`**: Full intent dispatch via `handleIntentResult`; voice recording via `expo-av` (30s auto-stop, spring pulse animation, red dot + "Listening..." indicator); inline clarify card with follow-up `TextInput`; action sheets for `add_to_group`/`create_group`/`remove_from_group` (long-press chips); member chips show `opacity 0.38` + strikethrough when excluded; green toast for conversational confirmations.
- **`expo-av`** installed as new dependency.

---

## 2026-06-20 session — PRs #211–#212

### PR #211 — feat/theme-crossfade → theme crossfade animation *(open)*
- **`ThemeContext.tsx`**: added `themeOpacity: Animated.Value` to the context interface; created a `themeOpacity` ref (`useRef(new Animated.Value(1)).current`); added `fadeTransition(callback)` helper — runs `Animated.sequence([fade→0 120ms, fade→1 180ms])` and calls the state-update callback via `setTimeout(callback, 120)` so the re-render lands exactly at the opacity=0 midpoint; wrapped both `setTheme` and `setAccent` to call `fadeTransition` before persisting to AsyncStorage; exported `themeOpacity` from the provider value.
- **`RootNavigator.tsx`**: destructured `themeOpacity` from `useTheme()`; replaced `<Fragment>` wrapper with `<Animated.View style={{ flex: 1, opacity: themeOpacity }}>` so every theme/accent change produces a smooth 120ms fade-out / 180ms fade-in crossfade across the entire navigator tree.

### PR #212 — fix/edit-expense-ui → edit expense UI + backend fixes *(open)*

**Mobile — edit expense UI restored (`GroupDetailScreen.tsx`, `api.ts`)**
- `GroupDetailScreen.tsx`: added `Keyboard` to RN imports, `Pencil` to lucide imports, `PressableScale` import. Added edit state variables (`editTarget`, `editTitle`, `editAmount`, `editSaving`, `toastMsg`, `toastAnim`). Added `showToast` callback (200ms fade in, 1800ms hold, 200ms fade out). Added `handleEditSave`: validates non-empty title and positive amount, calls `expensesApi.patch`, applies optimistic update to local expense list, dismisses sheet, shows toast. Added Pencil icon (16px, `colors.textSecondary`) in every expense row's `rowEnd` — visible to all members, not just `paidByMe`. Added edit bottom-sheet `<Modal animationType="slide" transparent>` with handle pill, two `TextInput`s (title/amount), `PressableScale` Save button, Cancel link. Added inline `<Animated.View>` toast overlay. Added styles: `editOverlay`, `editSheet` (`borderTopRadius ms(28)`), `editHandle`, `editSheetTitle`, `editLabel`, `editInput`, `editSaveBtn`, `editSaveBtnText`, `editCancelLink`, `editCancelText`, `toast`, `toastText`.
- `api.ts`: added `patch` method to `expensesApi` → `PATCH /expenses/{expenseId}` with `{ title?, amount? }` body, typed return as `Expense`.

**Backend — `timezone` import fix (`models.py`)**
- `from datetime import datetime, date` → `from datetime import datetime, date, timezone`. Fixes `NameError: name 'timezone' is not defined` at the `Column(default=lambda: datetime.now(timezone.utc))` on the `InteracEmailLog` model.

**Backend — SQLAlchemy lazy-load guard (`settlements.py`)**
- Added `await db.refresh(current_user)` as the first line of `create_settlement` body; extracted `user_id = current_user.id` immediately after. Replaced all 8 subsequent references to `current_user.id` within the function with `user_id`. Prevents `MissingGreenlet` errors from SQLAlchemy trying to lazy-load an expired attribute outside the async greenlet context.

**Backend — Wealthsimple + Tangerine email parsers (`email_parser.py`)**
- Added `_truncate_name(raw)` helper after `_clean_name`: splits at `[\r\n]`, then at `\b(and|has|from)\b`, then calls `_clean_name`. Prevents names bleeding into email body copy.
- Added `_try_wealthsimple`: matches `interac e-transfer` subject; extracts name/amount from `"e-Transfer of $X from [Name] has been deposited"`, `"[Name] sent you $X"`, or `"you sent … to [Name]"` patterns; `bank='wealthsimple'`, `confidence='high'`.
- Added `_try_tangerine`: matches `interac e-transfer` subject; extracts from `"[Name] has sent you an Interac e-Transfer for $X"` or `"you sent … to [Name]"`; `bank='tangerine'`, `confidence='high'`.
- Applied `_truncate_name` to the `_try_generic` name extraction path (was using bare `_clean_name`).
- Added `_try_interac_central` as the **highest-priority parser** for `notify@payments.interac.ca`: primary pattern reads structured `Transfer Details` table (`Sent From:\s*\n?\s*([A-Z][A-Z\s]+?)` and `Amount:\s*\$?([\d,]+\.?\d*)\s*\(CAD\)`); fallback reads subject line (`received \$([\d,]+\.?\d*) from ([A-Z][A-Z\s]+?) and`); `bank='interac'`, `confidence='high'`. Placed first in `_PARSERS` list so it intercepts before any bank-specific parsers.
- Updated `_PARSERS = [_try_interac_central, _try_rbc, _try_td, _try_scotia, _try_bmo, _try_cibc, _try_nbc, _try_wealthsimple, _try_tangerine, _try_generic]`.

**Note on parser chain ordering**: `_try_wealthsimple` and `_try_tangerine` are still intercepted by `_try_td`/`_try_scotia` in integration tests because those parsers also check for generic `interac e-transfer` subject. In production this is handled by route-level domain filtering on `notify@wealthsimple.com` / `tangerine.ca` before the chain runs. The parsers work correctly when called directly.

---

## Pre-Launch Checklist (non-code)

1. Register Canadian business entity
2. Add Privacy Policy and Terms of Service live URLs
3. Determine FINTRAC MSB registration requirement (consult Canadian fintech lawyer)
4. Start Stripe Connect application (2–4 week review)

---

## Working agreements with Claude

1. **No direct code edits.** Claude produces scoped Claude Code prompts. Vedant pastes, Claude Code executes.
2. **No git operations from bash.** Hand off to Claude Code.
3. **Conserve usage.** Short responses when sufficient. Skip mockups unless requested.
4. **One prompt at a time.** Don't merge unrelated changes into mega-prompts.
5. **Always open prompts with a graphify check.** Every prompt handed to Claude Code must start with an instruction to check the graphify report in `graphify-out/` before reading any source files. This lets Claude Code orient from the pre-built knowledge graph rather than re-reading files cold, saving significant token usage.
6. **Stay on `main` after a PR merges — don't auto-switch back to WIP branches.** After any PR is opened and merged, stay checked out on `main` (pulled to latest) instead of automatically switching back to the `nickname-consolidation` branch (or any other in-progress feature branch). The local checkout is what gets tested via `expo start --tunnel`, so it needs to reflect the latest merged work by default. Keep WIP branches safe on their own branch or in a stash — only restore one onto the working tree when Vedant explicitly asks to continue that specific work, not automatically after every unrelated fix.

## Critical reference points

- **Repo path (Windows):** `C:\Users\vedan\Documents\Tandempay`
- **GitHub:** `github.com/Vedantdave66/Tandempay`
- **Vercel projects:** `tandempay-api` (backend), `tandempay` (frontend)
- **Database:** Supabase Postgres via Transaction Pooler. `DATABASE_URL` uses `postgresql+asyncpg://` on port 6543.
- **Alembic baseline:** `1a2b3c4d5e6f_initial_schema.py`. Latest head: `20260613_add_nudge_fields_to_settlement_records` (chain: `... → 20d7c91bb5df → 534d32e54b2b → 7af805ecb0e7 → a107c01bd8f1_add_auto_confirmed → 20260612_add_push_token_to_users → 20260613_add_invite_token_to_groups → 20260613_add_nudge_fields_to_settlement_records`). All migrations confirmed run against prod Supabase.
- **SendGrid:** Domain `tandempay.ca` authenticated. Inbound Parse on `inbound.tandempay.ca`.

## What to open with in the new session

> "TandemPay's R1–R5 roadmap, all mobile UI revamp PRs (#123–#149), the June 13 sprint (PRs #184–#195), the Pro screens + design spec session (PRs #197–#207), and Smart Split (PRs #205–#207) are all merged into `main`. Four PRs are currently **open**: PR #202 (ProHub nav + Subscription Pro card polish), PR #203 (full Me-section redesign to Apple HIG + DESIGN_SPEC), PR #211 (theme crossfade animation), and PR #212 (edit expense UI + backend fixes). Run `gh pr list` to confirm current state. Alembic head is `20260613_add_nudge_fields_to_settlement_records` — confirmed applied to prod. Smart Split is live with voice input via Gemini multimodal. The 2026-06-20 session added Wealthsimple/Tangerine/Interac central email parsers and restored the edit expense bottom-sheet UI. The two remaining non-code blockers before closed beta are the Interac end-to-end test and the pre-launch legal/business checklist."

## Open items / things to double-check next session

1. **PR #202 + PR #203 need review/merge** — #202 adds Export/Recurring to ProHub nav and polishes the Subscription Pro card; #203 is the full Me-section redesign to Apple HIG + DESIGN_SPEC. Both are open on the `fix/prohub-nav-subscription-polish` and `feat/me-section-redesign` branches.
2. **PR #211 (theme crossfade) + PR #212 (edit expense UI + backend) need review/merge** — both open, targeting `main`.
3. **RevenueCat IAP** — `SubscriptionScreen` CTA is stubbed (`purchasePro()` logs TODO). Wire RevenueCat before launching Pro billing in production.
4. **Canvas drag UX on device** — vertical-priority `PanResponder` (`|dy| > 6 && |dy| > |dx| × 1.3`) is untested on a physical device. Confirm horizontal swipes scroll the carousel and upward drags launch the ghost. Adjust threshold if needed.
5. **Interac end-to-end test** — no record found of a real e-Transfer being forwarded through `inbound.tandempay.ca` to verify the full auto-confirm pipeline in production.
6. **Pre-launch checklist** — still open non-code work (business registration, legal docs, FINTRAC, Stripe Connect).
7. **Define R6+** — the roadmap table is fully done; no documented next phase.
8. **Nudge job on Vercel (serverless)** — `run_nudge_job` is registered via APScheduler which only runs on long-lived servers. On Vercel (serverless), the `is_serverless` guard skips the scheduler entirely. If prod runs on Vercel, the nudge cron needs an external trigger (e.g. Vercel Cron, GitHub Actions schedule hitting `POST /api/debug/run-nudge-job` — but that endpoint was deleted in PR #195). Decide: add a lightweight authenticated cron endpoint, or move to a Render/Railway worker.
9. **Invite link deep link on iOS** — `tandempay://join/{token}` requires the app to be installed. Universal links (`https://tandempay.ca/join/{token}`) would fall back to the web `JoinPage`. Not yet wired.
10. **Smart Split voice on device** — `expo-av` recording and the Gemini multimodal voice pipeline are untested on a physical device. Verify mic permissions, 30s auto-stop, and that transcription preview appears in the input field before the result is processed.
11. **Edit expense — all members see Pencil** — by design the Pencil icon is shown on all expense rows to all group members (not just the creator). If the intention is owner-only editing, add a `paidByMe` or `createdBy` guard before showing the icon.
12. ~~**Prod migration check**~~ — ✅ Confirmed. All migrations through `20260613_add_nudge_fields_to_settlement_records` applied to prod Supabase.
13. ~~**Accent theming completeness**~~ — ✅ Fixed in PR #149. `accentBg`, `accentBgFaint`, `accentLight` now computed dynamically from the current accent hex in `ThemeContext`.
