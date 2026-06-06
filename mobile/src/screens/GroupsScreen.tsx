import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { groupsApi, balancesApi, GroupListItem, UserBalance } from '../services/api';
import { Plus } from 'lucide-react-native';
import GroupCard from '../components/GroupCard';
import CharacterShape from '../components/CharacterShape';

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

    return (
        <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
            <ScrollView
                contentContainerStyle={{ paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.accent} />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>Your squads</Text>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('CreateGroup')}
                        style={[styles.newBtn, { backgroundColor: colors.accent, shadowColor: colors.accent }]}
                        activeOpacity={0.85}
                    >
                        <Plus size={16} color={isDark ? '#064E3B' : '#fff'} />
                        <Text style={[styles.newBtnText, { color: isDark ? '#064E3B' : '#fff' }]}>New</Text>
                    </TouchableOpacity>
                </View>

                {loading && !refreshing ? (
                    <View style={styles.center}>
                        <ActivityIndicator color={colors.accent} size="large" />
                    </View>
                ) : groups.length === 0 ? (
                    <View style={styles.empty}>
                        <CharacterShape shape="round" color={colors.accent} variant="hero" />
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>No squads yet</Text>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('CreateGroup')}
                            style={[styles.createBtn, { backgroundColor: colors.accent }]}
                            activeOpacity={0.85}
                        >
                            <Text style={[styles.createBtnText, { color: isDark ? '#064E3B' : '#fff' }]}>Create one →</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.list}>
                        {groups.map(item => {
                            const members = balanceMap[item.id];
                            const myNetBalance = members?.find(m => m.user_id === user?.id)?.net_balance;
                            return (
                                <GroupCard
                                    key={item.id}
                                    group={item}
                                    members={members}
                                    myNetBalance={myNetBalance}
                                    onPress={() => navigation.navigate('Group', { groupId: item.id })}
                                />
                            );
                        })}
                    </View>
                )}
            </ScrollView>
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
    title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
    newBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 13,
        paddingHorizontal: 15,
        paddingVertical: 10,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 4,
    },
    newBtnText: { fontSize: 14, fontWeight: '700' },
    center: { paddingVertical: 80, alignItems: 'center', justifyContent: 'center' },
    list: { paddingHorizontal: 16, gap: 16 },
    empty: {
        alignItems: 'center',
        gap: 14,
        paddingVertical: 60,
        paddingHorizontal: 24,
    },
    emptyTitle: { fontSize: 18, fontWeight: '600' },
    createBtn: {
        borderRadius: 13,
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    createBtnText: { fontSize: 15, fontWeight: '700' },
});
