import { useState, useEffect } from 'react';
import { CreditCard, History, Wallet, CheckCircle2, AlertCircle } from 'lucide-react';
import { meApi, SettlementRecord, settlementRecordsApi } from '../services/api';
import PaymentRecordCard from '../components/PaymentRecordCard';
import { useAuth } from '../context/AuthContext';

export default function PaymentsPage() {
    const { user } = useAuth();
    const [payments, setPayments] = useState<SettlementRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPayments();
    }, []);

    const loadPayments = async () => {
        setLoading(true);
        try {
            const data = await meApi.getPayments();
            setPayments(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
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
                <div className="bg-gradient-to-br from-indigo/20 to-surface-light border border-indigo/20 rounded-3xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo/10 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2" />
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="w-10 h-10 bg-indigo/20 rounded-xl flex items-center justify-center border border-indigo/30">
                            <Wallet className="w-5 h-5 text-indigo" />
                        </div>
                        <h3 className="text-lg font-bold text-white">SplitEase Balance</h3>
                    </div>
                    <div className="relative z-10">
                        <p className="text-sm font-medium text-white/60 mb-1">Available Funds</p>
                        <p className="text-4xl font-black text-white tracking-tight mb-6">$0.00</p>
                        <div className="flex gap-3">
                            <button className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm border border-white/5 cursor-not-allowed opacity-50">
                                Add Funds
                            </button>
                            <button className="flex-1 bg-indigo hover:bg-indigo-hover text-white font-semibold py-2.5 rounded-xl transition-colors text-sm shadow-lg shadow-indigo/20 cursor-not-allowed opacity-50">
                                Withdraw
                            </button>
                        </div>
                        <p className="text-xs text-white/40 mt-3 text-center">Wallet features coming soon (Phase 3)</p>
                    </div>
                </div>

                <div className="bg-surface-light border border-border rounded-3xl p-6 flex flex-col justify-center items-center text-center">
                    <div className="w-16 h-16 bg-bg border border-border/50 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
                        <CreditCard className="w-8 h-8 text-secondary" />
                    </div>
                    <h3 className="text-lg font-bold text-primary mb-2">Linked Accounts</h3>
                    <p className="text-sm text-secondary mb-6 max-w-[250px]">
                        Link a debit card or bank account for faster in-app payments.
                    </p>
                    <button className="px-6 py-2.5 bg-bg hover:bg-surface border border-border hover:border-accent/40 rounded-xl text-sm font-semibold text-primary transition-all shadow-sm cursor-not-allowed opacity-50">
                        Link Account (Soon)
                    </button>
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
                                {pendingConfirmation.map((p) => (
                                    <PaymentRecordCard
                                        key={p.id}
                                        record={p}
                                        currentUserId={user?.id || ''}
                                        groupId={p.group_id}
                                        onUpdated={loadPayments}
                                    />
                                ))}
                                {needToSend.map((p) => (
                                    <PaymentRecordCard
                                        key={p.id}
                                        record={p}
                                        currentUserId={user?.id || ''}
                                        groupId={p.group_id}
                                        onUpdated={loadPayments}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* History */}
                    <div>
                        <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                            <History className="w-5 h-5 text-secondary" />
                            Payment History
                        </h2>
                        {history.length === 0 ? (
                            <div className="bg-surface border border-border rounded-2xl p-10 text-center">
                                <History className="w-10 h-10 text-border mx-auto mb-3" />
                                <p className="text-secondary text-sm">No completed or declined payments yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {history.map((p) => (
                                    <PaymentRecordCard
                                        key={p.id}
                                        record={p}
                                        currentUserId={user?.id || ''}
                                        groupId={p.group_id}
                                        onUpdated={loadPayments}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
