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
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { scale, vs, ms } from '../utils/responsive';
import { T } from '../utils/typography';
import CharacterShape from '../components/CharacterShape';

const { width: SCREEN_W } = Dimensions.get('window');

// Same crew as CanvasModeView's demo mode — the story stays consistent
// from onboarding through the landing canvas
const CREW = [
    { shape: 'rect',  color: '#16A34A', nickname: 'V', arcY: 18 },
    { shape: 'tall',  color: '#3B82F6', nickname: 'S', arcY: 2 },
    { shape: 'semi',  color: '#F59E0B', nickname: 'M', arcY: -12 },
    { shape: 'round', color: '#EC4899', nickname: 'A', arcY: 2 },
    { shape: 'semi',  color: '#8B5CF6', nickname: 'J', arcY: 18 },
] as const;

// Mirrors CharacterSetupModal exactly so the picked character carries
// straight through to the post-registration setup
const SHAPES = ['rect', 'tall', 'semi', 'round'] as const;
const COLOR_PALETTE = [
    '#3ECF8E', '#6366F1', '#F59E0B', '#EF4444',
    '#EC4899', '#8B5CF6', '#14B8A6', '#F97316',
];

const SLIDE_COUNT = 4;

// ── Slide 1 — crew arc with staggered entrance ────────────────────────────────

function CrewArc({ textColor }: { textColor: string }) {
    const anims = useRef(CREW.map(() => new Animated.Value(0))).current;

    useEffect(() => {
        Animated.stagger(40, anims.map(a =>
            Animated.timing(a, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        )).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <View style={styles.arcRow}>
            {CREW.map((c, i) => (
                <Animated.View
                    key={c.nickname}
                    style={{
                        alignItems: 'center',
                        opacity: anims[i],
                        transform: [
                            { translateY: Animated.add(anims[i].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }), new Animated.Value(c.arcY)) },
                        ],
                    }}
                >
                    <View style={styles.arcCharWrap}>
                        <CharacterShape variant="card" shape={c.shape} color={c.color} eyeStyle="ball" />
                    </View>
                    <Text style={[styles.arcNickname, { color: textColor }, T.semibold]}>{c.nickname}</Text>
                </Animated.View>
            ))}
        </View>
    );
}

// ── Slide 3 — animated settle arrow ───────────────────────────────────────────

