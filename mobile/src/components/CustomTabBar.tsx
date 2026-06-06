import React, { useState, useRef, useCallback } from 'react';
import {
  View, TouchableOpacity, Text, StyleSheet,
  Animated, LayoutChangeEvent, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Users, Wallet, Bell, User } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import { scale, vs, ms } from '../utils/responsive';

const TABS = [
  { key: 'Home',     icon: Home,   label: 'Home'     },
  { key: 'Groups',   icon: Users,  label: 'Groups'   },
  { key: 'Payments', icon: Wallet, label: 'Payments' },
  { key: 'Friends',  icon: Bell,   label: 'Friends'  },
  { key: 'Me',       icon: User,   label: 'Me'       },
];

const PILL_H      = vs(62);
const LIMELIGHT_W = scale(40);
const H_MARGIN    = scale(16);
const BOTTOM_GAP  = vs(12);

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
    Animated.spring(limelightX, {
      toValue: cx - LIMELIGHT_W / 2,
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

  const bottomPad = insets.bottom > 0 ? insets.bottom : BOTTOM_GAP;

  return (
    // Outer wrapper — transparent, occupies the correct height so the navigator
    // adds the right bottom padding to scroll content
    <View style={[styles.wrapper, { height: PILL_H + bottomPad + BOTTOM_GAP }]}>
      {/* Limelight — sibling of pill so the cone can bleed freely above the pill edge */}
      <Animated.View
        style={[
          styles.limelightBar,
          { backgroundColor: colors.accent },
          { transform: [{ translateX: limelightX }] },
          { opacity: ready ? 0.85 : 0 },
        ]}
      >
        <LinearGradient
          colors={[
            isDark ? 'rgba(34,197,94,0.22)' : 'rgba(22,163,74,0.14)',
            'transparent',
          ]}
          style={styles.limelightCone}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>

      {/* Floating pill */}
      <View
        style={[
          styles.pill,
          {
            backgroundColor: isDark ? 'rgba(15,18,15,0.96)' : 'rgba(255,255,255,0.96)',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
            bottom: bottomPad,
            // shadow
            shadowColor: isDark ? '#000' : '#1A1A1A',
            shadowOpacity: isDark ? 0.5 : 0.12,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 6 },
            elevation: 12,
          },
        ]}
      >
        {/* Tabs */}
        <View style={styles.tabRow}>
          {TABS.map((tab, index) => {
            const isFocused = state.index === index;
            const IconComp = tab.icon;
            const showBadge = tab.key === 'Friends' && unreadCount > 0;

            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabBtn}
                activeOpacity={0.7}
                onLayout={e => handleLayout(e, index)}
                onPress={() => {
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
                    size={scale(22)}
                    color={isFocused ? colors.accent : colors.tabIconDefault}
                    strokeWidth={isFocused ? 2.2 : 1.8}
                  />
                  {showBadge && <View style={styles.badge} />}
                </View>
                <Text style={[
                  styles.label,
                  { color: isFocused ? colors.accent : colors.tabIconDefault },
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    // transparent — just reserves space
    position: 'relative',
    backgroundColor: 'transparent',
  },
  pill: {
    position: 'absolute',
    left: H_MARGIN,
    right: H_MARGIN,
    borderRadius: ms(30),
    borderWidth: 1,
  },
  limelightBar: {
    position: 'absolute',
    top: BOTTOM_GAP,
    left: H_MARGIN,
    width: LIMELIGHT_W,
    height: vs(3),
    borderRadius: 999,
    zIndex: 20,
  },
  limelightCone: {
    position: 'absolute',
    top: vs(3),
    left: -scale(30),
    width: LIMELIGHT_W + scale(60),
    height: vs(55),
  },
  tabRow: {
    flexDirection: 'row',
    paddingTop: vs(10),
    paddingBottom: vs(10),
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
    fontWeight: '600',
  },
});
