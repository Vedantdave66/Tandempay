import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Crown, Check, ShieldCheck, Bell, UserPlus, Sun, ChevronRight } from 'lucide-react-native';
import CharacterShape from '../components/CharacterShape';

const PRO_FEATURES = [
    'Recurring Expenses — auto-split monthly bills on a schedule',
    'Export Data — download your full expense history as CSV or PDF',
    'AI Parsing — scan receipts and split itemized expenses instantly',
    'Multi-currency — track expenses in any currency, auto-converted',
];

const SETTINGS_ROWS = [
    { icon: ShieldCheck, label: 'Privacy & Security' },
    { icon: Bell,        label: 'Notifications' },
    { icon: UserPlus,    label: 'Invite a friend' },
    { icon: Sun,         label: 'Appearance' },
];

export default function ProHubScreen() {
    const { user, logout } = useAuth();
    const { colors, isDark } = useTheme();
    const isPro = user?.subscription_tier === 'pro';

    const handleSettingsTap = (label: string) => {
        Alert.alert('Coming soon', `${label} is on our roadmap.`);
    };

    const handleProAction = () => {
        // TODO: route to a dedicated subscription-management screen once one exists
        Linking.openURL('https://tandempay.ca/pricing');
    };

    const handleSignOut = () => {
        Alert.alert('Sign out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign out', style: 'destructive', onPress: () => logout() },
        ]);
    };

    return (
        <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
                {/* Hero */}
                <LinearGradient
                    colors={isDark ? ['#1A1015', '#141019', '#0D1410'] : ['#FBEDE8', '#F4EFF7', '#E9F6EE']}
                    style={styles.hero}
                >
                    <CharacterShape
                        shape={user?.character_shape ?? 'rect'}
                        color={user?.character_color ?? '#34D399'}
                        variant="hero"
                    />
                    <Text style={[styles.heroName, { color: colors.text }]}>{user?.name}</Text>
                    <Text style={[styles.heroEmail, { color: colors.faintText }]}>{user?.email}</Text>
                    <TouchableOpacity
                        style={[styles.customiseChip, { backgroundColor: colors.accentBg }]}
                        onPress={() => Alert.alert('Customise character', 'Re-open the character setup prompt to change your look — coming soon as a standalone screen.')}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.customiseChipText, { color: colors.accent }]}>✏ Customise character</Text>
                    </TouchableOpacity>
                </LinearGradient>

                <View style={styles.body}>
                    {/* Pro card */}
                    <View style={[styles.proCard, { borderColor: colors.border }]}>
                        <LinearGradient colors={['#15803D', '#16A34A']} style={styles.proHeader}>
                            <View style={styles.proHeaderRow}>
                                <Crown size={20} color="#fff" />
                                <Text style={styles.proTitle}>TandemPay Pro</Text>
                            </View>
                            <View style={styles.priceChip}>
                                <Text style={styles.priceChipText}>$4.99/mo</Text>
                            </View>
                        </LinearGradient>
                        <View style={[styles.proBody, { backgroundColor: colors.surface }]}>
                            {PRO_FEATURES.map(feature => (
                                <View key={feature} style={styles.featureRow}>
                                    <Check size={16} color={colors.accent} />
                                    <Text style={[styles.featureText, { color: colors.text }]}>{feature}</Text>
                                </View>
                            ))}
                            <TouchableOpacity style={[styles.upgradeBtn, { backgroundColor: colors.accent }]} onPress={handleProAction} activeOpacity={0.85}>
                                <Text style={[styles.upgradeBtnText, { color: isDark ? '#0D2B12' : '#0A5F30' }]}>
                                    {isPro ? 'Manage subscription →' : 'Upgrade to Pro →'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Settings list */}
                    <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        {SETTINGS_ROWS.map((row, index) => {
                            const Icon = row.icon;
                            return (
                                <TouchableOpacity
                                    key={row.label}
                                    style={[
                                        styles.settingsRow,
                                        index < SETTINGS_ROWS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                                    ]}
                                    onPress={() => handleSettingsTap(row.label)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.settingsIconWrap, { backgroundColor: colors.accentBg }]}>
                                        <Icon size={17} color={colors.accent} />
                                    </View>
                                    <Text style={[styles.settingsLabel, { color: colors.text }]}>{row.label}</Text>
                                    <ChevronRight size={16} color={colors.faintText} />
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Sign out */}
                    <TouchableOpacity
                        style={[styles.signOutBtn, { backgroundColor: colors.surface }]}
                        onPress={handleSignOut}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.signOutText, { color: colors.danger }]}>Sign out</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },

    hero: {
        alignItems: 'center',
        paddingVertical: 32,
        paddingHorizontal: 20,
        gap: 4,
    },
    heroName: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.3,
        marginTop: 12,
    },
    heroEmail: {
        fontSize: 14,
    },
    customiseChip: {
        marginTop: 12,
        borderRadius: 999,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    customiseChipText: {
        fontSize: 13,
        fontWeight: '700',
    },

    body: {
        paddingHorizontal: 16,
        paddingTop: 16,
        gap: 14,
    },

    // Pro card
    proCard: {
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
    },
    proHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
    },
    proHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    proTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: -0.2,
    },
    priceChip: {
        backgroundColor: '#fff',
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 5,
    },
    priceChipText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#16A34A',
    },
    proBody: {
        padding: 20,
        gap: 12,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    featureText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 18,
    },
    upgradeBtn: {
        marginTop: 4,
        borderRadius: 13,
        paddingVertical: 14,
        alignItems: 'center',
    },
    upgradeBtnText: {
        fontSize: 15,
        fontWeight: '700',
    },

    // Settings
    settingsCard: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    settingsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
    },
    settingsIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingsLabel: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
    },

    // Sign out
    signOutBtn: {
        borderRadius: 16,
        padding: 18,
        alignItems: 'center',
    },
    signOutText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
