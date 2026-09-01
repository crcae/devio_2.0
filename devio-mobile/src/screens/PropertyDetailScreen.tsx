import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Bath, BedDouble, Building2, Car, ChevronRight, FolderOpen, HardHat, Ruler, Wallet } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import { useApp } from '../context/AppContext';
import type { RootStackParamList } from '../navigation/types';
import AppHeader from '../components/AppHeader';

type Props = NativeStackScreenProps<RootStackParamList, 'PropertyDetail'>;

const BANNER_PANELS = [
  { id: 'panel-1', tone: COLORS.primary, icon: Building2 },
  { id: 'panel-2', tone: '#274565', icon: Building2 },
  { id: 'panel-3', tone: '#314F6E', icon: Building2 },
];

function quarterOf(isoDate: string): string {
  if (!isoDate) return 'Q4 2026';
  const [year, month] = isoDate.split('-');
  const q = Math.ceil(Number(month) / 3);
  return `Q${q} ${year}`;
}

export default function PropertyDetailScreen({ navigation }: Props) {
  const { selectedProperty } = useApp();
  const { width } = useWindowDimensions();
  const [activeSlide, setActiveSlide] = useState(0);

  const unitName = selectedProperty?.name ?? 'Solea Residencial | 1A';
  const unitLabel = selectedProperty
    ? `Unidad ${selectedProperty.unitCode.replace(/^S-/, '')}`
    : 'Unidad 1A';
  const deliveryLabel = `Entrega: ${quarterOf(selectedProperty?.estimatedDeliveryDate ?? '')}`;

  const specs = [
    { icon: Ruler, label: 'Superficie', value: `${selectedProperty?.surfaceM2 ?? 76} m²` },
    { icon: BedDouble, label: 'Cuartos', value: `${selectedProperty?.bedrooms ?? 1}` },
    { icon: Bath, label: 'Baños', value: `${selectedProperty?.bathrooms ?? 1}` },
    { icon: Car, label: 'Cajón', value: '1' },
  ];

  const actions = [
    {
      key: 'pagos',
      icon: Wallet,
      title: 'Estado de Cuenta & Pagos',
      subtitle: 'Resumen financiero y recibos',
      onPress: () => navigation.navigate('Pagos'),
    },
    {
      key: 'obra',
      icon: HardHat,
      title: 'Avance de Obra',
      subtitle: 'Especialidades y fotos',
      onPress: () => navigation.navigate('Progress'),
    },
    {
      key: 'expediente',
      icon: FolderOpen,
      title: 'Expediente Digital',
      subtitle: 'Contratos, recibos y planos',
      onPress: () => navigation.navigate('Documents'),
    },
  ];

  const panelWidth = width - SPACING.lg * 2;

  return (
    <View style={styles.container}>
      <AppHeader title={unitName} subtitle="Ficha Técnica" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.carouselWrap}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              setActiveSlide(Math.round(e.nativeEvent.contentOffset.x / panelWidth));
            }}
          >
            {BANNER_PANELS.map((panel) => (
              <View
                key={panel.id}
                style={[styles.banner, { width: panelWidth, backgroundColor: panel.tone }]}
              >
                <panel.icon size={64} color={COLORS.gold} strokeWidth={1.2} />
              </View>
            ))}
          </ScrollView>

          <View style={styles.badgeUnit}>
            <Text style={styles.badgeUnitText}>{unitLabel}</Text>
          </View>
          <View style={styles.badgeDelivery}>
            <Text style={styles.badgeDeliveryText}>{deliveryLabel}</Text>
          </View>

          <View style={styles.dots}>
            {BANNER_PANELS.map((panel, index) => (
              <View
                key={panel.id}
                style={[styles.dot, index === activeSlide && styles.dotActive]}
              />
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Especificaciones</Text>
        <View style={styles.specGrid}>
          {specs.map((spec) => (
            <View key={spec.label} style={styles.specCard}>
              <spec.icon size={22} color={COLORS.gold} strokeWidth={2} />
              <Text style={styles.specValue}>{spec.value}</Text>
              <Text style={styles.specLabel}>{spec.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Accesos rápidos</Text>
        <View style={styles.actions}>
          {actions.map((action) => (
            <Pressable
              key={action.key}
              style={({ pressed }) => [styles.actionCard, pressed && styles.actionPressed]}
              onPress={action.onPress}
            >
              <View style={styles.actionIcon}>
                <action.icon size={24} color={COLORS.gold} strokeWidth={2} />
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
              </View>
              <ChevronRight size={20} color={COLORS.textSecondary} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  carouselWrap: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
  },
  banner: {
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeUnit: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  badgeUnitText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  badgeDelivery: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    backgroundColor: 'rgba(31,54,82,0.85)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  badgeDeliveryText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.surface,
  },
  dots: {
    position: 'absolute',
    bottom: SPACING.md,
    alignSelf: 'center',
    flexDirection: 'row',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 3,
  },
  dotActive: {
    backgroundColor: COLORS.gold,
    width: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  specCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  specValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
  },
  specLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  actions: {
    gap: SPACING.md,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  actionPressed: {
    opacity: 0.85,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  actionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});