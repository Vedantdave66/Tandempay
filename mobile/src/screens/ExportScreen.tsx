import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { scale, vs, ms } from '../utils/responsive';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Download, FileText, Sheet, Crown } from 'lucide-react-native';
import { BASE_URL } from '../services/api';
import { T } from '../utils/typography';

const EXPORT_OPTIONS = [
    {
        key: 'csv',
        icon: Sheet,
        label: 'CSV Spreadsheet',
        desc: 'Download your full expense history',
        iconColor: '#16a34a',
        iconBg: 'rgba(22,163,74,0.1)',
        ext: 'csv',
        mime: 'text/csv',
    },
    {
        key: 'pdf',
        icon: FileText,
        label: 'PDF Report',
        desc: 'Download your full expense history',
        iconColor: '#6366F1',
        iconBg: 'rgba(99,102,241,0.1)',
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
        if (!isPro) {
            navigation.navigate('Subscription');
            return;
        }

        setLoading(format);
        try {
            const token = await AsyncStorage.getItem('token');
            const url = `${BASE_URL}/export/${format}`;
            const option = EXPORT_OPTIONS.find(o => o.key === format)!;
            const localUri = `${FileSystem.cacheDirectory}tandempay-export.${option.ext}`;

            const result = await FileSystem.downloadAsync(url, localUri, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (result.status !== 200) {
                throw new Error(`Server returned ${result.status}`);
            }

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
                    const isLoading = loading === option.key;
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
                            disabled={isLoading}
                        >
                            <View style={[styles.cardIcon, { backgroundColor: option.iconBg }]}>
                                <Icon size={24} color={option.iconColor} />
                            </View>
                            <View style={styles.cardText}>
                                <Text style={[styles.cardLabel, { color: colors.text }, T.bold]}>{option.label}</Text>
                                <Text style={[styles.cardDesc, { color: colors.secondaryText }]}>{option.desc}</Text>
                            </View>
                            {isLoading
                                ? <ActivityIndicator size="small" color={colors.accent} />
                                : <Download size={18} color={isPro ? colors.accent : colors.secondaryText} />
                            }
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
                                onPress={() => navigation.navigate('Subscription')}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.learnMore, { color: colors.accent }]}>Upgrade to Pro →</Text>
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
        paddingHorizontal: scale(24),
        paddingTop: vs(28),
        paddingBottom: vs(20),
    },
    pageTitle: {
        fontSize: ms(22),
        fontWeight: '800',
        letterSpacing: -0.3,
        marginBottom: vs(3),
    },
    pageSubtitle: {
        fontSize: ms(13),
        fontWeight: '400',
    },
    scrollContent: {
        paddingHorizontal: scale(24),
        paddingBottom: vs(48),
    },
    exportCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: ms(18),
        borderWidth: 1,
        padding: scale(16),
        marginBottom: vs(12),
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
        borderRadius: ms(14),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: scale(14),
    },
    cardText: { flex: 1 },
    cardLabel: {
        fontSize: ms(15),
        marginBottom: vs(3),
    },
    cardDesc: {
        fontSize: ms(12),
    },
    upsellCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: vs(10),
        borderRadius: ms(14),
        borderWidth: 1,
        padding: scale(14),
        marginTop: vs(4),
    },
    upsellText: { flex: 1 },
    upsellTitle: {
        fontSize: ms(13),
        fontWeight: '600',
        marginBottom: vs(4),
    },
    learnMore: {
        fontSize: ms(13),
        fontWeight: '600',
    },
    proNote: {
        fontSize: ms(12),
        textAlign: 'center',
        marginTop: vs(8),
        lineHeight: 18,
    },
});
