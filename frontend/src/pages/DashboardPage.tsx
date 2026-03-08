import { useState, useEffect } from 'react';
import { Plus, TrendingUp, Receipt, Users, ArrowRight } from 'lucide-react';
import { groupsApi, GroupListItem } from '../services/api';
import GroupCard from '../components/GroupCard';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
    const { user } = useAuth();
    const [groups, setGroups] = useState<GroupListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        try {
            const data = await groupsApi.list();
            setGroups(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGroupName.trim()) return;
        setCreating(true);
        try {
            await groupsApi.create(newGroupName.trim());
            setNewGroupName('');
            setShowCreate(false);
            await loadGroups();
        } catch (err) {
            console.error(err);
        } finally {
            setCreating(false);
        }
    };

    const totalSpending = groups.reduce((sum, g) => sum + g.total_expenses, 0);
    const totalGroups = groups.length;

    return (
        <div className="max-w-5xl mx-auto relative">
            {/* Ambient Background Glow */}
            <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[100px] pointer-events-none -z-10" />
            <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-[#6366F1]/5 rounded-full blur-[100px] pointer-events-none -z-10" />

            {/* Header section with a subtle gradient backdrop */}
            <div className="relative mb-10 p-8 rounded-3xl overflow-hidden border border-border bg-surface/50 backdrop-blur-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent opacity-50" />
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-2 drop-shadow-sm">
                            Welcome back, {user?.name?.split(' ')[0]} 👋
                        </h1>
                        <p className="text-secondary tracking-wide text-sm">Overview of your shared financial spaces</p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
                {/* Total Spending Stat */}
                <div className="relative overflow-hidden bg-surface border border-border/50 rounded-3xl p-6 group hover:border-accent/30 transition-all duration-500 shadow-lg shadow-black/20">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity duration-500 scale-150 -translate-y-4 translate-x-4">
                        <TrendingUp className="w-24 h-24 text-accent" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent/20 to-transparent flex items-center justify-center border border-accent/20">
                                <TrendingUp className="w-6 h-6 text-accent" />
                            </div>
                            <span className="text-xs font-bold text-secondary uppercase tracking-widest">Total Spending</span>
                        </div>
                        <p className="text-4xl font-black text-primary tracking-tight">
                            ${totalSpending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>

                {/* Groups Stat */}
                <div className="relative overflow-hidden bg-surface border border-border/50 rounded-3xl p-6 group hover:border-[#6366F1]/30 transition-all duration-500 shadow-lg shadow-black/20">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity duration-500 scale-150 -translate-y-4 translate-x-4">
                        <Users className="w-24 h-24 text-[#6366F1]" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#6366F1]/20 to-transparent flex items-center justify-center border border-[#6366F1]/20">
                                <Users className="w-6 h-6 text-[#6366F1]" />
                            </div>
                            <span className="text-xs font-bold text-secondary uppercase tracking-widest">Active Groups</span>
                        </div>
                        <p className="text-4xl font-black text-primary tracking-tight">{totalGroups}</p>
                    </div>
                </div>

                {/* Avg per Group Stat */}
                <div className="relative overflow-hidden bg-surface border border-border/50 rounded-3xl p-6 group hover:border-[#F59E0B]/30 transition-all duration-500 shadow-lg shadow-black/20">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity duration-500 scale-150 -translate-y-4 translate-x-4">
                        <Receipt className="w-24 h-24 text-[#F59E0B]" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#F59E0B]/20 to-transparent flex items-center justify-center border border-[#F59E0B]/20">
                                <Receipt className="w-6 h-6 text-[#F59E0B]" />
                            </div>
                            <span className="text-xs font-bold text-secondary uppercase tracking-widest">Avg per Group</span>
                        </div>
                        <p className="text-4xl font-black text-primary tracking-tight">
                            ${totalGroups > 0
                                ? (totalSpending / totalGroups).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                : '0.00'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Groups header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-primary flex items-center gap-3">
                    Your Groups
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-surface-light text-secondary border border-border">
                        {groups.length} total
                    </span>
                </h2>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 bg-white text-black hover:bg-gray-100 text-sm font-bold px-5 py-2.5 rounded-xl transition-all duration-300 shadow-xl shadow-white/10 cursor-pointer"
                >
                    <Plus className="w-4 h-4" />
                    New Group
                </button>
            </div>

            {/* Create group form */}
            {showCreate && (
                <div className="bg-surface/80 backdrop-blur-md border border-accent/40 rounded-3xl p-6 mb-6 shadow-[0_0_40px_-10px_rgba(62,207,142,0.15)] transition-all duration-300 transform origin-top">
                    <form onSubmit={handleCreate} className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="flex-1 w-full relative">
                            <input
                                type="text"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                placeholder="Group name (e.g. NYC Trip, Apartment)"
                                autoFocus
                                className="w-full bg-bg border border-border rounded-xl px-5 py-3.5 text-sm text-primary placeholder-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={() => { setShowCreate(false); setNewGroupName(''); }}
                                className="flex-1 sm:flex-none text-secondary hover:text-primary font-medium text-sm px-6 py-3.5 rounded-xl bg-surface-light hover:bg-surface-hover transition-colors cursor-pointer border border-transparent hover:border-border"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={creating}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-accent to-emerald-400 hover:to-emerald-300 text-white text-sm font-bold px-8 py-3.5 rounded-xl transition-all duration-300 shadow-lg shadow-accent/20 disabled:opacity-50 cursor-pointer"
                            >
                                {creating ? 'Creating...' : 'Create'}
                                {!creating && <ArrowRight className="w-4 h-4" />}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Groups grid */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-4">
                    <div className="w-12 h-12 relative animate-spin">
                        <div className="absolute inset-0 border-4 border-surface-light rounded-full" />
                        <div className="absolute inset-0 border-4 border-accent border-t-transparent rounded-full" />
                    </div>
                    <p className="text-secondary font-medium tracking-wider text-sm animate-pulse">LOADING GROUPS...</p>
                </div>
            ) : groups.length === 0 ? (
                <div className="bg-surface/50 border border-border border-dashed rounded-3xl p-16 text-center transform hover:scale-[1.01] transition-transform duration-500">
                    <div className="w-20 h-20 rounded-3xl bg-surface flex items-center justify-center mx-auto mb-6 shadow-xl shadow-black/20 border border-border">
                        <Users className="w-10 h-10 text-secondary" />
                    </div>
                    <h3 className="text-xl font-bold text-primary mb-3">No groups yet</h3>
                    <p className="text-sm text-secondary mb-8 max-w-sm mx-auto leading-relaxed">
                        Create a group to start tracking shared expenses with your friends, roommates, or family.
                    </p>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="bg-accent hover:bg-accent-hover text-white text-sm font-bold px-8 py-3.5 rounded-xl transition-all duration-300 shadow-lg shadow-accent/20 cursor-pointer"
                    >
                        Create your first group
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {groups.map((group) => (
                        <GroupCard key={group.id} group={group} />
                    ))}
                </div>
            )}
        </div>
    );
}
