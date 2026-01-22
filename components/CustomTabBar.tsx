import { Colors } from '@/constants/Colors';
import Feather from '@expo/vector-icons/Feather';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const tabs = [
    { name: 'index', route: '/(tabs)', title: 'Home', icon: 'home' },
    { name: 'inventory', route: '/(tabs)/inventory', title: 'Inventario', icon: 'package' },
    { name: 'browser', route: '/(tabs)/browser', title: 'Hub', icon: 'compass' },
    { name: 'profile', route: '/(tabs)/profile', title: 'Profilo', icon: 'user' },
];

export function CustomTabBar() {
    const router = useRouter();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom }]} pointerEvents="box-none">
            {tabs.map((tab) => {
                const isActive = pathname === tab.route || pathname.startsWith(tab.route + '/');
                const color = isActive ? '#1C1C1E' : Colors.light.icon;

                return (
                    <TouchableOpacity
                        key={tab.name}
                        style={styles.tab}
                        onPress={() => {
                            console.log('Tab pressed:', tab.name);
                            router.push(tab.route as any);
                        }}
                        activeOpacity={0.7}
                    >
                        <Feather name={tab.icon as any} size={24} color={color} style={{ marginBottom: 4 }} />
                        <Text style={[styles.label, { color }]}>{tab.title}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        backgroundColor: '#FEFBF8',
        borderTopWidth: 1,
        borderTopColor: '#E8E4DD',
        paddingTop: 12,
        paddingBottom: 4,
        elevation: 999,
        zIndex: 999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        height: 60,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
});
