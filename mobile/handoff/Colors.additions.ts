// ─── ADD THESE KEYS to BOTH palettes in mobile/src/constants/Colors.ts ───
//
// WHY: GroupCard's pill + value boxes currently use `colors.surface`, which is
// the SAME color as the card itself (#1E1E1E dark / #FFFFFF light) — so in dark
// mode they're black-on-black and disappear. These give the card its own
// surfaces + a real glow ramp, themed for both modes.
//
// Paste the `group*` block inside each existing palette object.

export const Colors = {
  light: {
    /* …existing light keys (text, surface, border, …) … */

    // ── GroupCard ──────────────────────────────────────────────
    groupGlow:      ['#F3FBF4', '#D8F4E1', '#8FE9B0', '#D8F4E1', '#F3FBF4'], // top→center→bottom
    groupBoxFill:   '#FFFFFF',           // title pill + value boxes (elevated white)
    groupBoxBorder: 'rgba(0,0,0,0.05)',
    groupBoxShadow: 'rgba(20,60,35,0.10)',
    groupLabel:     '#0A5F30',           // section labels — GREEN, not grey secondaryText
    groupOwe:       '#C28A00',           // amount when you owe (deepened gold for white bg)
    groupOwed:      '#0E9F4F',           // amount when you're owed (deepened green)
    groupOthersFill:'#E6EAE5',
    groupOthersInk: '#46504A',
    groupNameInk:   '#0E140F',           // character name labels
    groupArrowBg:   'rgba(0,0,0,0.03)',
  },
  dark: {
    /* …existing dark keys… */

    // ── GroupCard ──────────────────────────────────────────────
    groupGlow:      ['#070A08', '#0A4A26', '#1AA94E', '#0A4A26', '#070A08'], // near-black→green→near-black
    groupBoxFill:   '#0A0B0A',           // pure-black pill + value boxes (silhouettes on the glow)
    groupBoxBorder: 'transparent',
    groupBoxShadow: 'transparent',
    groupLabel:     '#0B6B38',           // legible green on the glow
    groupOwe:       '#F2C200',           // gold
    groupOwed:      '#27E06A',           // green
    groupOthersFill:'#2A2C2A',
    groupOthersInk: '#D7DAD6',
    groupNameInk:   '#FFFFFF',
    groupArrowBg:   'rgba(255,255,255,0.04)',
  },
};

// TypeScript: `groupGlow` is a string[]; if your palette is strongly typed you may
// need `as const` removed or the type widened to `readonly string[]` for that key.
