import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
    Animated,
    Dimensions,
    Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
    ChevronLeft, Crown, Check, RefreshCw, FileDown, Camera, Headphones,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { scale, vs, ms } from '../utils/responsive';
import { T } from '../utils/typography';
import PressableScale from '../components/PressableScale';
import CharacterShape from '../components/CharacterShape';

const MONTHLY_PRICE = '$4.99';
const ANNUAL_PRICE = '$34.99';
const ANNUAL_MONTHLY_EQUIV = '$2.92';

const WIN_W = Dimensions.get('window').width;
const TOGGLE_PAD = scale(4);
const TOGGLE_OPTION_W = (WIN_W - scale(40) - TOGGLE_PAD * 2) / 2;

const FREE_FEATURES = [
    'Expense splitting with friends',
    'Up to 5 active groups',
    'Manual settlement via Interac',
    'Activity feed & notifications',
];

const PRO_FEATURES = [
    { Icon: Camera,     label: 'Receipt Scanning',   sub: 'AI-parsed itemized receipts instantly' },
    { Icon: RefreshCw,  label: 'Recurring Expenses', sub: 'Auto-split bills on a schedule' },
    { Icon: FileDown,   label: 'CSV & PDF Export',   sub: 'Download your full expense history' },
    { Icon: Headphones, label: 'Priority Support',   sub: 'Faster replies, dedicated queue' },
];

function purchasePro() {
    Alert.alert('Payment coming soon', 'Products not configured yet — check back soon!');
}

