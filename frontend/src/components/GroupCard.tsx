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
        // aspect-[5/8] = width:height 5:8 → height is 1.6× width (portrait)
        <div
            onClick={() => navigate(`/groups/${group.id}`)}
            className="relative overflow-hidden bg-surface-light rounded-2xl cursor-pointer select-none flex flex-col aspect-[5/8]"
        >
            {/* Radial green glow — same intensity in light + dark */}
            <div
                className="absolute inset-x-0 top-0 h-56 pointer-events-none"
                style={{
                    background:
                        'radial-gradient(ellipse 90% 60% at 50% 0%, rgba(34,197,94,0.30) 0%, transparent 70%)',
                }}
            />

            {/* ── Characters row — evenly spread across full card width ── */}
            <div className="relative z-10 flex justify-evenly items-end pt-8 px-4">
                {balanceLoaded ? (
                    visibleMembers.map((m) => {
                        const firstName = m.name.split(' ')[0];
                        const isCreator = m.user_id === group.created_by;
                        return (
                            <div key={m.user_id} className="flex flex-col items-center">
                                {isCreator ? (
                                    <Crown className="w-3 h-3 text-amber-400 mb-0.5 drop-shadow-sm" />
                                ) : (
                                    <div className="w-3 h-3 mb-0.5" />
                                )}
                                <span className="text-[9px] text-secondary mb-1 leading-none font-medium">
                                    {firstName}
                                </span>
                                <CharacterShape
                                    shape={m.character_shape ?? 'rect'}
                                    color={m.character_color ?? '#6B7280'}
                                    variant="mini"
                                />
                            </div>
                        );
                    })
                ) : (
                    <div className="h-16" />
                )}
            </div>

            {/* ── Group name pill ─────────────────────────────────────── */}
            <div className="relative z-10 flex justify-center mt-4 px-4">
                <div className="bg-black rounded-full px-6 py-3 max-w-full">
                    <h3 className="text-2xl font-bold text-white truncate">{group.name}</h3>
                </div>
            </div>

            {/* +N others pill */}
            {extraCount > 0 && (
                <div className="relative z-10 flex justify-center mt-2">
                    <div className="bg-surface border border-border/40 rounded-full px-3 py-1">
                        <span className="text-xs text-secondary font-medium">+{extraCount} others</span>
                    </div>
                </div>
            )}

            {/* Flex spacer — pushes stats to the lower third of the portrait card */}
            <div className="flex-1" />

            {/* ── Stats — centered ────────────────────────────────────── */}
            <div className="relative z-10 px-5 pb-6 flex flex-col items-center gap-3">

                {/* Total expenses */}
                <div className="flex flex-col items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-widest text-secondary font-semibold">
                        Total Expenses
                    </span>
                    <div className="inline-flex items-center bg-surface border border-border/40 rounded-full px-4 py-2">
                        <span className="text-primary font-semibold text-sm">
                            ${formatCurrency(group.total_expenses)}
                        </span>
                    </div>
                </div>

                {/* Balance row */}
                {balanceLoaded && (
                    <div className="flex flex-col items-center gap-1.5">
                        <span className="text-[10px] uppercase tracking-widest text-secondary font-semibold">
                            {isOwed ? "You're Owed" : isOwe ? 'You Owe' : 'Status'}
                        </span>
                        <div className="inline-flex items-center bg-surface border border-border/40 rounded-full pl-4 pr-1.5 py-1.5 gap-2">
                            <span
                                className={`font-semibold text-sm ${
                                    isOwed
                                        ? 'text-green-500'
                                        : isOwe
                                        ? 'text-amber-500'
                                        : 'text-green-500'
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
                                        ? 'bg-green-500/15 hover:bg-green-500/30'
                                        : isOwe
                                        ? 'bg-amber-500/15 hover:bg-amber-500/30'
                                        : 'bg-border/40 hover:bg-border/70'
                                }`}
                            >
                                <ArrowRight
                                    className={`w-3.5 h-3.5 ${
                                        isOwed
                                            ? 'text-green-500'
                                            : isOwe
                                            ? 'text-amber-500'
                                            : 'text-secondary'
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
