import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

function statusTextFor(progress: number): string {
  if (progress < 25) return 'Iniciando DEVIO...';
  if (progress < 55) return 'Sincronizando información...';
  if (progress < 85) return 'Cargando tus propiedades...';
  return 'Todo listo';
}

export default function AppLoader({ progress }: { progress: number }) {
  const animated = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animated, {
      toValue: Math.min(Math.max(progress, 0), 100),
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [progress, animated]);

  const width = animated.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const displayPercent = animated.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 100],
  });

  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <View style={styles.logoBadge}>
          <Image
            source={require('../../assets/devio-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.logo}>DEVIO</Text>
        <Text style={styles.tagline}>Tu inversión en tiempo real</Text>
      </View>

      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width }]} />
        </View>
        <View style={styles.progressMeta}>
          <Text style={styles.statusText}>{statusTextFor(progress)}</Text>
          <Animated.Text style={styles.percentText}>
            {displayPercent.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%'],
            })}
          </Animated.Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  brand: {
    alignItems: 'center',
  },
  logoBadge: {
    width: 84,
    height: 84,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  logoImage: {
    width: 64,
    height: 64,
    borderRadius: 16,
  },
  logo: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.surface,
    letterSpacing: 5,
  },
  tagline: {
    marginTop: SPACING.xs,
    fontSize: 13,
    color: '#B8C4D4',
    letterSpacing: 0.4,
  },
  progressWrap: {
    width: '100%',
    marginTop: SPACING.xl,
  },
  progressTrack: {
    height: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.gold,
  },
  progressMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.goldLight,
  },
  percentText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.surface,
  },
});