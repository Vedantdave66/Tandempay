import { GroupListItem, UserBalance } from '../services/api';
import { formatCurrency } from '../utils/currency';
import { ArrowRight, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CharacterShape from './CharacterShape';

interface GroupCardProps {
    group: GroupListItem;
    members?: UserBalance[];
    myNetBalance?: number;
}

const SETTLED_THRESHOLD = 0.01;

export default function GroupCard({ group, members = [], myNetBalance = 0 }: GroupCardProps) {
    const navigate = useNavigate();
    const visibleMembers = members.slice(0, 4);
    const extraCount = members.length > 4 ? members.length - 4 : 0;
    const balanceLoaded = members.length > 0;
    const isOwe = myNetBalance < -SETTLED_THRESHOLD;
    const isOwed = myNetBalance > SETTLED_THRESHOLD;
    const isSettled = !isOwe && !isOwed;

    return (
        <div
            onClick={() => navigate(`/groups/${group.id}`)}
            className="relative overflow-hidden bg-gray-900 rounded-2xl cursor-pointer select-none"
        >
            {/* Radial green glow — always present, consistent across all cards */}
            <div
                className="absolute inset-x-0 top-0 h-56 pointer-events-none"
                style={{
                    background:
                        'radial-gradient(ellipse 90% 60% at 50% 0%, rgba(34,197,94,0.30) 0%, transparent 70%)',
                }}
            />

            {/* ── Characters row ─────────────────────────────────────────── */}
            <div className="relative z-10 flex justify-center pt-7">
                {balanceLoaded ? (
                    <div className="flex items-end">
                        {visibleMembers.map((m, i) => {
                            const firstName = m.name.split(' ')[0];
                            const isCreator = m.user_id === group.created_by;
                            return (
                                <div
                                    key={m.user_id}
                                    className="flex flex-col items-center"
                                    style={{
                                        marginLeft: i > 0 ? '-10px' : 0,
                                        zIndex: visibleMembers.length - i,
                                        position: 'relative',
                                    }}
                                >
                                    {/* Crown or spacer to keep name labels level */}
                                    {isCreator ? (
                                        <Crown className="w-3 h-3 text-amber-400 mb-0.5 drop-shadow-sm" />
                                    ) : (
                                        <div className="w-3 h-3 mb-0.5" />
                                    )}
                                    <span className="text-[9px] text-white/70 mb-1 leading-none font-medium">
                                        {firstName}
                                    </span>
                                    <CharacterShape
                                        shape={m.character_shape ?? 'rect'}
                                        color={m.character_color ?? '#6B7280'}
                                        variant="mini"
                                    />
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* Placeholder height so the pill doesn't jump when members load */
                    <div className="h-16" />
                )}
            </div>

            {/* ── Group name pill ─────────────────────────────────────────── */}
            <div className="relative z-10 flex justify-center mt-3 px-4">
                <div className="bg-black rounded-full px-6 py-3 max-w-full">
                    <h3 className="text-2xl font-bold text-white truncate">{group.name}</h3>
                </div>
            </div>

            {/* +N others pill — only when members overflow */}
            {extraCount > 0 && (
                <div className="relative z-10 flex justify-center mt-2">
                    <div className="bg-gray-800/90 rounded-full px-3 py-1">
                        <span className="text-xs text-white/60 font-medium">+{extraCount} others</span>
                    </div>
                </div>
            )}

            {/* ── Stats section ───────────────────────────────────────────── */}
            <div className="relative z-10 px-5 pb-5 pt-4 space-y-3">

                {/* Total expenses */}
                <div>
                    <span className="text-[10px] uppercase tracking-widest text-white/40 font-semibold block mb-1.5">
                        Total Expenses
                    </span>
                    <div className="inline-flex items-center bg-gray-800 rounded-full px-4 py-2">
                        <span className="text-white font-semibold text-sm">
                            ${formatCurrency(group.total_expenses)}
                        </span>
                    </div>
                </div>

                {/* Balance row — only when loaded */}
                {balanceLoaded && (
                    <div>
                        <span className="text-[10px] uppercase tracking-widest text-white/40 font-semibold block mb-1.5">
                            {isOwed ? "You're Owed" : isOwe ? 'You Owe' : 'Status'}
                        </span>
                        <div className="inline-flex items-center bg-gray-800 rounded-full pl-4 pr-1.5 py-1.5 gap-2">
                            <span
                                className={`font-semibold text-sm ${
                                    isOwed
                                        ? 'text-green-400'
                                        : isOwe
                                        ? 'text-amber-400'
                                        : 'text-green-400'
                                }`}
                            >
                                {isSettled
                                    ? '✓ Settled'
                                    : `$${formatCurrency(Math.abs(myNetBalance))}`}
                            </span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/groups/${group.id}`);
                                }}
                                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                                    isOwed
                                        ? 'bg-green-500/20 hover:bg-green-500/40'
                                        : isOwe
                                        ? 'bg-amber-500/20 hover:bg-amber-500/40'
                                        : 'bg-white/10 hover:bg-white/20'
                                }`}
                            >
                                <ArrowRight
                                    className={`w-3.5 h-3.5 ${
                                        isOwed
                                            ? 'text-green-400'
                                            : isOwe
                                            ? 'text-amber-400'
                                            : 'text-white/60'
                                    }`}
                                />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
