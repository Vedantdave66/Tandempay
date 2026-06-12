import React, { useRef, useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Animated,
    Easing,
    Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { ACCENT_PRESETS } from '../constants/Colors';
import { scale, vs, ms } from '../utils/responsive';
import { T } from '../utils/typography';
import CharacterShape from '../components/CharacterShape';

const { width: SCREEN_W } = Dimensions.get('window');

const SLIDE_COUNT = 3;

// Mirrors CharacterSetupModal so the picked shape carries straight through
// to the post-registration setup
const SHAPES = ['rect', 'tall', 'semi', 'round'] as const;

// Accent preset brand colors plus two neutrals. Light variants are stored:
// they read correctly on both light and dark surfaces.
const COLOR_PALETTE = [
    { hex: '#16A34A', name: 'Green' },
    { hex: '#2563EB', name: 'Blue' },
    { hex: '#EA580C', name: 'Orange' },
    { hex: '#DB2777', name: 'Pink' },
    { hex: '#7C3AED', name: 'Purple' },
    { hex: '#475569', name: 'Slate' },
    { hex: '#94A3B8', name: 'Silver' },
    { hex: '#1E293B', name: 'Charcoal' },
] as const;

// ── Progress dot — active dot stretches into a pill ───────────────────────────

function Dot({ active, activeColor, inactiveColor }: {
    active: boolean; activeColor: string; inactiveColor: string;
}) {
    const width = useRef(new Animated.Value(active ? scale(18) : scale(6))).current;

    useEffect(() => {
        Animated.spring(width, {
            toValue: active ? scale(18) : scale(6),
            damping: 26,
            stiffness: 200,
            useNativeDriver: false,
        }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active]);

    return (
        <Animated.View
            style={{
                width,
                height: scale(6),
                borderRadius: scale(3),
                backgroundColor: active ? activeColor : inactiveColor,
            }}
        />
    );
}

// ── Slide 2 — settle arrow, a quiet nudge to the right ────────────────────────

function SettleArrow({ color }: { color: string }) {
    const slide = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(Animated.sequence([
            Animated.timing(slide, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(slide, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]));
        loop.start();
        return () => loop.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <Animated.View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [0, 6] }) }],
            }}
        >
            <View style={{ width: scale(32), height: StyleSheet.hairlineWidth * 2, backgroundColor: color }} />
            <View
                style={{
                    width: 0,
                    height: 0,
                    borderTopWidth: scale(4),
                    borderBottomWidth: scale(4),
                    borderLeftWidth: scale(6),
                    borderTopColor: 'transparent',
                    borderBottomColor: 'transparent',
                    borderLeftColor: color,
                }}
            />
        </Animated.View>
    );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function OnboardingScreen({ navigation }: any) {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const listRef = useRef<FlatList>(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    const [selectedShape, setSelectedShape] = useState<typeof SHAPES[number]>('round');
    const [selectedColor, setSelectedColor] = useState<string>(COLOR_PALETTE[0].hex);

    const mode = isDark ? 'dark' : 'light';
    const crewColors = {
        forest: ACCENT_PRESETS.forest[mode],
        ocean: ACCENT_PRESETS.ocean[mode],
        sunset: ACCENT_PRESETS.sunset[mode],
    };

    // Spring pop on the preview whenever the selection changes
    const popAnim = useRef(new Animated.Value(1)).current;
    const firstRender = useRef(true);
    useEffect(() => {
        if (firstRender.current) { firstRender.current = false; return; }
        popAnim.setValue(0.9);
        Animated.spring(popAnim, { toValue: 1, damping: 14, stiffness: 280, useNativeDriver: true }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedShape, selectedColor]);

    const viewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems[0]) setCurrentIndex(viewableItems[0].index);
    }).current;
    const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    const skipToPicker = () => {
        Haptics.selectionAsync();
        listRef.current?.scrollToIndex({ index: SLIDE_COUNT - 1 });
    };

    const handleContinue = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            await AsyncStorage.multiSet([
                ['@onboarding_character', JSON.stringify({ character_shape: selectedShape, character_color: selectedColor })],
                ['@onboarding_seen', 'true'],
            ]);
        } catch {
            // Storage failure shouldn't block the flow
        }
        navigation.replace('Landing');
    };

    const selectedColorName = COLOR_PALETTE.find(c => c.hex === selectedColor)?.name ?? '';

    const renderSlide = ({ item: index }: { item: number }) => {
        // ── Slide 1: Split anything, instantly ──
        if (index === 0) {
            const crew = [
                { shape: 'rect', color: crewColors.forest, name: 'Vedant' },
                { shape: 'semi', color: crewColors.ocean, name: 'Sarah' },
                { shape: 'round', color: crewColors.sunset, name: 'Mike' },
            ];
            return (
                <View style={[styles.slide, { backgroundColor: colors.background }]}>
                    <View style={styles.visualBlock}>
                        <View style={styles.crewRow}>
                            {crew.map(c => (
                                <View key={c.name} style={styles.crewCol}>
                                    <View style={styles.crewCharWrap}>
                                        <CharacterShape variant="card" shape={c.shape} color={c.color} eyeStyle="ball" />
                                    </View>
                                    <View style={[styles.nameChip, { backgroundColor: colors.accentBg }]}>
                                        <Text style={[styles.nameChipText, T.semibold, { color: colors.accent }]}>{c.name}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                        <View style={[styles.expenseRow, { backgroundColor: colors.surface }]}>
                            <Text style={[styles.expenseName, T.semibold, { color: colors.text }]}>Pizza Night</Text>
                            <Text style={[styles.expenseAmount, T.semibold, { color: colors.accent }]}>$48.00</Text>
                        </View>
                    </View>
                    <View style={styles.textBlock}>
                        <Text style={[styles.headline, T.extrabold, { color: colors.text }]}>
                            Split anything,{'\n'}instantly.
                        </Text>
                        <Text style={[styles.sub, T.regular, { color: colors.faintText }]}>
                            Add an expense in seconds.{'\n'}Everyone sees their share.
                        </Text>
                    </View>
                </View>
            );
        }

        // ── Slide 2: Settle free. Every time ──
        if (index === 1) {
            return (
                <View style={[styles.slide, { backgroundColor: colors.background }]}>
                    <View style={styles.visualBlock}>
                        <View style={[styles.settleCard, { backgroundColor: colors.surface }]}>
                            <View style={styles.settlePair}>
                                <View style={styles.settleCol}>
                                    <View style={styles.settleCharWrap}>
                                        <CharacterShape variant="card" shape="rect" color={crewColors.forest} eyeStyle="ball" />
                                    </View>
                                    <Text style={[styles.settleLabel, T.semibold, { color: colors.faintText }]}>You</Text>
                                </View>
                                <SettleArrow color={colors.accent} />
                                <View style={styles.settleCol}>
                                    <View style={styles.settleCharWrap}>
                                        <CharacterShape variant="card" shape="round" color={crewColors.sunset} eyeStyle="ball" />
                                    </View>
                                    <Text style={[styles.settleLabel, T.semibold, { color: colors.faintText }]}>Mike</Text>
                                </View>
                            </View>
                            <View style={[styles.interacBadge, { backgroundColor: colors.accentBg }]}>
                                <View style={[styles.badgeDot, { backgroundColor: colors.accent }]} />
                                <Text style={[styles.interacBadgeText, T.semibold, { color: colors.accent }]}>
                                    Auto-confirmed via Interac
                                </Text>
                            </View>
                            <Text style={[styles.settleCaption, T.regular, { color: colors.faintText }]}>
                                Free · Instant · Automatic
                            </Text>
                        </View>
                    </View>
                    <View style={styles.textBlock}>
                        <Text style={[styles.headline, T.extrabold, { color: colors.text }]}>
                            Settle free.{'\n'}Every time.
                        </Text>
                        <Text style={[styles.sub, T.regular, { color: colors.faintText }]}>
                            Interac e-Transfer confirmation emails{'\n'}auto-match your payments. 🇨🇦
                        </Text>
                    </View>
                </View>
            );
        }

        // ── Slide 3: Character picker ──
        return (
            <View style={[styles.slide, { backgroundColor: colors.background }]}>
                <View style={{ flex: 1, alignItems: 'center', paddingTop: insets.top + vs(48) }}>
                    <Text style={[styles.pickerHeadline, T.extrabold, { color: colors.text }]}>
                        Make it yours.
                    </Text>
                    <Text style={[styles.pickerSub, T.regular, { color: colors.faintText }]}>
                        Pick a character. You can change it any time.
                    </Text>

                    <Animated.View style={[styles.previewWrap, { transform: [{ scale: popAnim }] }]}>
                        <CharacterShape variant="hero" shape={selectedShape} color={selectedColor} eyeStyle="ball" />
                    </Animated.View>
                    <Text style={[styles.colorName, T.semibold, { color: colors.faintText }]}>
                        {selectedColorName}
                    </Text>

                    <View style={styles.shapeRow}>
                        {SHAPES.map(s => {
                            const selected = selectedShape === s;
                            return (
                                <TouchableOpacity
                                    key={s}
                                    onPress={() => { Haptics.selectionAsync(); setSelectedShape(s); }}
                                    style={[styles.shapeTile, { borderColor: selected ? colors.accent : 'transparent' }]}
                                    activeOpacity={0.8}
                                >
                                    <CharacterShape variant="mini" shape={s} color={selectedColor} />
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <View style={styles.colorRow}>
                        {COLOR_PALETTE.map(c => {
                            const selected = selectedColor === c.hex;
                            return (
                                <TouchableOpacity
                                    key={c.hex}
                                    onPress={() => { Haptics.selectionAsync(); setSelectedColor(c.hex); }}
                                    style={[styles.swatch, { backgroundColor: c.hex }]}
                                    activeOpacity={0.8}
                                >
                                    {selected && <Check size={scale(14)} color="#FFFFFF" strokeWidth={3} />}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                <View style={[styles.ctaWrap, { marginBottom: insets.bottom + vs(32) }]}>
                    <TouchableOpacity
                        style={[styles.ctaBtn, { backgroundColor: colors.accent }]}
                        onPress={handleContinue}
                        activeOpacity={0.85}
                    >
                        <Text style={[styles.ctaText, T.semibold]}>Continue</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const onPicker = currentIndex === SLIDE_COUNT - 1;

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <FlatList
                ref={listRef}
                data={[0, 1, 2]}
                renderItem={renderSlide}
                keyExtractor={i => String(i)}
                horizontal
                pagingEnabled
                bounces={false}
                showsHorizontalScrollIndicator={false}
                onViewableItemsChanged={viewableItemsChanged}
                viewabilityConfig={viewConfig}
                getItemLayout={(_, index) => ({ length: SCREEN_W, offset: SCREEN_W * index, index })}
            />

            {/* Skip — always lands on the picker, never past it */}
            {!onPicker && (
                <TouchableOpacity
                    style={[styles.skipBtn, { top: insets.top + vs(12) }]}
                    onPress={skipToPicker}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Text style={[styles.skipText, T.semibold, { color: colors.faintText }]}>Skip</Text>
                </TouchableOpacity>
            )}

            {!onPicker && (
                <View style={[styles.dotsRow, { bottom: insets.bottom + vs(32) }]}>
                    {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
                        <Dot
                            key={i}
                            active={i === currentIndex}
                            activeColor={colors.accent}
                            inactiveColor={colors.faintText}
                        />
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    slide: {
        width: SCREEN_W,
        flex: 1,
    },

    // Slides 1–2: visual in the top 55%, text in the bottom 45%
    visualBlock: {
        flex: 55,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textBlock: {
        flex: 45,
        alignItems: 'center',
        paddingTop: vs(8),
        marginHorizontal: scale(32),
    },
    headline: {
        fontSize: ms(38),
        letterSpacing: -1.8,
        lineHeight: ms(44),
        textAlign: 'center',
        marginBottom: vs(14),
    },
    sub: {
        fontSize: ms(16),
        letterSpacing: -0.3,
        lineHeight: ms(16) * 1.55,
        textAlign: 'center',
    },

    // Slide 1 — crew + expense row
    crewRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: scale(16),
        marginBottom: vs(28),
    },
    crewCol: {
        alignItems: 'center',
        gap: vs(8),
    },
    crewCharWrap: {
        height: scale(72),
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    nameChip: {
        borderRadius: ms(20),
        paddingHorizontal: scale(10),
        paddingVertical: vs(4),
    },
    nameChipText: { fontSize: ms(12) },
    expenseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(24),
        borderRadius: ms(14),
        paddingHorizontal: scale(16),
        paddingVertical: vs(12),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    expenseName: { fontSize: ms(15) },
    expenseAmount: { fontSize: ms(15) },

    // Slide 2 — settlement card
    settleCard: {
        alignItems: 'center',
        borderRadius: ms(20),
        paddingHorizontal: scale(20),
        paddingVertical: vs(20),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    settlePair: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(16),
        marginBottom: vs(16),
    },
    settleCol: {
        alignItems: 'center',
        gap: vs(6),
    },
    settleCharWrap: {
        height: scale(56),
        justifyContent: 'flex-end',
        alignItems: 'center',
        transform: [{ scale: 0.8 }],
    },
    settleLabel: { fontSize: ms(12) },
    interacBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(6),
        borderRadius: ms(20),
        paddingHorizontal: scale(12),
        paddingVertical: vs(6),
        marginBottom: vs(8),
    },
    badgeDot: {
        width: scale(8),
        height: scale(8),
        borderRadius: scale(4),
    },
    interacBadgeText: { fontSize: ms(12) },
    settleCaption: {
        fontSize: ms(12),
        letterSpacing: 0.4,
    },

    // Slide 3 — picker
    pickerHeadline: {
        fontSize: ms(34),
        letterSpacing: -1.6,
        textAlign: 'center',
        marginBottom: vs(8),
    },
    pickerSub: {
        fontSize: ms(15),
        textAlign: 'center',
        marginBottom: vs(40),
    },
    previewWrap: {
        height: 120,
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    colorName: {
        fontSize: ms(13),
        marginTop: vs(8),
        marginBottom: vs(32),
    },
    shapeRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: scale(16),
        marginBottom: vs(20),
    },
    shapeTile: {
        width: scale(64),
        height: scale(80),
        borderRadius: ms(14),
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: vs(6),
    },
    colorRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: scale(12),
        paddingHorizontal: scale(28),
    },
    swatch: {
        width: scale(36),
        height: scale(36),
        borderRadius: scale(18),
        alignItems: 'center',
        justifyContent: 'center',
    },
    ctaWrap: {
        paddingHorizontal: scale(28),
    },
    ctaBtn: {
        width: '100%',
        height: scale(56),
        borderRadius: ms(14),
        alignItems: 'center',
        justifyContent: 'center',
    },
    ctaText: {
        color: '#FFFFFF',
        fontSize: ms(17),
    },

    // Chrome
    skipBtn: {
        position: 'absolute',
        right: scale(28),
    },
    skipText: { fontSize: ms(15) },
    dotsRow: {
        position: 'absolute',
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
    },
});
