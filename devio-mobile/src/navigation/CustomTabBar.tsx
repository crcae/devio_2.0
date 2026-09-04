import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, User } from 'lucide-react-native';

type IconComponent = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

const ICONS: Record<string, IconComponent> = {
  home: Home,
  user: User,
};

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom + 8, 16);

  return (
    <View style={[styles.container, { bottom }]}>
      <View style={styles.glassSurface}>
        {Platform.OS === 'ios' && (
          <BlurView
            intensity={85}
            tint="systemUltraThinMaterialLight"
            style={StyleSheet.absoluteFill}
          />
        )}
        <View style={styles.itemsRow}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            const Icon = ICONS[route.name] ?? Home;
            const label = options.title ?? route.name;

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

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarButtonTestID}
                onPress={onPress}
                onLongPress={onLongPress}
                activeOpacity={0.8}
                style={isFocused ? styles.activePill : styles.inactiveItem}
              >
                <Icon
                  size={20}
                  color={isFocused ? '#FFFFFF' : '#64748B'}
                  strokeWidth={isFocused ? 2.4 : 2}
                />
                <Text style={isFocused ? styles.activeLabel : styles.inactiveLabel}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 66,
    borderRadius: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
  },
  glassSurface: {
    flex: 1,
    borderRadius: 36,
    overflow: 'hidden',
    backgroundColor:
      Platform.OS === 'ios' ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.95)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.8)',
    elevation: 10,
  },
  itemsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    height: '100%',
    paddingHorizontal: 8,
  },
  activePill: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inactiveItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  inactiveLabel: {
    color: '#64748B',
    fontWeight: '500',
    fontSize: 13,
  },
});