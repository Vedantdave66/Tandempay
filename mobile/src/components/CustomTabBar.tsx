import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, Users, Wallet, Bell, User } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const { colors, isDark } = useTheme();
    const { unreadCount } = useNotifications();
    const insets = useSafeAreaInsets();

    const getIcon = (routeName: string, color: string) => {
        switch (routeName) {
            case 'Home':     return <Home size={22} color={color} />;
            case 'Groups':   return <Users size={22} color={color} />;
            case 'Payments': return <Wallet size={22} color={color} />;
            case 'Friends':  return <Bell size={22} color={color} />;
            case 'Me':       return <User size={22} color={color} />;
            default:         return <Home size={22} color={color} />;
        }
    };

    return (
        <View
            style={[
                styles.bar,
                {
                    backgroundColor: isDark ? 'rgba(14,17,14,0.94)' : 'rgba(255,255,255,0.94)',
                    borderTopColor: colors.border,
                    height: 64 + insets.bottom,
                    paddingBottom: insets.bottom,
                },
            ]}
        >
            {state.routes.map((route, index) => {
                const { options } = descriptors[route.key];
                const isFocused = state.index === index;

                const onPress = () => {
                    const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                    });
                    if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate(route.name, route.params);
                    }
                };

                const onLongPress = () => {
                    navigation.emit({ type: 'tabLongPress', target: route.key });
                };

                const tintColor = isFocused ? colors.accent : colors.tabIconDefault;
                const showBadge = route.name === 'Friends' && unreadCount > 0;

                return (
                    <TouchableOpacity
                        key={route.key}
                        accessibilityRole="button"
                        accessibilityState={isFocused ? { selected: true } : {}}
                        accessibilityLabel={options.tabBarAccessibilityLabel}
                        testID={(options as any).tabBarTestID}
                        onPress={onPress}
                        onLongPress={onLongPress}
                        style={styles.tabItem}
                        activeOpacity={0.75}
                    >
                        <View style={[styles.iconWrap, isFocused && { backgroundColor: colors.accentBg }]}>
                            {getIcon(route.name, tintColor)}
                            {showBadge && <View style={[styles.badge, { borderColor: colors.surface }]} />}
                        </View>
                        <Text style={[styles.label, { color: tintColor, fontWeight: isFocused ? '700' : '600' }]}>
                            {route.name}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    bar: {
        flexDirection: 'row',
        borderTopWidth: 1,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        paddingTop: 10,
    },
    iconWrap: {
        width: 44,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badge: {
        position: 'absolute',
        top: -2,
        right: 4,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#E05252',
        borderWidth: 1.5,
    },
    label: {
        fontSize: 10,
    },
});
