import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Download, FileCheck2, FileDown, Wallet, X } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import { useApp } from '../context/AppContext';
import type { FinancialSummary, Payment, PaymentStatus } from '../types';
import { MOCK_PAYMENT_CONCEPTS } from '../services/mockData';
import type { RootStackParamList } from '../navigation/types';
import AppHeader from '../components/AppHeader';
import { SkeletonBlock, SkeletonCard } from '../components/SkeletonCard';

type Props = NativeStackScreenProps<RootStackParamList, 'Pagos'>;

const STATUS_STYLE: Record<PaymentStatus, { bg: string; fg: string; label: string }> = {
  Pagado: { bg: '#E7F8EE', fg: COLORS.success, label: 'Pagado' },
  Parcial: { bg: '#FEF3E2', fg: COLORS.warning, label: 'Parcial' },
  Pendiente: { bg: '#FDEBEB', fg: COLORS.danger, label: 'Pendiente' },
};

const FILTERS = ['Todos', 'Pagados', 'Pendientes'] as const;
type Filter = (typeof FILTERS)[number];

function formatMXN(amount: number): string {
  return `$${amount.toLocaleString('en-US')} MXN`;
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${d} ${months[Number(m) - 1]} ${y}`;
}

export default function PagosScreen({ navigation }: Props) {
  const { selectedProperty, payments, loadPayments, dataLoading } = useApp();
  const [filter, setFilter] = useState<Filter>('Todos');
  const [refreshing, setRefreshing] = useState(false);
  const [activePayment, setActivePayment] = useState<Payment | null>(null);

  const unitId = selectedProperty?._id ?? '';
  const showOverlay = dataLoading && payments.length === 0;

  useEffect(() => {
    if (unitId) {
      loadPayments(unitId);
    }
  }, [unitId, loadPayments]);

  const summary: FinancialSummary = useMemo(() => {
    if (payments.length === 0) {
      return { totalPrice: 0, totalPaid: 0, pendingBalance: 0, overdueBalance: 0, paidPercentage: 0 };
    }
    const totalPrice = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalPaid = payments.reduce((sum, p) => sum + p.paidAmount, 0);
    const pendingBalance = payments.reduce((sum, p) => sum + p.pendingAmount, 0);
    const overdueBalance = payments
      .filter((p) => p.status !== 'Pagado' && p.dueDate < '2026-09-01')
      .reduce((sum, p) => sum + p.pendingAmount, 0);
    return {
      totalPrice,
      totalPaid,
      pendingBalance,
      overdueBalance,
      paidPercentage: totalPrice > 0 ? Math.round((totalPaid / totalPrice) * 100) : 0,
    };
  }, [payments]);

  const filtered = useMemo(() => {
    if (filter === 'Todos') return payments;
    if (filter === 'Pagados') return payments.filter((p) => p.status === 'Pagado');
    return payments.filter((p) => p.status !== 'Pagado');
  }, [filter, payments]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (unitId) {
      await loadPayments(unitId);
    }
    setRefreshing(false);
  };

  const handleAction = (payment: Payment, concept: string) => {
    setActivePayment({ ...payment });
    void concept;
  };

  const handleDownloadReceipt = (payment: Payment) => {
    const concept = MOCK_PAYMENT_CONCEPTS[payment._id] ?? 'Pago';
    Alert.alert(
      'Descargar Comprobante',
      `Generando PDF del comprobante de "${concept}" (${formatMXN(payment.amount)}).`,
    );
  };

  const detailConcept = activePayment
    ? MOCK_PAYMENT_CONCEPTS[activePayment._id] ?? 'Pago'
    : '';

  const renderPayment = ({ item, index }: { item: Payment; index: number }) => {
    const status = STATUS_STYLE[item.status];
    const concept = MOCK_PAYMENT_CONCEPTS[item._id] ?? `Pago ${index + 1}`;
    return (
      <Pressable
        style={({ pressed }) => [styles.paymentCard, pressed && styles.paymentCardPressed]}
        onPress={() => handleAction(item, concept)}
      >
        <View style={styles.paymentHeader}>
          <Text style={styles.paymentConcept}>{concept}</Text>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.fg }]}>{status.label}</Text>
          </View>
        </View>
        <View style={styles.paymentMeta}>
          <Text style={styles.paymentDate}>Vence: {formatDate(item.dueDate)}</Text>
          <Text style={styles.paymentAmount}>{formatMXN(item.amount)}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}
          onPress={() => handleAction(item, concept)}
        >
          {item.status === 'Pagado' ? (
            <FileCheck2 size={15} color={COLORS.surface} strokeWidth={2.2} />
          ) : (
            <Download size={15} color={COLORS.surface} strokeWidth={2.2} />
          )}
          <Text style={styles.actionText}>
            {item.status === 'Pagado' ? 'Ver Comprobante' : 'Descargar Recibo'}
          </Text>
        </Pressable>
      </Pressable>
    );
  };

  const header = (
    <View>
      <View style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <View style={styles.summaryIcon}>
            <Wallet size={22} color={COLORS.gold} strokeWidth={2} />
          </View>
          <View style={styles.summaryText}>
            <Text style={styles.summaryCaption}>Precio total</Text>
            <Text style={styles.summaryTotal}>
              {summary.totalPrice > 0 ? formatMXN(summary.totalPrice) : '$0 MXN'}
            </Text>
            <Text style={styles.summaryUnit}>
              {selectedProperty?.name ?? 'Solea Residencial | 1A'}
            </Text>
          </View>
        </View>

        <View style={styles.splitRow}>
          <View style={styles.splitItem}>
            <Text style={styles.splitValue}>{formatMXN(summary.totalPaid)}</Text>
            <Text style={styles.splitLabel}>Pagado</Text>
          </View>
          <View style={styles.splitDivider} />
          <View style={styles.splitItem}>
            <Text style={styles.splitValue}>{formatMXN(summary.pendingBalance)}</Text>
            <Text style={styles.splitLabel}>Pendiente</Text>
          </View>
        </View>

        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${summary.paidPercentage}%` }]} />
        </View>
        <Text style={styles.barLabel}>{summary.paidPercentage}% Pagado</Text>
      </View>

      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const isActive = filter === f;
          return (
            <Pressable
              key={f}
              style={[styles.filterTab, isActive && styles.filterTabActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{f}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <AppHeader title="Estado de Cuenta" onBack={() => navigation.goBack()} />

      {showOverlay ? (
        <View style={styles.list}>
          <SkeletonCard>
            <SkeletonBlock width="100%" height={120} borderRadius={12} />
          </SkeletonCard>
          <SkeletonCard>
            <SkeletonBlock width="60%" height={16} />
            <View style={{ height: 10 }} />
            <SkeletonBlock width="40%" height={16} />
            <View style={{ height: 10 }} />
            <SkeletonBlock width="100%" height={40} borderRadius={20} />
          </SkeletonCard>
          <SkeletonCard>
            <SkeletonBlock width="60%" height={16} />
            <View style={{ height: 10 }} />
            <SkeletonBlock width="40%" height={16} />
            <View style={{ height: 10 }} />
            <SkeletonBlock width="100%" height={40} borderRadius={20} />
          </SkeletonCard>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={renderPayment}
          ListHeaderComponent={header}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No hay pagos registrados.</Text>
            </View>
          }
        />
      )}

      <Modal
        visible={activePayment !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setActivePayment(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Detalle de pago</Text>
              <Pressable
                style={styles.modalClose}
                onPress={() => setActivePayment(null)}
                accessibilityLabel="Cerrar"
              >
                <X size={22} color={COLORS.textPrimary} />
              </Pressable>
            </View>

            {activePayment ? (
              <>
                <Text style={styles.detailConcept}>{detailConcept}</Text>
                {(() => {
                  const st = STATUS_STYLE[activePayment.status];
                  return (
                    <View style={[styles.detailBadge, { backgroundColor: st.bg }]}>
                      <Text style={[styles.detailBadgeText, { color: st.fg }]}>{st.label}</Text>
                    </View>
                  );
                })()}

                <View style={styles.detailAmountRow}>
                  <Text style={styles.detailAmount}>{formatMXN(activePayment.amount)}</Text>
                  <Text style={styles.detailAmountCaption}>Monto total</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Monto base</Text>
                  <Text style={styles.detailValue}>{formatMXN(activePayment.amount)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Intereses</Text>
                  <Text style={styles.detailValue}>{formatMXN(activePayment.interest)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Fecha límite</Text>
                  <Text style={styles.detailValue}>{formatDate(activePayment.dueDate)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Monto pagado</Text>
                  <Text style={styles.detailValue}>{formatMXN(activePayment.paidAmount)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Monto pendiente</Text>
                  <Text style={styles.detailValue}>{formatMXN(activePayment.pendingAmount)}</Text>
                </View>

                <Pressable
                  style={({ pressed }) => [styles.modalButton, pressed && styles.modalButtonPressed]}
                  onPress={() => handleDownloadReceipt(activePayment)}
                >
                  <FileDown size={16} color={COLORS.surface} strokeWidth={2.2} />
                  <Text style={styles.modalButtonText}>Descargar Comprobante PDF</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  list: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  summaryCard: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(200,158,106,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  summaryCaption: {
    fontSize: 12,
    color: COLORS.goldLight,
  },
  summaryTotal: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.surface,
    marginTop: 2,
  },
  summaryUnit: {
    fontSize: 12,
    color: '#B8C4D4',
    marginTop: 2,
  },
  splitRow: {
    flexDirection: 'row',
    marginTop: SPACING.lg,
  },
  splitItem: {
    flex: 1,
  },
  splitDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: SPACING.md,
  },
  splitValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.surface,
  },
  splitLabel: {
    fontSize: 12,
    color: '#B8C4D4',
    marginTop: 2,
  },
  barTrack: {
    height: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginTop: SPACING.lg,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.gold,
  },
  barLabel: {
    marginTop: SPACING.sm,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gold,
    textAlign: 'right',
  },
  filters: {
    flexDirection: 'row',
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  filterTab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: 3,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.surface,
  },
  paymentCard: {
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
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentConcept: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  paymentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  paymentDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  paymentAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
  },
  actionPressed: {
    opacity: 0.85,
  },
  actionText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.surface,
  },
  empty: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  paymentCardPressed: {
    opacity: 0.9,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(31,54,82,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailConcept: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  detailBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  detailBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  detailAmountRow: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  detailAmount: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.primary,
  },
  detailAmountCaption: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
    marginTop: SPACING.lg,
  },
  modalButtonPressed: {
    opacity: 0.85,
  },
  modalButtonText: {
    marginLeft: 6,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.surface,
  },
});