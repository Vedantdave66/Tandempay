export const ACCENT_PRESETS = {
  forest: {
    light: '#16A34A', dark: '#27E06A',
    glowLight: ['#3BE57F','#8FE9B0','#D8F4E1','#F3FBF4'] as [string,string,string,string],
    glowDark:  ['#1E6A3A','#0D3019','#060F08','#030806'] as [string,string,string,string],
    // Light: whisper of green → pure white. Start very desaturated.
    heroGradLight: ['#EBF8F0','#F5FBF7','#FFFFFF'] as [string,string,string],
    // Dark: near-black with a barely-there tint of the accent → pure dark
    heroGradDark:  ['#0C1F12','#090E0A','#060908'] as [string,string,string],
    cardGradLight: ['#D1FAE5','#ECFDF5','#F0FDF4','#FFFFFF'] as [string,string,string,string],
    cardGradDark:  ['#0E2419','#080F0B','#050805','#030604'] as [string,string,string,string],
  },
  ocean: {
    light: '#2563EB', dark: '#60A5FA',
    glowLight: ['#3B82F6','#93C5FD','#DBEAFE','#F0F9FF'] as [string,string,string,string],
    glowDark:  ['#1E3A6E','#0D1F3C','#060C15','#030810'] as [string,string,string,string],
    heroGradLight: ['#EFF6FF','#F5F9FF','#FFFFFF'] as [string,string,string],
    heroGradDark:  ['#0C1528','#090B14','#060709'] as [string,string,string],
    cardGradLight: ['#DBEAFE','#EFF6FF','#F0F9FF','#FFFFFF'] as [string,string,string,string],
    cardGradDark:  ['#0E1A30','#080B14','#050609','#030408'] as [string,string,string,string],
  },
  sunset: {
    light: '#EA580C', dark: '#FB923C',
    glowLight: ['#F97316','#FDBA74','#FFEDD5','#FFF7ED'] as [string,string,string,string],
    glowDark:  ['#7C2D12','#3B1109','#150600','#0A0402'] as [string,string,string,string],
    heroGradLight: ['#FFF1E6','#FFF7F0','#FFFFFF'] as [string,string,string],
    heroGradDark:  ['#1F0F06','#0E0804','#080604'] as [string,string,string],
    cardGradLight: ['#FFEDD5','#FFF7ED','#FFF9F5','#FFFFFF'] as [string,string,string,string],
    cardGradDark:  ['#1F1008','#0F0805','#080604','#050403'] as [string,string,string,string],
  },
  candy: {
    light: '#DB2777', dark: '#F472B6',
    glowLight: ['#EC4899','#F9A8D4','#FCE7F3','#FDF2F8'] as [string,string,string,string],
    glowDark:  ['#831843','#3D0A22','#160409','#0A0206'] as [string,string,string,string],
    heroGradLight: ['#FDF2F8','#FEF6FA','#FFFFFF'] as [string,string,string],
    heroGradDark:  ['#1F0811','#0E0508','#080406'] as [string,string,string],
    cardGradLight: ['#FCE7F3','#FDF2F8','#FEF6FB','#FFFFFF'] as [string,string,string,string],
    cardGradDark:  ['#200A12','#100509','#080406','#050304'] as [string,string,string,string],
  },
  grape: {
    light: '#7C3AED', dark: '#A78BFA',
    glowLight: ['#8B5CF6','#C4B5FD','#EDE9FE','#F5F3FF'] as [string,string,string,string],
    glowDark:  ['#4C1D95','#1F0A40','#0A0418','#05020E'] as [string,string,string,string],
    heroGradLight: ['#F5F3FF','#FAF8FF','#FFFFFF'] as [string,string,string],
    heroGradDark:  ['#13093A','#09050F','#06040A'] as [string,string,string],
    cardGradLight: ['#EDE9FE','#F5F3FF','#FAF8FF','#FFFFFF'] as [string,string,string,string],
    cardGradDark:  ['#140A38','#09060F','#06040A','#040208'] as [string,string,string,string],
  },
  slate: {
    light: '#475569', dark: '#94A3B8',
    glowLight: ['#64748B','#CBD5E1','#E2E8F0','#F8FAFC'] as [string,string,string,string],
    glowDark:  ['#334155','#1E293B','#0F172A','#070C15'] as [string,string,string,string],
    heroGradLight: ['#F1F5F9','#F8FAFC','#FFFFFF'] as [string,string,string],
    heroGradDark:  ['#0F1520','#09090C','#060608'] as [string,string,string],
    cardGradLight: ['#E2E8F0','#F1F5F9','#F8FAFC','#FFFFFF'] as [string,string,string,string],
    cardGradDark:  ['#111827','#080A0C','#060708','#040506'] as [string,string,string,string],
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
