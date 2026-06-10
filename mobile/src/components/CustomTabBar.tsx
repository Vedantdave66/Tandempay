import React, { useState, useRef, useCallback } from 'react';
import {
  View, TouchableOpacity, Text, StyleSheet,
  Animated, LayoutChangeEvent, Modal,
} from 'react-native';
import { useSafeAreaInsets, initialWindowMetrics } from 'react-native-safe-area-context';
import { Home, Users, Wallet, User, Plus, Camera, Sparkles, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import { scale, vs, ms } from '../utils/responsive';
import { T } from '../utils/typography';

const TABS = [
  { key: 'Home',     icon: Home,   label: 'Home'     },
  { key: 'Groups',   icon: Users,  label: 'Groups'   },
  { key: 'Payments', icon: Wallet, label: 'Payments' },
  { key: 'Me',       icon: User,   label: 'Me'       },
];

const LIMELIGHT_W = scale(46);

export default function CustomTabBar({ state, descriptors, navigation }: any) {
  const { colors, isDark } = useTheme();
  const { unreadCount } = useNotifications();
  const insets = useSafeAreaInsets();

  const tabCenters = useRef<number[]>([]);
  const limelightX = useRef(new Animated.Value(-999)).current;
  const [ready, setReady] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current;
  const fabRotateAnim = useRef(new Animated.Value(0)).current;
  const safeBottom = initialWindowMetrics?.insets.bottom ?? 34;

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

  const openMenu = () => {
    setMenuOpen(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.parallel([
      Animated.spring(menuAnim, { toValue: 1, useNativeDriver: true, damping: 22, stiffness: 280 }),
      Animated.spring(fabRotateAnim, { toValue: 1, useNativeDriver: true, damping: 22, stiffness: 280 }),
    ]).start();
  };

  const closeMenu = (callback?: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.spring(menuAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 280 }),
      Animated.spring(fabRotateAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 280 }),
    ]).start(() => {
      setMenuOpen(false);
      callback?.();
    });
  };

  const fabRotateInterp = fabRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const menuTranslateY = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [vs(20), 0],
  });

  const menuScale = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.0],
  });

  // Menu card bottom = safe bottom + tab bar offset + tab bar height + gap
  const menuBottom = safeBottom + vs(12) + vs(72) + vs(12);

  return (
    <>
      {/* ── Action Menu Modal ── */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="none"
        onRequestClose={() => closeMenu()}
        statusBarTranslucent
      >
        {/* Backdrop */}
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={() => closeMenu()}
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: 'rgba(0,0,0,0.38)', opacity: menuAnim },
            ]}
          />
        </TouchableOpacity>

        {/* Menu card */}
        <Animated.View
          style={[
            styles.menuCard,
            {
              bottom: menuBottom,
              backgroundColor: isDark ? 'rgba(22,22,26,0.97)' : 'rgba(248,248,252,0.97)',
              borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.85)',
              transform: [{ translateY: menuTranslateY }, { scale: menuScale }],
              opacity: menuAnim,
            },
          ]}
        >
          {/* Row 1: Scan Receipt */}
          <TouchableOpacity
            style={[styles.menuRow, styles.menuRowDivider, {
              borderBottomColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
            }]}
            activeOpacity={0.75}
            onPress={() => closeMenu(() => navigation.navigate('ReceiptScan'))}
          >
            <View style={[styles.menuIconBox, { backgroundColor: 'rgba(16,185,129,0.16)' }]}>
              <Camera size={20} color="#10B981" strokeWidth={2} />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={[styles.menuTitle, { color: isDark ? '#F8FAFC' : '#020617' }]}>Scan Receipt</Text>
              <Text style={[styles.menuSub, { color: isDark ? '#94A3B8' : '#64748B' }]}>OCR auto-fills items & amounts</Text>
            </View>
            <ChevronRight size={16} color={isDark ? '#4B5563' : '#94A3B8'} />
          </TouchableOpacity>

          {/* Row 2: Smart Split */}
          <TouchableOpacity
            style={[styles.menuRow, styles.menuRowDivider, {
              borderBottomColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
            }]}
            activeOpacity={0.75}
            onPress={() => closeMenu(() => navigation.navigate('SmartSplit'))}
          >
            <View style={[styles.menuIconBox, { backgroundColor: 'rgba(99,102,241,0.16)' }]}>
              <Sparkles size={20} color="#6366F1" strokeWidth={2} />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={[styles.menuTitle, { color: isDark ? '#F8FAFC' : '#020617' }]}>Smart Split</Text>
              <Text style={[styles.menuSub, { color: isDark ? '#94A3B8' : '#64748B' }]}>AI splits from your description</Text>
            </View>
            <ChevronRight size={16} color={isDark ? '#4B5563' : '#94A3B8'} />
          </TouchableOpacity>

          {/* Row 3: Add Expense */}
          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.75}
            onPress={() => closeMenu(() => navigation.navigate('Groups'))}
          >
            <View style={[styles.menuIconBox, { backgroundColor: 'rgba(245,158,11,0.16)' }]}>
              <Plus size={20} color="#F59E0B" strokeWidth={2} />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={[styles.menuTitle, { color: isDark ? '#F8FAFC' : '#020617' }]}>Add Expense</Text>
              <Text style={[styles.menuSub, { color: isDark ? '#94A3B8' : '#64748B' }]}>Choose a group and enter manually</Text>
            </View>
            <ChevronRight size={16} color={isDark ? '#4B5563' : '#94A3B8'} />
          </TouchableOpacity>
        </Animated.View>
      </Modal>

      {/* ── Tab bar + FAB ── */}
      <View style={[styles.outerWrap, { bottom: insets.bottom + vs(12) }]}>
        <View style={[styles.glassPill, { shadowOpacity: isDark ? 0.45 : 0.14 }]}>
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

          {/* Layer 3: top-edge shimmer — dark mode only to avoid gray artifact */}
          {isDark && (
            <LinearGradient
              colors={['rgba(255,255,255,0.07)', 'rgba(22,22,26,0)']}
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
          )}

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
            {TABS.slice(0, 2).map((tab, index) => {
              const isFocused = state.index === index;
              const IconComp = tab.icon;
              const showBadge = tab.key === 'Me' && unreadCount > 0;
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
                  <Text style={[styles.label, T.semibold, { color: isFocused ? colors.accent : colors.tabIconDefault }]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Center spacer — FAB floats here */}
            <View style={styles.fabSpacer} />

            {TABS.slice(2).map((tab, sliceIndex) => {
              const index = sliceIndex + 2;
              const isFocused = state.index === index;
              const IconComp = tab.icon;
              const showBadge = tab.key === 'Me' && unreadCount > 0;
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
                  <Text style={[styles.label, T.semibold, { color: isFocused ? colors.accent : colors.tabIconDefault }]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* FAB — floats above glass pill */}
        <Animated.View
          style={[
            styles.fab,
            {
              backgroundColor: colors.accent,
              shadowColor: colors.accent,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.fabInner}
            activeOpacity={0.85}
            onPress={menuOpen ? () => closeMenu() : openMenu}
          >
            <Animated.View style={{ transform: [{ rotate: fabRotateInterp }] }}>
              <Plus size={24} color="#FFFFFF" strokeWidth={2.4} />
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    position: 'absolute',
    left: scale(20),
    right: scale(20),
  },
  glassPill: {
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
  fabSpacer: {
    flex: 1,
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
  fab: {
    position: 'absolute',
    bottom: vs(6),
    alignSelf: 'center',
    width: scale(54),
    height: scale(54),
    borderRadius: scale(27),
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 14,
    zIndex: 20,
  },
  fabInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: scale(27),
  },
  menuCard: {
    position: 'absolute',
    left: scale(20),
    right: scale(20),
    borderRadius: ms(24),
    borderWidth: 0.8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.20,
    shadowRadius: 32,
    elevation: 24,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: vs(14),
    paddingHorizontal: scale(16),
    gap: scale(14),
  },
  menuRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuIconBox: {
    width: scale(44),
    height: scale(44),
    borderRadius: ms(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextCol: {
    flex: 1,
    gap: vs(2),
  },
  menuTitle: {
    fontSize: ms(15),
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  menuSub: {
    fontSize: ms(12),
  },
});
