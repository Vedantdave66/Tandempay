import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, RefreshControl, StatusBar } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { groupsApi, GroupListItem } from '../services/api';
import { LogOut, Plus, Users, ArrowRight } from 'lucide-react-native';
import ThemeToggle from '../components/ThemeToggle';

export default function DashboardScreen({ navigation }: any) {
    const { user, logout } = useAuth();
    const { colors, isDark } = useTheme();
    const [groups, setGroups] = useState<GroupListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadGroups = async () => {
        try {
            const raw = await groupsApi.list();
            console.log('[Dashboard] Raw groups response:', JSON.stringify(raw));
            // Defensive: handle both plain array and wrapped { groups: [...] } shapes
            const data: GroupListItem[] = Array.isArray(raw)
                ? raw
                : Array.isArray((raw as any)?.groups)
                    ? (raw as any).groups
                    : [];
            setGroups(data);
        } catch (err) {
            console.log('[Dashboard] Failed to load groups:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadGroups();
        });
        return unsubscribe;
    }, [navigation]);

    const onRefresh = () => {
        setRefreshing(true);
        loadGroups();
    };

    const totalSpending = groups.reduce((acc, g) => acc + (Number(g.total_expenses) || 0), 0);

    const renderGroup = ({ item }: { item: GroupListItem }) => {
        // Deterministic dark color based on group ID
        const palette = isDark 
            ? ['#1e1b4b', '#064e3b', '#451a03', '#3b0764', '#0f172a']
            : ['#EEF2FF', '#ECFDF5', '#FFF7ED', '#FAF5FF', '#F8FAFC'];
        const textPalette = isDark ? '#F5F7FA' : '#1E293B';
        
        const num = Array.from(item.id.toString()).reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const bgColor = palette[num % palette.length];

        const date = new Date(item.created_at);
        const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        return (
            <TouchableOpacity
                style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => navigation.navigate('Group', { groupId: item.id })}
                activeOpacity={0.8}
            >
                <View style={[styles.groupIcon, { backgroundColor: bgColor }]}>
                    <Users color={isDark ? '#A8D5A2' : '#6BBF67'} size={22} />
                </View>
                <View style={styles.groupInfo}>
                    <Text style={[styles.groupName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.groupMeta, { color: colors.secondaryText }]}>{item.member_count} members • {formattedDate}</Text>
                </View>
                <View style={styles.groupAmountContainer}>
                    <Text style={[styles.groupAmount, { color: colors.text }]}>${(Number(item.total_expenses) || 0).toFixed(2)}</Text>
                    <ArrowRight color={colors.secondaryText} size={16} />
                </View>
            </TouchableOpacity>
        );
    };

    if (loading && !refreshing) {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
                <View style={styles.center}>
                    <ActivityIndicator color={colors.accent} size="large" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <View>
                    <View style={styles.greetingRow}>
                        <Text style={[styles.greeting, { color: colors.text }]}>Hello, {user?.name.split(' ')[0]}</Text>
                        {user?.subscription_tier === 'pro' && (
                            <View style={styles.proBadge}>
                                <Text style={styles.proBadgeText}>PRO</Text>
                            </View>
                        )}
                    </View>
                    <Text style={[styles.subtitle, { color: colors.secondaryText }]}>Here is your summary</Text>
                </View>
                <View style={styles.headerActions}>
                    <ThemeToggle />
                    <TouchableOpacity onPress={logout} style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <LogOut color={colors.danger} size={20} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.statsContainer}>
                <View style={[styles.statCardPrimary, { backgroundColor: colors.surface, borderColor: isDark ? 'rgba(74, 222, 128, 0.2)' : 'rgba(22, 163, 74, 0.2)' }]}>
                    <Text style={[styles.statLabelPrimary, { color: colors.accent }]}>Total Spending</Text>
                    <Text style={[styles.statValuePrimary, { color: colors.text }]}>${totalSpending.toFixed(2)}</Text>
                </View>
                <View style={styles.statRow}>
                    <View style={[styles.statCardSecondary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.statLabelSecondary, { color: colors.secondaryText }]}>Active Groups</Text>
                        <Text style={[styles.statValueSecondary, { color: colors.text }]}>{groups.length}</Text>
                    </View>
                    <View style={[styles.statCardSecondary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.statLabelSecondary, { color: colors.secondaryText }]}>Avg / Group</Text>
                        <Text style={[styles.statValueSecondary, { color: colors.text }]}>
                            ${groups.length ? (totalSpending / groups.length).toFixed(2) : '0.00'}
                        </Text>
                    </View>
                </View>
            </View>

            <FlatList
                data={groups}
                keyExtractor={(item) => item.id}
                renderItem={renderGroup}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={
                    <View>
                        {user?.subscription_tier !== 'pro' && (
                            <TouchableOpacity
                                style={[styles.upsellBanner, {
                                    backgroundColor: isDark ? 'rgba(74,222,128,0.08)' : 'rgba(22,163,74,0.06)',
                                    borderColor: isDark ? 'rgba(74,222,128,0.2)' : 'rgba(22,163,74,0.2)',
                                }]}
                                onPress={() => navigation.navigate('ProUpgrade')}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.upsellEmoji}>👑</Text>
                                <View style={styles.upsellTextBlock}>
                                    <Text style={[styles.upsellTitle, { color: colors.text }]}>Unlock Pro features</Text>
                                    <Text style={[styles.upsellSub, { color: colors.secondaryText }]}>
                                        Recurring splits, CSV export & more — from $4.99/mo
                                    </Text>
                                </View>
                                <ArrowRight color={colors.accent} size={18} />
                            </TouchableOpacity>
                        )}
                        <View style={styles.listHeader}>
                            <Text style={[styles.listTitle, { color: colors.text }]}>Your Groups</Text>
                        </View>
                    </View>
                }
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
                }
                ListEmptyComponent={
                    <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Users color={colors.secondaryText} size={48} style={{ marginBottom: 16 }} />
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>No groups yet</Text>
                        <Text style={[styles.emptySubtitle, { color: colors.secondaryText }]}>Create a group to start tracking expenses.</Text>
                    </View>
                }
            />

            <TouchableOpacity
                style={[styles.fab, { backgroundColor: colors.accent }]}
                onPress={() => navigation.navigate('CreateGroup')}
                activeOpacity={0.8}
            >
                <Plus color={'#1A1A1A'} size={24} />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 24,
        paddingTop: 28,
        paddingBottom: 20,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    greetingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    greeting: {
        fontSize: 26,
        fontWeight: '700',
        letterSpacing: -0.3,
        marginBottom: 3,
    },
    proBadge: {
        backgroundColor: '#16a34a',
        borderRadius: 4,
        paddingHorizontal: 5,
        paddingVertical: 2,
        alignSelf: 'center',
        marginBottom: 3,
    },
    proBadgeText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 14,
        fontWeight: '400',
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    statsContainer: {
        paddingHorizontal: 24,
        marginBottom: 28,
    },
    statCardPrimary: {
        borderRadius: 20,
        padding: 24,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 4,
    },
    statLabelPrimary: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    statValuePrimary: {
        fontSize: 40,
        fontWeight: '800',
        letterSpacing: -1,
    },
    statRow: {
        flexDirection: 'row',
        gap: 12,
    },
    statCardSecondary: {
        flex: 1,
        borderRadius: 18,
        padding: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    statLabelSecondary: {
        fontSize: 12,
        marginBottom: 6,
        fontWeight: '500',
        letterSpacing: 0.2,
    },
    statValueSecondary: {
        fontSize: 24,
        fontWeight: '700',
    },
    upsellBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 1,
        padding: 14,
        marginBottom: 16,
    },
    upsellEmoji: {
        fontSize: 24,
        marginRight: 12,
    },
    upsellTextBlock: {
        flex: 1,
    },
    upsellTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 2,
    },
    upsellSub: {
        fontSize: 12,
        lineHeight: 17,
    },
    listHeader: {
        marginBottom: 14,
    },
    listTitle: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    listContent: {
        paddingHorizontal: 24,
        paddingBottom: 140,
    },
    groupCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    groupIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    groupInfo: {
        flex: 1,
    },
    groupName: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 3,
    },
    groupMeta: {
        fontSize: 12,
        fontWeight: '400',
    },
    groupAmountContainer: {
        alignItems: 'flex-end',
        flexDirection: 'row',
        gap: 6,
    },
    groupAmount: {
        fontSize: 15,
        fontWeight: '700',
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
        borderRadius: 20,
        marginTop: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 6,
    },
    emptySubtitle: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20,
    },
    fab: {
        position: 'absolute',
        bottom: 110,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
});

