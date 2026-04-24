import { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '../utils/currency';
import { CreditCard, History, Wallet, ArrowRightLeft, ArrowDownRight, ArrowUpRight, AlertCircle, ExternalLink, CheckCircle, Unlink, ShieldCheck } from 'lucide-react';
import { meApi, SettlementRecord, walletApi, stripeApi, WalletTransaction } from '../services/api';
import PaymentRecordCard from '../components/PaymentRecordCard';
import { useAuth } from '../context/AuthContext';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

export default function PaymentsPage() {
    const { user, refetchUser } = useAuth();
    const [payments, setPayments] = useState<SettlementRecord[]>([]);
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [stripeStatus, setStripeStatus] = useState<{
        onboarded: boolean;
        account_id: string | null;
        email: string | null;
        payouts_enabled: boolean;
        dashboard_url: string | null;
    }>({ onboarded: false, account_id: null, email: null, payouts_enabled: false, dashboard_url: null });
    const [stripeLoading, setStripeLoading] = useState(false);

    useEffect(() => {
        loadAll();
    }, []);

    const loadAll = useCallback(async () => {
        try {
            const [payData, transData, stripeData] = await Promise.all([
                meApi.getPayments(),
                walletApi.getTransactions(),
                stripeApi.getStatus()
            ]);
            setPayments(payData);
            setTransactions(transData);
            setStripeStatus(stripeData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Auto-refresh: poll every 30s + re-fetch on tab focus/visibility
    useAutoRefresh(loadAll, 30000, !loading);

    const handleStripeOnboard = async () => {
        setStripeLoading(true);
        try {
            const res = await stripeApi.onboard();
            window.location.href = res.url;
        } catch (err: any) {
            alert(err.message || 'Failed to initiate Stripe onboarding');
        } finally {
            setStripeLoading(false);
        }
    };

    const pendingConfirmation = payments.filter(
        (p) => p.payee_id === user?.id && p.status === 'sent'
    );
    const needToSend = payments.filter(
        (p) => p.payer_id === user?.id && p.status === 'pending'
    );
    const history = payments.filter(
        (p) => p.status === 'settled' || p.status === 'declined'
    );

    return (
        <div className="max-w-4xl mx-auto pb-12">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-primary mb-2">Payments & Wallet</h1>
                <p className="text-secondary">Manage your linked accounts and payment history across all groups.</p>
            </div>

            {/* Wallet Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">

                {/* Stripe Connect Section */}
                <div className="bg-surface border border-border rounded-3xl p-6 flex flex-col justify-between gap-6">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-[#635BFF]/10 rounded-xl flex items-center justify-center border border-[#635BFF]/30 shrink-0">
                            <CreditCard className="w-5 h-5 text-[#635BFF]" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-primary mb-1">Receive Payments</h3>
                            <p className="text-sm text-secondary">
                                {stripeStatus.onboarded
                                    ? 'Your Stripe account is connected. You can receive payouts from friends.'
                                    : 'Connect your bank with Stripe to receive instant payouts from friends.'}
                            </p>
                        </div>
                    </div>

                    {stripeStatus.onboarded ? (
                        <div className="space-y-3">
                            {/* Connected status badge */}
                            <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-emerald-500">Connected</p>
                                    {stripeStatus.email && (
                                        <p className="text-xs text-emerald-500/70 truncate">{stripeStatus.email}</p>
                                    )}
                                </div>
                                <ShieldCheck className="w-4 h-4 text-emerald-500/60 shrink-0" />
                            </div>

                            {/* Payouts status */}
                            <div className="flex items-center justify-between px-1">
                                <span className="text-xs text-secondary">Payouts</span>
                                <span className={`text-xs font-bold ${
                                    stripeStatus.payouts_enabled ? 'text-emerald-500' : 'text-amber-500'
                                }`}>
                                    {stripeStatus.payouts_enabled ? 'Enabled ✓' : 'Pending review'}
                                </span>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-1">
                                {stripeStatus.dashboard_url && (
                                    <a
                                        href={stripeStatus.dashboard_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-[#635BFF] border border-[#635BFF]/30 hover:bg-[#635BFF]/10 transition-colors"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        Stripe Dashboard
                                    </a>
                                )}
                                <button
                                    onClick={handleStripeOnboard}
                                    disabled={stripeLoading}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-secondary border border-border hover:bg-surface-hover hover:text-primary transition-colors disabled:opacity-50"
                                >
                                    <Unlink className="w-3.5 h-3.5" />
                                    Reconnect
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={handleStripeOnboard}
                            disabled={stripeLoading}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-[#635BFF] hover:bg-[#524BFF] text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-[#635BFF]/20 cursor-pointer disabled:opacity-50"
                        >
                            {stripeLoading ? 'Connecting...' : 'Connect Stripe'}
                            {!stripeLoading && <ExternalLink className="w-4 h-4" />}
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Action Required */}
                    {(pendingConfirmation.length > 0 || needToSend.length > 0) && (
                        <div>
                            <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-warning" />
                                Action Required
                            </h2>
                            <div className="space-y-3">
                                {(pendingConfirmation || []).map((p) => (
                                    <PaymentRecordCard
                                        key={p.id}
                                        record={p}
                                        currentUserId={user?.id || ''}
                                        groupId={p.group_id}
                                        onUpdated={loadAll}
                                    />
                                ))}
                                {(needToSend || []).map((p) => (
                                    <PaymentRecordCard
                                        key={p.id}
                                        record={p}
                                        currentUserId={user?.id || ''}
                                        groupId={p.group_id}
                                        onUpdated={loadAll}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Transaction History (Ledger) */}
                    <div>
                        <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                            <History className="w-5 h-5 text-secondary" />
                            Ledger History
                        </h2>
                        {(transactions || []).length === 0 ? (
                            <div className="bg-surface border border-border rounded-2xl p-10 text-center">
                                <History className="w-10 h-10 text-border mx-auto mb-3" />
                                <p className="text-secondary text-sm">No transactions yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {(transactions || []).map((t) => (
                                    <div key={t.id} className="flex items-center justify-between p-4 bg-surface border border-border rounded-2xl flex-wrap gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 shrink-0
                                                ${t.tx_type === 'deposit' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                                                    t.tx_type === 'withdrawal' ? 'bg-indigo/10 border-indigo/20 text-indigo' :
                                                        'bg-accent/10 border-accent/20 text-accent'}
                                            `}>
                                                {t.tx_type === 'deposit' ? <ArrowDownRight className="w-5 h-5" /> :
                                                    t.tx_type === 'withdrawal' ? <ArrowUpRight className="w-5 h-5" /> :
                                                        <ArrowRightLeft className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-primary capitalize">{t.tx_type}</p>
                                                <p className="text-xs text-secondary mt-0.5">
                                                    {new Date(t.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    {t.related_request_id && " • Payment Request"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-black text-lg ${t.tx_type === 'deposit' || t.tx_type === 'transfer_in' ? 'text-emerald-500' : 'text-primary'}`}>
                                                {t.tx_type === 'deposit' || t.tx_type === 'transfer_in' ? '+' : '-'}${formatCurrency(t?.amount)}
                                            </p>
                                            <span className={`text-[10px] font-bold uppercase tracking-widest mt-1 block
                                                ${t.status === 'completed' || t.status === 'settled' ? 'text-emerald-500/80' :
                                                    t.status === 'pending' ? 'text-warning/80' : 'text-danger/80'}
                                            `}>
                                                {t.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}


        </div>
    );
}
