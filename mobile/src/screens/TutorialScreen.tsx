import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Users, Receipt, Send, CheckCircle2, ArrowLeft } from 'lucide-react-native';

// ─── Data ────────────────────────────────────────────────────────────────────

const STEPS = [
    {
        icon: Users,
        color: '#6366F1',        // indigo — matches groupsApi palette
        bgColor: 'rgba(99, 102, 241, 0.1)',
        title: '1. Create a Group & Add Friends',
        lines: [
            'Tap the + button on the Dashboard to create a new group (e.g. "Trip to Montreal").',
            'Open the group, tap the Members icon in the top-right, and add friends by email or from your friends list.',
            'Only TandemPay users can be added directly. Share the link to invite new users.',
        ],
    },
    {
        icon: Receipt,
        color: '#F59E0B',        // amber — matches expense palette
        bgColor: 'rgba(245, 158, 11, 0.1)',
        title: '2. Add Expenses & Split Them',
        lines: [
            'Inside a group, tap the green + button to add an expense.',
            'Enter the title, total amount, and who paid. Select which members to split it among.',
            'TandemPay divides the cost equally and tracks every person\'s share automatically.',
        ],
    },
    {
        icon: Send,
        color: '#3ECF8E',        // accent green — matches settle palette
        bgColor: 'rgba(62, 207, 142, 0.1)',
        title: '3. Settle Up & Confirm Payments',
        lines: [
            'Tap "Settle Up" in the Balances section to see who owes what.',
            'Select a debt and tap "Record Payment". The payee receives a notification.',
            'Once you\'ve sent the money, tap "Mark as Sent". The payee confirms receipt — the balance clears.',
        ],
    },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function TutorialScreen({ navigation }: any) {
    const { colors } = useTheme();

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    activeOpacity={0.8}
                >
                    <ArrowLeft color={colors.text} size={20} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>How TandemPay Works</Text>
                {/* Spacer balances the back button */}
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero */}
                <View style={styles.heroRow}>
                    <CheckCircle2 color={colors.accent} size={32} />
                    <Text style={[styles.heroText, { color: colors.text }]}>
                        3 steps to split any expense
                    </Text>
                </View>

                {/* Steps */}
                {STEPS.map((step, idx) => {
                    const Icon = step.icon;
                    return (
                        <View
                            key={idx}
                            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        >
                            {/* Card header */}
                            <View style={styles.cardHeader}>
                                <View style={[styles.iconBox, { backgroundColor: step.bgColor }]}>
                                    <Icon color={step.color} size={22} />
                                </View>
                                <Text style={[styles.cardTitle, { color: colors.text }]}>
                                    {step.title}
                                </Text>
                            </View>

                            {/* Bullet lines */}
                            {step.lines.map((line, lineIdx) => (
                                <View key={lineIdx} style={styles.bulletRow}>
                                    <View style={[styles.bullet, { backgroundColor: step.color }]} />
                                    <Text style={[styles.bulletText, { color: colors.secondaryText }]}>
                                        {line}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    );
                })}

                {/* Tip */}
                <View style={[styles.tip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.tipLabel, { color: colors.accent }]}>💡 TIP</Text>
                    <Text style={[styles.tipText, { color: colors.secondaryText }]}>
                        Pull down to refresh any screen for the latest balances. All data syncs live from the server.
                    </Text>
                </View>

                {/* Got it button */}
                <TouchableOpacity
                    style={[styles.gotItBtn, { backgroundColor: colors.accent }]}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.85}
                >
                    <CheckCircle2 color="#064E3B" size={20} />
                    <Text style={styles.gotItText}>Got it!</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    safe: { flex: 1 },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    headerTitle: { fontSize: 17, fontWeight: '700' },
    headerSpacer: { width: 40 },   // mirrors backBtn width to keep title centred

    scroll: {
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 48,
        gap: 16,
    },

    heroRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    heroText: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.3,
    },

    card: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 18,
        gap: 12,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 4,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '800',
        flex: 1,
        flexWrap: 'wrap',
        lineHeight: 20,
    },

    bulletRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    bullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginTop: 7,
        flexShrink: 0,
    },
    bulletText: {
        fontSize: 14,
        lineHeight: 21,
        flex: 1,
    },

    tip: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        gap: 6,
    },
    tipLabel: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    tipText: {
        fontSize: 13,
        lineHeight: 19,
    },

    gotItBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 56,
        borderRadius: 28,
        marginTop: 8,
    },
    gotItText: {
        color: '#064E3B',
        fontSize: 16,
        fontWeight: '900',
    },
});
