import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    SafeAreaView, RefreshControl, ActivityIndicator
} from 'react-native';
import { scale, vs, ms } from '../utils/responsive';
import { useTheme } from '../context/ThemeContext';
import { friendsApi, Friend, PendingRequests } from '../services/api';
import { UserPlus, Check, X, Clock, Users, ChevronRight, Mail } from 'lucide-react-native';

type Tab = 'friends' | 'pending';

function Avatar({ name, color, size = 44 }: { name: string; color: string; size?: number }) {
    return (
        <View style={{
            width: size, height: size, borderRadius: size / 2,
            backgroundColor: color || '#555',
            alignItems: 'center', justifyContent: 'center',
        }}>
            <Text style={{ color: 'white', fontWeight: '700', fontSize: size * 0.38 }}>
                {name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
        </View>
    );
}

export default function PendingRequestsScreen({ navigation }: any) {
    const { colors } = useTheme();
    const [tab, setTab] = useState<Tab>('friends');
    const [friends, setFriends] = useState<Friend[]>([]);
    const [pending, setPending] = useState<PendingRequests>({ sent: [], received: [] });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionId, setActionId] = useState<string | null>(null);

    const load = async () => {
        try {
            const [f, p] = await Promise.all([
                friendsApi.getMyFriends(),
                friendsApi.getPendingRequests(),
            ]);
            setFriends(f || []);
            setPending(p || { sent: [], received: [] });
        } catch (err) {
            console.log(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        const unsub = navigation.addListener('focus', load);
        return unsub;
    }, [navigation]);

    const accept = async (id: string) => {
        setActionId(id);
        try { await friendsApi.acceptRequest(id); await load(); }
        catch (e) { } finally { setActionId(null); }
    };

    const decline = async (id: string) => {
        setActionId(id);
        try { await friendsApi.declineRequest(id); await load(); }
        catch (e) { } finally { setActionId(null); }
    };

    const getTimeAgo = (d: string) => {
        const diff = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
        if (diff < 1) return 'Just now';
        if (diff < 60) return `${diff}m ago`;
        if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
        return `${Math.floor(diff / 1440)}d ago`;
    };

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Network Hub</Text>
                <TouchableOpacity
                    onPress={() => navigation.navigate('AddFriend')}
                    style={[styles.addBtn, { backgroundColor: colors.accent }]}
                >
                    <UserPlus color="#064E3B" size={18} />
                </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {(['friends', 'pending'] as Tab[]).map(t => (
                    <TouchableOpacity
                        key={t}
                        onPress={() => setTab(t)}
                        style={[styles.tab, tab === t && { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}
                    >
                        <Text style={[styles.tabText, { color: tab === t ? colors.text : colors.secondaryText, fontWeight: tab === t ? '700' : '500' }]}>
                            {t === 'friends' ? 'My Friends' : `Pending${(pending.received?.length || 0) > 0 ? ` (${pending.received.length})` : ''}`}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}><ActivityIndicator color={colors.accent} size="large" /></View>
            ) : tab === 'friends' ? (
                <FlatList
                    data={friends}
                    keyExtractor={i => i.id}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.accent} />}
                    ListEmptyComponent={
                        <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Users color={colors.secondaryText} size={40} />
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>No friends yet</Text>
                            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>Add a friend to get started.</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Avatar name={item.name} color={item.avatar_color} />
                            <View style={styles.cardInfo}>
                                <Text style={[styles.cardName, { color: colors.text }]}>{item.name}</Text>
                                <Text style={[styles.cardSub, { color: colors.secondaryText }]}>{item.email}</Text>
                            </View>
                            <View style={[styles.badge, { backgroundColor: `${colors.accent}18`, borderColor: `${colors.accent}30` }]}>
                                <Text style={[styles.badgeText, { color: colors.accent }]}>{item.shared_groups_count || 0} groups</Text>
                            </View>
                        </View>
                    )}
                />
            ) : (
                <FlatList
                    data={[
                        ...pending.received.map(r => ({ ...r, _type: 'received' as const })),
                        ...pending.sent.map(r => ({ ...r, _type: 'sent' as const })),
                    ]}
                    keyExtractor={i => i.id}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.accent} />}
                    ListEmptyComponent={
                        <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Clock color={colors.secondaryText} size={40} />
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>No pending requests</Text>
                        </View>
                    }
                    ListHeaderComponent={() => pending.received.length > 0 ? (
                        <Text style={[styles.sectionLabel, { color: colors.secondaryText }]}>RECEIVED</Text>
                    ) : null}
                    renderItem={({ item }) => (
                        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: item._type === 'received' ? `${colors.accent}30` : colors.border }]}>
                            <Avatar name={item._type === 'received' ? (item.sender_name || '?') : (item.receiver_email[0])} color={item._type === 'received' ? (item.sender_avatar || '#555') : '#555'} />
                            <View style={styles.cardInfo}>
                                <Text style={[styles.cardName, { color: colors.text }]}>
                                    {item._type === 'received' ? (item.sender_name || 'Unknown') : item.receiver_email}
                                </Text>
                                <Text style={[styles.cardSub, { color: colors.secondaryText }]}>
                                    {item._type === 'received' ? 'wants to connect' : `Sent ${getTimeAgo(item.created_at)}`}
                                </Text>
                            </View>
                            {item._type === 'received' ? (
                                <View style={styles.actions}>
                                    <TouchableOpacity onPress={() => decline(item.id)} disabled={!!actionId} style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
                                        <X color={colors.secondaryText} size={16} />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => accept(item.id)} disabled={!!actionId} style={[styles.actionBtn, { backgroundColor: colors.accent }]}>
                                        {actionId === item.id ? <ActivityIndicator color="#064E3B" size="small" /> : <Check color="#064E3B" size={16} />}
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={[styles.badge, { backgroundColor: `${colors.warning}18`, borderColor: `${colors.warning}30` }]}>
                                    <Text style={[styles.badgeText, { color: colors.warning }]}>Pending</Text>
                                </View>
                            )}
                        </View>
                    )}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: scale(24), paddingTop: vs(24), paddingBottom: vs(16),
    },
    title: { fontSize: ms(28), fontWeight: '900', letterSpacing: -0.5 },
    addBtn: { width: 40, height: 40, borderRadius: ms(20), alignItems: 'center', justifyContent: 'center' },
    tabBar: {
        flexDirection: 'row', marginHorizontal: scale(24), marginBottom: vs(16),
        borderRadius: ms(16), padding: scale(4), borderWidth: 1,
    },
    tab: { flex: 1, paddingVertical: vs(10), borderRadius: ms(12), alignItems: 'center' },
    tabText: { fontSize: ms(14) },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { paddingHorizontal: scale(24), paddingBottom: vs(100) },
    card: {
        flexDirection: 'row', alignItems: 'center', borderRadius: ms(20),
        padding: scale(14), marginBottom: vs(10), borderWidth: 1, gap: vs(12),
    },
    cardInfo: { flex: 1 },
    cardName: { fontSize: ms(15), fontWeight: '700', marginBottom: vs(2) },
    cardSub: { fontSize: ms(12) },
    badge: { paddingHorizontal: scale(10), paddingVertical: vs(4), borderRadius: ms(10), borderWidth: 1 },
    badgeText: { fontSize: ms(11), fontWeight: '700' },
    actions: { flexDirection: 'row', gap: vs(8) },
    actionBtn: { width: 36, height: 36, borderRadius: ms(18), alignItems: 'center', justifyContent: 'center' },
    sectionLabel: { fontSize: ms(11), fontWeight: '700', letterSpacing: 0.8, marginBottom: vs(8) },
    empty: { padding: scale(40), borderRadius: ms(24), borderWidth: 1, alignItems: 'center', gap: vs(10), marginTop: vs(12) },
    emptyTitle: { fontSize: ms(17), fontWeight: '700' },
    emptyText: { fontSize: ms(14), textAlign: 'center' },
});
