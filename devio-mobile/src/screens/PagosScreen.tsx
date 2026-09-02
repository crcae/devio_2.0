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
import { ChevronDown, ChevronUp, Download, FileDown, FileText, X } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import { useApp } from '../context/AppContext';
import type { FinancialSummary, Payment, PaymentStatus } from '../types';
import { calculateOverdueBalance, calculatePaidPercentage, calculatePendingBalance, calculateSalePrice, calculateTotalPaid } from '../services/bubbleAdapter';
import { MOCK_PAYMENT_CONCEPTS } from '../services/mockData';
import type { RootStackParamList } from '../navigation/types';
import AppHeader from '../components/AppHeader';
import EmptyState from '../components/EmptyState';
import { SkeletonBlock, SkeletonCard } from '../components/SkeletonCard';

type Props = NativeStackScreenProps<RootStackParamList, 'Pagos'>;

type Tab = 'estado' | 'pagos';

const STATUS_STYLE: Record<PaymentStatus, { bg: string; fg: string; label: string }> = {
  Pagado: { bg: '#E7F8EE', fg: COLORS.success, label: 'Pagado' },
  Parcial: { bg: '#FEF3E2', fg: COLORS.warning, label: 'Parcial' },
  Pendiente: { bg: '#EDF2F7', fg: COLORS.primary, label: 'Pendiente' },
};

interface InstallmentRow {
  id: string;
  unit: string;
  amount: number;
  interest: number;
  status: PaymentStatus;
  paid: number;
  pending: number;
  concept: string;
}

interface ExecutedPayment {
  id: string;
  date: string;
  method: string;
  amount: number;
}

function formatMXN(amount: number): string {
  return `$${amount.toLocaleString('en-US')}`;
}

function formatShortDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${d} ${months[Number(m) - 1]} ${String(y).slice(2)}`;
}

export default function PagosScreen({ navigation }: Props) {
  const { selectedProperty, payments, executedPayments: contextExecutedPayments, loadPayments, dataLoading, isDemoMode } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>('estado');
  const [refreshing, setRefreshing] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [statementModalOpen, setStatementModalOpen] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState<ExecutedPayment | null>(null);

  const unitId = selectedProperty?._id ?? '';
  const showOverlay = dataLoading && payments.length === 0;
  const unitPrefix = selectedProperty?.unitCode ? selectedProperty.unitCode.replace(/^S-/, '') : '1A';

  useEffect(() => {
    if (unitId) {
      loadPayments(unitId);
    }
  }, [unitId, loadPayments]);

  const summary: FinancialSummary = useMemo(() => {
    if (payments.length === 0) {
      if (!isDemoMode) {
        return { totalPrice: 0, totalPaid: 0, pendingBalance: 0, overdueBalance: 0, paidPercentage: 0 };
      }
      return { totalPrice: 6000000, totalPaid: 300000, pendingBalance: 5700000, overdueBalance: 900000, paidPercentage: 5 };
    }
    const totalPrice = calculateSalePrice(payments);
    const totalPaid = calculateTotalPaid(payments);
    const pendingBalance = calculatePendingBalance(payments);
    const overdueBalance = calculateOverdueBalance(payments);
    return {
      totalPrice,
      totalPaid,
      pendingBalance,
      overdueBalance,
      paidPercentage: calculatePaidPercentage(payments),
    };
  }, [payments, isDemoMode]);

  const installments: InstallmentRow[] = useMemo(() => {
    if (payments.length === 0) {
      if (!isDemoMode) {
        return [];
      }
      return [
        { id: 'mock-i1', unit: '1A', amount: 1200000, interest: 0, status: 'Parcial', paid: 300000, pending: 900000, concept: 'Enganche' },
        { id: 'mock-i2', unit: '1A', amount: 1200000, interest: 0, status: 'Pendiente', paid: 0, pending: 1200000, concept: 'Pago 2' },
        { id: 'mock-i3', unit: '1A', amount: 1200000, interest: 0, status: 'Pagado', paid: 1200000, pending: 0, concept: 'Pago 1' },
      ];
    }
    return payments.map((payment) => ({
      id: payment._id,
      unit: unitPrefix,
      amount: payment.amount,
      interest: payment.interest,
      status: payment.status,
      paid: payment.paidAmount,
      pending: payment.pendingAmount,
      concept: MOCK_PAYMENT_CONCEPTS[payment._id] ?? 'Pago',
    }));
  }, [payments, unitPrefix, isDemoMode]);

  const executedPayments: ExecutedPayment[] = useMemo(() => {
    if (contextExecutedPayments.length > 0) {
      return contextExecutedPayments;
    }
    if (payments.length === 0) {
      if (!isDemoMode) {
        return [];
      }
      return [
        { id: 'mock-x1', date: '21 Ago 26', method: 'Transferencia', amount: 300000 },
        { id: 'mock-x2', date: '15 Mar 26', method: 'Transferencia', amount: 612500 },
      ];
    }
    return payments
      .filter((p) => p.status === 'Pagado')
      .map((p) => ({
        id: p._id,
        date: formatShortDate(p.dueDate),
        method: 'Transferencia',
        amount: p.paidAmount || p.amount,
      }));
  }, [contextExecutedPayments, payments, isDemoMode]);

  const isExpanded = (id: string) => expandedIds.has(id);
  const toggleExpanded = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  useEffect(() => {
    const ids = installments.filter((i) => i.status === 'Parcial').map((i) => i.id);
    if (ids.length > 0) {
      setExpandedIds(new Set(ids));
    }
  }, [installments]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (unitId) {
      await loadPayments(unitId);
    }
    setRefreshing(false);
  };

  const renderInstallment = ({ item }: { item: InstallmentRow }) => {
    const expanded = isExpanded(item.id);
    const status = STATUS_STYLE[item.status];
    const progressPct = item.amount > 0 ? Math.round((item.paid / item.amount) * 100) : 0;
    return (
      <View>
        <Pressable
          style={({ pressed }) => [styles.tableRow, pressed && styles.rowPressed]}
          onPress={() => toggleExpanded(item.id)}
        >
          <Text style={[styles.cell, styles.cellUnit]}>{item.unit}</Text>
          <Text style={[styles.cell, styles.cellAmount]}>{formatMXN(item.amount)}</Text>
          <Text style={[styles.cell, styles.cellInterest]}>{formatMXN(item.interest)}</Text>
          <View style={styles.cellStatus}>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.fg }]}>{status.label}</Text>
            </View>
            {expanded ? (
              <ChevronUp size={16} color={COLORS.textSecondary} />
            ) : (
              <ChevronDown size={16} color={COLORS.textSecondary} />
            )}
          </View>
        </Pressable>

        {expanded ? (
          <View style={styles.breakdown}>
            <View style={styles.breakdownCards}>
              <View style={styles.breakdownCard}>
                <Text style={styles.breakdownValue}>{formatMXN(item.amount)}</Text>
                <Text style={styles.breakdownLabel}>Total del Pago</Text>
              </View>
              <View style={styles.breakdownCard}>
                <Text style={[styles.breakdownValue, { color: COLORS.success }]}>
                  {formatMXN(item.paid)}
                </Text>
                <Text style={styles.breakdownLabel}>Ya pagado</Text>
              </View>
              <View style={styles.breakdownCard}>
                <Text style={[styles.breakdownValue, { color: COLORS.danger }]}>
                  {formatMXN(item.pending)}
                </Text>
                <Text style={styles.breakdownLabel}>Falta por pagar</Text>
              </View>
            </View>

            <View style={styles.breakdownProgressRow}>
              <View style={styles.breakdownTrack}>
                <View style={[styles.breakdownFill, { width: `${progressPct}%` }]} />
              </View>
              <Text style={styles.breakdownPercent}>{progressPct}%</Text>
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  const renderExecutedPayment = ({ item }: { item: ExecutedPayment }) => (
    <View style={styles.tableRow}>
      <Text style={[styles.cell, styles.cellUnit]}>{item.date}</Text>
      <Text style={[styles.cell, styles.cellAmount]}>{item.method}</Text>
      <Text style={[styles.cell, styles.cellInterest]}>{formatMXN(item.amount)}</Text>
      <View style={styles.cellStatus}>
        <Pressable
          style={({ pressed }) => [styles.receiptButton, pressed && styles.rowPressed]}
          onPress={() => setReceiptPayment(item)}
        >
          <Text style={styles.receiptButtonText}>Recibo</Text>
        </Pressable>
      </View>
    </View>
  );

  const tableHeader = activeTab === 'estado' ? (
    <View style={styles.tableHeader}>
      <Text style={[styles.cell, styles.cellUnit, styles.tableHeaderText]}>Unidad</Text>
      <Text style={[styles.cell, styles.cellAmount, styles.tableHeaderText]}>Cantidad</Text>
      <Text style={[styles.cell, styles.cellInterest, styles.tableHeaderText]}>Intereses</Text>
      <Text style={[styles.cell, styles.cellStatus, styles.tableHeaderText]}>Estatus</Text>
    </View>
  ) : (
    <View style={styles.tableHeader}>
      <Text style={[styles.cell, styles.cellUnit, styles.tableHeaderText]}>Fecha pago</Text>
      <Text style={[styles.cell, styles.cellAmount, styles.tableHeaderText]}>Metodo pago</Text>
      <Text style={[styles.cell, styles.cellInterest, styles.tableHeaderText]}>Monto</Text>
      <Text style={[styles.cell, styles.cellStatus, styles.tableHeaderText]}>Archivos</Text>
    </View>
  );

  const header = (
    <View>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Resumen Financiero</Text>

        <View style={styles.metricsGrid}>
          <View style={styles.metric}>
            <Text style={[styles.metricValue, { color: COLORS.success }]}>
              {formatMXN(summary.totalPaid)}
            </Text>
            <Text style={styles.metricLabel}>Total Pagado</Text>
          </View>
          <View style={styles.metric}>
            <Text style={[styles.metricValue, { color: COLORS.danger }]}>
              {formatMXN(summary.overdueBalance)}
            </Text>
            <Text style={styles.metricLabel}>Saldo Vencido</Text>
          </View>
          <View style={styles.metric}>
            <Text style={[styles.metricValue, { color: COLORS.textPrimary }]}>
              {formatMXN(summary.pendingBalance)}
            </Text>
            <Text style={styles.metricLabel}>Saldo Pendiente</Text>
          </View>
          <View style={styles.metric}>
            <Text style={[styles.metricValue, { color: COLORS.textPrimary }]}>
              {summary.paidPercentage}%
            </Text>
            <Text style={styles.metricLabel}>% Pagado</Text>
          </View>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.downloadButton, pressed && styles.rowPressed]}
        onPress={() => setStatementModalOpen(true)}
      >
        <Download size={16} color={COLORS.surface} strokeWidth={2.2} />
        <Text style={styles.downloadButtonText}>Descargar Estado de Cuenta</Text>
      </Pressable>

      <View style={styles.segmented}>
        <Pressable
          style={[styles.segment, activeTab === 'estado' && styles.segmentActive]}
          onPress={() => setActiveTab('estado')}
        >
          <Text style={[styles.segmentText, activeTab === 'estado' && styles.segmentTextActive]}>
            Estado de Cuenta
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segment, activeTab === 'pagos' && styles.segmentActive]}
          onPress={() => setActiveTab('pagos')}
        >
          <Text style={[styles.segmentText, activeTab === 'pagos' && styles.segmentTextActive]}>
            Pagos
          </Text>
        </Pressable>
      </View>

      {tableHeader}
    </View>
  );

  const listData = activeTab === 'estado' ? installments : executedPayments;
  const keyExtractor = (item: InstallmentRow | ExecutedPayment) => item.id;
  const renderItem = ({ item }: { item: InstallmentRow | ExecutedPayment }) =>
    activeTab === 'estado' ? renderInstallment({ item: item as InstallmentRow }) : renderExecutedPayment({ item: item as ExecutedPayment });

  return (
    <View style={styles.container}>
      <AppHeader title="Pagos" onBack={() => navigation.goBack()} />

      {showOverlay ? (
        <View style={styles.list}>
          <SkeletonCard>
            <SkeletonBlock width="60%" height={18} />
            <View style={{ height: 12 }} />
            <SkeletonBlock width="100%" height={90} borderRadius={12} />
          </SkeletonCard>
          <SkeletonCard>
            <SkeletonBlock width="100%" height={44} borderRadius={20} />
          </SkeletonCard>
          <SkeletonCard>
            <SkeletonBlock width="100%" height={40} />
          </SkeletonCard>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
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
            <EmptyState
              icon={FileText}
              title="No hay registros en esta categoría"
              description="Cambia de pestaña o vuelve a intentarlo más tarde."
            />
          }
        />
      )}

      <Modal
        visible={statementModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setStatementModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Estado de Cuenta</Text>
              <Pressable
                style={styles.modalClose}
                onPress={() => setStatementModalOpen(false)}
                accessibilityLabel="Cerrar"
              >
                <X size={22} color={COLORS.textPrimary} />
              </Pressable>
            </View>

            <View style={styles.pdfPreview}>
              <FileText size={56} color={COLORS.danger} strokeWidth={1.4} />
              <Text style={styles.pdfPreviewText}>Vista previa PDF</Text>
              <Text style={styles.pdfPreviewMeta}>Estado_de_Cuenta_{unitPrefix}.pdf</Text>
            </View>

            <View style={styles.statementRows}>
              <View style={styles.statementRow}>
                <Text style={styles.statementLabel}>Total Pagado</Text>
                <Text style={styles.statementValue}>{formatMXN(summary.totalPaid)}</Text>
              </View>
              <View style={styles.statementRow}>
                <Text style={styles.statementLabel}>Saldo Pendiente</Text>
                <Text style={styles.statementValue}>{formatMXN(summary.pendingBalance)}</Text>
              </View>
              <View style={styles.statementRow}>
                <Text style={styles.statementLabel}>% Pagado</Text>
                <Text style={styles.statementValue}>{summary.paidPercentage}%</Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [styles.downloadButton, pressed && styles.rowPressed]}
              onPress={() => Alert.alert('Descarga', 'El Estado de Cuenta PDF se descargará en breve.')}
            >
              <FileDown size={16} color={COLORS.surface} strokeWidth={2.2} />
              <Text style={styles.downloadButtonText}>Descargar PDF</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={receiptPayment !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setReceiptPayment(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comprobante de Pago</Text>
              <Pressable
                style={styles.modalClose}
                onPress={() => setReceiptPayment(null)}
                accessibilityLabel="Cerrar"
              >
                <X size={22} color={COLORS.textPrimary} />
              </Pressable>
            </View>

            {receiptPayment ? (
              <>
                <View style={styles.pdfPreview}>
                  <FileText size={56} color={COLORS.danger} strokeWidth={1.4} />
                  <Text style={styles.pdfPreviewText}>Recibo de pago</Text>
                </View>

                <View style={styles.statementRows}>
                  <View style={styles.statementRow}>
                    <Text style={styles.statementLabel}>ID Transacción</Text>
                    <Text style={styles.statementValue}>DEV-{receiptPayment.id.replace(/[^0-9]/g, '').padStart(6, '0')}</Text>
                  </View>
                  <View style={styles.statementRow}>
                    <Text style={styles.statementLabel}>Método de pago</Text>
                    <Text style={styles.statementValue}>{receiptPayment.method}</Text>
                  </View>
                  <View style={styles.statementRow}>
                    <Text style={styles.statementLabel}>Fecha</Text>
                    <Text style={styles.statementValue}>{receiptPayment.date}</Text>
                  </View>
                  <View style={styles.statementRow}>
                    <Text style={styles.statementLabel}>Monto</Text>
                    <Text style={styles.statementValue}>{formatMXN(receiptPayment.amount)}</Text>
                  </View>
                </View>

                <Pressable
                  style={({ pressed }) => [styles.downloadButton, pressed && styles.rowPressed]}
                  onPress={() => Alert.alert('Descarga', 'El comprobante PDF se descargará en breve.')}
                >
                  <FileDown size={16} color={COLORS.surface} strokeWidth={2.2} />
                  <Text style={styles.downloadButtonText}>Descargar Comprobante PDF</Text>
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
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metric: {
    width: '50%',
    paddingVertical: SPACING.sm,
  },
  metricValue: {
    fontSize: 19,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    marginBottom: SPACING.md,
  },
  downloadButtonText: {
    marginLeft: 8,
    color: COLORS.surface,
    fontSize: 15,
    fontWeight: '700',
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    padding: 4,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  segment: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: COLORS.primary,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  segmentTextActive: {
    color: COLORS.surface,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    marginBottom: 2,
  },
  tableHeaderText: {
    fontWeight: '700',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  rowPressed: {
    opacity: 0.85,
  },
  cell: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  cellUnit: {
    flex: 1,
  },
  cellAmount: {
    flex: 1.4,
    fontWeight: '600',
  },
  cellInterest: {
    flex: 1,
  },
  cellStatus: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  breakdown: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    marginTop: -SPACING.sm + 2,
  },
  breakdownCards: {
    flexDirection: 'row',
  },
  breakdownCard: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.sm,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  breakdownLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  breakdownProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  breakdownTrack: {
    flex: 1,
    height: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  breakdownFill: {
    height: '100%',
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.gold,
  },
  breakdownPercent: {
    marginLeft: SPACING.sm,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gold,
  },
  receiptButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  receiptButtonText: {
    color: COLORS.surface,
    fontSize: 11,
    fontWeight: '700',
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
  modalTitle: {
    fontSize: 18,
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
  pdfPreview: {
    height: 150,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  pdfPreviewText: {
    marginTop: SPACING.sm,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  pdfPreviewMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statementRows: {
    marginBottom: SPACING.md,
  },
  statementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  statementLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statementValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});