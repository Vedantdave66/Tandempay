import { useState, useEffect, useCallback, useMemo } from 'react';
import LoadingScreen from '../components/LoadingScreen';
import { formatCurrency } from '../utils/currency';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Plus,
    CheckCircle2,
    Link as LinkIcon,
    Handshake,
    X as XIcon,
    Trash2,
    Loader2,
} from 'lucide-react';
import {
    groupsApi,
    expensesApi,
    balancesApi,
    settlementRecordsApi,
    meApi,
    Group,
    Expense,
    UserBalance,
    Settlement,
    SettlementRecord,
    Friend,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import AddExpenseModal from '../components/AddExpenseModal';
import SettleUpModal from '../components/SettleUpModal';
import PaymentRecordCard from '../components/PaymentRecordCard';
import RequestMoneyModal from '../components/RequestMoneyModal';
import StripePaymentModal from '../components/StripePaymentModal';
import StripeOnboardingModal from '../components/StripeOnboardingModal';
import { computeUserBalances, deriveSuggestedSettlements } from '../utils/balances';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import CharacterShape from '../components/CharacterShape';
import Avatar from '../components/Avatar';

// ── Blob helpers ──────────────────────────────────────────────────────────────

const BLOB_SHAPES = [
    '60% 40% 70% 30% / 50% 60% 40% 50%',
    '40% 60% 30% 70% / 60% 40% 50% 50%',
    '70% 30% 50% 50% / 40% 70% 30% 60%',
    '50% 50% 40% 60% / 70% 30% 60% 40%',
    '30% 70% 60% 40% / 50% 50% 40% 60%',
    '55% 45% 65% 35% / 45% 55% 35% 65%',
];

function hashId(id: string): number {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    return Math.abs(h);
}

function blobAnimStyle(id: string): React.CSSProperties {
    const h = hashId(id);
    const tx = ((h >> 4) % 31) - 15;
    const ty = ((h >> 8) % 31) - 15;
    const dur = 6 + ((h >> 12) % 7);
    const delay = -(((h >> 16) % (dur * 10)) / 10);
    return {
        borderRadius: BLOB_SHAPES[h % BLOB_SHAPES.length],
        ['--blob-tx' as string]: `${tx}px`,
        ['--blob-ty' as string]: `${ty}px`,
        animationName: 'blobDrift',
        animationDuration: `${dur}s`,
        animationDelay: `${delay}s`,
        animationDirection: 'alternate',
        animationIterationCount: 'infinite',
        animationTimingFunction: 'ease-in-out',
    };
}

// ── Drag state ────────────────────────────────────────────────────────────────

interface DragState {
    memberId: string;
    shape: string;
    color: string;
    startX: number;
    startY: number;
    x: number;
    y: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GroupPage() {
    const { groupId } = useParams<{ groupId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Data state
    const [group, setGroup] = useState<Group | null>(null);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [paymentRecords, setPaymentRecords] = useState<SettlementRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [apiBalances, setApiBalances] = useState<UserBalance[]>([]);
    const [copied, setCopied] = useState(false);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [friendsLoading, setFriendsLoading] = useState(false);

    // Modal / overlay state
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [expenseToEdit, setExpenseToEdit] = useState<Expense | undefined>(undefined);
    const [settleUpTarget, setSettleUpTarget] = useState<Settlement | null>(null);
    const [showRequestMoney, setShowRequestMoney] = useState(false);
    const [stripeStripeTarget, setStripePaymentTarget] = useState<{ payeeId: string; amount: number; settlementId?: string } | null>(null);
    const [showStripeOnboarding, setShowStripeOnboarding] = useState(false);
    const [hasDismissedOnboarding, setHasDismissedOnboarding] = useState(() => sessionStorage.getItem('dismissed_stripe_onboarding') === 'true');
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    // Onboarding overlays
    const [onboardingDismissed, setOnboardingDismissed] = useState(false);
    const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
    const [onboardingAdding, setOnboardingAdding] = useState(false);
    const [squadReadyDismissed, setSquadReadyDismissed] = useState(false);

    // Canvas-specific state
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
    const [drag, setDrag] = useState<DragState | null>(null);

    // Data loading
    useEffect(() => {
        if (groupId) loadAll();
    }, [groupId]);

    const loadAll = useCallback(async () => {
        if (!groupId) return;
        try {
            const [g, e, pr, bal] = await Promise.all([
                groupsApi.get(groupId),
                expensesApi.list(groupId),
                settlementRecordsApi.list(groupId),
                balancesApi.getBalances(groupId).catch(() => [] as UserBalance[]),
            ]);
            setGroup(g);
            setExpenses(e.items);
            setPaymentRecords(pr.items);
            setApiBalances(bal);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [groupId]);

    useAutoRefresh(loadAll, 30000, !!groupId && !loading);

    const handleExpenseCreatedOrUpdated = () => {
        setShowAddExpense(false);
        setExpenseToEdit(undefined);
        loadAll();
    };

    const handleDeleteGroup = async () => {
        if (!groupId || !group) return;
        if (!window.confirm(`Delete "${group.name}"? This cannot be undone.`)) return;
        setActionLoadingId(groupId);
        try {
            await groupsApi.deleteGroup(groupId);
            navigate('/dashboard');
        } catch (err: any) {
            alert(err.message || 'Failed to delete group.');
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleDeleteExpense = async (expense: Expense) => {
        if (!groupId || !window.confirm('Delete this expense?')) return;
        setActionLoadingId(expense.id);
        try {
            await expensesApi.delete(groupId, expense.id);
            setSelectedExpense(null);
            await loadAll();
        } catch (err: any) {
            alert(err.message || 'Failed to delete expense');
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleCopyLink = () => {
        if (!group) return;
        const url = `${window.location.origin}/invite/${group.id}?token=${group.invite_token}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const loadFriends = async () => {
        setFriendsLoading(true);
        try {
            const f = await meApi.getFriends();
            setFriends(f.items);
        } catch { /* silent */ }
        finally { setFriendsLoading(false); }
    };

    // Derived data
    const totalSpent = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const computedBalances = computeUserBalances(expenses, paymentRecords, group?.members || []);
    const effectiveSettlements = deriveSuggestedSettlements(computedBalances);
    const mySettlements = effectiveSettlements.filter(s => s.from_user_id === user?.id);

    const characterLookup = useMemo(() => new Map(
        apiBalances.map(b => [b.user_id, { shape: b.character_shape ?? 'rect', color: b.character_color ?? '#6B7280' }])
    ), [apiBalances]);

    // Onboarding conditions
    const showOnboarding = !onboardingDismissed && !loading && !!group && (group.members || []).length <= 1;
    const showSquadReady = !squadReadyDismissed && !loading && !showOnboarding && !!group
        && (group.members || []).length > 1 && expenses.length === 0;
    const memberIds = new Set((group?.members || []).map(m => m.user_id));
    const onboardingFriends = friends.filter(f => !memberIds.has(f.id));

    const toggleFriend = (id: string) => {
        setSelectedFriendIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleOnboardingAdd = async () => {
        if (!groupId || selectedFriendIds.size === 0) return;
        setOnboardingAdding(true);
        const toAdd = friends.filter(f => selectedFriendIds.has(f.id));
        try {
            await Promise.all(toAdd.map(f => groupsApi.addMember(groupId, f.email)));
            setSelectedFriendIds(new Set());
        } catch { /* partial adds OK */ }
        finally { setOnboardingAdding(false); await loadAll(); }
    };

    useEffect(() => {
        if (showOnboarding) loadFriends();
    }, [showOnboarding]);

    useEffect(() => {
        if (!user || user.stripe_account_id || loading || hasDismissedOnboarding || !group) return;
        if (effectiveSettlements.some(s => s.to_user_id === user.id)) setShowStripeOnboarding(true);
    }, [user, effectiveSettlements, loading, hasDismissedOnboarding, group]);

    const handleDismissOnboarding = () => {
        sessionStorage.setItem('dismissed_stripe_onboarding', 'true');
        setHasDismissedOnboarding(true);
        setShowStripeOnboarding(false);
    };

    // Unique payment records (de-duplicate pending)
    const uniquePaymentRecords = paymentRecords.filter((record, index, self) => {
        if (record.status === 'settled' || record.status === 'declined') return true;
        return index === self.findIndex(t =>
            t.payer_id === record.payer_id && t.payee_id === record.payee_id &&
            t.status === record.status && t.amount === record.amount
        );
    });

    // Drag from tray
    const handleMemberPointerDown = (e: React.PointerEvent, memberId: string, shape: string, color: string) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setDrag({ memberId, shape, color, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY });
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!drag) return;
        setDrag(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
    };

    const handlePointerUp = () => {
        if (!drag) return;
        const dy = drag.startY - drag.y;
        if (dy > 40) {
            setExpenseToEdit(undefined);
            setShowAddExpense(true);
        }
        setDrag(null);
    };

    if (loading) return <LoadingScreen />;
    if (!group) {
        return <div className="text-center py-20"><p className="text-secondary">Group not found</p></div>;
    }

    return (
        <>
            {/* ── Full-screen dark canvas ──────────────────────────────────── */}
            <div
                className="fixed top-[73px] md:top-0 left-0 md:left-64 right-0 bottom-0 z-10 flex flex-col"
                style={{ background: '#0d0d0f' }}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            >
                {/* TOP BAR */}
                <div
                    className="shrink-0 flex items-center justify-between px-5 py-4"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                >
                    {/* Left: back + group name + trash + total */}
                    <div className="flex items-center gap-2 min-w-0">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="shrink-0 p-1 rounded-lg transition-colors cursor-pointer"
                            style={{ color: 'rgba(255,255,255,0.35)' }}
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <h1 className="font-bold text-base truncate" style={{ color: 'rgba(255,255,255,0.9)' }}>
                            {group.name}
                        </h1>
                        <button
                            onClick={handleDeleteGroup}
                            disabled={actionLoadingId === groupId}
                            className="shrink-0 p-1 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                            style={{ color: 'rgba(255,255,255,0.25)' }}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <span
                            className="text-sm font-semibold shrink-0 hidden sm:inline"
                            style={{ color: 'rgba(255,255,255,0.3)' }}
                        >
                            ${formatCurrency(totalSpent)}
                        </span>
                    </div>

                    {/* Right: action buttons */}
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                        <button
                            onClick={() => { setExpenseToEdit(undefined); setShowAddExpense(true); }}
                            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Expense</span>
                        </button>
                        <button
                            onClick={() => {
                                if (user && !user.stripe_account_id) setShowStripeOnboarding(true);
                                else setShowRequestMoney(true);
                            }}
                            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-indigo text-white transition-opacity hover:opacity-80 cursor-pointer"
                        >
                            <Handshake className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Request</span>
                        </button>
                        <button
                            onClick={handleCopyLink}
                            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer"
                            style={{
                                background: copied ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.07)',
                                color: copied ? '#4ade80' : 'rgba(255,255,255,0.65)',
                            }}
                        >
                            {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <LinkIcon className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share Link'}</span>
                        </button>
                    </div>
                </div>

                {/* CANVAS AREA */}
                <div className="flex-1 overflow-auto relative">
                    {expenses.length === 0 ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <button
                                onClick={() => setShowAddExpense(true)}
                                className="flex items-center justify-center cursor-pointer animate-pulse"
                                style={{
                                    borderRadius: '60% 40% 70% 30% / 50% 60% 40% 50%',
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    width: 200,
                                    height: 150,
                                }}
                            >
                                <p className="text-xs font-semibold text-center px-6 leading-snug" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                    Add your first expense
                                </p>
                            </button>
                        </div>
                    ) : (
                        <div className="p-6 flex flex-wrap gap-6 content-start items-start">
                            {expenses.map(exp => {
                                const animStyle = blobAnimStyle(exp.id);
                                return (
                                    <button
                                        key={exp.id}
                                        onClick={() => setSelectedExpense(exp)}
                                        style={{
                                            ...animStyle,
                                            background: 'rgba(255,255,255,0.055)',
                                            border: '1px solid rgba(255,255,255,0.09)',
                                            width: 152,
                                            minHeight: 122,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '16px 12px',
                                            gap: 8,
                                            cursor: 'pointer',
                                            backdropFilter: 'blur(8px)',
                                            transition: 'transform 0.15s ease, background 0.15s ease',
                                        }}
                                        className="hover:scale-105 active:scale-95"
                                    >
                                        {/* Character cluster */}
                                        {exp.participants.length > 0 && (
                                            <div className="flex items-end gap-0.5">
                                                {exp.participants.slice(0, 3).map(p => {
                                                    const cd = characterLookup.get(p.user_id);
                                                    return (
                                                        <CharacterShape
                                                            key={p.user_id}
                                                            shape={cd?.shape ?? 'rect'}
                                                            color={cd?.color ?? '#6B7280'}
                                                            variant="cluster"
                                                        />
                                                    );
                                                })}
                                            </div>
                                        )}
                                        <p
                                            className="text-xs font-bold text-center leading-tight line-clamp-2"
                                            style={{ color: 'rgba(255,255,255,0.88)', maxWidth: 120 }}
                                        >
                                            {exp.title}
                                        </p>
                                        <p
                                            className="text-[11px] font-semibold"
                                            style={{ color: 'rgba(255,255,255,0.45)' }}
                                        >
                                            ${formatCurrency(exp.amount)}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* BOTTOM TRAY */}
                <div
                    className="shrink-0 flex items-end justify-center gap-5 px-5 pb-5 pt-3 overflow-x-auto"
                    style={{
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                        background: 'rgba(0,0,0,0.25)',
                    }}
                >
                    {(group.members || []).map(m => {
                        const cd = characterLookup.get(m.user_id) ?? { shape: 'rect', color: '#6B7280' };
                        return (
                            <div
                                key={m.user_id}
                                className="flex flex-col items-center gap-1 shrink-0 select-none cursor-grab active:cursor-grabbing"
                                style={{ touchAction: 'none' }}
                                onPointerDown={e => handleMemberPointerDown(e, m.user_id, cd.shape, cd.color)}
                            >
                                <CharacterShape shape={cd.shape} color={cd.color} variant="mini" />
                                <span
                                    className="text-[9px] font-semibold"
                                    style={{ color: 'rgba(255,255,255,0.35)' }}
                                >
                                    {m.name.split(' ')[0]}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Drag ghost blob ───────────────────────────────────────────── */}
            {drag && drag.startY - drag.y > 10 && (
                <div
                    style={{
                        position: 'fixed',
                        left: drag.x - 60,
                        top: drag.y - 70,
                        width: 120,
                        height: 100,
                        borderRadius: '60% 40% 70% 30% / 50% 60% 40% 50%',
                        background: 'rgba(255,255,255,0.09)',
                        border: '1px solid rgba(255,255,255,0.18)',
                        zIndex: 60,
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <CharacterShape shape={drag.shape} color={drag.color} variant="cluster" />
                </div>
            )}

            {/* ── Expense detail bottom sheet ───────────────────────────────── */}
            {selectedExpense && (
                <div
                    className="fixed inset-0 z-50 flex flex-col justify-end"
                    style={{ background: 'rgba(0,0,0,0.6)' }}
                    onClick={() => setSelectedExpense(null)}
                >
                    <div
                        className="rounded-t-3xl p-5 overflow-y-auto shadow-2xl"
                        style={{
                            background: '#111318',
                            borderTop: '1px solid rgba(255,255,255,0.07)',
                            maxHeight: '80dvh',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Handle */}
                        <div
                            className="w-10 h-1 rounded-full mx-auto mb-5"
                            style={{ background: 'rgba(255,255,255,0.2)' }}
                        />

                        {/* Header row */}
                        <div className="flex items-start justify-between mb-5">
                            <div>
                                <h2 className="text-lg font-bold" style={{ color: 'rgba(255,255,255,0.92)' }}>
                                    {selectedExpense.title}
                                </h2>
                                <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                    Paid by {selectedExpense.payer_name}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xl font-black" style={{ color: 'rgba(255,255,255,0.9)' }}>
                                    ${formatCurrency(selectedExpense.amount)}
                                </span>
                                <button
                                    onClick={() => setSelectedExpense(null)}
                                    className="cursor-pointer"
                                    style={{ color: 'rgba(255,255,255,0.3)' }}
                                >
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Split breakdown */}
                        <p
                            className="text-xs font-semibold uppercase tracking-wider mb-3"
                            style={{ color: 'rgba(255,255,255,0.3)' }}
                        >
                            Split
                        </p>
                        <div className="space-y-3 mb-5">
                            {selectedExpense.participants.map(p => {
                                const cd = characterLookup.get(p.user_id);
                                return (
                                    <div key={p.user_id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <CharacterShape
                                                shape={cd?.shape ?? 'rect'}
                                                color={cd?.color ?? '#6B7280'}
                                                variant="cluster"
                                            />
                                            <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>
                                                {p.name}
                                            </span>
                                        </div>
                                        <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                            ${formatCurrency(p.share_amount)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pay Balance section */}
                        {mySettlements.length > 0 && (
                            <>
                                <p
                                    className="text-xs font-semibold uppercase tracking-wider mb-3"
                                    style={{ color: 'rgba(255,255,255,0.3)' }}
                                >
                                    You Owe
                                </p>
                                <div className="space-y-2 mb-5">
                                    {mySettlements.map((s, i) => (
                                        <button
                                            key={i}
                                            onClick={() => { setSettleUpTarget(s); setSelectedExpense(null); }}
                                            className="w-full flex items-center justify-between rounded-2xl px-4 py-3 cursor-pointer transition-colors"
                                            style={{
                                                background: 'rgba(74,222,128,0.07)',
                                                border: '1px solid rgba(74,222,128,0.15)',
                                            }}
                                        >
                                            <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>
                                                {s.to_user_name}
                                            </span>
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                                                    ${formatCurrency(s.amount)}
                                                </span>
                                                <span className="text-xs font-bold bg-accent text-white px-3 py-1.5 rounded-xl">
                                                    Pay Balance
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Payments list */}
                        {uniquePaymentRecords.length > 0 && (
                            <>
                                <p
                                    className="text-xs font-semibold uppercase tracking-wider mb-3"
                                    style={{ color: 'rgba(255,255,255,0.3)' }}
                                >
                                    Payments
                                </p>
                                <div className="space-y-2 mb-5">
                                    {uniquePaymentRecords.map(record => (
                                        <PaymentRecordCard
                                            key={record.id}
                                            record={record}
                                            currentUserId={user?.id || ''}
                                            groupId={groupId || ''}
                                            onUpdated={loadAll}
                                            isProcessing={actionLoadingId === record.id}
                                        />
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Edit / delete actions */}
                        <div className="flex gap-3 pt-1">
                            <button
                                onClick={() => {
                                    setExpenseToEdit(selectedExpense);
                                    setSelectedExpense(null);
                                    setShowAddExpense(true);
                                }}
                                className="flex-1 py-2.5 text-sm font-semibold rounded-xl cursor-pointer transition-colors"
                                style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    color: 'rgba(255,255,255,0.65)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                }}
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => handleDeleteExpense(selectedExpense)}
                                disabled={actionLoadingId === selectedExpense.id}
                                className="flex-1 py-2.5 text-sm font-semibold rounded-xl cursor-pointer transition-colors disabled:opacity-50"
                                style={{
                                    background: 'rgba(239,68,68,0.08)',
                                    color: 'rgba(239,68,68,0.7)',
                                    border: '1px solid rgba(239,68,68,0.15)',
                                }}
                            >
                                {actionLoadingId === selectedExpense.id ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modals (unchanged) ───────────────────────────────────────── */}
            {showAddExpense && group && (
                <AddExpenseModal
                    groupId={group.id}
                    members={group.members}
                    expense={expenseToEdit}
                    onClose={() => { setShowAddExpense(false); setExpenseToEdit(undefined); }}
                    onCreated={handleExpenseCreatedOrUpdated}
                    onUpdated={handleExpenseCreatedOrUpdated}
                />
            )}

            {settleUpTarget && groupId && user && (
                <SettleUpModal
                    groupId={groupId}
                    settlement={settleUpTarget}
                    currentUserId={user.id}
                    onClose={() => setSettleUpTarget(null)}
                    onSettled={loadAll}
                />
            )}

            {showRequestMoney && groupId && user && group && (
                <RequestMoneyModal
                    groupId={groupId}
                    members={group.members}
                    currentUserId={user.id}
                    onClose={() => setShowRequestMoney(false)}
                    onSuccess={loadAll}
                />
            )}

            {stripeStripeTarget && (
                <StripePaymentModal
                    payeeId={stripeStripeTarget.payeeId}
                    amount={stripeStripeTarget.amount}
                    settlementId={stripeStripeTarget.settlementId}
                    onClose={() => setStripePaymentTarget(null)}
                    onSuccess={() => { loadAll(); setStripePaymentTarget(null); }}
                />
            )}

            {showStripeOnboarding && groupId && (
                <StripeOnboardingModal
                    onClose={handleDismissOnboarding}
                    returnPath={`/group/${groupId}`}
                />
            )}

            {/* ── Squad-ready overlay ───────────────────────────────────────── */}
            {showSquadReady && group && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-surface rounded-3xl shadow-2xl overflow-hidden border border-border/60">
                        <div className="px-6 pt-8 pb-6 flex flex-col items-center text-center">
                            {apiBalances.length > 0 && (
                                <div className="flex items-end justify-center gap-2 mb-6">
                                    {apiBalances.slice(0, 3).map(b => (
                                        <CharacterShape
                                            key={b.user_id}
                                            shape={b.character_shape ?? 'rect'}
                                            color={b.character_color ?? '#6B7280'}
                                            variant="cluster"
                                        />
                                    ))}
                                </div>
                            )}
                            <h2 className="text-2xl font-black text-primary mb-2">Your squad's ready 🎉</h2>
                            <p className="text-sm text-secondary mb-8">Start tracking expenses or request money from your group.</p>
                            <div className="w-full space-y-3">
                                <button
                                    onClick={() => { setSquadReadyDismissed(true); setExpenseToEdit(undefined); setShowAddExpense(true); }}
                                    className="w-full h-12 rounded-2xl bg-gradient-to-r from-accent to-emerald-500 hover:from-accent hover:to-emerald-600 text-white font-bold text-sm transition-all shadow-lg shadow-accent/20 flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add an expense
                                </button>
                                <button
                                    onClick={() => {
                                        setSquadReadyDismissed(true);
                                        if (user && !user.stripe_account_id) setShowStripeOnboarding(true);
                                        else setShowRequestMoney(true);
                                    }}
                                    className="w-full h-12 rounded-2xl bg-surface-light hover:bg-border border border-border text-primary font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <Handshake className="w-4 h-4" />
                                    Request money
                                </button>
                                <button
                                    onClick={() => setSquadReadyDismissed(true)}
                                    className="w-full text-xs text-secondary/60 hover:text-secondary transition-colors py-1 cursor-pointer"
                                >
                                    I'll do this later
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── New-group onboarding overlay ─────────────────────────────── */}
            {showOnboarding && group && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-surface rounded-3xl shadow-2xl overflow-hidden border border-border/60">
                        <div className="px-6 pt-6 pb-4 border-b border-border/40">
                            <div className="flex items-start justify-between mb-1">
                                <p className="text-xs font-semibold text-accent uppercase tracking-wider truncate pr-4">
                                    {group.name}
                                </p>
                                <button
                                    onClick={() => setOnboardingDismissed(true)}
                                    className="p-1 rounded-lg text-secondary hover:text-primary transition-colors cursor-pointer shrink-0"
                                >
                                    <XIcon className="w-4 h-4" />
                                </button>
                            </div>
                            <h2 className="text-xl font-black text-primary">Who's splitting with you?</h2>
                        </div>

                        <div className="px-6 py-4 max-h-72 overflow-y-auto space-y-2">
                            {friendsLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-5 h-5 text-accent animate-spin" />
                                </div>
                            ) : onboardingFriends.length === 0 ? (
                                <p className="text-sm text-secondary text-center py-6">
                                    No friends yet — invite someone below.
                                </p>
                            ) : (
                                onboardingFriends.map(f => {
                                    const selected = selectedFriendIds.has(f.id);
                                    return (
                                        <button
                                            key={f.id}
                                            onClick={() => toggleFriend(f.id)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-150 cursor-pointer text-left ${
                                                selected
                                                    ? 'border-accent bg-accent/5'
                                                    : 'border-border/60 bg-bg hover:border-border hover:bg-surface-light'
                                            }`}
                                        >
                                            <Avatar name={f.name} color={f.avatar_color} size="md" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-primary truncate">{f.name}</p>
                                                <p className="text-xs text-secondary truncate">{f.email}</p>
                                            </div>
                                            {selected && <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />}
                                        </button>
                                    );
                                })
                            )}

                            <button
                                onClick={() => { setOnboardingDismissed(true); handleCopyLink(); }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-dashed border-border/60 hover:border-accent/40 hover:bg-surface-light transition-all duration-150 cursor-pointer"
                            >
                                <div className="w-9 h-9 rounded-full border-2 border-dashed border-border/60 flex items-center justify-center shrink-0">
                                    <LinkIcon className="w-4 h-4 text-secondary" />
                                </div>
                                <span className="text-sm font-medium text-secondary">Share invite link</span>
                            </button>
                        </div>

                        <div className="px-6 pb-6 pt-2">
                            <button
                                onClick={handleOnboardingAdd}
                                disabled={selectedFriendIds.size === 0 || onboardingAdding}
                                className="w-full h-12 rounded-2xl bg-gradient-to-r from-accent to-emerald-500 hover:from-accent hover:to-emerald-600 text-white font-bold text-sm transition-all shadow-lg shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {onboardingAdding
                                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</>
                                    : <>Add to group{selectedFriendIds.size > 0 ? ` (${selectedFriendIds.size})` : ''}</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
