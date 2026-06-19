import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Animated,
    PanResponder,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { scale, vs, ms } from '../utils/responsive';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ChevronLeft, RefreshCw, Plus, Crown, X, Trash2 } from 'lucide-react-native';
import { recurringApi, groupsApi, RecurringExpenseOut, GroupListItem } from '../services/api';
import { T } from '../utils/typography';
import PressableScale from '../components/PressableScale';
import SkeletonBlock from '../components/SkeletonBlock';
import CharacterShape from '../components/CharacterShape';

type Frequency = 'weekly' | 'biweekly' | 'monthly';

const FREQUENCIES: { key: Frequency; label: string }[] = [
    { key: 'weekly',   label: 'Weekly' },
    { key: 'biweekly', label: 'Biweekly' },
    { key: 'monthly',  label: 'Monthly' },
];

const DELETE_WIDTH = scale(72);
const SWIPE_THRESHOLD = scale(48);

const FREQ_COLORS: Record<Frequency, string> = {
    weekly:   '#6366F1',
    biweekly: '#F59E0B',
    monthly:  '#16A34A',
};

function todayISO() {
    return new Date().toISOString().split('T')[0];
}

// ─── SwipeableRow ─────────────────────────────────────────────────────────────
function SwipeableRow({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) {
    const translateX = useRef(new Animated.Value(0)).current;
    const isOpen = useRef(false);

    const close = useCallback(() => {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 260 }).start(() => { isOpen.current = false; });
    }, [translateX]);

    const open = useCallback(() => {
        Animated.spring(translateX, { toValue: -DELETE_WIDTH, useNativeDriver: true, damping: 20, stiffness: 260 }).start(() => { isOpen.current = true; });
    }, [translateX]);

    const panResponder = useRef(PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderGrant: () => { translateX.extractOffset(); },
        onPanResponderMove: (_, g) => {
            translateX.setValue(Math.min(0, Math.max(-DELETE_WIDTH, g.dx)));
        },
        onPanResponderRelease: (_, g) => {
            translateX.flattenOffset();
            const cur = (translateX as any)._value as number;
            if (cur < -SWIPE_THRESHOLD) open(); else close();
        },
        onPanResponderTerminate: () => { translateX.flattenOffset(); close(); },
    })).current;

    return (
        <View style={styles.swipeContainer}>
            <View style={[styles.deleteAction, { backgroundColor: '#E05252', width: DELETE_WIDTH }]}>
                <TouchableOpacity style={styles.deleteActionInner} onPress={() => { close(); onDelete(); }} activeOpacity={0.8}>
                    <Trash2 size={18} color="#fff" />
                    <Text style={[styles.deleteActionText, T.bold]}>Delete</Text>
                </TouchableOpacity>
            </View>
            <Animated.View {...panResponder.panHandlers} style={{ transform: [{ translateX }] }}>
                {children}
            </Animated.View>
        </View>
    );
}

