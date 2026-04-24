import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    SafeAreaView, RefreshControl, ActivityIndicator
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { groupsApi, GroupListItem } from '../services/api';
import { Users, Plus, ArrowRight } from 'lucide-react-native';

export default function GroupsScreen({ navigation }: any) {
    const { colors, isDark } = useTheme();
    const [groups, setGroups] = useState<GroupListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = async () => {
        try {
            const data = await groupsApi.list();
            setGroups(data || []);
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

    const palette = isDark
        ? ['#1e1b4b', '#064e3b', '#451a03', '#3b0764', '#0f172a']
        : ['#EEF2FF', '#ECFDF5', '#FFF7ED', '#FAF5FF', '#F8FAFC'];

    const renderGroup = ({ item }: { item: GroupListItem }) => {
        const num = Array.from(item.id).reduce((a, c) => a + c.charCodeAt(0), 0);
        const bg = palette[num % palette.length];
        const date = new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        return (
            <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => navigation.navigate('Group', { groupId: item.id })}
                activeOpacity={0.8}
            >
                <View style={[styles.icon, { backgroundColor: bg }]}>
                    <Users color={isDark ? '#F5F7FA' : colors.accent} size={22} />
                </View>
                <View style={styles.info}>
                    <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.meta, { color: colors.secondaryText }]}>
                        {item.member_count} members · {date}
                    </Text>
                </View>
                <View style={styles.right}>
                    <Text style={[styles.amount, { color: colors.text }]}>
                        ${(Number(item.total_expenses) || 0).toFixed(2)}
                    </Text>
                    <ArrowRight color={colors.secondaryText} size={16} />
                </View>
            </TouchableOpacity>
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
    card: {
        flexDirection: 'row', alignItems: 'center', borderRadius: 20,
        padding: 16, marginBottom: 12, borderWidth: 1,
    },
    icon: {
        width: 48, height: 48, borderRadius: 16,
        alignItems: 'center', justifyContent: 'center', marginRight: 14,
    },
    info: { flex: 1 },
    name: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
    meta: { fontSize: 12 },
    right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    amount: { fontSize: 15, fontWeight: '700' },
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
