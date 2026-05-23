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
import { Download, FileText, Sheet, Crown } from 'lucide-react-native';

const EXPORT_OPTIONS = [
    {
        key: 'csv',
        icon: Sheet,
        label: 'CSV Spreadsheet',
        desc: 'Download your full expense history',
        iconColor: '#16a34a',
        iconBg: 'rgba(22,163,74,0.1)',
    },
    {
        key: 'pdf',
        icon: FileText,
        label: 'PDF Report',
        desc: 'Download your full expense history',
        iconColor: '#6366F1',
        iconBg: 'rgba(99,102,241,0.1)',
    },
];

export default function ExportScreen({ navigation }: any) {
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const isPro = user?.subscription_tier === 'pro';

    const handleExport = (format: string) => {
        if (!isPro) {
            Alert.alert(
                'Pro feature',
                'Export is a Pro feature. Upgrade at tandempay.ca/pricing',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Learn more', onPress: () => Linking.openURL('https://tandempay.ca/pricing') },
                ],
            );
        } else {
            Alert.alert('Coming soon', `${format.toUpperCase()} export will be available in a future update.`);
        }
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.pageTitle, { color: colors.text }]}>Export Data</Text>
                <Text style={[styles.pageSubtitle, { color: colors.secondaryText }]}>
                    Download your full expense history
                </Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {EXPORT_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    return (
                        <TouchableOpacity
                            key={option.key}
                            style={[
                                styles.exportCard,
                                { backgroundColor: colors.surface, borderColor: colors.border },
                                !isPro && styles.cardDimmed,
                            ]}
                            onPress={() => handleExport(option.key)}
                            activeOpacity={0.75}
                        >
                            <View style={[styles.cardIcon, { backgroundColor: option.iconBg }]}>
                                <Icon size={24} color={option.iconColor} />
                            </View>
                            <View style={styles.cardText}>
                                <Text style={[styles.cardLabel, { color: colors.text }]}>{option.label}</Text>
                                <Text style={[styles.cardDesc, { color: colors.secondaryText }]}>{option.desc}</Text>
                            </View>
                            <Download size={18} color={isPro ? colors.accent : colors.secondaryText} />
                        </TouchableOpacity>
                    );
                })}

                {!isPro && (
                    <View style={[styles.upsellCard, {
                        backgroundColor: isDark ? 'rgba(74,222,128,0.06)' : 'rgba(22,163,74,0.04)',
                        borderColor: isDark ? 'rgba(74,222,128,0.2)' : 'rgba(22,163,74,0.15)',
                    }]}>
                        <Crown size={15} color={colors.accent} />
                        <View style={styles.upsellText}>
                            <Text style={[styles.upsellTitle, { color: colors.text }]}>
                                Export your full history with Pro
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
                    <Text style={[styles.proNote, { color: colors.secondaryText }]}>
                        Exports include all expenses where you are a participant, sorted newest first.
                    </Text>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    header: {
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
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 48,
    },
    exportCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 18,
        borderWidth: 1,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    cardDimmed: {
        opacity: 0.4,
    },
    cardIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    cardText: { flex: 1 },
    cardLabel: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 3,
    },
    cardDesc: {
        fontSize: 12,
    },
    upsellCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        borderRadius: 14,
        borderWidth: 1,
        padding: 14,
        marginTop: 4,
    },
    upsellText: { flex: 1 },
    upsellTitle: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 4,
    },
    learnMore: {
        fontSize: 13,
        fontWeight: '600',
    },
    proNote: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 18,
    },
});
