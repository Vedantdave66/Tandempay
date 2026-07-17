import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { formatCurrency } from '../utils/formatCurrency';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Linking,
    RefreshControl,
    Modal,
    TextInput,
    Animated,
    Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import PressableScale from '../components/PressableScale';
import { scale, vs, ms } from '../utils/responsive';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Send, CheckCircle2, XCircle, Clock, Check, Wallet, CreditCard, ArrowDownToLine, X, RotateCcw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { meApi, settlementsApi, SettlementRecordOut, walletApi, WalletTransactionOut } from '../services/api';
import { T } from '../utils/typography';
import InlineErrorState from '../components/InlineErrorState';

export default function PaymentsScreen() {
    const navigation = useNavigation<any>();
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    const { showToast } = useToast();

    const [masterTab, setMasterTab] = useState<'wallet' | 'settle'>('wallet');
    const [settleTab, setSettleTab] = useState<'pending' | 'history'>('pending');

    const [payments, setPayments] = useState<SettlementRecordOut[]>([]);
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [walletTransactions, setWalletTransactions] = useState<WalletTransactionOut[]>([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Tracks whether each tab has ever loaded real data — distinguishes a
    // genuine first-load failure (must not fabricate a $0 balance / empty
    // list) from a refresh failure where the last-good data is still valid.
    // Refs, not state: read only inside loadData's catch, so they shouldn't
    // force loadData to re-identify (and thus re-fire the focus effect).
    const walletLoadedRef = useRef(false);
    const paymentsLoadedRef = useRef(false);
    const [walletError, setWalletError] = useState(false);
    const [paymentsError, setPaymentsError] = useState(false);

    const paymentAnims = useRef(Array.from({ length: 5 }, () => new Animated.Value(0))).current;

    const [fundModalVisible, setFundModalVisible] = useState(false);
    const [fundModalType, setFundModalType] = useState<'add' | 'withdraw'>('add');
    const [fundAmount, setFundAmount] = useState('');
    const [fundLoading, setFundLoading] = useState(false);

    const loadData = useCallback(async () => {
        try {
            if (masterTab === 'settle') {
                const raw = await meApi.getPayments();
                const payments = Array.isArray(raw)
                    ? raw
                    : Array.isArray((raw as any)?.items)
                        ? (raw as any).items
                        : Array.isArray((raw as any)?.payments)
                            ? (raw as any).payments
                            : [];
                setPayments(payments);
                paymentsLoadedRef.current = true;
                setPaymentsError(false);
            } else {
                const [balanceData, rawTx] = await Promise.all([
                    walletApi.getBalance(),
                    walletApi.getTransactions()
                ]);
                setWalletBalance(Number(balanceData?.wallet_balance) || 0);
                const walletTransactions = Array.isArray(rawTx)
                    ? rawTx
                    : Array.isArray((rawTx as any)?.items)
                        ? (rawTx as any).items
                        : Array.isArray((rawTx as any)?.transactions)
                            ? (rawTx as any).transactions
                            : [];
                setWalletTransactions(walletTransactions);
                walletLoadedRef.current = true;
                setWalletError(false);
            }
        } catch (err) {
            console.error('Failed to load data', err);
            if (masterTab === 'settle') {
                if (paymentsLoadedRef.current) showToast("Couldn't refresh");
                else setPaymentsError(true);
            } else {
                if (walletLoadedRef.current) showToast("Couldn't refresh");
                else setWalletError(true);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [masterTab, showToast]);

    useFocusEffect(useCallback(() => {
        setLoading(true);
        loadData();
    }, [loadData]));

    useEffect(() => {
        const count = Math.min(payments.length, 5);
        paymentAnims.forEach(a => a.setValue(0));
        Animated.stagger(30, paymentAnims.slice(0, count).map(a =>
            Animated.timing(a, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true })
        )).start();
    }, [payments.length]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleUpdateStatus = async (groupId: string, id: string, status: string) => {
        try {
            await settlementsApi.updateStatus(groupId, id, status);
            if (status === 'settled') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            loadData();
        } catch (err: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert("Error", err.message || "Failed to update payment.");
        }
    };

    const handleWalletAction = async () => {
        const amt = parseFloat(fundAmount);
        if (isNaN(amt) || amt <= 0) {
            Alert.alert("Invalid Amount", "Please enter a valid amount greater than 0.");
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setFundLoading(true);
        try {
            if (fundModalType === 'add') {
                await walletApi.addFunds(amt);
            } else {
                await walletApi.withdraw(amt);
            }
            setFundModalVisible(false);
            setFundAmount('');
            loadData();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Success", fundModalType === 'add' ? "Funds added successfully." : "Withdrawal initiated.");
        } catch (err: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert("Error", err.message || "Wallet action failed.");
        } finally {
            setFundLoading(false);
        }
    };

    const openFundModal = (type: 'add' | 'withdraw') => {
        setFundModalType(type);
        setFundAmount('');
        setFundModalVisible(true);
    };

    const handleStripeConnect = () => {
        Linking.openURL('https://tandempay.ca/account');
    };

    const renderInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const pendingPayments = (payments ?? []).filter(p => p.status === 'pending' || p.status === 'sent');
    const historyPayments = (payments ?? []).filter(p => p.status === 'settled' || p.status === 'declined');

    const renderPaymentCard = (payment: SettlementRecordOut) => {
        const isPayer = payment.payer_id === user?.id;
        const otherUserType = isPayer ? 'Paying' : 'Receiving from';
        const otherUserName = isPayer ? payment.payee_name : payment.payer_name;
        const otherUserAvatar = isPayer ? payment.payee_avatar_color : payment.payer_avatar_color;
        const statusLabel = payment.status.charAt(0).toUpperCase() + payment.status.slice(1);

        return (
            <View key={payment.id} style={[styles.card, { backgroundColor: colors.surface }]}>
                <View style={styles.cardHeader}>
                    <View style={styles.cardInfo}>
                        <View style={[styles.avatar, { backgroundColor: otherUserAvatar }]}>
                            <Text style={[styles.avatarText, T.bold]}>{renderInitials(otherUserName)}</Text>
                        </View>
                        <View>
                            <Text style={[styles.cardTitle, { color: colors.secondaryText }, T.regular]}>{otherUserType}</Text>
                            <Text style={[styles.cardName, { color: colors.text }, T.semibold]}>{otherUserName}</Text>
                        </View>
                    </View>
                    <Text style={[styles.amount, { color: isPayer ? colors.danger : colors.accent, fontVariant: ['tabular-nums'] }, T.bold]}>
                        ${formatCurrency(payment.amount)}
                    </Text>
                </View>

                <View style={[styles.statusBanner, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}>
                    <Text style={[styles.statusText, { color: colors.secondaryText }, T.regular]}>
                        Status: <Text style={[T.semibold, { color: payment.status === 'settled' ? colors.accent : payment.status === 'declined' ? colors.danger : colors.text }]}>{statusLabel}</Text>
                    </Text>
                </View>

                {settleTab === 'pending' && (
                    <View style={styles.actions}>
                        {isPayer && payment.status === 'pending' && (
                            <PressableScale
                                style={[styles.actionBtn, { backgroundColor: colors.accent }]}
                                onPress={() => navigation.navigate('SettleUp', { payment })}
                                haptic="medium"
                            >
                                <Send size={16} color="white" />
                                <Text style={[styles.actionText, T.semibold]}>Settle up</Text>
                            </PressableScale>
                        )}
                        {isPayer && payment.status === 'sent' && (
                            <Text style={[styles.waitingText, { color: colors.secondaryText }, T.regular]}>
                                <Clock size={14} color={colors.secondaryText} style={{ marginRight: scale(4) }}/> Waiting for them to confirm...
                            </Text>
                        )}

                        {!isPayer && payment.status === 'pending' && (
                            <Text style={[styles.waitingText, { color: colors.secondaryText }, T.regular]}>
                                <Clock size={14} color={colors.secondaryText} style={{ marginRight: scale(4) }}/> Waiting for them to send money...
                            </Text>
                        )}
                        {!isPayer && payment.status === 'sent' && (
                            <View style={{ flexDirection: 'row', gap: scale(8), width: '100%' }}>
                                <PressableScale
                                    style={[styles.actionBtn, { backgroundColor: colors.accent, flex: 2 }]}
                                    onPress={() => handleUpdateStatus(payment.group_id, payment.id, 'settled')}
                                    haptic="medium"
                                >
                                    <CheckCircle2 size={16} color="white" />
                                    <Text style={[styles.actionText, T.semibold]}>Confirm</Text>
                                </PressableScale>
                                <TouchableOpacity
                                    style={[styles.actionBtn, { flex: 1 }]}
                                    onPress={() => handleUpdateStatus(payment.group_id, payment.id, 'declined')}
                                    activeOpacity={0.60}
                                >
                                    <Text style={[styles.actionText, { color: colors.danger }, T.semibold]}>Decline</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}
            </View>
        );
    };

    const renderWalletTransaction = (tx: WalletTransactionOut) => {
        const isPositive = tx.amount > 0;
        return (
            <View key={tx.id} style={[styles.ledgerRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
                <View style={[styles.ledgerIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }]}>
                    {isPositive
                        ? <ArrowDownToLine size={20} color={colors.accent} />
                        : <Clock size={20} color={colors.secondaryText} />}
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.ledgerType, { color: colors.text }, T.regular]}>{tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}</Text>
                    <Text style={[styles.ledgerDate, { color: colors.secondaryText }, T.regular]}>
                        {new Date(tx.created_at).toLocaleDateString()}
                    </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.ledgerAmount, { color: isPositive ? colors.accent : colors.text, fontVariant: ['tabular-nums'] }, T.semibold]}>
                        {isPositive ? '+' : '-'}${formatCurrency(Math.abs(tx.amount))}
                    </Text>
                    <Text style={[styles.ledgerStatus, { color: tx.status === 'completed' ? colors.secondaryText : colors.gold }, T.semibold]}>
                        {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }, T.bold]}>Payments</Text>

                <View style={[styles.segmentContainer, { backgroundColor: colors.surface, marginBottom: vs(16) }]}>
                    <TouchableOpacity
                        style={[styles.segment, masterTab === 'wallet' && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'white' }]}
                        onPress={() => { Haptics.selectionAsync(); setMasterTab('wallet'); }}
                        activeOpacity={0.75}
                    >
                        <Wallet size={16} color={masterTab === 'wallet' ? colors.text : colors.secondaryText} style={{ marginRight: scale(6) }} />
                        <Text style={[styles.segmentText, { color: masterTab === 'wallet' ? colors.text : colors.secondaryText }, masterTab === 'wallet' ? T.semibold : T.regular]}>Wallet</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.segment, masterTab === 'settle' && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'white' }]}
                        onPress={() => { Haptics.selectionAsync(); setMasterTab('settle'); }}
                        activeOpacity={0.75}
                    >
                        <Send size={16} color={masterTab === 'settle' ? colors.text : colors.secondaryText} style={{ marginRight: scale(6) }} />
                        <Text style={[styles.segmentText, { color: masterTab === 'settle' ? colors.text : colors.secondaryText }, masterTab === 'settle' ? T.semibold : T.regular]}>Settle Up</Text>
                    </TouchableOpacity>
                </View>

                {masterTab === 'settle' && (
                    <View style={[styles.segmentContainer, { backgroundColor: colors.surface, marginBottom: vs(8) }]}>
                        <TouchableOpacity
                            style={[styles.segment, settleTab === 'pending' && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'white' }]}
                            onPress={() => { Haptics.selectionAsync(); setSettleTab('pending'); }}
                            activeOpacity={0.75}
                        >
                            <Text style={[styles.segmentText, { color: settleTab === 'pending' ? colors.text : colors.secondaryText }, settleTab === 'pending' ? T.semibold : T.regular]}>Action Required</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.segment, settleTab === 'history' && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'white' }]}
                            onPress={() => { Haptics.selectionAsync(); setSettleTab('history'); }}
                            activeOpacity={0.75}
                        >
                            <Text style={[styles.segmentText, { color: settleTab === 'history' ? colors.text : colors.secondaryText }, settleTab === 'history' ? T.semibold : T.regular]}>History</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <ScrollView
                contentContainerStyle={styles.container}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
            >
                {loading && !refreshing ? (
                    <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: vs(40) }} />
                ) : masterTab === 'settle' && paymentsError ? (
                    <InlineErrorState
                        message="Couldn't load your payments"
                        onRetry={loadData}
                    />
                ) : masterTab === 'settle' ? (
                    <>
                        {(settleTab === 'pending' ? pendingPayments : historyPayments).length === 0 ? (
                            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <View style={[styles.iconContainer, { backgroundColor: 'rgba(52, 211, 153, 0.1)' }]}>
                                    {settleTab === 'pending' ? <Send size={40} color="#34D399" /> : <Check size={40} color="#34D399" />}
                                </View>
                                <Text style={[styles.emptyTitle, { color: colors.text }, T.semibold]}>
                                    {settleTab === 'pending' ? 'Nothing owed, nothing owing' : 'No history yet'}
                                </Text>
                                <Text style={[styles.emptyDesc, { color: colors.secondaryText }, T.regular]}>
                                    {settleTab === 'pending' ? "No one's waiting on you, and you're not waiting on anyone." : 'Settled tabs end up here, for the record.'}
                                </Text>
                            </View>
                        ) : (
                            (settleTab === 'pending' ? pendingPayments : historyPayments).map((p, i) => (
                            <Animated.View key={p.id} style={{ opacity: paymentAnims[Math.min(i, 4)] }}>
                                {renderPaymentCard(p)}
                            </Animated.View>
                        ))
                        )}
                    </>
                ) : walletError ? (
                    <InlineErrorState
                        message="Couldn't load your wallet balance"
                        onRetry={loadData}
                    />
                ) : (
                    <>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.walletCardsScroll}>
                            {/* Balance card — brand gradient, adapts to every accent and both modes */}
                            <LinearGradient
                                colors={colors.heroGradient}
                                locations={[0, 0.35, 1]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.walletCard}
                            >
                                <View style={styles.walletCardHeader}>
                                    <View style={[styles.walletIconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.65)' }]}>
                                        <Wallet size={20} color={isDark ? colors.text : colors.accentDark} />
                                    </View>
                                    <Text style={[styles.walletCardTitle, { color: colors.text }, T.semibold]}>Your balance</Text>
                                </View>
                                <Text style={[styles.walletAvailable, { color: colors.secondaryText }, T.regular]}>Ready to spend or send</Text>
                                <Text style={[styles.walletBalanceText, { color: colors.text, fontVariant: ['tabular-nums'] }, T.bold]}>${formatCurrency(walletBalance)}</Text>
                                <View style={styles.walletButtons}>
                                    <PressableScale
                                        style={[styles.walletBtn, { backgroundColor: colors.accent }]}
                                        onPress={() => openFundModal('add')}
                                        haptic="medium"
                                    >
                                        <Text style={[styles.walletBtnText, { color: '#fff' }, T.semibold]}>Add money</Text>
                                    </PressableScale>
                                    <PressableScale
                                        style={[styles.walletBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.8)' }]}
                                        onPress={() => openFundModal('withdraw')}
                                        haptic="light"
                                    >
                                        <Text style={[styles.walletBtnText, { color: colors.text }, T.semibold]}>Withdraw</Text>
                                    </PressableScale>
                                </View>
                                <Text style={[styles.walletPowered, { color: colors.faintText }, T.regular]}>Powered by Tandem Ledger</Text>
                            </LinearGradient>

                            <View style={[styles.walletCard, { backgroundColor: colors.surface }]}>
                                <View style={[styles.walletIconBox, { backgroundColor: colors.accentBg, alignSelf: 'center', marginBottom: vs(12) }]}>
                                    <CreditCard size={24} color={colors.accent} />
                                </View>
                                <Text style={[styles.walletCardTitle, { color: colors.text, textAlign: 'center', marginBottom: vs(8) }, T.semibold]}>Get paid, properly</Text>
                                <Text style={[styles.walletDesc, { color: colors.secondaryText }, T.regular]}>Link your bank once and money from friends lands straight in your account.</Text>
                                <PressableScale
                                    style={[styles.walletBtnFull, { backgroundColor: colors.accent, marginTop: 'auto' }]}
                                    onPress={handleStripeConnect}
                                    haptic="light"
                                >
                                    <Text style={[styles.walletBtnText, { color: '#fff' }, T.semibold]}>Connect Stripe ↗</Text>
                                </PressableScale>
                            </View>
                        </ScrollView>

                        <Text style={[styles.ledgerSectionTitle, { color: colors.text }, T.bold]}>
                            Ledger History
                        </Text>

                        <View style={[styles.ledgerContainer, { backgroundColor: colors.surface }]}>
                            {(walletTransactions ?? []).length === 0 ? (
                                <View style={styles.ledgerEmpty}>
                                    <RotateCcw size={32} color={colors.secondaryText} />
                                    <Text style={[styles.ledgerEmptyText, { color: colors.secondaryText }, T.regular]}>No transactions yet.</Text>
                                </View>
                            ) : (
                                (walletTransactions ?? []).map(renderWalletTransaction)
                            )}
                        </View>
                    </>
                )}
            </ScrollView>

            <Modal visible={fundModalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }, T.semibold]}>
                                {fundModalType === 'add' ? 'Add Funds' : 'Withdraw Funds'}
                            </Text>
                            <TouchableOpacity onPress={() => setFundModalVisible(false)} style={[styles.closeModalBtn, { backgroundColor: colors.border }]} activeOpacity={0.75}>
                                <X size={20} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <Text style={[{ color: colors.secondaryText, marginBottom: vs(16) }, T.regular]}>
                            {fundModalType === 'add' ? 'Enter amount to deposit into your Tandem wallet.' : `Enter amount to withdraw. Available: $${formatCurrency(walletBalance)}`}
                        </Text>

                        <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.background }]}>
                            <Text style={[styles.currencySymbol, { color: colors.text }, T.bold]}>$</Text>
                            <TextInput
                                style={[styles.input, { color: colors.text, ...T.bold }]}
                                placeholder="0.00"
                                placeholderTextColor={colors.secondaryText}
                                keyboardType="numeric"
                                value={fundAmount}
                                onChangeText={setFundAmount}
                                autoFocus
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.submitBtn, {
                                backgroundColor: colors.accent,
                                opacity: fundLoading ? 0.7 : 1,
                            }]}
                            onPress={handleWalletAction}
                            disabled={fundLoading}
                            activeOpacity={0.70}
                        >
                            {fundLoading ? <ActivityIndicator color="white" /> : <Text style={[styles.submitBtnText, T.semibold]}>Confirm</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    header: {
        paddingHorizontal: scale(24),
        paddingTop: vs(24),
        paddingBottom: vs(8),
    },
    title: {
        fontSize: ms(28),
        letterSpacing: -0.8,
        marginBottom: vs(20),
    },
    segmentContainer: {
        flexDirection: 'row',
        padding: scale(4),
        borderRadius: ms(12),
    },
    segment: {
        flex: 1,
        flexDirection: 'row',
        paddingVertical: vs(10),
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: ms(8),
    },
    segmentText: {
        fontSize: ms(14),
    },
    container: {
        paddingHorizontal: scale(24),
        paddingTop: vs(16),
        paddingBottom: vs(140),
    },

    card: {
        borderRadius: ms(16),
        marginBottom: vs(16),
        padding: scale(16),
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: ms(22),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: scale(12),
    },
    avatarText: { color: 'white', fontSize: ms(16) },
    cardTitle: { fontSize: ms(12), marginBottom: vs(2) },
    cardName: { fontSize: ms(16) },
    amount: { fontSize: ms(22), letterSpacing: -0.8 },
    statusBanner: {
        marginTop: vs(16),
        padding: scale(12),
        borderRadius: ms(12),
    },
    statusText: { fontSize: ms(13) },
    actions: {
        marginTop: vs(16),
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(8),
        height: scale(48),
        borderRadius: ms(14),
        width: '100%',
    },
    actionText: { color: 'white', fontSize: ms(15) },
    waitingText: { fontSize: ms(14), fontStyle: 'italic', textAlign: 'center', width: '100%' },
    emptyState: {
        padding: scale(40),
        borderRadius: ms(24),
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
        marginTop: vs(20),
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: ms(40),
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: vs(24),
    },
    emptyTitle: { fontSize: ms(20), marginBottom: vs(12) },
    emptyDesc: { fontSize: ms(14), textAlign: 'center', lineHeight: 22 },

    walletCardsScroll: {
        paddingBottom: vs(24),
        gap: vs(16),
    },
    walletCard: {
        width: 280,
        borderRadius: ms(24),
        padding: scale(24),
        marginRight: scale(16),
    },
    walletCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: vs(24),
    },
    walletIconBox: {
        width: 40,
        height: 40,
        borderRadius: ms(12),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: scale(12),
    },
    walletCardTitle: {
        fontSize: ms(16),
    },
    walletAvailable: {
        fontSize: ms(13),
        marginBottom: vs(4),
    },
    walletBalanceText: {
        fontSize: ms(36),
        letterSpacing: -1.2,
        marginBottom: vs(24),
    },
    walletButtons: {
        flexDirection: 'row',
        gap: scale(12),
        marginBottom: vs(16),
    },
    walletBtn: {
        flex: 1,
        height: scale(44),
        borderRadius: ms(14),
        alignItems: 'center',
        justifyContent: 'center',
    },
    walletBtnFull: {
        flexDirection: 'row',
        height: scale(44),
        borderRadius: ms(14),
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    walletBtnText: {
        fontSize: ms(14),
    },
    walletPowered: {
        fontSize: ms(11),
        textAlign: 'center',
    },
    walletDesc: {
        fontSize: ms(13),
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: vs(20),
    },
    ledgerSectionTitle: {
        fontSize: ms(18),
        marginBottom: vs(16),
    },
    ledgerContainer: {
        borderRadius: ms(16),
        overflow: 'hidden',
    },
    ledgerEmpty: {
        padding: scale(40),
        alignItems: 'center',
        justifyContent: 'center',
    },
    ledgerEmptyText: {
        marginTop: vs(12),
        fontSize: ms(14),
    },
    ledgerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: scale(16),
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    ledgerIcon: {
        width: scale(36),
        height: scale(36),
        borderRadius: ms(10),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: scale(12),
    },
    ledgerType: {
        fontSize: ms(17),
        marginBottom: vs(2),
    },
    ledgerDate: {
        fontSize: ms(12),
    },
    ledgerAmount: {
        fontSize: ms(17),
        letterSpacing: -0.5,
        marginBottom: vs(2),
    },
    ledgerStatus: {
        fontSize: ms(12),
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: ms(20),
        borderTopRightRadius: ms(20),
        padding: scale(24),
        minHeight: '40%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: vs(16),
    },
    modalTitle: {
        fontSize: ms(17),
        letterSpacing: -0.3,
    },
    closeModalBtn: {
        width: 36,
        height: 36,
        borderRadius: ms(18),
        alignItems: 'center',
        justifyContent: 'center',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: ms(14),
        paddingHorizontal: scale(16),
        marginBottom: vs(24),
        height: vs(60),
    },
    currencySymbol: {
        fontSize: ms(24),
        marginRight: scale(8),
    },
    input: {
        flex: 1,
        fontSize: ms(24),
    },
    submitBtn: {
        paddingVertical: vs(16),
        borderRadius: ms(14),
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitBtnText: {
        color: 'white',
        fontSize: ms(17),
    },
});
