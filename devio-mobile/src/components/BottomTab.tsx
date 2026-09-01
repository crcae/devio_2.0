import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, User } from 'lucide-react-native';
import { COLORS, SPACING } from '../constants/theme';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const ICONS: Record<string, typeof Home> = {
  home: Home,
  user: User,
};

export default function BottomTab({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottom = insets.bottom + (Platform.OS === 'ios' ? 24 : 16);

  return (
    <View style={[styles.wrapper, { bottom }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          const isFocused = state.index === index;
          const Icon = ICONS[route.name] ?? Home;

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

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              style={styles.tab}
            >
              <View style={[styles.iconWrap, isFocused && styles.iconWrapActive]}>
                <Icon
                  size={24}
                  color={isFocused ? COLORS.primary : COLORS.textSecondary}
                  strokeWidth={isFocused ? 2.4 : 2}
                />
              </View>
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 24,
    right: 24,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    borderRadius: 35,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: COLORS.goldLight,
  },
  tabLabel: {
    marginTop: 1,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabLabelActive: {
    color: COLORS.primary,
  },
});