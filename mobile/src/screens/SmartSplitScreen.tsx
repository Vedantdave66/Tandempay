import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { scale, vs, ms } from '../utils/responsive';
import { T } from '../utils/typography';

export default function SmartSplitScreen({ navigation }: any) {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <ArrowLeft size={22} color={colors.text} />
      </TouchableOpacity>

      <View style={styles.body}>
        <View style={[styles.iconCircle, { backgroundColor: 'rgba(99,102,241,0.14)' }]}>
          <Sparkles size={48} color="#6366F1" strokeWidth={1.5} />
        </View>
        <Text style={[styles.title, T.extrabold, { color: colors.text }]}>Smart Split</Text>
        <Text style={[styles.subtitle, T.regular, { color: colors.secondaryText }]}>
          Describe the expense in plain English — "Thai food for 4, Lakshit didn't have drinks" — and AI figures out the fairest split.
        </Text>
        <View style={[styles.badge, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
          <Text style={[styles.badgeText, { color: '#6366F1' }]}>Coming Soon</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backBtn: {
    padding: scale(16),
    alignSelf: 'flex-start',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(40),
    gap: vs(16),
    marginTop: -vs(60),
  },
  iconCircle: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(8),
  },
  title: {
    fontSize: ms(32),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: ms(16),
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
  },
  badge: {
    paddingHorizontal: scale(16),
    paddingVertical: vs(6),
    borderRadius: ms(20),
    marginTop: vs(8),
  },
  badgeText: {
    fontSize: ms(13),
    fontWeight: '600',
  },
});
