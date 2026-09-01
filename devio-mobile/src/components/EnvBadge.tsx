import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { COLORS, RADIUS } from '../constants/theme';

export default function EnvBadge() {
  const { isDemoMode } = useApp();

  return (
    <View style={[styles.badge, isDemoMode ? styles.badgeDemo : styles.badgeLive]}>
      <View style={[styles.dot, isDemoMode ? styles.dotDemo : styles.dotLive]} />
      <Text style={[styles.text, isDemoMode ? styles.textDemo : styles.textLive]}>
        {isDemoMode ? 'DEMO' : 'LIVE'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeLive: {
    backgroundColor: '#E7F8EE',
  },
  badgeDemo: {
    backgroundColor: '#FEF3E2',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: RADIUS.pill,
    marginRight: 5,
  },
  dotLive: {
    backgroundColor: COLORS.success,
  },
  dotDemo: {
    backgroundColor: COLORS.warning,
  },
  text: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  textLive: {
    color: COLORS.success,
  },
  textDemo: {
    color: COLORS.warning,
  },
});