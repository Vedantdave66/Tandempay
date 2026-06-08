import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Clipboard,
} from 'react-native';
import { scale, vs, ms } from '../utils/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { usePaymentSheet } from '@stripe/stripe-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import {
    ChevronLeft, Landmark, Zap, CreditCard, Copy,
    Check, ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { meApi, settlementsApi, paymentsApi } from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';
import { T as Font } from '../utils/typography';
import CharacterShape from '../components/CharacterShape';

// ─── Theme tokens ────────────────────────────────────────────────────────────

type T = {
    bg: string; card: string; inset: string;
    green: string; greenInk: string; gold: string;
    ink: string; sub: string; chip: string; chipInk: string;
    cardBorder: string; insetBorder: string; overlay: string;
};

function tok(isDark: boolean): T {
    return isDark ? {
        bg: '#0A0D0B', card: '#141815', inset: '#0C0F0D',
        green: '#27E06A', greenInk: '#062B16', gold: '#F2C200',
        ink: '#FFFFFF', sub: '#8C958E', chip: '#1E231F', chipInk: '#CFD6CF',
        cardBorder: 'rgba(255,255,255,0.07)', insetBorder: 'rgba(255,255,255,0.06)',
        overlay: 'rgba(255,255,255,0.05)',
    } : {
        bg: '#E9F2EB', card: '#FFFFFF', inset: '#F4F8F4',
        green: '#0E9F4F', greenInk: '#FFFFFF', gold: '#B07E00',
        ink: '#0E140F', sub: '#5C665E', chip: '#E6EDE7', chipInk: '#46504A',
        cardBorder: 'rgba(0,0,0,0.05)', insetBorder: 'rgba(0,0,0,0.05)',
        overlay: 'rgba(0,0,0,0.03)',
    };
}

// ─── CopyRow ──────────────────────────────────────────────────────────────────

function CopyRow({ label, value, onCopy, isCopied, t }: {
    label: string; value: string; onCopy: () => void; isCopied: boolean; t: T;
}) {
    return (
        <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: t.inset, borderWidth: 1, borderColor: t.insetBorder,
            borderRadius: ms(14), padding: scale(12), paddingLeft: scale(14),
        }}>
            <View style={{ flex: 1, minWidth: 0, marginRight: scale(10) }}>
                <Text style={{ fontSize: ms(11), fontWeight: '800', letterSpacing: 0.6,
                    textTransform: 'uppercase', color: t.sub }}>{label}</Text>
                <Text style={{ fontSize: ms(16), fontWeight: '700', color: t.ink, marginTop: vs(2) }}
                    numberOfLines={1}>{value}</Text>
            </View>
            <TouchableOpacity
                onPress={onCopy}
                activeOpacity={0.75}
                style={{
                    flexDirection: 'row', alignItems: 'center', gap: scale(6),
                    backgroundColor: isCopied ? t.green : t.chip,
                    borderRadius: ms(10), paddingHorizontal: scale(12), paddingVertical: vs(8),
                    minHeight: 44,
                }}
            >
                {isCopied
                    ? <Check size={scale(16)} color={t.greenInk} strokeWidth={2.4} />
                    : <Copy size={scale(16)} color={t.chipInk} />}
                <Text style={{ fontSize: ms(13), fontWeight: '800',
                    color: isCopied ? t.greenInk : t.chipInk }}>
                    {isCopied ? 'Copied' : 'Copy'}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SettleUpScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { payment } = route.params;
    const { isDark } = useTheme();
    const t = tok(isDark);
    const insets = useSafeAreaInsets();

    const [view, setView] = useState<'choose' | 'sent'>('choose');
    const [method, setMethod] = useState<'interac' | 'card' | 'manual'>('interac');
    const [copied, setCopied] = useState<string | null>(null);
    const [cardOpen, setCardOpen] = useState(false);
    const [autoOn, setAutoOn] = useState(false);
    const [loading, setLoading] = useState(false);

    const { initPaymentSheet, presentPaymentSheet } = usePaymentSheet();

    const amount = Number(payment.amount);
    const expenseName: string = payment.description ?? 'Expense';
    const payeeName: string = payment.payee_name;
    const fee = (amount * 0.029 + 0.30).toFixed(2);
    const cardTotal = (amount + Number(fee)).toFixed(2);

    const handleCopy = (key: string, value: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Clipboard.setString(value);
        setCopied(key);
        setTimeout(() => setCopied(c => c === key ? null : c), 1300);
    };

    const handleSend = async (m: 'interac' | 'card' | 'manual') => {
        if (loading) return;
        setLoading(true);
        try {
            if (m === 'interac') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                let settlementId: string | null = payment.id ?? null;

                if (!settlementId) {
                    const created = await settlementsApi.create(payment.group_id, payment.payee_id, amount, 'etransfer');
                    settlementId = (created as any)?.id ?? null;
                    if (!settlementId) {
                        const all = await meApi.getPayments();
                        const rec = (all as Array<{ payer_id: string; payee_id: string; status: string; id: string }>)
                            .find(r => r.payer_id === payment.payer_id && r.payee_id === payment.payee_id && r.status === 'pending');
                        settlementId = rec?.id ?? null;
                    }
                }

                if (settlementId) await settlementsApi.updateStatus(payment.group_id, settlementId, 'sent');
                setMethod('interac');
                setView('sent');
            } else if (m === 'card') {
                const { client_secret } = await paymentsApi.createPaymentIntent({
                    payee_id: payment.payee_id,
                    amount: Math.round(amount * 100),
                    settlement_id: payment.id,
                });
                const { error: initError } = await initPaymentSheet({
                    paymentIntentClientSecret: client_secret,
                    merchantDisplayName: 'TandemPay',
                    applePay: { merchantCountryCode: 'CA' },
                    googlePay: { merchantCountryCode: 'CA', testEnv: true },
                });
                if (initError) { setLoading(false); Alert.alert('Payment Error', initError.message); return; }
                const { error: presentError } = await presentPaymentSheet();
                if (!presentError) {
                    setMethod('card');
                    setView('sent');
                } else if (presentError.code !== 'Canceled') {
                    Alert.alert('Payment Failed', presentError.message);
                }
            } else {
                await settlementsApi.updateStatus(payment.group_id, payment.id, 'settled');
                navigation.goBack();
            }
        } catch (err: any) {
            setLoading(false);
            Alert.alert('Error', err.message || 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    const heroColors = isDark
        ? ['#16A34A', '#0A4C29', '#0A0D0B', '#0A0D0B'] as const
        : ['#BDEECB', '#DBF3E2', '#E9F2EB', '#E9F2EB'] as const;
    const heroLocations = [0, 0.28, 0.62, 1] as const;

    return (
        <View style={{ flex: 1, backgroundColor: t.bg }}>
            <ScrollView
                style={{ flex: 1, backgroundColor: t.bg }}
                contentContainerStyle={{ flexGrow: 1, paddingHorizontal: scale(20), paddingBottom: vs(40) }}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero glow — bleeds to screen edges and status bar */}
                <LinearGradient
                    colors={heroColors}
                    locations={heroLocations}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={[styles.heroGrad, { marginHorizontal: -scale(20), paddingTop: insets.top + vs(16) }]}
                >
                    {/* Header sits inside gradient, clears status bar via paddingTop */}
                    <View style={[styles.header, { alignSelf: 'stretch' }]}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.headerBtn}
                            activeOpacity={0.8}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <ChevronLeft size={scale(26)} color={t.ink} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: t.ink }]}>Settle up</Text>
                        <View style={styles.headerBtn} />
                    </View>

                    <View style={styles.heroAvatarWrap}>
                        <CharacterShape shape="rect" color={payment.payee_avatar_color} variant="card" />
                        {view === 'sent' && (
                            <View style={[styles.checkBadge, { backgroundColor: t.green, borderColor: t.bg }]}>
                                <Check size={scale(14)} color={t.greenInk} strokeWidth={2.8} />
                            </View>
                        )}
                    </View>
                    <Text style={[styles.heroOwes, { color: t.sub }]}>You owe {payeeName}</Text>
                    <Text style={[styles.heroAmount, { color: t.gold }]}>${formatCurrency(amount)}</Text>
                    <View style={[styles.heroChip, { backgroundColor: t.overlay }]}>
                        <Text style={[styles.heroChipText, { color: t.sub }]}>for {expenseName}</Text>
                    </View>
                </LinearGradient>

                {/* ── Choose view ─────────────────────────────────────────── */}
                {view === 'choose' && (
                    <View style={{ gap: vs(16), marginTop: vs(8) }}>
                        {/* Interac hero card */}
                        <View style={[styles.card, {
                            backgroundColor: t.card, borderColor: t.cardBorder,
                            shadowColor: '#000',
                            shadowOpacity: isDark ? 0.50 : 0.12,
                            shadowRadius: 20,
                            shadowOffset: { width: 0, height: 14 },
                            elevation: isDark ? 18 : 12,
                        }]}>
                            <View style={styles.cardRow}>
                                <View style={[styles.iconTile, { backgroundColor: t.overlay }]}>
                                    <Landmark size={scale(20)} color={t.green} />
                                </View>
                                <View style={{ flex: 1, marginLeft: scale(12) }}>
                                    <Text style={[styles.cardTitle, { color: t.ink }]}>Interac e-Transfer</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(4), marginTop: vs(2) }}>
                                        <Zap size={scale(12)} color={t.sub} fill={t.sub} />
                                        <Text style={[styles.cardSub, { color: t.sub }]}>Arrives in ~30 seconds</Text>
                                    </View>
                                </View>
                                <View style={[styles.freePill, { backgroundColor: t.green }]}>
                                    <Text style={[styles.freePillText, { color: t.greenInk }]}>FREE</Text>
                                </View>
                            </View>

                            <CopyRow
                                label="Send to"
                                value={payment.payee_email}
                                onCopy={() => handleCopy('email', payment.payee_email)}
                                isCopied={copied === 'email'}
                                t={t}
                            />
                            <CopyRow
                                label="Amount"
                                value={`$${formatCurrency(amount)}`}
                                onCopy={() => handleCopy('amount', formatCurrency(amount))}
                                isCopied={copied === 'amount'}
                                t={t}
                            />
                            <CopyRow
                                label="Message"
                                value={`TandemPay · ${expenseName}`}
                                onCopy={() => handleCopy('message', `TandemPay · ${expenseName}`)}
                                isCopied={copied === 'message'}
                                t={t}
                            />

                            <TouchableOpacity
                                style={[styles.primaryBtn, { backgroundColor: t.green, opacity: loading ? 0.7 : 1 }]}
                                onPress={() => handleSend('interac')}
                                disabled={loading}
                                activeOpacity={0.85}
                            >
                                {loading
                                    ? <ActivityIndicator color={t.greenInk} />
                                    : <Text style={[styles.primaryBtnText, { color: t.greenInk }]}>
                                        I've sent it · ${formatCurrency(amount)}
                                    </Text>}
                            </TouchableOpacity>
                            <Text style={[styles.hint, { color: t.sub }]}>
                                Send the transfer from your bank, then tap to confirm
                            </Text>
                        </View>

                        {/* OR divider */}
                        <View style={styles.orRow}>
                            <View style={[styles.orLine, { backgroundColor: t.cardBorder }]} />
                            <Text style={[styles.orText, { color: t.sub }]}>OR</Text>
                            <View style={[styles.orLine, { backgroundColor: t.cardBorder }]} />
                        </View>

                        {/* Collapsible card option */}
                        <View style={[styles.card, {
                            backgroundColor: t.card, borderColor: t.cardBorder,
                            shadowColor: '#000',
                            shadowOpacity: isDark ? 0.50 : 0.12,
                            shadowRadius: 20,
                            shadowOffset: { width: 0, height: 14 },
                            elevation: isDark ? 18 : 12,
                            gap: 0,
                        }]}>
                            <TouchableOpacity
                                style={[styles.cardRow, { minHeight: 44 }]}
                                onPress={() => setCardOpen(o => !o)}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.iconTile, { backgroundColor: t.overlay }]}>
                                    <CreditCard size={scale(20)} color={t.sub} />
                                </View>
                                <View style={{ flex: 1, marginLeft: scale(12) }}>
                                    <Text style={[styles.cardTitle, { color: t.ink }]}>Pay by card instead</Text>
                                    <Text style={[styles.cardSub, { color: t.sub }]}>2.9% + 30¢ fee applies</Text>
                                </View>
                                <ChevronRight
                                    size={scale(20)}
                                    color={t.sub}
                                    style={{ transform: [{ rotate: cardOpen ? '90deg' : '0deg' }] }}
                                />
                            </TouchableOpacity>

                            {cardOpen && (
                                <View style={{ paddingTop: vs(16), gap: vs(10) }}>
                                    {([
                                        { label: 'Amount',    value: `$${formatCurrency(amount)}`, bold: false },
                                        { label: 'Card fee',  value: `$${fee}`,                    bold: false },
                                        { label: "You'll pay", value: `$${cardTotal}`,              bold: true  },
                                    ] as const).map(({ label, value, bold }, i) => (
                                        <View
                                            key={label}
                                            style={[
                                                styles.feeRow,
                                                i === 2 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.insetBorder, paddingTop: vs(10) },
                                            ]}
                                        >
                                            <Text style={[styles.feeLabel, { color: t.sub }]}>{label}</Text>
                                            <Text style={[styles.feeValue, { color: bold ? t.ink : t.sub, fontWeight: bold ? '800' : '600' }]}>
                                                {value}
                                            </Text>
                                        </View>
                                    ))}
                                    <TouchableOpacity
                                        style={[styles.ghostBtn, { borderColor: t.green, marginTop: vs(4) }]}
                                        onPress={() => handleSend('card')}
                                        disabled={loading}
                                        activeOpacity={0.85}
                                    >
                                        {loading
                                            ? <ActivityIndicator color={t.green} />
                                            : <Text style={[styles.ghostBtnText, { color: t.green }]}>
                                                Pay ${cardTotal} by card
                                            </Text>}
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        {/* Already settled link */}
                        <TouchableOpacity
                            style={styles.manualLink}
                            onPress={() => handleSend('manual')}
                            disabled={loading}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.manualLinkText, { color: t.sub }]}>
                                I already settled this another way
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── Sent view ───────────────────────────────────────────── */}
                {view === 'sent' && (
                    <View style={{ flex: 1, minHeight: vs(480), gap: vs(16), marginTop: vs(8) }}>
                        <View style={{ alignItems: 'center', gap: vs(6) }}>
                            <Text style={[styles.sentTitle, { color: t.ink }]}>
                                {method === 'interac' ? `Sent $${formatCurrency(amount)}`
                                    : method === 'card' ? `Paid $${formatCurrency(amount)}`
                                    : 'All settled'}
                            </Text>
                            <Text style={[styles.sentSub, { color: t.sub }]}>
                                {method === 'interac' ? `to ${payeeName} · waiting for them to confirm`
                                    : method === 'card' ? `to ${payeeName} · payment confirmed`
                                    : `You're squared up with ${payeeName}`}
                            </Text>
                        </View>

                        {method === 'interac' && (
                            <View style={[styles.card, {
                                backgroundColor: t.card, borderColor: t.cardBorder,
                                shadowColor: isDark ? '#000' : '#1A1A1A',
                                shadowOpacity: isDark ? 0.4 : 0.08,
                            }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(10) }}>
                                    <Zap size={scale(18)} color={t.green} fill={t.green} />
                                    <Text style={[styles.cardTitle, { color: t.ink }]}>Auto-confirm</Text>
                                </View>
                                <Text style={[styles.hint, { color: t.sub }]}>
                                    Forward your bank confirmation email to{' '}
                                    <Text style={{ color: t.green, fontWeight: '700' }}>confirm@tandempay.ca</Text>
                                    {' '}and we'll auto-confirm your payment.
                                </Text>
                                <TouchableOpacity
                                    style={[styles.toggleBtn, { backgroundColor: autoOn ? t.green : t.chip }]}
                                    onPress={() => setAutoOn(o => !o)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.toggleBtnText, { color: autoOn ? t.greenInk : t.chipInk }]}>
                                        {autoOn ? 'Auto-confirm enabled ✓' : 'Enable auto-confirm'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={{ flex: 1 }} />

                        <View style={{ paddingBottom: insets.bottom + vs(16) }}>
                            <TouchableOpacity
                                style={[styles.primaryBtn, { backgroundColor: t.green }]}
                                onPress={() => navigation.goBack()}
                                activeOpacity={0.85}
                            >
                                <Text style={[styles.primaryBtnText, { color: t.greenInk }]}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(16),
        height: vs(52),
    },
    headerBtn: {
        width: scale(44),
        height: scale(44),
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: ms(18),
        ...Font.bold,
    },

    heroGrad: {
        alignItems: 'center',
        paddingBottom: vs(72),
        paddingHorizontal: scale(20),
        gap: vs(8),
    },
    heroAvatarWrap: {
        position: 'relative',
        marginBottom: vs(10),
    },
    checkBadge: {
        position: 'absolute',
        right: -6,
        bottom: -4,
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
    },
    heroOwes: {
        fontSize: ms(16),
        ...Font.bold,
    },
    heroAmount: {
        fontSize: ms(52),
        ...Font.extrabold,
        letterSpacing: -1.5,
        lineHeight: 56,
        fontVariant: ['tabular-nums'],
    },
    heroChip: {
        borderRadius: 999,
        paddingHorizontal: scale(14),
        paddingVertical: vs(5),
        marginTop: vs(2),
    },
    heroChipText: {
        fontSize: ms(13),
        ...Font.semibold,
    },

    card: {
        borderRadius: ms(24),
        borderWidth: StyleSheet.hairlineWidth,
        padding: scale(18),
        gap: vs(14),
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconTile: {
        width: scale(44),
        height: scale(44),
        borderRadius: ms(12),
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: {
        fontSize: ms(19),
        ...Font.bold,
        letterSpacing: -0.3,
    },
    cardSub: {
        fontSize: ms(13),
        ...Font.regular,
    },
    freePill: {
        borderRadius: 999,
        paddingHorizontal: scale(10),
        paddingVertical: vs(4),
    },
    freePillText: {
        fontSize: ms(11),
        ...Font.extrabold,
        letterSpacing: 1.3,
    },
    hint: {
        fontSize: ms(15),
        lineHeight: 22,
        ...Font.semibold,
    },

    primaryBtn: {
        height: vs(54),
        borderRadius: ms(16),
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#16A34A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.44,
        shadowRadius: 12,
        elevation: 8,
    },
    primaryBtnText: {
        fontSize: ms(16),
        ...Font.extrabold,
    },

    ghostBtn: {
        height: vs(52),
        borderRadius: ms(14),
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ghostBtnText: {
        fontSize: ms(15),
        ...Font.bold,
    },

    orRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(12),
    },
    orLine: {
        flex: 1,
        height: StyleSheet.hairlineWidth,
    },
    orText: {
        fontSize: ms(12),
        ...Font.bold,
        letterSpacing: 1,
    },

    feeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    feeLabel: {
        fontSize: ms(15),
        ...Font.regular,
        lineHeight: 22,
    },
    feeValue: {
        fontSize: ms(15),
        fontVariant: ['tabular-nums'],
    },

    manualLink: {
        alignItems: 'center',
        minHeight: 44,
        justifyContent: 'center',
    },
    manualLinkText: {
        fontSize: ms(14),
        ...Font.regular,
        textDecorationLine: 'underline',
    },

    sentTitle: {
        fontSize: ms(24),
        ...Font.extrabold,
        letterSpacing: -0.5,
        textAlign: 'center',
    },
    sentSub: {
        fontSize: ms(15),
        ...Font.semibold,
        lineHeight: 22,
        textAlign: 'center',
    },

    toggleBtn: {
        height: vs(44),
        borderRadius: ms(12),
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(16),
    },
    toggleBtnText: {
        fontSize: ms(14),
        ...Font.bold,
    },
});
