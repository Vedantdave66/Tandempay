import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown, ArrowRight } from 'lucide-react-native';
import { GroupListItem, UserBalance } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency } from '../utils/formatCurrency';
import { scale, vs, ms } from '../utils/responsive';
import CharacterShape from './CharacterShape';

interface GroupCardProps {
    group: GroupListItem;
    members?: UserBalance[];
    myNetBalance?: number;
    compact?: boolean;
    onPress: () => void;
}

const SETTLED_THRESHOLD = 0.01;

// Per-slot body + name tilt for the lively "peeking" cluster. Heights come from
// the member's own shape (CharacterShape 'card' variant), so we only inject tilt.
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

    // accent = amount color, drives balance text + arrow ring
    const accent = isOwe ? colors.groupOwe : colors.groupOwed;
    const boxStyle = {
        backgroundColor: colors.groupBoxFill,
        borderWidth: 1,
        borderColor: colors.groupBoxBorder,
        // subtle lift only matters in light; transparent shadow color = no-op in dark
        shadowColor: colors.groupBoxShadow,
        shadowOpacity: isDark ? 0 : 1,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: isDark ? 0 : 3,
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.9}
            style={[styles.card, {
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
            shadowColor: isDark ? '#000' : 'rgba(20,60,35,0.15)',
            shadowOpacity: isDark ? 0.3 : 1,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 8 },
            elevation: isDark ? 0 : 5,
        }, compact && styles.cardCompact]}
        >
            {/* Green glow — full-bleed vertical ramp, brightest band vertically centered.
                (expo-linear-gradient can't do radial; this 5-stop vertical reproduces the
                 mock's centered-glow falloff. For a true radial, swap in react-native-svg's
                 <RadialGradient> — see handoff note.)
                 Wrapped so only the gradient clips to the rounded corners — the card itself
                 stays overflow: 'visible' so peeking characters aren't cut off at the edges. */}
            <View style={styles.gradientClip} pointerEvents="none">
                <LinearGradient
                    colors={colors.groupGlow}
                    locations={[0, 0.15, 0.30, 0.50, 0.70, 0.85, 1]}
                    style={StyleSheet.absoluteFill}
                />
            </View>

            {/* Characters row — zIndex 1 so the title pill can overlap them */}
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
                                    fontWeight: '700', transform: [{ rotate: `${tilt.name}deg` }],
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

            {/* Title pill — overlaps the characters (zIndex 2, pulled up) */}
            <View style={{ zIndex: 2, alignItems: 'center', marginTop: -22, paddingHorizontal: scale(16) }}>
                <View style={[styles.titlePill, boxStyle, compact && styles.titlePillCompact, { width: '100%' }]}>
                    <Text style={{ color: colors.text, fontSize: compact ? ms(18) : ms(22, 0.3), fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' }} numberOfLines={1}>
                        {group.name}
                    </Text>
                </View>
            </View>

            {/* +N others pill */}
            {extraCount > 0 && (
                <View style={styles.extraPillRow}>
                    <View style={[styles.extraPill, { backgroundColor: colors.groupOthersFill }]}>
                        <Text style={[styles.extraPillText, { color: colors.groupOthersInk }]}>+{extraCount} others</Text>
                    </View>
                </View>
            )}

            {/* Stats */}
            <View style={[styles.stats, compact && styles.statsCompact]}>

                {/* Total expenses */}
                <View style={styles.statBlock}>
                    <Text style={[styles.statLabel, { color: colors.groupLabel }]}>TOTAL EXPENSES</Text>
                    <View style={[styles.statPill, boxStyle, compact && styles.statPillCompact]}>
                        <Text style={[styles.statValue, { color: colors.text, fontSize: compact ? 21 : 30 }]}>
                            ${formatCurrency(group.total_expenses)}
                        </Text>
                    </View>
                </View>

                {/* Balance */}
                {balanceLoaded && (
                    <View style={styles.statBlock}>
                        <Text style={[styles.statLabel, { color: colors.groupLabel }]}>
                            {isOwed ? "YOU'RE OWED" : isOwe ? 'YOU OWE' : 'STATUS'}
                        </Text>
                        <View style={[styles.balancePill, boxStyle, compact && styles.balancePillCompact]}>
                            <Text style={[styles.balanceValue, { color: isSettled ? colors.groupOwed : accent, fontSize: compact ? 21 : 30 }]}>
                                {isSettled ? '✓ Settled' : `$${formatCurrency(Math.abs(balance))}`}
                            </Text>
                            <TouchableOpacity
                                onPress={onPress}
                                style={[styles.arrowBtn, compact && styles.arrowBtnCompact, {
                                    backgroundColor: colors.accentBgFaint,
                                    borderWidth: 1.5,
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
        paddingTop: vs(22),
        paddingHorizontal: scale(20),
        overflow: 'visible',
    },
    clusterRowCompact: {
        paddingTop: vs(16),
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
        fontWeight: '700',
    },
    stats: {
        paddingHorizontal: scale(22),
        paddingTop: vs(18),
        paddingBottom: vs(22),
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
        fontSize: ms(10),
        fontWeight: '800',
        letterSpacing: 1.8,
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
        fontSize: ms(26, 0.3),
        fontWeight: '800',
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
        fontSize: ms(26, 0.3),
        fontWeight: '800',
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
