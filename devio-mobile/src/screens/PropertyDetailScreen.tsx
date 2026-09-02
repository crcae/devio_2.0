import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
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
  Car,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Hash,
  Layers,
  Receipt,
  Ruler,
  Store,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import { useApp } from '../context/AppContext';
import {
  calculateOverdueBalance,
  calculateSalePrice,
  calculateTotalPaid,
  getNextPayment,
  type AdaptedProperty,
} from '../services/bubbleAdapter';
import type { RootStackParamList } from '../navigation/types';
import AppHeader from '../components/AppHeader';

type Props = NativeStackScreenProps<RootStackParamList, 'PropertyDetail'>;

const HERO_TONES = [
  { id: 'hero-1', tone: COLORS.primary },
  { id: 'hero-2', tone: '#274565' },
  { id: 'hero-3', tone: '#314F6E' },
];

function formatCompact(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded >= 1_000_000) {
    return `$${(rounded / 1_000_000).toFixed(2)}M`;
  }
  if (rounded >= 1_000) {
    return `$${(rounded / 1_000).toFixed(2)}K`;
  }
  return `$${rounded.toFixed(0)}`;
}

function formatMXN(amount: number): string {
  return `$${Math.round(amount).toLocaleString('en-US')}`;
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatNextDue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`;
}

export default function PropertyDetailScreen({ navigation }: Props) {
  const { selectedProperty, payments, progressHistory, isDemoMode, loadProgress, loadPayments } = useApp();
  const [unitInfoExpanded, setUnitInfoExpanded] = useState(true);
  const [activeThumb, setActiveThumb] = useState(0);

  const unitName = selectedProperty?.name ?? 'Solea Residencial | 1A';
  const unitId = selectedProperty?._id ?? '';

  useEffect(() => {
    if (unitId) {
      loadProgress(unitId);
      loadPayments(unitId);
    }
  }, [unitId, loadProgress, loadPayments]);

  const galleryImages = useMemo(() => {
    const images = (selectedProperty as AdaptedProperty | null)?.images ?? [];
    return images.length > 0
      ? images.map((url, index) => ({ id: `img-${index}`, url }))
      : HERO_TONES;
  }, [selectedProperty]);

  const nextPaymentInfo = useMemo(() => getNextPayment(payments), [payments]);
  const nextPayment = nextPaymentInfo?.amount ?? (isDemoMode ? 200000 : 0);
  const overdueBalance = useMemo(
    () => calculateOverdueBalance(payments) || (isDemoMode ? 900000 : 0),
    [payments, isDemoMode],
  );

  const { salePrice, totalPaid, pendingBalance } = useMemo(() => {
    if (payments.length === 0) {
      if (!isDemoMode) {
        return { salePrice: 0, totalPaid: 0, pendingBalance: 0 };
      }
      return { salePrice: 6000000, totalPaid: 300000, pendingBalance: 5700000 };
    }
    // Precio de Venta: sum of Monto programado, falling back to the unit price.
    const unitPrice = (selectedProperty as AdaptedProperty | null)?.totalPrice ?? 0;
    const price = calculateSalePrice(payments, unitPrice);
    const paid = calculateTotalPaid(payments);
    return {
      salePrice: price,
      totalPaid: paid,
      pendingBalance: Math.max(price - paid, 0),
    };
  }, [payments, isDemoMode, selectedProperty]);

  const progress = useMemo(() => {
    const latest = progressHistory[0];
    return latest?.overall ?? selectedProperty?.generalProgress ?? 0;
  }, [progressHistory, selectedProperty?.generalProgress]);
  const lastUpdate = progressHistory.length > 0 ? progressHistory[0].dateShort : 'N/A';

  const adaptedProperty = selectedProperty as AdaptedProperty | null;

  const openMarketplace = async () => {
    const desarrolladoraId = (selectedProperty as AdaptedProperty | null)?.desarrolladoraId;
    const url = desarrolladoraId
      ? `https://app.deviomx.com/marketplace/${desarrolladoraId}`
      : 'https://app.deviomx.com/marketplace';
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Marketplace', 'No fue posible abrir el marketplace.');
    }
  };

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
      onPress: openMarketplace,
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
              {'url' in galleryImages[activeThumb] ? (
                <Image
                  key={galleryImages[activeThumb].id}
                  source={{ uri: galleryImages[activeThumb].url }}
                  style={styles.heroImageBg}
                  resizeMode="cover"
                />
              ) : (
                <Building2 size={56} color={COLORS.gold} strokeWidth={1.2} />
              )}
            </View>
            <View style={styles.heroCounter}>
              <Text style={styles.heroCounterText}>
                {activeThumb + 1}/{galleryImages.length}
              </Text>
            </View>
          </View>

          <View style={styles.galleryTitleRow}>
            <Text style={styles.galleryTitle} numberOfLines={1}>
              {adaptedProperty?.projectName || unitName}
            </Text>
            {adaptedProperty?.unitCode ? (
              <View style={styles.galleryUnitBadge}>
                <Text style={styles.galleryUnitBadgeText}>Unidad {adaptedProperty.unitCode}</Text>
              </View>
            ) : null}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.thumbnails}
          >
            {galleryImages.map((tile, index) => (
              <Pressable
                key={tile.id}
                style={({ pressed }) => [
                  styles.thumbnail,
                  index === activeThumb && styles.thumbnailActive,
                  pressed && styles.pressed,
                ]}
                onPress={() => setActiveThumb(index)}
              >
                {'url' in tile ? (
                  <Image source={{ uri: tile.url }} style={styles.thumbnailImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.thumbnailTone, { backgroundColor: tile.tone }]}>
                    <Building2 size={18} color={COLORS.surface} strokeWidth={1.4} />
                  </View>
                )}
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

          <Text style={styles.paymentSubtitle}>
            {nextPaymentInfo
              ? `Vence: ${formatNextDue(nextPaymentInfo.dueDate)} | En ${nextPaymentInfo.daysRemaining} días`
              : 'Sin pagos pendientes'}
          </Text>

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
              style={({ pressed }) => [styles.quickCard, pressed && styles.quickCardPressed]}
              onPress={action.onPress}
            >
              <View style={styles.quickIcon}>
                <action.icon size={20} color={COLORS.primary} strokeWidth={2} />
              </View>
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
            <View style={styles.unitGrid}>
              <View style={styles.unitRow}>
                <View style={styles.unitGridCard}>
                  <View style={styles.unitGridIcon}><Ruler size={18} color={COLORS.gold} strokeWidth={2} /></View>
                  <Text style={styles.unitGridValue}>{selectedProperty?.surfaceM2 ?? 0} m²</Text>
                  <Text style={styles.unitGridLabel}>Superficie</Text>
                </View>
                <View style={styles.unitGridCard}>
                  <View style={styles.unitGridIcon}><BedDouble size={18} color={COLORS.gold} strokeWidth={2} /></View>
                  <Text style={styles.unitGridValue}>{selectedProperty?.bedrooms ?? 0}</Text>
                  <Text style={styles.unitGridLabel}>Cuartos</Text>
                </View>
                <View style={styles.unitGridCard}>
                  <View style={styles.unitGridIcon}><Bath size={18} color={COLORS.gold} strokeWidth={2} /></View>
                  <Text style={styles.unitGridValue}>{selectedProperty?.bathrooms ?? 0}</Text>
                  <Text style={styles.unitGridLabel}>Baños</Text>
                </View>
              </View>

              <View style={styles.unitRow}>
                <View style={styles.unitGridCardWide}>
                  <View style={styles.unitGridIcon}><Ruler size={18} color={COLORS.gold} strokeWidth={2} /></View>
                  <Text style={styles.unitGridValue}>
                    {adaptedProperty?.constructionArea != null && adaptedProperty.constructionArea > 0
                      ? `${adaptedProperty.constructionArea} m²`
                      : '—'}
                  </Text>
                  <Text style={styles.unitGridLabel}>Área de Construcción</Text>
                </View>
                <View style={styles.unitGridCardWide}>
                  <View style={styles.unitGridIcon}><Hash size={18} color={COLORS.gold} strokeWidth={2} /></View>
                  <Text style={styles.unitGridValue}>{selectedProperty?.unitCode ? `# ${selectedProperty.unitCode}` : '—'}</Text>
                  <Text style={styles.unitGridLabel}>Número de Unidad</Text>
                </View>
              </View>

              <View style={styles.unitRow}>
                <View style={styles.unitGridCardWide}>
                  <View style={styles.unitGridIcon}><Car size={18} color={COLORS.gold} strokeWidth={2} /></View>
                  <Text style={styles.unitGridValue}>{adaptedProperty?.parking ?? 0}</Text>
                  <Text style={styles.unitGridLabel}>Cajones de Estacionamiento</Text>
                </View>
                <View style={styles.unitGridCardWide}>
                  <View style={styles.unitGridIcon}><Layers size={18} color={COLORS.gold} strokeWidth={2} /></View>
                  <Text style={styles.unitGridValue}>{adaptedProperty?.floor ?? '—'}</Text>
                  <Text style={styles.unitGridLabel}>Piso / Nivel</Text>
                </View>
              </View>

              {adaptedProperty?.notes ? (
                <View style={[styles.unitGridCardWide, styles.unitNotesCard]}>
                  <Text style={styles.unitGridLabel}>Notas</Text>
                  <Text style={styles.unitNotesText}>{adaptedProperty.notes}</Text>
                </View>
              ) : null}
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
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 6,
  },
  heroImage: {
    height: 232,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroImageBg: {
    width: '100%',
    height: '100%',
  },
  heroCounter: {
    position: 'absolute',
    right: SPACING.md,
    bottom: SPACING.md,
    backgroundColor: 'rgba(15,23,42,0.7)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  heroCounterText: {
    color: COLORS.surface,
    fontSize: 12,
    fontWeight: '700',
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
  galleryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  galleryTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.2,
  },
  galleryUnitBadge: {
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    backgroundColor: COLORS.goldLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    marginLeft: SPACING.sm,
  },
  galleryUnitBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gold,
  },
  thumbnails: {
    marginTop: SPACING.sm,
  },
  thumbnail: {
    width: 70,
    height: 54,
    borderRadius: RADIUS.md,
    marginRight: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailTone: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailActive: {
    borderColor: COLORS.gold,
    transform: [{ scale: 1.04 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  pressed: {
    opacity: 0.85,
  },
  paymentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(203,213,225,0.7)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
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
    paddingVertical: 6,
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
    paddingVertical: 6,
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
    fontSize: 23,
    fontWeight: '800',
    color: COLORS.gold,
    letterSpacing: 0.3,
  },
  paymentAmountRed: {
    fontSize: 23,
    fontWeight: '800',
    color: COLORS.danger,
    textAlign: 'right',
    letterSpacing: 0.3,
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
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '700',
  },
  progressCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(203,213,225,0.7)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  moduleTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.1,
  },
  progressPercent: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.gold,
    letterSpacing: 0.3,
  },
  progressTrack: {
    height: 9,
    borderRadius: RADIUS.pill,
    backgroundColor: '#E8EDF3',
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
    paddingVertical: 9,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 2,
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(203,213,225,0.9)',
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
    letterSpacing: 0.1,
  },
  quickRow: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    marginHorizontal: 3,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(203,213,225,0.6)',
  },
  quickIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  quickCardPressed: {
    backgroundColor: '#E2E8F0',
    transform: [{ scale: 0.98 }],
  },
  quickLabel: {
    marginTop: SPACING.sm,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  unitCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: SPACING.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(203,213,225,0.7)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  unitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unitGrid: {
    marginTop: SPACING.md,
  },
  unitRow: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  unitGridCard: {
    flex: 1,
    backgroundColor: '#F0F2F5',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(203,213,225,0.8)',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  unitGridCardWide: {
    flex: 1,
    backgroundColor: '#F0F2F5',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(203,213,225,0.8)',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  unitGridIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitGridValue: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  unitGridLabel: {
    marginTop: 2,
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  unitNotesCard: {
    marginHorizontal: 3,
    alignItems: 'flex-start',
  },
  unitNotesText: {
    marginTop: 4,
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 19,
    textAlign: 'left',
  },
});