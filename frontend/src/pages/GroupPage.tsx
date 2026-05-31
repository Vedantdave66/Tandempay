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
    Bell,
    CreditCard,
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
import ExpenseCard from '../components/ExpenseCard';

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

type ActiveTab = 'expenses' | 'balances' | 'settleup';

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

    // Tab / canvas view state
    const [activeTab, setActiveTab] = useState<ActiveTab>('expenses');
    const [showCanvas, setShowCanvas] = useState(false);
    const [reminderToast, setReminderToast] = useState(false);

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

    const handleRemoveMember = async (memberId: string, memberName: string) => {
        if (!groupId || !group) return;
        const isSelf = memberId === user?.id;
        const isCreatorLeaving = isSelf && user?.id === group.created_by;
        const otherMembers = (group.members || []).filter(m => m.user_id !== memberId);
        const message = isCreatorLeaving
            ? `You're the creator. Removing yourself will ${otherMembers.length > 0 ? 'transfer ownership to another member' : 'delete the group as you\'re the last member'}. Are you sure?`
            : `Remove ${memberName} from this group?`;
        if (!window.confirm(message)) return;
        setActionLoadingId(memberId);
        try {
            await groupsApi.removeMember(groupId, memberId);
            if (isCreatorLeaving) navigate('/dashboard');
            else await loadAll();
        } catch (err: any) {
            alert(err.message || 'Failed to remove member.');
        } finally {
            setActionLoadingId(null);
        }
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

    // My balance for header indicator
    const myComputedBalance = computedBalances.find(b => b.user_id === user?.id);
    const myNet = myComputedBalance?.net_balance ?? 0;

    // Max absolute balance for bar scaling in Balances tab
    const maxAbsBalance = Math.max(...computedBalances.map(b => Math.abs(b.net_balance)), 0.01);

    // Settled payment records for "Confirmed payments" section
    const uniquePaymentRecords = paymentRecords.filter((record, index, self) => {
        if (record.status === 'settled' || record.status === 'declined') return true;
        return index === self.findIndex(t =>
            t.payer_id === record.payer_id && t.payee_id === record.payee_id &&
            t.status === record.status && t.amount === record.amount
        );
    });
    const settledRecords = uniquePaymentRecords.filter(r => r.status === 'settled' || r.status === 'succeeded');

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

    const handleRemind = () => {
        setReminderToast(true);
        setTimeout(() => setReminderToast(false), 3000);
    };

    // Canvas drag handlers
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

    // ── Shared modals rendered in both canvas and tab views ───────────────────
    const sharedModals = (
        <>
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

            {/* Squad-ready overlay */}
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

            {/* New-group onboarding overlay */}
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

    // ── Canvas full-screen takeover ────────────────────────────────────────────
    if (showCanvas) {
        return (
            <>
                <div
                    className="fixed inset-0 z-[100] flex flex-col"
                    style={{ background: '#0d0d0f' }}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                >
                    {/* Top bar */}
                    <div
                        className="shrink-0 flex items-center justify-between px-5 py-4"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <button
                                onClick={() => setShowCanvas(false)}
                                className="shrink-0 p-1 rounded-lg transition-colors cursor-pointer"
                                style={{ color: 'rgba(255,255,255,0.35)' }}
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                            <h1 className="font-bold text-base truncate" style={{ color: 'rgba(255,255,255,0.9)' }}>
                                {group.name}
                            </h1>
                            <span
                                className="text-sm font-semibold shrink-0 hidden sm:inline"
                                style={{ color: 'rgba(255,255,255,0.3)' }}
                            >
                                ${formatCurrency(totalSpent)}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                            <button
                                onClick={() => { setExpenseToEdit(undefined); setShowAddExpense(true); }}
                                className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Expense</span>
                            </button>
                        </div>
                    </div>

                    {/* Canvas area */}
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

                    {/* Bottom member tray */}
                    <div
                        className="shrink-0 flex items-end justify-center gap-5 px-5 pb-5 pt-3 overflow-x-auto"
                        style={{
                            borderTop: '1px solid rgba(255,255,255,0.06)',
                            background: 'rgba(0,0,0,0.25)',
                        }}
                    >
                        {(group.members || []).map(m => {
                            const cd = characterLookup.get(m.user_id) ?? { shape: 'rect', color: '#6B7280' };
                            const canRemove = user?.id === group.created_by || m.user_id === user?.id;
                            return (
                                <div key={m.user_id} className="flex flex-col items-center gap-1 shrink-0 select-none">
                                    <div
                                        className="cursor-grab active:cursor-grabbing"
                                        style={{ touchAction: 'none' }}
                                        onPointerDown={e => handleMemberPointerDown(e, m.user_id, cd.shape, cd.color)}
                                    >
                                        <CharacterShape shape={cd.shape} color={cd.color} variant="mini" />
                                    </div>
                                    <span
                                        className="text-[9px] font-semibold"
                                        style={{ color: 'rgba(255,255,255,0.35)' }}
                                    >
                                        {m.name.split(' ')[0]}
                                    </span>
                                    {canRemove && (
                                        <button
                                            onClick={() => handleRemoveMember(m.user_id, m.name)}
                                            disabled={actionLoadingId === m.user_id}
                                            className="text-[8px] font-bold cursor-pointer leading-none disabled:opacity-30 transition-opacity hover:opacity-100"
                                            style={{ color: 'rgba(239,68,68,0.5)' }}
                                        >
                                            {actionLoadingId === m.user_id ? '…' : '×'}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Drag ghost blob */}
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
                            zIndex: 110,
                            pointerEvents: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <CharacterShape shape={drag.shape} color={drag.color} variant="cluster" />
                    </div>
                )}

                {/* Expense detail bottom sheet */}
                {selectedExpense && (
                    <div
                        className="fixed inset-0 z-[110] flex flex-col justify-end"
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
                            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: 'rgba(255,255,255,0.2)' }} />
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

                            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                Split
                            </p>
                            <div className="space-y-3 mb-5">
                                {selectedExpense.participants.map(p => {
                                    const cd = characterLookup.get(p.user_id);
                                    return (
                                        <div key={p.user_id} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <CharacterShape shape={cd?.shape ?? 'rect'} color={cd?.color ?? '#6B7280'} variant="cluster" />
                                                <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>{p.name}</span>
                                            </div>
                                            <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                                ${formatCurrency(p.share_amount)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            {mySettlements.length > 0 && (
                                <>
                                    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                        You Owe
                                    </p>
                                    <div className="space-y-2 mb-5">
                                        {mySettlements.map((s, i) => (
                                            <button
                                                key={i}
                                                onClick={() => { setSettleUpTarget(s); setSelectedExpense(null); }}
                                                className="w-full flex items-center justify-between rounded-2xl px-4 py-3 cursor-pointer transition-colors"
                                                style={{ background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.15)' }}
                                            >
                                                <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>{s.to_user_name}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                                                        ${formatCurrency(s.amount)}
                                                    </span>
                                                    <span className="text-xs font-bold bg-accent text-white px-3 py-1.5 rounded-xl">Pay Balance</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}

                            {uniquePaymentRecords.length > 0 && (
                                <>
                                    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
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

                            <div className="flex gap-3 pt-1">
                                {selectedExpense.paid_by === user?.id && (
                                    <button
                                        onClick={() => { setExpenseToEdit(selectedExpense); setSelectedExpense(null); setShowAddExpense(true); }}
                                        className="flex-1 py-2.5 text-sm font-semibold rounded-xl cursor-pointer transition-colors"
                                        style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.08)' }}
                                    >
                                        Edit
                                    </button>
                                )}
                                <button
                                    onClick={() => handleDeleteExpense(selectedExpense)}
                                    disabled={actionLoadingId === selectedExpense.id}
                                    className="flex-1 py-2.5 text-sm font-semibold rounded-xl cursor-pointer transition-colors disabled:opacity-50"
                                    style={{ background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.7)', border: '1px solid rgba(239,68,68,0.15)' }}
                                >
                                    {actionLoadingId === selectedExpense.id ? 'Deleting…' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {sharedModals}
            </>
        );
    }

    // ── Tabbed layout ─────────────────────────────────────────────────────────
    return (
        <>
            <div className="min-h-screen bg-bg">

                {/* ── HEADER ──────────────────────────────────────────────────── */}
                <div className="bg-surface border-b border-border px-4 pt-4 pb-0">

                    {/* Row 1: back + name + trash  |  balance indicator */}
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="shrink-0 p-1 rounded-lg text-secondary hover:text-primary transition-colors cursor-pointer"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                            <h1 className="font-bold text-xl text-primary truncate">{group.name}</h1>
                            <button
                                onClick={handleDeleteGroup}
                                disabled={actionLoadingId === groupId}
                                className="shrink-0 p-1 rounded-lg text-secondary/40 hover:text-danger transition-colors cursor-pointer disabled:opacity-30"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {Math.abs(myNet) > 0.01 && (
                            <div className="text-right shrink-0 ml-3">
                                <p className={`text-xs font-semibold ${myNet > 0 ? 'text-green-400' : 'text-amber-400'}`}>
                                    {myNet > 0 ? "You're owed" : "You owe"}
                                </p>
                                <p className={`text-lg font-black leading-tight ${myNet > 0 ? 'text-green-400' : 'text-amber-400'}`}>
                                    ${formatCurrency(Math.abs(myNet))}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Row 2: character cluster + group meta */}
                    <div className="flex items-end gap-3 mb-4">
                        {apiBalances.length > 0 && (
                            <div className="flex items-end gap-0.5 shrink-0">
                                {apiBalances.slice(0, 5).map(b => (
                                    <CharacterShape
                                        key={b.user_id}
                                        shape={b.character_shape ?? 'rect'}
                                        color={b.character_color ?? '#6B7280'}
                                        variant="cluster"
                                    />
                                ))}
                            </div>
                        )}
                        <div>
                            <p className="text-sm font-semibold text-primary leading-tight">
                                {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                            </p>
                            <p className="text-xs text-secondary">
                                {expenses.length} expense{expenses.length !== 1 ? 's' : ''} · ${formatCurrency(totalSpent)}
                            </p>
                        </div>
                    </div>

                    {/* Row 3: action buttons */}
                    <div className="flex items-center gap-2 mb-4 overflow-x-auto">
                        <button
                            onClick={() => { setExpenseToEdit(undefined); setShowAddExpense(true); }}
                            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer shrink-0"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            + Expense
                        </button>
                        <button
                            onClick={() => {
                                if (user && !user.stripe_account_id) setShowStripeOnboarding(true);
                                else setShowRequestMoney(true);
                            }}
                            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-indigo text-white transition-opacity hover:opacity-80 cursor-pointer shrink-0"
                        >
                            <Handshake className="w-3.5 h-3.5" />
                            Request
                        </button>
                        <button
                            onClick={handleCopyLink}
                            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition-colors cursor-pointer shrink-0 ${
                                copied
                                    ? 'border-accent/40 bg-accent/10 text-accent'
                                    : 'border-border bg-surface-light text-secondary hover:text-primary'
                            }`}
                        >
                            {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <LinkIcon className="w-3.5 h-3.5" />}
                            {copied ? 'Copied!' : 'Share link'}
                        </button>
                    </div>

                    {/* Tab bar */}
                    <div className="flex items-center overflow-x-auto -mb-px">
                        {(
                            [
                                { id: 'expenses', label: `Expenses (${expenses.length})` },
                                { id: 'balances', label: 'Balances' },
                                { id: 'settleup', label: `Settle up (${effectiveSettlements.length})` },
                                { id: 'canvas', label: 'Canvas' },
                            ] as const
                        ).map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => tab.id === 'canvas' ? setShowCanvas(true) : setActiveTab(tab.id)}
                                className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                                    activeTab === tab.id
                                        ? 'border-accent text-accent'
                                        : 'border-transparent text-secondary hover:text-primary'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── TAB CONTENT ─────────────────────────────────────────────── */}
                <div className="p-4">

                    {/* EXPENSES TAB */}
                    {activeTab === 'expenses' && (
                        expenses.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div
                                    className="flex items-center justify-center mb-4 cursor-pointer animate-pulse"
                                    onClick={() => setShowAddExpense(true)}
                                    style={{
                                        borderRadius: '60% 40% 70% 30% / 50% 60% 40% 50%',
                                        background: 'rgba(74,222,128,0.06)',
                                        border: '1px solid rgba(74,222,128,0.15)',
                                        width: 120,
                                        height: 90,
                                    }}
                                >
                                    <Plus className="w-6 h-6 text-accent/60" />
                                </div>
                                <p className="text-secondary text-sm">No expenses yet</p>
                                <button
                                    onClick={() => setShowAddExpense(true)}
                                    className="mt-3 text-accent text-sm font-semibold cursor-pointer hover:underline"
                                >
                                    Add the first one
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {expenses.map(exp => (
                                    <ExpenseCard
                                        key={exp.id}
                                        expense={exp}
                                        groupId={groupId}
                                        currentUserId={user?.id}
                                        onEdit={exp.paid_by === user?.id
                                            ? (e) => { setExpenseToEdit(e); setShowAddExpense(true); }
                                            : undefined
                                        }
                                        onDelete={(e) => handleDeleteExpense(e)}
                                        isDeleting={actionLoadingId === exp.id}
                                    />
                                ))}
                            </div>
                        )
                    )}

                    {/* BALANCES TAB */}
                    {activeTab === 'balances' && (
                        computedBalances.length === 0 ? (
                            <div className="text-center py-16">
                                <p className="text-secondary text-sm">Add expenses to see balances</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {computedBalances.map(bal => {
                                    const cd = characterLookup.get(bal.user_id) ?? { shape: 'rect', color: '#6B7280' };
                                    const pct = Math.min(Math.abs(bal.net_balance) / maxAbsBalance * 100, 100);
                                    const isPositive = bal.net_balance > 0.01;
                                    const isNegative = bal.net_balance < -0.01;
                                    return (
                                        <div key={bal.user_id} className="flex items-center gap-3 bg-surface rounded-xl p-3 border border-border">
                                            <CharacterShape shape={cd.shape} color={cd.color} variant="mini" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <p className="text-sm font-semibold text-primary truncate">{bal.name}</p>
                                                    <p className={`text-sm font-bold ml-2 shrink-0 ${isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-secondary'}`}>
                                                        {isPositive ? '+' : ''}{isNegative ? '-' : ''}${formatCurrency(Math.abs(bal.net_balance))}
                                                    </p>
                                                </div>
                                                {Math.abs(bal.net_balance) > 0.01 ? (
                                                    <div className="h-1.5 bg-border rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${isPositive ? 'bg-green-400' : 'bg-red-400'}`}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-secondary">Settled up</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    )}

                    {/* SETTLE UP TAB */}
                    {activeTab === 'settleup' && (
                        <div>
                            {effectiveSettlements.length > 0 && (
                                <p className="text-xs text-secondary mb-4 leading-relaxed">
                                    Simplified to {effectiveSettlements.length} payment{effectiveSettlements.length !== 1 ? 's' : ''} — fewest transfers to settle everyone
                                </p>
                            )}

                            {effectiveSettlements.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <CheckCircle2 className="w-10 h-10 text-accent mx-auto mb-3" />
                                    <p className="text-primary font-semibold">All settled up!</p>
                                    <p className="text-secondary text-sm mt-1">No outstanding balances in this group.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {effectiveSettlements.map((s, i) => {
                                        const theyOweMe = s.to_user_id === user?.id;
                                        const iOweThem = s.from_user_id === user?.id;
                                        const otherUserId = theyOweMe ? s.from_user_id : s.to_user_id;
                                        const otherName = theyOweMe ? s.from_user_name : s.to_user_name;
                                        const cd = characterLookup.get(otherUserId) ?? { shape: 'rect', color: '#6B7280' };
                                        return (
                                            <div key={i} className="flex items-center gap-3 bg-surface rounded-xl p-4 border border-border">
                                                <CharacterShape shape={cd.shape} color={cd.color} variant="mini" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-primary truncate">{otherName}</p>
                                                    <p className={`text-xs font-semibold mt-0.5 ${theyOweMe ? 'text-green-400' : iOweThem ? 'text-amber-400' : 'text-secondary'}`}>
                                                        {theyOweMe ? 'owes you' : iOweThem ? 'you owe' : `${s.from_user_name} owes ${s.to_user_name}`}
                                                        {' '}${formatCurrency(s.amount)}
                                                    </p>
                                                </div>
                                                {theyOweMe && (
                                                    <button
                                                        onClick={handleRemind}
                                                        className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border border-border bg-surface-light text-secondary hover:text-primary transition-colors cursor-pointer shrink-0"
                                                    >
                                                        <Bell className="w-3.5 h-3.5" />
                                                        Remind
                                                    </button>
                                                )}
                                                {iOweThem && (
                                                    <button
                                                        onClick={() => setSettleUpTarget(s)}
                                                        className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer shrink-0"
                                                    >
                                                        <CreditCard className="w-3.5 h-3.5" />
                                                        Pay now
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Confirmed payments */}
                            {settledRecords.length > 0 && (
                                <div className="mt-6">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-secondary mb-3">
                                        Confirmed payments
                                    </p>
                                    <div className="space-y-2">
                                        {settledRecords.map(record => (
                                            <div key={record.id} className="flex items-center gap-3 bg-surface rounded-xl p-3 border border-border">
                                                <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-primary truncate">
                                                        {record.payer_name} → {record.payee_name}
                                                    </p>
                                                    <p className="text-xs text-secondary">
                                                        {new Date(record.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </p>
                                                </div>
                                                <span className="text-sm font-bold text-green-400 shrink-0">
                                                    ${formatCurrency(record.amount)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Reminder toast */}
            {reminderToast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-surface border border-border rounded-2xl px-5 py-3 shadow-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                    <span className="text-sm font-semibold text-primary">Reminder sent!</span>
                </div>
            )}

            {sharedModals}
        </>
    );
}
