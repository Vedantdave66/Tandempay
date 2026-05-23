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
import { Crown, ChevronRight } from 'lucide-react-native';

const PRO_FEATURES = [
    {
        title: 'Recurring Expenses',
        desc: 'Auto-split monthly bills on a schedule',
        screen: 'Recurring',
    },
    {
        title: 'Export Data',
        desc: 'Download your full expense history as CSV or PDF',
        screen: 'Export',
    },
    {
        title: 'AI Parsing',
        desc: 'Scan receipts and split itemized expenses instantly',
        screen: null,
    },
    {
        title: 'Multi-currency',
        desc: 'Track expenses in any currency, auto-converted',
        screen: null,
    },
    {
        title: 'Receipt OCR',
        desc: 'Snap a photo — we'll extract and split the items',
        screen: null,
    },
];

export default function ProHubScreen({ navigation }: any) {
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const isPro = user?.subscription_tier === 'pro';

    const handleFeatureTap = (screen: string | null) => {
        if (screen) {
            navigation.navigate(screen);
        } else {
            Alert.alert('Coming soon', 'This feature is on our roadmap.');
        }
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                <View style={styles.headerSection}>
                    <Text style={[styles.pageTitle, { color: colors.text }]}>Pro Features</Text>
                    <Text style={[styles.pageSubtitle, { color: colors.secondaryText }]}>
                        Powerful tools built for serious splitters
                    </Text>
                </View>

                {isPro ? (
                    <View style={[styles.proPill, {
                        backgroundColor: isDark ? 'rgba(74,222,128,0.12)' : 'rgba(22,163,74,0.08)',
                        borderColor: isDark ? 'rgba(74,222,128,0.3)' : 'rgba(22,163,74,0.25)',
                    }]}>
                        <Crown size={14} color={colors.accent} />
                        <Text style={[styles.proPillText, { color: colors.accent }]}>You're on Pro ✓</Text>
                    </View>
                ) : (
                    <View style={[styles.upsellCard, {
                        backgroundColor: isDark ? '#1c1a0f' : '#FEFCE8',
                        borderColor: isDark ? 'rgba(234,179,8,0.25)' : 'rgba(234,179,8,0.5)',
                    }]}>
                        <View style={styles.upsellTop}>
                            <Crown size={18} color="#D97706" />
                            <View style={styles.upsellTextBlock}>
                                <Text style={[styles.upsellTitle, { color: isDark ? '#FDE68A' : '#92400E' }]}>
                                    Unlock TandemPay Pro
                                </Text>
                                <Text style={[styles.upsellPrice, { color: isDark ? '#FCD34D' : '#B45309' }]}>
                                    $4.99/month
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.upgradeButton}
                            onPress={() => Linking.openURL('https://tandempay.ca/pricing')}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.upgradeButtonText}>Upgrade →</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={[styles.featuresCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {PRO_FEATURES.map((feature, index) => (
                        <TouchableOpacity
                            key={feature.title}
                            style={[
                                styles.featureRow,
                                index < PRO_FEATURES.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                            ]}
                            onPress={() => handleFeatureTap(feature.screen)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.featureIconWrap, {
                                backgroundColor: isDark ? 'rgba(234,179,8,0.12)' : 'rgba(234,179,8,0.08)',
                            }]}>
                                <Crown size={16} color="#D97706" />
                            </View>
                            <View style={styles.featureText}>
                                <Text style={[styles.featureTitle, { color: colors.text }]}>{feature.title}</Text>
                                <Text style={[styles.featureDesc, { color: colors.secondaryText }]}>{feature.desc}</Text>
                            </View>
                            <View style={styles.featureAction}>
                                <Text style={[styles.featureLink, { color: colors.accent }]}>
                                    {isPro ? 'Open' : 'Preview'}
                                </Text>
                                <ChevronRight size={14} color={colors.accent} />
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {!isPro && (
                    <Text style={[styles.footerNote, { color: colors.secondaryText }]}>
                        Preview screens show what Pro unlocks. Upgrade to use them.
                    </Text>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 48,
    },
    headerSection: {
        marginBottom: 20,
    },
    pageTitle: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -0.5,
        marginBottom: 4,
    },
    pageSubtitle: {
        fontSize: 14,
        fontWeight: '400',
    },
    proPill: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginBottom: 20,
    },
    proPillText: {
        fontSize: 13,
        fontWeight: '700',
    },
    upsellCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
        marginBottom: 20,
    },
    upsellTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    upsellTextBlock: {
        flex: 1,
    },
    upsellTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 1,
    },
    upsellPrice: {
        fontSize: 13,
        fontWeight: '500',
    },
    upgradeButton: {
        backgroundColor: '#D97706',
        borderRadius: 12,
        paddingVertical: 10,
        alignItems: 'center',
    },
    upgradeButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    featuresCard: {
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 16,
        overflow: 'hidden',
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    featureIconWrap: {
        width: 38,
        height: 38,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    featureText: { flex: 1 },
    featureTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 2,
    },
    featureDesc: {
        fontSize: 12,
        lineHeight: 17,
    },
    featureAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        marginLeft: 8,
    },
    featureLink: {
        fontSize: 13,
        fontWeight: '600',
    },
    footerNote: {
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
    },
});
