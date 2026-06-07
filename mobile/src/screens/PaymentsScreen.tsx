import React, { useState, useEffect, useCallback } from 'react';
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
    RefreshControl,
    Modal,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scale, vs, ms } from '../utils/responsive';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Send, CheckCircle2, XCircle, Clock, Check, Wallet, CreditCard, ArrowDownToLine, X, RotateCcw } from 'lucide-react-native';
import { meApi, settlementsApi, SettlementRecordOut, walletApi, WalletTransactionOut } from '../services/api';
import { T } from '../utils/typography';

export default function PaymentsScreen() {
    const navigation = useNavigation<any>();
    const { colors, isDark } = useTheme();
    const { user } = useAuth();

    const [masterTab, setMasterTab] = useState<'wallet' | 'settle'>('wallet');
    const [settleTab, setSettleTab] = useState<'pending' | 'history'>('pending');

    const [payments, setPayments] = useState<SettlementRecordOut[]>([]);
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [walletTransactions, setWalletTransactions] = useState<WalletTransactionOut[]>([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

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
            }
        } catch (err) {
            console.error('Failed to load data', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [masterTab]);

    useFocusEffect(useCallback(() => {
        setLoading(true);
        loadData();
    }, [loadData]));

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleUpdateStatus = async (groupId: string, id: string, status: string) => {
        try {
            await settlementsApi.updateStatus(groupId, id, status);
            loadData();
        } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to update payment.");
        }
    };

    const handleWalletAction = async () => {
        const amt = parseFloat(fundAmount);
        if (isNaN(amt) || amt <= 0) {
            Alert.alert("Invalid Amount", "Please enter a valid amount greater than 0.");
            return;
        }

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
            Alert.alert("Success", fundModalType === 'add' ? "Funds added successfully." : "Withdrawal initiated.");
        } catch (err: any) {
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
        Alert.alert('Stripe Connect', 'Connect your bank with Stripe to receive instant payouts. Use the Web App at tandempay.ca to link securely.');
    };

    const renderInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const pendingPayments = (payments ?? []).filter(p => p.status === 'pending' || p.status === 'sent');
    const historyPayments = (payments ?? []).filter(p => p.status === 'settled' || p.status === 'declined');

    const cardShadow = {
        shadowColor: isDark ? '#000' : '#0A3020',
        shadowOpacity: isDark ? 0.50 : 0.10,
        shadowRadius: isDark ? 20 : 14,
        shadowOffset: { width: 0, height: isDark ? 14 : 6 },
        elevation: isDark ? 14 : 4,
    };

    const renderPaymentCard = (payment: SettlementRecordOut) => {
        const isPayer = payment.payer_id === user?.id;
        const otherUserType = isPayer ? 'Paying' : 'Receiving from';
        const otherUserName = isPayer ? payment.payee_name : payment.payer_name;
        const otherUserAvatar = isPayer ? payment.payee_avatar_color : payment.payer_avatar_color;

        return (
            <View key={payment.id} style={[styles.card, {
                backgroundColor: colors.surface,
                borderColor: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.06)',
                ...cardShadow,
            }]}>
                <View style={styles.cardHeader}>
                    <View style={styles.cardInfo}>
                        <View style={[styles.avatar, { backgroundColor: otherUserAvatar }]}>
                            <Text style={[styles.avatarText, T.bold]}>{renderInitials(otherUserName)}</Text>
                        </View>
                        <View>
                            <Text style={[styles.cardTitle, { color: colors.secondaryText }, T.regular]}>{otherUserType}</Text>
                            <Text style={[styles.cardName, { color: colors.text }, T.bold]}>{otherUserName}</Text>
                        </View>
                    </View>
                    <Text style={[styles.amount, { color: isPayer ? colors.danger : colors.accent, fontVariant: ['tabular-nums'] }, T.extrabold]}>
                        ${formatCurrency(payment.amount)}
                    </Text>
                </View>

                <View style={[styles.statusBanner, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}>
                    <Text style={[styles.statusText, { color: colors.text }, T.regular]}>
                        Status: <Text style={[T.extrabold, { color: payment.status === 'settled' ? colors.accent : payment.status === 'declined' ? colors.danger : colors.secondaryText }]}>{payment.status.toUpperCase()}</Text>
                    </Text>
                </View>

                {settleTab === 'pending' && (
                    <View style={styles.actions}>
                        {isPayer && payment.status === 'pending' && (
                            <TouchableOpacity
                                style={[styles.actionBtn, {
                                    backgroundColor: colors.accent,
                                    shadowColor: '#16A34A',
                                    shadowOffset: { width: 0, height: 8 },
                                    shadowOpacity: 0.44,
                                    shadowRadius: 12,
                                    elevation: 8,
                                }]}
                                onPress={() => navigation.navigate('SettleUp', { payment })}
                                activeOpacity={0.82}
                            >
                                <Send size={16} color="white" />
                                <Text style={[styles.actionText, T.bold]}>Settle up</Text>
                            </TouchableOpacity>
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
                            <View style={{ flexDirection: 'row', gap: vs(8), width: '100%' }}>
                                <TouchableOpacity
                                    style={[styles.actionBtn, {
                                        backgroundColor: colors.accent, flex: 2,
                                        shadowColor: '#16A34A',
                                        shadowOffset: { width: 0, height: 8 },
                                        shadowOpacity: 0.44,
                                        shadowRadius: 12,
                                        elevation: 8,
                                    }]}
                                    onPress={() => handleUpdateStatus(payment.group_id, payment.id, 'settled')}
                                    activeOpacity={0.82}
                                >
                                    <CheckCircle2 size={16} color="white" />
                                    <Text style={[styles.actionText, T.bold]}>Confirm</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionBtn, { backgroundColor: colors.danger, flex: 1 }]}
                                    onPress={() => handleUpdateStatus(payment.group_id, payment.id, 'declined')}
                                    activeOpacity={0.82}
                                >
                                    <XCircle size={16} color="white" />
                                    <Text style={[styles.actionText, T.bold]}>Decline</Text>
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
            <View key={tx.id} style={[styles.ledgerRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.ledgerIcon, { backgroundColor: isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }]}>
                    {isPositive ? <ArrowDownToLine size={16} color="#10B981" /> : <Clock size={16} color="#EF4444" />}
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.ledgerType, { color: colors.text }, T.bold]}>{tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}</Text>
                    <Text style={[styles.ledgerDate, { color: colors.secondaryText }, T.regular]}>
                        {new Date(tx.created_at).toLocaleDateString()}
                    </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.ledgerAmount, { color: isPositive ? colors.accent : colors.text, fontVariant: ['tabular-nums'] }, T.bold]}>
                        {isPositive ? '+' : '-'}${formatCurrency(Math.abs(tx.amount))}
                    </Text>
                    <Text style={[styles.ledgerStatus, { color: tx.status === 'completed' ? colors.accent : '#F59E0B' }, T.extrabold]}>
                        {tx.status.toUpperCase()}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }, T.extrabold]}>Payments & Wallet</Text>

                <View style={[styles.segmentContainer, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: vs(16) }]}>
                    <TouchableOpacity
                        style={[styles.segment, masterTab === 'wallet' && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'white' }]}
                        onPress={() => setMasterTab('wallet')}
                        activeOpacity={0.88}
                    >
                        <Wallet size={16} color={masterTab === 'wallet' ? colors.text : colors.secondaryText} style={{ marginRight: scale(6) }} />
                        <Text style={[styles.segmentText, { color: masterTab === 'wallet' ? colors.text : colors.secondaryText }, masterTab === 'wallet' ? T.bold : T.regular]}>Wallet</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.segment, masterTab === 'settle' && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'white' }]}
                        onPress={() => setMasterTab('settle')}
                        activeOpacity={0.88}
                    >
                        <Send size={16} color={masterTab === 'settle' ? colors.text : colors.secondaryText} style={{ marginRight: scale(6) }} />
                        <Text style={[styles.segmentText, { color: masterTab === 'settle' ? colors.text : colors.secondaryText }, masterTab === 'settle' ? T.bold : T.regular]}>Settle Up</Text>
                    </TouchableOpacity>
                </View>

                {masterTab === 'settle' && (
                    <View style={[styles.segmentContainer, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: vs(8) }]}>
                        <TouchableOpacity
                            style={[styles.segment, settleTab === 'pending' && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'white' }]}
                            onPress={() => setSettleTab('pending')}
                            activeOpacity={0.88}
                        >
                            <Text style={[styles.segmentText, { color: settleTab === 'pending' ? colors.text : colors.secondaryText }, settleTab === 'pending' ? T.bold : T.regular]}>Action Required</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.segment, settleTab === 'history' && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'white' }]}
                            onPress={() => setSettleTab('history')}
                            activeOpacity={0.88}
                        >
                            <Text style={[styles.segmentText, { color: settleTab === 'history' ? colors.text : colors.secondaryText }, settleTab === 'history' ? T.bold : T.regular]}>History</Text>
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
                ) : masterTab === 'settle' ? (
                    <>
                        {(settleTab === 'pending' ? pendingPayments : historyPayments).length === 0 ? (
                            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <View style={[styles.iconContainer, { backgroundColor: 'rgba(52, 211, 153, 0.1)' }]}>
                                    {settleTab === 'pending' ? <Send size={40} color="#34D399" /> : <Check size={40} color="#34D399" />}
                                </View>
                                <Text style={[styles.emptyTitle, { color: colors.text }, T.bold]}>
                                    {settleTab === 'pending' ? 'All caught up!' : 'No payment history'}
                                </Text>
                                <Text style={[styles.emptyDesc, { color: colors.secondaryText }, T.regular]}>
                                    {settleTab === 'pending' ? 'You have no pending settlement requests.' : 'Past payments will appear here.'}
                                </Text>
                            </View>
                        ) : (
                            (settleTab === 'pending' ? pendingPayments : historyPayments).map(renderPaymentCard)
                        )}
                    </>
                ) : (
                    <>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.walletCardsScroll}>
                            <View style={[styles.walletCard, { backgroundColor: '#E0E7FF', borderColor: '#C7D2FE' }]}>
                                <View style={styles.walletCardHeader}>
                                    <View style={[styles.walletIconBox, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                                        <Wallet size={20} color="#4F46E5" />
                                    </View>
                                    <Text style={[styles.walletCardTitle, T.bold]}>Tandem Balance</Text>
                                </View>
                                <Text style={[styles.walletAvailable, T.regular]}>Available Funds</Text>
                                <Text style={[styles.walletBalanceText, T.extrabold]}>${formatCurrency(walletBalance)}</Text>
                                <View style={styles.walletButtons}>
                                    <TouchableOpacity style={[styles.walletBtn, { backgroundColor: 'white' }]} onPress={() => openFundModal('add')} activeOpacity={0.82}>
                                        <Text style={[styles.walletBtnText, { color: '#4F46E5' }, T.bold]}>Add Funds</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.walletBtn, { backgroundColor: '#818CF8' }]} onPress={() => openFundModal('withdraw')} activeOpacity={0.82}>
                                        <Text style={[styles.walletBtnText, { color: 'white' }, T.bold]}>Withdraw</Text>
                                    </TouchableOpacity>
                                </View>
                                <Text style={[styles.walletPowered, T.regular]}>Powered by Tandem Ledger</Text>
                            </View>

                            <View style={[styles.walletCard, { backgroundColor: isDark ? colors.surface : 'white', borderColor: colors.border }]}>
                                <View style={[styles.walletIconBox, { backgroundColor: 'rgba(99, 102, 241, 0.1)', alignSelf: 'center', marginBottom: vs(12) }]}>
                                    <CreditCard size={24} color="#6366F1" />
                                </View>
                                <Text style={[styles.walletCardTitle, { color: colors.text, textAlign: 'center', marginBottom: vs(8) }, T.bold]}>Receive Payments</Text>
                                <Text style={[styles.walletDesc, { color: colors.secondaryText }, T.regular]}>Connect your bank with Stripe to receive instant payouts from friends.</Text>
                                <TouchableOpacity style={[styles.walletBtnFull, { backgroundColor: '#6366F1', marginTop: 'auto' }]} onPress={handleStripeConnect} activeOpacity={0.82}>
                                    <Text style={[styles.walletBtnText, { color: 'white' }, T.bold]}>Connect Stripe ↗</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>

                        <Text style={[styles.ledgerSectionTitle, { color: colors.text }, T.bold]}>
                            Ledger History
                        </Text>

                        <View style={[styles.ledgerContainer, { backgroundColor: colors.surface, borderColor: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.06)', ...cardShadow }]}>
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
                            <Text style={[styles.modalTitle, { color: colors.text }, T.extrabold]}>
                                {fundModalType === 'add' ? 'Add Funds' : 'Withdraw Funds'}
                            </Text>
                            <TouchableOpacity onPress={() => setFundModalVisible(false)} style={[styles.closeModalBtn, { backgroundColor: colors.border }]} activeOpacity={0.88}>
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
                                shadowColor: '#16A34A',
                                shadowOffset: { width: 0, height: 8 },
                                shadowOpacity: 0.44,
                                shadowRadius: 12,
                                elevation: 8,
                            }]}
                            onPress={handleWalletAction}
                            disabled={fundLoading}
                            activeOpacity={0.82}
                        >
                            {fundLoading ? <ActivityIndicator color="white" /> : <Text style={[styles.submitBtnText, T.extrabold]}>Confirm</Text>}
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
        fontSize: ms(26),
        letterSpacing: -0.6,
        marginBottom: vs(20),
    },
    segmentContainer: {
        flexDirection: 'row',
        padding: scale(4),
        borderRadius: ms(12),
        borderWidth: StyleSheet.hairlineWidth,
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
        borderRadius: ms(20),
        borderWidth: StyleSheet.hairlineWidth,
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
    amount: { fontSize: ms(22) },
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
        gap: vs(8),
        height: 48,
        borderRadius: ms(12),
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
        borderWidth: StyleSheet.hairlineWidth,
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
        color: '#111827',
    },
    walletAvailable: {
        fontSize: ms(13),
        color: '#4B5563',
        marginBottom: vs(4),
    },
    walletBalanceText: {
        fontSize: ms(36),
        color: '#111827',
        marginBottom: vs(24),
        fontVariant: ['tabular-nums'],
    },
    walletButtons: {
        flexDirection: 'row',
        gap: vs(12),
        marginBottom: vs(16),
    },
    walletBtn: {
        flex: 1,
        height: 40,
        borderRadius: ms(20),
        alignItems: 'center',
        justifyContent: 'center',
    },
    walletBtnFull: {
        flexDirection: 'row',
        height: 44,
        borderRadius: ms(22),
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    walletBtnText: {
        fontSize: ms(13),
    },
    walletPowered: {
        fontSize: ms(11),
        color: '#6B7280',
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
        borderRadius: ms(20),
        borderWidth: StyleSheet.hairlineWidth,
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
        width: 40,
        height: 40,
        borderRadius: ms(20),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: scale(12),
    },
    ledgerType: {
        fontSize: ms(16),
        marginBottom: vs(2),
    },
    ledgerDate: {
        fontSize: ms(12),
    },
    ledgerAmount: {
        fontSize: ms(17),
        letterSpacing: -0.3,
        marginBottom: vs(2),
    },
    ledgerStatus: {
        fontSize: ms(11),
        letterSpacing: 1.3,
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
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
        fontSize: ms(24),
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
        borderWidth: 2,
        borderRadius: ms(16),
        paddingHorizontal: scale(16),
        marginBottom: vs(24),
        height: 60,
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
        height: 56,
        borderRadius: ms(28),
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitBtnText: {
        color: 'white',
        fontSize: ms(16),
    },
});
