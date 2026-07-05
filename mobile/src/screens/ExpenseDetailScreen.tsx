import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { expensesApi, Expense, ExpenseParticipant, GroupMember } from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';
import { scale, vs, ms } from '../utils/responsive';
import { T } from '../utils/typography';
import CharacterShape from '../components/CharacterShape';
import EditExpenseSheet from '../components/EditExpenseSheet';

/**
 * Splitwise-style expense detail. This PR: header + breakdown only.
 * Receipt, trends, and comments arrive in follow-up PRs.
 *
 * Receives the full expense object via params — the list payload already
 * includes per-member share_amount, so no extra fetch is needed.
 */
export default function ExpenseDetailScreen({ route, navigation }: any) {
    const { expense: initialExpense, groupId, members = [] } = route.params;
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    const insets = useSafeAreaInsets();

    const [expense, setExpense] = useState<Expense>(initialExpense);
    const [editTarget, setEditTarget] = useState<Expense | null>(null);
    const [deleting, setDeleting] = useState(false);

    const memberFor = (userId: string): GroupMember | undefined =>
        (members as GroupMember[]).find(m => m.user_id === userId);

    const payer = memberFor(expense.paid_by);
    const owers = expense.participants.filter(p => p.user_id !== expense.paid_by);

    const handleDelete = () => {
        Alert.alert(
            'Delete expense',
            `Remove "${expense.title}" ($${formatCurrency(expense.amount)})? This can't be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setDeleting(true);
                        try {
                            await expensesApi.delete(groupId, expense.id);
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            navigation.goBack();
                        } catch {
                            Alert.alert('Error', 'Could not delete this expense. Try again.');
                            setDeleting(false);
                        }
                    },
                },
            ]
        );
    };

    const renderOwerRow = (p: ExpenseParticipant) => {
        const m = memberFor(p.user_id);
        const isMe = p.user_id === user?.id;
        return (
            <View key={p.user_id} style={styles.owerRow}>
                <CharacterShape
                    shape={m?.character_shape ?? 'rect'}
                    color={m?.character_color ?? p.avatar_color ?? '#6B7280'}
                    variant="mini"
                />
                <Text style={[styles.owerText, { color: colors.secondaryText }, T.regular]} numberOfLines={1}>
                    {isMe ? 'You owe' : `${p.name} owes`}{' '}
                    <Text style={[{ color: colors.text, fontVariant: ['tabular-nums'] }, T.semibold]}>
                        ${formatCurrency(p.share_amount)}
                    </Text>
                </Text>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <LinearGradient
                colors={colors.heroGradient}
                locations={[0, 0.35, 1]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={[styles.headerGradient, { paddingTop: insets.top + vs(8) }]}
            >
                <View style={styles.headerRow}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.headerIconBtn}
                        activeOpacity={0.70}
                    >
                        <ArrowLeft size={20} color={isDark ? colors.accent : colors.accentDark} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }, T.bold]}>Details</Text>
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            onPress={() => setEditTarget(expense)}
                            style={styles.headerIconBtn}
                            activeOpacity={0.70}
                        >
                            <Pencil size={18} color={colors.secondaryText} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleDelete}
                            style={styles.headerIconBtn}
                            activeOpacity={0.70}
                            disabled={deleting}
                        >
                            {deleting
                                ? <ActivityIndicator size="small" color="#E05252" />
                                : <Trash2 size={18} color="#E05252" />
                            }
                        </TouchableOpacity>
                    </View>
                </View>

                <Text style={[styles.expenseTitle, { color: colors.text }, T.extrabold]} numberOfLines={2}>
                    {expense.title}
                </Text>
                <Text style={[styles.expenseAmount, { color: colors.text, fontVariant: ['tabular-nums'] }, T.extrabold]}>
                    ${formatCurrency(expense.amount)}
                </Text>
                <Text style={[styles.addedBy, { color: colors.secondaryText }, T.regular]}>
                    Added by {expense.payer_name} on{' '}
                    {new Date(expense.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={[styles.breakdownCard, {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    shadowColor: isDark ? '#000' : '#0A3020',
                    shadowOpacity: isDark ? 0.12 : 0.05,
                    shadowRadius: isDark ? 6 : 4,
                    shadowOffset: { width: 0, height: isDark ? 4 : 2 },
                    elevation: isDark ? 2 : 1,
                }]}>
                    <View style={styles.payerRow}>
                        <CharacterShape
                            shape={payer?.character_shape ?? 'rect'}
                            color={payer?.character_color ?? expense.payer_avatar_color ?? '#6B7280'}
                            variant="mini"
                        />
                        <Text style={[styles.payerText, { color: colors.text }, T.semibold]} numberOfLines={1}>
                            {expense.paid_by === user?.id ? 'You' : expense.payer_name} paid{' '}
                            <Text style={{ fontVariant: ['tabular-nums'] }}>${formatCurrency(expense.amount)}</Text>
                        </Text>
                    </View>
                    {owers.length > 0 && (
                        <View style={[styles.owersTree, { borderLeftColor: colors.border }]}>
                            {owers.map(renderOwerRow)}
                        </View>
                    )}
                </View>
            </ScrollView>

            <EditExpenseSheet
                expense={editTarget}
                onClose={() => setEditTarget(null)}
                onSaved={(updated) => {
                    setExpense(prev => ({ ...prev, ...updated }));
                    setEditTarget(null);
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    headerGradient: {
        paddingHorizontal: scale(20),
        paddingBottom: vs(20),
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: vs(16),
    },
    headerIconBtn: {
        minWidth: scale(44),
        minHeight: scale(44),
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: { fontSize: ms(16) },
    headerActions: { flexDirection: 'row' },

    expenseTitle: { fontSize: ms(22), letterSpacing: -0.6 },
    expenseAmount: { fontSize: ms(32), letterSpacing: -1.0, marginTop: vs(4) },
    addedBy: { fontSize: ms(13), marginTop: vs(6) },

    scrollContent: { padding: scale(20), paddingBottom: vs(100) },

    breakdownCard: {
        borderRadius: ms(20),
        borderWidth: StyleSheet.hairlineWidth,
        padding: scale(14),
    },
    payerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(12),
    },
    payerText: { fontSize: ms(15), flex: 1 },

    // The tree connector: a vertical line dropping from under the payer's
    // avatar, with each ower row indented off it.
    owersTree: {
        borderLeftWidth: StyleSheet.hairlineWidth,
        marginLeft: scale(16),
        paddingLeft: scale(16),
        marginTop: vs(10),
        gap: vs(12),
    },
    owerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(10),
    },
    owerText: { fontSize: ms(14), flex: 1 },
});
