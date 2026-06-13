import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Alert,
    Modal,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Animated,
    PanResponder,
} from 'react-native';
import { scale, vs, ms } from '../utils/responsive';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { RefreshCw, Plus, Crown, X, Trash2 } from 'lucide-react-native';
import { recurringApi, groupsApi, RecurringExpenseOut, GroupListItem } from '../services/api';
import { T } from '../utils/typography';

type Frequency = 'weekly' | 'biweekly' | 'monthly';

const FREQUENCIES: { key: Frequency; label: string }[] = [
    { key: 'weekly',    label: 'Weekly' },
    { key: 'biweekly',  label: 'Biweekly' },
    { key: 'monthly',   label: 'Monthly' },
];

const DELETE_WIDTH = scale(72);
const SWIPE_THRESHOLD = scale(48);

function todayISO() {
    return new Date().toISOString().split('T')[0];
}

// ─── SwipeableRow ────────────────────────────────────────────────────────────
// Reveals a red delete button when swiped left. Uses core RN PanResponder +
// Animated so no extra deps are required.
function SwipeableRow({ children, onDelete, colors }: {
    children: React.ReactNode;
    onDelete: () => void;
    colors: any;
}) {
    const translateX = useRef(new Animated.Value(0)).current;
    const isOpen = useRef(false);

    const close = useCallback(() => {
        Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            damping: 20,
            stiffness: 260,
        }).start(() => { isOpen.current = false; });
    }, [translateX]);

    const open = useCallback(() => {
        Animated.spring(translateX, {
            toValue: -DELETE_WIDTH,
            useNativeDriver: true,
            damping: 20,
            stiffness: 260,
        }).start(() => { isOpen.current = true; });
    }, [translateX]);

    const panResponder = useRef(PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
            Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderGrant: () => {
            translateX.extractOffset();
        },
        onPanResponderMove: (_, g) => {
            const raw = g.dx;
            // clamp: only allow left swipe, max = DELETE_WIDTH
            const clamped = Math.min(0, Math.max(-DELETE_WIDTH, raw));
            translateX.setValue(clamped);
        },
        onPanResponderRelease: (_, g) => {
            translateX.flattenOffset();
            const current = (translateX as any)._value as number;
            if (current < -SWIPE_THRESHOLD) {
                open();
            } else {
                close();
            }
        },
        onPanResponderTerminate: () => {
            translateX.flattenOffset();
            close();
        },
    })).current;

    const handleDeletePress = () => {
        close();
        onDelete();
    };

    return (
        <View style={styles.swipeContainer}>
            {/* Delete action — revealed behind the row */}
            <View style={[styles.deleteAction, { backgroundColor: '#E05252', width: DELETE_WIDTH }]}>
                <TouchableOpacity
                    style={styles.deleteActionInner}
                    onPress={handleDeletePress}
                    activeOpacity={0.8}
                >
                    <Trash2 size={18} color="#fff" />
                    <Text style={styles.deleteActionText}>Delete</Text>
                </TouchableOpacity>
            </View>
            {/* Row slides left */}
            <Animated.View
                {...panResponder.panHandlers}
                style={{ transform: [{ translateX }] }}
            >
                {children}
            </Animated.View>
        </View>
    );
}

// ─── RecurringScreen ─────────────────────────────────────────────────────────

