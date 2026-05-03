import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, Send, Users, Bell, LayoutGrid } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const { colors, isDark } = useTheme();
    const { unreadCount } = useNotifications();

    const getIcon = (routeName: string, isFocused: boolean, color: string) => {
        const size = 22;
        const sw = isFocused ? 2.5 : 1.8;
        switch (routeName) {
            case 'Home':     return <Home size={size} color={color} strokeWidth={sw} />;
            case 'Groups':   return <LayoutGrid size={size} color={color} strokeWidth={sw} />;
            case 'Payments': return <Send size={size} color={color} strokeWidth={sw} />;
            case 'Friends':  return <Users size={size} color={color} strokeWidth={sw} />;
            case 'Activity': return <Bell size={size} color={color} strokeWidth={sw} />;
            default:         return <Home size={size} color={color} strokeWidth={sw} />;
        }
    };

    return (
        <View style={styles.wrapper}>
            <View style={[styles.bar, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
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

                    const iconColor = isFocused ? '#1A1A1A' : colors.tabIconDefault;
                    const showBadge = route.name === 'Activity' && unreadCount > 0;

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
                            <View style={[styles.iconWrap, isFocused && styles.iconWrapActive]}>
                                {getIcon(route.name, isFocused, iconColor)}
                                {showBadge && (
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 28 : 18,
        left: 24,
        right: 24,
    },
    bar: {
        flexDirection: 'row',
        height: 68,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 24,
        elevation: 12,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
    },
    iconWrap: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconWrapActive: {
        backgroundColor: '#A8D5A2',
    },
    badge: {
        position: 'absolute',
        top: 6,
        right: 6,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#E05252',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 3,
    },
    badgeText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: '800',
    },
});
