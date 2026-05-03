import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, Send, Users, Bell } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const { colors, isDark } = useTheme();

    return (
        <View style={styles.wrapper}>
            <View
                style={[styles.bar, {
                    backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                }]}
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

                    let IconComponent = Home;
                    if (route.name === 'Home') IconComponent = Home;
                    else if (route.name === 'Payments') IconComponent = Send;
                    else if (route.name === 'Friends') IconComponent = Users;
                    else if (route.name === 'Activity') IconComponent = Bell;

                    // Dark text on green pill so it's always readable
                    const iconColor = isFocused ? '#1A1A1A' : colors.tabIconDefault;

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
                            <View style={[
                                styles.iconWrap,
                                isFocused && styles.iconWrapActive,
                            ]}>
                                <IconComponent
                                    size={22}
                                    color={iconColor}
                                    strokeWidth={isFocused ? 2.5 : 1.8}
                                />
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
});
