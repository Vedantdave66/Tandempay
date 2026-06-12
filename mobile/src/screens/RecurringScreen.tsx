import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Alert,
    Linking,
    Modal,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { scale, vs, ms } from '../utils/responsive';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { RefreshCw, Plus, Crown, X } from 'lucide-react-native';
import { recurringApi, groupsApi, RecurringExpenseOut, GroupListItem } from '../services/api';
import { T } from '../utils/typography';

const PREVIEW_ROWS = [
    { title: 'Rent', amount: '$800', frequency: 'Monthly', split: 'Split with 2 people' },
    { title: 'Netflix', amount: '$18', frequency: 'Monthly', split: 'Split with 3 people' },
    { title: 'Hydro', amount: '$95', frequency: 'Monthly', split: 'Split with 2 people' },
];

export default function RecurringScreen({ navigation }: any) {
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const isPro = user?.subscription_tier === 'pro';

    const [items, setItems] = useState<RecurringExpenseOut[]>([]);
    const [loading, setLoading] = useState(isPro);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('monthly');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
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
        setStartDate(new Date().toISOString().split('T')[0]);
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

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.pageTitle, { color: colors.text }]}>
                        <RefreshCw size={20} color={colors.accent} /> Recurring Expenses
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
                            <View
                                key={item.id}
                                style={[styles.expenseRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                            >
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
                    <>
                        <View pointerEvents="none" style={{ opacity: 0.4 }}>
                            {PREVIEW_ROWS.map(row => (
                                <View
                                    key={row.title}
                                    style={[styles.expenseRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                >
                                    <View style={[styles.rowIcon, { backgroundColor: isDark ? 'rgba(74,222,128,0.12)' : 'rgba(22,163,74,0.08)' }]}>
                                        <RefreshCw size={18} color={colors.accent} />
                                    </View>
                                    <View style={styles.rowInfo}>
                                        <Text style={[styles.rowTitle, { color: colors.text }]}>{row.title}</Text>
                                        <Text style={[styles.rowMeta, { color: colors.secondaryText }]}>
                                            {row.amount} · {row.frequency} · {row.split}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>

                        <View style={[styles.upsellCard, {
                            backgroundColor: isDark ? 'rgba(74,222,128,0.06)' : 'rgba(22,163,74,0.04)',
                            borderColor: isDark ? 'rgba(74,222,128,0.2)' : 'rgba(22,163,74,0.15)',
                        }]}>
                            <Crown size={16} color={colors.accent} />
                            <View style={styles.upsellText}>
                                <Text style={[styles.upsellTitle, { color: colors.text }]}>
                                    Automate your monthly bills with Pro
                                </Text>
                                <Text style={[styles.upsellSub, { color: colors.secondaryText }]}>
                                    Set it once, TandemPay handles the rest.
                                </Text>
                                <TouchableOpacity
                                    onPress={() => Linking.openURL('https://tandempay.ca/pricing')}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.learnMore, { color: colors.accent }]}>Learn more →</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </>
                )}
            </ScrollView>

            <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => setShowForm(false)}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
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
                            placeholderTextColor={colors.secondaryText}
                            value={description}
                            onChangeText={setDescription}
                        />

                        <Text style={[styles.fieldLabel, { color: colors.secondaryText }, T.semibold]}>AMOUNT (CAD)</Text>
                        <TextInput
                            style={[styles.formInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                            placeholder="0.00"
                            placeholderTextColor={colors.secondaryText}
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="decimal-pad"
                        />

                        <Text style={[styles.fieldLabel, { color: colors.secondaryText }, T.semibold]}>FREQUENCY</Text>
                        <View style={styles.toggleRow}>
                            {(['weekly', 'biweekly', 'monthly'] as const).map(f => (
                                <TouchableOpacity
                                    key={f}
                                    style={[
                                        styles.toggleBtn,
                                        { borderColor: colors.border },
                                        frequency === f && { backgroundColor: colors.accent, borderColor: colors.accent },
                                    ]}
                                    onPress={() => setFrequency(f)}
                                    activeOpacity={0.75}
                                >
                                    <Text style={[
                                        styles.toggleText,
                                        { color: frequency === f ? '#1A1A1A' : colors.secondaryText },
                                        T.semibold,
                                    ]}>
                                        {f === 'biweekly' ? 'Biweekly' : f.charAt(0).toUpperCase() + f.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.fieldLabel, { color: colors.secondaryText }, T.semibold]}>START DATE</Text>
                        <TextInput
                            style={[styles.formInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={colors.secondaryText}
                            value={startDate}
                            onChangeText={setStartDate}
                            keyboardType="numeric"
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
    expenseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: ms(18),
        borderWidth: 1,
        padding: scale(16),
        marginBottom: vs(10),
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
        fontSize: ms(14),
        fontWeight: '700',
        marginBottom: vs(3),
    },
    upsellSub: {
        fontSize: ms(12),
        lineHeight: 17,
        marginBottom: vs(6),
    },
    learnMore: {
        fontSize: ms(13),
        fontWeight: '600',
    },
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
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    modalSheet: {
        borderTopLeftRadius: ms(24),
        borderTopRightRadius: ms(24),
        padding: scale(24),
        paddingBottom: vs(36),
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
        gap: scale(10),
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
        fontSize: ms(14),
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
