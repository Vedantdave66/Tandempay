import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Linking,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, RefreshCw, FileDown, Camera, SlidersHorizontal, Zap } from 'lucide-react-native';

const PRO_FEATURES = [
    {
        icon: RefreshCw,
        title: 'Recurring expenses',
        description: 'Auto-split monthly bills without lifting a finger',
    },
    {
        icon: FileDown,
        title: 'CSV & PDF exports',
        description: 'Download your full expense history anytime',
    },
    {
        icon: Camera,
        title: 'Receipt OCR',
        description: 'Scan and split itemized receipts instantly',
    },
    {
        icon: SlidersHorizontal,
        title: 'Advanced splits',
        description: 'Percentages, weights, and itemized breakdowns',
    },
    {
        icon: Zap,
        title: 'Auto Interac confirmation',
        description: 'No manual tap required for e-Transfer confirmation',
    },
];

export default function ProUpgradeScreen({ navigation }: any) {
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const isPro = user?.subscription_tier === 'pro';

    if (isPro) {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <ArrowLeft color={colors.text} size={24} />
                </TouchableOpacity>
                <View style={styles.proConfirmContainer}>
                    <Text style={styles.crownEmoji}>👑</Text>
                    <Text style={[styles.proTitle, { color: colors.text }]}>You're on Pro ✓</Text>
                    <Text style={[styles.proSubtitle, { color: colors.secondaryText }]}>
                        You have access to all Pro features.
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <ArrowLeft color={colors.text} size={24} />
            </TouchableOpacity>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.heroContainer}>
                    <Text style={styles.crownEmoji}>👑</Text>
                    <Text style={[styles.heroTitle, { color: colors.text }]}>Upgrade to Pro</Text>
                    <Text style={[styles.heroSubtitle, { color: colors.secondaryText }]}>
                        Unlock the full TandemPay experience
                    </Text>
                </View>

                <View style={[styles.featuresCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {PRO_FEATURES.map((feature, index) => {
                        const Icon = feature.icon;
                        return (
                            <View
                                key={feature.title}
                                style={[
                                    styles.featureRow,
                                    index < PRO_FEATURES.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                                ]}
                            >
                                <View style={[
                                    styles.featureIconWrap,
                                    { backgroundColor: isDark ? 'rgba(74,222,128,0.12)' : 'rgba(22,163,74,0.08)' },
                                ]}>
                                    <Icon color={colors.accent} size={20} />
                                </View>
                                <View style={styles.featureText}>
                                    <Text style={[styles.featureTitle, { color: colors.text }]}>{feature.title}</Text>
                                    <Text style={[styles.featureDesc, { color: colors.secondaryText }]}>{feature.description}</Text>
                                </View>
                            </View>
                        );
                    })}
                </View>

                <View style={styles.pricingContainer}>
                    <Text style={[styles.pricingFrom, { color: colors.secondaryText }]}>From</Text>
                    <Text style={[styles.pricingAmount, { color: colors.text }]}>$4.99</Text>
                    <Text style={[styles.pricingPeriod, { color: colors.secondaryText }]}>/month</Text>
                </View>

                <TouchableOpacity
                    style={[styles.upgradeButton, { backgroundColor: colors.accent }]}
                    onPress={() => Linking.openURL('https://tandempay.ca/pricing')}
                    activeOpacity={0.85}
                >
                    <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
                </TouchableOpacity>

                <Text style={[styles.disclaimer, { color: colors.secondaryText }]}>
                    Manage your subscription on the web. Cancel anytime.
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    backButton: {
        padding: 16,
        paddingBottom: 8,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    heroContainer: {
        alignItems: 'center',
        paddingVertical: 28,
    },
    crownEmoji: {
        fontSize: 56,
        marginBottom: 12,
    },
    heroTitle: {
        fontSize: 30,
        fontWeight: '800',
        letterSpacing: -0.5,
        marginBottom: 6,
    },
    heroSubtitle: {
        fontSize: 15,
        textAlign: 'center',
    },
    featuresCard: {
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 28,
        overflow: 'hidden',
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    featureIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    featureText: { flex: 1 },
    featureTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    featureDesc: {
        fontSize: 13,
        lineHeight: 18,
    },
    pricingContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        marginBottom: 20,
        gap: 4,
    },
    pricingFrom: {
        fontSize: 16,
        marginBottom: 6,
    },
    pricingAmount: {
        fontSize: 44,
        fontWeight: '800',
        letterSpacing: -1,
        lineHeight: 50,
    },
    pricingPeriod: {
        fontSize: 16,
        marginBottom: 8,
    },
    upgradeButton: {
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        marginBottom: 12,
    },
    upgradeButtonText: {
        color: '#1A1A1A',
        fontSize: 17,
        fontWeight: '700',
    },
    disclaimer: {
        fontSize: 12,
        textAlign: 'center',
    },
    proConfirmContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    proTitle: {
        fontSize: 28,
        fontWeight: '800',
        marginBottom: 8,
    },
    proSubtitle: {
        fontSize: 15,
        textAlign: 'center',
    },
});
