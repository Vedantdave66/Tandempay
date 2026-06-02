import React from 'react';
import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { ArrowRight } from 'lucide-react-native';
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

const darkStops = [
  { offset: '0%',  color: '#28E06B' },
  { offset: '30%', color: '#109A47' },
  { offset: '52%', color: '#064D26' },
  { offset: '78%', color: '#070A08' },
];
const lightStops = [
  { offset: '0%',  color: '#3BE57F' },
  { offset: '30%', color: '#8FE9B0' },
  { offset: '56%', color: '#D8F4E1' },
  { offset: '80%', color: '#F3FBF4' },
];

const LADDER = [
  { height: 56,  bodyRotate: '-4deg', nameRotate: '-8deg'  },
  { height: 72,  bodyRotate:  '2deg', nameRotate:  '4deg'  },
  { height: 42,  bodyRotate:  '0deg', nameRotate:  '6deg'  },
  { height: 64,  bodyRotate:  '7deg', nameRotate: '-10deg' },
];

export default function GroupCard({ group, members, myNetBalance, onPress }: GroupCardProps) {
  const { isDark } = useTheme();

  const visibleMembers = (members ?? []).slice(0, 4);
  const extraCount = Math.max(0, (members ?? []).length - 4);
  const absBalance = Math.abs(myNetBalance ?? 0);
  const balanceType = !members?.length ? 'settled'
    : (myNetBalance ?? 0) > 0.01 ? 'owed'
    : (myNetBalance ?? 0) < -0.01 ? 'owe'
    : 'settled';

  const T = {
    boxFill:    isDark ? '#0A0B0A'                : '#FFFFFF',
    ink:        isDark ? '#FFFFFF'                : '#0E140F',
    owe:        isDark ? '#F2C200'                : '#C28A00',
    owed:       isDark ? '#27E06A'                : '#0E9F4F',
    label:      isDark ? '#06371E'                : '#0A5F30',
    othersFill: isDark ? '#2A2C2A'                : '#E6EAE5',
    othersInk:  isDark ? '#D7DAD6'                : '#46504A',
    nameInk:    isDark ? '#FFFFFF'                : '#0E140F',
    arrowBg:    isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
  };
  const balanceColor = balanceType === 'owe' ? T.owe : T.owed;

  return (
    <View style={[styles.card, { borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
      <Svg style={StyleSheet.absoluteFillObject}>
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="46%" rx="46%" ry="31%">
            {(isDark ? darkStops : lightStops).map((s, i) =>
              <Stop key={i} offset={s.offset} stopColor={s.color} />
            )}
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#glow)" rx="40" />
      </Svg>

      {/* Character cluster */}
      <View style={styles.cluster}>
        {visibleMembers.map((m, i) => {
          const slot = LADDER[i % 4];
          return (
            <View key={m.user_id} style={styles.memberCol}>
              <Text style={[styles.nameLabel, { color: T.nameInk,
                transform: [{ rotate: slot.nameRotate }] }]}>
                {(m.character_nickname ?? m.name.split(' ')[0]).toLowerCase()}
              </Text>
              <View style={{ transform: [{ rotate: slot.bodyRotate }],
                             transformOrigin: 'bottom center' }}>
                <CharacterShape
                  shape={m.character_shape ?? 'rect'}
                  color={m.character_color ?? '#6B7280'}
                  variant="card"
                  heightOverride={slot.height}
                />
              </View>
            </View>
          );
        })}
      </View>

      {/* Title pill — overlaps characters by 28px */}
      <View style={[styles.titlePill, { backgroundColor: T.boxFill, marginTop: -28, zIndex: 2 }]}>
        <Text style={[styles.titleText, { color: T.ink }]} numberOfLines={1}>
          {group.name}
        </Text>
      </View>

      {/* +N others pill */}
      {extraCount > 0 && (
        <View style={[styles.othersPill, { backgroundColor: T.othersFill }]}>
          <Text style={[styles.othersText, { color: T.othersInk }]}>+{extraCount} others</Text>
        </View>
      )}

      {/* Total Expenses */}
      <Text style={[styles.sectionLabel, { color: T.label }]}>TOTAL EXPENSES</Text>
      <View style={[styles.valueBox, { backgroundColor: T.boxFill,
        borderWidth: isDark ? 0 : 1, borderColor: 'rgba(0,0,0,0.05)' }]}>
        <Text style={[styles.amountText, { color: T.ink }]}>
          ${formatCurrency(group.total_expenses)}
        </Text>
      </View>

      {/* Balance */}
      <Text style={[styles.sectionLabel, { color: T.label }]}>
        {balanceType === 'owe' ? 'YOU OWE' : "YOU'RE OWED"}
      </Text>
      <View style={[styles.valueBox, styles.valueBoxRow, { backgroundColor: T.boxFill,
        borderWidth: isDark ? 0 : 1, borderColor: 'rgba(0,0,0,0.05)' }]}>
        <Text style={[styles.amountText, { color: balanceColor }]}>
          {balanceType === 'settled' ? '$0.00' : `$${absBalance.toFixed(2)}`}
        </Text>
        <TouchableOpacity onPress={onPress}
          style={[styles.arrowBtn, { backgroundColor: T.arrowBg,
            borderColor: balanceColor }]}>
          <ArrowRight size={20} color={balanceColor} strokeWidth={2.4} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card:        { borderRadius: 40, overflow: 'hidden', borderWidth: 1,
                 marginBottom: 16, padding: 0 },
  cluster:     { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center',
                 gap: 2, paddingTop: 28, paddingHorizontal: 26, zIndex: 1 },
  memberCol:   { alignItems: 'center', gap: 6 },
  nameLabel:   { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13,
                 textShadowColor: 'rgba(0,0,0,0.4)',
                 textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  titlePill:   { borderRadius: 999, width: '92%', alignSelf: 'center',
                 height: 52, alignItems: 'center', justifyContent: 'center',
                 paddingHorizontal: 20, marginTop: -28, zIndex: 2 },
  titleText:   { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 22, letterSpacing: -0.5 },
  othersPill:  { alignSelf: 'center', borderRadius: 999, paddingHorizontal: 18,
                 paddingVertical: 7, marginTop: 14 },
  othersText:  { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14 },
  sectionLabel:{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 10, letterSpacing: 1.4,
                 textAlign: 'center', marginTop: 14, marginBottom: 8 },
  valueBox:    { borderRadius: 20, height: 60, marginHorizontal: 20,
                 alignItems: 'center', justifyContent: 'center' },
  valueBoxRow: { flexDirection: 'row', justifyContent: 'space-between',
                 paddingHorizontal: 16, marginBottom: 20 },
  amountText:  { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 30, letterSpacing: -0.5 },
  arrowBtn:    { width: 40, height: 40, borderRadius: 20, alignItems: 'center',
                 justifyContent: 'center', borderWidth: 1.5 },
});
