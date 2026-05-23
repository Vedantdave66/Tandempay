import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Alert,
    Linking,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { RefreshCw, Plus, Crown } from 'lucide-react-native';

const PREVIEW_ROWS = [
    { title: 'Rent', amount: '$800', frequency: 'Monthly', split: 'Split with 2 people' },
    { title: 'Netflix', amount: '$18', frequency: 'Monthly', split: 'Split with 3 people' },
    { title: 'Hydro', amount: '$95', frequency: 'Monthly', split: 'Split with 2 people' },
];

export default function RecurringScreen({ navigation }: any) {
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const isPro = user?.subscription_tier === 'pro';

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
                        onPress={() => Alert.alert('Coming soon', 'Creating recurring expenses will be available in a future update.')}
                        activeOpacity={0.85}
                    >
                        <Plus size={18} color="#1A1A1A" />
                        <Text style={styles.addButtonText}>Add</Text>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View pointerEvents={isPro ? 'auto' : 'none'} style={{ opacity: isPro ? 1 : 0.4 }}>
                    {PREVIEW_ROWS.map((row, index) => (
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

                {!isPro && (
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
                )}

                {isPro && (
                    <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <RefreshCw size={40} color={colors.secondaryText} style={{ opacity: 0.3, marginBottom: 12 }} />
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>No recurring expenses yet</Text>
                        <Text style={[styles.emptySub, { color: colors.secondaryText }]}>
                            Tap Add to set up your first recurring bill.
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 28,
        paddingBottom: 20,
    },
    pageTitle: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.3,
        marginBottom: 3,
    },
    pageSubtitle: {
        fontSize: 13,
        fontWeight: '400',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 14,
    },
    addButtonText: {
        color: '#1A1A1A',
        fontSize: 14,
        fontWeight: '700',
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 48,
    },
    expenseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 18,
        borderWidth: 1,
        padding: 16,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    rowIcon: {
        width: 42,
        height: 42,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    rowInfo: { flex: 1 },
    rowTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 3,
    },
    rowMeta: {
        fontSize: 12,
        lineHeight: 17,
    },
    upsellCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        marginTop: 8,
    },
    upsellText: { flex: 1 },
    upsellTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 3,
    },
    upsellSub: {
        fontSize: 12,
        lineHeight: 17,
        marginBottom: 6,
    },
    learnMore: {
        fontSize: 13,
        fontWeight: '600',
    },
    emptyState: {
        marginTop: 16,
        padding: 36,
        alignItems: 'center',
        borderRadius: 20,
        borderWidth: 1,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 6,
    },
    emptySub: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 19,
    },
});
