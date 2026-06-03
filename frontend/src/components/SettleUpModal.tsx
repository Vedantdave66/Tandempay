import { useState } from 'react';
import { formatCurrency } from '../utils/currency';
import { X, Send, CreditCard, Copy, CheckCircle2, ArrowRight, Loader2, AlertCircle, Building2 } from 'lucide-react';
import { Settlement, settlementRecordsApi } from '../services/api';
import Avatar from './Avatar';
import CharacterShape from './CharacterShape';
import StripePaymentModal from './StripePaymentModal';

interface SettleUpModalProps {
    groupId: string;
    groupName?: string;
    settlement: Settlement;
    currentUserId: string;
    onClose: () => void;
    onSettled: () => void;
}

type Step = 'method' | 'etransfer' | 'sent_confirmation';

export default function SettleUpModal({ groupId, groupName, settlement, currentUserId, onClose, onSettled }: SettleUpModalProps) {
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
    const hasInteracEmail = isPayer ? !!settlement.to_interac_email : true;

    const characterShape = settlement.to_character_shape ?? 'rect';
    const characterColor = settlement.to_character_color ?? recipientColor;
    const characterNickname = settlement.to_character_nickname ?? null;

    const stripeFee = (settlement.amount * 0.029 + 0.30).toFixed(2);

    const handleCopyEmail = () => {
        navigator.clipboard.writeText(recipientEmail);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Returns the ID of the existing pending record for this payer→payee pair, or null.
    const findExistingPending = async (): Promise<string | null> => {
        const records = await settlementRecordsApi.list(groupId);
        const found = records.items.find(r =>
            r.payer_id === currentUserId &&
            r.payee_id === settlement.to_user_id &&
            r.status === 'pending'
        );
        return found?.id ?? null;
    };

    // Create a settlement record, reusing an existing pending one on 409.
    const createOrReuse = async (method: string): Promise<string> => {
        try {
            const record = await settlementRecordsApi.create(groupId, {
                payee_id: settlement.to_user_id,
                amount: Math.round(settlement.amount * 100) / 100,
                method,
            });
            return record.id;
        } catch (err: any) {
            if (err.message?.includes('already exists')) {
                const existingId = await findExistingPending();
                if (existingId) return existingId;
            }
            throw err;
        }
    };

    const handleSelectEtransfer = () => {
        setError('');
        setStep('etransfer');
    };

    const handleSelectStripe = async () => {
        setLoading(true);
        setError('');
        try {
            const recordId = await createOrReuse('in_app');
            setActiveRecordId(recordId);
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
        setError('');
        try {
            const recordId = await createOrReuse('etransfer');
            await settlementRecordsApi.updateStatus(groupId, recordId, 'sent');
            setStep('sent_confirmation');
        } catch (err: any) {
            setError(err.message || 'Failed to mark as sent');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

            <div className="relative bg-surface border border-border rounded-3xl w-full max-w-xl shadow-[0_25px_60px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col md:flex-row">

                {/* ── CLOSE ── */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 w-9 h-9 rounded-xl bg-surface-light border border-border flex items-center justify-center hover:bg-border transition-colors cursor-pointer"
                    aria-label="Close"
                >
                    <X className="w-4 h-4 text-secondary" />
                </button>

                {/* ── LEFT PANE ── */}
                <div
                    className="bg-surface-light border-b border-border md:border-b-0 md:border-r md:w-56 md:shrink-0 flex flex-col items-center justify-center gap-4 px-8 py-8 md:py-12"
                    style={{ backgroundImage: 'radial-gradient(120% 80% at 50% 0%, rgba(74,222,128,0.18), transparent 62%)' }}
                >
                    {characterNickname && (
                        <div className="bg-surface border border-border rounded-full px-3 py-1 text-xs font-semibold text-secondary">
                            {characterNickname}
                        </div>
                    )}

                    <CharacterShape shape={characterShape} color={characterColor} variant="hero" />

                    <div className="text-center space-y-2">
                        <p className="text-sm text-secondary">
                            You owe {characterNickname ?? recipientName}
                        </p>
                        <p className="text-4xl font-black text-gold leading-none">
                            ${formatCurrency(settlement.amount)}
                        </p>
                    </div>

                    {groupName && (
                        <div className="bg-surface border border-border rounded-full px-3 py-1.5 text-xs text-secondary font-medium max-w-[180px] truncate">
                            {groupName}
                        </div>
                    )}
                </div>

                {/* ── RIGHT PANE ── */}
                <div className="flex-1 p-6 flex flex-col justify-center min-w-0">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl p-3 mb-4">
                            {error}
                        </div>
                    )}

                    {/* ── METHOD ── */}
                    {step === 'method' && (
                        <div className="space-y-4">
                            {/* Interac — hero */}
                            <div className="rounded-2xl bg-gradient-to-br from-accent/10 to-accent/5 border-2 border-accent/40 p-5 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                                        <Building2 className="w-5 h-5 text-accent" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-bold text-primary">Interac e-Transfer</p>
                                            <span className="bg-accent text-[#064E3B] rounded-full px-3 py-1 text-xs font-black shrink-0">FREE</span>
                                        </div>
                                        <p className="text-xs text-accent font-medium">Free · Arrives in ~30 seconds</p>
                                    </div>
                                </div>
                                <p className="text-xs text-secondary leading-snug">
                                    We'll auto-confirm once your bank sends you a confirmation email.
                                </p>
                                <button
                                    onClick={handleSelectEtransfer}
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-accent to-emerald-500 text-[#064E3B] font-bold py-3.5 rounded-xl transition-all duration-200 disabled:opacity-50 cursor-pointer"
                                >
                                    Send via Interac
                                </button>
                            </div>

                            {/* OR divider */}
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-px bg-border" />
                                <span className="text-xs text-secondary">OR</span>
                                <div className="flex-1 h-px bg-border" />
                            </div>

                            {/* Card — secondary */}
                            <button
                                onClick={handleSelectStripe}
                                disabled={loading}
                                className="w-full text-left px-4 py-3.5 rounded-xl bg-surface-light border border-border hover:border-border/60 transition-all duration-200 cursor-pointer flex items-center gap-3 disabled:opacity-50"
                            >
                                <CreditCard className="w-4 h-4 text-secondary shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-secondary">Pay with card instead</p>
                                    <p className="text-[11px] text-secondary/60">
                                        ${stripeFee} fee · you'll pay ${(settlement.amount + Number(stripeFee)).toFixed(2)}
                                    </p>
                                </div>
                                {loading
                                    ? <Loader2 className="w-4 h-4 text-secondary animate-spin shrink-0" />
                                    : <ArrowRight className="w-4 h-4 text-secondary/40 shrink-0" />
                                }
                            </button>
                        </div>
                    )}

                    {/* ── E-TRANSFER ── */}
                    {step === 'etransfer' && (
                        <div className="space-y-4">
                            {/* Recipient header */}
                            <div className="flex items-center gap-3">
                                <Avatar name={recipientName} color={recipientColor} size="sm" />
                                <div>
                                    <p className="text-sm font-bold text-primary">{recipientName}</p>
                                    <p className="text-xs text-secondary/60">Recipient</p>
                                </div>
                            </div>

                            {/* Interac email warning */}
                            {!hasInteracEmail && (
                                <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3">
                                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-300 leading-snug">
                                        <span className="font-semibold">{recipientName}</span> hasn't added their Interac email yet.
                                        Ask them to add it in their profile, or send to their account email instead.
                                    </p>
                                </div>
                            )}

                            {/* Copyable email */}
                            <div className="flex items-center justify-between bg-bg border border-border rounded-xl px-4 py-3">
                                <div className="min-w-0 mr-3">
                                    <p className="text-[10px] text-secondary uppercase tracking-widest mb-0.5">
                                        {hasInteracEmail ? 'Interac Email' : 'Account Email'}
                                    </p>
                                    <p className="text-sm font-bold text-primary truncate">{recipientEmail}</p>
                                </div>
                                <button
                                    onClick={handleCopyEmail}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border transition-all cursor-pointer shrink-0"
                                >
                                    {copied
                                        ? <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                                        : <Copy className="w-3.5 h-3.5 text-secondary" />
                                    }
                                    <span className="text-xs text-secondary font-medium">{copied ? 'Copied' : 'Copy'}</span>
                                </button>
                            </div>

                            {/* Amount */}
                            <div className="bg-bg border border-border rounded-xl px-4 py-3">
                                <p className="text-[10px] text-secondary uppercase tracking-widest mb-0.5">Amount</p>
                                <p className="text-lg font-black text-accent">${formatCurrency(settlement.amount)}</p>
                            </div>

                            {/* Mark sent */}
                            <button
                                onClick={handleMarkSent}
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-accent to-emerald-500 text-[#064E3B] font-bold py-3.5 rounded-xl transition-all duration-200 disabled:opacity-50 cursor-pointer shadow-lg shadow-accent/20"
                            >
                                {loading
                                    ? <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                    : "I sent it on my banking app"
                                }
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
                                <h3 className="text-xl font-black text-primary mb-2">Payment marked as sent</h3>
                                <p className="text-sm text-secondary">
                                    We'll auto-confirm once your bank sends you a confirmation email.
                                </p>
                            </div>
                            <button
                                onClick={() => { onSettled(); onClose(); }}
                                className="w-full bg-gradient-to-r from-accent to-emerald-500 text-[#064E3B] font-bold py-3.5 rounded-xl transition-all duration-200 cursor-pointer shadow-lg shadow-accent/20"
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
