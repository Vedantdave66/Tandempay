import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { scale, vs, ms } from '../utils/responsive';
import { useTheme } from '../context/ThemeContext';
import { T } from '../utils/typography';
import PressableScale from '../components/PressableScale';
import { Users, Receipt, Send, CheckCircle2, ArrowLeft, Mail, Settings, CheckCheck } from 'lucide-react-native';

// ─── Data ────────────────────────────────────────────────────────────────────

type TutorialStep = {
    icon: any;
    color: string;
    bgColor: string;
    title: string;
    lines: string[];
    bankPicker?: boolean;
};

const STEPS: TutorialStep[] = [
    {
        icon: Users,
        color: '#6366F1',        // indigo — matches groupsApi palette
        bgColor: 'rgba(99, 102, 241, 0.1)',
        title: '1. Create a group and add friends',
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
        title: '2. Add expenses and split them',
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
        title: '3. Settle up and confirm payments',
        lines: [
            'Tap "Settle Up" in the Balances section to see who owes what.',
            'Select a debt and tap "Record Payment". The payee receives a notification.',
            'Once you\'ve sent the money, tap "Mark as Sent". The payee confirms receipt and the balance clears.',
        ],
    },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function TutorialScreen({ navigation, route }: any) {
    const { colors } = useTheme();

    const mode = route.params?.mode;

    const [selectedBank, setSelectedBank] = useState<string | null>(null);

    const BANKS = [
        {
            id: 'td',
            name: 'TD',
            steps: [
                'Open the TD app → More → Interac e-Transfer.',
                'Tap "Settings", then "Notification Preferences".',
                'Add your TandemPay address as the notification email.',
            ],
        },
        {
            id: 'rbc',
            name: 'RBC',
            steps: [
                'Open the RBC app → Pay & Transfer → Interac e-Transfer.',
                'Tap the gear icon → "Settings".',
                'Under "Email Notifications", add your TandemPay address.',
            ],
        },
        {
            id: 'scotiabank',
            name: 'Scotiabank',
            steps: [
                'Open the Scotia app → Move Money → Interac e-Transfer.',
                'Tap "Transfer Settings".',
                'Add your TandemPay address as the notification email.',
            ],
        },
        {
            id: 'bmo',
            name: 'BMO',
            steps: [
                'Open the BMO app → Transfers → Interac e-Transfer.',
                'Tap "Settings" or "Manage".',
                'Add your TandemPay address under email notifications.',
            ],
        },
        {
            id: 'cibc',
            name: 'CIBC',
            steps: [
                'Open the CIBC app → Pay & Transfer → Interac e-Transfer.',
                'Tap "Settings".',
                'Add your TandemPay address as your notification email.',
            ],
        },
        {
            id: 'other',
            name: 'Other',
            steps: [
                'Open your bank app and go to Interac e-Transfer settings.',
                'Find "Notification Email" or "Transfer Preferences".',
                'Add your TandemPay address and save.',
            ],
        },
    ];

    const INTERAC_STEPS: TutorialStep[] = [
        {
            icon: Mail,
            color: colors.accent,
            bgColor: colors.accentLight,
            title: 'Your personal payment address',
            lines: [
                'TandemPay gives you a unique email address, like a3f9b2@inbound.tandempay.ca.',
                'It\'s yours permanently. No one else has it.',
                'Copy it from the TandemPay app anytime under Profile → Interac Auto-Confirm.',
            ],
        },
        {
            icon: Settings,
            color: colors.indigo,
            bgColor: colors.indigo + '1F',
            title: 'Set it in your bank once',
            lines: [],
            bankPicker: true,
        },
        {
            icon: CheckCheck,
            color: colors.accent,
            bgColor: colors.accentLight,
            title: 'Payments confirm themselves',
            lines: [
                'When your roommate sends you money via Interac, your bank emails your TandemPay address.',
                'TandemPay sees it instantly and marks the debt settled.',
                'You get a push notification. The debt clears itself.',
            ],
        },
    ];

    const steps = mode === 'interac' ? INTERAC_STEPS : STEPS;

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
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                    {mode === 'interac' ? 'How Auto-Confirm works' : 'How TandemPay works'}
                </Text>
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
                {steps.map((step, idx) => {
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

                            {/* Bank picker */}
                            {step.bankPicker && (
                                selectedBank === null ? (
                                    <View style={styles.bankGrid}>
                                        {BANKS.map((bank) => (
                                            <PressableScale
                                                key={bank.id}
                                                scaleTo={0.97}
                                                haptic="light"
                                                onPress={() => setSelectedBank(bank.id)}
                                                style={[styles.bankChip, { borderColor: colors.border, backgroundColor: colors.surface }]}
                                            >
                                                <Text style={[T.semibold, { fontSize: ms(14), color: colors.text }]}>
                                                    {bank.name}
                                                </Text>
                                            </PressableScale>
                                        ))}
                                    </View>
                                ) : (
                                    <View>
                                        <PressableScale
                                            scaleTo={0.97}
                                            haptic="light"
                                            onPress={() => setSelectedBank(null)}
                                            style={styles.bankBackChip}
                                        >
                                            <Text style={[T.semibold, { fontSize: ms(12), color: colors.accent }]}>
                                                ← All banks
                                            </Text>
                                        </PressableScale>
                                        {BANKS.find((b) => b.id === selectedBank)?.steps.map((bankStep, stepIdx) => (
                                            <View key={stepIdx} style={styles.bankStepRow}>
                                                <View style={[styles.bankStepCircle, { backgroundColor: colors.accentBg }]}>
                                                    <Text style={[T.bold, { fontSize: ms(12), color: colors.accent }]}>
                                                        {stepIdx + 1}
                                                    </Text>
                                                </View>
                                                <Text style={[T.regular, { fontSize: ms(14), color: colors.text, flex: 1, lineHeight: 20 }]}>
                                                    {bankStep}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                )
                            )}
                        </View>
                    );
                })}

                {/* Tip */}
                <View style={[styles.tip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.tipLabel, { color: colors.accent }]}>Tip</Text>
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
                    <Text style={styles.gotItText}>Got it</Text>
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
        paddingHorizontal: scale(20),
        paddingVertical: vs(14),
        borderBottomWidth: 1,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: ms(20),
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    headerTitle: { fontSize: ms(17), fontWeight: '700' },
    headerSpacer: { width: 40 },   // mirrors backBtn width to keep title centred

    scroll: {
        paddingHorizontal: scale(20),
        paddingTop: vs(24),
        paddingBottom: vs(48),
        gap: vs(16),
    },

    heroRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: vs(10),
        marginBottom: vs(8),
    },
    heroText: {
        fontSize: ms(20),
        fontWeight: '700',
        letterSpacing: -0.5,
    },

    card: {
        borderRadius: ms(20),
        borderWidth: 1,
        padding: scale(18),
        gap: vs(12),
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: vs(12),
        marginBottom: vs(4),
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: ms(14),
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: {
        fontSize: ms(15),
        fontWeight: '700',
        flex: 1,
        flexWrap: 'wrap',
        lineHeight: 21,
    },

    bulletRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: vs(10),
    },
    bullet: {
        width: 6,
        height: 6,
        borderRadius: ms(3),
        marginTop: vs(7),
        flexShrink: 0,
    },
    bulletText: {
        fontSize: ms(14),
        lineHeight: 21,
        flex: 1,
    },

    bankGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: scale(8),
        marginTop: vs(12),
    },
    bankChip: {
        paddingVertical: vs(10),
        paddingHorizontal: scale(16),
        borderRadius: ms(12),
        borderWidth: 1,
    },
    bankBackChip: {
        alignSelf: 'flex-start',
        paddingVertical: vs(4),
        marginBottom: vs(10),
    },
    bankStepRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: scale(10),
        marginBottom: vs(10),
    },
    bankStepCircle: {
        width: scale(24),
        height: scale(24),
        borderRadius: scale(12),
        alignItems: 'center',
        justifyContent: 'center',
    },

    tip: {
        borderRadius: ms(16),
        borderWidth: 1,
        padding: scale(16),
        gap: vs(6),
    },
    tipLabel: {
        fontSize: ms(12),
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    tipText: {
        fontSize: ms(13),
        lineHeight: 19,
    },

    gotItBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: vs(8),
        height: 56,
        borderRadius: ms(28),
        marginTop: vs(8),
    },
    gotItText: {
        color: '#064E3B',
        fontSize: ms(16),
        fontWeight: '600',
    },
});
