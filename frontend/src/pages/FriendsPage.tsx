import { useState, useEffect } from 'react';
import { Users, Search, UserPlus } from 'lucide-react';
import { meApi, Friend } from '../services/api';
import Avatar from '../components/Avatar';

export default function FriendsPage() {
    const [friends, setFriends] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadFriends();
    }, []);

    const loadFriends = async () => {
        setLoading(true);
        try {
            const data = await meApi.getFriends();
            setFriends(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filteredFriends = friends.filter((f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-4xl mx-auto pb-12">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-primary mb-2">Friends</h1>
                    <p className="text-secondary">Everyone you share expenses with across all groups.</p>
                </div>
                <button className="flex items-center justify-center gap-2 bg-gradient-to-br from-indigo/80 to-indigo hover:from-indigo hover:to-indigo-hover text-white text-sm font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-indigo/20 cursor-not-allowed opacity-50">
                    <UserPlus className="w-4 h-4" />
                    Add Friend
                </button>
            </div>

            <div className="bg-surface border border-border rounded-3xl p-6 mb-8">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                    <input
                        type="text"
                        placeholder="Search friends by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-bg border border-border/80 rounded-2xl pl-12 pr-6 py-4 text-sm font-medium text-primary placeholder-secondary/50 focus:outline-none focus:border-indigo focus:ring-1 focus:ring-indigo transition-all shadow-inner"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-8 h-8 border-2 border-indigo border-t-transparent rounded-full animate-spin" />
                </div>
            ) : friends.length === 0 ? (
                <div className="bg-surface/50 border border-border/50 border-dashed rounded-[2rem] p-16 text-center backdrop-blur-sm">
                    <div className="w-20 h-20 rounded-2xl bg-surface-light flex items-center justify-center mx-auto mb-6 shadow-inner border border-border/60">
                        <Users className="w-8 h-8 text-secondary" />
                    </div>
                    <h3 className="text-xl font-bold text-primary mb-2">No friends yet</h3>
                    <p className="text-sm text-secondary max-w-sm mx-auto">
                        Add people to a group to start tracking expenses and sharing costs.
                    </p>
                </div>
            ) : filteredFriends.length === 0 ? (
                <div className="text-center py-20">
                    <p className="text-secondary">No friends match your search.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {filteredFriends.map((friend) => (
                        <div key={friend.id} className="bg-surface hover:bg-surface-hover border border-border rounded-2xl p-5 transition-all duration-300 group cursor-pointer">
                            <div className="flex items-center gap-4 mb-4">
                                <Avatar name={friend.name} color={friend.avatar_color} size="lg" />
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-bold text-primary truncate group-hover:text-indigo transition-colors">{friend.name}</h3>
                                    <p className="text-xs text-secondary truncate">{friend.email}</p>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                                <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Balances</span>
                                <span className="text-sm font-bold text-primary">View Activity &rarr;</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
