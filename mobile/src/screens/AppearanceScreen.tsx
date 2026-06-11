import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, Check, Sun, Moon } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { ACCENT_PRESETS, AccentKey } from '../constants/Colors';
import { scale, vs, ms } from '../utils/responsive';

const ACCENT_LABELS: Record<AccentKey, string> = {
    forest: 'Forest',
    ocean: 'Ocean',
    sunset: 'Sunset',
    candy: 'Candy',
    grape: 'Grape',
    slate: 'Slate',
};

const ACCENT_KEYS = Object.keys(ACCENT_PRESETS) as AccentKey[];

export default function AppearanceScreen({ navigation }: any) {
    const { colors, isDark, theme, setTheme, accentKey, setAccent } = useTheme();

    const handleAccent = (key: AccentKey) => {
        Haptics.selectionAsync();
        setAccent(key);
    };

    const handleTheme = (t: 'light' | 'dark') => {
        if (theme === t) return;
        Haptics.selectionAsync();
        setTheme(t);
    };

    return (
        <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.8}
                >
                    <ChevronLeft size={20} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Appearance</Text>
                <View style={styles.backBtnSpacer} />
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: vs(40) }} showsVerticalScrollIndicator={false}>
                {/* Live phone mock preview */}
                <View style={styles.mockWrap}>
                    <View style={[styles.mockPhone, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <LinearGradient colors={colors.heroGradient} locations={[0, 0.35, 1]} style={styles.mockHero}>
                            <View style={[styles.mockAvatar, { backgroundColor: colors.accent + '40' }]} />
                            <View style={[styles.mockName, { backgroundColor: colors.accent + '30' }]} />
                        </LinearGradient>
                        <LinearGradient colors={colors.cardGradient as any} style={styles.mockCard}>
                            <View style={[styles.mockCardLine, { backgroundColor: 'rgba(255,255,255,0.5)' }]} />
                            <View style={[styles.mockCardLine, { width: '60%', backgroundColor: 'rgba(255,255,255,0.3)' }]} />
                        </LinearGradient>
                        <View style={[styles.mockTabBar, {
                            backgroundColor: isDark ? 'rgba(22,22,26,0.86)' : 'rgba(248,248,252,0.86)',
                            borderTopColor: colors.border,
                        }]}>
                            {[0, 1, 2, 3, 4].map(i => (
                                <View
                                    key={i}
                                    style={[styles.mockTabDot, { backgroundColor: i === 2 ? colors.accent : colors.tabIconDefault }]}
                                />
                            ))}
                        </View>
                    </View>
                </View>

                <View style={styles.body}>
                    {/* Accent section */}
                    <Text style={[styles.sectionLabel, { color: colors.secondaryText }]}>ACCENT COLOR</Text>
                    <View style={styles.accentGrid}>
                        {ACCENT_KEYS.map((key) => {
                            const swatch = ACCENT_PRESETS[key][isDark ? 'dark' : 'light'];
                            const selected = accentKey === key;
                            return (
                                <TouchableOpacity
                                    key={key}
                                    onPress={() => handleAccent(key)}
                                    activeOpacity={0.8}
                                    style={styles.accentItem}
                                >
                                    <View style={[
                                        styles.accentSwatch,
                                        { backgroundColor: swatch },
                                        selected && { borderWidth: 3, borderColor: '#fff' },
                                    ]}>
                                        {selected && <Check size={16} color="#fff" strokeWidth={3} />}
                                    </View>
                                    <Text style={[styles.accentLabel, { color: selected ? colors.accent : colors.secondaryText }]}>
                                        {ACCENT_LABELS[key]}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Color scheme section */}
                    <Text style={[styles.sectionLabel, { color: colors.secondaryText }]}>COLOR SCHEME</Text>
                    <View style={[styles.schemeRow, {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                        borderRadius: ms(16),
                    }]}>
                        {(['light', 'dark'] as const).map(t => {
                            const active = theme === t;
                            return (
                                <TouchableOpacity
                                    key={t}
                                    onPress={() => handleTheme(t)}
                                    activeOpacity={0.8}
                                    style={[
                                        styles.schemeBtn,
                                        active && { backgroundColor: colors.accent, borderRadius: ms(13) },
                                    ]}
                                >
                                    {t === 'light'
                                        ? <Sun size={16} color={active ? '#fff' : colors.secondaryText} />
                                        : <Moon size={16} color={active ? '#fff' : colors.secondaryText} />
                                    }
                                    <Text style={[styles.schemeBtnText, { color: active ? '#fff' : colors.secondaryText }]}>
                                        {t === 'light' ? 'Light' : 'Dark'}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(16),
        paddingVertical: vs(12),
    },
    headerTitle: {
        fontSize: ms(17),
        fontWeight: '700',
    },
    backBtn: {
        width: scale(44),
        height: scale(44),
        borderRadius: ms(14),
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: StyleSheet.hairlineWidth,
    },
    backBtnSpacer: {
        width: scale(44),
    },

    mockWrap: {
        alignItems: 'center',
        paddingVertical: vs(24),
    },
    mockPhone: {
        width: scale(160),
        borderRadius: ms(24),
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 6,
    },
    mockHero: {
        padding: scale(12),
        paddingBottom: scale(16),
        alignItems: 'center',
        gap: vs(6),
    },
    mockAvatar: {
        width: scale(32),
        height: scale(32),
        borderRadius: scale(16),
    },
    mockName: {
        width: scale(60),
        height: vs(6),
        borderRadius: ms(4),
    },
    mockCard: {
        marginHorizontal: scale(10),
        marginBottom: scale(10),
        borderRadius: ms(12),
        padding: scale(10),
        gap: vs(4),
    },
    mockCardLine: {
        height: vs(5),
        width: '80%',
        borderRadius: ms(3),
    },
    mockTabBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: vs(8),
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    mockTabDot: {
        width: scale(6),
        height: scale(6),
        borderRadius: scale(3),
    },

    body: {
        paddingHorizontal: scale(20),
        gap: vs(16),
    },
    sectionLabel: {
        fontSize: ms(11),
        fontWeight: '700',
        letterSpacing: 0.7,
        marginBottom: vs(4),
    },
    accentGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: vs(12),
        marginBottom: vs(8),
    },
    accentItem: {
        width: '30%',
        alignItems: 'center',
        gap: vs(6),
    },
    accentSwatch: {
        width: scale(52),
        height: scale(52),
        borderRadius: scale(26),
        alignItems: 'center',
        justifyContent: 'center',
    },
    accentLabel: {
        fontSize: ms(12),
        fontWeight: '600',
    },

    schemeRow: {
        flexDirection: 'row',
        padding: vs(4),
        gap: scale(4),
    },
    schemeBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(6),
        paddingVertical: vs(12),
    },
    schemeBtnText: {
        fontSize: ms(14),
        fontWeight: '600',
    },
});
