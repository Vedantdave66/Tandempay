import { useState } from 'react';
import { formatCurrency } from '../utils/currency';
import { X, Send, CreditCard, Copy, CheckCircle2, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { Settlement, settlementRecordsApi } from '../services/api';
import Avatar from './Avatar';
import StripePaymentModal from './StripePaymentModal';

interface SettleUpModalProps {
    groupId: string;
    settlement: Settlement;
    currentUserId: string;
    onClose: () => void;
    onSettled: () => void;
}

type Step = 'method' | 'etransfer' | 'sent_confirmation';

export default function SettleUpModal({ groupId, settlement, currentUserId, onClose, onSettled }: SettleUpModalProps) {
    const [step, setStep] = useState<Step>('method');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');
    const [showStripeModal, setShowStripeModal] = useState(false);
    const [activeRecordId, setActiveRecordId] = useState<string | undefined>(undefined);

    const isPayer = settlement.from_user_id === currentUserId;
    const recipientName = isPayer ? settlement.to_user_name : settlement.from_user_name;
    const recipientEmail = isPayer ? settlement.to_user_email : settlement.from_user_email;
    const recipientColor = isPayer ? settlement.to_avatar_color : settlement.from_avatar_color;

    const stripeFee = (settlement.amount * 0.029 + 0.30).toFixed(2);

    const handleCopyEmail = () => {
        navigator.clipboard.writeText(recipientEmail);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSelectEtransfer = async () => {
        setLoading(true);
        setError('');
        try {
            await settlementRecordsApi.create(groupId, {
                payee_id: settlement.to_user_id,
                amount: settlement.amount,
                method: 'etransfer',
            });
            setStep('etransfer');
        } catch (err: any) {
            setError(err.message || 'Failed to initiate settlement');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectStripe = async () => {
        setLoading(true);
        setError('');
        try {
            const record = await settlementRecordsApi.create(groupId, {
                payee_id: settlement.to_user_id,
                amount: settlement.amount,
                method: 'stripe',
            });
            setActiveRecordId(record.id);
            setShowStripeModal(true);
        } catch (err: any) {
            let msg = err.message || 'Failed to initiate settlement';
            if (msg.includes('Recipient must connect')) {
                msg = "This user hasn't set up payouts yet.";
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkSent = async () => {
        setLoading(true);
        try {
            const records = await settlementRecordsApi.list(groupId);
            const latest = records.find(r =>
                r.payer_id === settlement.from_user_id &&
                r.payee_id === settlement.to_user_id &&
                r.status === 'pending'
            );
            if (latest) {
                await settlementRecordsApi.updateStatus(groupId, latest.id, 'sent');
            }
            setStep('sent_confirmation');
        } catch (err: any) {
            setError(err.message || 'Failed to mark as sent');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

            <div className="relative bg-surface border border-border rounded-3xl w-full max-w-md mx-4 shadow-[0_25px_60px_rgba(0,0,0,0.6)] overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-40 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

                {/* ── HEADER ── */}
                <div className="relative flex items-center justify-between p-6 pb-4">
                    <div className="flex items-center gap-3">
                        <Avatar name={recipientName} color={recipientColor} size="sm" />
                        <div>
                            <p className="text-xs text-secondary">Settling with</p>
                            <p className="text-sm font-bold text-primary">{recipientName}</p>
                        </div>
                        <p className="text-2xl font-black text-primary ml-2">
                            ${formatCurrency(settlement?.amount)}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-xl bg-surface-light border border-border flex items-center justify-center hover:bg-border transition-colors cursor-pointer"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4 text-secondary" />
                    </button>
                </div>

                <div className="relative px-6 pb-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl p-3 mb-4">
                            {error}
                        </div>
                    )}

                    {/* ── METHOD SELECTION ── */}
                    {step === 'method' && (
                        <div className="space-y-3">
                            {/* PRIMARY — Interac */}
                            <button
                                onClick={handleSelectEtransfer}
                                disabled={loading}
                                className="w-full text-left p-5 rounded-2xl bg-gradient-to-br from-accent/10 to-accent/5 border-2 border-accent/40 hover:border-accent/70 transition-all duration-300 cursor-pointer group disabled:opacity-50"
                            >
                                <div className="flex items-start justify-between mb-1">
                                    <p className="text-sm font-bold text-primary">Send via Interac e-Transfer</p>
                                    {loading
                                        ? <Loader2 className="w-4 h-4 text-accent animate-spin mt-0.5" />
                                        : <ArrowRight className="w-4 h-4 text-accent/50 group-hover:text-accent transition-colors mt-0.5" />
                                    }
                                </div>
                                <p className="text-xs text-accent font-medium mb-3">Free&nbsp; • &nbsp;Arrives in ~30 seconds</p>
                                <div className="flex items-start gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-secondary shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-secondary leading-snug">
                                        We'll auto-confirm this payment when your bank sends the receipt email — no need to come back here.
                                    </p>
                                </div>
                            </button>

                            {/* SECONDARY — Card */}
                            <button
                                onClick={handleSelectStripe}
                                disabled={loading}
                                className="w-full text-left px-4 py-3 rounded-xl bg-surface-light border border-border hover:border-border/60 transition-all duration-200 cursor-pointer group disabled:opacity-50 flex items-center gap-3"
                            >
                                <CreditCard className="w-4 h-4 text-secondary shrink-0" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-secondary group-hover:text-primary transition-colors">Pay with card instead</p>
                                    <p className="text-[11px] text-secondary/60">${stripeFee} fee&nbsp; • &nbsp;Arrives in 2 business days</p>
                                </div>
                                <ArrowRight className="w-3.5 h-3.5 text-secondary/30 group-hover:text-secondary transition-colors" />
                            </button>

                            {/* FOOTER disclaimer */}
                            <p className="text-[11px] text-secondary/50 text-center pt-1 leading-snug">
                                {recipientName} receives the full ${formatCurrency(settlement?.amount)} via Interac.
                                Card payments include the processor fee.
                            </p>
                        </div>
                    )}

                    {/* ── E-TRANSFER DETAIL ── */}
                    {step === 'etransfer' && (
                        <div className="space-y-5">
                            <div className="bg-surface-light border border-border rounded-2xl p-5">
                                <div className="flex items-center gap-4 mb-5">
                                    <Avatar name={recipientName} color={recipientColor} size="md" />
                                    <div>
                                        <p className="text-sm font-bold text-primary">{recipientName}</p>
                                        <p className="text-xs text-secondary/60">Recipient</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between bg-bg rounded-xl px-4 py-3 border border-border">
                                        <div>
                                            <p className="text-[10px] text-secondary uppercase tracking-widest mb-0.5">Email</p>
                                            <p className="text-sm font-bold text-primary">{recipientEmail}</p>
                                        </div>
                                        <button
                                            onClick={handleCopyEmail}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border transition-all cursor-pointer"
                                        >
                                            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5 text-secondary" />}
                                            <span className="text-xs text-secondary font-medium">{copied ? 'Copied' : 'Copy'}</span>
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between bg-bg rounded-xl px-4 py-3 border border-border">
                                        <div>
                                            <p className="text-[10px] text-secondary uppercase tracking-widest mb-0.5">Amount</p>
                                            <p className="text-lg font-black text-accent">${formatCurrency(settlement?.amount)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleMarkSent}
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-accent to-emerald-500 hover:from-accent-hover hover:to-emerald-600 text-[#064E3B] font-bold py-3.5 rounded-xl transition-all duration-300 disabled:opacity-50 cursor-pointer shadow-lg shadow-accent/20"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "I sent it on my banking app"}
                            </button>
                        </div>
                    )}

                    {/* ── SENT CONFIRMATION ── */}
                    {step === 'sent_confirmation' && (
                        <div className="py-8 text-center space-y-5">
                            <div className="w-20 h-20 rounded-full bg-accent/10 border-2 border-accent/30 flex items-center justify-center mx-auto">
                                <Send className="w-9 h-9 text-accent" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-primary mb-1">Payment marked as sent</h3>
                                <p className="text-sm text-secondary">
                                    We'll auto-confirm once your bank email arrives. No action needed.
                                </p>
                            </div>
                            <button
                                onClick={() => { onSettled(); onClose(); }}
                                className="w-full bg-accent hover:bg-accent-hover text-white font-bold py-3.5 rounded-xl transition-all duration-300 cursor-pointer shadow-lg shadow-accent/20 border-none"
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {showStripeModal && activeRecordId && (
                <StripePaymentModal
                    payeeId={settlement.to_user_id}
                    amount={settlement.amount}
                    settlementId={activeRecordId}
                    onClose={() => setShowStripeModal(false)}
                    onSuccess={() => {
                        setShowStripeModal(false);
                        onSettled();
                        onClose();
                    }}
                />
            )}
        </div>
    );
}