function SettleArrow() {
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
        <Animated.Text
            style={[styles.settleArrow, T.extrabold, {
                transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [0, 8] }) }],
            }]}
        >
            →
        </Animated.Text>
    );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function OnboardingScreen({ navigation }: any) {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const listRef = useRef<FlatList>(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    const [selectedShape, setSelectedShape] = useState<typeof SHAPES[number]>('semi');
    const [selectedColor, setSelectedColor] = useState<string>(colors.accent);

    // Scale pop on the big preview whenever the selection changes
    const popAnim = useRef(new Animated.Value(1)).current;
    const firstRender = useRef(true);
    useEffect(() => {
        if (firstRender.current) { firstRender.current = false; return; }
        popAnim.setValue(0.88);
        Animated.spring(popAnim, { toValue: 1, damping: 15, stiffness: 300, useNativeDriver: true }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedShape, selectedColor]);

    const viewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems[0]) setCurrentIndex(viewableItems[0].index);
    }).current;
    const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    const skipToPicker = () => {
        listRef.current?.scrollToIndex({ index: SLIDE_COUNT - 1 });
    };

    const handleLetsGo = async () => {
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

    const renderSlide = ({ item: index }: { item: number }) => {
        // ── Slide 1: Your bills, handled ──
        if (index === 0) {
            return (
                <View style={{ width: SCREEN_W, flex: 1 }}>
                    <LinearGradient colors={colors.heroGradient} style={StyleSheet.absoluteFillObject} />
                    <View style={[styles.slideInner, { paddingTop: insets.top + vs(60) }]}>
                        <CrewArc textColor={colors.text} />
                        <Text style={[styles.headline, { color: colors.text }, T.extrabold]}>
                            Your bills,{'\n'}handled.
                        </Text>
                        <Text style={[styles.sub, { color: colors.secondaryText }, T.regular]}>
                            Split expenses. Settle free.{'\n'}Built for Canadian roommates.
                        </Text>
                    </View>
                </View>
            );
        }

        // ── Slide 2: Your crew. Your way ──
        if (index === 1) {
            const crewRow = [
                { ...CREW[0], chip: 'Vedant', balance: '+$34', owed: true },
                { ...CREW[1], chip: 'Sarah',  balance: '−$21', owed: false },
                { ...CREW[2], chip: 'Mike',   balance: '+$12', owed: true },
            ];
            return (
                <View style={{ width: SCREEN_W, flex: 1, backgroundColor: colors.background }}>
                    <View style={[styles.slideInner, { paddingTop: insets.top + vs(60) }]}>
                        <View style={styles.crewRow}>
                            {crewRow.map(c => (
                                <View key={c.chip} style={{ alignItems: 'center', gap: vs(8) }}>
                                    <View style={[styles.nicknameChip, { backgroundColor: colors.accentBg }]}>
                                        <Text style={[styles.nicknameChipText, { color: colors.accent }, T.semibold]}>{c.chip}</Text>
                                    </View>
                                    <View style={styles.arcCharWrap}>
                                        <CharacterShape variant="card" shape={c.shape} color={c.color} eyeStyle="ball" />
                                    </View>
                                    <Text style={[styles.balanceLabel, { color: c.owed ? colors.accent : '#F59E0B' }, T.bold]}>
                                        {c.balance}
                                    </Text>
                                </View>
                            ))}
                        </View>
                        <View style={[styles.expenseCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Text style={[styles.expenseCardText, { color: colors.text }, T.semibold]}>
                                Pizza night · Split 3 ways · $48.00
                            </Text>
                        </View>
                        <Text style={[styles.headline, { color: colors.text }, T.extrabold]}>
                            Your crew.{'\n'}Your way.
                        </Text>
                        <Text style={[styles.sub, { color: colors.secondaryText }, T.regular]}>
                            Pick a shape, color, and nickname.{'\n'}This is how your friends will see you.
                        </Text>
                    </View>
                </View>
            );
        }

        // ── Slide 3: Settle free. Automatically ──
        if (index === 2) {
            return (
                <View style={{ width: SCREEN_W, flex: 1 }}>
                    <LinearGradient colors={['#0A3020', '#062B16', '#0A0D0B']} style={StyleSheet.absoluteFillObject} />
                    <View style={[styles.slideInner, { paddingTop: insets.top + vs(60) }]}>
                        <View style={styles.settleRow}>
                            <View style={styles.arcCharWrap}>
                                <CharacterShape variant="card" shape="rect" color="#16A34A" eyeStyle="ball" />
                            </View>
                            <SettleArrow />
                            <View style={styles.arcCharWrap}>
                                <CharacterShape variant="card" shape="tall" color="#3B82F6" eyeStyle="ball" />
                            </View>
                        </View>
                        <View style={styles.interacPill}>
                            <Text style={[styles.interacPillText, T.semibold]}>Auto-confirmed via Interac ✓</Text>
                        </View>
                        <Text style={[styles.settleCaption, T.regular]}>
                            Free · ~30 seconds · No fees
                        </Text>
                        <Text style={[styles.headline, { color: '#FFFFFF' }, T.extrabold]}>
                            Settle free.{'\n'}Automatically.
                        </Text>
                        <Text style={[styles.sub, { color: 'rgba(255,255,255,0.70)' }, T.regular]}>
                            Interac e-Transfers, free and instant.{'\n'}We confirm them for you.
                        </Text>
                    </View>
                </View>
            );
        }

        // ── Slide 4: Pick your character ──
        return (
            <View style={{ width: SCREEN_W, flex: 1, backgroundColor: colors.background }}>
                <View style={[styles.slideInner, { paddingTop: insets.top + vs(48) }]}>
                    <Text style={[styles.pickerHeadline, { color: colors.text }, T.extrabold]}>
                        First, pick your{'\n'}character.
                    </Text>
                    <Text style={[styles.sub, { color: colors.secondaryText }, T.regular]}>
                        You can always change it later.
                    </Text>

                    {/* Big preview — hero variant, pops on every selection change */}
                    <Animated.View style={[styles.previewWrap, { transform: [{ scale: popAnim }] }]}>
                        <CharacterShape variant="hero" shape={selectedShape} color={selectedColor} eyeStyle="ball" />
                    </Animated.View>

                    {/* Shape picker */}
                    <View style={styles.shapeRow}>
                        {SHAPES.map(s => {
                            const selected = selectedShape === s;
                            return (
                                <TouchableOpacity
                                    key={s}
                                    onPress={() => { Haptics.selectionAsync(); setSelectedShape(s); }}
                                    style={[
                                        styles.shapeTile,
                                        {
                                            backgroundColor: colors.surface,
                                            borderColor: selected ? colors.accent : 'transparent',
                                        },
                                    ]}
                                    activeOpacity={0.8}
                                >
                                    <CharacterShape variant="mini" shape={s} color={selectedColor} eyeStyle="ball" />
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Color picker */}
                    <View style={styles.colorRow}>
                        {COLOR_PALETTE.map(c => {
                            const selected = selectedColor === c;
                            return (
                                <TouchableOpacity
                                    key={c}
                                    onPress={() => { Haptics.selectionAsync(); setSelectedColor(c); }}
                                    style={[styles.swatch, { backgroundColor: c }]}
                                    activeOpacity={0.8}
                                >
                                    {selected && <Check size={18} color="#FFFFFF" strokeWidth={3} />}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <TouchableOpacity
                        style={[styles.ctaBtn, { backgroundColor: colors.accent }]}
                        onPress={handleLetsGo}
                        activeOpacity={0.85}
                    >
                        <Text style={[styles.ctaText, T.semibold]}>Get started</Text>
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
                data={[0, 1, 2, 3]}
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

            {/* Skip — slides 1–3 only, jumps to the character picker */}
            {!onPicker && (
                <TouchableOpacity
                    style={[styles.skipBtn, { top: insets.top + vs(12) }]}
                    onPress={skipToPicker}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Text style={[styles.skipText, { color: currentIndex === 2 ? 'rgba(255,255,255,0.55)' : colors.faintText }, T.regular]}>
                        Skip
                    </Text>
                </TouchableOpacity>
            )}

            {/* Dots — slides 1–3 only */}
            {!onPicker && (
                <View style={[styles.dotsRow, { bottom: insets.bottom + vs(32) }]}>
                    {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.dot,
                                { backgroundColor: i === currentIndex
                                    ? colors.accent
                                    : currentIndex === 2 ? 'rgba(255,255,255,0.30)' : colors.faintText },
                            ]}
                        />
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    slideInner: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: scale(28),
    },

    // Slide 1 — crew arc
    arcRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: scale(12),
        marginTop: vs(48),
        marginBottom: vs(48),
        height: vs(130),
    },
    arcCharWrap: {
        height: 84,
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    arcNickname: {
        fontSize: ms(11),
        marginTop: vs(6),
    },

    headline: {
        fontSize: ms(40),
        letterSpacing: -1.6,
        textAlign: 'center',
        lineHeight: ms(46),
        marginBottom: vs(14),
    },
    sub: {
        fontSize: ms(15),
        textAlign: 'center',
        lineHeight: ms(22),
    },

    // Slide 2 — crew row
    crewRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: scale(26),
        marginTop: vs(28),
        marginBottom: vs(22),
    },
    nicknameChip: {
        borderRadius: 99,
        paddingHorizontal: scale(10),
        paddingVertical: vs(4),
    },
    nicknameChipText: { fontSize: ms(11) },
    balanceLabel: {
        fontSize: ms(14),
        letterSpacing: -0.3,
    },
    expenseCard: {
        borderRadius: ms(16),
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: scale(18),
        paddingVertical: vs(14),
        marginBottom: vs(40),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.10,
        shadowRadius: 14,
        elevation: 4,
    },
    expenseCardText: { fontSize: ms(14) },

    // Slide 3 — settle
    settleRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: scale(22),
        marginTop: vs(40),
        marginBottom: vs(24),
    },
    settleArrow: {
        fontSize: ms(30),
        color: '#3ECF8E',
        marginBottom: vs(24),
    },
    interacPill: {
        backgroundColor: 'rgba(62,207,142,0.16)',
        borderWidth: 1,
        borderColor: 'rgba(62,207,142,0.40)',
        borderRadius: 99,
        paddingHorizontal: scale(14),
        paddingVertical: vs(7),
        marginBottom: vs(12),
    },
    interacPillText: {
        fontSize: ms(13),
        color: '#3ECF8E',
    },
    settleCaption: {
        fontSize: ms(13),
        color: 'rgba(255,255,255,0.55)',
        marginBottom: vs(36),
    },

    // Slide 4 — picker
    pickerHeadline: {
        fontSize: ms(34),
        letterSpacing: -1.2,
        textAlign: 'center',
        lineHeight: ms(40),
        marginBottom: vs(10),
    },
    previewWrap: {
        height: 140,
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: vs(24),
        marginBottom: vs(28),
    },
    shapeRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: scale(12),
        marginBottom: vs(22),
    },
    shapeTile: {
        padding: scale(10),
        borderRadius: ms(16),
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'flex-end',
        minHeight: 88,
        minWidth: scale(64),
    },
    colorRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: scale(12),
        marginBottom: vs(30),
    },
    swatch: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ctaBtn: {
        width: '100%',
        borderRadius: 99,
        paddingVertical: vs(16),
        alignItems: 'center',
    },
    ctaText: {
        color: '#FFFFFF',
        fontSize: ms(16),
    },

    // Chrome
    skipBtn: {
        position: 'absolute',
        right: scale(24),
    },
    skipText: { fontSize: ms(14) },
    dotsRow: {
        position: 'absolute',
        alignSelf: 'center',
        flexDirection: 'row',
        gap: scale(8),
    },
    dot: {
        width: ms(8),
        height: ms(8),
        borderRadius: ms(4),
    },
});
