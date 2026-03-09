import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { groupsApi, GroupListItem } from '../services/api';
import { LogOut, Plus, Users, ArrowRight } from 'lucide-react-native';

export default function DashboardScreen({ navigation }: any) {
    const { user, logout } = useAuth();
    const [groups, setGroups] = useState<GroupListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadGroups = async () => {
        try {
            const data = await groupsApi.list();
            setGroups(data);
        } catch (err) {
            console.log('Failed to load groups', err);
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

    const totalSpending = groups.reduce((acc, g) => acc + g.total_expenses, 0);

    const renderGroup = ({ item }: { item: GroupListItem }) => {
        // Deterministic dark color based on group ID
        const colors = ['#1e1b4b', '#064e3b', '#451a03', '#3b0764', '#0f172a'];
        const num = Array.from(item.id).reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const bgColor = colors[num % colors.length];

        const date = new Date(item.created_at);
        const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        return (
            <TouchableOpacity
                style={styles.groupCard}
                onPress={() => navigation.navigate('Group', { groupId: item.id })}
                activeOpacity={0.8}
            >
                <View style={[styles.groupIcon, { backgroundColor: bgColor }]}>
                    <Users color="#F5F7FA" size={24} />
                </View>
                <View style={styles.groupInfo}>
                    <Text style={styles.groupName}>{item.name}</Text>
                    <Text style={styles.groupMeta}>{item.member_count} members • {formattedDate}</Text>
                </View>
                <View style={styles.groupAmountContainer}>
                    <Text style={styles.groupAmount}>${item.total_expenses.toFixed(2)}</Text>
                    <ArrowRight color="#A1A1AA" size={16} />
                </View>
            </TouchableOpacity>
        );
    };

    if (loading && !refreshing) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.center}>
                    <ActivityIndicator color="#4ADE80" size="large" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Hello, {user?.name.split(' ')[0]}</Text>
                    <Text style={styles.subtitle}>Here is your summary</Text>
                </View>
                <TouchableOpacity onPress={logout} style={styles.logoutButton}>
                    <LogOut color="#A1A1AA" size={20} />
                </TouchableOpacity>
            </View>

            <View style={styles.statsContainer}>
                <View style={styles.statCardPrimary}>
                    <Text style={styles.statLabelPrimary}>Total Spending</Text>
                    <Text style={styles.statValuePrimary}>${totalSpending.toFixed(2)}</Text>
                </View>
                <View style={styles.statRow}>
                    <View style={styles.statCardSecondary}>
                        <Text style={styles.statLabelSecondary}>Active Groups</Text>
                        <Text style={styles.statValueSecondary}>{groups.length}</Text>
                    </View>
                    <View style={styles.statCardSecondary}>
                        <Text style={styles.statLabelSecondary}>Avg / Group</Text>
                        <Text style={styles.statValueSecondary}>
                            ${groups.length ? (totalSpending / groups.length).toFixed(2) : '0.00'}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.listHeader}>
                <Text style={styles.listTitle}>Your Groups</Text>
            </View>

            <FlatList
                data={groups}
                keyExtractor={(item) => item.id}
                renderItem={renderGroup}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4ADE80" />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Users color="#A1A1AA" size={48} style={{ marginBottom: 16 }} />
                        <Text style={styles.emptyTitle}>No groups yet</Text>
                        <Text style={styles.emptySubtitle}>Create a group to start tracking expenses.</Text>
                    </View>
                }
            />

            <TouchableOpacity
                style={styles.fab}
            // Later: onPress={() => setModalVisible(true)}
            >
                <Plus color="#064E3B" size={24} />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#09090B',
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
        paddingTop: 24,
        paddingBottom: 16,
    },
    greeting: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#F5F7FA',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#A1A1AA',
    },
    logoutButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#111318',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    statsContainer: {
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    statCardPrimary: {
        backgroundColor: '#111318',
        borderRadius: 24,
        padding: 24,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(74, 222, 128, 0.2)',
    },
    statLabelPrimary: {
        fontSize: 14,
        color: '#4ADE80',
        fontWeight: '600',
        marginBottom: 8,
    },
    statValuePrimary: {
        fontSize: 40,
        fontWeight: '900',
        color: '#F5F7FA',
        letterSpacing: -1,
    },
    statRow: {
        flexDirection: 'row',
        gap: 12,
    },
    statCardSecondary: {
        flex: 1,
        backgroundColor: '#111318',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    statLabelSecondary: {
        fontSize: 12,
        color: '#A1A1AA',
        marginBottom: 8,
    },
    statValueSecondary: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#F5F7FA',
    },
    listHeader: {
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    listTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#F5F7FA',
    },
    listContent: {
        paddingHorizontal: 24,
        paddingBottom: 100, // accommodate fab
    },
    groupCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111318',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    groupIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    groupInfo: {
        flex: 1,
    },
    groupName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#F5F7FA',
        marginBottom: 4,
    },
    groupMeta: {
        fontSize: 12,
        color: '#A1A1AA',
    },
    groupAmountContainer: {
        alignItems: 'flex-end',
        flexDirection: 'row',
        gap: 8,
    },
    groupAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#F5F7FA',
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
        backgroundColor: '#111318',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        marginTop: 12,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#F5F7FA',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#A1A1AA',
        textAlign: 'center',
    },
    fab: {
        position: 'absolute',
        bottom: 32,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#4ADE80',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#4ADE80',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 10,
    },
});
