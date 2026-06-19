import React, { useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, Check, Sun, Moon } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { ACCENT_PRESETS, AccentKey } from '../constants/Colors';
import { scale, vs, ms } from '../utils/responsive';
import PressableScale from '../components/PressableScale';
import { T } from '../utils/typography';

const ACCENT_LABELS: Record<AccentKey, string> = {
    forest: 'Forest',
    ocean:  'Ocean',
    sunset: 'Sunset',
    candy:  'Candy',
    grape:  'Grape',
    slate:  'Slate',
};

const ACCENT_KEYS = Object.keys(ACCENT_PRESETS) as AccentKey[];

export default function AppearanceScreen({ navigation }: any) {
    const { colors, isDark, theme, setTheme, accentKey, setAccent } = useTheme();

    // Per-swatch scale animated values — spring to 1.04 when selected
    const scaleAnims = useRef(
        ACCENT_KEYS.reduce((acc, key) => {
            acc[key] = new Animated.Value(accentKey === key ? 1.04 : 1.0);
            return acc;
        }, {} as Record<AccentKey, Animated.Value>)
    ).current;

    const handleAccent = (key: AccentKey) => {
        Haptics.selectionAsync();
        Animated.spring(scaleAnims[accentKey], { toValue: 1.0, damping: 20, stiffness: 280, useNativeDriver: true }).start();
        Animated.spring(scaleAnims[key],       { toValue: 1.04, damping: 20, stiffness: 280, useNativeDriver: true }).start();
        setAccent(key);
    };

    const handleTheme = (t: 'light' | 'dark') => {
        if (theme === t) return;
        Haptics.selectionAsync();
        setTheme(t);
    };

    return (
        <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <PressableScale
                    scaleTo={0.97}
                    haptic="light"
                    onPress={() => navigation.goBack()}
                    style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                    <ChevronLeft size={ms(20)} color={colors.text} />
                </PressableScale>
                <Text style={[styles.headerTitle, { color: colors.text }, T.bold]}>Appearance</Text>
                <View style={{ width: scale(44) }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* Live preview card */}
                <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <LinearGradient colors={colors.heroGradient} locations={[0, 0.35, 1]} style={styles.previewHero}>
                        <View style={[styles.previewAvatar, { backgroundColor: colors.accent + '50' }]} />
                        <View style={[styles.previewName, { backgroundColor: colors.accent + '35' }]} />
                        <View style={[styles.previewName, { width: '40%', backgroundColor: colors.accent + '20' }]} />
                    </LinearGradient>
                    <LinearGradient colors={colors.cardGradient as any} style={styles.previewGroupCard}>
                        <View style={styles.previewCardRow}>
                            <View style={[styles.previewDot, { backgroundColor: 'rgba(255,255,255,0.6)' }]} />
                            <View style={[styles.previewLine, { backgroundColor: 'rgba(255,255,255,0.4)', width: '55%' }]} />
                        </View>
                        <View style={styles.previewCardRow}>
                            <View style={[styles.previewDot, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
                            <View style={[styles.previewLine, { backgroundColor: 'rgba(255,255,255,0.25)', width: '35%' }]} />
                        </View>
                    </LinearGradient>
                    <View style={[styles.previewTabBar, {
                        backgroundColor: isDark ? 'rgba(22,22,26,0.86)' : 'rgba(248,248,252,0.86)',
                        borderTopColor: colors.border,
                    }]}>
                        {[0, 1, 2, 3].map(i => (
                            <View
                                key={i}
                                style={[styles.previewTabDot, { backgroundColor: i === 3 ? colors.accent : colors.tabIconDefault }]}
                            />
                        ))}
                    </View>
                </View>

                {/* Accent section */}
                <Text style={[styles.sectionHeader, { color: colors.secondaryText }, T.semibold]}>
                    Accent Color
                </Text>
                <View style={styles.accentGrid}>
                    {ACCENT_KEYS.map(key => {
                        const swatch = ACCENT_PRESETS[key][isDark ? 'dark' : 'light'];
                        const selected = accentKey === key;
                        return (
                            <Animated.View
                                key={key}
                                style={[styles.accentItem, { transform: [{ scale: scaleAnims[key] }] }]}
                            >
                                <PressableScale
                                    scaleTo={0.95}
                                    haptic="light"
                                    onPress={() => handleAccent(key)}
                                    style={[
                                        styles.accentCard,
                                        { backgroundColor: colors.surface },
                                        selected && { borderWidth: 2, borderColor: colors.accent },
                                    ]}
                                >
                                    <View style={[styles.accentSwatch, { backgroundColor: swatch }]}>
                                        {selected && <Check size={14} color="#fff" strokeWidth={3} />}
                                    </View>
                                    <Text style={[
                                        styles.accentLabel,
                                        { color: selected ? colors.accent : colors.secondaryText },
                                        T.semibold,
                                    ]}>
                                        {ACCENT_LABELS[key]}
                                    </Text>
                                </PressableScale>
                            </Animated.View>
                        );
                    })}
                </View>

                {/* Theme section */}
                <Text style={[styles.sectionHeader, { color: colors.secondaryText }, T.semibold]}>
                    Color Scheme
                </Text>
                <View style={styles.themeRow}>
                    {(['light', 'dark'] as const).map(t => {
                        const active = theme === t;
                        return (
                            <PressableScale
                                key={t}
                                scaleTo={0.97}
                                haptic="light"
                                onPress={() => handleTheme(t)}
                                style={[
                                    styles.themeCard,
                                    { backgroundColor: colors.surface },
                                    active && { borderWidth: 2, borderColor: colors.accent },
                                ]}
                            >
                                <View style={[
                                    styles.themeIconWrap,
                                    { backgroundColor: active ? colors.accentBg : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)') },
                                ]}>
                                    {t === 'light'
                                        ? <Sun size={22} color={active ? colors.accent : colors.secondaryText} />
                                        : <Moon size={22} color={active ? colors.accent : colors.secondaryText} />
                                    }
                                </View>
                                <Text style={[
                                    styles.themeLabel,
                                    { color: active ? colors.text : colors.secondaryText },
                                    active ? T.bold : T.regular,
                                ]}>
                                    {t === 'light' ? 'Light' : 'Dark'}
                                </Text>
                            </PressableScale>
                        );
                    })}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(20),
        paddingVertical: vs(12),
    },
    headerTitle: {
        fontSize: ms(20),
        letterSpacing: -0.5,
    },
    backBtn: {
        width: scale(44),
        height: scale(44),
        borderRadius: ms(14),
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: StyleSheet.hairlineWidth,
    },

    scroll: {
        paddingHorizontal: scale(20),
        paddingBottom: vs(48),
        gap: vs(8),
    },

    // Preview card
    previewCard: {
        borderRadius: ms(24),
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        marginBottom: vs(12),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.10,
        shadowRadius: 14,
        elevation: 5,
    },
    previewHero: {
        padding: scale(14),
        alignItems: 'center',
        gap: vs(5),
        paddingBottom: scale(18),
    },
    previewAvatar: {
        width: scale(36),
        height: scale(36),
        borderRadius: scale(18),
    },
    previewName: {
        width: '50%',
        height: vs(6),
        borderRadius: ms(4),
    },
    previewGroupCard: {
        marginHorizontal: scale(12),
        marginBottom: scale(12),
        borderRadius: ms(14),
        padding: scale(12),
        gap: vs(5),
    },
    previewCardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(6),
    },
    previewDot: {
        width: scale(8),
        height: scale(8),
        borderRadius: scale(4),
    },
    previewLine: {
        height: vs(5),
        borderRadius: ms(3),
    },
    previewTabBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: vs(10),
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    previewTabDot: {
        width: scale(7),
        height: scale(7),
        borderRadius: scale(4),
    },

    // Section header
    sectionHeader: {
        fontSize: ms(13),
        letterSpacing: 0.3,
        textTransform: 'uppercase',
        paddingHorizontal: 0,
        marginBottom: vs(8),
        marginTop: vs(12),
    },

    // Accent grid: 3 columns
    accentGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: scale(10),
        marginBottom: vs(4),
    },
    accentItem: {
        width: '30%',
        flexGrow: 1,
    },
    accentCard: {
        borderRadius: ms(20),
        alignItems: 'center',
        padding: scale(12),
        gap: vs(8),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'transparent',
    },
    accentSwatch: {
        width: scale(44),
        height: scale(44),
        borderRadius: scale(22),
        alignItems: 'center',
        justifyContent: 'center',
    },
    accentLabel: {
        fontSize: ms(12),
    },

    // Theme toggle
    themeRow: {
        flexDirection: 'row',
        gap: scale(12),
    },
    themeCard: {
        flex: 1,
        borderRadius: ms(20),
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: vs(20),
        gap: vs(10),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'transparent',
    },
    themeIconWrap: {
        width: scale(48),
        height: scale(48),
        borderRadius: ms(14),
        alignItems: 'center',
        justifyContent: 'center',
    },
    themeLabel: {
        fontSize: ms(14),
    },
});
