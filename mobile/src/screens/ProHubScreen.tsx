import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Linking,
    Share,
    Modal,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { scale, vs, ms } from '../utils/responsive';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ACCENT_PRESETS, AccentKey } from '../constants/Colors';
import { Crown, Check, ShieldCheck, Bell, UserPlus, Sun, ChevronRight } from 'lucide-react-native';
import CharacterShape from '../components/CharacterShape';
import CharacterSetupModal from '../components/CharacterSetupModal';

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
    const { colors, isDark, toggleTheme, theme, accentKey, setAccent } = useTheme();
    const isPro = user?.subscription_tier === 'pro';
    const [showCharModal, setShowCharModal] = useState(false);
    const [showAppearance, setShowAppearance] = useState(false);

    const handleSettingsTap = (label: string) => {
        Alert.alert('Coming soon', `${label} is on our roadmap.`);
    };

    const handleProAction = () => {
        // TODO: route to a dedicated subscription-management screen once one exists
        Linking.openURL('https://tandempay.ca/pricing');
    };

    const handleInvite = async () => {
        const { status } = await Contacts.requestPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Allow contacts access to invite friends.');
            return;
        }
        const { data } = await Contacts.getContactsAsync({
            fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
        });
        if (!data.length) { Alert.alert('No contacts found'); return; }
        await Share.share({
            message: `Hey! I'm using TandemPay to split expenses with roommates. Join me: https://tandempay.ca/invite`,
            title: 'Join me on TandemPay',
        });
    };

    const handleSignOut = () => {
        Alert.alert('Sign out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign out', style: 'destructive', onPress: () => logout() },
        ]);
    };

    return (
        <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={{ paddingBottom: vs(120) }} showsVerticalScrollIndicator={false}>
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
                        onPress={() => setShowCharModal(true)}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.customiseChipText, { color: colors.accent }]}>✏ Customise character</Text>
                    </TouchableOpacity>
                </LinearGradient>

                <View style={styles.body}>
                    {/* Pro card */}
                    <View style={[styles.proCard, { borderColor: colors.border }]}>
                        <LinearGradient colors={[colors.accentDark, colors.accent]} style={styles.proHeader}>
                            <View style={styles.proHeaderRow}>
                                <Crown size={20} color="#fff" />
                                <Text style={styles.proTitle}>TandemPay Pro</Text>
                            </View>
                            <View style={styles.priceChip}>
                                <Text style={[styles.priceChipText, { color: colors.accent }]}>$4.99/mo</Text>
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
                                    onPress={() => {
                                        if (row.label === 'Invite a friend') return handleInvite();
                                        if (row.label === 'Appearance') return setShowAppearance(true);
                                        handleSettingsTap(row.label);
                                    }}
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
            <CharacterSetupModal
                visible={showCharModal}
                onClose={() => setShowCharModal(false)}
            />

            {/* Appearance bottom sheet */}
            <Modal
                visible={showAppearance}
                animationType="slide"
                transparent
                onRequestClose={() => setShowAppearance(false)}
            >
                <TouchableOpacity
                    style={styles.appearanceBackdrop}
                    activeOpacity={1}
                    onPress={() => setShowAppearance(false)}
                />
                <View style={[styles.appearanceSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={[styles.appearanceHandle, { backgroundColor: colors.border }]} />

                    <Text style={[styles.appearanceTitle, { color: colors.text }]}>Appearance</Text>

                    {/* Accent swatches */}
                    <Text style={[styles.appearanceLabel, { color: colors.secondaryText }]}>ACCENT COLOR</Text>
                    <View style={styles.swatchRow}>
                        {(Object.keys(ACCENT_PRESETS) as AccentKey[]).map(key => {
                            const swatch = ACCENT_PRESETS[key][isDark ? 'dark' : 'light'];
                            const selected = accentKey === key;
                            return (
                                <TouchableOpacity
                                    key={key}
                                    onPress={() => setAccent(key)}
                                    activeOpacity={0.8}
                                    style={[
                                        styles.swatch,
                                        { backgroundColor: swatch },
                                        selected && styles.swatchSelected,
                                    ]}
                                >
                                    {selected && (
                                        <Text style={styles.swatchCheck}>✓</Text>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Dark / Light toggle */}
                    <Text style={[styles.appearanceLabel, { color: colors.secondaryText }]}>COLOR SCHEME</Text>
                    <View style={[styles.themeToggleRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', borderRadius: ms(14) }]}>
                        {(['light', 'dark'] as const).map(t => {
                            const active = theme === t;
                            return (
                                <TouchableOpacity
                                    key={t}
                                    onPress={() => { if (!active) toggleTheme(); }}
                                    activeOpacity={0.8}
                                    style={[
                                        styles.themeBtn,
                                        active && { backgroundColor: colors.accent, borderRadius: ms(12) },
                                    ]}
                                >
                                    <Text style={[styles.themeBtnText, { color: active ? '#fff' : colors.secondaryText }]}>
                                        {t === 'light' ? '☀ Light' : '🌙 Dark'}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Done */}
                    <TouchableOpacity
                        style={[styles.appearanceDone, { backgroundColor: colors.accent }]}
                        onPress={() => setShowAppearance(false)}
                        activeOpacity={0.85}
                    >
                        <Text style={[styles.appearanceDoneText, { color: '#fff' }]}>Done</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },

    hero: {
        alignItems: 'center',
        paddingVertical: vs(32),
        paddingHorizontal: scale(20),
        gap: vs(4),
    },
    heroName: {
        fontSize: ms(22),
        fontWeight: '800',
        letterSpacing: -0.3,
        marginTop: vs(12),
    },
    heroEmail: {
        fontSize: ms(14),
    },
    customiseChip: {
        marginTop: vs(12),
        borderRadius: 999,
        paddingHorizontal: scale(16),
        paddingVertical: vs(8),
    },
    customiseChipText: {
        fontSize: ms(13),
        fontWeight: '700',
    },

    body: {
        paddingHorizontal: scale(16),
        paddingTop: vs(16),
        gap: vs(14),
    },

    // Pro card
    proCard: {
        borderRadius: ms(20),
        borderWidth: 1,
        overflow: 'hidden',
    },
    proHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: scale(20),
    },
    proHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: vs(8),
    },
    proTitle: {
        fontSize: ms(18),
        fontWeight: '800',
        color: '#fff',
        letterSpacing: -0.2,
    },
    priceChip: {
        backgroundColor: '#fff',
        borderRadius: 999,
        paddingHorizontal: scale(12),
        paddingVertical: vs(5),
    },
    priceChipText: {
        fontSize: ms(12),
        fontWeight: '800',
        color: '#16A34A',
    },
    proBody: {
        padding: scale(20),
        gap: vs(12),
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: vs(10),
    },
    featureText: {
        flex: 1,
        fontSize: ms(13),
        fontWeight: '500',
        lineHeight: 18,
    },
    upgradeBtn: {
        marginTop: vs(4),
        borderRadius: ms(13),
        paddingVertical: vs(14),
        alignItems: 'center',
    },
    upgradeBtnText: {
        fontSize: ms(15),
        fontWeight: '700',
    },

    // Settings
    settingsCard: {
        borderRadius: ms(16),
        borderWidth: 1,
        overflow: 'hidden',
    },
    settingsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: vs(12),
        padding: scale(14),
    },
    settingsIconWrap: {
        width: 36,
        height: 36,
        borderRadius: ms(10),
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingsLabel: {
        flex: 1,
        fontSize: ms(15),
        fontWeight: '500',
    },

    // Appearance sheet
    appearanceBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    appearanceSheet: {
        paddingHorizontal: scale(20),
        paddingBottom: vs(40),
        paddingTop: vs(12),
        borderTopLeftRadius: ms(24),
        borderTopRightRadius: ms(24),
        borderWidth: StyleSheet.hairlineWidth,
    },
    appearanceHandle: {
        width: scale(36),
        height: vs(4),
        borderRadius: 99,
        alignSelf: 'center',
        marginBottom: vs(16),
    },
    appearanceTitle: {
        fontSize: ms(18),
        fontWeight: '700',
        marginBottom: vs(20),
        textAlign: 'center',
    },
    appearanceLabel: {
        fontSize: ms(11),
        fontWeight: '700',
        letterSpacing: 1.2,
        marginBottom: vs(12),
    },
    swatchRow: {
        flexDirection: 'row',
        gap: scale(12),
        marginBottom: vs(24),
    },
    swatch: {
        width: scale(40),
        height: scale(40),
        borderRadius: scale(20),
        alignItems: 'center',
        justifyContent: 'center',
    },
    swatchSelected: {
        borderWidth: 3,
        borderColor: '#FFFFFF',
    },
    swatchCheck: {
        color: '#FFFFFF',
        fontSize: ms(16),
        fontWeight: '800',
    },
    themeToggleRow: {
        flexDirection: 'row',
        padding: vs(4),
        marginBottom: vs(24),
    },
    themeBtn: {
        flex: 1,
        paddingVertical: vs(10),
        alignItems: 'center',
    },
    themeBtnText: {
        fontSize: ms(14),
        fontWeight: '600',
    },
    appearanceDone: {
        borderRadius: ms(14),
        paddingVertical: vs(14),
        alignItems: 'center',
    },
    appearanceDoneText: {
        fontSize: ms(15),
        fontWeight: '700',
    },

    // Sign out
    signOutBtn: {
        borderRadius: ms(16),
        padding: scale(18),
        alignItems: 'center',
    },
    signOutText: {
        fontSize: ms(16),
        fontWeight: '600',
    },
});
