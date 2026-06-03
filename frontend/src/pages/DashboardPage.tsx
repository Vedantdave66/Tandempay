import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../utils/currency';
import { Plus, Users, ArrowRight, Palette, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { groupsApi, balancesApi, GroupListItem, UserBalance } from '../services/api';
import GroupCard from '../components/GroupCard';
import CharacterShape from '../components/CharacterShape';
import ProUpsellBanner from '../components/ProUpsellBanner';
import { useAuth } from '../context/AuthContext';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

export default function DashboardPage() {
    const { user } = useAuth();
    const [groups, setGroups] = useState<GroupListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [creating, setCreating] = useState(false);
    const [owedToMe, setOwedToMe] = useState(0);
    const [iOwe, setIOwe] = useState(0);
    const [groupBalances, setGroupBalances] = useState<Record<string, UserBalance[]>>({});

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

    // Fetch per-group balances in parallel; derive both the group map and hero aggregates
    useEffect(() => {
        if (loading || !user?.id || groups.length === 0) return;
        Promise.all(groups.map(g => balancesApi.getBalances(g.id).then(bs => ({ id: g.id, bs }))))
            .then(results => {
                const byGroup: Record<string, UserBalance[]> = {};
                let owed = 0, owing = 0;
                for (const { id, bs } of results) {
                    byGroup[id] = bs;
                    const me = bs.find(b => b.user_id === user.id);
                    if (!me) continue;
                    if (me.net_balance > 0) owed += Number(me.net_balance);
                    else if (me.net_balance < 0) owing += Math.abs(Number(me.net_balance));
                }
                setGroupBalances(byGroup);
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
            <div className="relative mb-8 px-8 pt-8 sm:px-10 sm:pt-10 rounded-[2rem] overflow-hidden border border-border/60 bg-surface/40 backdrop-blur-xl shadow-2xl shadow-black/40">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-indigo/5 opacity-60" />
                {/* Personalised ambient glow behind character */}
                {user?.character_color && (
                    <div
                        className="absolute left-4 bottom-0 w-48 h-48 rounded-full blur-3xl opacity-25 pointer-events-none transition-colors duration-700"
                        style={{ backgroundColor: user.character_color }}
                    />
                )}
                <div className="relative z-10 flex items-end gap-6 sm:gap-8">
                    {/* Character — hero size with edit badge */}
                    <div className="relative shrink-0">
                        {user?.character_shape && user?.character_color && (
                            <CharacterShape shape={user.character_shape} color={user.character_color} variant="hero" />
                        )}
                        <Link
                            to="/settings/character"
                            aria-label="Customise character"
                            className="group/badge absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-accent flex items-center justify-center shadow-lg shadow-accent/40 hover:bg-accent/90 hover:scale-110 transition-all cursor-pointer"
                        >
                            <Palette className="w-4 h-4 text-white" />
                            <span className="absolute bottom-full right-0 mb-2 px-2 py-1 text-xs font-semibold bg-surface border border-border rounded-lg text-primary whitespace-nowrap opacity-0 group-hover/badge:opacity-100 transition-opacity pointer-events-none shadow-lg">
                                Customise character
                            </span>
                        </Link>
                    </div>
                    {/* Greeting */}
                    <div className="flex-1 pb-8 sm:pb-10">
                        <h1 className="text-4xl sm:text-5xl font-extrabold text-primary tracking-tight mb-2">
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
                        <p className="text-[2rem] font-extrabold text-emerald-400 tracking-tight leading-none">
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
                        <p className="text-[2rem] font-extrabold text-amber-400 tracking-tight leading-none">
                            ${formatCurrency(iOwe)}
                        </p>
                    </div>
                </div>
            </div>

            <ProUpsellBanner />

            {/* Groups Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-extrabold text-primary tracking-tight flex items-center gap-3">
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
                    <h3 className="text-2xl font-extrabold text-primary mb-3">No groups yet</h3>
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
                        <GroupCard
                                key={group.id}
                                group={group}
                                members={groupBalances[group.id] ?? []}
                                myNetBalance={Number(groupBalances[group.id]?.find(b => b.user_id === user?.id)?.net_balance ?? 0)}
                            />
                    ))}
                </div>
            )}
        </div>
    );
}
