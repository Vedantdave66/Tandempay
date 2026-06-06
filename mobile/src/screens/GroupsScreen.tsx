import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { scale, vs, ms } from '../utils/responsive';
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
                    style={[styles.newButton, {
                        backgroundColor: colors.accent,
                        shadowColor: colors.accent,
                        shadowOpacity: 0.5,
                        shadowRadius: 10,
                        shadowOffset: { width: 0, height: 5 },
                        elevation: 6,
                    }]}
                    activeOpacity={0.85}
                >
                    <Text style={styles.newButtonText}>+ New</Text>
                </TouchableOpacity>
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator color={colors.accent} size="large" />
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={[styles.list, { paddingBottom: vs(120) }]}
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
        paddingHorizontal: scale(16),
        paddingTop: vs(8),
        paddingBottom: vs(16),
    },
    title: { fontSize: ms(26), fontWeight: '800', letterSpacing: -0.6 },
    newButton: {
        borderRadius: ms(12),
        paddingHorizontal: scale(14),
        paddingVertical: vs(9),
    },
    newButtonText: { fontSize: ms(13), fontWeight: '700', color: '#fff' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { paddingHorizontal: scale(16) },
    empty: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: vs(14),
        paddingVertical: vs(80),
    },
    emptyTitle: { fontSize: ms(18), fontWeight: '600' },
    emptyAction: { fontSize: ms(15), fontWeight: '700' },
});