export default function RecurringScreen({ navigation }: any) {
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const isPro = user?.subscription_tier === 'pro';

    const [items, setItems] = useState<RecurringExpenseOut[]>([]);
    const [loading, setLoading] = useState(isPro);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form state
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
            // silent — empty state will show
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
        setDescription('');
        setAmount('');
        setFrequency('monthly');
        setStartDate(todayISO());
        setGroupId(null);
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
        // Basic date validation: expect YYYY-MM-DD
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
                        // Optimistic remove
                        setItems(prev => prev.filter(i => i.id !== id));
                        try {
                            await recurringApi.delete(id);
                        } catch (err: any) {
                            Alert.alert('Error', err.message || 'Could not delete recurring expense.');
                            // Restore list on failure
                            loadItems();
                        }
                    },
                },
            ],
        );
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.pageTitle, { color: colors.text }]}>
                        Recurring Expenses
                    </Text>
                    <Text style={[styles.pageSubtitle, { color: colors.secondaryText }]}>
                        Auto-split bills on a schedule
                    </Text>
                </View>
                {isPro && (
                    <TouchableOpacity
                        style={[styles.addButton, { backgroundColor: colors.accent }]}
                        onPress={openForm}
                        activeOpacity={0.85}
                    >
                        <Plus size={18} color="#1A1A1A" />
                        <Text style={styles.addButtonText}>Add</Text>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {isPro ? (
                    loading ? (
                        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: vs(40) }} />
                    ) : items.length > 0 ? (
                        items.map(item => (
                            <SwipeableRow
                                key={item.id}
                                colors={colors}
                                onDelete={() => handleDelete(item.id, item.description)}
                            >
                                <View style={[styles.expenseRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                    <View style={[styles.rowIcon, { backgroundColor: isDark ? 'rgba(74,222,128,0.12)' : 'rgba(22,163,74,0.08)' }]}>
                                        <RefreshCw size={18} color={colors.accent} />
                                    </View>
                                    <View style={styles.rowInfo}>
                                        <Text style={[styles.rowTitle, { color: colors.text }]}>{item.description}</Text>
                                        <Text style={[styles.rowMeta, { color: colors.secondaryText }]}>
                                            ${item.amount} · {item.frequency.charAt(0).toUpperCase() + item.frequency.slice(1)} · Next: {item.next_run_date}
                                        </Text>
                                    </View>
                                </View>
                            </SwipeableRow>
                        ))
                    ) : (
                        <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <RefreshCw size={40} color={colors.secondaryText} style={{ opacity: 0.3, marginBottom: vs(12) }} />
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>No recurring expenses yet</Text>
                            <Text style={[styles.emptySub, { color: colors.secondaryText }]}>
                                Tap Add to set up your first recurring bill.
                            </Text>
                        </View>
                    )
                ) : (
                    <View style={[styles.upsellCard, {
                        backgroundColor: isDark ? 'rgba(74,222,128,0.06)' : 'rgba(22,163,74,0.04)',
                        borderColor: isDark ? 'rgba(74,222,128,0.2)' : 'rgba(22,163,74,0.15)',
                    }]}>
                        <Crown size={22} color={colors.accent} />
                        <View style={styles.upsellText}>
                            <Text style={[styles.upsellTitle, { color: colors.text }]}>
                                Automate your monthly bills with Pro
                            </Text>
                            <Text style={[styles.upsellSub, { color: colors.secondaryText }]}>
                                Set it once, TandemPay handles the rest.
                            </Text>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('Subscription')}
                                activeOpacity={0.8}
                                style={[styles.upgradeBtn, { backgroundColor: colors.accent }]}
                            >
                                <Text style={[styles.upgradeBtnText, { color: isDark ? '#064E3B' : '#FFFFFF' }]}>
                                    Upgrade to Pro
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* ── Add Recurring Expense sheet ── */}
            <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => { setShowForm(false); resetForm(); }}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHandle} />
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }, T.bold]}>Add Recurring Expense</Text>
                            <TouchableOpacity
                                onPress={() => { setShowForm(false); resetForm(); }}
                                activeOpacity={0.7}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <X size={22} color={colors.secondaryText} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.fieldLabel, { color: colors.secondaryText }, T.semibold]}>TITLE</Text>
                        <TextInput
                            style={[styles.formInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                            placeholder="e.g. Rent, Netflix, Hydro"
                            placeholderTextColor={colors.faintText}
                            value={description}
                            onChangeText={setDescription}
                        />

                        <Text style={[styles.fieldLabel, { color: colors.secondaryText }, T.semibold]}>AMOUNT (CAD)</Text>
                        <TextInput
                            style={[styles.formInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                            placeholder="0.00"
                            placeholderTextColor={colors.faintText}
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="decimal-pad"
                        />

                        <Text style={[styles.fieldLabel, { color: colors.secondaryText }, T.semibold]}>FREQUENCY</Text>
                        <View style={styles.toggleRow}>
                            {FREQUENCIES.map(({ key, label }) => (
                                <TouchableOpacity
                                    key={key}
                                    style={[
                                        styles.toggleBtn,
                                        { borderColor: colors.border },
                                        frequency === key && { backgroundColor: colors.accent, borderColor: colors.accent },
                                    ]}
                                    onPress={() => setFrequency(key)}
                                    activeOpacity={0.75}
                                >
                                    <Text style={[
                                        styles.toggleText,
                                        { color: frequency === key ? '#1A1A1A' : colors.secondaryText },
                                        T.semibold,
                                    ]}>
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.fieldLabel, { color: colors.secondaryText }, T.semibold]}>START DATE</Text>
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
                                <Text style={[styles.fieldLabel, { color: colors.secondaryText }, T.semibold]}>GROUP (OPTIONAL)</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: vs(16) }}>
                                    <TouchableOpacity
                                        style={[
                                            styles.groupChip,
                                            { borderColor: colors.border },
                                            groupId === null && { backgroundColor: colors.accent, borderColor: colors.accent },
                                        ]}
                                        onPress={() => setGroupId(null)}
                                        activeOpacity={0.75}
                                    >
                                        <Text style={[styles.groupChipText, { color: groupId === null ? '#1A1A1A' : colors.secondaryText }, T.semibold]}>None</Text>
                                    </TouchableOpacity>
                                    {groups.map(g => (
                                        <TouchableOpacity
                                            key={g.id}
                                            style={[
                                                styles.groupChip,
                                                { borderColor: colors.border, marginLeft: scale(8) },
                                                groupId === g.id && { backgroundColor: colors.accent, borderColor: colors.accent },
                                            ]}
                                            onPress={() => setGroupId(g.id)}
                                            activeOpacity={0.75}
                                        >
                                            <Text style={[styles.groupChipText, { color: groupId === g.id ? '#1A1A1A' : colors.secondaryText }, T.semibold]}>{g.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </>
                        )}

                        <TouchableOpacity
                            style={[styles.submitBtn, { backgroundColor: colors.accent, opacity: submitting ? 0.6 : 1 }]}
                            onPress={handleSubmit}
                            disabled={submitting}
                            activeOpacity={0.8}
                        >
                            {submitting
                                ? <ActivityIndicator color="#1A1A1A" />
                                : <Text style={[styles.submitBtnText, T.bold]}>Add Recurring Expense</Text>
                            }
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(24),
        paddingTop: vs(28),
        paddingBottom: vs(20),
    },
    pageTitle: {
        fontSize: ms(22),
        fontWeight: '800',
        letterSpacing: -0.3,
        marginBottom: vs(3),
    },
    pageSubtitle: {
        fontSize: ms(13),
        fontWeight: '400',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: vs(6),
        paddingHorizontal: scale(14),
        paddingVertical: vs(8),
        borderRadius: ms(14),
    },
    addButtonText: {
        color: '#1A1A1A',
        fontSize: ms(14),
        fontWeight: '700',
    },
    scrollContent: {
        paddingHorizontal: scale(24),
        paddingBottom: vs(48),
    },

    // Swipeable row
    swipeContainer: {
        position: 'relative',
        marginBottom: vs(10),
        borderRadius: ms(18),
        overflow: 'hidden',
    },
    deleteAction: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        borderRadius: ms(18),
        justifyContent: 'center',
        alignItems: 'center',
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
        fontWeight: '700',
    },

    expenseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: ms(18),
        borderWidth: 1,
        padding: scale(16),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    rowIcon: {
        width: 42,
        height: 42,
        borderRadius: ms(13),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: scale(12),
    },
    rowInfo: { flex: 1 },
    rowTitle: {
        fontSize: ms(15),
        fontWeight: '700',
        marginBottom: vs(3),
    },
    rowMeta: {
        fontSize: ms(12),
        lineHeight: 17,
    },

    // Upsell
    upsellCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: vs(12),
        borderRadius: ms(16),
        borderWidth: 1,
        padding: scale(16),
        marginTop: vs(8),
    },
    upsellText: { flex: 1 },
    upsellTitle: {
        fontSize: ms(15),
        fontWeight: '700',
        marginBottom: vs(6),
    },
    upsellSub: {
        fontSize: ms(13),
        lineHeight: 18,
        marginBottom: vs(14),
    },
    upgradeBtn: {
        borderRadius: ms(13),
        paddingVertical: vs(12),
        alignItems: 'center',
    },
    upgradeBtnText: {
        fontSize: ms(14),
        fontWeight: '700',
    },

    // Empty state
    emptyState: {
        marginTop: vs(16),
        padding: scale(36),
        alignItems: 'center',
        borderRadius: ms(20),
        borderWidth: 1,
    },
    emptyTitle: {
        fontSize: ms(16),
        fontWeight: '700',
        marginBottom: vs(6),
    },
    emptySub: {
        fontSize: ms(13),
        textAlign: 'center',
        lineHeight: 19,
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
        backgroundColor: 'rgba(128,128,128,0.3)',
        alignSelf: 'center',
        marginBottom: vs(16),
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: vs(20),
    },
    modalTitle: {
        fontSize: ms(18),
    },
    fieldLabel: {
        fontSize: ms(11),
        letterSpacing: 0.4,
        marginBottom: vs(6),
    },
    formInput: {
        borderWidth: 1,
        borderRadius: ms(14),
        paddingHorizontal: scale(14),
        height: vs(48),
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
        paddingVertical: vs(10),
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
