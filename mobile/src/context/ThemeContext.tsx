import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useColorScheme, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, ACCENT_PRESETS, AccentKey } from '../constants/Colors';

type Theme = 'light' | 'dark';

// Flexible colors type — accent fields are strings so they can be overridden at runtime
type ColorPalette = Omit<typeof Colors.light, 'accent' | 'accentDark' | 'tint' | 'tabIconSelected' | 'groupGlow' | 'accentBg' | 'accentBgFaint' | 'accentLight'> & {
  accent: string;
  accentDark: string;
  tint: string;
  tabIconSelected: string;
  groupGlow: [string, string, string, string];
  heroGradient: [string, string, string];
  cardGradient: [string, string, string, string];
  accentBg: string;
  accentBgFaint: string;
  accentLight: string;
};

interface ThemeContextType {
  theme: Theme;
  colors: ColorPalette;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  accentKey: AccentKey;
  setAccent: (key: AccentKey) => void;
  themeOpacity: Animated.Value;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@tandempay_theme';
const ACCENT_STORAGE_KEY = '@tandempay_accent';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<Theme>(systemColorScheme === 'dark' ? 'dark' : 'light');
  const [accentKey, setAccentKey] = useState<AccentKey>('forest');
  const themeOpacity = useRef(new Animated.Value(1)).current;

  // Load persisted theme and accent on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [savedTheme, savedAccent] = await Promise.all([
          AsyncStorage.getItem(THEME_STORAGE_KEY),
          AsyncStorage.getItem(ACCENT_STORAGE_KEY),
        ]);
        if (savedTheme === 'light' || savedTheme === 'dark') setThemeState(savedTheme);
        if (savedAccent && savedAccent in ACCENT_PRESETS) setAccentKey(savedAccent as AccentKey);
      } catch (e) {
        console.error('Failed to load theme/accent', e);
      }
    };
    load();
  }, []);

  const fadeTransition = (callback: () => void) => {
    Animated.sequence([
      Animated.timing(themeOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(themeOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    setTimeout(callback, 120);
  };

  const setTheme = async (newTheme: Theme) => {
    fadeTransition(() => setThemeState(newTheme));
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (e) {
      console.error('Failed to save theme', e);
    }
  };

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  const setAccent = async (key: AccentKey) => {
    fadeTransition(() => setAccentKey(key));
    try {
      await AsyncStorage.setItem(ACCENT_STORAGE_KEY, key);
    } catch (e) {
      console.error('Failed to save accent', e);
    }
  };

  const isDark = theme === 'dark';
  const preset = ACCENT_PRESETS[accentKey];
  const accentColor = preset[isDark ? 'dark' : 'light'];
  const accentGlow = preset[isDark ? 'glowDark' : 'glowLight'];

  const colors = {
    ...Colors[theme],
    accent: accentColor,
    accentDark: isDark ? Colors.dark.accentDark : accentColor,
    tint: accentColor,
    tabIconSelected: accentColor,
    groupGlow: accentGlow,
    heroGradient: preset[isDark ? 'heroGradDark' : 'heroGradLight'],
    cardGradient: preset[isDark ? 'cardGradDark' : 'cardGradLight'],
    accentBg:      isDark ? accentColor + '1F' : accentColor + '18',
    accentBgFaint: accentColor + '0F',
    accentLight:   isDark ? accentColor + '1F' : accentColor + '26',
  } as ColorPalette;

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme, setTheme, isDark, accentKey, setAccent, themeOpacity }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
