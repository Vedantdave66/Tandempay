import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown, ArrowRight } from 'lucide-react-native';
import { GroupListItem, UserBalance } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency } from '../utils/formatCurrency';
import CharacterShape from './CharacterShape';

interface GroupCardProps {
    group: GroupListItem;
    members?: UserBalance[];
    myNetBalance?: number;
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

export default function GroupCard({ group, members = [], myNetBalance = 0, onPress }: GroupCardProps) {
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
            style={[styles.card, { backgroundColor: colors.groupGlow[0] }]}
        >
            {/* Green glow — full-bleed vertical ramp, brightest band vertically centered.
                (expo-linear-gradient can't do radial; this 5-stop vertical reproduces the
                 mock's centered-glow falloff. For a true radial, swap in react-native-svg's
                 <RadialGradient> — see handoff note.) */}
            <LinearGradient
                colors={colors.groupGlow}
                locations={[0, 0.3, 0.46, 0.62, 1]}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
            />

            {/* Characters row — zIndex 1 so the title pill can overlap them */}
            <View style={styles.clusterRow}>
                {balanceLoaded ? (
                    visibleMembers.map((m, i) => {
                        const isCreator = m.user_id === group.created_by;
                        const tilt = TILT[i] ?? TILT[0];
                        return (
                            <View key={m.user_id} style={{ alignItems: 'center' }}>
                                {isCreator
                                    ? <Crown size={12} color="#FBBF24" style={{ marginBottom: 2 }} />
                                    : <View style={{ height: 14 }} />
                                }
                                <Text style={{
                                    fontSize: 11, color: colors.groupNameInk, marginBottom: 4,
                                    fontWeight: '700', transform: [{ rotate: `${tilt.name}deg` }],
                                    textShadowColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.55)',
                                    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
                                }}>
                                    {m.character_nickname ?? m.name.split(' ')[0]}
                                </Text>
                                <View style={{ transform: [{ rotate: `${tilt.body}deg` }] }}>
                                    <CharacterShape
                                        shape={m.character_shape ?? 'rect'}
                                        color={m.character_color ?? '#6B7280'}
                                        variant="card"
                                    />
                                </View>
                            </View>
                        );
                    })
                ) : (
                    <View style={styles.characterPlaceholder} />
                )}
            </View>

            {/* Title pill — overlaps the characters (zIndex 2, pulled up) */}
            <View style={{ zIndex: 2, alignItems: 'center', marginTop: -22, paddingHorizontal: 16 }}>
                <View style={[styles.titlePill, boxStyle, { width: '100%' }]}>
                    <Text style={{ color: colors.text, fontSize: 30, fontWeight: '700', letterSpacing: -0.5, textAlign: 'center' }} numberOfLines={1}>
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
            <View style={styles.stats}>

                {/* Total expenses */}
                <View style={styles.statBlock}>
                    <Text style={[styles.statLabel, { color: colors.groupLabel }]}>TOTAL EXPENSES</Text>
                    <View style={[styles.statPill, boxStyle]}>
                        <Text style={[styles.statValue, { color: colors.text }]}>
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
                        <View style={[styles.balancePill, boxStyle]}>
                            <Text style={[styles.balanceValue, { color: isSettled ? colors.groupOwed : accent }]}>
                                {isSettled ? '✓ Settled' : `$${formatCurrency(Math.abs(balance))}`}
                            </Text>
                            <TouchableOpacity
                                onPress={onPress}
                                style={[styles.arrowBtn, {
                                    backgroundColor: colors.groupArrowBg,
                                    borderWidth: 1.5,
                                    borderColor: isSettled ? colors.groupOwed : accent,
                                }]}
                            >
                                <ArrowRight size={18} color={isSettled ? colors.groupOwed : accent} />
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
        borderRadius: 28,
        overflow: 'hidden',
        marginBottom: 16,
        paddingBottom: 4,
    },
    clusterRow: {
        position: 'relative',
        zIndex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        gap: 2,
        paddingTop: 22,
        paddingHorizontal: 18,
    },
    characterPlaceholder: {
        height: 80,
    },
    titlePill: {
        borderRadius: 999,
        height: 64,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    extraPillRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 12,
        zIndex: 1,
    },
    extraPill: {
        borderRadius: 9999,
        paddingHorizontal: 16,
        paddingVertical: 6,
    },
    extraPillText: {
        fontSize: 13,
        fontWeight: '700',
    },
    stats: {
        paddingHorizontal: 22,
        paddingTop: 18,
        paddingBottom: 22,
        alignItems: 'stretch',
        gap: 16,
        zIndex: 1,
    },
    statBlock: {
        alignItems: 'stretch',
        gap: 8,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1.5,
        textAlign: 'center',
    },
    statPill: {
        borderRadius: 22,
        minHeight: 64,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    statValue: {
        fontSize: 30,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    balancePill: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 22,
        minHeight: 64,
        paddingLeft: 24,
        paddingRight: 12,
    },
    balanceValue: {
        fontSize: 30,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    arrowBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
