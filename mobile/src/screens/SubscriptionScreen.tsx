import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Animated,
    Dimensions,
    Platform,
    Alert,
    Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Crown, Check } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { scale, vs, ms } from '../utils/responsive';
import { T } from '../utils/typography';

const MONTHLY_PRICE = '$4.99';
const ANNUAL_PRICE = '$34.99';
const ANNUAL_MONTHLY_EQUIV = '$2.92';

const WIN_W = Dimensions.get('window').width;
const TOGGLE_PAD = scale(4);
const TOGGLE_OPTION_W = (WIN_W - scale(40) - TOGGLE_PAD * 2) / 2;

const FREE_FEATURES = [
    'Up to 5 expense groups',
    'Interac e-Transfer settlement (free)',
    'Basic expense splitting',
    'Friends & activity feed',
];

const PRO_FEATURES = [
    'Everything in Free',
    'Recurring expenses — auto-split on a schedule',
    'Export data — CSV & PDF history',
    'AI receipt scanning — itemized splits',
    'Multi-currency tracking',
    'Priority support',
];

function purchasePro() {
    console.log('TODO: wire RevenueCat');
    Alert.alert('Payment coming soon', 'In-app purchase not configured yet — check back soon!');
}

export default function SubscriptionScreen({ navigation }: any) {
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    const insets = useSafeAreaInsets();

    const isPro = user?.subscription_tier === 'pro';
    const [annual, setAnnual] = useState(false);

    const slideAnim = useRef(new Animated.Value(0)).current;

    const handleToggle = (toAnnual: boolean) => {
        if (toAnnual === annual) return;
        setAnnual(toAnnual);
        Animated.spring(slideAnim, {
            toValue: toAnnual ? 1 : 0,
            damping: 20,
            stiffness: 320,
            useNativeDriver: true,
        }).start();
    };

    const pillX = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [TOGGLE_PAD, TOGGLE_PAD + TOGGLE_OPTION_W],
    });

    const ctaLabel = Platform.OS === 'ios' ? 'Continue with Apple Pay' : 'Continue with Google Pay';
    const currentPrice = annual ? ANNUAL_PRICE : MONTHLY_PRICE;
    const billingNote = annual ? 'billed annually' : 'billed monthly';

    // ── Upgrade flow ─────────────────────────────────────────────────────────
    return (
        <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: colors.background }]}>
            {/* Back button */}
            <TouchableOpacity
                style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => navigation.goBack()}
                activeOpacity={0.8}
            >
                <ChevronLeft size={ms(20)} color={colors.text} />
            </TouchableOpacity>

            <ScrollView
                contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + vs(100) }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Title */}
                <Text style={[styles.screenTitle, T.extrabold, { color: colors.text }]}>
                    TandemPay Pro
                </Text>
                <Text style={[styles.screenSub, T.regular, { color: colors.secondaryText }]}>
                    Unlock the full experience
                </Text>

                {isPro ? (
                    /* ── Pro confirmation state ── */
                    <View style={[styles.proConfirm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Crown size={ms(36)} color={colors.accent} />
                        <Text style={[styles.proConfirmTitle, T.bold, { color: colors.text }]}>
                            You're on Pro
                        </Text>
                        <Text style={[styles.proConfirmSub, T.regular, { color: colors.secondaryText }]}>
                            All features are unlocked. Thank you for supporting TandemPay.
                        </Text>
                        <TouchableOpacity
                            onPress={() => Linking.openURL('https://tandempay.ca/account')}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.manageLink, T.semibold, { color: colors.accent }]}>
                                Manage subscription →
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        {/* ── Billing toggle ── */}
                        <View style={[styles.toggleWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                            <Animated.View
                                style={[
                                    styles.togglePill,
                                    { backgroundColor: colors.accent },
                                    { width: TOGGLE_OPTION_W, transform: [{ translateX: pillX }] },
                                ]}
                            />
                            {(['monthly', 'annual'] as const).map((opt) => {
                                const isActive = (opt === 'annual') === annual;
                                return (
                                    <TouchableOpacity
                                        key={opt}
                                        style={[styles.toggleOption, { width: TOGGLE_OPTION_W }]}
                                        onPress={() => handleToggle(opt === 'annual')}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[
                                            styles.toggleOptionText,
                                            T.semibold,
                                            { color: isActive ? (isDark ? '#064E3B' : '#FFFFFF') : colors.secondaryText },
                                        ]}>
                                            {opt === 'monthly' ? 'Monthly' : 'Annual'}
                                        </Text>
                                        {opt === 'annual' && (
                                            <Text style={[
                                                styles.saveBadge,
                                                T.semibold,
                                                { color: isActive ? (isDark ? '#064E3B' : '#FFFFFF') : colors.accent },
                                            ]}>
                                                Save 40%
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* ── Free plan card ── */}
                        <View style={[styles.planCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Text style={[styles.planName, T.bold, { color: colors.text }]}>Free</Text>
                            <Text style={[styles.planPrice, T.extrabold, { color: colors.text }]}>$0</Text>
                            <Text style={[styles.planNote, T.regular, { color: colors.secondaryText }]}>forever</Text>
                            <View style={styles.featureList}>
                                {FREE_FEATURES.map(f => (
                                    <View key={f} style={styles.featureRow}>
                                        <Check size={ms(14)} color={colors.secondaryText} />
                                        <Text style={[styles.featureText, T.regular, { color: colors.secondaryText }]}>{f}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* ── Pro plan card ── */}
                        <View style={[styles.planCard, { backgroundColor: colors.surface, borderColor: colors.accent, borderWidth: 1.5 }]}>
                            <LinearGradient
                                colors={colors.cardGradient as [string, string]}
                                style={styles.proCardHeader}
                            >
                                <View style={styles.proCardTitleRow}>
                                    <Crown size={ms(16)} color="#fff" />
                                    <Text style={[styles.planName, T.bold, { color: '#fff', marginBottom: 0 }]}>Pro</Text>
                                </View>
                                {annual ? (
                                    <View style={styles.annualPriceRow}>
                                        <Text style={[styles.planPrice, T.extrabold, { color: '#fff' }]}>
                                            {ANNUAL_MONTHLY_EQUIV}
                                        </Text>
                                        <View>
                                            <Text style={[styles.strikethrough, T.regular, { color: 'rgba(255,255,255,0.6)' }]}>
                                                {MONTHLY_PRICE}
                                            </Text>
                                            <Text style={[styles.planNote, T.regular, { color: 'rgba(255,255,255,0.75)', marginTop: 0 }]}>
                                                / month
                                            </Text>
                                        </View>
                                    </View>
                                ) : (
                                    <>
                                        <Text style={[styles.planPrice, T.extrabold, { color: '#fff' }]}>{MONTHLY_PRICE}</Text>
                                        <Text style={[styles.planNote, T.regular, { color: 'rgba(255,255,255,0.75)' }]}>/ month</Text>
                                    </>
                                )}
                                <Text style={[styles.billingNote, T.regular, { color: 'rgba(255,255,255,0.6)' }]}>
                                    {billingNote} · {annual ? `${ANNUAL_PRICE}/yr` : 'cancel anytime'}
                                </Text>
                            </LinearGradient>
                            <View style={styles.featureList}>
                                {PRO_FEATURES.map(f => (
                                    <View key={f} style={styles.featureRow}>
                                        <Check size={ms(14)} color={colors.accent} />
                                        <Text style={[styles.featureText, T.regular, { color: colors.text }]}>{f}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </>
                )}
            </ScrollView>

            {/* ── Sticky footer ── */}
            {!isPro && (
                <View style={[
                    styles.footer,
                    {
                        backgroundColor: colors.background,
                        paddingBottom: insets.bottom + vs(16),
                        borderTopColor: colors.border,
                    },
                ]}>
                    <TouchableOpacity
                        style={[styles.ctaBtn, { backgroundColor: colors.accent }]}
                        onPress={purchasePro}
                        activeOpacity={0.85}
                    >
                        <Text style={[styles.ctaBtnText, T.bold, { color: isDark ? '#064E3B' : '#FFFFFF' }]}>
                            {ctaLabel}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => Linking.openURL('https://tandempay.ca/account')}
                        activeOpacity={0.7}
                        style={styles.restoreLink}
                    >
                        <Text style={[styles.restoreLinkText, T.regular, { color: colors.faintText }]}>
                            Restore purchase
                        </Text>
                    </TouchableOpacity>
                    <Text style={[styles.legalText, T.regular, { color: colors.faintText }]}>
                        By subscribing you agree to our{' '}
                        <Text
                            style={{ color: colors.secondaryText }}
                            onPress={() => Linking.openURL('https://tandempay.ca/terms')}
                        >
                            Terms
                        </Text>
                        {' & '}
                        <Text
                            style={{ color: colors.secondaryText }}
                            onPress={() => Linking.openURL('https://tandempay.ca/privacy')}
                        >
                            Privacy Policy
                        </Text>
                    </Text>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },

    backBtn: {
        width: scale(44),
        height: scale(44),
        borderRadius: ms(14),
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: StyleSheet.hairlineWidth,
        margin: scale(16),
    },

    scroll: {
        paddingHorizontal: scale(20),
    },

    screenTitle: {
        fontSize: ms(28),
        letterSpacing: -0.8,
        color: '#fff',
        marginBottom: vs(6),
    },
    screenSub: {
        fontSize: ms(15),
        marginBottom: vs(24),
    },

    // Toggle
    toggleWrap: {
        flexDirection: 'row',
        borderRadius: ms(16),
        padding: TOGGLE_PAD,
        position: 'relative',
        height: vs(54),
        alignItems: 'center',
    },
    togglePill: {
        position: 'absolute',
        height: vs(46),
        borderRadius: ms(13),
    },
    toggleOption: {
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    toggleOptionText: {
        fontSize: ms(14),
    },
    saveBadge: {
        fontSize: ms(10),
        marginTop: vs(1),
    },

    // Plan cards
    planCard: {
        borderRadius: ms(20),
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
        marginBottom: vs(14),
    },
    planName: {
        fontSize: ms(17),
        marginBottom: vs(4),
        paddingHorizontal: scale(16),
        paddingTop: scale(16),
    },
    planPrice: {
        fontSize: ms(40),
        letterSpacing: -1.5,
        paddingHorizontal: scale(16),
    },
    planNote: {
        fontSize: ms(13),
        marginTop: vs(2),
        marginBottom: vs(12),
        paddingHorizontal: scale(16),
    },

    // Pro card header
    proCardHeader: {
        padding: scale(16),
        paddingBottom: vs(14),
    },
    proCardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(6),
        marginBottom: vs(4),
    },
    annualPriceRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: scale(10),
        marginBottom: vs(2),
    },
    strikethrough: {
        fontSize: ms(14),
        textDecorationLine: 'line-through',
    },
    billingNote: {
        fontSize: ms(12),
        marginTop: vs(2),
    },

    // Features
    featureList: {
        padding: scale(16),
        gap: vs(10),
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: scale(8),
    },
    featureText: {
        fontSize: ms(13),
        flex: 1,
        lineHeight: ms(19),
    },

    // Pro confirmed
    proConfirm: {
        borderRadius: ms(20),
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
        padding: scale(32),
        gap: vs(10),
        marginTop: vs(20),
    },
    proConfirmTitle: {
        fontSize: ms(22),
        letterSpacing: -0.5,
    },
    proConfirmSub: {
        fontSize: ms(14),
        textAlign: 'center',
        lineHeight: ms(20),
    },
    manageLink: {
        fontSize: ms(14),
        marginTop: vs(4),
    },
    socialProof: {
        fontSize: ms(12),
        textAlign: 'center',
        marginTop: vs(4),
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: scale(20),
        paddingTop: vs(12),
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    ctaBtn: {
        height: vs(54),
        borderRadius: ms(16),
        alignItems: 'center',
        justifyContent: 'center',
    },
    ctaBtnText: {
        fontSize: ms(15),
    },
    restoreLink: {
        alignItems: 'center',
        paddingVertical: vs(10),
    },
    restoreLinkText: {
        fontSize: ms(13),
    },
    legalText: {
        fontSize: ms(11),
        textAlign: 'center',
        lineHeight: ms(16),
        paddingBottom: vs(4),
    },
});
