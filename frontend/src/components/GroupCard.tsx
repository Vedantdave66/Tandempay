import { useEffect } from 'react';
import { GroupListItem, UserBalance } from '../services/api';
import { formatCurrency } from '../utils/currency';
import { ArrowRight } from 'lucide-react';
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
    const initial = group.name ? group.name.charAt(0).toUpperCase() : '?';

    useEffect(() => {
        console.log('[GroupCard] members for', group.name, members);
    }, [members]);
    const visibleMembers = members.slice(0, 3);
    const extraCount = members.length > 3 ? members.length - 3 : 0;
    const balanceLoaded = members.length > 0;

    return (
        <button
            onClick={() => navigate(`/groups/${group.id}`)}
            className="w-full relative overflow-hidden bg-surface-light/40 border border-border/60 rounded-[2rem] p-7 hover:border-accent/40 hover:-translate-y-1 transition-all duration-500 text-left group cursor-pointer shadow-xl shadow-black/20 hover:shadow-[0_15px_40px_rgba(74,222,128,0.1)] flex flex-col backdrop-blur-sm"
        >
            {/* Subtle Gradient Glow on Hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent/0 to-accent/0 group-hover:from-accent/5 group-hover:to-transparent transition-colors duration-500 pointer-events-none" />

            <div className="relative z-10 flex items-start gap-5 mb-6">
                {/* Character cluster — up to 3 members, or letter avatar while loading */}
                <div className="relative shrink-0 flex items-end" style={{ minWidth: 40, height: 48 }}>
                    {balanceLoaded ? (
                        <>
                            <div className="flex items-end gap-1">
                                {visibleMembers.map(m => (
                                    <CharacterShape
                                        key={m.user_id}
                                        shape={m.character_shape ?? 'rect'}
                                        color={m.character_color ?? '#6B7280'}
                                        variant="cluster"
                                    />
                                ))}
                            </div>
                            {extraCount > 0 && (
                                <div className="absolute -bottom-1 -right-3 w-5 h-5 rounded-full bg-indigo border-2 border-surface-light flex items-center justify-center z-20 shadow-sm shadow-black/50">
                                    <span className="text-[8px] font-bold text-white leading-none">+{extraCount}</span>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-surface to-bg flex items-center justify-center shadow-inner border border-border/80 group-hover:border-accent/40 transition-colors duration-500">
                            <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-br from-primary to-secondary group-hover:from-accent group-hover:to-emerald-500 transition-all duration-500">
                                {initial}
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0 pt-1">
                    <h3 className="text-[1.15rem] font-black text-primary truncate mb-1.5 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-accent transition-all duration-300">
                        {group.name}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg/60 border border-border/40">
                            <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">
                                {group.member_count} Member{group.member_count !== 1 ? 's' : ''}
                            </span>
                        </div>
                        {balanceLoaded && (
                            Math.abs(myNetBalance) > SETTLED_THRESHOLD ? (
                                myNetBalance > 0 ? (
                                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 leading-none">
                                        ↑ ${formatCurrency(myNetBalance)}
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20 leading-none">
                                        ↓ ${formatCurrency(Math.abs(myNetBalance))}
                                    </span>
                                )
                            ) : (
                                <span className="text-[10px] font-medium text-secondary/60 px-2 py-1 leading-none">
                                    ✓ Settled
                                </span>
                            )
                        )}
                    </div>
                </div>
            </div>

            <div className="relative z-10 mt-auto pt-5 border-t border-border/40 flex items-end justify-between">
                <div>
                    <span className="text-[10px] text-secondary font-bold uppercase tracking-[0.15em] block mb-1.5">Total Expenses</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-primary tracking-tight">
                            ${formatCurrency(group.total_expenses)}
                        </span>
                    </div>
                </div>

                <div className="w-10 h-10 rounded-2xl bg-surface border border-border/50 flex items-center justify-center group-hover:bg-gradient-to-br group-hover:from-accent group-hover:to-emerald-500 transition-all duration-500 shadow-lg shadow-black/20 group-hover:shadow-[0_0_20px_rgba(74,222,128,0.4)] group-hover:border-transparent group-hover:scale-110">
                    <ArrowRight className="w-4 h-4 text-secondary group-hover:text-[#064E3B] transition-colors duration-500 drop-shadow-sm" />
                </div>
            </div>
        </button>
    );
}
