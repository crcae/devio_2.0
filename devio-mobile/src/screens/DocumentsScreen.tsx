import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Download, Eye, FileText, Search, X } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import { useApp } from '../context/AppContext';
import type { Document } from '../types';
import type { RootStackParamList } from '../navigation/types';
import AppHeader from '../components/AppHeader';
import { SkeletonBlock, SkeletonCard } from '../components/SkeletonCard';

type Props = NativeStackScreenProps<RootStackParamList, 'Documents'>;

type DocumentItem = Document & { size?: string };

const FILTERS = ['Todos', 'Contratos', 'Recibos', 'Planos'] as const;
type Filter = (typeof FILTERS)[number];

function formatDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${d} ${months[Number(m) - 1]} ${y}`;
}

export default function DocumentsScreen({ navigation }: Props) {
  const { selectedProperty, documents, loadDocuments, dataLoading } = useApp();
  const [filter, setFilter] = useState<Filter>('Todos');
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeDoc, setActiveDoc] = useState<DocumentItem | null>(null);

  const unitId = selectedProperty?._id ?? '';
  const showOverlay = dataLoading && documents.length === 0;

  useEffect(() => {
    if (unitId) {
      loadDocuments(unitId);
    }
  }, [unitId, loadDocuments]);

  const filtered: DocumentItem[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents.filter((doc) => {
      const matchesFilter = filter === 'Todos' || doc.category === filter;
      const matchesQuery = q.length === 0 || doc.title.toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [filter, query, documents]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (unitId) {
      await loadDocuments(unitId);
    }
    setRefreshing(false);
  };

  const handleAction = (doc: DocumentItem) => {
    setActiveDoc(doc);
  };

  const handleDownload = (doc: DocumentItem) => {
    Alert.alert('Descarga', `Descargando "${doc.title}".`);
  };

  const renderDocument = ({ item }: { item: DocumentItem }) => (
    <View style={styles.docCard}>
      <View style={styles.pdfIcon}>
        <FileText size={22} color="#FFFFFF" strokeWidth={2} />
      </View>
      <View style={styles.docInfo}>
        <Text style={styles.docTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.docMeta}>
          {item.category} · {formatDate(item.createdDate)}
        </Text>
        {item.size ? <Text style={styles.docSize}>{item.size}</Text> : null}
      </View>
      <Pressable
        style={({ pressed }) => [styles.viewButton, pressed && styles.viewPressed]}
        onPress={() => handleAction(item)}
      >
        <Download size={14} color={COLORS.surface} strokeWidth={2.4} />
        <Text style={styles.viewText}>Ver / Descargar</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <AppHeader title="Expediente Digital" onBack={() => navigation.goBack()} />

      <View style={styles.searchArea}>
        <View style={styles.searchBox}>
          <Search size={18} color={COLORS.textSecondary} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar documento..."
            placeholderTextColor={COLORS.textSecondary}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
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

      {showOverlay ? (
        <View style={styles.list}>
          {[0, 1, 2].map((key) => (
            <SkeletonCard key={key}>
              <View style={styles.skeletonRow}>
                <SkeletonBlock width={44} height={44} borderRadius={12} />
                <View style={styles.skeletonCol}>
                  <SkeletonBlock width="80%" height={14} />
                  <View style={{ height: 8 }} />
                  <SkeletonBlock width="55%" height={12} />
                </View>
              </View>
            </SkeletonCard>
          ))}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={renderDocument}
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
              <Text style={styles.emptyText}>No se encontraron documentos.</Text>
            </View>
          }
        />
      )}

      <Modal
        visible={activeDoc !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveDoc(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Vista previa del documento</Text>
              <Pressable
                style={styles.modalClose}
                onPress={() => setActiveDoc(null)}
                accessibilityLabel="Cerrar"
              >
                <X size={22} color={COLORS.textPrimary} />
              </Pressable>
            </View>

            {activeDoc ? (
              <>
                <View style={styles.previewArea}>
                  <FileText size={64} color={COLORS.danger} strokeWidth={1.4} />
                  <Text style={styles.previewHint}>Vista previa PDF</Text>
                </View>

                <Text style={styles.docModalTitle}>{activeDoc.title}</Text>
                <View style={styles.docMetaRow}>
                  <Text style={styles.docMetaLabel}>Categoría</Text>
                  <Text style={styles.docMetaValue}>{activeDoc.category}</Text>
                </View>
                <View style={styles.docMetaRow}>
                  <Text style={styles.docMetaLabel}>Fecha</Text>
                  <Text style={styles.docMetaValue}>{formatDate(activeDoc.createdDate)}</Text>
                </View>
                <View style={styles.docMetaRow}>
                  <Text style={styles.docMetaLabel}>Tamaño</Text>
                  <Text style={styles.docMetaValue}>{activeDoc.size ?? 'N/D'}</Text>
                </View>

                <Pressable
                  style={({ pressed }) => [styles.modalButton, pressed && styles.modalButtonPressed]}
                  onPress={() => handleDownload(activeDoc)}
                >
                  <Eye size={16} color={COLORS.surface} strokeWidth={2.2} />
                  <Text style={styles.modalButtonText}>Ver documento completo</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.modalButton,
                    styles.modalButtonSecondary,
                    pressed && styles.modalButtonPressed,
                  ]}
                  onPress={() => handleDownload(activeDoc)}
                >
                  <Download size={16} color={COLORS.primary} strokeWidth={2.2} />
                  <Text style={styles.modalButtonSecondaryText}>Descargar PDF</Text>
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
  searchArea: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  filters: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
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
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.surface,
  },
  list: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonCol: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  pdfIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  docTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  docMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  docSize: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gold,
    marginTop: 2,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    marginLeft: SPACING.sm,
  },
  viewPressed: {
    opacity: 0.85,
  },
  viewText: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.surface,
  },
  empty: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
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
  previewArea: {
    height: 160,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  previewHint: {
    marginTop: SPACING.sm,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  docModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  docMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  docMetaLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  docMetaValue: {
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
    marginTop: SPACING.md,
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
  modalButtonSecondary: {
    backgroundColor: COLORS.goldLight,
    marginTop: SPACING.sm,
  },
  modalButtonSecondaryText: {
    marginLeft: 6,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
});