import React, { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '../utils/formatCurrency';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Modal,
  Alert,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { groupsApi, expensesApi, balancesApi, settlementsApi, friendsApi, Group, Expense, UserBalance, Settlement, Friend } from '../services/api';
import { ArrowLeft, Plus, Users, Receipt, Send, ArrowRight, X, CheckCircle2, Mail, UserPlus } from 'lucide-react-native';
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
    const [tab, setTab] = useState<DetailTab>('expenses');

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
                            loadData();
                        } catch (err: any) {
                            Alert.alert("Error", err.message);
                        }
                    }
                }
            ]
        );
    };

    if (loading && !refreshing) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.center}>
                    <ActivityIndicator color={colors.accent} size="large" />
                </View>
            </SafeAreaView>
        );
    }

    const myBalance = balances.find(b => b.user_id === user?.id);
    const myNet = myBalance?.net_balance ?? 0;
    const isOwe = myNet < -0.01;
    const isOwed = myNet > 0.01;
    const maxBalance = Math.max(...balances.map(b => Math.abs(b.net_balance)), 1);

    const renderTabBtn = (id: DetailTab, label: string) => (
        <TouchableOpacity
            key={id}
            onPress={() => setTab(id)}
            style={[styles.tabBtn, tab === id && { borderBottomColor: colors.accent, borderBottomWidth: 3 }]}
            activeOpacity={0.7}
        >
            <Text style={[styles.tabBtnText, { color: tab === id ? colors.accent : colors.faintText }]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Sticky gradient header */}
            <LinearGradient
                colors={isDark ? ['#0A1F12', '#081509', '#0D1210'] : ['#E9F7EF', '#F2FBF6', '#FFFFFF']}
                style={[styles.headerGradient, { borderBottomColor: colors.border }]}
            >
                <View style={styles.headerTopRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backRow} activeOpacity={0.7}>
                        <ArrowLeft size={17} color={colors.accentDark} />
                        <Text style={[styles.backText, { color: colors.accentDark }]}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={openMembersModal}
                        style={[styles.membersBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                        <Users size={17} color={colors.accent} />
                    </TouchableOpacity>
                </View>

                <View style={styles.headerMainRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.groupName, { color: colors.text }]} numberOfLines={1}>
                            {group?.name || 'Group Details'}
                        </Text>
                        <View style={styles.clusterRow}>
                            {(group?.members || []).slice(0, 4).map((m, i) => (
                                <View key={m.user_id} style={{ marginLeft: i === 0 ? 0 : -10, zIndex: 4 - i }}>
                                    <CharacterShape shape="rect" color={m.avatar_color} variant="cluster" />
                                </View>
                            ))}
                            <Text style={[styles.memberCountText, { color: colors.secondaryText }]} numberOfLines={1}>
                                {group?.members.length ?? 0} members · ${formatCurrency(group?.total_expenses)}
                            </Text>
                        </View>
                    </View>

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
                            <Text style={[styles.balanceChipSettled, { color: colors.accent }]}>✓ All settled</Text>
                        )}
                    </View>
                </View>

                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[styles.addExpenseBtn, { backgroundColor: colors.accent }]}
                        onPress={() => navigation.navigate('AddExpense', { groupId, members: group?.members || [] })}
                        activeOpacity={0.85}
                    >
                        <Plus size={16} color={isDark ? '#064E3B' : '#fff'} />
                        <Text style={[styles.addExpenseBtnText, { color: isDark ? '#064E3B' : '#fff' }]}>Add expense</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.settleGhostBtn, { borderColor: colors.warningBright, backgroundColor: colors.surface }]}
                        onPress={() => setTab('settle')}
                        activeOpacity={0.85}
                    >
                        <Send size={15} color={colors.warningBright} />
                        <Text style={[styles.settleGhostBtnText, { color: colors.warningBright }]}>Settle up</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.tabBar}>
                    {renderTabBtn('expenses', `Expenses (${expenses.length})`)}
                    {renderTabBtn('balances', 'Balances')}
                    {renderTabBtn('settle', `Settle (${settlements.length})`)}
                </View>
            </LinearGradient>

            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
                contentContainerStyle={styles.scrollContent}
            >
                {tab === 'expenses' && (
                    expenses.length === 0 ? (
                        <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Receipt size={40} color={colors.secondaryText} style={{ marginBottom: 12 }} />
                            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>No expenses yet.</Text>
                        </View>
                    ) : (
                        expenses.map(expense => {
                            const each = expense.amount / Math.max(expense.participants.length, 1);
                            return (
                                <View key={expense.id} style={[styles.expenseRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                    <CharacterShape shape="rect" color={expense.payer_avatar_color} variant="mini" />
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={[styles.expenseTitle, { color: colors.text }]} numberOfLines={1}>{expense.title}</Text>
                                        <Text style={[styles.expenseMeta, { color: colors.secondaryText }]} numberOfLines={1}>
                                            {expense.payer_name} paid · split {expense.participants.length} ways
                                        </Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={[styles.expenseAmount, { color: colors.text }]}>${formatCurrency(expense.amount)}</Text>
                                        <View style={styles.expenseSubRow}>
                                            <Text style={[styles.expenseDate, { color: colors.faintText }]}>
                                                {new Date(expense.created_at).toLocaleDateString()}
                                            </Text>
                                            <Text style={[styles.expenseEach, { color: colors.accent }]}> · ${formatCurrency(each)} each</Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        })
                    )
                )}

                {tab === 'balances' && (
                    balances.slice().sort((a, b) => b.net_balance - a.net_balance).map(b => {
                        const owesAmt = b.net_balance < -0.01;
                        const isMe = b.user_id === user?.id;
                        return (
                            <View
                                key={b.user_id}
                                style={[styles.balanceRow, { backgroundColor: colors.surface, borderColor: owesAmt ? colors.warning : colors.border }]}
                            >
                                <View style={styles.balanceRowTop}>
                                    <CharacterShape shape="rect" color={b.avatar_color} variant="mini" />
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={[styles.balanceRowName, { color: colors.text }]}>{isMe ? 'You' : b.name}</Text>
                                        <Text style={[styles.balanceRowSub, { color: owesAmt ? colors.warningBright : colors.accent }]}>
                                            {owesAmt ? `owes $${formatCurrency(Math.abs(b.net_balance))}` : `gets back $${formatCurrency(b.net_balance)}`}
                                        </Text>
                                    </View>
                                </View>
                                <View style={[styles.progressTrack, { backgroundColor: owesAmt ? colors.warningBg : colors.accentBgFaint }]}>
                                    <View style={[styles.progressFill, {
                                        width: `${(Math.abs(b.net_balance) / maxBalance) * 100}%`,
                                        backgroundColor: owesAmt ? colors.warningBright : colors.accent,
                                    }]} />
                                </View>
                                {owesAmt && isMe && (
                                    <TouchableOpacity
                                        style={[styles.settleUpInline, { backgroundColor: colors.warningBg }]}
                                        onPress={() => setTab('settle')}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.settleUpInlineText, { color: colors.warningBright }]}>Settle up →</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        );
                    })
                )}

                {tab === 'settle' && (
                    settlements.length === 0 ? (
                        <View style={styles.settleEmpty}>
                            <CharacterShape shape="semi" color="#27B49E" variant="hero" />
                            <Text style={[styles.settleEmptyTitle, { color: colors.text }]}>You're all settled up 🎉</Text>
                        </View>
                    ) : (
                        settlements.map((s, idx) => {
                            const isMine = s.from_user_id === user?.id;
                            return (
                                <View key={idx} style={[styles.settleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                    <CharacterShape shape="rect" color={s.from_avatar_color} variant="mini" />
                                    <ArrowRight size={16} color={colors.faintText} style={{ marginHorizontal: 8 }} />
                                    <CharacterShape shape="rect" color={s.to_avatar_color} variant="mini" />
                                    <View style={{ flex: 1, marginLeft: 10 }}>
                                        <Text style={[styles.settleText, { color: colors.text }]} numberOfLines={1}>
                                            Pay ${formatCurrency(s.amount)} via Interac e-Transfer
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.settleBtn, { backgroundColor: colors.warningBg, opacity: isMine ? 1 : 0.4 }]}
                                        onPress={() => isMine && handleInitiateSettlement(s.to_user_id, s.amount)}
                                        disabled={!isMine}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.settleBtnText, { color: colors.warningBright }]}>Settle up</Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        })
                    )
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
                        <View style={[styles.tabRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                            <TouchableOpacity
                                style={[styles.modalTabBtn, membersTab === 'friends' && { backgroundColor: colors.accent }]}
                                onPress={() => setMembersTab('friends')}
                            >
                                <Users size={14} color={membersTab === 'friends' ? '#fff' : colors.secondaryText} style={{ marginRight: 6 }} />
                                <Text style={[styles.modalTabBtnText, { color: membersTab === 'friends' ? '#fff' : colors.secondaryText }]}>Friends</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalTabBtn, membersTab === 'invite' && { backgroundColor: colors.accent }]}
                                onPress={() => setMembersTab('invite')}
                            >
                                <Mail size={14} color={membersTab === 'invite' ? '#fff' : colors.secondaryText} style={{ marginRight: 6 }} />
                                <Text style={[styles.modalTabBtnText, { color: membersTab === 'invite' ? '#fff' : colors.secondaryText }]}>Invite by Email</Text>
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
    scrollContent: { padding: 16, paddingBottom: 100, gap: 10 },

    // Sticky header
    headerGradient: {
        paddingHorizontal: 20,
        paddingTop: 8,
        borderBottomWidth: 1,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    backRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingVertical: 4,
    },
    backText: { fontSize: 14, fontWeight: '700' },
    membersBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    headerMainRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 14,
        gap: 12,
    },
    groupName: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    clusterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    memberCountText: {
        fontSize: 13,
        fontWeight: '600',
        marginLeft: 8,
    },
    balanceChip: {
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 8,
        alignItems: 'flex-end',
    },
    balanceChipLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
    balanceChipValue: { fontSize: 19, fontWeight: '800', letterSpacing: -0.3, marginTop: 2 },
    balanceChipSettled: { fontSize: 14, fontWeight: '800' },

    actionRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 14,
    },
    addExpenseBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        borderRadius: 13,
        paddingVertical: 12,
    },
    addExpenseBtnText: { fontSize: 14, fontWeight: '700' },
    settleGhostBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        borderRadius: 13,
        borderWidth: 1.5,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    settleGhostBtnText: { fontSize: 14, fontWeight: '700' },

    tabBar: {
        flexDirection: 'row',
    },
    tabBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
    },
    tabBtnText: { fontSize: 13.5, fontWeight: '600' },

    // Expenses tab
    expenseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
    },
    expenseTitle: { fontSize: 15, fontWeight: '600' },
    expenseMeta: { fontSize: 12, marginTop: 2 },
    expenseAmount: { fontSize: 16, fontWeight: '700' },
    expenseSubRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    expenseDate: { fontSize: 11 },
    expenseEach: { fontSize: 11, fontWeight: '700' },

    // Balances tab
    balanceRow: {
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        gap: 10,
    },
    balanceRowTop: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    balanceRowName: { fontSize: 15, fontWeight: '700' },
    balanceRowSub: { fontSize: 13, fontWeight: '600', marginTop: 2 },
    progressTrack: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    settleUpInline: {
        alignSelf: 'flex-start',
        borderRadius: 11,
        paddingHorizontal: 14,
        paddingVertical: 9,
    },
    settleUpInlineText: { fontSize: 13, fontWeight: '700' },

    // Settle tab
    settleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
    },
    settleText: { fontSize: 14, fontWeight: '600' },
    settleBtn: {
        borderRadius: 11,
        paddingHorizontal: 14,
        paddingVertical: 9,
    },
    settleBtnText: { fontSize: 13, fontWeight: '700' },
    settleEmpty: {
        alignItems: 'center',
        paddingVertical: 50,
        gap: 8,
    },
    settleEmptyTitle: { fontSize: 17, fontWeight: '700', marginTop: 8 },

    emptyState: {
        padding: 40,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
    },
    emptyText: { fontSize: 14 },

    // Members modal (unchanged)
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
    tabRow: {
        flexDirection: 'row',
        borderRadius: 12,
        borderWidth: 1,
        padding: 4,
        gap: 4,
    },
    modalTabBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 9,
        borderRadius: 8,
    },
    modalTabBtnText: {
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
