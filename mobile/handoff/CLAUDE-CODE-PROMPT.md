# Paste this whole block to Claude Code

I need you to fix the `GroupCard` component in this repo so it matches the intended design and
works correctly in BOTH dark and light mode. Right now in dark mode the title pill and the value
boxes are invisible (black-on-black) and the green glow is wrong.

I've placed three reference files in the `handoff/` folder:
- `handoff/GroupCard.corrected.tsx`  — the target implementation
- `handoff/Colors.additions.ts`      — new theme tokens to add
- `handoff/GroupCard-Diff.md`         — line-by-line explanation of every change

Please do the following, IN THIS ORDER:

## Step 1 — Add the color tokens FIRST
Open `mobile/src/constants/Colors.ts`. Copy the `group*` keys from
`handoff/Colors.additions.ts` and paste them into BOTH the `light` and the `dark`
palette objects (each palette gets its own values as shown in the file). Do not remove any
existing keys. Note `groupGlow` is a `string[]` — widen the type if the palette is strictly typed.

## Step 2 — Replace the component
Replace the entire contents of `mobile/src/components/GroupCard.tsx` with the contents of
`handoff/GroupCard.corrected.tsx`. Keep it at that same path (it imports from
`../services/api`, `../context/ThemeContext`, `../utils/formatCurrency`, and `./CharacterShape`,
which only resolve from `mobile/src/components/`).

## Step 3 — Verify
- Run the app and open a screen that lists groups.
- Toggle dark/light with the existing ThemeToggle and confirm:
  - Dark: the title pill and both value boxes are visible as black silhouettes on a centered
    green glow (NOT black-on-black).
  - Light: white elevated boxes (subtle border + shadow) on a soft mint glow.
  - Characters peek up from behind the title pill, slightly tilted; "+N others" shows when a
    group has more than 4 members; the balance amount is gold when you owe / green when you're
    owed, and the arrow ring matches.
- Make sure there are no leftover references to `colors.surface`, `#000000`, `#22c55e`, or
  `#f59e0b` inside `GroupCard.tsx`.

## Notes
- Do NOT change `CharacterShape.tsx`, `formatCurrency.ts`, or the API types — the corrected
  component reuses them as-is.
- The glow uses `expo-linear-gradient` (already installed) as a vertical 5-stop. If you'd prefer
  a true radial glow, `react-native-svg` is already available (via `lucide-react-native`) — but
  the linear version is fine to ship.
- After editing, run your typecheck/lint and fix any type widening needed for the new `groupGlow`
  array token.
