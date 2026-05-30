import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { groupsApi, expensesApi, balancesApi, GroupMember, UserBalance } from '../services/api';
import CharacterShape from '../components/CharacterShape';
import { formatCurrency } from '../utils/currency';

export default function SplitCanvas() {
    const { groupId } = useParams<{ groupId: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const name = searchParams.get('name') ?? 'Expense';
    const amount = parseFloat(searchParams.get('amount') ?? '0');
    const paidBy = searchParams.get('paidBy') ?? '';

    const [members, setMembers] = useState<GroupMember[]>([]);
    const [balances, setBalances] = useState<UserBalance[]>([]);
    const [inBlob, setInBlob] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [blobGlow, setBlobGlow] = useState(false);
    const [draggingUserId, setDraggingUserId] = useState<string | null>(null);

    const draggingFromBlob = useRef(false);
    const blobRef = useRef<HTMLDivElement>(null);
    const ghostRef = useRef<HTMLDivElement>(null);
    // Stable initial position for first render of ghost — avoids flash at (0,0)
    const ghostInitPos = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (!groupId) return;
        Promise.all([
            groupsApi.get(groupId),
            balancesApi.getBalances(groupId).catch(() => [] as UserBalance[]),
        ])
            .then(([group, bals]) => {
                setMembers(group.members);
                setBalances(bals);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [groupId]);

    const charLookup = new Map(
        balances.map(b => [b.user_id, { shape: b.character_shape ?? 'rect', color: b.character_color ?? '#6B7280' }])
    );

    const inBlobCount = inBlob.size;
    const perPerson = inBlobCount > 0 ? amount / inBlobCount : 0;
    const blobMembers = members.filter(m => inBlob.has(m.user_id));
    const trayMembers = members.filter(m => !inBlob.has(m.user_id));

    const isOverBlob = (x: number, y: number) => {
        if (!blobRef.current) return false;
        const r = blobRef.current.getBoundingClientRect();
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    };

    const handlePointerDown = (e: React.PointerEvent, userId: string, fromBlob: boolean) => {
        e.preventDefault();
        draggingFromBlob.current = fromBlob;
        ghostInitPos.current = { x: e.clientX, y: e.clientY };
        setDraggingUserId(userId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!draggingUserId) return;
        if (ghostRef.current) {
            ghostRef.current.style.left = `${e.clientX - 16}px`;
            ghostRef.current.style.top = `${e.clientY - 26}px`;
        }
        setBlobGlow(isOverBlob(e.clientX, e.clientY));
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!draggingUserId) return;
        const over = isOverBlob(e.clientX, e.clientY);
        setInBlob(prev => {
            const next = new Set(prev);
            if (over) next.add(draggingUserId);
            else next.delete(draggingUserId);
            return next;
        });
        setDraggingUserId(null);
        setBlobGlow(false);
    };

    const handleConfirm = async () => {
        if (!groupId || inBlob.size === 0) return;
        setSubmitting(true);
        setError('');
        try {
            await expensesApi.create(groupId, {
                title: name,
                amount,
                paid_by: paidBy,
                participant_ids: Array.from(inBlob),
            });
            navigate(`/groups/${groupId}`);
        } catch (err: any) {
            setError(err.message || 'Failed to create expense');
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-bg">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const draggingChar = draggingUserId ? charLookup.get(draggingUserId) : null;

    return (
        <div
            className="fixed inset-0 flex flex-col overflow-hidden bg-bg"
            style={{ touchAction: 'none', userSelect: 'none' }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
        >
            {/* ── Top bar ─────────────────────────────────────────────── */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30 shrink-0 bg-surface">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-xl hover:bg-border transition-colors cursor-pointer"
                >
                    <ArrowLeft className="w-5 h-5 text-primary" />
                </button>
                <p className="flex-1 text-base font-bold text-primary truncate">{name}</p>
                <span className="text-lg font-black text-accent shrink-0">${formatCurrency(amount)}</span>
            </div>

            {/* ── Dark canvas (~60% height) ────────────────────────────── */}
            <div
                className="flex items-center justify-center relative overflow-hidden"
                style={{ flex: '0 0 60%', background: '#0d0d0f' }}
            >
                {/* Blob */}
                <div
                    ref={blobRef}
                    className="relative z-10 flex flex-col items-center justify-center text-center"
                    style={{
                        width: 220,
                        height: 220,
                        borderRadius: '60% 40% 55% 45% / 45% 55% 40% 60%',
                        background: blobGlow
                            ? 'radial-gradient(ellipse at center, rgba(62,207,142,0.14) 0%, rgba(62,207,142,0.06) 60%, transparent 100%)'
                            : 'radial-gradient(ellipse at center, #1c1c2e 0%, #12121a 100%)',
                        border: `2px solid ${blobGlow ? 'rgba(62,207,142,0.45)' : 'rgba(255,255,255,0.07)'}`,
                        boxShadow: blobGlow
                            ? '0 0 60px 20px rgba(62,207,142,0.18), inset 0 0 30px rgba(62,207,142,0.08)'
                            : '0 0 80px rgba(0,0,0,0.7), inset 0 0 40px rgba(255,255,255,0.02)',
                        animation: 'blobMorph 7s ease-in-out infinite',
                        transition: 'border-color 0.2s ease, box-shadow 0.25s ease, background 0.25s ease',
                    }}
                >
                    {/* In-blob avatars */}
                    {blobMembers.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-1.5 mb-2" style={{ maxWidth: 180 }}>
                            {blobMembers.map(m => {
                                const char = charLookup.get(m.user_id);
                                return (
                                    <div
                                        key={m.user_id}
                                        className="cursor-grab active:cursor-grabbing"
                                        style={{ opacity: draggingUserId === m.user_id ? 0 : 1 }}
                                        onPointerDown={e => handlePointerDown(e, m.user_id, true)}
                                    >
                                        <CharacterShape
                                            shape={char?.shape ?? 'rect'}
                                            color={char?.color ?? '#6B7280'}
                                            variant="cluster"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {inBlobCount > 0 ? (
                        <>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-0.5" style={{ color: 'rgba(62,207,142,0.6)' }}>
                                splitting
                            </p>
                            <p className="text-2xl font-black text-white tabular-nums">${formatCurrency(perPerson)}</p>
                            <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                {inBlobCount} {inBlobCount === 1 ? 'person' : 'people'}
                            </p>
                        </>
                    ) : (
                        <p className="text-sm font-medium leading-snug px-6" style={{ color: 'rgba(255,255,255,0.22)' }}>
                            Drag people<br />into the blob
                        </p>
                    )}
                </div>
            </div>

            {/* ── Bottom tray (~40% remaining) ──────────────────────────── */}
            <div className="flex-1 flex flex-col bg-surface border-t border-border/40 overflow-hidden">
                {/* Character row */}
                <div className="flex items-end justify-center gap-5 px-6 pt-5 pb-2 flex-1">
                    {trayMembers.length === 0 ? (
                        <p className="text-xs pb-2 self-center" style={{ color: 'rgba(255,255,255,0.25)' }}>
                            Everyone's in!
                        </p>
                    ) : (
                        trayMembers.map(m => {
                            const char = charLookup.get(m.user_id);
                            return (
                                <div
                                    key={m.user_id}
                                    className="flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing"
                                    style={{ opacity: draggingUserId === m.user_id ? 0 : 1 }}
                                    onPointerDown={e => handlePointerDown(e, m.user_id, false)}
                                >
                                    <CharacterShape
                                        shape={char?.shape ?? 'rect'}
                                        color={char?.color ?? '#6B7280'}
                                        variant="mini"
                                    />
                                    <span className="text-[10px] font-semibold text-secondary leading-none">
                                        {m.name.split(' ')[0]}
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Summary rows */}
                {inBlobCount > 0 && (
                    <div className="px-5 pb-2 space-y-1">
                        {blobMembers.map(m => (
                            <div key={m.user_id} className="flex items-center justify-between">
                                <span className="text-sm text-secondary">{m.name.split(' ')[0]}</span>
                                <span className="text-sm font-bold text-primary tabular-nums">${formatCurrency(perPerson)}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Error + Confirm button */}
                <div className="px-4 pb-6 pt-2 shrink-0">
                    {error && <p className="text-xs text-danger mb-2">{error}</p>}
                    <button
                        onClick={handleConfirm}
                        disabled={submitting || inBlob.size === 0}
                        className="w-full h-12 rounded-2xl bg-accent hover:bg-accent-hover disabled:opacity-40 text-white font-bold text-sm transition-all cursor-pointer disabled:cursor-not-allowed shadow-lg"
                        style={{ boxShadow: inBlob.size > 0 ? '0 8px 24px rgba(62,207,142,0.25)' : undefined }}
                    >
                        {submitting
                            ? 'Creating...'
                            : inBlobCount > 0
                                ? `Confirm split · ${inBlobCount} ${inBlobCount === 1 ? 'person' : 'people'}`
                                : 'Add people to split'}
                    </button>
                </div>
            </div>

            {/* ── Drag ghost ───────────────────────────────────────────── */}
            {draggingUserId && (
                <div
                    ref={ghostRef}
                    style={{
                        position: 'fixed',
                        left: ghostInitPos.current.x - 16,
                        top: ghostInitPos.current.y - 26,
                        pointerEvents: 'none',
                        zIndex: 9999,
                        opacity: 0.9,
                        transform: 'scale(1.15)',
                        transformOrigin: 'center bottom',
                    }}
                >
                    <CharacterShape
                        shape={draggingChar?.shape ?? 'rect'}
                        color={draggingChar?.color ?? '#6B7280'}
                        variant="mini"
                    />
                </div>
            )}

            {/* ── Blob animation keyframes ─────────────────────────────── */}
            <style>{`
                @keyframes blobMorph {
                    0%   { border-radius: 60% 40% 55% 45% / 45% 55% 40% 60%; }
                    25%  { border-radius: 40% 60% 45% 55% / 55% 45% 60% 40%; }
                    50%  { border-radius: 55% 45% 60% 40% / 40% 60% 45% 55%; }
                    75%  { border-radius: 45% 55% 40% 60% / 60% 40% 55% 45%; }
                    100% { border-radius: 60% 40% 55% 45% / 45% 55% 40% 60%; }
                }
            `}</style>
        </div>
    );
}
