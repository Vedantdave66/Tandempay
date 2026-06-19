import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { scale, vs, ms } from '../utils/responsive';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ChevronLeft, Download, FileText, Sheet, Crown } from 'lucide-react-native';
import { BASE_URL } from '../services/api';
import { T } from '../utils/typography';
import PressableScale from '../components/PressableScale';

const EXPORT_OPTIONS = [
    {
        key: 'csv',
        icon: Sheet,
        label: 'CSV Spreadsheet',
        subtitle: 'All your expenses, groups, and splits in one sheet',
        iconColor: '#16a34a',
        iconBg: 'rgba(22,163,74,0.12)',
        ext: 'csv',
        mime: 'text/csv',
    },
    {
        key: 'pdf',
        icon: FileText,
        label: 'PDF Report',
        subtitle: 'Formatted summary with totals and settlement history',
        iconColor: '#6366F1',
        iconBg: 'rgba(99,102,241,0.12)',
        ext: 'pdf',
        mime: 'application/pdf',
    },
];

export default function ExportScreen({ navigation }: any) {
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const isPro = user?.subscription_tier === 'pro';
    const [loading, setLoading] = useState<string | null>(null);

    const handleExport = async (format: string) => {
        setLoading(format);
        try {
            const token = await AsyncStorage.getItem('token');
            const url = `${BASE_URL}/export/${format}`;
            const option = EXPORT_OPTIONS.find(o => o.key === format)!;
            const localUri = `${(FileSystem as any).cacheDirectory}tandempay-export.${option.ext}`;

            const result = await FileSystem.downloadAsync(url, localUri, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (result.status !== 200) throw new Error(`Server returned ${result.status}`);

            const canShare = await Sharing.isAvailableAsync();
            if (!canShare) {
                Alert.alert('Saved', `File saved to ${result.uri}`);
                return;
            }

            await Sharing.shareAsync(result.uri, {
                mimeType: option.mime,
                dialogTitle: `TandemPay ${format.toUpperCase()} Export`,
                UTI: format === 'pdf' ? 'com.adobe.pdf' : 'public.comma-separated-values-text',
            });
        } catch (err: any) {
            Alert.alert('Export failed', err.message || 'Could not download the file. Try again.');
        } finally {
            setLoading(null);
        }
    };

    return (
        <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <PressableScale
                    scaleTo={0.97}
                    haptic="light"
                    onPress={() => navigation.goBack()}
                    style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                    <ChevronLeft size={ms(20)} color={colors.text} />
                </PressableScale>
                <Text style={[styles.headerTitle, { color: colors.text }, T.bold]}>Export Data</Text>
                <View style={{ width: scale(44) }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {isPro ? (
                    <>
                        <Text style={[styles.sectionHeader, { color: colors.secondaryText }, T.semibold]}>
                            Download Format
                        </Text>

                        {EXPORT_OPTIONS.map(option => {
                            const Icon = option.icon;
                            const isLoading = loading === option.key;
                            return (
                                <View
                                    key={option.key}
                                    style={[styles.exportCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                >
                                    <View style={[styles.cardIconWrap, { backgroundColor: option.iconBg }]}>
                                        <Icon size={24} color={option.iconColor} />
                                    </View>
                                    <View style={styles.cardText}>
                                        <Text style={[styles.cardLabel, { color: colors.text }, T.bold]}>{option.label}</Text>
                                        <Text style={[styles.cardSubtitle, { color: colors.secondaryText }, T.regular]}>
                                            {option.subtitle}
                                        </Text>
                                    </View>
                                    <PressableScale
                                        scaleTo={0.92}
                                        haptic="light"
                                        onPress={() => handleExport(option.key)}
                                        disabled={isLoading}
                                        style={[styles.downloadBtn, { backgroundColor: colors.accentBg }]}
                                    >
                                        {isLoading
                                            ? <ActivityIndicator size="small" color={colors.accent} />
                                            : <Download size={18} color={colors.accent} />
                                        }
                                    </PressableScale>
                                </View>
                            );
                        })}

                        <Text style={[styles.proNote, { color: colors.tertiaryText }, T.regular]}>
                            Includes all expenses where you are a participant, sorted newest first.
                        </Text>
                    </>
                ) : (
                    <>
                        <Text style={[styles.sectionHeader, { color: colors.secondaryText }, T.semibold]}>
                            Export Data
                        </Text>
                        <View style={[styles.upsellCard, { borderColor: colors.accent + '30' }]}>
                            <View style={[styles.upsellIconWrap, { backgroundColor: colors.accentBg }]}>
                                <Crown size={22} color={colors.accent} />
                            </View>
                            <View style={styles.upsellText}>
                                <Text style={[styles.upsellTitle, { color: colors.text }, T.bold]}>
                                    Export your full history with Pro
                                </Text>
                                <Text style={[styles.upsellDesc, { color: colors.secondaryText }, T.regular]}>
                                    Download CSV spreadsheets and PDF reports of every expense you've been part of.
                                </Text>
                                <PressableScale
                                    scaleTo={0.97}
                                    haptic="light"
                                    onPress={() => navigation.navigate('Subscription')}
                                    style={[styles.upgradeBtn, { backgroundColor: colors.accent }]}
                                >
                                    <Text style={[styles.upgradeBtnText, { color: isDark ? '#064E3B' : '#FFFFFF' }, T.bold]}>
                                        Upgrade to Pro
                                    </Text>
                                </PressableScale>
                            </View>
                        </View>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(20),
        paddingVertical: vs(12),
    },
    headerTitle: {
        fontSize: ms(20),
        letterSpacing: -0.5,
    },
    backBtn: {
        width: scale(44),
        height: scale(44),
        borderRadius: ms(14),
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: StyleSheet.hairlineWidth,
    },

    scroll: {
        paddingHorizontal: scale(20),
        paddingBottom: vs(48),
    },

    sectionHeader: {
        fontSize: ms(13),
        letterSpacing: 0.3,
        textTransform: 'uppercase',
        marginBottom: vs(12),
        marginTop: vs(8),
    },

    // Export cards (Pro)
    exportCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: ms(20),
        borderWidth: StyleSheet.hairlineWidth,
        padding: scale(16),
        marginBottom: vs(12),
        gap: scale(14),
    },
    cardIconWrap: {
        width: scale(52),
        height: scale(52),
        borderRadius: ms(14),
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardText: {
        flex: 1,
        gap: vs(3),
    },
    cardLabel: {
        fontSize: ms(15),
    },
    cardSubtitle: {
        fontSize: ms(12),
        lineHeight: 17,
    },
    downloadBtn: {
        width: scale(40),
        height: scale(40),
        borderRadius: ms(12),
        alignItems: 'center',
        justifyContent: 'center',
    },
    proNote: {
        fontSize: ms(12),
        textAlign: 'center',
        marginTop: vs(8),
        lineHeight: 18,
    },

    // Upsell (free)
    upsellCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: scale(14),
        borderRadius: ms(20),
        borderWidth: 1,
        padding: scale(18),
        marginTop: vs(4),
    },
    upsellIconWrap: {
        width: scale(44),
        height: scale(44),
        borderRadius: ms(12),
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    upsellText: {
        flex: 1,
        gap: vs(6),
    },
    upsellTitle: {
        fontSize: ms(15),
    },
    upsellDesc: {
        fontSize: ms(13),
        lineHeight: 18,
    },
    upgradeBtn: {
        borderRadius: ms(13),
        paddingVertical: vs(12),
        alignItems: 'center',
        marginTop: vs(8),
    },
    upgradeBtnText: {
        fontSize: ms(14),
    },
});
