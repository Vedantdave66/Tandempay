import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { groupsApi, balancesApi, GroupListItem, UserBalance } from '../services/api';
import GroupCard from '../components/GroupCard';
import CharacterShape from '../components/CharacterShape';

export default function GroupsScreen({ navigation }: any) {
    const { colors } = useTheme();
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

    const onRefresh = () => {
        setRefreshing(true);
        load();
    };

    return (
        <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Your squads</Text>
                <TouchableOpacity
                    onPress={() => navigation.navigate('CreateGroup')}
                    style={[styles.newButton, { backgroundColor: colors.accent }]}
                    activeOpacity={0.85}
                >
                    <Text style={[styles.newButtonText, { color: '#0A5F30' }]}>+ New</Text>
                </TouchableOpacity>
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator color={colors.accent} size="large" />
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={[styles.list, { paddingBottom: 120 }]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
                    }
                >
                    {groups.length === 0 ? (
                        <View style={styles.empty}>
                            <CharacterShape shape="round" color={colors.accent} variant="hero" />
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>No squads yet</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('CreateGroup')} activeOpacity={0.8}>
                                <Text style={[styles.emptyAction, { color: colors.accentDark }]}>Create one →</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        groups.map(item => {
                            const members = balanceMap[item.id];
                            const myNetBalance = members?.find(m => m.user_id === user?.id)?.net_balance;
                            return (
                                <GroupCard
                                    key={item.id}
                                    group={item}
                                    members={members}
                                    myNetBalance={myNetBalance}
                                    compact={false}
                                    onPress={() => navigation.navigate('Group', { groupId: item.id })}
                                />
                            );
                        })
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 16,
    },
    title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
    newButton: {
        borderRadius: 13,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    newButtonText: { fontSize: 14, fontWeight: '700' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { paddingHorizontal: 16 },
    empty: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        paddingVertical: 80,
    },
    emptyTitle: { fontSize: 18, fontWeight: '600' },
    emptyAction: { fontSize: 15, fontWeight: '700' },
});