export default function SubscriptionScreen({ navigation }: any) {
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const isPro = user?.subscription_tier === 'pro';

    const [isAnnual, setIsAnnual] = useState(false);
    const slideAnim = useRef(new Animated.Value(0)).current;

    const handleToggle = (annual: boolean) => {
        if (annual === isAnnual) return;
        Haptics.selectionAsync();
        setIsAnnual(annual);
        Animated.spring(slideAnim, { toValue: annual ? 1 : 0, damping: 20, stiffness: 320, useNativeDriver: true }).start();
    };

    // ── Already Pro ──────────────────────────────────────────────────────────
    if (isPro) {
        return (
            <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
                <View style={styles.header}>
                    <PressableScale
                        scaleTo={0.97}
                        haptic="light"
                        onPress={() => navigation.goBack()}
                        style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                        <ChevronLeft size={ms(20)} color={colors.text} />
                    </PressableScale>
                    <Text style={[styles.headerTitle, { color: colors.text }, T.bold]}>TandemPay Pro</Text>
                    <View style={{ width: scale(44) }} />
                </View>
                <View style={styles.proConfirm}>
                    <CharacterShape
                        shape={user?.character_shape ?? 'rect'}
                        color={user?.character_color ?? '#34D399'}
                        variant="hero"
                    />
                    <Text style={[styles.proConfirmTitle, { color: colors.text }, T.extrabold]}>
                        You're Pro 👑
                    </Text>
                    <Text style={[styles.proConfirmSub, { color: colors.secondaryText }, T.regular]}>
                        You have full access to all Pro features.
                    </Text>
                    <PressableScale
                        scaleTo={0.97}
                        haptic="light"
                        onPress={() => Linking.openURL('https://tandempay.ca/pricing')}
                        style={[styles.manageBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                        <Text style={[styles.manageBtnText, { color: colors.accent }, T.semibold]}>
                            Manage subscription →
                        </Text>
                    </PressableScale>
                </View>
            </SafeAreaView>
        );
    }

    // ── Upgrade flow ─────────────────────────────────────────────────────────
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
                <Text style={[styles.headerTitle, { color: colors.text }, T.bold]}>TandemPay Pro</Text>
                <View style={{ width: scale(44) }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* Hero with gradient */}
                <LinearGradient
                    colors={colors.heroGradient}
                    locations={[0, 0.35, 1]}
                    style={styles.hero}
                >
                    <Crown size={36} color={colors.accent} strokeWidth={1.5} />
                    <Text style={[styles.heroTitle, { color: colors.text }, T.extrabold]}>
                        Unlock the full experience
                    </Text>
                    <Text style={[styles.heroSub, { color: colors.secondaryText }, T.regular]}>
                        Receipt scanning, recurring bills, exports, and priority support.
                    </Text>
                </LinearGradient>

                {/* Monthly / Annual toggle */}
                <View style={[styles.toggleWrap, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                }]}>
                    <Animated.View
                        style={[
                            styles.toggleSlider,
                            { backgroundColor: colors.accent },
                            { transform: [{ translateX: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [TOGGLE_PAD, TOGGLE_PAD + TOGGLE_OPTION_W] }) }] },
                        ]}
                    />
                    <PressableScale scaleTo={0.97} haptic="light" onPress={() => handleToggle(false)} style={styles.toggleOption}>
                        <Text style={[styles.toggleText, { color: !isAnnual ? '#fff' : colors.secondaryText }, T.semibold]}>
                            Monthly
                        </Text>
                    </PressableScale>
                    <PressableScale scaleTo={0.97} haptic="light" onPress={() => handleToggle(true)} style={styles.toggleOption}>
                        <View style={styles.toggleAnnualInner}>
                            <Text style={[styles.toggleText, { color: isAnnual ? '#fff' : colors.secondaryText }, T.semibold]}>
                                Annual
                            </Text>
                            <View style={[styles.saveBadge, { backgroundColor: isAnnual ? 'rgba(255,255,255,0.22)' : colors.accentBg }]}>
                                <Text style={[styles.saveBadgeText, { color: isAnnual ? '#fff' : colors.accent }, T.bold]}>
                                    Save 40%
                                </Text>
                            </View>
                        </View>
                    </PressableScale>
                </View>

                {/* Plan cards */}
                <View style={styles.cards}>

                    {/* Free card */}
                    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.cardTop}>
                            <Text style={[styles.planName, { color: colors.secondaryText }, T.bold]}>Free</Text>
                            <View style={styles.priceRow}>
                                <Text style={[styles.priceAmount, { color: colors.text }, T.extrabold]}>$0</Text>
                                <Text style={[styles.pricePer, { color: colors.secondaryText }, T.regular]}>/mo</Text>
                            </View>
                        </View>
                        <View style={styles.featureList}>
                            {FREE_FEATURES.map(f => (
                                <View key={f} style={styles.featureRow}>
                                    <Check size={14} color={colors.secondaryText} />
                                    <Text style={[styles.featureText, { color: colors.secondaryText }, T.regular]}>{f}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Pro card */}
                    <View style={[styles.card, styles.proCard, { borderColor: colors.accent + '60' }]}>
                        <LinearGradient
                            colors={[isDark ? colors.accentDark : colors.accent, colors.accent]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.proCardHeader}
                        >
                            <View style={styles.proCardHeaderRow}>
                                <View style={styles.proTitleRow}>
                                    <Crown size={15} color="#fff" strokeWidth={2} />
                                    <Text style={[styles.proCardName, T.extrabold]}>Pro</Text>
                                </View>
                                {isAnnual && (
                                    <View style={styles.annualBadge}>
                                        <Text style={[styles.annualBadgeText, T.bold]}>Save 40%</Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.proPriceRow}>
                                <Text style={[styles.proAmount, T.extrabold]}>
                                    {isAnnual ? ANNUAL_MONTHLY_EQUIV : MONTHLY_PRICE}
                                </Text>
                                <Text style={[styles.proAmountPer, T.regular]}>/mo</Text>
                                {isAnnual && (
                                    <Text style={[styles.strikePrice, T.semibold]}>{MONTHLY_PRICE}</Text>
                                )}
                            </View>
                            {isAnnual && (
                                <Text style={[styles.billedLine, T.regular]}>Billed {ANNUAL_PRICE} annually</Text>
                            )}
                        </LinearGradient>

                        <View style={[styles.proCardBody, { backgroundColor: colors.surface }]}>
                            {PRO_FEATURES.map(({ Icon, label, sub }) => (
                                <View key={label} style={styles.proFeatureRow}>
                                    <View style={[styles.proFeatureIconWrap, { backgroundColor: colors.accentBg }]}>
                                        <Icon size={14} color={colors.accent} />
                                    </View>
                                    <View style={styles.proFeatureText}>
                                        <Text style={[styles.proFeatureLabel, { color: colors.text }, T.semibold]}>{label}</Text>
                                        <Text style={[styles.proFeatureSub, { color: colors.secondaryText }, T.regular]}>{sub}</Text>
                                    </View>
                                    <Check size={13} color={colors.accent} strokeWidth={2.5} />
                                </View>
                            ))}
                            <Text style={[styles.socialProof, { color: colors.tertiaryText }, T.regular]}>
                                Trusted by roommates across Canada 🇨🇦
                            </Text>
                        </View>
                    </View>

                </View>
            </ScrollView>

            {/* Sticky footer CTA */}
            <View style={[styles.footer, {
                backgroundColor: colors.background,
                borderTopColor: colors.border,
                paddingBottom: Math.max(insets.bottom, vs(20)),
            }]}>
                <PressableScale
                    scaleTo={0.97}
                    haptic="medium"
                    onPress={purchasePro}
                    style={[styles.ctaBtn, { backgroundColor: colors.accent }]}
                >
                    <Text style={[styles.ctaBtnText, { color: isDark ? '#064E3B' : '#FFFFFF' }, T.bold]}>
                        {isAnnual ? `Go Pro — ${ANNUAL_MONTHLY_EQUIV}/mo` : `Go Pro — ${MONTHLY_PRICE}/mo`}
                    </Text>
                </PressableScale>

                <PressableScale
                    scaleTo={0.97}
                    haptic="none"
                    onPress={() => Alert.alert('Restore purchases', 'No previous purchases found.')}
                    style={styles.restoreBtn}
                >
                    <Text style={[styles.restoreText, { color: colors.accent }, T.semibold]}>Restore purchases</Text>
                </PressableScale>

                <View style={styles.legalRow}>
                    <PressableScale haptic="none" onPress={() => Linking.openURL('https://tandempay.ca/terms')}>
                        <Text style={[styles.legalLink, { color: colors.faintText }, T.regular]}>Terms</Text>
                    </PressableScale>
                    <Text style={[styles.legalDot, { color: colors.faintText }]}>·</Text>
                    <PressableScale haptic="none" onPress={() => Linking.openURL('https://tandempay.ca/privacy')}>
                        <Text style={[styles.legalLink, { color: colors.faintText }, T.regular]}>Privacy</Text>
                    </PressableScale>
                </View>
            </View>
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

    // Scroll
    scroll: {
        paddingHorizontal: scale(20),
        paddingBottom: vs(24),
        gap: vs(16),
    },

    // Hero
    hero: {
        alignItems: 'center',
        borderRadius: ms(24),
        paddingVertical: vs(28),
        paddingHorizontal: scale(20),
        gap: vs(8),
    },
    heroTitle: {
        fontSize: ms(22),
        letterSpacing: -0.5,
        textAlign: 'center',
        marginTop: vs(4),
    },
    heroSub: {
        fontSize: ms(14),
        textAlign: 'center',
        lineHeight: 20,
    },

    // Toggle
    toggleWrap: {
        flexDirection: 'row',
        borderRadius: ms(28),
        padding: TOGGLE_PAD,
        position: 'relative',
    },
    toggleSlider: {
        position: 'absolute',
        top: TOGGLE_PAD,
        bottom: TOGGLE_PAD,
        width: TOGGLE_OPTION_W,
        borderRadius: ms(24),
    },
    toggleOption: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: vs(11),
        zIndex: 1,
    },
    toggleAnnualInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(6),
    },
    toggleText: {
        fontSize: ms(14),
    },
    saveBadge: {
        borderRadius: 999,
        paddingHorizontal: scale(7),
        paddingVertical: vs(2),
    },
    saveBadgeText: {
        fontSize: ms(10),
    },

    // Plan cards
    cards: {
        gap: vs(14),
    },
    card: {
        borderRadius: ms(24),
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
    },
    cardTop: {
        padding: scale(20),
        gap: vs(4),
    },
    planName: {
        fontSize: ms(12),
        letterSpacing: 0.6,
        textTransform: 'uppercase',
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: scale(2),
    },
    priceAmount: {
        fontSize: ms(32),
        letterSpacing: -1,
        lineHeight: 36,
    },
    pricePer: {
        fontSize: ms(14),
        marginBottom: vs(3),
    },
    featureList: {
        paddingHorizontal: scale(20),
        paddingBottom: scale(20),
        gap: vs(10),
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(10),
    },
    featureText: {
        fontSize: ms(13),
        flex: 1,
    },

    // Pro card
    proCard: { borderWidth: 1.5 },
    proCardHeader: {
        padding: scale(20),
        gap: vs(6),
    },
    proCardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    proTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(6),
    },
    proCardName: {
        fontSize: ms(12),
        color: '#fff',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
    },
    annualBadge: {
        backgroundColor: 'rgba(255,255,255,0.22)',
        borderRadius: 999,
        paddingHorizontal: scale(10),
        paddingVertical: vs(3),
    },
    annualBadgeText: {
        fontSize: ms(10),
        color: '#fff',
    },
    proPriceRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: scale(4),
    },
    proAmount: {
        fontSize: ms(32),
        color: '#fff',
        letterSpacing: -1,
        lineHeight: 36,
    },
    proAmountPer: {
        fontSize: ms(14),
        color: 'rgba(255,255,255,0.75)',
        marginBottom: vs(3),
    },
    strikePrice: {
        fontSize: ms(14),
        color: 'rgba(255,255,255,0.50)',
        textDecorationLine: 'line-through',
        marginBottom: vs(3),
    },
    billedLine: {
        fontSize: ms(12),
        color: 'rgba(255,255,255,0.65)',
    },
    proCardBody: {
        padding: scale(20),
        paddingTop: vs(24),
        gap: vs(14),
    },
    proFeatureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(12),
    },
    proFeatureIconWrap: {
        width: scale(32),
        height: scale(32),
        borderRadius: ms(8),
        alignItems: 'center',
        justifyContent: 'center',
    },
    proFeatureText: {
        flex: 1,
        gap: vs(1),
    },
    proFeatureLabel: {
        fontSize: ms(14),
    },
    proFeatureSub: {
        fontSize: ms(12),
        lineHeight: 16,
    },
    socialProof: {
        fontSize: ms(12),
        textAlign: 'center',
        marginTop: vs(4),
    },

    // Sticky footer
    footer: {
        paddingHorizontal: scale(20),
        paddingTop: vs(14),
        borderTopWidth: StyleSheet.hairlineWidth,
        gap: vs(12),
        alignItems: 'center',
    },
    ctaBtn: {
        width: '100%',
        height: vs(54),
        borderRadius: ms(16),
        alignItems: 'center',
        justifyContent: 'center',
    },
    ctaBtnText: {
        fontSize: ms(16),
        letterSpacing: -0.2,
    },
    restoreBtn: {
        paddingVertical: vs(2),
    },
    restoreText: {
        fontSize: ms(14),
    },
    legalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
    },
    legalLink: {
        fontSize: ms(12),
    },
    legalDot: {
        fontSize: ms(12),
    },

    // Pro confirm state
    proConfirm: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(32),
        gap: vs(12),
    },
    proConfirmTitle: {
        fontSize: ms(28),
        letterSpacing: -0.5,
        marginTop: vs(12),
    },
    proConfirmSub: {
        fontSize: ms(15),
        textAlign: 'center',
        lineHeight: 22,
    },
    manageBtn: {
        marginTop: vs(8),
        borderRadius: ms(14),
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: scale(20),
        paddingVertical: vs(12),
    },
    manageBtnText: {
        fontSize: ms(14),
    },
});
