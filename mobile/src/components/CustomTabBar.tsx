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

const LIMELIGHT_W = scale(44);

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
      tension: 180,
      friction: 20,
    }).start();
    if (!ready) setReady(true);
  }, [limelightX, ready]);

  const handleLayout = (e: LayoutChangeEvent, index: number) => {
    const { x, width } = e.nativeEvent.layout;
    tabCenters.current[index] = x + width / 2;
    if (index === state.index) moveLimelight(index);
  };

  return (
    <View style={[styles.container, { borderTopColor: colors.border, paddingBottom: insets.bottom }]}>
      {/* Solid semi-transparent pill background */}
      <View
        style={[StyleSheet.absoluteFillObject, {
          backgroundColor: isDark ? 'rgba(12,15,12,0.97)' : 'rgba(255,255,255,0.97)',
        }]}
      />

      {/* Limelight indicator */}
      <Animated.View
        style={[
          styles.limelightBar,
          { backgroundColor: colors.accent },
          { transform: [{ translateX: limelightX }] },
          !ready && { opacity: 0 },
        ]}
      >
        <LinearGradient
          colors={[
            isDark ? 'rgba(34,197,94,0.35)' : 'rgba(22,163,74,0.22)',
            'transparent',
          ]}
          style={styles.limelightCone}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>

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
                  strokeWidth={isFocused ? 2.2 : 1.8}
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
    borderTopWidth: StyleSheet.hairlineWidth,
    position: 'relative',
    overflow: 'hidden',
  },
  limelightBar: {
    position: 'absolute',
    top: 0,
    width: LIMELIGHT_W,
    height: vs(4),
    borderRadius: 999,
    zIndex: 10,
  },
  limelightCone: {
    position: 'absolute',
    top: vs(4),
    left: -scale(20),
    width: LIMELIGHT_W + scale(40),
    height: vs(52),
    borderRadius: ms(4),
  },
  tabRow: {
    flexDirection: 'row',
    paddingTop: vs(10),
    paddingBottom: vs(4),
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: vs(3),
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
  },
  label: {
    fontSize: ms(10),
    letterSpacing: 0,
  },
});
