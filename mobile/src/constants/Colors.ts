export const ACCENT_PRESETS = {
  forest: {
    light: '#16A34A', dark: '#27E06A',
    glowLight: ['#3BE57F','#8FE9B0','#D8F4E1','#F3FBF4'] as [string,string,string,string],
    glowDark:  ['#1E6A3A','#0D3019','#060F08','#030806'] as [string,string,string,string],
    heroGradLight: ['#BDEECB','#DBF3E2','#FFFFFF'] as [string,string,string],
    heroGradDark:  ['#11833F','#0A4C29','#0A0D0B'] as [string,string,string],
    cardGradLight: ['#3BE57F','#8FE9B0','#D8F4E1','#F3FBF4'] as [string,string,string,string],
    cardGradDark:  ['#1E6A3A','#0D3019','#060F08','#030806'] as [string,string,string,string],
  },
  ocean: {
    light: '#2563EB', dark: '#60A5FA',
    glowLight: ['#3B82F6','#93C5FD','#DBEAFE','#F0F9FF'] as [string,string,string,string],
    glowDark:  ['#1E3A6E','#0D1F3C','#060C15','#030810'] as [string,string,string,string],
    heroGradLight: ['#BFDBFE','#DBEAFE','#FFFFFF'] as [string,string,string],
    heroGradDark:  ['#1D4ED8','#1E3A8A','#08080D'] as [string,string,string],
    cardGradLight: ['#3B82F6','#93C5FD','#DBEAFE','#EFF6FF'] as [string,string,string,string],
    cardGradDark:  ['#1E40AF','#1E3A8A','#060810','#030408'] as [string,string,string,string],
  },
  sunset: {
    light: '#EA580C', dark: '#FB923C',
    glowLight: ['#F97316','#FDBA74','#FFEDD5','#FFF7ED'] as [string,string,string,string],
    glowDark:  ['#7C2D12','#3B1109','#150600','#0A0402'] as [string,string,string,string],
    heroGradLight: ['#FED7AA','#FFEDD5','#FFFFFF'] as [string,string,string],
    heroGradDark:  ['#C2410C','#7C2D12','#0D0806'] as [string,string,string],
    cardGradLight: ['#F97316','#FDBA74','#FED7AA','#FFF7ED'] as [string,string,string,string],
    cardGradDark:  ['#9A3412','#7C2D12','#0F0806','#080503'] as [string,string,string,string],
  },
  candy: {
    light: '#DB2777', dark: '#F472B6',
    glowLight: ['#EC4899','#F9A8D4','#FCE7F3','#FDF2F8'] as [string,string,string,string],
    glowDark:  ['#831843','#3D0A22','#160409','#0A0206'] as [string,string,string,string],
    heroGradLight: ['#FBCFE8','#FCE7F3','#FFFFFF'] as [string,string,string],
    heroGradDark:  ['#BE185D','#831843','#0D0609'] as [string,string,string],
    cardGradLight: ['#EC4899','#F9A8D4','#FBCFE8','#FDF2F8'] as [string,string,string,string],
    cardGradDark:  ['#9D174D','#831843','#0F060A','#080405'] as [string,string,string,string],
  },
  grape: {
    light: '#7C3AED', dark: '#A78BFA',
    glowLight: ['#8B5CF6','#C4B5FD','#EDE9FE','#F5F3FF'] as [string,string,string,string],
    glowDark:  ['#4C1D95','#1F0A40','#0A0418','#05020E'] as [string,string,string,string],
    heroGradLight: ['#DDD6FE','#EDE9FE','#FFFFFF'] as [string,string,string],
    heroGradDark:  ['#6D28D9','#4C1D95','#08060D'] as [string,string,string],
    cardGradLight: ['#8B5CF6','#C4B5FD','#DDD6FE','#F5F3FF'] as [string,string,string,string],
    cardGradDark:  ['#5B21B6','#4C1D95','#09060F','#050408'] as [string,string,string,string],
  },
  slate: {
    light: '#475569', dark: '#94A3B8',
    glowLight: ['#64748B','#CBD5E1','#E2E8F0','#F8FAFC'] as [string,string,string,string],
    glowDark:  ['#334155','#1E293B','#0F172A','#070C15'] as [string,string,string,string],
    heroGradLight: ['#CBD5E1','#E2E8F0','#FFFFFF'] as [string,string,string],
    heroGradDark:  ['#334155','#1E293B','#08090C'] as [string,string,string],
    cardGradLight: ['#475569','#94A3B8','#CBD5E1','#F8FAFC'] as [string,string,string,string],
    cardGradDark:  ['#1E293B','#0F172A','#080A0C','#040506'] as [string,string,string,string],
  },
} as const;

