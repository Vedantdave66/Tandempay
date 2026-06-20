import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { scale, vs, ms } from '../utils/responsive';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import * as Haptics from 'expo-haptics';
import { Bell, Users, Clock, MailPlus, UserCheck, UserX, Receipt, Send, CheckCheck, ShieldAlert, UserPlus, Check, Handshake, ChevronRight } from 'lucide-react-native';
import { friendsApi, groupsApi, balancesApi, notificationsApi, Friend, PendingRequests, NotificationOut } from '../services/api';
import { T } from '../utils/typography';
import CharacterShape from '../components/CharacterShape';
import { timeAgo, toArray } from '../utils/helpers';

const TYPE_CONFIG: Record<string, { icon: any; tint: 'green' | 'neutral' }> = {
    expense_added:        { icon: Receipt,     tint: 'green' },
    settlement_requested: { icon: Handshake,   tint: 'neutral' },
    payment_sent:         { icon: Send,        tint: 'neutral' },
    payment_confirmed:    { icon: CheckCheck,  tint: 'green' },
    payment_declined:     { icon: ShieldAlert, tint: 'neutral' },
    friend_request:       { icon: UserPlus,    tint: 'green' },
    friend_accepted:      { icon: Check,       tint: 'green' },
};

export default function FriendsScreen() {
    const navigation = useNavigation<any>();
    const { user } = useAuth();
    const { colors, isDark } = useTheme();

    const [activeTab, setActiveTab] = useState<'activity' | 'friends' | 'pending'>('activity');
    const [emailInput, setEmailInput] = useState('');

    const [friends, setFriends] = useState<Friend[]>([]);
    const [requests, setRequests] = useState<PendingRequests>({ sent: [], received: [] });
    const [activity, setActivity] = useState<NotificationOut[]>([]);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [settleLoading, setSettleLoading] = useState<string | null>(null);
    const [groupPickerVisible, setGroupPickerVisible] = useState(false);
    const [groupPickerFriend, setGroupPickerFriend] = useState<Friend | null>(null);
    const [sharedGroups, setSharedGroups] = useState<Array<{ id: string; name: string }>>([]);
    const [pickerLoading, setPickerLoading] = useState<string | null>(null);

    const loadData = async () => {
        try {
            const [friendsData, requestsData] = await Promise.all([
                friendsApi.getMyFriends(),
                friendsApi.getPendingRequests()
            ]);
            const fd: any = friendsData;
            setFriends(toArray<Friend>(fd));
            setRequests(requestsData);

            notificationsApi.list()
                .then(data => setActivity((data || []).slice(0, 8)))
                .catch(() => {});
        } catch {
            // data unavailable — keep empty state
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSendRequest = async () => {
        if (!emailInput.trim()) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSubmitting(true);
        try {
            await friendsApi.sendRequest(emailInput.trim());
            setEmailInput('');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Success", "Friend request sent!");
            await loadData();
        } catch (err: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert("Error", err.message || "Failed to send request.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleAccept = async (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await friendsApi.acceptRequest(id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await loadData();
        } catch (err: any) {
            Alert.alert("Error", err.message);
        }
    };

    const handleDecline = async (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await friendsApi.declineRequest(id);
            await loadData();
        } catch (err: any) {
            Alert.alert("Error", err.message);
        }
    };

    const goToSettle = async (friend: Friend, groupId: string, groupName: string) => {
        try {
            const suggestions = await balancesApi.getSettlements(groupId);
            const mine = suggestions.find(
                s => s.from_user_id === user?.id && s.to_user_id === friend.id
            );
            navigation.navigate('SettleUp', {
                payment: {
                    payee_id:           friend.id,
                    payee_name:         friend.name,
                    payee_email:        friend.email,
                    payee_avatar_color: friend.avatar_color,
                    amount:             mine?.amount ?? 0,
                    group_id:           groupId,
                    payer_id:           user?.id,
                    description:        groupName,
                },
            });
        } catch {
            // If suggestions fail, navigate with 0 so user can still proceed
            navigation.navigate('SettleUp', {
                payment: {
                    payee_id:           friend.id,
                    payee_name:         friend.name,
                    payee_email:        friend.email,
                    payee_avatar_color: friend.avatar_color,
                    amount:             0,
                    group_id:           groupId,
                    payer_id:           user?.id,
                    description:        groupName,
                },
            });
        }
    };

    const handleSettleUp = async (friend: Friend) => {
        if (friend.shared_groups_count === 0) {
            Alert.alert('No shared groups', 'Add a shared group first to settle up.');
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSettleLoading(friend.id);
        try {
            const allGroups = await groupsApi.list();
            const details = await Promise.all(allGroups.map(g => groupsApi.get(g.id)));
            const shared = details.filter(g => g.members.some(m => m.user_id === friend.id));

            if (shared.length === 0) {
                Alert.alert('No shared groups', 'Add a shared group first to settle up.');
                return;
            }
            if (shared.length === 1) {
                await goToSettle(friend, shared[0].id, shared[0].name);
            } else {
                setGroupPickerFriend(friend);
                setSharedGroups(shared.map(g => ({ id: g.id, name: g.name })));
                setGroupPickerVisible(true);
            }
        } catch {
            Alert.alert('Error', 'Could not load groups. Try again.');
        } finally {
            setSettleLoading(null);
        }
    };

    const handlePickGroup = async (groupId: string, groupName: string) => {
        if (!groupPickerFriend) return;
        setPickerLoading(groupId);
        try {
            await goToSettle(groupPickerFriend, groupId, groupName);
            setGroupPickerVisible(false);
        } finally {
            setPickerLoading(null);
        }
    };

    const segments: { id: 'activity' | 'friends' | 'pending'; label: string; icon: any }[] = [
        { id: 'activity', label: 'Activity', icon: Bell },
        { id: 'friends',  label: 'Friends',  icon: Users },
        { id: 'pending',  label: 'Pending',  icon: Clock },
    ];

    const noPending = requests.received.length === 0 && requests.sent.length === 0;

    return (
        <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }, T.bold]}>Friends</Text>

                <View style={[styles.segmentContainer, { backgroundColor: colors.surface }]}>
                    {segments.map(seg => {
                        const active = activeTab === seg.id;
                        return (
                            <TouchableOpacity
                                key={seg.id}
                                style={[styles.segment, active && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'white' }]}
                                onPress={() => { Haptics.selectionAsync(); setActiveTab(seg.id); }}
                                activeOpacity={0.75}
                            >
                                <Text style={[styles.segmentText, { color: active ? colors.text : colors.secondaryText }, active ? T.semibold : T.regular]}>
                                    {seg.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                {loading ? (
                    <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: vs(40) }} />
                ) : activeTab === 'activity' ? (
                    activity.length === 0 ? (
                        <View style={styles.emptyState}>
                            <CharacterShape shape="tall" color={colors.indigo} variant="mini" />
                            <Text style={[styles.emptyTitle, { color: colors.text }, T.semibold]}>Nothing here yet</Text>
                            <Text style={[styles.emptyDesc, { color: colors.secondaryText }, T.regular]}>
                                When your friends and squads get busy, you'll see it here.
                            </Text>
                        </View>
                    ) : (
                        <View style={[styles.activityCard, { backgroundColor: colors.surface }]}>
                            {activity.map((a, i) => {
                                const cfg = TYPE_CONFIG[a.type] || { icon: Bell, tint: 'neutral' as const };
                                const Icon = cfg.icon;
                                const isLast = i === activity.length - 1;
                                return (
                                    <View
                                        key={a.id}
                                        style={[
                                            styles.activityRow,
                                            !isLast && {
                                                borderBottomWidth: StyleSheet.hairlineWidth,
                                                borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                                            },
                                        ]}
                                    >
                                        <View style={[styles.activityIcon, { backgroundColor: colors.accentBg }]}>
                                            <Icon size={20} color={cfg.tint === 'green' ? colors.accent : colors.secondaryText} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.activityText, { color: colors.text }, T.regular]} numberOfLines={2}>
                                                {a.message || a.title}
                                            </Text>
                                            <Text style={[styles.activityTime, { color: colors.faintText }, T.regular]}>{timeAgo(a.created_at)}</Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )
                ) : activeTab === 'friends' ? (
                    <>
                        <View style={styles.addFriendSection}>
                            <Text style={[styles.sectionTitle, { color: colors.secondaryText }, T.semibold]}>ADD BY EMAIL</Text>
                            <View style={styles.inputRow}>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, ...T.regular }]}
                                    placeholder="friend@example.com"
                                    placeholderTextColor={colors.secondaryText}
                                    value={emailInput}
                                    onChangeText={setEmailInput}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                                <TouchableOpacity
                                    style={[styles.sendBtn, {
                                        backgroundColor: colors.accent,
                                        opacity: emailInput.length ? 1 : 0.5,
                                    }]}
                                    onPress={handleSendRequest}
                                    disabled={!emailInput.length || submitting}
                                    activeOpacity={0.70}
                                >
                                    {submitting ? <ActivityIndicator color="white" /> : <MailPlus color="#fff" size={20} />}
                                </TouchableOpacity>
                            </View>
                        </View>

                        {friends.length === 0 ? (
                            <View style={[styles.emptyState, { marginTop: vs(24) }]}>
                                <CharacterShape shape="round" color={colors.accent} variant="mini" />
                                <Text style={[styles.emptyTitle, { color: colors.text }, T.semibold]}>Your crew goes here</Text>
                                <Text style={[styles.emptyDesc, { color: colors.secondaryText }, T.regular]}>Add someone by email above and splitting stops being math homework.</Text>
                            </View>
                        ) : (
                            friends.map(friend => (
                                <View key={friend.id} style={[styles.friendCard, { backgroundColor: colors.surface }]}>
                                    <View style={styles.friendTop}>
                                        <CharacterShape shape="rect" color={friend.avatar_color} variant="mini" />
                                        <View style={{ marginLeft: scale(12) }}>
                                            <Text style={[styles.friendName, { color: colors.text }, T.semibold]}>{friend.name}</Text>
                                            <Text style={[styles.friendEmail, { color: colors.faintText }, T.regular]}>{friend.email}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.friendBottom}>
                                        <View style={[styles.sharedChip, { backgroundColor: colors.accentBg }]}>
                                            <Text style={[styles.sharedChipText, { color: colors.accent }, T.semibold]}>
                                                {friend.shared_groups_count} shared squads
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.settleBtn}
                                            activeOpacity={0.75}
                                            onPress={() => handleSettleUp(friend)}
                                            disabled={settleLoading === friend.id}
                                        >
                                            {settleLoading === friend.id
                                                ? <ActivityIndicator size="small" color={colors.accent} />
                                                : <Text style={[styles.settleBtnText, { color: colors.accent }, T.semibold]}>Settle up</Text>
                                            }
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        )}
                    </>
                ) : (
                    <>
                        {requests.received.length > 0 && (
                            <View style={{ marginBottom: vs(28) }}>
                                <Text style={[styles.sectionTitle, { color: colors.secondaryText }, T.semibold]}>RECEIVED</Text>
                                {requests.received.map(req => (
                                    <View key={req.id} style={[styles.friendCard, { backgroundColor: colors.surface }]}>
                                        <View style={styles.friendTop}>
                                            <CharacterShape shape="rect" color={req.sender_avatar} variant="mini" />
                                            <View style={{ marginLeft: scale(12), flex: 1 }}>
                                                <Text style={[styles.friendName, { color: colors.text }, T.semibold]}>{req.sender_name}</Text>
                                                <Text style={[styles.friendEmail, { color: colors.faintText }, T.regular]}>{req.sender_email}</Text>
                                            </View>
                                            <View style={styles.actionBtns}>
                                                <TouchableOpacity onPress={() => handleAccept(req.id)} style={[styles.iconBtn, { backgroundColor: colors.accentBg }]} activeOpacity={0.70}>
                                                    <UserCheck size={20} color={colors.accent} />
                                                </TouchableOpacity>
                                                <TouchableOpacity onPress={() => handleDecline(req.id)} style={[styles.iconBtn, { marginLeft: scale(8) }]} activeOpacity={0.60}>
                                                    <UserX size={20} color={colors.danger} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}

                        {requests.sent.length > 0 && (
                            <View>
                                <Text style={[styles.sectionTitle, { color: colors.secondaryText }, T.semibold]}>SENT</Text>
                                {requests.sent.map(req => (
                                    <View key={req.id} style={[styles.friendCard, { backgroundColor: colors.surface }]}>
                                        <View style={styles.friendTop}>
                                            <View style={[styles.clockAvatar, { backgroundColor: colors.accentBg }]}>
                                                <Clock size={20} color={colors.secondaryText} />
                                            </View>
                                            <View style={{ marginLeft: scale(12) }}>
                                                <Text style={[styles.friendName, { color: colors.text }, T.semibold]}>{req.receiver_email}</Text>
                                                <Text style={[styles.friendEmail, { color: colors.faintText }, T.regular]}>Waiting on them…</Text>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}

                        {noPending && (
                            <View style={styles.pendingEmpty}>
                                <CharacterShape shape="semi" color={colors.indigo} variant="hero" />
                                <Text style={[styles.pendingEmptyTitle, { color: colors.faintText }, T.semibold]}>No pending requests</Text>
                                <Text style={[styles.pendingEmptyDesc, { color: colors.secondaryText }, T.regular]}>
                                    When someone adds you, they'll show up here.
                                </Text>
                            </View>
                        )}
                    </>
                )}
            </ScrollView>
            <Modal
                visible={groupPickerVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setGroupPickerVisible(false)}
            >
                <TouchableOpacity
                    style={styles.pickerOverlay}
                    activeOpacity={1}
                    onPress={() => setGroupPickerVisible(false)}
                >
                    <View style={[styles.pickerSheet, { backgroundColor: colors.surface }]}>
                        <View style={[styles.pickerHandle, { backgroundColor: colors.border }]} />
                        <Text style={[styles.pickerTitle, { color: colors.text }, T.bold]}>
                            Which group?
                        </Text>
                        {sharedGroups.map((g, i) => (
                            <TouchableOpacity
                                key={g.id}
                                style={[
                                    styles.pickerRow,
                                    i < sharedGroups.length - 1 && {
                                        borderBottomWidth: StyleSheet.hairlineWidth,
                                        borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                                    },
                                ]}
                                onPress={() => handlePickGroup(g.id, g.name)}
                                disabled={!!pickerLoading}
                                activeOpacity={0.75}
                            >
                                <Text style={[styles.pickerRowText, { color: colors.text }, T.semibold]}>
                                    {g.name}
                                </Text>
                                {pickerLoading === g.id
                                    ? <ActivityIndicator size="small" color={colors.accent} />
                                    : <ChevronRight size={scale(18)} color={colors.faintText} />
                                }
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    header: {
        paddingHorizontal: scale(20),
        paddingTop: vs(8),
        paddingBottom: vs(16),
    },
    title: {
        fontSize: ms(28),
        letterSpacing: -0.8,
        marginBottom: vs(16),
    },
    segmentContainer: {
        flexDirection: 'row',
        padding: scale(4),
        borderRadius: ms(12),
    },
    segment: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: vs(9),
        borderRadius: ms(8),
    },
    segmentText: {
        fontSize: ms(14),
    },
    container: {
        paddingHorizontal: scale(20),
        paddingTop: vs(8),
        paddingBottom: vs(140),
    },
    sectionTitle: {
        fontSize: ms(13),
        letterSpacing: 0.2,
        marginBottom: vs(8),
    },

    activityCard: {
        borderRadius: ms(16),
        overflow: 'hidden',
    },
    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(12),
        paddingVertical: vs(12),
        paddingHorizontal: scale(16),
        minHeight: vs(44),
    },
    activityIcon: {
        width: scale(36),
        height: scale(36),
        borderRadius: ms(10),
        alignItems: 'center',
        justifyContent: 'center',
    },
    activityText: {
        fontSize: ms(15),
        lineHeight: 22,
    },
    activityTime: {
        fontSize: ms(12),
        marginTop: vs(3),
    },

    addFriendSection: {
        marginBottom: vs(24),
    },
    inputRow: {
        flexDirection: 'row',
        gap: scale(12),
    },
    input: {
        flex: 1,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: ms(14),
        paddingHorizontal: scale(16),
        height: vs(52),
        fontSize: ms(16),
    },
    sendBtn: {
        width: scale(52),
        height: scale(52),
        borderRadius: ms(14),
        alignItems: 'center',
        justifyContent: 'center',
    },
    friendCard: {
        padding: scale(16),
        borderRadius: ms(16),
        marginBottom: vs(8),
    },
    friendTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: vs(14),
    },
    friendName: {
        fontSize: ms(15),
    },
    friendEmail: {
        fontSize: ms(12),
        marginTop: vs(2),
    },
    friendBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    sharedChip: {
        borderRadius: 999,
        paddingHorizontal: scale(10),
        paddingVertical: vs(5),
    },
    sharedChipText: {
        fontSize: ms(12),
    },
    settleBtn: {
        paddingHorizontal: scale(12),
        paddingVertical: vs(8),
    },
    settleBtnText: {
        fontSize: ms(15),
    },

    actionBtns: {
        flexDirection: 'row',
    },
    iconBtn: {
        width: scale(44),
        height: scale(44),
        borderRadius: ms(14),
        alignItems: 'center',
        justifyContent: 'center',
    },
    clockAvatar: {
        width: 32,
        height: 52,
        borderRadius: ms(6),
        alignItems: 'center',
        justifyContent: 'center',
    },
    pendingEmpty: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: vs(8),
        paddingTop: vs(40),
        paddingHorizontal: scale(20),
    },
    pendingEmptyTitle: {
        fontSize: ms(16),
        marginTop: vs(8),
    },
    pendingEmptyDesc: {
        fontSize: ms(14),
        textAlign: 'center',
    },

    emptyState: {
        alignItems: 'center',
        paddingTop: vs(48),
        paddingHorizontal: scale(40),
        gap: vs(8),
    },
    emptyTitle: {
        fontSize: ms(17),
        marginBottom: vs(8),
    },
    emptyDesc: {
        fontSize: ms(15),
        textAlign: 'center',
        lineHeight: 21,
    },

    pickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    pickerSheet: {
        borderTopLeftRadius: ms(24),
        borderTopRightRadius: ms(24),
        paddingHorizontal: scale(24),
        paddingTop: vs(16),
        paddingBottom: vs(48),
    },
    pickerHandle: {
        width: scale(36),
        height: vs(4),
        borderRadius: ms(2),
        alignSelf: 'center',
        marginBottom: vs(20),
    },
    pickerTitle: {
        fontSize: ms(20),
        marginBottom: vs(8),
    },
    pickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: vs(16),
        minHeight: vs(44),
    },
    pickerRowText: {
        fontSize: ms(16),
    },
});
