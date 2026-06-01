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

export default function GroupCard({ group, members = [], myNetBalance = 0, onPress }: GroupCardProps) {
    const { colors } = useTheme();
    const safeMembers = members ?? [];
    const visibleMembers = safeMembers.slice(0, 4);
    const extraCount = safeMembers.length > 4 ? safeMembers.length - 4 : 0;
    const balanceLoaded = safeMembers.length > 0;
    const balance = myNetBalance ?? 0;
    const isOwe = balance < -SETTLED_THRESHOLD;
    const isOwed = balance > SETTLED_THRESHOLD;
    const isSettled = !isOwe && !isOwed;

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.card, { backgroundColor: colors.surface }]}>

            {/* Green glow */}
            <LinearGradient
                colors={['rgba(34,197,94,0.18)', 'transparent']}
                style={styles.glow}
                pointerEvents="none"
            />

            {/* Character row */}
            <View style={styles.characterRow}>
                {balanceLoaded ? (
                    visibleMembers.map((m) => {
                        const firstName = m.name.split(' ')[0];
                        const isCreator = m.user_id === group.created_by;
                        return (
                            <View key={m.user_id} style={styles.characterCol}>
                                {isCreator
                                    ? <Crown color="#FCD34D" size={12} />
                                    : <View style={styles.crownSpacer} />
                                }
                                <Text style={[styles.memberName, { color: colors.secondaryText }]}>
                                    {firstName}
                                </Text>
                                <CharacterShape
                                    shape={m.character_shape ?? 'rect'}
                                    color={m.character_color ?? '#6B7280'}
                                    variant="mini"
                                />
                            </View>
                        );
                    })
                ) : (
                    <View style={styles.characterPlaceholder} />
                )}
            </View>

            {/* Group name pill */}
            <View style={styles.namePillRow}>
                <View style={styles.namePill}>
                    <Text style={styles.namePillText} numberOfLines={1}>{group.name}</Text>
                </View>
            </View>

            {/* +N others pill */}
            {extraCount > 0 && (
                <View style={styles.extraPillRow}>
                    <View style={[styles.extraPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.extraPillText, { color: colors.secondaryText }]}>+{extraCount} others</Text>
                    </View>
                </View>
            )}

            {/* Stats */}
            <View style={styles.stats}>

                {/* Total expenses */}
                <View style={styles.statBlock}>
                    <Text style={[styles.statLabel, { color: colors.secondaryText }]}>TOTAL EXPENSES</Text>
                    <View style={[styles.statPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.statValue, { color: colors.text }]}>
                            ${formatCurrency(group.total_expenses)}
                        </Text>
                    </View>
                </View>

                {/* Balance */}
                {balanceLoaded && (
                    <View style={styles.statBlock}>
                        <Text style={[styles.statLabel, { color: colors.secondaryText }]}>
                            {isOwed ? "YOU'RE OWED" : isOwe ? 'YOU OWE' : 'STATUS'}
                        </Text>
                        <View style={[styles.balancePill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Text style={[
                                styles.balanceValue,
                                { color: isOwed ? '#22c55e' : isOwe ? '#f59e0b' : '#22c55e' },
                            ]}>
                                {isSettled ? '✓ Settled' : `$${formatCurrency(Math.abs(balance))}`}
                            </Text>
                            <TouchableOpacity
                                onPress={onPress}
                                style={[
                                    styles.arrowBtn,
                                    {
                                        backgroundColor: isOwed
                                            ? 'rgba(34,197,94,0.15)'
                                            : isOwe
                                            ? 'rgba(245,158,11,0.15)'
                                            : colors.border,
                                    },
                                ]}
                            >
                                <ArrowRight
                                    size={14}
                                    color={isOwed ? '#22c55e' : isOwe ? '#f59e0b' : colors.secondaryText}
                                />
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
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 16,
    },
    glow: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: 112,
    },
    characterRow: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'flex-end',
        paddingTop: 20,
        paddingHorizontal: 16,
        zIndex: 1,
    },
    characterPlaceholder: {
        height: 64,
    },
    characterCol: {
        alignItems: 'center',
    },
    crownSpacer: {
        width: 12,
        height: 12,
    },
    memberName: {
        fontSize: 9,
        marginBottom: 4,
        fontWeight: '500',
    },
    namePillRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 12,
        paddingHorizontal: 16,
        zIndex: 1,
    },
    namePill: {
        backgroundColor: '#000000',
        borderRadius: 9999,
        paddingHorizontal: 24,
        paddingVertical: 10,
        maxWidth: '100%',
    },
    namePillText: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    extraPillRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 6,
        zIndex: 1,
    },
    extraPill: {
        borderRadius: 9999,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 4,
    },
    extraPillText: {
        fontSize: 12,
        fontWeight: '500',
    },
    stats: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 20,
        alignItems: 'center',
        gap: 8,
        zIndex: 1,
    },
    statBlock: {
        alignItems: 'center',
        gap: 4,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 1.5,
    },
    statPill: {
        borderRadius: 9999,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    statValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    balancePill: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 9999,
        borderWidth: 1,
        paddingLeft: 16,
        paddingRight: 6,
        paddingVertical: 6,
        gap: 8,
    },
    balanceValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    arrowBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
