import React, { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '../utils/formatCurrency';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Modal,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { groupsApi, expensesApi, balancesApi, settlementsApi, friendsApi, Group, Expense, UserBalance, Settlement, Friend } from '../services/api';
import { ArrowLeft, Plus, Send, ArrowRight, Receipt, Users, Mail, UserPlus, X, CheckCircle2 } from 'lucide-react-native';
import CharacterShape from '../components/CharacterShape';

type DetailTab = 'expenses' | 'balances' | 'settle';

export default function GroupDetailScreen({ route, navigation }: any) {
    const { groupId } = route.params;
    const { colors, isDark } = useTheme();
    const { user } = useAuth();

    const [group, setGroup] = useState<Group | null>(null);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [balances, setBalances] = useState<UserBalance[]>([]);
    const [settlements, setSettlements] = useState<Settlement[]>([]);
    const [activeTab, setActiveTab] = useState<DetailTab>('expenses');

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Members modal
    const [membersModalVisible, setMembersModalVisible] = useState(false);
    const [membersTab, setMembersTab] = useState<'friends' | 'invite'>('friends');
    const [friends, setFriends] = useState<Friend[]>([]);
    const [friendsLoading, setFriendsLoading] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);
    const [addingFriendId, setAddingFriendId] = useState<string | null>(null);
    const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        try {
            const [groupData, expensesData, balancesData, settlementsData] = await Promise.all([
                groupsApi.get(groupId),
                expensesApi.list(groupId),
                balancesApi.getBalances(groupId),
                balancesApi.getSettlements(groupId)
            ]);
            setGroup(groupData);
            setExpenses(expensesData.reverse()); // Show newest first
            setBalances(balancesData);
            setSettlements(settlementsData);
        } catch (err) {
            console.error('Failed to load group details', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [groupId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const openMembersModal = async () => {
        setMembersModalVisible(true);
        setMembersTab('friends');
        setFriendsLoading(true);
        try {
            const data = await friendsApi.getMyFriends();
            // Filter out people already in the group
            const memberIds = new Set(group?.members.map(m => m.user_id) || []);
            setFriends((data || []).filter(f => !memberIds.has(f.id)));
        } catch (e) {
            console.error('Failed to load friends', e);
        } finally {
            setFriendsLoading(false);
        }
    };

    const handleAddFriend = async (friend: Friend) => {
        setAddingFriendId(friend.id);
        try {
            await groupsApi.addMember(groupId, friend.email);
            setFriends(prev => prev.filter(f => f.id !== friend.id));
            Alert.alert('Added!', `${friend.name} has been added to the group.`);
            loadData();
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Could not add member.');
        } finally {
            setAddingFriendId(null);
        }
    };

    const handleRemoveMember = (memberId: string, memberName: string) => {
        if (!group) return;
        const isSelf = memberId === user?.id;
        const isCreatorLeaving = isSelf && user?.id === group.created_by;
        const otherMembers = group.members.filter(m => m.user_id !== memberId);
        const title = isCreatorLeaving ? 'Leave group?' : `Remove ${memberName}?`;
        const message = isCreatorLeaving
            ? `You're the creator. Removing yourself will ${otherMembers.length > 0 ? 'transfer ownership to another member' : 'delete the group as you\'re the last member'}. Are you sure?`
            : `Remove ${memberName} from this group?`;
        Alert.alert(title, message, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: isCreatorLeaving ? 'Leave' : 'Remove',
                style: 'destructive',
                onPress: async () => {
                    setRemovingMemberId(memberId);
                    try {
                        await groupsApi.removeMember(groupId, memberId);
                        if (isCreatorLeaving) {
                            navigation.replace('Groups');
                        } else {
                            loadData();
                        }
                    } catch (err: any) {
                        Alert.alert('Error', err.message || 'Failed to remove member.');
                    } finally {
                        setRemovingMemberId(null);
                    }
                },
            },
        ]);
    };

    const handleInviteByEmail = async () => {
        const email = inviteEmail.trim().toLowerCase();
        if (!email || !email.includes('@')) {
            Alert.alert('Invalid Email', 'Please enter a valid email address.');
            return;
        }
        setInviteLoading(true);
        try {
            await groupsApi.addMember(groupId, email);
            setInviteEmail('');
            Alert.alert('Success', `${email} has been added to the group.`);
            loadData();
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Could not add member. Make sure they have a TandemPay account.');
        } finally {
            setInviteLoading(false);
        }
    };

    const handleInitiateSettlement = async (payeeId: string, amount: number) => {
        Alert.alert(
            "Confirm Payment",
            `Do you want to record a $${formatCurrency(amount)} payment to this user? They will receive a notification.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Record Payment",
                    style: "default",
                    onPress: async () => {
                        try {
                            await settlementsApi.create(groupId, payeeId, amount, 'in_app');
                            Alert.alert("Success", "Payment initiated! Check your Payments tab.", [
                                { text: "OK", onPress: () => navigation.navigate("Payments") }
                            ]);
                        } catch (err: any) {
                            Alert.alert("Error", err.message);
                        }
                    }
                }
            ]
        );
    };

    // Look up a member's character appearance from the already-fetched balances list
    const charFor = (userId: string) => balances.find(b => b.user_id === userId);

    if (loading && !refreshing) {
        return (
            <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.center}>
                    <ActivityIndicator color={colors.accent} size="large" />
                </View>
            </SafeAreaView>
        );
    }

    const myBalance = balances.find(b => b.user_id === user?.id);
    const myNet = Number(myBalance?.net_balance ?? 0);
    const isOwe = myNet < -0.01;
    const isOwed = myNet > 0.01;
    const maxBalance = Math.max(...balances.map(b => Math.abs(Number(b.net_balance))), 1);

    return (
        <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Sticky header */}
            <LinearGradient
                colors={isDark ? ['#0A1F12', '#081509', '#0D1210'] : ['#E9F7EF', '#F2FBF6', '#FFFFFF']}
                style={[styles.headerGradient, { borderBottomColor: colors.border }]}
            >
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backRow} activeOpacity={0.7}>
                    <ArrowLeft size={17} color={colors.accentDark} />
                    <Text style={[styles.backText, { color: colors.accentDark }]}>Back</Text>
                </TouchableOpacity>

                <View style={styles.headerTopRow}>
                    <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.8} onPress={openMembersModal}>
                        <Text style={[styles.groupName, { color: colors.text }]} numberOfLines={1}>
                            {group?.name || 'Group'}
                        </Text>
                        <View style={styles.clusterRow}>
                            {(group?.members ?? []).slice(0, 4).map((m, i) => {
                                const c = charFor(m.user_id);
                                return (
                                    <View key={m.user_id} style={[styles.clusterAvatar, i > 0 && { marginLeft: -8 }]}>
                                        <CharacterShape
                                            shape={c?.character_shape ?? 'rect'}
                                            color={c?.character_color ?? m.avatar_color ?? '#6B7280'}
                                            variant="cluster"
                                        />
                                    </View>
                                );
                            })}
                            <Text style={[styles.memberSummary, { color: colors.secondaryText }]}>
                                {group?.members.length ?? 0} members · ${formatCurrency(group?.total_expenses)}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <View style={[styles.balanceChip, { backgroundColor: isOwe ? colors.warningBg : colors.accentBg }]}>
                        {isOwe || isOwed ? (
                            <>
                                <Text style={[styles.balanceChipLabel, { color: isOwe ? colors.warningBright : colors.accent }]}>
                                    {isOwe ? 'YOU OWE' : "YOU'RE OWED"}
                                </Text>
                                <Text style={[styles.balanceChipValue, { color: isOwe ? colors.warningBright : colors.accent }]}>
                                    ${formatCurrency(Math.abs(myNet))}
                                </Text>
                            </>
                        ) : (
                            <Text style={[styles.balanceChipValue, { color: colors.accent }]}>✓ All settled</Text>
                        )}
                    </View>
                </View>

                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
                        onPress={() => navigation.navigate('AddExpense', { groupId, members: group?.members || [] })}
                        activeOpacity={0.85}
                    >
                        <Plus size={16} color={isDark ? '#06371E' : '#0A5F30'} />
                        <Text style={[styles.primaryBtnText, { color: isDark ? '#06371E' : '#0A5F30' }]}>Add expense</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.ghostBtn, { borderColor: colors.warningBright }]}
                        onPress={() => setActiveTab('settle')}
                        activeOpacity={0.85}
                    >
                        <Send size={15} color={colors.warningBright} />
                        <Text style={[styles.ghostBtnText, { color: colors.warningBright }]}>Settle up</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.tabRow}>
                    {([
                        { id: 'expenses' as const, label: `Expenses (${expenses.length})` },
                        { id: 'balances' as const, label: 'Balances' },
                        { id: 'settle' as const, label: `Settle (${settlements.length})` },
                    ]).map(t => {
                        const active = activeTab === t.id;
                        return (
                            <TouchableOpacity
                                key={t.id}
                                onPress={() => setActiveTab(t.id)}
                                style={[styles.tabBtn, { borderBottomColor: active ? colors.accent : 'transparent' }]}
                            >
                                <Text style={[styles.tabBtnText, { color: active ? colors.accent : colors.faintText }]}>
                                    {t.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </LinearGradient>

            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Expenses tab */}
                {activeTab === 'expenses' && (
                    expenses.length === 0 ? (
                        <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Receipt size={40} color={colors.secondaryText} style={{ marginBottom: 12 }} />
                            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>No expenses yet.</Text>
                        </View>
                    ) : expenses.map(expense => {
                        const c = charFor(expense.paid_by);
                        const each = expense.amount / Math.max(expense.participants.length, 1);
                        return (
                            <View key={expense.id} style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <CharacterShape
                                    shape={c?.character_shape ?? 'rect'}
                                    color={c?.character_color ?? expense.payer_avatar_color ?? '#6B7280'}
                                    variant="mini"
                                />
                                <View style={styles.rowInfo}>
                                    <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>{expense.title}</Text>
                                    <Text style={[styles.rowMeta, { color: colors.secondaryText }]}>
                                        {expense.payer_name} paid · split {expense.participants.length} ways
                                    </Text>
                                </View>
                                <View style={styles.rowEnd}>
                                    <Text style={[styles.rowAmount, { color: colors.text }]}>${formatCurrency(expense.amount)}</Text>
                                    <Text style={[styles.rowDate, { color: colors.faintText }]}>
                                        {new Date(expense.created_at).toLocaleDateString()}
                                    </Text>
                                    <Text style={[styles.rowEach, { color: colors.accent }]}>${formatCurrency(each)} each</Text>
                                </View>
                            </View>
                        );
                    })
                )}

                {/* Balances tab */}
                {activeTab === 'balances' && balances.map(b => {
                    const net = Number(b.net_balance);
                    const owesB = net < -0.01;
                    const fillColor = owesB ? colors.warningBright : colors.accent;
                    return (
                        <View key={b.user_id} style={[styles.row, styles.balanceRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <View style={styles.balanceTopRow}>
                                <CharacterShape shape={b.character_shape ?? 'rect'} color={b.character_color ?? '#6B7280'} variant="mini" />
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.rowTitle, { color: colors.text }]}>
                                        {b.user_id === user?.id ? 'You' : b.name}
                                    </Text>
                                    <Text style={[styles.rowMeta, { color: owesB ? colors.warningBright : colors.accent }]}>
                                        {owesB ? `owes $${formatCurrency(Math.abs(net))}` : `gets back $${formatCurrency(Math.abs(net))}`}
                                    </Text>
                                </View>
                            </View>
                            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                                <View style={[styles.progressFill, { backgroundColor: fillColor, width: `${Math.min(Math.abs(net) / maxBalance * 100, 100)}%` }]} />
                            </View>
                            {owesB && b.user_id === user?.id && (
                                <TouchableOpacity
                                    style={[styles.settleLinkBtn, { backgroundColor: colors.warningBg }]}
                                    onPress={() => setActiveTab('settle')}
                                >
                                    <Text style={[styles.settleLinkText, { color: colors.warningBright }]}>Settle up →</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    );
                })}

                {/* Settle tab */}
                {activeTab === 'settle' && (
                    settlements.length === 0 ? (
                        <View style={styles.settledEmpty}>
                            <CharacterShape shape="semi" color="#27B49E" variant="hero" />
                            <Text style={[styles.settledTitle, { color: colors.text }]}>You're all settled up 🎉</Text>
                        </View>
                    ) : settlements.map((s, idx) => {
                        const fr = charFor(s.from_user_id);
                        const to = charFor(s.to_user_id);
                        const isMine = s.from_user_id === user?.id;
                        return (
                            <View key={idx} style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <CharacterShape shape={fr?.character_shape ?? 'rect'} color={fr?.character_color ?? s.from_avatar_color ?? '#6B7280'} variant="mini" />
                                <ArrowRight size={16} color={colors.faintText} />
                                <CharacterShape shape={to?.character_shape ?? 'rect'} color={to?.character_color ?? s.to_avatar_color ?? '#6B7280'} variant="mini" />
                                <View style={styles.rowInfo}>
                                    <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={2}>
                                        Pay ${formatCurrency(s.amount)} via Interac e-Transfer
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={[styles.settleBtn, { backgroundColor: colors.warningBg, opacity: isMine ? 1 : 0.5 }]}
                                    disabled={!isMine}
                                    onPress={() => handleInitiateSettlement(s.to_user_id, s.amount)}
                                >
                                    <Text style={[styles.settleBtnText, { color: colors.warningBright }]}>Settle up</Text>
                                </TouchableOpacity>
                            </View>
                        );
                    })
                )}
            </ScrollView>

            {/* MEMBERS MODAL */}
            <Modal visible={membersModalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Members</Text>
                            <TouchableOpacity onPress={() => setMembersModalVisible(false)} style={[styles.closeModalBtn, { backgroundColor: colors.border }]}>
                                <X size={20} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        {/* Current members with remove buttons */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ color: colors.secondaryText, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                                Current Members
                            </Text>
                            {(group?.members || []).map(m => {
                                const isCreator = m.user_id === group?.created_by;
                                const canRemove = user?.id === group?.created_by || m.user_id === user?.id;
                                return (
                                    <View key={m.user_id} style={[styles.friendRow, { borderColor: colors.border }]}>
                                        <View style={[styles.friendAvatar, { backgroundColor: m.avatar_color || colors.accent }]}>
                                            <Text style={styles.friendAvatarText}>{m.name.charAt(0).toUpperCase()}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: colors.text, fontWeight: '600', fontSize: 15 }}>
                                                {m.name}{isCreator ? ' 👑' : ''}
                                            </Text>
                                            <Text style={{ color: colors.secondaryText, fontSize: 12 }}>{m.email}</Text>
                                        </View>
                                        {canRemove && (
                                            <TouchableOpacity
                                                style={[styles.addBtn, { backgroundColor: 'rgba(239,68,68,0.12)' }]}
                                                onPress={() => handleRemoveMember(m.user_id, m.name)}
                                                disabled={removingMemberId === m.user_id}
                                            >
                                                {removingMemberId === m.user_id
                                                    ? <ActivityIndicator size="small" color="#EF4444" />
                                                    : <X size={16} color="#EF4444" />
                                                }
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                );
                            })}
                        </View>

                        {/* Tab switcher */}
                        <View style={[styles.tabSwitchRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                            <TouchableOpacity
                                style={[styles.tabSwitchBtn, membersTab === 'friends' && { backgroundColor: colors.accent }]}
                                onPress={() => setMembersTab('friends')}
                            >
                                <Users size={14} color={membersTab === 'friends' ? '#fff' : colors.secondaryText} style={{ marginRight: 6 }} />
                                <Text style={[styles.tabSwitchBtnText, { color: membersTab === 'friends' ? '#fff' : colors.secondaryText }]}>Friends</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tabSwitchBtn, membersTab === 'invite' && { backgroundColor: colors.accent }]}
                                onPress={() => setMembersTab('invite')}
                            >
                                <Mail size={14} color={membersTab === 'invite' ? '#fff' : colors.secondaryText} style={{ marginRight: 6 }} />
                                <Text style={[styles.tabSwitchBtnText, { color: membersTab === 'invite' ? '#fff' : colors.secondaryText }]}>Invite by Email</Text>
                            </TouchableOpacity>
                        </View>

                        {membersTab === 'friends' ? (
                            <ScrollView style={{ marginTop: 16 }}>
                                {friendsLoading ? (
                                    <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
                                ) : friends.length === 0 ? (
                                    <View style={{ alignItems: 'center', padding: 32 }}>
                                        <CheckCircle2 size={40} color={colors.accent} style={{ marginBottom: 12 }} />
                                        <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 16, marginBottom: 6 }}>All friends added!</Text>
                                        <Text style={{ color: colors.secondaryText, textAlign: 'center', fontSize: 13 }}>All your TandemPay friends are already in this group, or you have no friends yet.</Text>
                                    </View>
                                ) : (
                                    friends.map(friend => (
                                        <View key={friend.id} style={[styles.friendRow, { borderColor: colors.border }]}>
                                            <View style={[styles.friendAvatar, { backgroundColor: friend.avatar_color || colors.accent }]}>
                                                <Text style={styles.friendAvatarText}>{friend.name.charAt(0).toUpperCase()}</Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ color: colors.text, fontWeight: '600', fontSize: 15 }}>{friend.name}</Text>
                                                <Text style={{ color: colors.secondaryText, fontSize: 12 }}>{friend.email}</Text>
                                            </View>
                                            <TouchableOpacity
                                                style={[styles.addBtn, { backgroundColor: addingFriendId === friend.id ? colors.border : colors.accent }]}
                                                onPress={() => handleAddFriend(friend)}
                                                disabled={addingFriendId === friend.id}
                                            >
                                                {addingFriendId === friend.id
                                                    ? <ActivityIndicator size="small" color="#fff" />
                                                    : <UserPlus size={16} color="#fff" />
                                                }
                                            </TouchableOpacity>
                                        </View>
                                    ))
                                )}
                            </ScrollView>
                        ) : (
                            <View style={{ marginTop: 20 }}>
                                <Text style={{ color: colors.secondaryText, fontSize: 13, marginBottom: 12 }}>Enter their email address. They must have a TandemPay account.</Text>
                                <View style={[styles.emailInputRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
                                    <Mail size={18} color={colors.secondaryText} style={{ marginRight: 10 }} />
                                    <TextInput
                                        style={[styles.emailInput, { color: colors.text }]}
                                        placeholder="friend@example.com"
                                        placeholderTextColor={colors.secondaryText}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        value={inviteEmail}
                                        onChangeText={setInviteEmail}
                                    />
                                </View>
                                <TouchableOpacity
                                    style={[styles.inviteBtn, { backgroundColor: colors.accent, opacity: inviteLoading ? 0.7 : 1 }]}
                                    onPress={handleInviteByEmail}
                                    disabled={inviteLoading}
                                >
                                    {inviteLoading
                                        ? <ActivityIndicator color="#fff" />
                                        : <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>Add to Group</Text>
                                    }
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Sticky header
    headerGradient: {
        paddingHorizontal: 20,
        paddingTop: 4,
        borderBottomWidth: 1,
    },
    backRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingBottom: 12,
        alignSelf: 'flex-start',
    },
    backText: { fontSize: 14, fontWeight: '700' },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 14,
    },
    groupName: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
    clusterRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginTop: 8,
    },
    clusterAvatar: {
        transform: [{ translateY: 2 }],
    },
    memberSummary: { fontSize: 13, fontWeight: '600', marginLeft: 10 },
    balanceChip: {
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 8,
        alignItems: 'flex-end',
    },
    balanceChipLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
    balanceChipValue: { fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },

    actionRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    primaryBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        borderRadius: 13,
        paddingVertical: 12,
    },
    primaryBtnText: { fontSize: 14, fontWeight: '700' },
    ghostBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        borderRadius: 13,
        borderWidth: 1.5,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    ghostBtnText: { fontSize: 14, fontWeight: '700' },

    tabRow: { flexDirection: 'row' },
    tabBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 3,
    },
    tabBtnText: { fontSize: 13.5, fontWeight: '600' },

    scrollContent: { padding: 16, paddingBottom: 100, gap: 10 },

    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
    },
    rowInfo: { flex: 1, minWidth: 0 },
    rowTitle: { fontSize: 15, fontWeight: '600' },
    rowMeta: { fontSize: 12, marginTop: 2 },
    rowEnd: { alignItems: 'flex-end' },
    rowAmount: { fontSize: 16, fontWeight: '700' },
    rowDate: { fontSize: 11, marginTop: 2 },
    rowEach: { fontSize: 12, fontWeight: '600', marginTop: 2 },

    balanceRow: { flexDirection: 'column', alignItems: 'stretch', gap: 10 },
    balanceTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 3 },
    settleLinkBtn: {
        alignSelf: 'flex-start',
        borderRadius: 11,
        paddingHorizontal: 14,
        paddingVertical: 9,
    },
    settleLinkText: { fontSize: 13, fontWeight: '700' },

    settleBtn: {
        borderRadius: 11,
        paddingHorizontal: 14,
        paddingVertical: 9,
    },
    settleBtnText: { fontSize: 13, fontWeight: '700' },

    settledEmpty: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 60,
    },
    settledTitle: { fontSize: 17, fontWeight: '700', marginTop: 8 },

    emptyState: {
        padding: 40,
        borderRadius: 24,
        borderWidth: 1,
        alignItems: 'center',
    },
    emptyText: { fontSize: 14 },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        minHeight: '40%',
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '900',
    },
    closeModalBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Members modal
    tabSwitchRow: {
        flexDirection: 'row',
        borderRadius: 12,
        borderWidth: 1,
        padding: 4,
        gap: 4,
    },
    tabSwitchBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 9,
        borderRadius: 8,
    },
    tabSwitchBtnText: {
        fontSize: 13,
        fontWeight: '600',
    },
    friendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        gap: 12,
    },
    friendAvatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
    },
    friendAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    addBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emailInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: 14,
        paddingHorizontal: 14,
        height: 52,
        marginBottom: 16,
    },
    emailInput: {
        flex: 1,
        fontSize: 15,
    },
    inviteBtn: {
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
