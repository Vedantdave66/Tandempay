# Design Notes — Apple HIG Deep Pass

Scope of this pass: DashboardScreen, NotificationsScreen, ActivityScreen, PaymentsScreen,
FriendsScreen, GroupsScreen, GroupCard. CustomTabBar was audited and intentionally left
alone — its glass pill, spring limelight, and haptics already meet the bar.
Untouched per constraints: CanvasModeView, CharacterShape, Colors.ts, ThemeContext, SplashScreen.

## Top 5 slop patterns removed

1. **`T.extrabold` on everything.** Titles, amounts, statuses, section headers, modal
   headings — all shouting at the same volume, which means nothing is emphasized.
   Extrabold is now reserved for exactly one element in the app: the net balance figure
   on the dashboard. Everything else steps down to bold/semibold/regular, and hierarchy
   reads from weight contrast again.

2. **Decorative shadows on flat content.** Payment cards, friend cards, activity
   containers, and even an *empty state* carried copy-pasted
   `shadowOpacity: 0.28–0.50 / shadowRadius: 14–20 / elevation: 4–14` blocks. None of
   these elements are elevated in the z-hierarchy — they're rows sitting on the
   background. All removed. Shadows now exist only on genuinely floating things (tab
   bar, FAB, action menu, sheets).

3. **Palette-tool color rainbow.** NotificationsScreen tinted each notification type
   with a different stock hex (`#3B82F6`, `#8B5CF6`, `#6366F1`, `#F59E0B`…) — colors
   that exist nowhere else in the brand. Replaced with discipline: green
   (`colors.accent`) only for confirmed money, `colors.danger` only for declined,
   greyscale for everything else. ActivityScreen's colored left-border strips (a
   Bootstrap-alert pattern, not an iOS one) are gone too — unread state is a single
   accent dot plus weight change.

4. **Raw `fontWeight` instead of the type system.** NotificationsScreen used
   `fontWeight: '900'` and `'bold'` literals; ActivityScreen mixed `'500'/'600'/'700'`.
   Every text node now goes through the `T` tokens, so the whole app renders one
   typeface voice.

5. **ALL-CAPS labels with aggressive tracking + bordered chrome.** `letterSpacing: 1.1–1.3`
   caps labels, hairline borders on segmented controls and stat containers that already
   had background fills, and `borderWidth: 2` inputs. Caps labels now sit at 0.2–0.6
   tracking in `secondaryText`, and anything with a background color lost its border.

## 3 Apple design decisions and why

1. **Inset grouped lists for activity and notifications.** Rows now live inside a
   `ms(16)` rounded container with hairline separators at Apple's exact
   `rgba(*,0.08)`, 44pt minimum row height, `ms(10)` icon containers, and a
   `size={16} faintText` chevron only where a row actually navigates. This is the
   Settings/Wallet list grammar — users parse it instantly because they've seen it ten
   thousand times. The previous "every row is its own floating card" pattern read as a
   feed of ads.

2. **Tinted capsule for "+ New" instead of a filled, glowing button.** App Store's GET
   button: `accentBg` fill, accent text, no shadow. A small utility action shouldn't
   compete with the primary content — Deference. The accent *fill* is now reserved for
   true primary CTAs (Confirm, Settle up, Send), and "Decline" became a text-only
   `colors.danger` button, because Apple never fills destructive actions outside a sheet.

3. **Haptics mapped to meaning, not to taps.** Light impact on list-row navigation,
   medium on primary CTAs, success/error notifications on settlement outcomes — and
   nothing on decorative interactions. Combined with the tightened sheet spring
   (`damping: 24, stiffness: 220`, handle at `ms(2)` radius, backdrop 0.4/0.3 per mode)
   and 30 ms list stagger, the app now *feels* like it responds rather than animates.

## One thing intentionally left imperfect

The **indigo wallet card on PaymentsScreen** (`#E0E7FF` / `#4F46E5` hardcoded palette).
It's off-brand — straight out of a Tailwind swatch — and by the color rules above it
should be rebuilt on theme tokens. I removed its border and fixed its typography, but
left the palette: it's the one surface meant to read as a physical *card* (the Wallet
metaphor), and recoloring it properly deserves a deliberate brand decision — pick a
card identity, design dark-mode variants, maybe gradient stock — not a drive-by hex
swap that would just trade one arbitrary color for another. Flagged for a dedicated
brand pass.
