import { Colors } from '@/constants/Colors';
import Feather from '@expo/vector-icons/Feather';
import { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function SwipeableTabBar({ state, descriptors, navigation }: MaterialTopTabBarProps) {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
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
                        navigation.navigate(route.name);
                    }
                };

                const onLongPress = () => {
                    navigation.emit({
                        type: 'tabLongPress',
                        target: route.key,
                    });
                };

                const color = isFocused ? Colors.light.primary : Colors.light.icon;

                let iconName: React.ComponentProps<typeof Feather>['name'] = 'circle';
                if (route.name === 'index') iconName = 'home';
                else if (route.name === 'inventory') iconName = 'package';
                else if (route.name === 'browser') iconName = 'compass';
                else if (route.name === 'profile') iconName = 'user';

                const label = options.title !== undefined
                    ? options.title
                    : options.tabBarLabel !== undefined
                        ? options.tabBarLabel
                        : route.name;

                return (
                    <TouchableOpacity
                        key={route.key}
                        accessibilityRole="button"
                        accessibilityState={isFocused ? { selected: true } : {}}
                        onPress={onPress}
                        onLongPress={onLongPress}
                        style={styles.tab}
                        activeOpacity={0.7}
                    >
                        <Feather name={iconName} size={24} color={color} style={{ marginBottom: 4 }} />
                        <Text style={[styles.label, { color }]}>
                            {label as string}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: '#FEFBF8', // Hardcoded Warm Cream
        borderTopWidth: 1,
        borderTopColor: Colors.light.surfaceHighlight || '#E5E5EA',
        paddingTop: 12,
        paddingBottom: 4,
        elevation: 10,
        zIndex: 100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: 50, // Standard touch target
    },
    label: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
});
