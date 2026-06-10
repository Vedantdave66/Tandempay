import React, { useState, useRef, useCallback } from 'react';
import {
  View, TouchableOpacity, Text, StyleSheet,
  Animated, LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Users, Wallet, Bell, User } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import { scale, vs, ms } from '../utils/responsive';
import { T } from '../utils/typography';

const TABS = [
  { key: 'Home',     icon: Home,  label: 'Home'     },
  { key: 'Groups',   icon: Users, label: 'Groups'   },
  { key: 'Payments', icon: Wallet,label: 'Payments' },
  { key: 'Friends',  icon: Bell,  label: 'Friends'  },
  { key: 'Me',       icon: User,  label: 'Me'       },
];

const LIMELIGHT_W = scale(52);

export default function CustomTabBar({ state, descriptors, navigation }: any) {
  const { colors, isDark } = useTheme();
  const { unreadCount } = useNotifications();
  const insets = useSafeAreaInsets();

  const tabCenters = useRef<number[]>([]);
  const limelightX = useRef(new Animated.Value(-999)).current;
  const [ready, setReady] = useState(false);

  const moveLimelight = useCallback((index: number) => {
    const cx = tabCenters.current[index];
    if (cx === undefined) return;
    const targetX = cx - LIMELIGHT_W / 2;
    Animated.spring(limelightX, {
      toValue: targetX,
      useNativeDriver: true,
      tension: 200,
      friction: 28,
    }).start();
    if (!ready) setReady(true);
  }, [limelightX, ready]);

  const handleLayout = (e: LayoutChangeEvent, index: number) => {
    const { x, width } = e.nativeEvent.layout;
    tabCenters.current[index] = x + width / 2;
    if (index === state.index) moveLimelight(index);
  };

  return (
    <View style={[
      styles.container,
      {
        bottom: insets.bottom + vs(12),
        shadowOpacity: isDark ? 0.45 : 0.14,
      },
    ]}>
      {/* Layer 1: frosted fill */}
      <View style={[StyleSheet.absoluteFillObject, {
        backgroundColor: isDark
          ? 'rgba(22, 22, 26, 0.86)'
          : 'rgba(248, 248, 252, 0.86)',
        borderRadius: ms(36),
      }]} />

      {/* Layer 2: glass ring (border) */}
      <View style={[StyleSheet.absoluteFillObject, {
        borderRadius: ms(36),
        borderWidth: 0.8,
        borderColor: isDark
          ? 'rgba(255, 255, 255, 0.10)'
          : 'rgba(255, 255, 255, 0.85)',
      }]} />

      {/* Layer 3: top-edge shimmer */}
      <LinearGradient
        colors={[
          isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.60)',
          'transparent',
        ]}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: vs(20),
          borderRadius: ms(36),
        }}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        pointerEvents="none"
      />

      {/* Apple-style active indicator — glowing pill behind icon */}
      <Animated.View
        style={[
          styles.limelightPill,
          {
            backgroundColor: isDark
              ? colors.accent + '28'
              : colors.accent + '1F',
            shadowColor: colors.accent,
            shadowOpacity: isDark ? 0.55 : 0.35,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 0 },
            transform: [{ translateX: limelightX }],
          },
          !ready && { opacity: 0 },
        ]}
      />

      {/* Tab buttons */}
      <View style={styles.tabRow}>
        {TABS.map((tab, index) => {
          const isFocused = state.index === index;
          const IconComp = tab.icon;
          const showBadge = tab.key === 'Friends' && unreadCount > 0;

          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabBtn}
              activeOpacity={0.88}
              onLayout={e => handleLayout(e, index)}
              onPress={() => {
                Haptics.selectionAsync();
                moveLimelight(index);
                const event = navigation.emit({
                  type: 'tabPress',
                  target: state.routes[index].key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(state.routes[index].name);
                }
              }}
            >
              <View style={styles.iconWrap}>
                <IconComp
                  size={22}
                  color={isFocused ? colors.accent : colors.tabIconDefault}
                  strokeWidth={isFocused ? 2.4 : 1.6}
                />
                {showBadge && <View style={styles.badge} />}
              </View>
              <Text style={[
                styles.label,
                T.semibold,
                { color: isFocused ? colors.accent : colors.tabIconDefault },
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: scale(20),
    right: scale(20),
    borderRadius: ms(36),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 16,
  },
  limelightPill: {
    position: 'absolute',
    top: vs(9),
    width: scale(46),
    height: scale(34),
    borderRadius: ms(17),
    zIndex: 1,
  },
  tabRow: {
    flexDirection: 'row',
    paddingTop: vs(13),
    paddingBottom: vs(6),
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: vs(3),
    minHeight: scale(44),
  },
  iconWrap: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: '#E05252',
    zIndex: 3,
  },
  label: {
    fontSize: ms(10),
    letterSpacing: 0.3,
  },
});
