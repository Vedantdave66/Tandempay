import React, { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '../utils/formatCurrency';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    RefreshControl,
    Modal,
    TextInput,
    Clipboard,
} from 'react-native';
import { usePaymentSheet } from '@stripe/stripe-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Send, CheckCircle2, XCircle, Clock, Check, Wallet, CreditCard, ArrowDownToLine, X, RotateCcw, Zap, Copy, Sparkles, ChevronRight } from 'lucide-react-native';
import { meApi, settlementsApi, SettlementRecordOut, walletApi, WalletTransactionOut, paymentsApi } from '../services/api';

type SettleStep = 'method' | 'etransfer' | 'sent_confirmation';

export default function PaymentsScreen() {
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    
    const [masterTab, setMasterTab] = useState<'wallet' | 'settle'>('wallet');
    const [settleTab, setSettleTab] = useState<'pending' | 'history'>('pending');
    
    const [payments, setPayments] = useState<SettlementRecordOut[]>([]);
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [walletTransactions, setWalletTransactions] = useState<WalletTransactionOut[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Tracks which settlement_id is currently being paid via Stripe sheet.
    const [stripePayingId, setStripePayingId] = useState<string | null>(null);

    const { initPaymentSheet, presentPaymentSheet } = usePaymentSheet();

    // Settle-up bottom sheet
    const [settleModalPayment, setSettleModalPayment] = useState<SettlementRecordOut | null>(null);
    const [settleStep, setSettleStep] = useState<SettleStep>('method');
    const [settleLoading, setSettleLoading] = useState(false);
    const [settleCopied, setSettleCopied] = useState(false);

    const openSettleModal = (payment: SettlementRecordOut) => {
        setSettleModalPayment(payment);
        setSettleStep('method');
    };
    const closeSettleModal = () => {
        setSettleModalPayment(null);
        setSettleStep('method');
    };

    // Modal state for Add Funds / Withdraw
    const [fundModalVisible, setFundModalVisible] = useState(false);
    const [fundModalType, setFundModalType] = useState<'add' | 'withdraw'>('add');
    const [fundAmount, setFundAmount] = useState('');
    const [fundLoading, setFundLoading] = useState(false);

    const loadData = useCallback(async () => {
        try {
            if (masterTab === 'settle') {
                const data = await meApi.getPayments();
                setPayments(data);
            } else {
                const [balanceData, txData] = await Promise.all([
                    walletApi.getBalance(),
                    walletApi.getTransactions()
                ]);
                console.log('[Wallet] Raw balance response:', JSON.stringify(balanceData));
                setWalletBalance(Number(balanceData?.wallet_balance) || 0);
                setWalletTransactions(txData);
            }
        } catch (err) {
            console.error('Failed to load data', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [masterTab]);

    useEffect(() => {
        setLoading(true);
        loadData();
    }, [loadData]);

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

    /**
     * Open the Stripe payment sheet for a specific settlement.
     *
     * Flow:
     *  1. POST /api/payments/create  →  { client_secret }
     *  2. initPaymentSheet({ paymentIntentClientSecret: client_secret })
     *  3. presentPaymentSheet()
     *  4a. Success  → alert + refresh list
     *  4b. Cancelled → silent (user dismissed intentionally)
     *  4c. Error    → Alert with message
     *
     * The existing "Mark as Sent" / "Confirm" flow is untouched — this is an
     * additional payment path for users who want to pay via card.
     */
    const handleStripePayment = async (payment: SettlementRecordOut) => {
        if (stripePayingId) return; // prevent double-tap
        setStripePayingId(payment.id);
        try {
            // Step 1: create PaymentIntent on the backend
            const { client_secret } = await paymentsApi.createPaymentIntent({
                payee_id: payment.payee_id,
                // Backend expects amount in CENTS (int). payment.amount is dollars from the DB.
                // e.g. $25.50 → 2550 cents. Math.round handles any floating-point edge cases.
                amount: Math.round(Number(payment.amount) * 100),
                settlement_id: payment.id,
            });

            // Step 2: initialise the payment sheet
            const { error: initError } = await initPaymentSheet({
                paymentIntentClientSecret: client_secret,
                merchantDisplayName: 'TandemPay',
                // Apple Pay / Google Pay config (optional but recommended)
                applePay: { merchantCountryCode: 'CA' },
                googlePay: { merchantCountryCode: 'CA', testEnv: true },
            });
            if (initError) {
                Alert.alert('Payment Error', initError.message);
                return;
            }

            // Step 3: present the sheet to the user
            const { error: presentError } = await presentPaymentSheet();

            if (!presentError) {
                // 4a: Success
                Alert.alert('✅ Payment Successful', `$${formatCurrency(payment.amount)} sent to ${payment.payee_name}.`);
                loadData(); // refresh the list
            } else if (presentError.code === 'Canceled') {
                // 4b: User dismissed — do nothing
            } else {
                // 4c: Real error
                Alert.alert('Payment Failed', presentError.message);
            }
        } catch (err: any) {
            Alert.alert('Payment Error', err.message || 'Something went wrong. Please try again.');
        } finally {
            setStripePayingId(null);
        }
    };

    const renderInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    // Filter payments
    const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'sent');
    const historyPayments = payments.filter(p => p.status === 'settled' || p.status === 'declined');

    const renderPaymentCard = (payment: SettlementRecordOut) => {
        const isPayer = payment.payer_id === user?.id;
        const otherUserType = isPayer ? 'Paying' : 'Receiving from';
        const otherUserName = isPayer ? payment.payee_name : payment.payer_name;
        const otherUserAvatar = isPayer ? payment.payee_avatar_color : payment.payer_avatar_color;

        return (
            <View key={payment.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.cardHeader}>
                    <View style={styles.cardInfo}>
                        <View style={[styles.avatar, { backgroundColor: otherUserAvatar }]}>
                            <Text style={styles.avatarText}>{renderInitials(otherUserName)}</Text>
                        </View>
                        <View>
                            <Text style={[styles.cardTitle, { color: colors.secondaryText }]}>{otherUserType}</Text>
                            <Text style={[styles.cardName, { color: colors.text }]}>{otherUserName}</Text>
                        </View>
                    </View>
                    <Text style={[styles.amount, { color: isPayer ? colors.danger : colors.accent }]}>
                        ${formatCurrency(payment.amount)}
                    </Text>
                </View>

                {/* Status Indicator */}
                <View style={[styles.statusBanner, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}>
                    <Text style={[styles.statusText, { color: colors.text }]}>
                        Status: <Text style={{ fontWeight: 'bold', color: payment.status === 'settled' ? colors.accent : payment.status === 'declined' ? colors.danger : colors.secondaryText }}>{payment.status.toUpperCase()}</Text>
                    </Text>
                </View>

                {/* Actions */}
                {settleTab === 'pending' && (
                    <View style={styles.actions}>
                        {isPayer && payment.status === 'pending' && (
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: colors.accent }]}
                                onPress={() => openSettleModal(payment)}
                            >
                                <Send size={16} color="white" />
                                <Text style={styles.actionText}>Settle up</Text>
                            </TouchableOpacity>
                        )}
                        {isPayer && payment.status === 'sent' && (
                            <Text style={[styles.waitingText, { color: colors.secondaryText }]}>
                                <Clock size={14} color={colors.secondaryText} style={{ marginRight: 4 }}/> Waiting for them to confirm...
                            </Text>
                        )}

                        {!isPayer && payment.status === 'pending' && (
                            <Text style={[styles.waitingText, { color: colors.secondaryText }]}>
                                <Clock size={14} color={colors.secondaryText} style={{ marginRight: 4 }}/> Waiting for them to send money...
                            </Text>
                        )}
                        {!isPayer && payment.status === 'sent' && (
                            <View style={{ flexDirection: 'row', gap: 8, width: '100%' }}>
                                <TouchableOpacity 
                                    style={[styles.actionBtn, { backgroundColor: colors.accent, flex: 2 }]}
                                    onPress={() => handleUpdateStatus(payment.group_id, payment.id, 'settled')}
                                >
                                    <CheckCircle2 size={16} color="white" />
                                    <Text style={styles.actionText}>Confirm</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.actionBtn, { backgroundColor: colors.danger, flex: 1 }]}
                                    onPress={() => handleUpdateStatus(payment.group_id, payment.id, 'declined')}
                                >
                                    <XCircle size={16} color="white" />
                                    <Text style={styles.actionText}>Decline</Text>
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
                    <Text style={[styles.ledgerType, { color: colors.text }]}>{tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}</Text>
                    <Text style={[styles.ledgerDate, { color: colors.secondaryText }]}>
                        {new Date(tx.created_at).toLocaleDateString()}
                    </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.ledgerAmount, { color: isPositive ? colors.accent : colors.text }]}>
                        {isPositive ? '+' : '-'}${formatCurrency(Math.abs(tx.amount))}
                    </Text>
                    <Text style={[styles.ledgerStatus, { color: tx.status === 'completed' ? colors.accent : '#F59E0B' }]}>
                        {tx.status.toUpperCase()}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Payments & Wallet</Text>
                
                {/* Master Segmented Control */}
                <View style={[styles.segmentContainer, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 16 }]}>
                    <TouchableOpacity 
                        style={[styles.segment, masterTab === 'wallet' && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'white', shadowOpacity: masterTab === 'wallet' ? 0.1 : 0 }]}
                        onPress={() => setMasterTab('wallet')}
                    >
                        <Wallet size={16} color={masterTab === 'wallet' ? colors.text : colors.secondaryText} style={{ marginRight: 6 }} />
                        <Text style={[styles.segmentText, { color: masterTab === 'wallet' ? colors.text : colors.secondaryText, fontWeight: masterTab === 'wallet' ? 'bold' : 'normal' }]}>Wallet</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.segment, masterTab === 'settle' && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'white', shadowOpacity: masterTab === 'settle' ? 0.1 : 0 }]}
                        onPress={() => setMasterTab('settle')}
                    >
                        <Send size={16} color={masterTab === 'settle' ? colors.text : colors.secondaryText} style={{ marginRight: 6 }} />
                        <Text style={[styles.segmentText, { color: masterTab === 'settle' ? colors.text : colors.secondaryText, fontWeight: masterTab === 'settle' ? 'bold' : 'normal' }]}>Settle Up</Text>
                    </TouchableOpacity>
                </View>

                {/* Sub Segmented Control (Only for Settle Up) */}
                {masterTab === 'settle' && (
                    <View style={[styles.segmentContainer, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 8 }]}>
                        <TouchableOpacity 
                            style={[styles.segment, settleTab === 'pending' && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'white', shadowOpacity: settleTab === 'pending' ? 0.1 : 0 }]}
                            onPress={() => setSettleTab('pending')}
                        >
                            <Text style={[styles.segmentText, { color: settleTab === 'pending' ? colors.text : colors.secondaryText, fontWeight: settleTab === 'pending' ? 'bold' : 'normal' }]}>Action Required</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.segment, settleTab === 'history' && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'white', shadowOpacity: settleTab === 'history' ? 0.1 : 0 }]}
                            onPress={() => setSettleTab('history')}
                        >
                            <Text style={[styles.segmentText, { color: settleTab === 'history' ? colors.text : colors.secondaryText, fontWeight: settleTab === 'history' ? 'bold' : 'normal' }]}>History</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <ScrollView 
                contentContainerStyle={styles.container}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
            >
                {loading && !refreshing ? (
                    <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
                ) : masterTab === 'settle' ? (
                    <>
                        {(settleTab === 'pending' ? pendingPayments : historyPayments).length === 0 ? (
                            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <View style={[styles.iconContainer, { backgroundColor: 'rgba(52, 211, 153, 0.1)' }]}>
                                    {settleTab === 'pending' ? <Send size={40} color="#34D399" /> : <Check size={40} color="#34D399" />}
                                </View>
                                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                                    {settleTab === 'pending' ? 'All caught up!' : 'No payment history'}
                                </Text>
                                <Text style={[styles.emptyDesc, { color: colors.secondaryText }]}>
                                    {settleTab === 'pending' ? 'You have no pending settlement requests.' : 'Past payments will appear here.'}
                                </Text>
                            </View>
                        ) : (
                            (settleTab === 'pending' ? pendingPayments : historyPayments).map(renderPaymentCard)
                        )}
                    </>
                ) : (
                    // WALLET VIEW
                    <>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.walletCardsScroll}>
                            {/* Balance Card */}
                            <View style={[styles.walletCard, { backgroundColor: '#E0E7FF', borderColor: '#C7D2FE' }]}>
                                <View style={styles.walletCardHeader}>
                                    <View style={[styles.walletIconBox, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                                        <Wallet size={20} color="#4F46E5" />
                                    </View>
                                    <Text style={styles.walletCardTitle}>Tandem Balance</Text>
                                </View>
                                <Text style={styles.walletAvailable}>Available Funds</Text>
                                <Text style={styles.walletBalanceText}>${formatCurrency(walletBalance)}</Text>
                                <View style={styles.walletButtons}>
                                    <TouchableOpacity style={[styles.walletBtn, { backgroundColor: 'white' }]} onPress={() => openFundModal('add')}>
                                        <Text style={[styles.walletBtnText, { color: '#4F46E5' }]}>Add Funds</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.walletBtn, { backgroundColor: '#818CF8' }]} onPress={() => openFundModal('withdraw')}>
                                        <Text style={[styles.walletBtnText, { color: 'white' }]}>Withdraw</Text>
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.walletPowered}>Powered by Tandem Ledger</Text>
                            </View>

                            {/* Stripe Receiving Card */}
                            <View style={[styles.walletCard, { backgroundColor: isDark ? colors.surface : 'white', borderColor: colors.border }]}>
                                <View style={[styles.walletIconBox, { backgroundColor: 'rgba(99, 102, 241, 0.1)', alignSelf: 'center', marginBottom: 12 }]}>
                                    <CreditCard size={24} color="#6366F1" />
                                </View>
                                <Text style={[styles.walletCardTitle, { color: colors.text, textAlign: 'center', marginBottom: 8 }]}>Receive Payments</Text>
                                <Text style={[styles.walletDesc, { color: colors.secondaryText }]}>Connect your bank with Stripe to receive instant payouts from friends.</Text>
                                <TouchableOpacity style={[styles.walletBtnFull, { backgroundColor: '#6366F1', marginTop: 'auto' }]} onPress={handleStripeConnect}>
                                    <Text style={[styles.walletBtnText, { color: 'white' }]}>Connect Stripe ↗</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>

                        <Text style={[styles.ledgerSectionTitle, { color: colors.text }]}>
                            <RotateCcw size={16} color={colors.secondaryText} style={{ marginRight: 8 }} />
                            Ledger History
                        </Text>
                        
                        <View style={[styles.ledgerContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            {walletTransactions.length === 0 ? (
                                <View style={styles.ledgerEmpty}>
                                    <RotateCcw size={32} color={colors.secondaryText} />
                                    <Text style={[styles.ledgerEmptyText, { color: colors.secondaryText }]}>No transactions yet.</Text>
                                </View>
                            ) : (
                                walletTransactions.map(renderWalletTransaction)
                            )}
                        </View>
                    </>
                )}
            </ScrollView>

            {/* ── SETTLE-UP BOTTOM SHEET ── */}
            <Modal
                visible={settleModalPayment !== null}
                animationType="slide"
                transparent={true}
                onRequestClose={closeSettleModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>

                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={[styles.modalTitle, { color: colors.text }]}>
                                    {settleStep === 'method' ? 'Settle up' :
                                     settleStep === 'etransfer' ? 'Send e-Transfer' :
                                     'Payment sent'}
                                </Text>
                                {settleModalPayment && settleStep === 'method' && (
                                    <Text style={{ color: colors.secondaryText, fontSize: 14, marginTop: 2 }}>
                                        ${formatCurrency(settleModalPayment.amount)} to {settleModalPayment.payee_name}
                                    </Text>
                                )}
                            </View>
                            <TouchableOpacity onPress={closeSettleModal} style={[styles.closeModalBtn, { backgroundColor: colors.border }]}>
                                <X size={18} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        {/* METHOD step */}
                        {settleStep === 'method' && settleModalPayment && (() => {
                            const fee = (Number(settleModalPayment.amount) * 0.029 + 0.30).toFixed(2);
                            return (
                                <View style={{ gap: 12 }}>
                                    {/* PRIMARY — Interac */}
                                    <TouchableOpacity
                                        style={[styles.primaryMethodCard, { borderColor: colors.accent }]}
                                        onPress={async () => {
                                            setSettleLoading(true);
                                            try {
                                                await settlementsApi.create(
                                                    settleModalPayment.group_id,
                                                    settleModalPayment.payee_id,
                                                    Number(settleModalPayment.amount),
                                                    'etransfer'
                                                );
                                                setSettleStep('etransfer');
                                            } catch (err: any) {
                                                Alert.alert('Error', err.message || 'Could not initiate transfer');
                                            } finally {
                                                setSettleLoading(false);
                                            }
                                        }}
                                        disabled={settleLoading}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.primaryMethodTitle, { color: colors.text }]}>
                                                Send via Interac e-Transfer
                                            </Text>
                                            <Text style={[styles.primaryMethodSub, { color: colors.accent }]}>
                                                Free  •  Arrives in ~30 seconds
                                            </Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 10, gap: 6 }}>
                                                <Sparkles size={13} color={colors.secondaryText} style={{ marginTop: 1 }} />
                                                <Text style={[styles.autoConfirmNote, { color: colors.secondaryText }]}>
                                                    We'll auto-confirm this payment when your bank sends the receipt email — no need to come back here.
                                                </Text>
                                            </View>
                                        </View>
                                        {settleLoading
                                            ? <ActivityIndicator color={colors.accent} />
                                            : <ChevronRight size={18} color={colors.accent} />
                                        }
                                    </TouchableOpacity>

                                    {/* SECONDARY — Card */}
                                    <TouchableOpacity
                                        style={[styles.secondaryMethodRow, { borderColor: colors.border, backgroundColor: colors.background }]}
                                        onPress={() => {
                                            closeSettleModal();
                                            handleStripePayment(settleModalPayment);
                                        }}
                                        disabled={stripePayingId !== null}
                                    >
                                        <CreditCard size={16} color={colors.secondaryText} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.secondaryMethodLabel, { color: colors.secondaryText }]}>
                                                Pay with card instead
                                            </Text>
                                            <Text style={[styles.secondaryMethodSub, { color: colors.secondaryText }]}>
                                                ${fee} fee  •  Arrives in 2 business days
                                            </Text>
                                        </View>
                                        <ChevronRight size={14} color={colors.secondaryText} />
                                    </TouchableOpacity>

                                    {/* Footer disclaimer */}
                                    <Text style={[styles.settleDisclaimer, { color: colors.secondaryText }]}>
                                        {settleModalPayment.payee_name} receives the full ${formatCurrency(settleModalPayment.amount)} via Interac. Card payments include the processor fee.
                                    </Text>
                                </View>
                            );
                        })()}

                        {/* ETRANSFER step */}
                        {settleStep === 'etransfer' && settleModalPayment && (
                            <View style={{ gap: 16 }}>
                                <View style={[styles.emailBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.emailLabel, { color: colors.secondaryText }]}>RECIPIENT EMAIL</Text>
                                        <Text style={[styles.emailValue, { color: colors.text }]}>{settleModalPayment.payee_email}</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.copyBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                        onPress={() => {
                                            Clipboard.setString(settleModalPayment.payee_email);
                                            setSettleCopied(true);
                                            setTimeout(() => setSettleCopied(false), 2000);
                                        }}
                                    >
                                        {settleCopied
                                            ? <CheckCircle2 size={14} color={colors.accent} />
                                            : <Copy size={14} color={colors.secondaryText} />
                                        }
                                        <Text style={[styles.copyBtnText, { color: colors.secondaryText }]}>
                                            {settleCopied ? 'Copied' : 'Copy'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    style={[styles.actionBtn, { backgroundColor: colors.accent, opacity: settleLoading ? 0.6 : 1 }]}
                                    disabled={settleLoading}
                                    onPress={async () => {
                                        setSettleLoading(true);
                                        try {
                                            const all = await meApi.getPayments();
                                            const rec = all.find(r =>
                                                r.payer_id === settleModalPayment.payer_id &&
                                                r.payee_id === settleModalPayment.payee_id &&
                                                r.status === 'pending'
                                            );
                                            if (rec) {
                                                await settlementsApi.updateStatus(settleModalPayment.group_id, rec.id, 'sent');
                                            }
                                            setSettleStep('sent_confirmation');
                                        } catch (err: any) {
                                            Alert.alert('Error', err.message || 'Failed to mark as sent');
                                        } finally {
                                            setSettleLoading(false);
                                        }
                                    }}
                                >
                                    {settleLoading
                                        ? <ActivityIndicator color="white" />
                                        : <>
                                            <Send size={16} color="white" />
                                            <Text style={styles.actionText}>I sent it on my banking app</Text>
                                          </>
                                    }
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* SENT CONFIRMATION step */}
                        {settleStep === 'sent_confirmation' && (
                            <View style={{ alignItems: 'center', gap: 16, paddingVertical: 8 }}>
                                <View style={[styles.successIcon, { backgroundColor: `${colors.accent}18`, borderColor: `${colors.accent}44` }]}>
                                    <Send size={32} color={colors.accent} />
                                </View>
                                <View style={{ alignItems: 'center' }}>
                                    <Text style={[styles.successTitle, { color: colors.text }]}>Payment marked as sent</Text>
                                    <Text style={[styles.successSub, { color: colors.secondaryText }]}>
                                        We'll auto-confirm once your bank email arrives. No action needed.
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={[styles.actionBtn, { backgroundColor: colors.accent }]}
                                    onPress={() => { closeSettleModal(); loadData(); }}
                                >
                                    <Text style={styles.actionText}>Done</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                    </View>
                </View>
            </Modal>

            {/* FUND MODAL */}
            <Modal visible={fundModalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>
                                {fundModalType === 'add' ? 'Add Funds' : 'Withdraw Funds'}
                            </Text>
                            <TouchableOpacity onPress={() => setFundModalVisible(false)} style={[styles.closeModalBtn, { backgroundColor: colors.border }]}>
                                <X size={20} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <Text style={{ color: colors.secondaryText, marginBottom: 16 }}>
                            {fundModalType === 'add' ? 'Enter amount to deposit into your Tandem wallet.' : `Enter amount to withdraw. Available: $${formatCurrency(walletBalance)}`}
                        </Text>

                        <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.background }]}>
                            <Text style={[styles.currencySymbol, { color: colors.text }]}>$</Text>
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="0.00"
                                placeholderTextColor={colors.secondaryText}
                                keyboardType="numeric"
                                value={fundAmount}
                                onChangeText={setFundAmount}
                                autoFocus
                            />
                        </View>

                        <TouchableOpacity 
                            style={[styles.submitBtn, { backgroundColor: colors.accent, opacity: fundLoading ? 0.7 : 1 }]}
                            onPress={handleWalletAction}
                            disabled={fundLoading}
                        >
                            {fundLoading ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>Confirm</Text>}
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
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 8,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        marginBottom: 20,
    },
    segmentContainer: {
        flexDirection: 'row',
        padding: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    segment: {
        flex: 1,
        flexDirection: 'row',
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
    },
    segmentText: {
        fontSize: 14,
    },
    container: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 140,
    },
    
    // Settle Up Styles
    card: {
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 16,
        padding: 16,
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
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    cardTitle: { fontSize: 12, marginBottom: 2 },
    cardName: { fontSize: 16, fontWeight: 'bold' },
    amount: { fontSize: 22, fontWeight: '900' },
    statusBanner: {
        marginTop: 16,
        padding: 12,
        borderRadius: 12,
    },
    statusText: { fontSize: 13 },
    actions: {
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 48,
        borderRadius: 12,
        width: '100%',
    },
    actionText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
    waitingText: { fontSize: 14, fontStyle: 'italic', textAlign: 'center', width: '100%' },
    emptyState: {
        padding: 40,
        borderRadius: 24,
        borderWidth: 1,
        alignItems: 'center',
        marginTop: 20,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    emptyTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
    emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 22 },

    // Wallet Styles
    walletCardsScroll: {
        paddingBottom: 24,
        gap: 16,
    },
    walletCard: {
        width: 280,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        marginRight: 16, // using marginRight here because gap sometimes acts up in horizontal scrollviews on old RN
    },
    walletCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    walletIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    walletCardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    walletAvailable: {
        fontSize: 13,
        color: '#4B5563',
        marginBottom: 4,
    },
    walletBalanceText: {
        fontSize: 36,
        fontWeight: '900',
        color: '#111827',
        marginBottom: 24,
    },
    walletButtons: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    walletBtn: {
        flex: 1,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    walletBtnFull: {
        flexDirection: 'row',
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    walletBtnText: {
        fontSize: 13,
        fontWeight: 'bold',
    },
    walletPowered: {
        fontSize: 11,
        color: '#6B7280',
        textAlign: 'center',
    },
    walletDesc: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    ledgerSectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    ledgerContainer: {
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
    },
    ledgerEmpty: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ledgerEmptyText: {
        marginTop: 12,
        fontSize: 14,
    },
    ledgerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    ledgerIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    ledgerType: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    ledgerDate: {
        fontSize: 12,
    },
    ledgerAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    ledgerStatus: {
        fontSize: 11,
        fontWeight: 'bold',
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        minHeight: '40%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '900',
    },
    closeModalBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderRadius: 16,
        paddingHorizontal: 16,
        marginBottom: 24,
        height: 60,
    },
    currencySymbol: {
        fontSize: 24,
        fontWeight: 'bold',
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 24,
        fontWeight: 'bold',
    },
    submitBtn: {
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },

    // Settle-up modal styles
    primaryMethodCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 18,
        borderRadius: 18,
        borderWidth: 2,
        backgroundColor: 'rgba(52, 211, 153, 0.06)',
    },
    primaryMethodTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    primaryMethodSub: {
        fontSize: 13,
        fontWeight: '600',
    },
    autoConfirmNote: {
        fontSize: 12,
        lineHeight: 17,
        flex: 1,
    },
    secondaryMethodRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
    },
    secondaryMethodLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    secondaryMethodSub: {
        fontSize: 11,
        marginTop: 1,
        opacity: 0.7,
    },
    settleDisclaimer: {
        fontSize: 11,
        textAlign: 'center',
        lineHeight: 16,
        opacity: 0.6,
    },
    emailBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 12,
    },
    emailLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1.2,
        marginBottom: 4,
    },
    emailValue: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    copyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
    },
    copyBtnText: {
        fontSize: 12,
        fontWeight: '600',
    },
    successIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
    },
    successTitle: {
        fontSize: 19,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 6,
    },
    successSub: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20,
    },
});
