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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { usePaymentSheet } from '@stripe/stripe-react-native';
import { useTheme } from '../context/ThemeContext';
import {
    ChevronLeft,
    Landmark,
    CreditCard,
    Sparkles,
    Copy,
    CheckCircle2,
    ArrowRight,
    Send,
} from 'lucide-react-native';
import { meApi, settlementsApi, paymentsApi } from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';
import CharacterShape from '../components/CharacterShape';

export default function SettleUpScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { payment } = route.params;
    const { colors } = useTheme();

    const [step, setStep] = useState<'method' | 'etransfer' | 'sent'>('method');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [stripePaying, setStripePaying] = useState(false);

    const { initPaymentSheet, presentPaymentSheet } = usePaymentSheet();

    const fee = (Number(payment.amount) * 0.029 + 0.30).toFixed(2);
    const cardTotal = (Number(payment.amount) + Number(fee)).toFixed(2);

    const handleChooseInterac = async () => {
        setLoading(true);
        try {
            await settlementsApi.create(
                payment.group_id,
                payment.payee_id,
                Number(payment.amount),
                'etransfer'
            );
            setStep('etransfer');
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Could not initiate transfer');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyEmail = () => {
        Clipboard.setString(payment.payee_email);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleMarkSent = async () => {
        setLoading(true);
        try {
            const all = await meApi.getPayments();
            const rec = all.find(
                (r: any) =>
                    r.payer_id === payment.payer_id &&
                    r.payee_id === payment.payee_id &&
                    r.status === 'pending'
            );
            if (rec) {
                await settlementsApi.updateStatus(payment.group_id, rec.id, 'sent');
            }
            setStep('sent');
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to mark as sent');
        } finally {
            setLoading(false);
        }
    };

    const handleStripePayment = async () => {
        if (stripePaying) return;
        setStripePaying(true);
        try {
            const { client_secret } = await paymentsApi.createPaymentIntent({
                payee_id: payment.payee_id,
                amount: Math.round(Number(payment.amount) * 100),
                settlement_id: payment.id,
            });

            const { error: initError } = await initPaymentSheet({
                paymentIntentClientSecret: client_secret,
                merchantDisplayName: 'TandemPay',
                applePay: { merchantCountryCode: 'CA' },
                googlePay: { merchantCountryCode: 'CA', testEnv: true },
            });
            if (initError) {
                Alert.alert('Payment Error', initError.message);
                return;
            }

            const { error: presentError } = await presentPaymentSheet();
            if (!presentError) {
                Alert.alert('✅ Payment Successful', `$${formatCurrency(payment.amount)} sent to ${payment.payee_name}.`);
                navigation.goBack();
            } else if (presentError.code === 'Canceled') {
                // user dismissed — do nothing
            } else {
                Alert.alert('Payment Failed', presentError.message);
            }
        } catch (err: any) {
            Alert.alert('Payment Error', err.message || 'Something went wrong. Please try again.');
        } finally {
            setStripePaying(false);
        }
    };

    const handleAlreadySettled = async () => {
        try {
            await settlementsApi.updateStatus(payment.group_id, payment.id, 'settled');
            navigation.goBack();
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to update status');
        }
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            {/* Top bar */}
            <View style={styles.topBar}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backBtn}
                    activeOpacity={0.85}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <ChevronLeft size={26} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.topTitle, { color: colors.text }]}>Settle up</Text>
                <View style={styles.backBtn} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Context header — shown on all steps */}
                <View style={styles.contextHeader}>
                    <View style={[styles.glowCircle, { backgroundColor: colors.accent + '22' }]}>
                        <CharacterShape
                            shape="rect"
                            color={payment.payee_avatar_color}
                            variant="hero"
                        />
                    </View>
                    <Text style={[styles.owesLabel, { color: colors.secondaryText }]}>
                        You owe {payment.payee_name}
                    </Text>
                    <Text style={[styles.bigAmount, { color: colors.gold }]}>
                        ${formatCurrency(payment.amount)}
                    </Text>
                </View>

                {/* ── METHOD STEP ── */}
                {step === 'method' && (
                    <View style={styles.stepContent}>
                        {/* Interac hero card */}
                        <View style={[styles.interacCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <View style={styles.interacCardTop}>
                                <View style={[styles.iconTile, { backgroundColor: colors.accent + '22' }]}>
                                    <Landmark size={22} color={colors.accent} />
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={[styles.interacTitle, { color: colors.text }]}>
                                        Interac e-Transfer
                                    </Text>
                                    <Text style={[styles.interacSub, { color: colors.accent }]}>
                                        Free · Arrives in ~30 seconds
                                    </Text>
                                </View>
                                <View style={[styles.freePill, { backgroundColor: colors.accent }]}>
                                    <Text style={styles.freePillText}>FREE</Text>
                                </View>
                            </View>
                            <View style={styles.autoConfirmRow}>
                                <Sparkles size={13} color={colors.secondaryText} style={{ marginTop: 1 }} />
                                <Text style={[styles.autoConfirmText, { color: colors.secondaryText }]}>
                                    We'll auto-confirm once your bank sends you a confirmation email.
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.primaryBtn, { backgroundColor: colors.accent, opacity: loading ? 0.7 : 1 }]}
                                onPress={handleChooseInterac}
                                disabled={loading}
                                activeOpacity={0.85}
                            >
                                {loading
                                    ? <ActivityIndicator color="white" />
                                    : <Text style={styles.primaryBtnText}>Send via Interac</Text>
                                }
                            </TouchableOpacity>
                        </View>

                        {/* OR divider */}
                        <View style={styles.orRow}>
                            <View style={[styles.orLine, { backgroundColor: colors.border }]} />
                            <Text style={[styles.orText, { color: colors.secondaryText }]}>OR</Text>
                            <View style={[styles.orLine, { backgroundColor: colors.border }]} />
                        </View>

                        {/* Card option (muted) */}
                        <TouchableOpacity
                            style={[styles.cardOptionRow, { backgroundColor: colors.background, borderColor: colors.border }]}
                            onPress={handleStripePayment}
                            disabled={stripePaying}
                            activeOpacity={0.85}
                        >
                            <CreditCard size={18} color={colors.secondaryText} />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={[styles.cardOptionLabel, { color: colors.text }]}>
                                    Pay with card instead
                                </Text>
                                <Text style={[styles.cardOptionSub, { color: colors.secondaryText }]}>
                                    ${fee} fee · you'll pay ${cardTotal}
                                </Text>
                            </View>
                            {stripePaying
                                ? <ActivityIndicator size="small" color={colors.secondaryText} />
                                : <ArrowRight size={16} color={colors.secondaryText} />
                            }
                        </TouchableOpacity>

                        {/* Already settled link */}
                        <TouchableOpacity onPress={handleAlreadySettled} activeOpacity={0.7} style={styles.alreadySettledBtn}>
                            <Text style={[styles.alreadySettledText, { color: colors.secondaryText }]}>
                                I already settled this another way
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── ETRANSFER STEP ── */}
                {step === 'etransfer' && (
                    <View style={styles.stepContent}>
                        {/* Email row */}
                        <View style={[styles.emailBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.emailLabel, { color: colors.secondaryText }]}>
                                    RECIPIENT EMAIL
                                </Text>
                                <Text style={[styles.emailValue, { color: colors.text }]}>
                                    {payment.payee_email}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.copyBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                onPress={handleCopyEmail}
                                activeOpacity={0.85}
                            >
                                {copied
                                    ? <CheckCircle2 size={14} color={colors.accent} />
                                    : <Copy size={14} color={colors.secondaryText} />
                                }
                                <Text style={[styles.copyBtnText, { color: copied ? colors.accent : colors.secondaryText }]}>
                                    {copied ? 'Copied' : 'Copy'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Amount row */}
                        <View style={[styles.amountRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                            <Text style={[styles.amountRowLabel, { color: colors.secondaryText }]}>AMOUNT</Text>
                            <Text style={[styles.amountRowValue, { color: colors.gold }]}>
                                ${formatCurrency(payment.amount)}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.primaryBtn, { backgroundColor: colors.accent, opacity: loading ? 0.7 : 1 }]}
                            onPress={handleMarkSent}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            {loading
                                ? <ActivityIndicator color="white" />
                                : <Text style={styles.primaryBtnText}>I sent it on my banking app</Text>
                            }
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── SENT STEP ── */}
                {step === 'sent' && (
                    <View style={[styles.stepContent, styles.sentContent]}>
                        <View style={[styles.successCircle, { backgroundColor: colors.accent + '18', borderColor: colors.accent + '44' }]}>
                            <Send size={34} color={colors.accent} />
                        </View>
                        <Text style={[styles.successTitle, { color: colors.text }]}>
                            Payment marked as sent
                        </Text>
                        <Text style={[styles.successBody, { color: colors.secondaryText }]}>
                            We'll auto-confirm once your bank sends you a confirmation email.
                        </Text>
                        <TouchableOpacity
                            style={[styles.primaryBtn, { backgroundColor: colors.accent, marginTop: 8 }]}
                            onPress={() => navigation.goBack()}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.primaryBtnText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    topTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 48,
    },

    // Context header
    contextHeader: {
        alignItems: 'center',
        paddingVertical: 24,
        gap: 8,
    },
    glowCircle: {
        width: 140,
        height: 140,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    owesLabel: {
        fontSize: 16,
    },
    bigAmount: {
        fontSize: 48,
        fontWeight: '800',
        letterSpacing: -1,
    },

    // Shared step wrapper
    stepContent: {
        gap: 16,
    },

    // Interac hero card
    interacCard: {
        borderRadius: 24,
        borderWidth: 1,
        padding: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
        gap: 14,
    },
    interacCardTop: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconTile: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    interacTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    interacSub: {
        fontSize: 13,
        fontWeight: '700',
        marginTop: 2,
    },
    freePill: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 999,
    },
    freePillText: {
        color: 'white',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    autoConfirmRow: {
        flexDirection: 'row',
        gap: 6,
        alignItems: 'flex-start',
    },
    autoConfirmText: {
        fontSize: 13,
        lineHeight: 18,
        flex: 1,
    },

    // Primary button (full-width)
    primaryBtn: {
        height: 54,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
    },
    primaryBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },

    // OR divider
    orRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    orLine: {
        flex: 1,
        height: StyleSheet.hairlineWidth,
    },
    orText: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 1,
    },

    // Card option row (muted)
    cardOptionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        minHeight: 44,
    },
    cardOptionLabel: {
        fontSize: 15,
        fontWeight: '500',
    },
    cardOptionSub: {
        fontSize: 12,
        marginTop: 2,
    },

    // Already settled link
    alreadySettledBtn: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    alreadySettledText: {
        fontSize: 14,
        textDecorationLine: 'underline',
    },

    // e-Transfer step
    emailBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 12,
        minHeight: 44,
    },
    emailLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.2,
        marginBottom: 4,
    },
    emailValue: {
        fontSize: 15,
        fontWeight: '700',
    },
    copyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
    },
    copyBtnText: {
        fontSize: 12,
        fontWeight: '600',
    },
    amountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        minHeight: 44,
    },
    amountRowLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.2,
    },
    amountRowValue: {
        fontSize: 20,
        fontWeight: '800',
    },

    // Sent step
    sentContent: {
        alignItems: 'center',
        paddingTop: 16,
    },
    successCircle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    successTitle: {
        fontSize: 20,
        fontWeight: '800',
        textAlign: 'center',
    },
    successBody: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 21,
    },
});
