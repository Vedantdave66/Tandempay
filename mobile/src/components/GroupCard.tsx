import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown, ArrowRight } from 'lucide-react-native';
import { GroupListItem, UserBalance } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency } from '../utils/formatCurrency';
import { scale, vs, ms } from '../utils/responsive';
import { T } from '../utils/typography';
import CharacterShape from './CharacterShape';

interface GroupCardProps {
    group: GroupListItem;
    members?: UserBalance[];
    myNetBalance?: number;
    compact?: boolean;
    onPress: () => void;
}

const SETTLED_THRESHOLD = 0.01;

const TILT = [
    { body: -4, name: -8 },
    { body: 2,  name: 4 },
    { body: 0,  name: 6 },
    { body: 7,  name: -10 },
];

export default function GroupCard({ group, members = [], myNetBalance = 0, compact = false, onPress }: GroupCardProps) {
    const { colors, isDark } = useTheme();
    const safeMembers = members ?? [];
    const visibleMembers = safeMembers.slice(0, 4);
    const extraCount = safeMembers.length > 4 ? safeMembers.length - 4 : 0;
    const balanceLoaded = safeMembers.length > 0;
    const balance = myNetBalance ?? 0;
    const isOwe = balance < -SETTLED_THRESHOLD;
    const isOwed = balance > SETTLED_THRESHOLD;
    const isSettled = !isOwe && !isOwed;

    const accent = isOwe ? colors.groupOwe : colors.groupOwed;
    const boxStyle = {
        backgroundColor: colors.groupBoxFill,
        borderWidth: isDark ? 0 : StyleSheet.hairlineWidth,
        borderColor: 'rgba(0,0,0,0.06)',
        shadowColor: '#0A3020',
        shadowOpacity: isDark ? 0 : 0.10,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 6 },
        elevation: isDark ? 0 : 4,
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.70}
            style={[styles.card, {
                backgroundColor: 'transparent',
                borderWidth: isDark ? 0 : StyleSheet.hairlineWidth,
                borderColor: 'rgba(0,0,0,0.06)',
                shadowColor: '#000',
                shadowOpacity: isDark ? 0 : 0.07,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
                elevation: isDark ? 0 : 6,
            }, compact && styles.cardCompact]}
        >
            <View style={styles.gradientClip} pointerEvents="none">
                <LinearGradient
                    colors={colors.cardGradient}
                    locations={isDark ? [0, 0.35, 0.68, 1] : [0, 0.30, 0.56, 1]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                />
            </View>

            <View style={[styles.clusterRow, compact && styles.clusterRowCompact]}>
                {balanceLoaded ? (
                    visibleMembers.map((m, i) => {
                        const isCreator = m.user_id === group.created_by;
                        const tilt = TILT[i] ?? TILT[0];
                        return (
                            <View key={m.user_id} style={{ alignItems: 'center' }}>
                                {isCreator
                                    ? <Crown size={12} color="#FBBF24" style={{ marginBottom: vs(2) }} />
                                    : <View style={{ height: 14 }} />
                                }
                                <Text style={{
                                    fontSize: ms(11), color: colors.groupNameInk, marginBottom: vs(4),
                                    ...T.bold,
                                    transform: [{ rotate: `${tilt.name}deg` }],
                                    textShadowColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.55)',
                                    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
                                }}>
                                    {m.character_nickname ?? m.name.split(' ')[0]}
                                </Text>
                                <View style={{ transform: [{ rotate: `${tilt.body}deg` }] }}>
                                    <View style={{ justifyContent: 'flex-end', alignItems: 'center' }}>
                                        <CharacterShape
                                            shape={m.character_shape ?? 'rect'}
                                            color={m.character_color ?? '#6B7280'}
                                            variant={compact ? 'mini' : 'card'}
                                        />
                                    </View>
                                </View>
                            </View>
                        );
                    })
                ) : (
                    <View style={styles.characterPlaceholder} />
                )}
            </View>

            <View style={{ zIndex: 2, alignItems: 'center', marginTop: -14, paddingHorizontal: scale(16) }}>
                <View style={[styles.titlePill, boxStyle, compact && styles.titlePillCompact, { width: '100%' }]}>
                    <Text style={{
                        color: colors.text,
                        fontSize: compact ? ms(18) : ms(22),
                        ...T.extrabold,
                        letterSpacing: -0.4,
                        textAlign: 'center',
                    }} numberOfLines={1}>
                        {group.name}
                    </Text>
                </View>
            </View>

            {extraCount > 0 && (
                <View style={styles.extraPillRow}>
                    <View style={[styles.extraPill, { backgroundColor: colors.groupOthersFill }]}>
                        <Text style={[styles.extraPillText, { color: colors.groupOthersInk }, T.bold]}>+{extraCount} others</Text>
                    </View>
                </View>
            )}

            <View style={[styles.stats, compact && styles.statsCompact]}>
                <View style={styles.statBlock}>
                    <Text style={[styles.statLabel, { color: colors.groupLabel }, T.extrabold]}>TOTAL EXPENSES</Text>
                    <View style={[styles.statPill, boxStyle, compact && styles.statPillCompact]}>
                        <Text style={[styles.statValue, { color: colors.text, fontSize: compact ? ms(21) : ms(26, 0.3), fontVariant: ['tabular-nums'] }, T.extrabold]}>
                            ${formatCurrency(group.total_expenses)}
                        </Text>
                    </View>
                </View>

                {balanceLoaded && (
                    <View style={styles.statBlock}>
                        <Text style={[styles.statLabel, { color: colors.groupLabel }, T.extrabold]}>
                            {isOwed ? "YOU'RE OWED" : isOwe ? 'YOU OWE' : 'STATUS'}
                        </Text>
                        <View style={[styles.balancePill, boxStyle, compact && styles.balancePillCompact]}>
                            <Text style={[styles.balanceValue, { color: isSettled ? colors.groupOwed : accent, fontSize: compact ? ms(21) : ms(26, 0.3), fontVariant: ['tabular-nums'] }, T.extrabold]}>
                                {isSettled ? '✓ Settled' : `$${formatCurrency(Math.abs(balance))}`}
                            </Text>
                            <TouchableOpacity
                                onPress={onPress}
                                activeOpacity={0.70}
                                style={[styles.arrowBtn, compact && styles.arrowBtnCompact, {
                                    backgroundColor: colors.accentBgFaint,
                                    borderWidth: StyleSheet.hairlineWidth,
                                    borderColor: isSettled ? colors.groupOwed : accent,
                                }]}
                            >
                                <ArrowRight size={compact ? 14 : 18} color={isSettled ? colors.groupOwed : accent} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: ms(28),
        overflow: 'visible',
        marginBottom: vs(16),
        paddingBottom: vs(4),
    },
    cardCompact: {
        width: scale(218),
        marginBottom: vs(0),
        marginRight: scale(0),
    },
    gradientClip: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: ms(28),
        overflow: 'hidden',
    },
    clusterRow: {
        position: 'relative',
        zIndex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        gap: scale(2),
        paddingTop: vs(24),
        paddingBottom: vs(10),
        paddingHorizontal: scale(20),
        overflow: 'visible',
    },
    clusterRowCompact: {
        paddingTop: vs(16),
        paddingBottom: vs(6),
        paddingHorizontal: scale(12),
    },
    characterPlaceholder: {
        height: vs(80),
    },
    titlePill: {
        borderRadius: 999,
        height: vs(60),
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(20),
    },
    titlePillCompact: {
        height: vs(46),
        paddingHorizontal: scale(16),
    },
    extraPillRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: vs(12),
        zIndex: 1,
    },
    extraPill: {
        borderRadius: 9999,
        paddingHorizontal: scale(16),
        paddingVertical: vs(6),
    },
    extraPillText: {
        fontSize: ms(13),
    },
    stats: {
        paddingHorizontal: scale(24),
        paddingTop: vs(18),
        paddingBottom: vs(26),
        alignItems: 'stretch',
        gap: vs(16),
        zIndex: 1,
    },
    statsCompact: {
        paddingHorizontal: scale(14),
        paddingTop: vs(12),
        paddingBottom: vs(14),
        gap: vs(10),
    },
    statBlock: {
        alignItems: 'stretch',
        gap: vs(8),
    },
    statLabel: {
        fontSize: ms(11),
        letterSpacing: 0.6,
        textAlign: 'center',
    },
    statPill: {
        borderRadius: ms(22),
        minHeight: vs(60),
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(20),
    },
    statPillCompact: {
        minHeight: vs(42),
        borderRadius: ms(18),
        paddingHorizontal: scale(16),
    },
    statValue: {
        letterSpacing: -0.8,
    },
    balancePill: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: ms(22),
        minHeight: vs(60),
        paddingLeft: scale(24),
        paddingRight: scale(12),
    },
    balancePillCompact: {
        minHeight: vs(42),
        borderRadius: ms(18),
        paddingLeft: scale(16),
        paddingRight: scale(8),
    },
    balanceValue: {
        letterSpacing: -0.8,
    },
    arrowBtn: {
        width: scale(44),
        height: scale(44),
        borderRadius: scale(22),
        alignItems: 'center',
        justifyContent: 'center',
    },
    arrowBtnCompact: {
        width: scale(36),
        height: scale(36),
        borderRadius: scale(18),
    },
});
