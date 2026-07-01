import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
    Share,
    Animated,
    Easing,
    TouchableOpacity,
    Modal,
    Clipboard,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import * as Haptics from 'expo-haptics';
import { scale, vs, ms } from '../utils/responsive';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Crown, Check, Bell, UserPlus, Sun, ChevronRight, Users2, FileDown, RefreshCw, Mail } from 'lucide-react-native';
import CharacterShape from '../components/CharacterShape';
import CharacterSetupModal from '../components/CharacterSetupModal';
import PressableScale from '../components/PressableScale';
import { T } from '../utils/typography';

type SectionRow = {
    icon: React.ComponentType<any>;
    label: string;
    nav?: string;
    special?: string;
    danger?: boolean;
    noChevron?: boolean;
};

const PRO_FEATURES = [
    'Receipt scanning, split by item',
    'Recurring expenses, auto-split',
    'Export history as CSV or PDF',
    'Priority support',
];

const SETTINGS_ROWS = [
    { icon: Users2,      label: 'Friends' },
    { icon: Bell,        label: 'Notifications' },
    { icon: FileDown,    label: 'Export' },
    { icon: RefreshCw,   label: 'Recurring' },
    { icon: UserPlus,    label: 'Invite a friend' },
    { icon: Sun,         label: 'Appearance' },
];

