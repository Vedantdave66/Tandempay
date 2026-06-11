import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, RefreshControl, ScrollView, Alert,
} from 'react-native';
import { scale, vs, ms } from '../utils/responsive';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { groupsApi, balancesApi, GroupListItem, UserBalance } from '../services/api';
import { T } from '../utils/typography';
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

    const handleGroupLongPress = (item: GroupListItem) => {
        const isCreator = item.created_by === user?.id;

        if (isCreator) {
            Alert.alert(
                'Delete Group',
                `"${item.name}" will be permanently deleted for all members. This cannot be undone.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                await groupsApi.deleteGroup(item.id);
                                load();
                            } catch (err: any) {
                                Alert.alert('Error', err.message || 'Could not delete group.');
                            }
                        },
                    },
                ]
            );
        } else {
            Alert.alert(
                'Leave Group',
                `You'll be removed from "${item.name}".`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Leave',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                await groupsApi.removeMember(item.id, user!.id);
                                load();
                            } catch (err: any) {
                                Alert.alert('Error', err.message || 'Could not leave group.');
                            }
                        },
                    },
                ]
            );
        }
    };

    return (
        <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.title, { color: colors.text }, T.bold]}>Your squads</Text>
                    <Text style={[styles.subtitle, { color: colors.secondaryText }, T.regular]}>
                        {groups.length === 0 ? 'Nothing yet' : `${groups.length} squad${groups.length === 1 ? '' : 's'}`}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={() => navigation.navigate('CreateGroup')}
                    style={[styles.newButton, { backgroundColor: colors.accentBg }]}
                    activeOpacity={0.70}
                >
                    <Text style={[styles.newButtonText, { color: colors.accent }, T.semibold]}>+ New</Text>
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
                            <Text style={[styles.emptyTitle, { color: colors.text }, T.semibold]}>No squads yet</Text>
                            <Text style={[styles.emptyDesc, { color: colors.secondaryText }, T.regular]}>
                                Roommates, road trips, group dinners — make a squad and stop doing math.
                            </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('CreateGroup')} activeOpacity={0.75}>
                                <Text style={[styles.emptyAction, { color: colors.accent }, T.semibold]}>Create one</Text>
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
                                    onMorePress={() => handleGroupLongPress(item)}
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
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingHorizontal: scale(20),
        paddingTop: vs(16),
        paddingBottom: vs(16),
    },
    title: { fontSize: ms(28), letterSpacing: -0.8 },
    subtitle: { fontSize: ms(13), marginTop: vs(2) },
    newButton: {
        borderRadius: 999,
        paddingHorizontal: scale(14),
        paddingVertical: vs(8),
    },
    newButtonText: { fontSize: ms(14) },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { paddingHorizontal: scale(20) },
    empty: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: vs(8),
        paddingVertical: vs(32),
        paddingHorizontal: scale(32),
    },
    emptyTitle: { fontSize: ms(17), marginTop: vs(8) },
    emptyDesc: { fontSize: ms(15), textAlign: 'center', lineHeight: 21 },
    emptyAction: { fontSize: ms(17), marginTop: vs(8) },
});
