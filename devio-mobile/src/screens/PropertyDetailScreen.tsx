import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ArrowRight,
  Bath,
  BedDouble,
  Building2,
  Calendar,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Receipt,
  Ruler,
  Store,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import { useApp } from '../context/AppContext';
import type { RootStackParamList } from '../navigation/types';
import AppHeader from '../components/AppHeader';

type Props = NativeStackScreenProps<RootStackParamList, 'PropertyDetail'>;

const HERO_TONES = [
  { id: 'hero-1', tone: COLORS.primary },
  { id: 'hero-2', tone: '#274565' },
  { id: 'hero-3', tone: '#314F6E' },
];

const THUMBNAILS = [
  { id: 'thumb-1', tone: COLORS.primary },
  { id: 'thumb-2', tone: '#3A5A7C' },
  { id: 'thumb-3', tone: '#274565' },
  { id: 'thumb-4', tone: '#314F6E' },
];

function formatCompact(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(2)}K`;
  }
  return `$${amount.toFixed(0)}`;
}

function formatMXN(amount: number): string {
  return `$${amount.toLocaleString('en-US')}`;
}

export default function PropertyDetailScreen({ navigation }: Props) {
  const { selectedProperty, payments } = useApp();
  const [unitInfoExpanded, setUnitInfoExpanded] = useState(true);
  const [activeThumb, setActiveThumb] = useState(0);

  const unitName = selectedProperty?.name ?? 'Solea Residencial | 1A';

  const { nextPayment, overdueBalance } = useMemo(() => {
    if (payments.length === 0) {
      return { nextPayment: 200000, overdueBalance: 900000 };
    }
    const next =
      payments.find((p) => p.status !== 'Pagado')?.pendingAmount ||
      payments.find((p) => p.status !== 'Pagado')?.amount ||
      200000;
    const overdue = payments
      .filter((p) => p.status !== 'Pagado' && p.dueDate < '2026-09-01')
      .reduce((sum, p) => sum + p.pendingAmount, 0);
    return { nextPayment: next, overdueBalance: overdue || 900000 };
  }, [payments]);

  const { salePrice, totalPaid, pendingBalance } = useMemo(() => {
    if (payments.length === 0) {
      return { salePrice: 6000000, totalPaid: 300000, pendingBalance: 5700000 };
    }
    const price = payments.reduce((sum, p) => sum + p.amount, 0);
    const paid = payments.reduce((sum, p) => sum + p.paidAmount, 0);
    return { salePrice: price, totalPaid: paid, pendingBalance: Math.max(price - paid, 0) };
  }, [payments]);

  const progress = selectedProperty?.generalProgress ?? 0;
  const lastUpdate = 'N/A';

  const unitSpecs = [
    { icon: Ruler, label: 'Superficie', value: `${selectedProperty?.surfaceM2 ?? 76} m²` },
    { icon: BedDouble, label: 'Cuartos', value: `${selectedProperty?.bedrooms ?? 1}` },
    { icon: Bath, label: 'Baños', value: `${selectedProperty?.bathrooms ?? 1}` },
  ];

  const quickActions = [
    {
      key: 'documents',
      icon: FolderOpen,
      label: 'Documentos',
      onPress: () => navigation.navigate('Documents'),
    },
    {
      key: 'pagos',
      icon: Receipt,
      label: 'Estado de Cuenta',
      onPress: () => navigation.navigate('Pagos'),
    },
    {
      key: 'marketplace',
      icon: Store,
      label: 'Marketplace',
      onPress: () => Alert.alert('Marketplace', 'Marketplace de propiedades próximamente'),
    },
  ];

  return (
    <View style={styles.container}>
      <AppHeader title={unitName} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.gallery}>
          <View style={styles.heroWrap}>
            <View style={styles.heroImage}>
              <Building2 size={56} color={COLORS.gold} strokeWidth={1.2} />
            </View>
            <View style={styles.nameCapsule}>
              <Text style={styles.nameCapsuleText} numberOfLines={1}>
                {unitName}
              </Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.thumbnails}
          >
            {THUMBNAILS.map((thumb, index) => (
              <Pressable
                key={thumb.id}
                style={({ pressed }) => [
                  styles.thumbnail,
                  { backgroundColor: thumb.tone },
                  index === activeThumb && styles.thumbnailActive,
                  pressed && styles.pressed,
                ]}
                onPress={() => setActiveThumb(index)}
              >
                <Building2 size={18} color={COLORS.surface} strokeWidth={1.4} />
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.paymentCard}>
          <View style={styles.paymentBadges}>
            <View style={styles.badgeGold}>
              <Calendar size={13} color={COLORS.textPrimary} strokeWidth={2} />
              <Text style={styles.badgeGoldText}>Tu próximo pago</Text>
            </View>
            <View style={styles.badgeRed}>
              <Calendar size={13} color={COLORS.danger} strokeWidth={2} />
              <Text style={styles.badgeRedText}>Saldo Vencido</Text>
            </View>
          </View>

          <View style={styles.paymentAmounts}>
            <View style={styles.paymentAmountItem}>
              <Text style={styles.paymentAmountGold}>{formatMXN(nextPayment)}</Text>
            </View>
            <View style={styles.paymentAmountItem}>
              <Text style={styles.paymentAmountRed}>{formatMXN(overdueBalance)}</Text>
            </View>
          </View>

          <Text style={styles.paymentSubtitle}>Vence: Sep 20 | En 20 días</Text>

          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            onPress={() => navigation.navigate('Pagos')}
          >
            <Text style={styles.primaryButtonText}>Ver saldo y pagos</Text>
          </Pressable>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.moduleTitle}>Avance de Obra</Text>
            <Text style={styles.progressPercent}>{progress}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <View style={styles.progressFooter}>
            <View style={styles.updateRow}>
              <View style={styles.greenDot} />
              <Text style={styles.updateText}>Última actualización {lastUpdate}</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
              onPress={() => navigation.navigate('Progress')}
            >
              <Text style={styles.linkButtonText}>Ver Avances</Text>
              <ArrowRight size={16} color={COLORS.surface} strokeWidth={2.2} />
            </Pressable>
          </View>
        </View>

        <Text style={styles.moduleTitle}>Resumen Financiero</Text>
        <View style={styles.financialRow}>
          <View style={[styles.financialCard, styles.financialSale]}>
            <Text style={styles.financialValue}>{formatCompact(salePrice)}</Text>
            <Text style={styles.financialLabel}>Precio de Venta</Text>
          </View>
          <View style={[styles.financialCard, styles.financialWhite]}>
            <Text style={[styles.financialValue, { color: COLORS.success }]}>
              {formatCompact(totalPaid)}
            </Text>
            <Text style={styles.financialLabel}>Total Pagado</Text>
          </View>
          <View style={[styles.financialCard, styles.financialWhite]}>
            <Text style={styles.financialValue}>{formatCompact(pendingBalance)}</Text>
            <Text style={styles.financialLabel}>Saldo Pendiente</Text>
          </View>
        </View>

        <Text style={styles.moduleTitle}>Acciones Rápidas</Text>
        <View style={styles.quickRow}>
          {quickActions.map((action) => (
            <Pressable
              key={action.key}
              style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}
              onPress={action.onPress}
            >
              <action.icon size={22} color={COLORS.primary} strokeWidth={1.8} />
              <Text style={styles.quickLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.unitCard}>
          <Pressable
            style={styles.unitHeader}
            onPress={() => setUnitInfoExpanded((current) => !current)}
          >
            <Text style={styles.moduleTitle}>Información de la Unidad</Text>
            {unitInfoExpanded ? (
              <ChevronUp size={20} color={COLORS.textSecondary} />
            ) : (
              <ChevronDown size={20} color={COLORS.textSecondary} />
            )}
          </Pressable>

          {unitInfoExpanded ? (
            <View style={styles.unitPills}>
              {unitSpecs.map((spec) => (
                <View key={spec.label} style={styles.unitPill}>
                  <spec.icon size={16} color={COLORS.gold} strokeWidth={2} />
                  <Text style={styles.unitPillLabel}>{spec.label}</Text>
                  <Text style={styles.unitPillValue}>{spec.value}</Text>
                </View>
              ))}
            </View>
          ) : null}
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
  gallery: {
    marginBottom: SPACING.md,
  },
  heroWrap: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
  },
  heroImage: {
    height: 220,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameCapsule: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    maxWidth: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  nameCapsuleText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  thumbnails: {
    marginTop: SPACING.sm,
  },
  thumbnail: {
    width: 68,
    height: 52,
    borderRadius: RADIUS.md,
    marginRight: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailActive: {
    borderColor: COLORS.gold,
  },
  pressed: {
    opacity: 0.85,
  },
  paymentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  paymentBadges: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  badgeGold: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDDACB',
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
  },
  badgeGoldText: {
    marginLeft: 5,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  badgeRed: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
  },
  badgeRedText: {
    marginLeft: 5,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.danger,
  },
  paymentAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  paymentAmountItem: {
    flex: 1,
  },
  paymentAmountGold: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.gold,
  },
  paymentAmountRed: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.danger,
    textAlign: 'right',
  },
  paymentSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  primaryButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '700',
  },
  progressCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  moduleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  progressPercent: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.gold,
  },
  progressTrack: {
    height: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.gold,
  },
  progressFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
  },
  updateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.success,
    marginRight: 6,
  },
  updateText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
  },
  linkButtonText: {
    color: COLORS.surface,
    fontSize: 13,
    fontWeight: '700',
    marginRight: 4,
  },
  financialRow: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
  },
  financialCard: {
    flex: 1,
    borderRadius: 16,
    padding: SPACING.md,
    marginHorizontal: 3,
  },
  financialSale: {
    backgroundColor: '#E2E8F0',
  },
  financialWhite: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  financialValue: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  financialLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  quickRow: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    padding: SPACING.md,
    marginHorizontal: 3,
    alignItems: 'center',
  },
  quickLabel: {
    marginTop: SPACING.sm,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  unitCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  unitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unitPills: {
    flexDirection: 'row',
    marginTop: SPACING.md,
  },
  unitPill: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 14,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  unitPillLabel: {
    marginTop: 6,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  unitPillValue: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});