export type AccentKey = keyof typeof ACCENT_PRESETS;

export const Colors = {
  light: {
    // Text
    text: '#020617',
    secondaryText: '#475569',
    tertiaryText: '#94A3B8',
    // Backgrounds
    background: '#F1F5F9',
    surface: '#FFFFFF',
    surfaceHover: '#F8FAFC',
    // Borders
    border: '#E2E8F0',
    // Accent
    accent: '#16A34A',
    accentDark: '#15803D',
    accentLight: '#DCFCE7',
    tint: '#16A34A',
    accentHover: '#15803D',
    tabIconDefault: '#94A3B8',
    tabIconSelected: '#16A34A',
    primary: '#020617',
    // Semantic
    danger: '#DC2626',
    dangerBg: '#FEE2E2',
    warning: '#F59E0B',
    gold: '#B45309',
    // Faint variants
    accentBg: '#DCFCE7',
    accentBgFaint: 'rgba(22,163,74,0.08)',
    warningBg: '#FEF3C7',
    warningBright: '#B45309',
    faintText: '#94A3B8',
    // Shadows
    shadow: 'rgba(15,40,30,0.06)',
    cardShadow: 'rgba(15,40,30,0.10)',
    // GroupCard
    groupGlow:       ['#3BE57F','#8FE9B0','#D8F4E1','#F3FBF4'] as [string,string,string,string],
    groupBoxFill:    '#FFFFFF',
    groupBoxBorder:  'rgba(0,0,0,0.05)',
    groupBoxShadow:  'rgba(20,60,35,0.14)',
    groupLabel:      '#15803D',
    groupOwe:        '#B45309',
    groupOwed:       '#16A34A',
    groupOthersFill: '#E2E8F0',
    groupOthersInk:  '#475569',
    groupNameInk:    '#020617',
    groupArrowBg:    'transparent',
    // Misc
    indigo: '#6366F1',
  },
  dark: {
    // Text
    text: '#F8FAFC',
    secondaryText: '#94A3B8',
    tertiaryText: '#64748B',
    // Backgrounds
    background: '#0A0D0B',
    surface: '#141815',
    surfaceHover: '#1A1E1B',
    // Borders
    border: 'rgba(255,255,255,0.08)',
    // Accent
    accent: '#27E06A',
    accentDark: '#062B16',
    accentLight: 'rgba(39,224,106,0.12)',
    tint: '#27E06A',
    accentHover: '#22C55E',
    tabIconDefault: '#4B5563',
    tabIconSelected: '#27E06A',
    primary: '#F8FAFC',
    // Semantic
    danger: '#EF4444',
    dangerBg: 'rgba(239,68,68,0.14)',
    warning: '#F59E0B',
    gold: '#F2C200',
    // Faint variants
    accentBg: 'rgba(39,224,106,0.12)',
    accentBgFaint: 'rgba(39,224,106,0.07)',
    warningBg: 'rgba(242,194,0,0.14)',
    warningBright: '#F2C200',
    faintText: '#6B7280',
    // Shadows
    shadow: 'rgba(0,0,0,0.4)',
    cardShadow: 'rgba(0,0,0,0.5)',
    // GroupCard
    groupGlow:       ['#1E6A3A','#0D3019','#060F08','#030806'] as [string,string,string,string],
    groupBoxFill:    '#0C0F0D',
    groupBoxBorder:  'rgba(255,255,255,0.06)',
    groupBoxShadow:  'transparent',
    groupLabel:      '#22C55E',
    groupOwe:        '#F2C200',
    groupOwed:       '#27E06A',
    groupOthersFill: '#1E231F',
    groupOthersInk:  '#CBD5E1',
    groupNameInk:    '#FFFFFF',
    groupArrowBg:    'transparent',
    // Misc
    indigo: '#818CF8',
  },
} as const;
