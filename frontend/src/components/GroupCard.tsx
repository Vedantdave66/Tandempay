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

// Orbital geometry — 160×160 container, center at (80, 80)
const CONTAINER = 160;
const CENTER = 80;
const ORBIT_RADIUS = 46;

function orbitPositions(n: number): Array<{ x: number; y: number }> {
    return Array.from({ length: n }, (_, i) => {
        const angle = (2 * Math.PI / n) * i - Math.PI / 2; // start at 12 o'clock
        return {
            x: CENTER + Math.cos(angle) * ORBIT_RADIUS,
            y: CENTER + Math.sin(angle) * ORBIT_RADIUS,
        };
    });
}

export default function GroupCard({ group, members = [], myNetBalance = 0 }: GroupCardProps) {
    const navigate = useNavigate();
    const initial = group.name ? group.name.charAt(0).toUpperCase() : '?';
    const visibleMembers = members.slice(0, 4);
    const extraCount = members.length > 4 ? members.length - 4 : 0;
    const balanceLoaded = members.length > 0;
    const positions = orbitPositions(visibleMembers.length);

    return (
        <button
            onClick={() => navigate(`/groups/${group.id}`)}
            className="w-full relative overflow-hidden bg-surface-light/40 border border-border/60 rounded-[2rem] p-7 hover:border-accent/40 hover:-translate-y-1 transition-all duration-500 text-left group cursor-pointer shadow-xl shadow-black/20 hover:shadow-[0_15px_40px_rgba(74,222,128,0.1)] flex flex-col backdrop-blur-sm"
        >
            {/* Hover glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent/0 to-accent/0 group-hover:from-accent/5 group-hover:to-transparent transition-colors duration-500 pointer-events-none" />

            {/* ── Orbital cluster ─────────────────────────────────────────── */}
            <div className="relative z-10 flex justify-center mb-5">
                <div className="relative" style={{ width: CONTAINER, height: CONTAINER }}>

                    {/* Center circle: group initial */}
                    <div
                        className="absolute flex items-center justify-center rounded-full shadow-lg"
                        style={{
                            width: 64,
                            height: 64,
                            left: CENTER - 32,
                            top: CENTER - 32,
                            background: '#0d0d0f',
                            border: '2px solid rgba(255,255,255,0.12)',
                            zIndex: 10,
                        }}
                    >
                        <span className="text-2xl font-black" style={{ color: 'rgba(255,255,255,0.9)' }}>
                            {initial}
                        </span>
                    </div>

                    {/* Orbiting CharacterShapes */}
                    {balanceLoaded && visibleMembers.map((m, i) => (
                        <div
                            key={m.user_id}
                            className="absolute"
                            style={{
                                left: positions[i].x,
                                top: positions[i].y,
                                transform: 'translate(-50%, -50%)',
                                zIndex: 5,
                            }}
                        >
                            <CharacterShape
                                shape={m.character_shape ?? 'rect'}
                                color={m.character_color ?? '#6B7280'}
                                variant="mini"
                            />
                        </div>
                    ))}

                    {/* +N overflow badge */}
                    {extraCount > 0 && (
                        <div
                            className="absolute flex items-center justify-center rounded-full bg-indigo border-2 border-surface-light shadow-sm"
                            style={{ width: 22, height: 22, right: 14, bottom: 14, zIndex: 20 }}
                        >
                            <span className="text-[9px] font-bold text-white leading-none">+{extraCount}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Name + badges ───────────────────────────────────────────── */}
            <div className="relative z-10 text-center mb-5">
                <h3 className="text-[1.15rem] font-black text-primary truncate mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-accent transition-all duration-300">
                    {group.name}
                </h3>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                    <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-bg/60 border border-border/40">
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

            {/* ── Footer ─────────────────────────────────────────────────── */}
            <div className="relative z-10 mt-auto pt-5 border-t border-border/40 flex items-end justify-between">
                <div>
                    <span className="text-[10px] text-secondary font-bold uppercase tracking-[0.15em] block mb-1.5">Total Expenses</span>
                    <span className="text-2xl font-black text-primary tracking-tight">
                        ${formatCurrency(group.total_expenses)}
                    </span>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-surface border border-border/50 flex items-center justify-center group-hover:bg-gradient-to-br group-hover:from-accent group-hover:to-emerald-500 transition-all duration-500 shadow-lg shadow-black/20 group-hover:shadow-[0_0_20px_rgba(74,222,128,0.4)] group-hover:border-transparent group-hover:scale-110">
                    <ArrowRight className="w-4 h-4 text-secondary group-hover:text-[#064E3B] transition-colors duration-500 drop-shadow-sm" />
                </div>
            </div>
        </button>
    );
}