export default function ProHubScreen({ navigation }: any) {
    const { user, logout } = useAuth();
    const { colors, isDark } = useTheme();
    const isPro = user?.subscription_tier === 'pro';
    const [showCharModal, setShowCharModal] = useState(false);
    const [showInteracModal, setShowInteracModal] = useState(false);
    const [interacToastMsg, setInteracToastMsg] = useState<string | null>(null);
    const interacToastAnim = useRef(new Animated.Value(0)).current;
    const interacToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const shimmerAnim = useRef(new Animated.Value(0.7)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, { toValue: 1.0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(shimmerAnim, { toValue: 0.7, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])
        ).start();
    }, []);

    const handleRowPress = (row: SectionRow) => {
        if (row.special === 'invite') return handleInvite();
        if (row.special === 'tutorial') return Alert.alert('Tutorial', 'Guided tutorial coming soon.');
        if (row.special === 'signout') return handleSignOut();
        if (row.nav) navigation.navigate(row.nav);
    };

    const handleInvite = async () => {
        const { status } = await Contacts.requestPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Allow contacts access to invite friends.');
            return;
        }
        await Share.share({
            message: `I'm using TandemPay to split expenses with roommates. Join me: https://tandempay.ca/invite`,
            title: 'Join me on TandemPay',
        });
    };

    const handleSignOut = () => {
        Alert.alert('Sign out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign out', style: 'destructive', onPress: () => logout() },
        ]);
    };

    const handleCopyInteracAddress = () => {
        const address = `${user?.interac_token}@inbound.tandempay.ca`;
        Clipboard.setString(address);
        Haptics.selectionAsync();
        if (interacToastTimer.current) clearTimeout(interacToastTimer.current);
        setInteracToastMsg('Copied!');
        interacToastAnim.setValue(0);
        Animated.timing(interacToastAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
        interacToastTimer.current = setTimeout(() => {
            Animated.timing(interacToastAnim, { toValue: 0, duration: 280, useNativeDriver: true })
                .start(() => setInteracToastMsg(null));
        }, 2000);
    };

    return (
        <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* Hero card */}
                <LinearGradient
                    colors={isDark ? colors.heroGradient : [colors.surface, colors.surface] as any}
                    locations={[0, 0.35, 1]}
                    style={[styles.heroCard, !isDark && { borderWidth: 1, borderColor: colors.border }]}
                >
                    <CharacterShape
                        shape={user?.character_shape ?? 'rect'}
                        color={user?.character_color ?? '#34D399'}
                        variant="hero"
                    />
                    <Text style={[styles.heroName, { color: colors.text }, T.bold]}>{user?.name}</Text>
                    <Text style={[styles.heroEmail, { color: colors.secondaryText }, T.regular]}>{user?.email}</Text>
                    <PressableScale
                        scaleTo={0.97}
                        haptic="light"
                        onPress={() => setShowCharModal(true)}
                        style={[styles.customiseChip, { backgroundColor: colors.accentBg }]}
                    >
                        <Text style={[styles.customiseChipText, { color: colors.accent }, T.semibold]}>Customise character</Text>
                    </PressableScale>
                </LinearGradient>

                <View style={styles.body}>
                    {/* Pro card */}
                    <View style={[styles.proCard, { borderColor: colors.border }]}>
                        <LinearGradient colors={[colors.accentDark, colors.accent]} style={styles.proHeader}>
                            <View style={styles.proHeaderRow}>
                                <Crown size={20} color="#fff" />
                                <Text style={styles.proTitle}>TandemPay Pro</Text>
                            </View>
                            <Animated.View style={[styles.priceChip, { opacity: shimmerAnim }]}>
                                <Text style={[styles.priceChipText, { color: colors.accent }]}>$4.99/mo</Text>
                            </Animated.View>
                        </LinearGradient>
                        <View style={[styles.proBody, { backgroundColor: colors.surface }]}>
                            {PRO_FEATURES.map(feature => (
                                <View key={feature} style={styles.featureRow}>
                                    <Check size={16} color={colors.accent} />
                                    <Text style={[styles.featureText, { color: colors.text }]}>{feature}</Text>
                                </View>
                            ))}
                        </View>

                        <PressableScale
                            scaleTo={0.97}
                            haptic="light"
                            onPress={() => navigation.navigate('Subscription')}
                            style={styles.upgradeBtn}
                        >
                            <View style={[styles.upgradeBtnInner, { borderColor: 'rgba(255,255,255,0.25)' }]}>
                                <Text style={[styles.upgradeBtnText, T.bold]}>
                                    {isPro ? 'Manage subscription' : 'Upgrade to Pro'}
                                </Text>
                            </View>
                        </PressableScale>
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
                                        index < SETTINGS_ROWS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                                    ]}
                                    onPress={() => {
                                        if (row.label === 'Friends') return navigation.navigate('FriendsHub');
                                        if (row.label === 'Notifications') return navigation.navigate('Notifications');
                                        if (row.label === 'Invite a friend') return handleInvite();
                                        if (row.label === 'Appearance') return navigation.navigate('Appearance');
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
                    {user?.interac_token && (
                        <TouchableOpacity
                            style={[styles.settingsRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
                            onPress={() => setShowInteracModal(true)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.settingsIconWrap, { backgroundColor: colors.accentBg }]}>
                                <Mail size={17} color={colors.accent} />
                            </View>
                            <Text style={[styles.settingsLabel, { color: colors.text }]}>Interac Auto-Confirm</Text>
                            <ChevronRight size={16} color={colors.faintText} />
                        </TouchableOpacity>
                    )}
                    </View>

            </ScrollView>

            <Modal
                visible={showInteracModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowInteracModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
                        <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
                        <Text style={[styles.modalTitle, T.bold, { color: colors.text }]}>Interac Auto-Confirm</Text>
                        <Text style={[styles.modalSubtitle, T.regular, { color: colors.secondaryText }]}>
                            Add this as your Interac notification email. TandemPay confirms payments automatically.
                        </Text>
                        <View style={[styles.tokenChip, { backgroundColor: colors.accentBg }]}>
                            <Text style={[styles.tokenText, T.semibold, { color: colors.accent }]} selectable>
                                {user?.interac_token}@inbound.tandempay.ca
                            </Text>
                        </View>
                        <PressableScale
                            scaleTo={0.97}
                            haptic="light"
                            onPress={handleCopyInteracAddress}
                            style={[styles.copyBtn, { backgroundColor: colors.accent }]}
                        >
                            <Text style={[styles.copyBtnText, T.semibold]}>Copy address</Text>
                        </PressableScale>
                        {interacToastMsg && (
                            <Animated.View style={[styles.interacToast, { opacity: interacToastAnim, backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <Text style={[T.semibold, { color: colors.text, fontSize: ms(13) }]}>{interacToastMsg}</Text>
                            </Animated.View>
                        )}
                        <PressableScale onPress={() => setShowInteracModal(false)} style={styles.doneLink}>
                            <Text style={[T.semibold, { color: colors.accent, fontSize: ms(15) }]}>Done</Text>
                        </PressableScale>
                    </View>
                </View>
            </Modal>

            <CharacterSetupModal
                visible={showCharModal}
                onClose={() => setShowCharModal(false)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },

    scroll: {
        paddingBottom: vs(100),
    },

    // Hero
    heroCard: {
        alignItems: 'center',
        paddingVertical: vs(32),
        paddingHorizontal: scale(20),
        borderRadius: ms(28),
        marginHorizontal: scale(20),
        marginTop: vs(16),
        gap: vs(4),
    },
    heroName: {
        fontSize: ms(22),
        letterSpacing: -0.3,
        marginTop: vs(12),
    },
    heroEmail: {
        fontSize: ms(13),
    },
    customiseChip: {
        marginTop: vs(10),
        borderRadius: 999,
        paddingHorizontal: scale(16),
        paddingVertical: vs(8),
    },
    customiseChipText: {
        fontSize: ms(13),
    },

    // Pro card
    proSection: {
        paddingHorizontal: scale(20),
        paddingTop: vs(20),
    },
    proCard: {
        borderRadius: ms(24),
        borderWidth: 1.5,
        overflow: 'hidden',
        padding: scale(20),
        gap: vs(16),
    },
    proCardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    proTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
    },
    proTitle: {
        fontSize: ms(18),
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
    },
    proFeatures: {
        gap: vs(10),
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(10),
    },
    featureText: {
        flex: 1,
        fontSize: ms(13),
        color: 'rgba(255,255,255,0.9)',
        lineHeight: 18,
    },
    upgradeBtn: {
        borderRadius: ms(14),
        overflow: 'hidden',
    },
    upgradeBtnInner: {
        paddingVertical: vs(14),
        alignItems: 'center',
        borderRadius: ms(14),
        borderWidth: 1,
        backgroundColor: 'rgba(255,255,255,0.14)',
    },
    upgradeBtnText: {
        fontSize: ms(15),
        color: '#fff',
    },

    // Settings
    sectionWrap: {
        paddingHorizontal: scale(20),
        paddingTop: vs(20),
    },
    sectionHeader: {
        fontSize: ms(13),
        letterSpacing: 0.3,
        textTransform: 'uppercase',
        marginBottom: vs(8),
    },
    sectionCard: {
        borderRadius: ms(20),
        overflow: 'hidden',
    },
    settingsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: vs(56),
        paddingHorizontal: scale(16),
        gap: scale(14),
    },
    rowIconWrap: {
        width: scale(36),
        height: scale(36),
        borderRadius: ms(10),
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowLabel: {
        flex: 1,
        fontSize: ms(15),
    },

    // aliases used in JSX
    body: { paddingHorizontal: scale(20), paddingTop: vs(20) },
    proHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: scale(16),
    },
    proHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
    },
    proBody: { padding: scale(16), gap: vs(10) },
    settingsCard: { borderRadius: ms(20), overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
    settingsIconWrap: {
        width: scale(36),
        height: scale(36),
        borderRadius: ms(10),
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingsLabel: { flex: 1, fontSize: ms(15) },

    // Interac Auto-Confirm modal
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    modalSheet: {
        borderTopLeftRadius: ms(28),
        borderTopRightRadius: ms(28),
        paddingHorizontal: scale(24),
        paddingTop: vs(12),
        paddingBottom: vs(40),
        gap: vs(16),
        alignItems: 'center',
    },
    modalHandle: {
        width: scale(36),
        height: vs(4),
        borderRadius: 99,
        marginBottom: vs(8),
    },
    modalTitle: {
        fontSize: ms(18),
        letterSpacing: -0.2,
    },
    modalSubtitle: {
        fontSize: ms(14),
        lineHeight: vs(20),
        textAlign: 'center',
    },
    tokenChip: {
        borderRadius: ms(12),
        paddingHorizontal: scale(16),
        paddingVertical: vs(12),
        width: '100%',
    },
    tokenText: {
        fontSize: ms(14),
        textAlign: 'center',
    },
    copyBtn: {
        borderRadius: ms(14),
        paddingVertical: vs(14),
        width: '100%',
        alignItems: 'center',
    },
    copyBtnText: {
        fontSize: ms(15),
        color: '#fff',
    },
    interacToast: {
        borderRadius: ms(12),
        paddingHorizontal: scale(16),
        paddingVertical: vs(8),
        borderWidth: StyleSheet.hairlineWidth,
    },
    doneLink: {
        paddingVertical: vs(6),
    },
});
