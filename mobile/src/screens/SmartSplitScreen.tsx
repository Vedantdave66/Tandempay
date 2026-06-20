import React, {
    useState, useRef, useEffect, useCallback, useMemo,
} from 'react';
import {
    View, Text, StyleSheet, ScrollView, TextInput, Modal,
    TouchableOpacity, KeyboardAvoidingView, Platform, Animated,
    Easing, Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
    useAudioRecorder, RecordingPresets,
    requestRecordingPermissionsAsync, setAudioModeAsync,
} from 'expo-audio';
import {
    ChevronLeft, ChevronRight, Users, Check, Sparkles,
    Mic, MicOff, X, MessageCircle,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { scale, vs, ms } from '../utils/responsive';
import { T } from '../utils/typography';
import {
    groupsApi, expensesApi, smartSplitApi,
    GroupListItem, GroupMember, SmartSplitResponse,
} from '../services/api';
import CharacterShape from '../components/CharacterShape';
import PressableScale from '../components/PressableScale';
import SkeletonBlock from '../components/SkeletonBlock';
import { buildMembersList } from '../utils/helpers';

type Phase = 'input' | 'review';

interface MemberChip {
    user_id: string;
    name: string;
    character_shape: string;
    character_color: string;
}

interface ReviewSplit {
    user_id: string;
    name: string;
    amount: string;
    note: string;
    character_shape: string;
    character_color: string;
    included: boolean;
}

interface ActionSheetData {
    type: 'add_to_group' | 'create_group' | 'remove_from_group';
    name: string;
    message?: string;
    userId?: string;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT_HALF  = SCREEN_HEIGHT * 0.55;
const SHEET_HEIGHT_THIRD = SCREEN_HEIGHT * 0.32;

const PLACEHOLDERS = [
    'Thai for 4, Lakshit skipped drinks — $85 total',
    'Groceries $120, Maya got extra items',
    'Uber $34 split 3 ways, I paid',
];

export default function SmartSplitScreen({ navigation }: any) {
    const { colors, isDark } = useTheme();
    const { user } = useAuth();

    const [phase, setPhase] = useState<Phase>('input');

    const [pickerVisible, setPickerVisible]       = useState(false);
    const [pickerGroups, setPickerGroups]         = useState<GroupListItem[]>([]);
    const [pickerLoading, setPickerLoading]       = useState(false);
    const [pickerError, setPickerError]           = useState(false);
    const [selectingGroupId, setSelectingGroupId] = useState<string | null>(null);
    const [groupId, setGroupId]                   = useState<string | null>(null);
    const [groupName, setGroupName]               = useState('');
    const [groupMembers, setGroupMembers]         = useState<GroupMember[]>([]);

    const [description, setDescription]   = useState('');
    const [inputFocused, setInputFocused] = useState(false);
    const [parsing, setParsing]           = useState(false);
    const [includedIds, setIncludedIds]   = useState<Set<string>>(new Set());

    const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
    const [isRecording, setIsRecording]         = useState(false);
    const [voiceProcessing, setVoiceProcessing] = useState(false);
    const recordingTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
    const recordingPulse   = useRef(new Animated.Value(1)).current;
    const recordingPulseAnim = useRef<Animated.CompositeAnimation | null>(null);

    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const toastAnim = useRef(new Animated.Value(0));
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [clarifyMsg, setClarifyMsg]     = useState<string | null>(null);
    const [clarifyInput, setClarifyInput] = useState('');

    const [actionSheet, setActionSheet] = useState<ActionSheetData | null>(null);
    const actionSheetAnim = useRef(new Animated.Value(SHEET_HEIGHT_THIRD)).current;

    const [reviewTitle, setReviewTitle]   = useState('');
    const [reviewTotal, setReviewTotal]   = useState('');
    const [reviewSplits, setReviewSplits] = useState<ReviewSplit[]>([]);
    const [needsTotal, setNeedsTotal]     = useState(false);
    const [adding, setAdding]             = useState(false);

    const [placeholderIdx, setPlaceholderIdx] = useState(0);
    const placeholderOpacity = useRef(new Animated.Value(1)).current;
    const sheetAnim          = useRef(new Animated.Value(SHEET_HEIGHT_HALF)).current;

    const allMembers = useMemo<MemberChip[]>(
        () => buildMembersList(groupMembers, user, colors.accent),
        [groupMembers, user, colors.accent],
    );

    useEffect(() => {
        setIncludedIds(new Set(allMembers.map(m => m.user_id)));
    }, [allMembers.length]);

    // Placeholder cycling
    useEffect(() => {
        const interval = setInterval(() => {
            Animated.timing(placeholderOpacity, {
                toValue: 0, duration: 300, useNativeDriver: true,
            }).start(() => {
                setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length);
                Animated.timing(placeholderOpacity, {
                    toValue: 1, duration: 300, useNativeDriver: true,
                }).start();
            });
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (recordingTimer.current) clearTimeout(recordingTimer.current);
            recordingPulseAnim.current?.stop();
        };
    }, []);

    // ── Toast ─────────────────────────────────────────────────────────────────
    const showToast = useCallback((msg: string) => {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToastMsg(msg);
        toastAnim.current.setValue(0);
        Animated.timing(toastAnim.current, { toValue: 1, duration: 280, useNativeDriver: true }).start();
        toastTimer.current = setTimeout(() => {
            Animated.timing(toastAnim.current, { toValue: 0, duration: 280, useNativeDriver: true })
                .start(() => setToastMsg(null));
        }, 2800);
    }, [toastAnim]);

    // ── Action sheet ──────────────────────────────────────────────────────────
    const openActionSheet = useCallback((data: ActionSheetData) => {
        setActionSheet(data);
        actionSheetAnim.setValue(SHEET_HEIGHT_THIRD);
        Animated.spring(actionSheetAnim, {
            toValue: 0, damping: 24, stiffness: 220, useNativeDriver: true,
        }).start();
    }, [actionSheetAnim]);

    const closeActionSheet = useCallback(() => {
        Animated.spring(actionSheetAnim, {
            toValue: SHEET_HEIGHT_THIRD, damping: 24, stiffness: 220, useNativeDriver: true,
        }).start(() => setActionSheet(null));
    }, [actionSheetAnim]);

    // ── Intent handler ────────────────────────────────────────────────────────
    const handleIntentResult = useCallback((result: SmartSplitResponse) => {
        if (result.parse_failed) {
            showToast("Couldn't parse that — try being more specific");
            return;
        }

        switch (result.intent) {
            case 'parse_expense': {
                const memberMap = new Map(allMembers.map(m => [m.user_id, m]));
                const splits: ReviewSplit[] = (result.splits ?? []).map(s => ({
                    user_id: s.user_id,
                    name: s.name || memberMap.get(s.user_id)?.name || 'Member',
                    amount: s.amount > 0 ? s.amount.toFixed(2) : '0.00',
                    note: s.note ?? '',
                    character_shape: memberMap.get(s.user_id)?.character_shape ?? 'rect',
                    character_color: memberMap.get(s.user_id)?.character_color ?? colors.accent,
                    included: s.included !== false,
                }));

                const nowExcluded = (result.splits ?? [])
                    .filter(s => s.included === false)
                    .map(s => s.user_id);
                if (nowExcluded.length > 0) {
                    setIncludedIds(prev => {
                        const next = new Set(prev);
                        nowExcluded.forEach(id => next.delete(id));
                        return next;
                    });
                }

                setReviewTitle(result.title ?? '');
                setReviewTotal(result.total > 0 ? result.total.toFixed(2) : '');
                setReviewSplits(splits);
                setNeedsTotal(!!result.needs_total);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setPhase('review');
                break;
            }

            case 'exclude_member': {
                const hint = (result.member_name ?? '').toLowerCase();
                const found = allMembers.find(
                    m => m.name.toLowerCase().includes(hint) || hint.includes(m.name.toLowerCase())
                );
                if (found && found.user_id !== user?.id) {
                    setIncludedIds(prev => {
                        const next = new Set(prev);
                        next.delete(found.user_id);
                        return next;
                    });
                }
                showToast(result.message || `Removed ${result.member_name ?? 'member'} from this split`);
                break;
            }

            case 'add_to_group':
                openActionSheet({
                    type: 'add_to_group',
                    name: result.member_name ?? '',
                    message: result.message ?? '',
                });
                break;

            case 'create_group':
                openActionSheet({
                    type: 'create_group',
                    name: result.group_name_suggestion ?? '',
                    message: result.message ?? '',
                });
                break;

            case 'adjust_split':
                showToast(result.message || `Updated ${result.member_name ?? ''}'s share`);
                break;

            case 'clarify':
                setClarifyMsg(result.message || 'Could you be more specific?');
                break;

            default:
                showToast("Couldn't understand that — try rephrasing");
        }
    }, [allMembers, colors.accent, user?.id, showToast, openActionSheet]);

    // ── Voice recording ───────────────────────────────────────────────────────
    const stopAndSendVoice = useCallback(async () => {
        if (recordingTimer.current) { clearTimeout(recordingTimer.current); recordingTimer.current = null; }
        recordingPulseAnim.current?.stop();
        recordingPulseAnim.current = null;
        recordingPulse.setValue(1);

        let uri: string | null = null;
        try {
            await audioRecorder.stop();
            uri = audioRecorder.uri ?? null;
        } catch {
            // stop failure is non-fatal — URI may still be usable
        }
        setIsRecording(false);

        if (!uri || !groupId) return;
        setVoiceProcessing(true);
        try {
            const memberIds = [...includedIds].filter(Boolean);
            if (user?.id && !memberIds.includes(user.id)) memberIds.push(user.id);
            const result = await smartSplitApi.parseVoice({
                audioUri: uri,
                group_id: groupId,
                group_name: groupName,
                member_ids: memberIds,
            });
            handleIntentResult(result);
        } catch {
            showToast("Couldn't process audio — try typing instead");
        } finally {
            setVoiceProcessing(false);
        }
    }, [audioRecorder, groupId, groupName, includedIds, user, recordingPulse, handleIntentResult, showToast]);

    const handleVoicePress = useCallback(async () => {
        if (voiceProcessing) return;

        if (isRecording) {
            await stopAndSendVoice();
            return;
        }

        if (!groupId) {
            showToast('Select a group first');
            return;
        }

        try {
            const { granted } = await requestRecordingPermissionsAsync();
            if (!granted) {
                showToast('Microphone access is needed for voice input');
                return;
            }
            await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
            await (audioRecorder as any).prepareToRecordAsync();
            audioRecorder.record();
            setIsRecording(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            // Single breathing animation: scale 1.0→1.06→1.0, 1.8s ease-in-out
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(recordingPulse, {
                        toValue: 1.06, duration: 900,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(recordingPulse, {
                        toValue: 1.0, duration: 900,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            );
            recordingPulseAnim.current = pulse;
            pulse.start();

            recordingTimer.current = setTimeout(() => stopAndSendVoice(), 30000);
        } catch {
            showToast('Could not start recording');
        }
    }, [isRecording, voiceProcessing, groupId, audioRecorder, recordingPulse, showToast, stopAndSendVoice]);

    // ── Group picker logic ────────────────────────────────────────────────────
    const loadGroups = useCallback(() => {
        setPickerLoading(true);
        setPickerError(false);
        groupsApi.list()
            .then(raw => {
                const groups = Array.isArray(raw) ? raw : (raw as any)?.items ?? [];
                setPickerGroups(groups);
            })
            .catch(() => setPickerError(true))
            .finally(() => setPickerLoading(false));
    }, []);

    useEffect(() => {
        if (!pickerVisible) return;
        loadGroups();
    }, [pickerVisible, loadGroups]);

    useEffect(() => {
        if (pickerVisible) {
            Animated.spring(sheetAnim, {
                toValue: 0, damping: 24, stiffness: 220, useNativeDriver: true,
            }).start();
        }
    }, [pickerVisible]);

    const closePicker = useCallback(() => {
        Animated.spring(sheetAnim, {
            toValue: SHEET_HEIGHT_HALF, damping: 24, stiffness: 220, useNativeDriver: true,
        }).start(() => {
            setPickerVisible(false);
            sheetAnim.setValue(SHEET_HEIGHT_HALF);
        });
    }, [sheetAnim]);

    // ── Parse (text) ──────────────────────────────────────────────────────────
    const _runParse = useCallback(async (text: string) => {
        if (!groupId) return;
        setParsing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const memberIds = [...includedIds].filter(Boolean);
        if (user?.id && !memberIds.includes(user.id)) memberIds.push(user.id);

        try {
            const result = await smartSplitApi.parse({
                description: text,
                group_id: groupId,
                group_name: groupName,
                member_ids: memberIds,
            });
            handleIntentResult(result);
        } catch {
            showToast("Something went wrong — try again");
        } finally {
            setParsing(false);
        }
    }, [groupId, groupName, includedIds, user, handleIntentResult, showToast]);

    const handleParse = useCallback(async () => {
        if (!description.trim() || !groupId || parsing) return;
        setClarifyMsg(null);
        setClarifyInput('');
        await _runParse(description.trim());
    }, [description, groupId, parsing, _runParse]);

    const handleClarifySubmit = useCallback(async () => {
        if (!clarifyInput.trim() || !groupId || parsing) return;
        const combined = `${description}\n\nAdditional context: ${clarifyInput.trim()}`;
        setClarifyMsg(null);
        setClarifyInput('');
        await _runParse(combined);
    }, [clarifyInput, description, groupId, parsing, _runParse]);

    const handleMemberLongPress = useCallback((m: MemberChip) => {
        if (m.user_id === user?.id) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        openActionSheet({ type: 'remove_from_group', name: m.name, userId: m.user_id });
    }, [user?.id, openActionSheet]);

    const handleActionSheetConfirm = useCallback(async () => {
        if (!actionSheet) return;

        if (actionSheet.type === 'add_to_group') {
            closeActionSheet();
            (global as any).Alert?.prompt(
                `Add ${actionSheet.name}`,
                `Enter their email to invite them to ${groupName}.`,
                async (email: string) => {
                    if (!email?.trim() || !groupId) return;
                    try {
                        await groupsApi.addMember(groupId, email.trim());
                        showToast(`Invited ${actionSheet.name} to ${groupName}`);
                    } catch (err: any) {
                        showToast(err.message || 'Could not add member');
                    }
                },
                'plain-text',
            );
            return;
        }

        if (actionSheet.type === 'create_group') {
            closeActionSheet();
            try {
                await groupsApi.create(actionSheet.name);
                showToast(`Created group "${actionSheet.name}"`);
                navigation.navigate('Groups');
            } catch (err: any) {
                showToast(err.message || 'Could not create group');
            }
            return;
        }

        if (actionSheet.type === 'remove_from_group' && actionSheet.userId && groupId) {
            closeActionSheet();
            const uid = actionSheet.userId;
            const name = actionSheet.name;
            try {
                await groupsApi.removeMember(groupId, uid);
                setGroupMembers(prev => prev.filter(m => m.user_id !== uid));
                showToast(`Removed ${name} from ${groupName}`);
            } catch (err: any) {
                showToast(err.message || 'Could not remove member');
            }
        }
    }, [actionSheet, groupId, groupName, closeActionSheet, showToast, navigation]);

    // ── Add Expense ───────────────────────────────────────────────────────────
    const handleAddExpense = useCallback(async () => {
        if (!groupId || !user || adding) return;
        const total = parseFloat(reviewTotal) || 0;
        if (total <= 0) {
            showToast('Enter the total amount first');
            return;
        }
        setAdding(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            const participantIds = reviewSplits
                .filter(s => s.included)
                .map(s => s.user_id);
            await expensesApi.create(groupId, {
                title: reviewTitle.trim() || 'Shared Expense',
                amount: total,
                paid_by: user.id,
                participant_ids: participantIds,
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            navigation.goBack();
        } catch (err: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            showToast(err.message || 'Could not add expense');
            setAdding(false);
        }
    }, [groupId, user, adding, reviewTotal, reviewSplits, reviewTitle, showToast, navigation]);

    // ── Review derived ────────────────────────────────────────────────────────
    const includedSplits = reviewSplits.filter(s => s.included);
    const splitsSum  = includedSplits.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    const totalNum   = parseFloat(reviewTotal) || 0;
    const remaining  = totalNum > 0 ? parseFloat((totalNum - splitsSum).toFixed(2)) : 0;

    // ── Shared: row shadow style ──────────────────────────────────────────────
    const rowShadow = {
        shadowColor: isDark ? '#000' : '#0A3020',
        shadowOpacity: isDark ? 0.28 : 0.10,
        shadowRadius: isDark ? 14 : 10,
        shadowOffset: { width: 0, height: isDark ? 10 : 4 } as const,
        elevation: isDark ? 6 : 4,
    };

    // ── Render helpers ────────────────────────────────────────────────────────
    const renderToast = () => {
        if (!toastMsg) return null;
        return (
            <Animated.View
                style={[
                    styles.toast,
                    {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        opacity: toastAnim.current,
                        transform: [{ translateY: toastAnim.current }],
                    },
                ]}
                pointerEvents="none"
            >
                <View style={[styles.toastDot, { backgroundColor: colors.accent }]} />
                <Text style={[styles.toastText, T.semibold, { color: colors.text }]}>{toastMsg}</Text>
            </Animated.View>
        );
    };

    const renderActionSheet = () => {
        if (!actionSheet) return null;

        let title = '';
        let subtitle = '';
        let confirmLabel = 'Confirm';
        let confirmDanger = false;

        if (actionSheet.type === 'add_to_group') {
            title = `Add ${actionSheet.name}?`;
            subtitle = actionSheet.message || `Invite ${actionSheet.name} to ${groupName}`;
            confirmLabel = 'Add member';
        } else if (actionSheet.type === 'create_group') {
            title = `Create "${actionSheet.name}"?`;
            subtitle = actionSheet.message || `Make a new group called ${actionSheet.name}`;
            confirmLabel = 'Create group';
        } else if (actionSheet.type === 'remove_from_group') {
            title = `Remove ${actionSheet.name}?`;
            subtitle = `Remove from ${groupName}`;
            confirmLabel = 'Remove';
            confirmDanger = true;
        }

        return (
            <Modal visible transparent animationType="none" onRequestClose={closeActionSheet}>
                <View style={{ flex: 1 }}>
                    <TouchableOpacity
                        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
                        activeOpacity={1}
                        onPress={closeActionSheet}
                    />
                    <Animated.View style={[
                        styles.actionSheet,
                        { backgroundColor: colors.surface, transform: [{ translateY: actionSheetAnim }] },
                    ]}>
                        <View style={styles.handleRow}>
                            <View style={[styles.handlePill, { backgroundColor: colors.border }]} />
                        </View>
                        <View style={styles.actionSheetBody}>
                            <Text style={[styles.actionSheetTitle, T.bold, { color: colors.text }]}>{title}</Text>
                            <Text style={[styles.actionSheetSub, T.regular, { color: colors.secondaryText }]}>{subtitle}</Text>
                            <PressableScale
                                scaleTo={0.97}
                                haptic="medium"
                                style={[styles.actionSheetBtn, { backgroundColor: confirmDanger ? colors.danger : colors.accent }]}
                                onPress={handleActionSheetConfirm}
                            >
                                <Text style={[styles.actionSheetBtnText, T.semibold]}>{confirmLabel}</Text>
                            </PressableScale>
                            <TouchableOpacity onPress={closeActionSheet} activeOpacity={0.7} style={{ marginTop: vs(8) }}>
                                <Text style={[{ fontSize: ms(14), color: colors.secondaryText }, T.regular]}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            </Modal>
        );
    };

    const renderPicker = () => (
        <Modal
            visible={pickerVisible}
            transparent
            animationType="none"
            onRequestClose={closePicker}
        >
            <View style={{ flex: 1 }}>
                <TouchableOpacity
                    style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
                    activeOpacity={1}
                    onPress={closePicker}
                />
                <Animated.View style={[styles.pickerSheet, {
                    backgroundColor: colors.surface,
                    transform: [{ translateY: sheetAnim }],
                }]}>
                    <View style={styles.handleRow}>
                        <View style={[styles.handlePill, { backgroundColor: colors.border }]} />
                    </View>
                    <View style={{ paddingHorizontal: scale(24), paddingBottom: vs(14) }}>
                        <Text style={[styles.pickerTitle, T.extrabold, { color: colors.text }]}>Which group?</Text>
                        <Text style={[styles.pickerSub, T.regular, { color: colors.secondaryText }]}>
                            Choose the group to split with
                        </Text>
                    </View>

                    {pickerLoading ? (
                        <View style={{ paddingHorizontal: scale(24), gap: vs(10), marginTop: vs(8) }}>
                            <SkeletonBlock width="100%" height={vs(58)} radius={ms(16)} />
                            <SkeletonBlock width="100%" height={vs(58)} radius={ms(16)} delay={120} />
                            <SkeletonBlock width="75%" height={vs(58)} radius={ms(16)} delay={240} />
                        </View>
                    ) : pickerError ? (
                        <View style={styles.pickerEmpty}>
                            <Users size={36} color={colors.secondaryText} style={{ opacity: 0.3, marginBottom: vs(10) }} />
                            <Text style={[styles.pickerEmptyTitle, T.bold, { color: colors.text }]}>Couldn't load groups</Text>
                            <Text style={[styles.pickerEmptySub, T.regular, { color: colors.secondaryText }]}>
                                Check your connection and try again.
                            </Text>
                            <PressableScale
                                scaleTo={0.97} haptic="medium"
                                style={[styles.pickerRetryBtn, { backgroundColor: colors.accent }]}
                                onPress={loadGroups}
                            >
                                <Text style={[styles.pickerRetryText, T.bold]}>Retry</Text>
                            </PressableScale>
                        </View>
                    ) : pickerGroups.length === 0 ? (
                        <View style={styles.pickerEmpty}>
                            <Users size={36} color={colors.secondaryText} style={{ opacity: 0.3, marginBottom: vs(10) }} />
                            <Text style={[styles.pickerEmptyTitle, T.bold, { color: colors.text }]}>No groups yet</Text>
                            <Text style={[styles.pickerEmptySub, T.regular, { color: colors.secondaryText }]}>
                                Create a group first to split expenses.
                            </Text>
                        </View>
                    ) : (
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: scale(16), paddingBottom: vs(32) }}
                        >
                            {pickerGroups.map(g => (
                                <PressableScale
                                    key={g.id}
                                    scaleTo={0.97}
                                    haptic="light"
                                    style={[styles.pickerRow, {
                                        backgroundColor: colors.background,
                                        borderColor: colors.border,
                                    }]}
                                    disabled={!!selectingGroupId}
                                    onPress={async () => {
                                        setSelectingGroupId(g.id);
                                        try {
                                            const full = await groupsApi.get(g.id);
                                            setGroupId(g.id);
                                            setGroupName(g.name);
                                            setGroupMembers(full.members);
                                            closePicker();
                                        } catch {
                                            showToast('Could not load group — try again');
                                        } finally {
                                            setSelectingGroupId(null);
                                        }
                                    }}
                                >
                                    <View style={styles.pickerCluster}>
                                        {Array.from({ length: Math.min(g.member_count, 3) }).map((_, i) => (
                                            <View key={i} style={{ marginLeft: i > 0 ? -6 : 0, zIndex: 3 - i }}>
                                                <CharacterShape
                                                    shape="rect"
                                                    color={colors.accent + (i === 0 ? '' : i === 1 ? 'BB' : '77')}
                                                    variant="cluster"
                                                />
                                            </View>
                                        ))}
                                    </View>
                                    <View style={styles.pickerRowInfo}>
                                        <Text style={[styles.pickerRowName, T.semibold, { color: colors.text }]}>{g.name}</Text>
                                        <Text style={[styles.pickerRowMeta, T.regular, { color: colors.secondaryText }]}>
                                            {g.member_count} member{g.member_count !== 1 ? 's' : ''}
                                        </Text>
                                    </View>
                                    {selectingGroupId === g.id
                                        ? <ActivityIndicator size="small" color={colors.accent} />
                                        : <ChevronRight size={18} color={colors.secondaryText} />
                                    }
                                </PressableScale>
                            ))}
                        </ScrollView>
                    )}
                </Animated.View>
            </View>
        </Modal>
    );

    // ── Review phase ──────────────────────────────────────────────────────────
    if (phase === 'review') {
        return (
            <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
                <View style={styles.header}>
                    <PressableScale
                        scaleTo={0.97} haptic="light"
                        onPress={() => setPhase('input')}
                        style={[styles.backBtn, { backgroundColor: colors.surface }]}
                    >
                        <ChevronLeft size={ms(20)} color={colors.text} />
                    </PressableScale>
                    <Text style={[styles.screenTitle, T.bold, { color: colors.text }]}>Review Split</Text>
                    <View style={styles.headerSpacer} />
                </View>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                    <ScrollView
                        contentContainerStyle={styles.reviewScroll}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Title + Total card */}
                        <View style={[styles.titleCard, { backgroundColor: colors.surface }, rowShadow]}>
                            <TextInput
                                value={reviewTitle}
                                onChangeText={setReviewTitle}
                                style={[styles.titleInput, T.bold, { color: colors.text }]}
                                placeholder="Expense name"
                                placeholderTextColor={colors.tertiaryText}
                                maxLength={40}
                            />
                            <View style={[styles.dividerLine, { backgroundColor: colors.border, marginVertical: vs(6) }]} />
                            <View style={[
                                styles.totalRow,
                                needsTotal && {
                                    borderWidth: 1.5, borderColor: colors.warning,
                                    borderRadius: ms(12), padding: scale(8),
                                },
                            ]}>
                                <Text style={[styles.dollarSign, T.extrabold, { color: colors.accent }]}>$</Text>
                                <TextInput
                                    value={reviewTotal}
                                    onChangeText={v => { setReviewTotal(v); setNeedsTotal(false); }}
                                    style={[styles.totalInput, T.extrabold, { color: colors.accent }]}
                                    keyboardType="decimal-pad"
                                    placeholder="0.00"
                                    placeholderTextColor={colors.tertiaryText}
                                />
                            </View>
                            {needsTotal && (
                                <Text style={[styles.totalHint, T.regular, { color: colors.warning }]}>
                                    Add the total amount
                                </Text>
                            )}
                        </View>

                        {/* Split breakdown */}
                        <Text style={[styles.sectionLabel, T.semibold, { color: colors.secondaryText }]}>
                            SPLIT BREAKDOWN
                        </Text>

                        {reviewSplits.map((s, i) => (
                            <View
                                key={`${s.user_id}-${i}`}
                                style={[
                                    styles.splitRow,
                                    { backgroundColor: colors.surface },
                                    rowShadow,
                                    !s.included && { opacity: 0.38 },
                                ]}
                            >
                                <CharacterShape shape={s.character_shape} color={s.character_color} variant="mini" />
                                <View style={styles.splitRowInfo}>
                                    <Text style={[
                                        styles.splitName, T.semibold, { color: colors.text },
                                        !s.included && { textDecorationLine: 'line-through' },
                                    ]}>
                                        {s.name}
                                    </Text>
                                    {!!s.note && (
                                        <Text style={[styles.splitNote, T.regular, { color: colors.secondaryText }]}>
                                            {s.note}
                                        </Text>
                                    )}
                                    {!s.included && (
                                        <Text style={[styles.splitNote, T.regular, { color: colors.tertiaryText }]}>excluded</Text>
                                    )}
                                </View>
                                {s.included && (
                                    <View style={[styles.amountPill, { backgroundColor: colors.accentBg }]}>
                                        <Text style={[styles.dollarSignSmall, T.extrabold, { color: colors.accent }]}>$</Text>
                                        <TextInput
                                            value={s.amount}
                                            onChangeText={val => {
                                                setReviewSplits(prev =>
                                                    prev.map((r, j) => j === i ? { ...r, amount: val } : r)
                                                );
                                            }}
                                            style={[styles.amountInput, T.extrabold, { color: colors.accent }]}
                                            keyboardType="decimal-pad"
                                        />
                                    </View>
                                )}
                            </View>
                        ))}

                        {totalNum > 0 && Math.abs(remaining) > 0.01 && (
                            <View style={[styles.remainingBanner, { backgroundColor: colors.dangerBg, borderColor: colors.danger + '40' }]}>
                                <Text style={[styles.remainingText, T.semibold, { color: colors.danger }]}>
                                    ${Math.abs(remaining).toFixed(2)} {remaining > 0 ? 'remaining' : 'over budget'}
                                </Text>
                            </View>
                        )}

                        <PressableScale
                            scaleTo={0.97} haptic="medium"
                            style={[styles.ctaBtn, { backgroundColor: colors.accent, opacity: adding ? 0.75 : 1 }]}
                            onPress={handleAddExpense}
                            disabled={adding}
                        >
                            {adding
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={[styles.ctaBtnText, T.semibold]}>Add Expense</Text>
                            }
                        </PressableScale>

                        <TouchableOpacity
                            onPress={() => { setPhase('input'); setDescription(''); }}
                            activeOpacity={0.7}
                            style={styles.startOverBtn}
                        >
                            <Text style={[styles.startOverText, T.regular, { color: colors.secondaryText }]}>
                                Start over
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
                {renderToast()}
            </SafeAreaView>
        );
    }

    // ── Input phase ───────────────────────────────────────────────────────────
    return (
        <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <View style={styles.header}>
                    <PressableScale
                        scaleTo={0.97} haptic="light"
                        onPress={() => navigation.goBack()}
                        style={[styles.backBtn, { backgroundColor: colors.surface }]}
                    >
                        <ChevronLeft size={ms(20)} color={colors.text} />
                    </PressableScale>
                    <Text style={[styles.screenTitle, T.bold, { color: colors.text }]}>Smart Split</Text>
                    <View style={styles.headerSpacer} />
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <Text style={[styles.subtitle, T.regular, { color: colors.secondaryText }]}>
                        Describe your bill in plain English
                    </Text>

                    {/* Group selector */}
                    {!groupId ? (
                        <PressableScale
                            scaleTo={0.97} haptic="light"
                            style={[styles.groupPickerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                            onPress={() => setPickerVisible(true)}
                        >
                            <Users size={18} color={colors.accent} />
                            <Text style={[styles.groupPickerText, T.semibold, { color: colors.secondaryText }]}>
                                Select a group
                            </Text>
                            <ChevronRight size={16} color={colors.tertiaryText} />
                        </PressableScale>
                    ) : (
                        <View style={[styles.groupChip, { backgroundColor: colors.accentBg }]}>
                            <Users size={14} color={colors.accent} />
                            <Text style={[styles.groupChipText, T.semibold, { color: colors.accent }]}>
                                {groupName}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setPickerVisible(true)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Text style={[{ fontSize: ms(12), color: colors.accent }, T.regular]}>· change</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Text input */}
                    <View style={styles.inputWrap}>
                        <TextInput
                            multiline
                            value={description}
                            onChangeText={setDescription}
                            onFocus={() => setInputFocused(true)}
                            onBlur={() => setInputFocused(false)}
                            style={[
                                styles.textInput,
                                T.regular,
                                {
                                    backgroundColor: colors.surface,
                                    borderColor: inputFocused ? colors.accent : colors.border,
                                    color: colors.text,
                                },
                            ]}
                            textAlignVertical="top"
                            editable={!isRecording && !voiceProcessing}
                        />
                        {/* Placeholder / state indicator */}
                        {!description ? (
                            <View style={styles.fakePlaceholderWrap} pointerEvents="none">
                                {isRecording ? (
                                    <View style={styles.recordingIndicator}>
                                        <View style={[styles.recordingDot, { backgroundColor: colors.danger }]} />
                                        <Text style={[styles.fakePlaceholder, T.regular, { color: colors.danger }]}>
                                            Listening…
                                        </Text>
                                    </View>
                                ) : voiceProcessing ? (
                                    <View style={styles.recordingIndicator}>
                                        <SkeletonBlock width={scale(80)} height={vs(12)} radius={ms(6)} />
                                        <Text style={[styles.fakePlaceholder, T.regular, { color: colors.secondaryText }]}>
                                            Processing…
                                        </Text>
                                    </View>
                                ) : (
                                    <Animated.Text
                                        style={[styles.fakePlaceholder, T.regular, { color: colors.tertiaryText, opacity: placeholderOpacity }]}
                                    >
                                        {PLACEHOLDERS[placeholderIdx]}
                                    </Animated.Text>
                                )}
                            </View>
                        ) : null}
                    </View>

                    {/* Voice input — equal-weight alternative to text */}
                    <View style={styles.voiceDivider}>
                        <View style={[styles.voiceDividerLine, { backgroundColor: colors.border }]} />
                        <Text style={[styles.voiceDividerText, T.regular, { color: colors.tertiaryText }]}>
                            or speak
                        </Text>
                        <View style={[styles.voiceDividerLine, { backgroundColor: colors.border }]} />
                    </View>

                    <View style={styles.voiceArea}>
                        {/* Breathing ring (behind the button when recording) */}
                        <View style={styles.micWrapper}>
                            {isRecording && (
                                <Animated.View
                                    pointerEvents="none"
                                    style={[
                                        styles.micRing,
                                        {
                                            borderColor: colors.danger + '55',
                                            transform: [{ scale: recordingPulse }],
                                        },
                                    ]}
                                />
                            )}
                            <PressableScale
                                scaleTo={0.96}
                                haptic="medium"
                                onPress={handleVoicePress}
                                disabled={voiceProcessing}
                                style={[
                                    styles.micBtn,
                                    {
                                        backgroundColor: isRecording
                                            ? colors.dangerBg
                                            : colors.surface,
                                        borderColor: isRecording ? colors.danger : colors.border,
                                        borderWidth: StyleSheet.hairlineWidth,
                                    },
                                ]}
                            >
                                {voiceProcessing ? (
                                    <ActivityIndicator size="small" color={colors.accent} />
                                ) : isRecording ? (
                                    <View style={[styles.recDot, { backgroundColor: colors.danger }]} />
                                ) : (
                                    <Mic size={ms(22)} color={colors.secondaryText} />
                                )}
                            </PressableScale>
                        </View>
                        <Text style={[
                            styles.voiceTapLabel, T.regular,
                            { color: isRecording ? colors.danger : colors.tertiaryText },
                        ]}>
                            {voiceProcessing ? 'Processing…' : isRecording ? 'Tap to stop' : 'Tap to speak'}
                        </Text>
                    </View>

                    {/* Clarify card */}
                    {clarifyMsg ? (
                        <View style={[styles.clarifyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <View style={styles.clarifyHeader}>
                                <MessageCircle size={16} color={colors.accent} />
                                <Text style={[styles.clarifyQuestion, T.semibold, { color: colors.text }]}>
                                    {clarifyMsg}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => { setClarifyMsg(null); setClarifyInput(''); }}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <X size={14} color={colors.tertiaryText} />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.clarifyInputRow}>
                                <TextInput
                                    value={clarifyInput}
                                    onChangeText={setClarifyInput}
                                    placeholder="Type your answer…"
                                    placeholderTextColor={colors.tertiaryText}
                                    style={[styles.clarifyInput, T.regular, { color: colors.text, borderColor: colors.border }]}
                                    returnKeyType="send"
                                    onSubmitEditing={handleClarifySubmit}
                                />
                                <PressableScale
                                    scaleTo={0.95}
                                    haptic="light"
                                    style={[
                                        styles.clarifySend,
                                        { backgroundColor: clarifyInput.trim() ? colors.accent : colors.surface },
                                    ]}
                                    onPress={handleClarifySubmit}
                                    disabled={!clarifyInput.trim() || parsing}
                                >
                                    <ChevronRight size={16} color={clarifyInput.trim() ? '#fff' : colors.tertiaryText} />
                                </PressableScale>
                            </View>
                        </View>
                    ) : null}

                    {/* Member chips */}
                    {groupId && allMembers.length > 0 && (
                        <View style={styles.chipsSection}>
                            <Text style={[styles.chipsLabel, T.semibold, { color: colors.secondaryText }]}>
                                SPLITTING WITH
                            </Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.chipsRow}
                            >
                                {allMembers.map(m => {
                                    const included = includedIds.has(m.user_id);
                                    return (
                                        <PressableScale
                                            key={m.user_id}
                                            scaleTo={0.96}
                                            haptic="light"
                                            style={[
                                                styles.memberChip,
                                                {
                                                    backgroundColor: included ? colors.accentBg : colors.surface,
                                                    borderColor: included ? colors.accent : colors.border,
                                                    opacity: included ? 1 : 0.38,
                                                },
                                            ]}
                                            onPress={() =>
                                                setIncludedIds(prev => {
                                                    const next = new Set(prev);
                                                    if (next.has(m.user_id) && next.size > 1) {
                                                        next.delete(m.user_id);
                                                    } else {
                                                        next.add(m.user_id);
                                                    }
                                                    return next;
                                                })
                                            }
                                            onLongPress={() => handleMemberLongPress(m)}
                                        >
                                            <CharacterShape
                                                shape={m.character_shape}
                                                color={m.character_color}
                                                variant="cluster"
                                            />
                                            <Text style={[
                                                styles.chipName,
                                                T.semibold,
                                                {
                                                    color: included ? colors.accent : colors.secondaryText,
                                                    textDecorationLine: included ? 'none' : 'line-through',
                                                },
                                            ]}>
                                                {m.name}
                                            </Text>
                                            {included && (
                                                <Check size={12} color={colors.accent} strokeWidth={2.5} />
                                            )}
                                        </PressableScale>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    )}

                    {/* CTA */}
                    <PressableScale
                        scaleTo={0.97}
                        haptic="medium"
                        style={[
                            styles.ctaBtn,
                            {
                                backgroundColor: colors.accent,
                                opacity: (!description.trim() || !groupId || parsing || isRecording || voiceProcessing) ? 0.5 : 1,
                            },
                        ]}
                        onPress={handleParse}
                        disabled={!description.trim() || !groupId || parsing || isRecording || voiceProcessing}
                    >
                        {parsing ? (
                            <View style={styles.parsingRow}>
                                <SkeletonBlock width={scale(80)} height={vs(14)} radius={ms(7)} />
                                <Text style={[styles.ctaBtnText, T.semibold]}>Parsing your bill…</Text>
                            </View>
                        ) : (
                            <View style={styles.ctaBtnInner}>
                                <Sparkles size={18} color="#FFFFFF" strokeWidth={2} />
                                <Text style={[styles.ctaBtnText, T.semibold]}>Split it →</Text>
                            </View>
                        )}
                    </PressableScale>
                </ScrollView>
            </KeyboardAvoidingView>

            {renderPicker()}
            {renderActionSheet()}
            {renderToast()}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(20),
        paddingVertical: vs(12),
    },
    backBtn: {
        width: scale(44),
        height: scale(44),
        borderRadius: ms(14),
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerSpacer: { width: scale(44) },
    screenTitle: {
        flex: 1,
        fontSize: ms(20),
        letterSpacing: -0.5,
        textAlign: 'center',
    },

    // ── Input phase ───────────────────────────────────────────────────────────
    scrollContent: {
        paddingHorizontal: scale(20),
        paddingBottom: vs(100),
        gap: vs(14),
    },
    subtitle: { fontSize: ms(14) },

    groupPickerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(10),
        borderRadius: ms(14),
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: scale(16),
        paddingVertical: vs(14),
    },
    groupPickerText: { flex: 1, fontSize: ms(15) },
    groupChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(6),
        alignSelf: 'flex-start',
        borderRadius: 999,
        paddingHorizontal: scale(14),
        paddingVertical: vs(8),
    },
    groupChipText: { fontSize: ms(13) },

    // Text input
    inputWrap: { position: 'relative' },
    textInput: {
        minHeight: vs(130),
        borderRadius: ms(20),
        borderWidth: StyleSheet.hairlineWidth,
        fontSize: ms(16),
        padding: scale(18),
        lineHeight: ms(24),
    },
    fakePlaceholderWrap: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        padding: scale(18),
    },
    fakePlaceholder: { fontSize: ms(16), lineHeight: ms(24) },
    recordingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
    },
    recordingDot: {
        width: scale(8),
        height: scale(8),
        borderRadius: 4,
    },

    // Voice area
    voiceDivider: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(10),
    },
    voiceDividerLine: {
        flex: 1,
        height: StyleSheet.hairlineWidth,
    },
    voiceDividerText: {
        fontSize: ms(12),
        letterSpacing: 0.3,
    },
    voiceArea: {
        alignItems: 'center',
        paddingVertical: vs(8),
        gap: vs(10),
    },
    micWrapper: {
        width: ms(60),
        height: ms(60),
        alignItems: 'center',
        justifyContent: 'center',
    },
    micRing: {
        position: 'absolute',
        width: ms(84),
        height: ms(84),
        borderRadius: ms(42),
        borderWidth: 1.5,
    },
    micBtn: {
        width: ms(60),
        height: ms(60),
        borderRadius: ms(30),
        alignItems: 'center',
        justifyContent: 'center',
    },
    recDot: {
        width: ms(14),
        height: ms(14),
        borderRadius: ms(7),
    },
    voiceTapLabel: {
        fontSize: ms(13),
        letterSpacing: 0.2,
    },

    // Clarify card
    clarifyCard: {
        borderRadius: ms(16),
        borderWidth: StyleSheet.hairlineWidth,
        padding: scale(14),
        gap: vs(10),
    },
    clarifyHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: scale(8),
    },
    clarifyQuestion: { flex: 1, fontSize: ms(14), lineHeight: 20 },
    clarifyInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
    },
    clarifyInput: {
        flex: 1,
        height: vs(40),
        borderRadius: ms(10),
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: scale(12),
        fontSize: ms(14),
    },
    clarifySend: {
        width: scale(36),
        height: scale(36),
        borderRadius: ms(10),
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Member chips
    chipsSection: { gap: vs(8) },
    chipsLabel: {
        fontSize: ms(11),
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    chipsRow: {
        flexDirection: 'row',
        gap: scale(8),
        paddingRight: scale(4),
    },
    memberChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(6),
        paddingHorizontal: scale(10),
        paddingVertical: vs(8),
        borderRadius: 999,
        borderWidth: StyleSheet.hairlineWidth,
    },
    chipName: { fontSize: ms(13) },

    // CTA button
    ctaBtn: {
        height: vs(54),
        borderRadius: ms(14),
        alignItems: 'center',
        justifyContent: 'center',
    },
    ctaBtnInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
    },
    ctaBtnText: { fontSize: 17, color: '#FFFFFF' },
    parsingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(10),
    },

    // ── Review phase ──────────────────────────────────────────────────────────
    reviewScroll: {
        paddingHorizontal: scale(20),
        paddingBottom: vs(100),
        gap: vs(12),
    },
    titleCard: {
        borderRadius: ms(20),
        padding: scale(20),
    },
    dividerLine: { height: StyleSheet.hairlineWidth },
    titleInput: { fontSize: ms(18), letterSpacing: -0.3, padding: 0 },
    totalRow: { flexDirection: 'row', alignItems: 'baseline' },
    dollarSign: { fontSize: ms(22), letterSpacing: -0.5, marginRight: scale(2) },
    totalInput: { fontSize: ms(32), letterSpacing: -1.2, flex: 1, padding: 0 },
    totalHint: { fontSize: ms(12), marginTop: vs(2) },

    sectionLabel: {
        fontSize: ms(11),
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginTop: vs(4),
        marginBottom: vs(2),
    },

    // Each split row matches GroupDetailScreen expense row style
    splitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(12),
        padding: scale(14),
        borderRadius: ms(20),
    },
    splitRowInfo: { flex: 1, minWidth: 0 },
    splitName: { fontSize: ms(16) },
    splitNote: { fontSize: ms(12), marginTop: vs(2) },
    amountPill: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: ms(10),
        paddingHorizontal: scale(10),
        paddingVertical: vs(6),
    },
    dollarSignSmall: { fontSize: ms(14), marginRight: scale(1) },
    amountInput: { fontSize: ms(15), minWidth: scale(48), padding: 0 },

    remainingBanner: {
        borderRadius: ms(12),
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: scale(16),
        paddingVertical: vs(10),
        alignItems: 'center',
    },
    remainingText: { fontSize: ms(13) },

    startOverBtn: { alignItems: 'center', paddingVertical: vs(8) },
    startOverText: { fontSize: ms(14) },

    // ── Toast (banner style) ──────────────────────────────────────────────────
    toast: {
        position: 'absolute',
        top: vs(12),
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
        paddingHorizontal: scale(16),
        paddingVertical: vs(10),
        borderRadius: ms(14),
        borderWidth: StyleSheet.hairlineWidth,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 8,
    },
    toastDot: {
        width: scale(7),
        height: scale(7),
        borderRadius: scale(4),
    },
    toastText: { fontSize: ms(13) },

    // ── Action sheet ──────────────────────────────────────────────────────────
    actionSheet: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: SHEET_HEIGHT_THIRD,
        borderTopLeftRadius: ms(28),
        borderTopRightRadius: ms(28),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
        elevation: 24,
    },
    actionSheetBody: {
        flex: 1,
        paddingHorizontal: scale(24),
        paddingBottom: vs(20),
        alignItems: 'center',
        gap: vs(6),
    },
    actionSheetTitle: { fontSize: ms(18), letterSpacing: -0.3, textAlign: 'center' },
    actionSheetSub: { fontSize: ms(13), textAlign: 'center', opacity: 0.7, lineHeight: 20 },
    actionSheetBtn: {
        width: '100%',
        height: vs(50),
        borderRadius: ms(14),
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: vs(10),
    },
    actionSheetBtnText: { fontSize: ms(15), color: '#fff' },

    // ── Picker sheet ──────────────────────────────────────────────────────────
    pickerSheet: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: SHEET_HEIGHT_HALF,
        borderTopLeftRadius: ms(28),
        borderTopRightRadius: ms(28),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
        elevation: 24,
    },
    handleRow:  { alignItems: 'center', paddingTop: vs(12), paddingBottom: vs(6) },
    handlePill: { width: scale(36), height: vs(4), borderRadius: 2 },
    pickerTitle: { fontSize: ms(22), letterSpacing: -0.4 },
    pickerSub:   { fontSize: ms(14), opacity: 0.65, marginTop: vs(4), lineHeight: 20 },
    pickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: ms(16),
        borderWidth: StyleSheet.hairlineWidth,
        padding: scale(14),
        marginBottom: vs(8),
    },
    pickerCluster: { flexDirection: 'row', alignItems: 'flex-end', marginRight: scale(12) },
    pickerRowInfo: { flex: 1 },
    pickerRowName: { fontSize: ms(15), marginBottom: vs(2) },
    pickerRowMeta: { fontSize: ms(12) },
    pickerEmpty:   { alignItems: 'center', paddingHorizontal: scale(36), marginTop: vs(28) },
    pickerEmptyTitle: { fontSize: ms(16), marginBottom: vs(6) },
    pickerEmptySub:   { fontSize: ms(13), textAlign: 'center', lineHeight: 20, opacity: 0.7 },
    pickerRetryBtn:   { paddingVertical: vs(11), paddingHorizontal: scale(32), borderRadius: ms(14), marginTop: vs(16) },
    pickerRetryText:  { fontSize: ms(14), color: '#fff' },
});
