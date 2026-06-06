# [Mobile R1] GroupCard Redesign — React Native

## Context

Load `graphify-out/GRAPH_REPORT.md` first.
Relevant communities: **30** (Mobile Group Navigation), **5** (Mobile Social Screens), **17** (React Native Auth Context), **37** (Mobile Theme System), **9** (Mobile App Dependencies), **16** (UI Primitive Components — has the web CharacterShape to reference).

---

## Problem

`mobile/src/screens/GroupsScreen.tsx` renders a plain horizontal list card. The web app shipped a redesigned `GroupCard` (dark surface, green glow, character avatar row, name pill, balance pills) in PRs #84–88. Mobile should match it. Neither `CharacterShape` nor a standalone `GroupCard` component exist in mobile yet.

---

## Task

**CREATE** `mobile/src/components/CharacterShape.tsx`
Port `frontend/src/components/CharacterShape.tsx` to React Native. Replace `div` → `View`, inline CSS border-radius strings → individual `borderTopLeftRadius`/`borderTopRightRadius` props (bottom corners always 0). Export `MINI_CONFIGS` and `ShapeVariant` unchanged.

**CREATE** `mobile/src/components/GroupCard.tsx`
Port `frontend/src/components/GroupCard.tsx` to React Native. Reference the web file for all layout, spacing, and colour logic. Key RN-specific decisions:
- Use `expo-linear-gradient` (already installed) for the green glow — `colors={['rgba(34,197,94,0.18)', 'transparent']}`, height 112, positioned absolute at top.
- Replace `onClick` / `useNavigate` with an `onPress: () => void` prop.
- Use `useTheme()` for colours; use `useAuth()` only in the parent — not inside this component.
- Gracefully handle `members={undefined}` or `members={[]}` without crashing.

Props:
```ts
interface GroupCardProps {
  group: GroupListItem;
  members?: UserBalance[];
  myNetBalance?: number;
  onPress: () => void;
}
```

**MODIFY** `mobile/src/services/api.ts` — `UserBalance` interface only:
```ts
character_shape?: string;
character_color?: string;
```

**MODIFY** `mobile/src/screens/GroupsScreen.tsx`
- Add `balanceMap: Record<string, UserBalance[]>` state.
- In `load()`: call `setGroups(data)` first, then fetch all balances in parallel with `Promise.all` + per-group `.catch(() => [])`. Wrap the balance block in its own `try/catch` so a failure never prevents the groups list from rendering.
- Use `useAuth()` to get `user.id` for finding `myNetBalance`.
- Replace the inline `renderGroup` card with `<GroupCard>`.
- Everything else (SafeAreaView, header, FAB, empty state, RefreshControl, ActivityIndicator) stays identical.

---

## Rules

1. New files only for `CharacterShape` and `GroupCard` — no other existing files touched except the two listed above.
2. `api.ts` change is additive only — no existing fields modified.
3. No new packages.
4. `setGroups` fires before balance fetches so the list renders immediately.
5. Balance fetch failures are silent — the card renders without balance info, not an error.
