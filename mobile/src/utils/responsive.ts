/**
 * responsive.ts
 * ------------
 * Scale helpers for cross-platform layout.
 * Design baseline: iPhone 14 Pro  →  390 × 844 logical points
 *
 * Usage:
 *   import { scale, vs, ms, wp, hp } from '../utils/responsive';
 *
 *   fontSize: ms(16)          // moderate — good for text
 *   paddingHorizontal: scale(20)  // horizontal space
 *   paddingVertical: vs(12)   // vertical space
 *   width: wp(90)             // 90% of screen width
 */

import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const BASE_W = 390;
const BASE_H = 844;

/** Horizontal scale — use for widths and horizontal padding/margins */
export const scale = (size: number): number =>
  Math.round(PixelRatio.roundToNearestPixel((SCREEN_W / BASE_W) * size));

/** Vertical scale — use for heights and vertical padding/margins */
export const vs = (size: number): number =>
  Math.round(PixelRatio.roundToNearestPixel((SCREEN_H / BASE_H) * size));

/**
 * Moderate scale — use for font sizes and border radii.
 * factor=0 → no scaling (fixed size)
 * factor=1 → same as scale()
 * factor=0.5 (default) — scales gently, prevents text from being too large on big screens
 */
export const ms = (size: number, factor = 0.5): number =>
  Math.round(PixelRatio.roundToNearestPixel(size + (scale(size) - size) * factor));

/** Percentage of screen width */
export const wp = (pct: number): number => (SCREEN_W * pct) / 100;

/** Percentage of screen height */
export const hp = (pct: number): number => (SCREEN_H * pct) / 100;

/** True on narrow phones (e.g. iPhone SE, Android < 375) */
export const isSmallScreen = SCREEN_W < 375;

/** True on tablets / large Android devices */
export const isTablet = SCREEN_W >= 700;

/** Convenience: current screen dimensions (post-layout) */
export const SCREEN = { w: SCREEN_W, h: SCREEN_H };

/**
 * Platform-specific value helper.
 * Usage: pv({ ios: 20, android: 16 })
 */
export function pv<T>(values: { ios: T; android: T }): T {
  return Platform.OS === 'ios' ? values.ios : values.android;
}
