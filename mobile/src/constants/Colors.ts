// ─── TandemPay Design System ───────────────────────────────────────────────
// Light: soft green-white bg, pure white cards, #A8D5A2 primary, #1A1A1A text
// Dark:  #121212 bg, #1E1E1E cards, #F5F5F5 text, same green accent

export const Colors = {
  light: {
    // Text
    text: '#1A1A1A',
    secondaryText: '#888888',
    faintText: '#AAAAAA',
    // Backgrounds
    background: '#F0F7F0',
    surface: '#FFFFFF',
    surfaceHover: '#F7FBF7',
    // Borders & dividers
    border: 'rgba(0,0,0,0.07)',
    // Accent / brand
    accent: '#A8D5A2',
    accentDark: '#6BBF67',      // for text on green buttons
    accentBg: 'rgba(168,213,162,0.18)',
    accentBgFaint: 'rgba(168,213,162,0.10)',
    tint: '#A8D5A2',
    accentHover: '#8FCA8A',
    tabIconDefault: '#BBBBBB',
    tabIconSelected: '#A8D5A2',
    primary: '#1A1A1A',
    // Semantic
    danger: '#E05252',
    warning: '#F59E0B',
    warningBg: 'rgba(245,158,11,0.12)',
    warningBright: '#D97706',
    indigo: '#6366F1',
    gold: '#D4A853',
    // Faint variants used for chips, pills, icon tiles
    accentBg: '#DCEFDA',
    accentBgFaint: '#EAF5E8',
    warningBg: '#FEF3C7',
    warningBright: '#B45309',
    faintText: '#94A3B8',
    // Shadows
    shadow: 'rgba(0,0,0,0.05)',
    cardShadow: 'rgba(0,0,0,0.06)',
    // GroupCard
    groupGlow:       ['#F3FBF4', '#D8F4E1', '#8FE9B0', '#D8F4E1', '#F3FBF4'] as [string, string, string, string, string],
    groupBoxFill:    '#FFFFFF',
    groupBoxBorder:  'rgba(0,0,0,0.05)',
    groupBoxShadow:  'rgba(20,60,35,0.10)',
    groupLabel:      '#0A5F30',
    groupOwe:        '#C28A00',
    groupOwed:       '#0E9F4F',
    groupOthersFill: '#E6EAE5',
    groupOthersInk:  '#46504A',
    groupNameInk:    '#0E140F',
    groupArrowBg:    'rgba(0,0,0,0.03)',
  },
  dark: {
    // Text
    text: '#F5F5F5',
    secondaryText: '#999999',
    faintText: '#777777',
    // Backgrounds
    background: '#121212',
    surface: '#1E1E1E',
    surfaceHover: '#252525',
    // Borders
    border: 'rgba(255,255,255,0.08)',
    // Accent / brand — green stays
    accent: '#A8D5A2',
    accentDark: '#1A1A1A',
    accentBg: 'rgba(168,213,162,0.16)',
    accentBgFaint: 'rgba(168,213,162,0.09)',
    tint: '#A8D5A2',
    accentHover: '#8FCA8A',
    tabIconDefault: '#555555',
    tabIconSelected: '#A8D5A2',
    primary: '#F5F5F5',
    // Semantic
    danger: '#EF4444',
    warning: '#F59E0B',
    warningBg: 'rgba(245,158,11,0.15)',
    warningBright: '#FBBF24',
    indigo: '#818CF8',
    gold: '#D4A853',
    // Faint variants used for chips, pills, icon tiles
    accentBg: 'rgba(168,213,162,0.16)',
    accentBgFaint: 'rgba(168,213,162,0.10)',
    warningBg: 'rgba(245,158,11,0.16)',
    warningBright: '#FBBF24',
    faintText: '#6B7280',
    // Shadows
    shadow: 'rgba(0,0,0,0.3)',
    cardShadow: 'rgba(0,0,0,0.4)',
    // GroupCard
    groupGlow:       ['#070A08', '#0A4A26', '#1AA94E', '#0A4A26', '#070A08'] as [string, string, string, string, string],
    groupBoxFill:    '#0A0B0A',
    groupBoxBorder:  'transparent',
    groupBoxShadow:  'transparent',
    groupLabel:      '#0B6B38',
    groupOwe:        '#F2C200',
    groupOwed:       '#27E06A',
    groupOthersFill: '#2A2C2A',
    groupOthersInk:  '#D7DAD6',
    groupNameInk:    '#FFFFFF',
    groupArrowBg:    'rgba(255,255,255,0.04)',
  },
};
