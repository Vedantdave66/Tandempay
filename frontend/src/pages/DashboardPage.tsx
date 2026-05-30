import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../utils/currency';
import { Plus, Users, ArrowRight, Palette, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { groupsApi, balancesApi, GroupListItem } from '../services/api';
import GroupCard from '../components/GroupCard';
import ProUpsellBanner from '../components/ProUpsellBanner';
import { useAuth } from '../context/AuthContext';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

// ── Character mini component ──────────────────────────────────────────────────

const MINI_CONFIGS = {
    mini: {
        rect:  { w: 32, h: 52,  radius: '6px 6px 0 0',   eyeTop: 10, eyeLeft: 8,  eyeSize: 5, eyeGap: 6 },
        tall:  { w: 22, h: 64,  radius: '4px 4px 0 0',   eyeTop: 12, eyeLeft: 4,  eyeSize: 5, eyeGap: 4 },
        semi:  { w: 56, h: 30,  radius: '28px 28px 0 0', eyeTop: 8,  eyeLeft: 19, eyeSize: 5, eyeGap: 8 },
        round: { w: 40, h: 52,  radius: '20px 20px 0 0', eyeTop: 12, eyeLeft: 12, eyeSize: 5, eyeGap: 6 },
    },
    hero: {
        rect:  { w: 56, h: 96,  radius: '8px 8px 0 0',   eyeTop: 18, eyeLeft: 14, eyeSize: 9, eyeGap: 10 },
        tall:  { w: 40, h: 116, radius: '6px 6px 0 0',   eyeTop: 22, eyeLeft: 7,  eyeSize: 9, eyeGap: 8  },
        semi:  { w: 100, h: 54, radius: '50px 50px 0 0', eyeTop: 14, eyeLeft: 34, eyeSize: 9, eyeGap: 14 },
        round: { w: 72, h: 96,  radius: '36px 36px 0 0', eyeTop: 22, eyeLeft: 22, eyeSize: 9, eyeGap: 10 },
    },
} as const;

type MiniVariant = keyof typeof MINI_CONFIGS;

function CharacterMini({ shape, color, variant = 'mini' }: { shape: string; color: string; variant?: MiniVariant }) {
    const table = MINI_CONFIGS[variant];
    const cfg = (table as Record<string, typeof table[keyof typeof table]>)[shape] ?? table.rect;
    return (
        <div style={{ width: cfg.w, height: cfg.h, backgroundColor: color, borderRadius: cfg.radius, position: 'relative', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: cfg.eyeTop, left: cfg.eyeLeft, display: 'flex', gap: cfg.eyeGap }}>
                <div style={{ width: cfg.eyeSize, height: cfg.eyeSize, backgroundColor: '#1A1A1A', borderRadius: '50%', opacity: 0.7 }} />
                <div style={{ width: cfg.eyeSize, height: cfg.eyeSize, backgroundColor: '#1A1A1A', borderRadius: '50%', opacity: 0.7 }} />
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
    const { user } = useAuth();
    const [groups, setGroups] = useState<GroupListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [creating, setCreating] = useState(false);
    const [owedToMe, setOwedToMe] = useState(0);
    const [iOwe, setIOwe] = useState(0);

    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = useCallback(async () => {
        try {
            const data = await groupsApi.list();
            setGroups(data.items);
        } catch {
        } finally {
            setLoading(false);
        }
    }, []);

    // Aggregate cross-group balances whenever the group list settles
    useEffect(() => {
        if (loading || !user?.id || groups.length === 0) return;
        Promise.all(groups.map(g => balancesApi.getBalances(g.id)))
            .then(allBalances => {
                let owed = 0, owing = 0;
                for (const groupBalances of allBalances) {
                    const me = groupBalances.find(b => b.user_id === user.id);
                    if (!me) continue;
                    if (me.net_balance > 0) owed += me.net_balance;
                    else if (me.net_balance < 0) owing += Math.abs(me.net_balance);
                }
                setOwedToMe(owed);
                setIOwe(owing);
            })
            .catch(() => {});
    }, [groups, loading, user?.id]);

    // Auto-refresh: poll every 30s + re-fetch on tab focus/visibility
    useAutoRefresh(loadGroups, 30000, !loading);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGroupName.trim()) return;
        setCreating(true);
        try {
            await groupsApi.create(newGroupName.trim());
            setNewGroupName('');
            setShowCreate(false);
            await loadGroups();
        } catch {
        } finally {
            setCreating(false);
        }
    };

    const totalGroups = groups.length;

    return (
        <div className="max-w-5xl mx-auto relative min-h-screen">
            {/* Ambient Background Glows */}
            <div className="fixed top-0 left-0 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[120px] pointer-events-none -z-10 translate-x-[-20%] translate-y-[-20%]" />
            <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-indigo/10 rounded-full blur-[120px] pointer-events-none -z-10 translate-x-[20%] translate-y-[-10%]" />

            <div className="fixed inset-0 opacity-[0.015] pointer-events-none -z-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />

            {/* Hero Header */}
            <div className="relative mb-8 px-8 pt-8 pb-0 sm:px-10 sm:pt-10 rounded-[2rem] overflow-hidden border border-border/60 bg-surface/40 backdrop-blur-xl shadow-2xl shadow-black/40">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-indigo/5 opacity-60" />
                {/* Personalised ambient glow behind character */}
                {user?.character_color && (
                    <div
                        className="absolute left-4 bottom-0 w-48 h-48 rounded-full blur-3xl opacity-25 pointer-events-none transition-colors duration-700"
                        style={{ backgroundColor: user.character_color }}
                    />
                )}
                <div className="relative z-10 flex items-end gap-6 sm:gap-8">
                    {/* Character — hero size, standing at left edge */}
                    {user?.character_shape && user?.character_color && (
                        <CharacterMini shape={user.character_shape} color={user.character_color} variant="hero" />
                    )}
                    {/* Greeting */}
                    <div className="flex-1 pb-8 sm:pb-10">
                        <h1 className="text-4xl sm:text-5xl font-black text-primary tracking-tight mb-2">
                            Hey, {user?.name?.split(' ')[0]} 👋
                        </h1>
                        <p className="text-secondary text-base leading-relaxed">
                            Here's where things stand with your squads.
                        </p>
                    </div>
                </div>
            </div>

            {/* Balance Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
                {/* You're owed */}
                <div className="relative overflow-hidden bg-surface-light/50 border border-emerald-500/20 rounded-3xl p-7 group hover:border-emerald-500/40 transition-all duration-500 shadow-xl shadow-black/20 backdrop-blur-sm">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/10 transition-colors duration-500" />
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center border border-emerald-500/20 shadow-inner">
                                <ArrowDownLeft className="w-6 h-6 text-emerald-400 drop-shadow" />
                            </div>
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em] bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                                Incoming
                            </span>
                        </div>
                        <p className="text-sm font-medium text-secondary mb-1">You're owed</p>
                        <p className="text-[2rem] font-black text-emerald-400 tracking-tight leading-none">
                            ${formatCurrency(owedToMe)}
                        </p>
                    </div>
                </div>

                {/* You owe */}
                <div className="relative overflow-hidden bg-surface-light/50 border border-amber-500/20 rounded-3xl p-7 group hover:border-amber-500/40 transition-all duration-500 shadow-xl shadow-black/20 backdrop-blur-sm">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-amber-500/10 transition-colors duration-500" />
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 flex items-center justify-center border border-amber-500/20 shadow-inner">
                                <ArrowUpRight className="w-6 h-6 text-amber-400 drop-shadow" />
                            </div>
                            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-[0.2em] bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                                Outgoing
                            </span>
                        </div>
                        <p className="text-sm font-medium text-secondary mb-1">You owe</p>
                        <p className="text-[2rem] font-black text-amber-400 tracking-tight leading-none">
                            ${formatCurrency(iOwe)}
                        </p>
                    </div>
                </div>
            </div>

            <ProUpsellBanner />

            {/* Character customiser quick-link */}
            <Link
                to="/settings/character"
                className="flex items-center gap-4 p-4 mb-8 bg-surface/50 border border-border/60 rounded-2xl hover:border-accent/30 hover:bg-surface transition-all group"
            >
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20 shrink-0">
                    <Palette className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-primary">Customise your character</p>
                    <p className="text-xs text-secondary">Pick your colour, shape, and nickname</p>
                </div>
                <ArrowRight className="w-4 h-4 text-secondary group-hover:text-accent transition-colors shrink-0" />
            </Link>

            {/* Groups Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-black text-primary tracking-tight flex items-center gap-3">
                        Your Shared Groups
                        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-surface-light text-secondary border border-border/80">
                            {groups.length}
                        </span>
                    </h2>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center justify-center gap-2 bg-gradient-to-br from-[#4ADE80] to-[#22C55E] hover:from-[#22C55E] hover:to-[#16a34a] text-[#064E3B] text-sm font-bold px-6 py-3 rounded-2xl transition-all duration-300 shadow-[0_0_20px_rgba(74,222,128,0.3)] hover:shadow-[0_0_25px_rgba(74,222,128,0.5)] hover:-translate-y-0.5 cursor-pointer"
                >
                    <Plus className="w-5 h-5" />
                    New Group
                </button>
            </div>

            {/* Create group form */}
            {showCreate && (
                <div className="bg-surface/60 backdrop-blur-xl border border-accent/30 rounded-[2rem] p-8 mb-10 shadow-[0_20px_60px_-15px_rgba(74,222,128,0.15)] transition-all duration-300 transform origin-top relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent via-[#22C55E] to-accent/20" />

                    <h3 className="text-lg font-bold text-primary mb-5">Create a New Group</h3>

                    <form onSubmit={handleCreate} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                placeholder="Group name (e.g. Ski Trip, Apartment)"
                                autoFocus
                                className="w-full bg-bg/80 border border-border/80 rounded-2xl px-6 py-4 text-base font-medium text-primary placeholder-secondary/40 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all shadow-inner"
                            />
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                            <button
                                type="button"
                                onClick={() => { setShowCreate(false); setNewGroupName(''); }}
                                className="flex-1 sm:flex-none text-secondary hover:text-primary font-medium text-sm px-6 py-4 rounded-2xl bg-surface-light hover:bg-surface border border-transparent hover:border-border transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={creating}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-br from-[#4ADE80] to-[#22C55E] text-[#064E3B] text-sm font-bold px-8 py-4 rounded-2xl transition-all duration-300 shadow-[0_4px_12px_rgba(74,222,128,0.2)] disabled:opacity-50 cursor-pointer hover:-translate-y-0.5"
                            >
                                {creating ? 'Creating...' : 'Create Group'}
                                {!creating && <ArrowRight className="w-4 h-4 ml-1" />}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Groups grid */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-6">
                    <div className="w-14 h-14 relative animate-spin">
                        <div className="absolute inset-0 border-4 border-surface-light rounded-full" />
                        <div className="absolute inset-0 border-4 border-accent border-t-transparent rounded-full shadow-[0_0_15px_rgba(74,222,128,0.5)]" />
                    </div>
                    <p className="text-secondary font-bold tracking-[0.2em] text-xs uppercase animate-pulse">Syncing Spaces...</p>
                </div>
            ) : groups.length === 0 ? (
                <div className="bg-surface/30 border border-border/50 border-dashed rounded-[2.5rem] p-16 text-center transform hover:scale-[1.01] transition-transform duration-500 backdrop-blur-sm">
                    <div className="w-24 h-24 rounded-[2rem] bg-surface-light flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-black/40 border border-border/60 relative group">
                        <div className="absolute inset-0 bg-accent/5 rounded-[2rem] group-hover:bg-accent/10 transition-colors" />
                        <Users className="w-10 h-10 text-secondary" />
                    </div>
                    <h3 className="text-2xl font-black text-primary mb-3">No groups yet</h3>
                    <p className="text-base text-secondary mb-10 max-w-md mx-auto leading-relaxed">
                        Create your first group space to start tracking shared expenses with roommates, friends, or family.
                    </p>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="bg-gradient-to-br from-[#4ADE80] to-[#22C55E] text-[#064E3B] text-sm font-bold px-8 py-4 rounded-2xl transition-all duration-300 shadow-[0_0_20px_rgba(74,222,128,0.3)] hover:shadow-[0_0_25px_rgba(74,222,128,0.5)] hover:-translate-y-0.5 cursor-pointer"
                    >
                        Create your first group
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groups.map((group) => (
                        <GroupCard key={group.id} group={group} />
                    ))}
                </div>
            )}
        </div>
    );
}
