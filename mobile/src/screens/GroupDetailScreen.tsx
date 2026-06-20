import React, { useState, useEffect, useCallback, useRef } from 'react';
import { formatCurrency } from '../utils/formatCurrency';
import { scale, vs, ms } from '../utils/responsive';
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
  StatusBar,
  Animated,
  Easing,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { groupsApi, expensesApi, balancesApi, settlementsApi, friendsApi, Group, Expense, UserBalance, Settlement, Friend } from '../services/api';
import { ArrowLeft, Plus, Send, ArrowRight, Receipt, Users, Mail, UserPlus, X, CheckCircle2, LayoutList, Orbit, Trash2, Share2, Info } from 'lucide-react-native';
import { T } from '../utils/typography';
import CharacterShape from '../components/CharacterShape';
import CanvasModeView from '../components/CanvasModeView';
import SkeletonBlock from '../components/SkeletonBlock';
import PressableScale from '../components/PressableScale';

type DetailTab = 'expenses' | 'balances' | 'settle';

export default function GroupDetailScreen({ route, navigation }: any) {
    const { groupId } = route.params;
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    const insets = useSafeAreaInsets();

    useFocusEffect(useCallback(() => {
        StatusBar.setTranslucent(true);
        StatusBar.setBackgroundColor('transparent');
        return () => {
            StatusBar.setTranslucent(false);
            StatusBar.setBackgroundColor('transparent');
        };
    }, []));

    const [group, setGroup] = useState<Group | null>(null);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [balances, setBalances] = useState<UserBalance[]>([]);
    const [settlements, setSettlements] = useState<Settlement[]>([]);
    const [activeTab, setActiveTab] = useState<DetailTab>('expenses');

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [canvasMode, setCanvasMode] = useState(false);
    const expenseAnims = useRef(
        Array.from({ length: 10 }, () => new Animated.Value(0))
    ).current;
    const [membersModalVisible, setMembersModalVisible] = useState(false);
    const [membersTab, setMembersTab] = useState<'friends' | 'invite'>('friends');
    const [friends, setFriends] = useState<Friend[]>([]);
    const [friendsLoading, setFriendsLoading] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);
    const [addingFriendId, setAddingFriendId] = useState<string | null>(null);
    const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [shareLoading, setShareLoading] = useState(false);

    function toArray<T>(raw: any): T[] {
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.items)) return raw.items;
        if (Array.isArray(raw?.expenses)) return raw.expenses;
        if (Array.isArray(raw?.balances)) return raw.balances;
        if (Array.isArray(raw?.settlements)) return raw.settlements;
        return [];
    }

    useEffect(() => {
        if (expenses.length === 0) return;
        const count = Math.min(expenses.length, 5);
        expenseAnims.forEach(a => a.setValue(0));
        Animated.stagger(40,
            expenseAnims.slice(0, count).map(anim =>
                Animated.timing(anim, {
                    toValue: 1,
                    duration: 220,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                })
            )
        ).start();
        expenseAnims.slice(5).forEach(a => a.setValue(1));
    }, [expenses.length]);

    const loadData = useCallback(async () => {
        try {
            const [groupData, expensesRaw, balancesRaw, settlementsRaw] = await Promise.all([
                groupsApi.get(groupId),
                expensesApi.list(groupId),
                balancesApi.getBalances(groupId),
                balancesApi.getSettlements(groupId),
            ]);
            setGroup(groupData);
            setExpenses(toArray<Expense>(expensesRaw).slice().reverse());
            setBalances(toArray<UserBalance>(balancesRaw));
            setSettlements(toArray<Settlement>(settlementsRaw));
        } catch (err) {
            console.error('Failed to load group details', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [groupId]);

    // Refetch on every focus, not just mount — so character edits made in
    // the profile (yours or, since the last visit, a friend's) flow into the
    // member list and the canvas without a manual pull-to-refresh.
    useFocusEffect(useCallback(() => {
        loadData();
    }, [loadData]));

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const openMembersModal = async () => {
        setMembersModalVisible(true);
        setMembersTab('friends');
        setFriendsLoading(true);
        try {
            const raw = await friendsApi.getMyFriends();
            const allFriends: Friend[] = toArray<Friend>(raw);
            const memberIds = new Set(group?.members.map(m => m.user_id) || []);
            setFriends(allFriends.filter(f => !memberIds.has(f.id)));
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
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                        Alert.alert('Error', err.message || 'Failed to remove member.');
                    } finally {
                        setRemovingMemberId(null);
                    }
                },
            },
        ]);
    };

    const handleDeleteExpense = (expense: Expense) => {
        Alert.alert(
            'Delete expense',
            `Remove "${expense.title}" ($${formatCurrency(expense.amount)})? This can't be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setDeletingId(expense.id);
                        try {
                            await expensesApi.delete(groupId, expense.id);
                            setExpenses(prev => prev.filter(e => e.id !== expense.id));
                        } catch {
                            Alert.alert('Error', 'Could not delete this expense. Try again.');
                        } finally {
                            setDeletingId(null);
                        }
                    },
                },
            ]
        );
    };

    const handleShareInvite = async () => {
        if (!group) return;
        setShareLoading(true);
        try {
            const result = await groupsApi.generateInvite(groupId);
            await Share.share({
                message: `Join ${group.name} on TandemPay! Split bills and settle free via Interac. ${result.invite_url}`,
            });
        } catch (err: any) {
            if (err.message !== 'The user did not share') {
                Alert.alert('Error', err.message || 'Could not generate invite link.');
            }
        } finally {
            setShareLoading(false);
        }
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
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', err.message || 'Could not add member. Make sure they have a TandemPay account.');
        } finally {
            setInviteLoading(false);
        }
    };

    const showToast = useCallback((msg: string) => {
        setToastMsg(msg);
        toastAnim.setValue(0);
        Animated.sequence([
            Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.delay(1800),
            Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(() => setToastMsg(null));
    }, [toastAnim]);

    const handleEditSave = async () => {
        if (!editTarget) return;
        const trimTitle = editTitle.trim();
        const parsedAmount = parseFloat(editAmount);
        if (!trimTitle) return void Alert.alert('Title required', 'Please enter a title.');
        if (isNaN(parsedAmount) || parsedAmount <= 0) return void Alert.alert('Invalid amount', 'Enter a value greater than 0.');
        setEditSaving(true);
        Keyboard.dismiss();
        try {
            const updated = await expensesApi.patch(editTarget.id, { title: trimTitle, amount: parsedAmount });
            setExpenses(prev => prev.map(e => e.id === updated.id ? updated : e));
            setEditTarget(null);
            showToast('Expense updated');
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Could not update expense.');
        } finally {
            setEditSaving(false);
        }
    };

    const charFor = (userId: string) => balances.find(b => b.user_id === userId);

    if (loading && !refreshing) {
        // Skeleton — the group's silhouette breathing while data arrives.
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {/* Header ghost: back row, group name, member cluster, balance chip */}
                <View style={{ paddingTop: insets.top + vs(8), paddingHorizontal: scale(20) }}>
                    <SkeletonBlock width={scale(56)} height={vs(14)} radius={ms(6)} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: vs(16) }}>
                        <View style={{ gap: vs(10), flex: 1 }}>
                            <SkeletonBlock width={'55%'} height={vs(24)} radius={ms(8)} delay={120} />
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6) }}>
                                <SkeletonBlock width={scale(28)} height={scale(28)} radius={scale(14)} delay={240} />
                                <SkeletonBlock width={scale(28)} height={scale(28)} radius={scale(14)} delay={240} style={{ marginLeft: -scale(10) }} />
                                <SkeletonBlock width={scale(28)} height={scale(28)} radius={scale(14)} delay={240} style={{ marginLeft: -scale(10) }} />
                                <SkeletonBlock width={scale(110)} height={vs(12)} radius={ms(6)} delay={240} style={{ marginLeft: scale(6) }} />
                            </View>
                        </View>
                        <SkeletonBlock width={scale(84)} height={vs(52)} radius={ms(14)} delay={360} />
                    </View>
                </View>

                {/* Expense rows ghost */}
                <View style={{ paddingHorizontal: scale(20), marginTop: vs(28), gap: vs(14) }}>
                    <SkeletonBlock width={'100%'} height={vs(72)} radius={ms(20)} delay={480} />
                    <SkeletonBlock width={'100%'} height={vs(72)} radius={ms(20)} delay={600} />
                    <SkeletonBlock width={'100%'} height={vs(72)} radius={ms(20)} delay={720} />
                    <SkeletonBlock width={'100%'} height={vs(72)} radius={ms(20)} delay={840} />
                </View>
            </View>
        );
    }

    const myBalance = balances.find(b => b.user_id === user?.id);
    const myNet = Number(myBalance?.net_balance ?? 0);
    const isOwe = myNet < -0.01;
    const isOwed = myNet > 0.01;
    const maxBalance = Math.max(...balances.map(b => Math.abs(Number(b.net_balance))), 1);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <LinearGradient
                colors={colors.heroGradient}
                locations={[0, 0.35, 1]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={[styles.headerGradient, { borderBottomColor: colors.border, paddingTop: insets.top + vs(8) }]}
            >
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backRow} activeOpacity={0.70}>
                    <ArrowLeft size={17} color={isDark ? colors.accent : colors.accentDark} />
                    <Text style={[styles.backText, { color: isDark ? colors.accent : colors.accentDark }, T.bold]}>Back</Text>
                </TouchableOpacity>

                <View style={styles.headerTopRow}>
                    <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.88} onPress={openMembersModal}>
                        <Text style={[styles.groupName, { color: colors.text }, T.extrabold]} numberOfLines={1}>
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
                            <Text style={[styles.memberSummary, { color: colors.secondaryText }, T.semibold]}>
                                {group?.members.length ?? 0} members · ${formatCurrency(group?.total_expenses)}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.headerRightCol}>
                        <View style={[styles.balanceChip, {
                            backgroundColor: isOwe
                                ? colors.warningBg
                                : isOwed
                                    ? colors.accentBg
                                    : colors.accentBg,
                            borderRadius: 14,
                        }]}>
                            {isOwe || isOwed ? (
                                <>
                                    <Text style={[styles.balanceChipLabel, { color: isOwe ? colors.warningBright : colors.accent }, T.extrabold]}>
                                        {isOwe ? 'YOU OWE' : "YOU'RE OWED"}
                                    </Text>
                                    <Text style={[styles.balanceChipValue, { color: isOwe ? colors.warningBright : colors.accent, fontVariant: ['tabular-nums'] }, T.extrabold]}>
                                        ${formatCurrency(Math.abs(myNet))}
                                    </Text>
                                </>
                            ) : (
                                <Text style={[styles.balanceChipValue, { color: colors.accent }, T.extrabold]}>✓ All settled</Text>
                            )}
                        </View>
                        <TouchableOpacity
                            onPress={() => {
                                // Entering canvas — silently pull fresh member
                                // characters so the scene matches everyone's
                                // latest shape/color/nickname
                                if (!canvasMode) loadData();
                                setCanvasMode(v => !v);
                                Haptics.selectionAsync();
                            }}
                            style={[
                                styles.canvasToggleBtn,
                                {
                                    backgroundColor: canvasMode ? colors.accent + '29' : 'rgba(255,255,255,0.07)',
                                    borderColor: canvasMode ? colors.accent + '52' : 'rgba(255,255,255,0.09)',
                                },
                            ]}
                            activeOpacity={0.8}
                        >
                            {canvasMode
                                ? <Orbit size={13} color={colors.accent} />
                                : <LayoutList size={13} color='#8A918E' />
                            }
                            <Text style={[styles.canvasToggleText, { color: canvasMode ? colors.accent : '#8A918E' }, T.bold]}>
                                {canvasMode ? 'Canvas' : 'List'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[styles.primaryBtn, {
                            backgroundColor: colors.accent,
                            shadowColor: colors.accent,
                            shadowOpacity: 0.22,
                            shadowRadius: 8,
                            shadowOffset: { width: 0, height: 6 },
                            elevation: 6,
                        }]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            navigation.navigate('AddExpense', { groupId, members: group?.members || [] });
                        }}
                        activeOpacity={0.82}
                    >
                        <Plus size={16} color="#fff" />
                        <Text style={[styles.primaryBtnText, { color: '#fff' }, T.bold]}>Add expense</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.ghostBtn, { borderColor: colors.gold }]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setActiveTab('settle');
                        }}
                        activeOpacity={0.82}
                    >
                        <Send size={15} color={colors.gold} />
                        <Text style={[styles.ghostBtnText, { color: colors.gold }, T.bold]}>Settle up</Text>
                    </TouchableOpacity>
                    {user?.id === group?.created_by && (
                        <TouchableOpacity
                            style={[styles.ghostBtn, { borderColor: colors.accent, opacity: shareLoading ? 0.6 : 1 }]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                handleShareInvite();
                            }}
                            disabled={shareLoading}
                            activeOpacity={0.82}
                        >
                            {shareLoading
                                ? <ActivityIndicator size="small" color={colors.accent} />
                                : <Share2 size={15} color={colors.accent} />
                            }
                            {!shareLoading && (
                                <Text style={[styles.ghostBtnText, { color: colors.accent }, T.bold]}>Invite</Text>
                            )}
                        </TouchableOpacity>
                    )}
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
                                style={styles.tabBtn}
                                activeOpacity={0.88}
                            >
                                <Text style={[styles.tabBtnText, { color: active ? colors.accent : colors.faintText }, active ? T.bold : T.semibold]}>
                                    {t.label}
                                </Text>
                                <View style={[styles.tabUnderline, { backgroundColor: active ? colors.accent : 'transparent' }]} />
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </LinearGradient>

            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
                contentContainerStyle={styles.scrollContent}
            >
                {activeTab === 'expenses' && (
                    expenses.length === 0 ? (
                        <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Receipt size={40} color={colors.secondaryText} style={{ marginBottom: vs(12) }} />
                            <Text style={[styles.emptyText, { color: colors.secondaryText }, T.regular]}>No expenses yet.</Text>
                        </View>
                    ) : expenses.map((expense, expIdx) => {
                        const c = charFor(expense.paid_by);
                        const each = expense.amount / Math.max(expense.participants.length, 1);
                        const paidByMe = expense.paid_by === user?.id;
                        return (
                            <Animated.View key={expense.id} style={{ opacity: expenseAnims[expIdx] ?? 1 }}>
                            <View style={[styles.row, {
                                backgroundColor: colors.surface,
                                shadowColor: isDark ? '#000' : '#0A3020',
                                shadowOpacity: isDark ? 0.28 : 0.10,
                                shadowRadius: isDark ? 14 : 10,
                                shadowOffset: { width: 0, height: isDark ? 10 : 4 },
                                elevation: isDark ? 6 : 4,
                            }]}>
                                <CharacterShape
                                    shape={c?.character_shape ?? 'rect'}
                                    color={c?.character_color ?? expense.payer_avatar_color ?? '#6B7280'}
                                    variant="mini"
                                />
                                <View style={styles.rowInfo}>
                                    <Text style={[styles.rowTitle, { color: colors.text }, T.semibold]} numberOfLines={1}>{expense.title}</Text>
                                    <Text style={[styles.rowMeta, { color: colors.secondaryText }, T.regular]}>
                                        {expense.payer_name} paid · split {expense.participants.length} ways
                                    </Text>
                                </View>
                                <View style={styles.rowEnd}>
                                    <Text style={[styles.rowAmount, { color: paidByMe ? colors.accent : colors.gold, fontVariant: ['tabular-nums'] }, T.bold]}>
                                        ${formatCurrency(expense.amount)}
                                    </Text>
                                    <Text style={[styles.rowDate, { color: colors.faintText }, T.regular]}>
                                        {new Date(expense.created_at).toLocaleDateString()}
                                    </Text>
                                    <Text style={[styles.rowEach, { color: colors.accent, fontVariant: ['tabular-nums'] }, T.semibold]}>${formatCurrency(each)} each</Text>
                                    {paidByMe && (
                                        <TouchableOpacity
                                            onPress={() => handleDeleteExpense(expense)}
                                            disabled={deletingId === expense.id}
                                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                            activeOpacity={0.7}
                                            style={{ marginTop: vs(4), opacity: deletingId === expense.id ? 0.4 : 1 }}
                                        >
                                            {deletingId === expense.id
                                                ? <ActivityIndicator size="small" color={colors.danger} />
                                                : <Trash2 size={ms(15)} color={colors.danger} />
                                            }
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity
                                        onPress={() => {
                                            setEditTarget(expense);
                                            setEditTitle(expense.title);
                                            setEditAmount(String(expense.amount));
                                        }}
                                        hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                                        activeOpacity={0.7}
                                        style={{ marginTop: vs(4) }}
                                    >
                                        <Pencil size={ms(15)} color={colors.secondaryText} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            </Animated.View>
                        );
                    })
                )}

                {activeTab === 'balances' && balances.map(b => {
                    const net = Number(b.net_balance);
                    const owesB = net < -0.01;
                    const fillColor = owesB ? colors.warningBright : colors.accent;
                    return (
                        <View key={b.user_id} style={[styles.row, styles.balanceRow, {
                            backgroundColor: colors.surface,
                            shadowColor: isDark ? '#000' : '#0A3020',
                            shadowOpacity: isDark ? 0.18 : 0.07,
                            shadowRadius: 8,
                            shadowOffset: { width: 0, height: 4 },
                            elevation: isDark ? 4 : 2,
                        }]}>
                            <View style={styles.balanceTopRow}>
                                <CharacterShape shape={b.character_shape ?? 'rect'} color={b.character_color ?? '#6B7280'} variant="mini" />
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.rowTitle, { color: colors.text }, T.semibold]}>
                                        {b.user_id === user?.id ? 'You' : b.name}
                                    </Text>
                                    <Text style={[styles.rowMeta, { color: owesB ? colors.warningBright : colors.accent, fontVariant: ['tabular-nums'] }, T.semibold]}>
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
                                    activeOpacity={0.88}
                                >
                                    <Text style={[styles.settleLinkText, { color: colors.warningBright }, T.bold]}>Settle up →</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    );
                })}

                {activeTab === 'settle' && (
                    settlements.length === 0 ? (
                        <View style={styles.settledEmpty}>
                            <CharacterShape shape="semi" color="#27B49E" variant="hero" />
                            <Text style={[styles.settledTitle, { color: colors.text }, T.bold]}>You're all settled up 🎉</Text>
                        </View>
                    ) : settlements.map((s, idx) => {
                        const fr = charFor(s.from_user_id);
                        const to = charFor(s.to_user_id);
                        const isMine = s.from_user_id === user?.id;
                        return (
                            <View key={idx} style={[styles.row, {
                                backgroundColor: colors.surface,
                                shadowColor: isDark ? '#000' : '#0A3020',
                                shadowOpacity: isDark ? 0.28 : 0.10,
                                shadowRadius: isDark ? 14 : 10,
                                shadowOffset: { width: 0, height: isDark ? 10 : 4 },
                                elevation: isDark ? 6 : 4,
                                flexDirection: 'column',
                                alignItems: 'stretch',
                                gap: vs(8),
                            }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(12) }}>
                                    <CharacterShape shape={fr?.character_shape ?? 'rect'} color={fr?.character_color ?? s.from_avatar_color ?? '#6B7280'} variant="mini" />
                                    <ArrowRight size={16} color={colors.faintText} />
                                    <CharacterShape shape={to?.character_shape ?? 'rect'} color={to?.character_color ?? s.to_avatar_color ?? '#6B7280'} variant="mini" />
                                    <View style={styles.rowInfo}>
                                        <Text style={[styles.rowTitle, { color: colors.text }, T.semibold]} numberOfLines={2}>
                                            Pay ${formatCurrency(s.amount)} via Interac e-Transfer
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.settleBtn, { backgroundColor: colors.warningBg, opacity: isMine ? 1 : 0.5 }]}
                                        disabled={!isMine}
                                        onPress={() => {
                                            if (!isMine) return;
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                            const toMember = group?.members?.find((m: any) => m.id === s.to_user_id || m.user_id === s.to_user_id);
                                            navigation.navigate('SettleUp', {
                                                payment: {
                                                    payee_id:           s.to_user_id,
                                                    payee_name:         toMember?.name ?? 'User',
                                                    payee_email:        toMember?.email ?? '',
                                                    payee_avatar_color: to?.character_color ?? s.to_avatar_color ?? '#6B7280',
                                                    amount:             s.amount,
                                                    group_id:           groupId,
                                                    payer_id:           user?.id,
                                                    id:                 (s as any).id ?? null,
                                                    description:        group?.name ?? 'Expense',
                                                }
                                            });
                                        }}
                                        activeOpacity={0.82}
                                    >
                                        <Text style={[styles.settleBtnText, { color: colors.warningBright }, T.bold]}>Settle up</Text>
                                    </TouchableOpacity>
                                </View>
                                {s.amount > 0 && (
                                    <View style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: scale(6),
                                        backgroundColor: colors.warningBg,
                                        borderRadius: ms(10),
                                        paddingVertical: vs(6),
                                        paddingHorizontal: scale(10),
                                    }}>
                                        <Info size={14} color={colors.warning} />
                                        <Text style={[{ color: colors.warning, flex: 1 }, T.caption]}>
                                            {'Paying by card? Add $'}{(s.amount * 0.029 + 0.30).toFixed(2)}{' to cover processing fees'}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}
            </ScrollView>

            <Modal visible={membersModalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }, T.extrabold]}>Members</Text>
                            <TouchableOpacity onPress={() => setMembersModalVisible(false)} style={[styles.closeModalBtn, { backgroundColor: colors.border }]} activeOpacity={0.88}>
                                <X size={20} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={{ marginBottom: vs(16) }}>
                            <Text style={{ color: colors.secondaryText, fontSize: ms(11), ...T.extrabold, textTransform: 'uppercase', letterSpacing: 1.3, marginBottom: vs(10) }}>
                                Current Members
                            </Text>
                            {(group?.members || []).map(m => {
                                const isCreator = m.user_id === group?.created_by;
                                const canRemove = user?.id === group?.created_by || m.user_id === user?.id;
                                return (
                                    <View key={m.user_id} style={[styles.friendRow, { borderColor: colors.border }]}>
                                        <View style={[styles.friendAvatar, { backgroundColor: m.avatar_color || colors.accent }]}>
                                            <Text style={[styles.friendAvatarText, T.bold]}>{m.name.charAt(0).toUpperCase()}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: colors.text, fontSize: ms(15), ...T.semibold }}>
                                                {m.name}{isCreator ? ' 👑' : ''}
                                            </Text>
                                            <Text style={{ color: colors.secondaryText, fontSize: ms(12), ...T.regular }}>{m.email}</Text>
                                        </View>
                                        {canRemove && (
                                            <TouchableOpacity
                                                style={[styles.addBtn, { backgroundColor: 'rgba(239,68,68,0.12)' }]}
                                                onPress={() => handleRemoveMember(m.user_id, m.name)}
                                                disabled={removingMemberId === m.user_id}
                                                activeOpacity={0.82}
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

                        <View style={[styles.tabSwitchRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                            <TouchableOpacity
                                style={[styles.tabSwitchBtn, membersTab === 'friends' && { backgroundColor: colors.accent }]}
                                onPress={() => setMembersTab('friends')}
                                activeOpacity={0.82}
                            >
                                <Users size={14} color={membersTab === 'friends' ? '#fff' : colors.secondaryText} style={{ marginRight: scale(6) }} />
                                <Text style={[styles.tabSwitchBtnText, { color: membersTab === 'friends' ? '#fff' : colors.secondaryText }, T.semibold]}>Friends</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tabSwitchBtn, membersTab === 'invite' && { backgroundColor: colors.accent }]}
                                onPress={() => setMembersTab('invite')}
                                activeOpacity={0.82}
                            >
                                <Mail size={14} color={membersTab === 'invite' ? '#fff' : colors.secondaryText} style={{ marginRight: scale(6) }} />
                                <Text style={[styles.tabSwitchBtnText, { color: membersTab === 'invite' ? '#fff' : colors.secondaryText }, T.semibold]}>Invite by Email</Text>
                            </TouchableOpacity>
                        </View>

                        {membersTab === 'friends' ? (
                            <ScrollView style={{ marginTop: vs(16) }}>
                                {friendsLoading ? (
                                    <ActivityIndicator color={colors.accent} style={{ marginTop: vs(24) }} />
                                ) : friends.length === 0 ? (
                                    <View style={{ alignItems: 'center', padding: scale(32) }}>
                                        <CheckCircle2 size={40} color={colors.accent} style={{ marginBottom: vs(12) }} />
                                        <Text style={{ color: colors.text, fontSize: ms(16), marginBottom: vs(6), ...T.bold }}>All friends added!</Text>
                                        <Text style={{ color: colors.secondaryText, textAlign: 'center', fontSize: ms(13), ...T.regular }}>All your TandemPay friends are already in this group, or you have no friends yet.</Text>
                                    </View>
                                ) : (
                                    friends.map(friend => (
                                        <View key={friend.id} style={[styles.friendRow, { borderColor: colors.border }]}>
                                            <View style={[styles.friendAvatar, { backgroundColor: friend.avatar_color || colors.accent }]}>
                                                <Text style={[styles.friendAvatarText, T.bold]}>{friend.name.charAt(0).toUpperCase()}</Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ color: colors.text, fontSize: ms(15), ...T.semibold }}>{friend.name}</Text>
                                                <Text style={{ color: colors.secondaryText, fontSize: ms(12), ...T.regular }}>{friend.email}</Text>
                                            </View>
                                            <TouchableOpacity
                                                style={[styles.addBtn, { backgroundColor: addingFriendId === friend.id ? colors.border : colors.accent }]}
                                                onPress={() => handleAddFriend(friend)}
                                                disabled={addingFriendId === friend.id}
                                                activeOpacity={0.82}
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
                            <View style={{ marginTop: vs(20) }}>
                                <Text style={{ color: colors.secondaryText, fontSize: ms(13), ...T.regular, marginBottom: vs(12) }}>Enter their email address. They must have a TandemPay account.</Text>
                                <View style={[styles.emailInputRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
                                    <Mail size={18} color={colors.secondaryText} style={{ marginRight: scale(10) }} />
                                    <TextInput
                                        style={[styles.emailInput, { color: colors.text, ...T.regular }]}
                                        placeholder="friend@example.com"
                                        placeholderTextColor={colors.secondaryText}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        value={inviteEmail}
                                        onChangeText={setInviteEmail}
                                    />
                                </View>
                                <TouchableOpacity
                                    style={[styles.inviteBtn, {
                                        backgroundColor: colors.accent,
                                        opacity: inviteLoading ? 0.7 : 1,
                                        shadowColor: colors.accent,
                                        shadowOpacity: 0.44,
                                        shadowRadius: 12,
                                        shadowOffset: { width: 0, height: 8 },
                                        elevation: 8,
                                    }]}
                                    onPress={handleInviteByEmail}
                                    disabled={inviteLoading}
                                    activeOpacity={0.82}
                                >
                                    {inviteLoading
                                        ? <ActivityIndicator color="#fff" />
                                        : <Text style={{ color: '#fff', fontSize: ms(15), ...T.bold }}>Add to Group</Text>
                                    }
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Edit expense sheet */}
            <Modal
                visible={editTarget !== null}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setEditTarget(null)}
            >
                <View style={styles.editOverlay}>
                    <View style={[styles.editSheet, { backgroundColor: colors.surface }]}>
                        <View style={[styles.editHandle, { backgroundColor: colors.border }]} />
                        <Text style={[styles.editSheetTitle, { color: colors.text }, T.bold]}>Edit Expense</Text>
                        <Text style={[styles.editLabel, { color: colors.secondaryText }, T.semibold]}>Title</Text>
                        <TextInput
                            style={[styles.editInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }, T.regular]}
                            value={editTitle}
                            onChangeText={setEditTitle}
                            placeholder="Expense title"
                            placeholderTextColor={colors.faintText}
                            autoCapitalize="sentences"
                        />
                        <Text style={[styles.editLabel, { color: colors.secondaryText }, T.semibold]}>Amount</Text>
                        <TextInput
                            style={[styles.editInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }, T.regular]}
                            value={editAmount}
                            onChangeText={setEditAmount}
                            placeholder="0.00"
                            placeholderTextColor={colors.faintText}
                            keyboardType="decimal-pad"
                        />
                        <PressableScale
                            scaleTo={0.97}
                            haptic="medium"
                            onPress={handleEditSave}
                            disabled={editSaving}
                            style={[styles.editSaveBtn, { backgroundColor: colors.accent, opacity: editSaving ? 0.7 : 1 }]}
                        >
                            {editSaving
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <Text style={[styles.editSaveBtnText, T.bold]}>Save changes</Text>
                            }
                        </PressableScale>
                        <TouchableOpacity onPress={() => setEditTarget(null)} activeOpacity={0.7} style={styles.editCancelLink}>
                            <Text style={[styles.editCancelText, { color: colors.secondaryText }, T.regular]}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {toastMsg && (
                <Animated.View style={[styles.toast, { backgroundColor: colors.surface, borderColor: colors.border, opacity: toastAnim }]}>
                    <Text style={[styles.toastText, { color: colors.text }, T.semibold]}>{toastMsg}</Text>
                </Animated.View>
            )}

            {canvasMode && (
                <CanvasModeView
                    expenses={expenses}
                    members={group?.members ?? []}
                    groupId={groupId}
                    groupName={group?.name ?? ''}
                    user={user}
                    colors={colors}
                    isDark={isDark}
                    onAddExpense={() => navigation.navigate('AddExpense', { groupId, members: group?.members || [] })}
                    onSettle={(payment) => navigation.navigate('SettleUp', { payment })}
                    onClose={() => setCanvasMode(false)}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    headerGradient: {
        paddingHorizontal: scale(20),
        paddingTop: vs(12),
        paddingBottom: vs(16),
    },
    backRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(5),
        paddingBottom: vs(12),
        alignSelf: 'flex-start',
    },
    backText: { fontSize: ms(14) },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: scale(12),
        marginBottom: vs(14),
    },
    groupName: { fontSize: ms(26), letterSpacing: -0.8 },
    clusterRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginTop: vs(8),
    },
    clusterAvatar: {
        transform: [{ translateY: 2 }],
    },
    memberSummary: { fontSize: ms(12), marginLeft: scale(10) },
    headerRightCol: {
        alignItems: 'flex-end',
        gap: vs(8),
    },
    canvasToggleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(5),
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: ms(14),
        paddingHorizontal: scale(12),
        height: vs(34),
    },
    canvasToggleText: {
        fontSize: ms(12),
    },
    balanceChip: {
        paddingHorizontal: scale(12),
        paddingVertical: vs(8),
        alignItems: 'flex-end',
    },
    balanceChipLabel: { fontSize: ms(11), letterSpacing: 0.6 },
    balanceChipValue: { fontSize: ms(22), letterSpacing: -0.6 },

    actionRow: {
        flexDirection: 'row',
        gap: scale(8),
        marginBottom: vs(12),
    },
    primaryBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(7),
        borderRadius: ms(16),
        paddingVertical: vs(15),
    },
    primaryBtnText: { fontSize: ms(14) },
    ghostBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(7),
        borderRadius: ms(16),
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: scale(16),
        paddingVertical: vs(15),
    },
    ghostBtnText: { fontSize: ms(14) },

    tabRow: { flexDirection: 'row' },
    tabBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: vs(15),
        position: 'relative',
    },
    tabBtnText: { fontSize: ms(13.5) },
    tabUnderline: {
        position: 'absolute',
        bottom: 0,
        left: scale(8),
        right: scale(8),
        height: 3,
        borderRadius: 3,
    },

    scrollContent: { padding: scale(20), paddingBottom: vs(100), gap: vs(14) },

    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(12),
        padding: scale(14),
        borderRadius: ms(20),
    },
    rowInfo: { flex: 1, minWidth: 0 },
    rowTitle: { fontSize: ms(16) },
    rowMeta: { fontSize: ms(12), marginTop: vs(2) },
    rowEnd: { alignItems: 'flex-end' },
    rowAmount: { fontSize: ms(20), letterSpacing: -0.6 },
    rowDate: { fontSize: ms(11), marginTop: vs(2) },
    rowEach: { fontSize: ms(12), marginTop: vs(2) },

    balanceRow: { flexDirection: 'column', alignItems: 'stretch', gap: vs(10) },
    balanceTopRow: { flexDirection: 'row', alignItems: 'center', gap: scale(12) },
    progressTrack: { height: vs(6), borderRadius: ms(3), overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: ms(3) },
    settleLinkBtn: {
        alignSelf: 'flex-start',
        borderRadius: ms(11),
        paddingHorizontal: scale(14),
        paddingVertical: vs(9),
    },
    settleLinkText: { fontSize: ms(13) },

    settleBtn: {
        borderRadius: ms(11),
        paddingHorizontal: scale(14),
        paddingVertical: vs(9),
    },
    settleBtnText: { fontSize: ms(13) },

    settledEmpty: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: vs(8),
        paddingVertical: vs(60),
    },
    settledTitle: { fontSize: ms(17), marginTop: vs(8) },

    emptyState: {
        padding: scale(40),
        borderRadius: ms(20),
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
    },
    emptyText: { fontSize: ms(14) },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: ms(32),
        borderTopRightRadius: ms(32),
        padding: scale(24),
        minHeight: '40%',
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: vs(24),
    },
    modalTitle: {
        fontSize: ms(22),
    },
    closeModalBtn: {
        width: scale(36),
        height: scale(36),
        borderRadius: scale(18),
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabSwitchRow: {
        flexDirection: 'row',
        borderRadius: ms(12),
        borderWidth: StyleSheet.hairlineWidth,
        padding: scale(4),
        gap: scale(4),
    },
    tabSwitchBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: vs(9),
        borderRadius: ms(8),
    },
    tabSwitchBtnText: {
        fontSize: ms(13),
    },
    friendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: vs(12),
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: scale(12),
    },
    friendAvatar: {
        width: scale(42),
        height: scale(42),
        borderRadius: scale(21),
        alignItems: 'center',
        justifyContent: 'center',
    },
    friendAvatarText: { color: '#fff', fontSize: ms(15) },
    addBtn: {
        width: scale(36),
        height: scale(36),
        borderRadius: scale(18),
        alignItems: 'center',
        justifyContent: 'center',
    },
    emailInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: ms(14),
        paddingHorizontal: scale(14),
        height: vs(52),
        marginBottom: vs(16),
    },
    emailInput: {
        flex: 1,
        fontSize: ms(15),
    },
    inviteBtn: {
        height: vs(52),
        borderRadius: ms(26),
        alignItems: 'center',
        justifyContent: 'center',
    },

    editOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    editSheet: {
        borderTopLeftRadius: ms(28),
        borderTopRightRadius: ms(28),
        padding: scale(20),
        paddingBottom: vs(36),
        gap: vs(10),
    },
    editHandle: {
        width: scale(36),
        height: vs(4),
        borderRadius: ms(2),
        alignSelf: 'center',
        marginBottom: vs(6),
    },
    editSheetTitle: {
        fontSize: ms(20),
        marginBottom: vs(4),
    },
    editLabel: {
        fontSize: ms(12),
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    editInput: {
        borderWidth: 1,
        borderRadius: ms(14),
        paddingHorizontal: scale(14),
        paddingVertical: vs(12),
        fontSize: ms(15),
    },
    editSaveBtn: {
        borderRadius: ms(16),
        paddingVertical: vs(15),
        alignItems: 'center',
        marginTop: vs(6),
    },
    editSaveBtnText: {
        color: '#fff',
        fontSize: ms(15),
    },
    editCancelLink: {
        alignItems: 'center',
        paddingVertical: vs(8),
    },
    editCancelText: {
        fontSize: ms(14),
    },
    toast: {
        position: 'absolute',
        bottom: vs(32),
        alignSelf: 'center',
        paddingHorizontal: scale(20),
        paddingVertical: vs(10),
        borderRadius: ms(20),
        borderWidth: StyleSheet.hairlineWidth,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 6,
    },
    toastText: {
        fontSize: ms(14),
    },
});