// ─── RecurringScreen ──────────────────────────────────────────────────────────
export default function RecurringScreen({ navigation }: any) {
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const isPro = user?.subscription_tier === 'pro';

    const [items, setItems] = useState<RecurringExpenseOut[]>([]);
    const [loading, setLoading] = useState(isPro);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [frequency, setFrequency] = useState<Frequency>('monthly');
    const [startDate, setStartDate] = useState(todayISO());
    const [groupId, setGroupId] = useState<string | null>(null);
    const [groups, setGroups] = useState<GroupListItem[]>([]);

    useEffect(() => {
        if (!isPro) return;
        loadItems();
    }, [isPro]);

    const loadItems = async () => {
        try {
            setLoading(true);
            const data: any = await recurringApi.list();
            setItems(Array.isArray(data) ? data : (data?.items ?? []));
        } catch {
            // silent — empty state shown
        } finally {
            setLoading(false);
        }
    };

    const openForm = async () => {
        setShowForm(true);
        try {
            const data: any = await groupsApi.list();
            setGroups(Array.isArray(data) ? data : (data?.items ?? []));
        } catch {}
    };

    const resetForm = () => {
        setDescription(''); setAmount(''); setFrequency('monthly');
        setStartDate(todayISO()); setGroupId(null);
    };

    const handleSubmit = async () => {
        if (!description.trim() || !amount.trim()) {
            Alert.alert('Missing fields', 'Please enter a title and amount.');
            return;
        }
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            Alert.alert('Invalid amount', 'Enter a valid positive number.');
            return;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || isNaN(Date.parse(startDate))) {
            Alert.alert('Invalid date', 'Enter a start date in YYYY-MM-DD format.');
            return;
        }
        setSubmitting(true);
        try {
            await recurringApi.create({
                description: description.trim(),
                amount: parsedAmount,
                frequency,
                next_run_date: startDate,
                ...(groupId ? { group_id: groupId } : {}),
            });
            setShowForm(false);
            resetForm();
            await loadItems();
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Could not create recurring expense.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = (id: string, title: string) => {
        Alert.alert(
            'Delete recurring expense',
            `Remove "${title}"? This will stop future auto-splits.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setItems(prev => prev.filter(i => i.id !== id));
                        try {
                            await recurringApi.delete(id);
                        } catch (err: any) {
                            Alert.alert('Error', err.message || 'Could not delete.');
                            loadItems();
                        }
                    },
                },
            ]
        );
    };

    const renderContent = () => {
        if (!isPro) {
            return (
                <View style={[styles.upsellCard, { borderColor: colors.accent + '30' }]}>
                    <View style={[styles.upsellIconWrap, { backgroundColor: colors.accentBg }]}>
                        <Crown size={22} color={colors.accent} />
                    </View>
                    <View style={styles.upsellBody}>
                        <Text style={[styles.upsellTitle, { color: colors.text }, T.bold]}>
                            Automate your monthly bills with Pro
                        </Text>
                        <Text style={[styles.upsellDesc, { color: colors.secondaryText }, T.regular]}>
                            Set it once, TandemPay handles the rest.
                        </Text>
                        <PressableScale
                            scaleTo={0.97}
                            haptic="light"
                            onPress={() => navigation.navigate('Subscription')}
                            style={[styles.upgradeBtn, { backgroundColor: colors.accent }]}
                        >
                            <Text style={[styles.upgradeBtnText, { color: isDark ? '#064E3B' : '#FFFFFF' }, T.bold]}>
                                Upgrade to Pro
                            </Text>
                        </PressableScale>
                    </View>
                </View>
            );
        }

        if (loading) {
            return (
                <View style={styles.skeletonWrap}>
                    {[0, 1, 2].map(i => (
                        <View key={i} style={[styles.skeletonRow, { backgroundColor: colors.surface }]}>
                            <SkeletonBlock width={scale(42)} height={scale(42)} radius={ms(13)} delay={i * 80} />
                            <View style={styles.skeletonText}>
                                <SkeletonBlock width="60%" height={vs(14)} delay={i * 80 + 40} />
                                <SkeletonBlock width="40%" height={vs(11)} delay={i * 80 + 80} style={{ marginTop: vs(6) }} />
                            </View>
                        </View>
                    ))}
                </View>
            );
        }

        if (items.length === 0) {
            return (
                <View style={styles.emptyState}>
                    <CharacterShape
                        shape={user?.character_shape ?? 'rect'}
                        color={user?.character_color ?? '#34D399'}
                        variant="mini"
                    />
                    <Text style={[styles.emptyTitle, { color: colors.text }, T.bold]}>No recurring bills yet</Text>
                    <Text style={[styles.emptySub, { color: colors.secondaryText }, T.regular]}>
                        Set up a recurring expense and TandemPay will auto-split it for you.
                    </Text>
                    <PressableScale
                        scaleTo={0.97}
                        haptic="light"
                        onPress={openForm}
                        style={[styles.emptyBtn, { backgroundColor: colors.accent }]}
                    >
                        <Plus size={16} color="#fff" />
                        <Text style={[styles.emptyBtnText, T.bold]}>Add your first one</Text>
                    </PressableScale>
                </View>
            );
        }

        return (
            <View style={styles.listWrap}>
                {items.map(item => (
                    <SwipeableRow
                        key={item.id}
                        onDelete={() => handleDelete(item.id, item.description)}
                    >
                        <View style={[styles.expenseCard, { backgroundColor: colors.surface }]}>
                            <View style={[styles.cardIconWrap, { backgroundColor: colors.accentBg }]}>
                                <RefreshCw size={20} color={colors.accent} />
                            </View>
                            <View style={styles.cardInfo}>
                                <Text style={[styles.cardTitle, { color: colors.text }, T.bold]}>
                                    {item.description}
                                </Text>
                                <View style={styles.cardMeta}>
                                    <Text style={[styles.cardAmount, { color: colors.secondaryText }, T.semibold]}>
                                        ${item.amount}
                                    </Text>
                                    <View style={[
                                        styles.freqBadge,
                                        { backgroundColor: FREQ_COLORS[item.frequency as Frequency] + '18' },
                                    ]}>
                                        <Text style={[
                                            styles.freqBadgeText,
                                            { color: FREQ_COLORS[item.frequency as Frequency] },
                                            T.semibold,
                                        ]}>
                                            {item.frequency.charAt(0).toUpperCase() + item.frequency.slice(1)}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={[styles.nextDate, { color: colors.tertiaryText }, T.regular]}>
                                    Next: {item.next_run_date}
                                </Text>
                            </View>
                        </View>
                    </SwipeableRow>
                ))}
            </View>
        );
    };

    return (
        <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <PressableScale
                    scaleTo={0.97}
                    haptic="light"
                    onPress={() => navigation.goBack()}
                    style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                    <ChevronLeft size={ms(20)} color={colors.text} />
                </PressableScale>
                <Text style={[styles.headerTitle, { color: colors.text }, T.bold]}>Recurring</Text>
                <View style={{ width: scale(44) }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {renderContent()}
            </ScrollView>

            {/* FAB — only for Pro users */}
            {isPro && !loading && (
                <PressableScale
                    scaleTo={0.93}
                    haptic="medium"
                    onPress={openForm}
                    style={[
                        styles.fab,
                        { backgroundColor: colors.accent, bottom: vs(24) + insets.bottom, right: scale(20) },
                    ]}
                >
                    <Plus size={24} color="#fff" strokeWidth={2.5} />
                </PressableScale>
            )}

            {/* Add Recurring sheet */}
            <Modal
                visible={showForm}
                animationType="slide"
                transparent
                onRequestClose={() => { setShowForm(false); resetForm(); }}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
                        <View style={[styles.modalHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />

                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }, T.bold]}>New Recurring Expense</Text>
                            <PressableScale
                                scaleTo={0.9}
                                haptic="light"
                                onPress={() => { setShowForm(false); resetForm(); }}
                                style={[styles.modalClose, { backgroundColor: colors.background }]}
                            >
                                <X size={18} color={colors.secondaryText} />
                            </PressableScale>
                        </View>

                        <Text style={[styles.fieldLabel, { color: colors.secondaryText }, T.semibold]}>Title</Text>
                        <TextInput
                            style={[styles.formInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                            placeholder="e.g. Rent, Netflix, Hydro"
                            placeholderTextColor={colors.faintText}
                            value={description}
                            onChangeText={setDescription}
                        />

                        <Text style={[styles.fieldLabel, { color: colors.secondaryText }, T.semibold]}>Amount (CAD)</Text>
                        <TextInput
                            style={[styles.formInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                            placeholder="0.00"
                            placeholderTextColor={colors.faintText}
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="decimal-pad"
                        />

                        <Text style={[styles.fieldLabel, { color: colors.secondaryText }, T.semibold]}>Frequency</Text>
                        <View style={styles.toggleRow}>
                            {FREQUENCIES.map(({ key, label }) => {
                                const active = frequency === key;
                                return (
                                    <PressableScale
                                        key={key}
                                        scaleTo={0.95}
                                        haptic="light"
                                        onPress={() => setFrequency(key)}
                                        style={[
                                            styles.toggleBtn,
                                            { borderColor: active ? colors.accent : colors.border },
                                            active && { backgroundColor: colors.accent },
                                        ]}
                                    >
                                        <Text style={[
                                            styles.toggleText,
                                            { color: active ? '#1A1A1A' : colors.secondaryText },
                                            T.semibold,
                                        ]}>
                                            {label}
                                        </Text>
                                    </PressableScale>
                                );
                            })}
                        </View>

                        <Text style={[styles.fieldLabel, { color: colors.secondaryText }, T.semibold]}>Start Date</Text>
                        <TextInput
                            style={[styles.formInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={colors.faintText}
                            value={startDate}
                            onChangeText={setStartDate}
                            keyboardType="numbers-and-punctuation"
                            maxLength={10}
                        />

                        {groups.length > 0 && (
                            <>
                                <Text style={[styles.fieldLabel, { color: colors.secondaryText }, T.semibold]}>Group (optional)</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: vs(16) }}>
                                    {[{ id: null, name: 'None' }, ...groups.map(g => ({ id: g.id, name: g.name }))].map(g => {
                                        const active = groupId === g.id;
                                        return (
                                            <PressableScale
                                                key={g.id ?? 'none'}
                                                scaleTo={0.95}
                                                haptic="light"
                                                onPress={() => setGroupId(g.id)}
                                                style={[
                                                    styles.groupChip,
                                                    { borderColor: active ? colors.accent : colors.border, marginRight: scale(8) },
                                                    active && { backgroundColor: colors.accent },
                                                ]}
                                            >
                                                <Text style={[
                                                    styles.groupChipText,
                                                    { color: active ? '#1A1A1A' : colors.secondaryText },
                                                    T.semibold,
                                                ]}>
                                                    {g.name}
                                                </Text>
                                            </PressableScale>
                                        );
                                    })}
                                </ScrollView>
                            </>
                        )}

                        <PressableScale
                            scaleTo={0.97}
                            haptic="medium"
                            onPress={handleSubmit}
                            disabled={submitting}
                            style={[styles.submitBtn, { backgroundColor: colors.accent, opacity: submitting ? 0.65 : 1 }]}
                        >
                            <Text style={[styles.submitBtnText, T.bold]}>
                                {submitting ? 'Saving…' : 'Add Recurring Expense'}
                            </Text>
                        </PressableScale>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(20),
        paddingVertical: vs(12),
    },
    headerTitle: {
        fontSize: ms(20),
        letterSpacing: -0.5,
    },
    backBtn: {
        width: scale(44),
        height: scale(44),
        borderRadius: ms(14),
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: StyleSheet.hairlineWidth,
    },

    scroll: {
        paddingHorizontal: scale(20),
        paddingBottom: vs(100),
    },

    // Upsell
    upsellCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: scale(14),
        borderRadius: ms(20),
        borderWidth: 1,
        padding: scale(18),
        marginTop: vs(8),
    },
    upsellIconWrap: {
        width: scale(44),
        height: scale(44),
        borderRadius: ms(12),
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    upsellBody: {
        flex: 1,
        gap: vs(6),
    },
    upsellTitle: {
        fontSize: ms(15),
    },
    upsellDesc: {
        fontSize: ms(13),
        lineHeight: 18,
    },
    upgradeBtn: {
        borderRadius: ms(13),
        paddingVertical: vs(12),
        alignItems: 'center',
        marginTop: vs(8),
    },
    upgradeBtnText: {
        fontSize: ms(14),
    },

    // Skeleton
    skeletonWrap: {
        gap: vs(10),
        marginTop: vs(8),
    },
    skeletonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(14),
        borderRadius: ms(20),
        padding: scale(16),
        minHeight: vs(72),
    },
    skeletonText: {
        flex: 1,
    },

    // Empty state
    emptyState: {
        alignItems: 'center',
        paddingVertical: vs(48),
        gap: vs(12),
        paddingHorizontal: scale(24),
    },
    emptyTitle: {
        fontSize: ms(17),
        letterSpacing: -0.3,
        marginTop: vs(8),
    },
    emptySub: {
        fontSize: ms(13),
        textAlign: 'center',
        lineHeight: 19,
    },
    emptyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(6),
        borderRadius: ms(14),
        paddingHorizontal: scale(20),
        paddingVertical: vs(12),
        marginTop: vs(4),
    },
    emptyBtnText: {
        fontSize: ms(14),
        color: '#fff',
    },

    // List
    listWrap: {
        gap: vs(0),
        marginTop: vs(8),
    },
    swipeContainer: {
        position: 'relative',
        marginBottom: vs(10),
        borderRadius: ms(20),
        overflow: 'hidden',
    },
    deleteAction: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: ms(20),
    },
    deleteActionInner: {
        flex: 1,
        width: DELETE_WIDTH,
        alignItems: 'center',
        justifyContent: 'center',
        gap: vs(4),
    },
    deleteActionText: {
        color: '#fff',
        fontSize: ms(11),
    },
    expenseCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: ms(20),
        padding: scale(16),
        gap: scale(14),
        minHeight: vs(72),
    },
    cardIconWrap: {
        width: scale(44),
        height: scale(44),
        borderRadius: ms(13),
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardInfo: {
        flex: 1,
        gap: vs(3),
    },
    cardTitle: {
        fontSize: ms(15),
    },
    cardMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
    },
    cardAmount: {
        fontSize: ms(13),
    },
    freqBadge: {
        borderRadius: 999,
        paddingHorizontal: scale(8),
        paddingVertical: vs(2),
    },
    freqBadgeText: {
        fontSize: ms(11),
    },
    nextDate: {
        fontSize: ms(12),
    },

    // FAB
    fab: {
        position: 'absolute',
        width: scale(56),
        height: scale(56),
        borderRadius: scale(28),
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 8,
    },

    // Modal sheet
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    modalSheet: {
        borderTopLeftRadius: ms(28),
        borderTopRightRadius: ms(28),
        padding: scale(24),
        paddingBottom: vs(40),
    },
    modalHandle: {
        width: scale(36),
        height: vs(4),
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: vs(20),
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: vs(20),
    },
    modalTitle: {
        fontSize: ms(18),
        letterSpacing: -0.3,
    },
    modalClose: {
        width: scale(36),
        height: scale(36),
        borderRadius: ms(10),
        alignItems: 'center',
        justifyContent: 'center',
    },
    fieldLabel: {
        fontSize: ms(12),
        letterSpacing: 0.3,
        textTransform: 'uppercase',
        marginBottom: vs(6),
    },
    formInput: {
        borderWidth: 1,
        borderRadius: ms(14),
        paddingHorizontal: scale(14),
        height: vs(52),
        fontSize: ms(16),
        marginBottom: vs(16),
    },
    toggleRow: {
        flexDirection: 'row',
        gap: scale(8),
        marginBottom: vs(16),
    },
    toggleBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: vs(11),
        borderRadius: ms(12),
        borderWidth: 1,
    },
    toggleText: {
        fontSize: ms(13),
    },
    groupChip: {
        paddingHorizontal: scale(14),
        paddingVertical: vs(8),
        borderRadius: 999,
        borderWidth: 1,
    },
    groupChipText: {
        fontSize: ms(13),
    },
    submitBtn: {
        height: vs(52),
        borderRadius: ms(16),
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: vs(4),
    },
    submitBtnText: {
        color: '#1A1A1A',
        fontSize: ms(16),
    },
});
