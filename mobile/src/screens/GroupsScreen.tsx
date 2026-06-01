import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    SafeAreaView, RefreshControl, ActivityIndicator
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { groupsApi, balancesApi, GroupListItem, UserBalance } from '../services/api';
import { Users, Plus } from 'lucide-react-native';
import GroupCard from '../components/GroupCard';

export default function GroupsScreen({ navigation }: any) {
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    const [groups, setGroups] = useState<GroupListItem[]>([]);
    const [balanceMap, setBalanceMap] = useState<Record<string, UserBalance[]>>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = async () => {
        try {
            const raw = await groupsApi.list();
            console.log('[Groups] Raw API response:', JSON.stringify(raw));
            const data: GroupListItem[] = Array.isArray(raw)
                ? raw
                : Array.isArray((raw as any)?.items)
                    ? (raw as any).items
                    : Array.isArray((raw as any)?.groups)
                        ? (raw as any).groups
                        : [];
            setGroups(data);

            try {
                const results = await Promise.all(
                    data.map(g => balancesApi.getBalances(g.id).catch(() => []))
                );
                const map: Record<string, UserBalance[]> = {};
                data.forEach((g, i) => { map[g.id] = results[i]; });
                setBalanceMap(map);
            } catch {
                // balance fetch failure is silent — groups list already rendered
            }
        } catch (err) {
            console.log('[Groups] Fetch error:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        const unsub = navigation.addListener('focus', load);
        return unsub;
    }, [navigation]);

    const renderGroup = ({ item }: { item: GroupListItem }) => {
        const members = balanceMap[item.id];
        const myNetBalance = members?.find(m => m.user_id === user?.id)?.net_balance;
        return (
            <GroupCard
                group={item}
                members={members}
                myNetBalance={myNetBalance}
                onPress={() => navigation.navigate('Group', { groupId: item.id })}
            />
        );
    };

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.title, { color: colors.text }]}>Your Groups</Text>
                    <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
                        {groups.length} active {groups.length === 1 ? 'group' : 'groups'}
                    </Text>
                </View>
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator color={colors.accent} size="large" />
                </View>
            ) : (
                <FlatList
                    data={groups}
                    keyExtractor={i => i.id}
                    renderItem={renderGroup}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.accent} />
                    }
                    ListEmptyComponent={
                        <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Users color={colors.secondaryText} size={44} />
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>No groups yet</Text>
                            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
                                Tap the + button to create your first group.
                            </Text>
                        </View>
                    }
                />
            )}

            {/* FAB */}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: colors.accent, shadowColor: colors.accent }]}
                onPress={() => navigation.navigate('CreateGroup')}
                activeOpacity={0.8}
            >
                <Plus color={isDark ? '#064E3B' : 'white'} size={28} />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    header: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 },
    title: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
    subtitle: { fontSize: 14, marginTop: 4 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { paddingHorizontal: 24, paddingBottom: 140 },
    empty: {
        padding: 40, borderRadius: 24, borderWidth: 1,
        alignItems: 'center', gap: 12, marginTop: 12,
    },
    emptyTitle: { fontSize: 18, fontWeight: '700' },
    emptyText: { fontSize: 14, textAlign: 'center' },
    fab: {
        position: 'absolute', bottom: 100, right: 24,
        width: 60, height: 60, borderRadius: 30,
        alignItems: 'center', justifyContent: 'center',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
    },
});
