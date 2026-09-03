import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { ChevronLeft, Download, FileText, Search, X } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import { useApp } from '../context/AppContext';
import type { Document } from '../types';
import type { RootStackParamList } from '../navigation/types';
import EmptyState from '../components/EmptyState';
import { SkeletonBlock, SkeletonCard } from '../components/SkeletonCard';

type Props = NativeStackScreenProps<RootStackParamList, 'Documents'>;

type DocumentItem = Document & { size?: string };

function formatDateTime(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    const fallback = new Date(`${iso}T00:00:00`);
    if (!Number.isNaN(fallback.getTime())) {
      const esMonths = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      return `${fallback.getDate()} ${esMonths[fallback.getMonth()]} ${fallback.getFullYear()}`;
    }
    return iso;
  }
  const esMonths = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${date.getDate()} ${esMonths[date.getMonth()]} ${date.getFullYear()}`;
}

export default function DocumentsScreen({ navigation }: Props) {
  const { selectedProperty, documents, loadDocuments, dataLoading } = useApp();
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeDoc, setActiveDoc] = useState<DocumentItem | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const unitId = selectedProperty?._id ?? '';
  const showOverlay = dataLoading && documents.length === 0;

  useEffect(() => {
    if (unitId) {
      loadDocuments(unitId);
    }
  }, [unitId, loadDocuments]);

  const filtered: DocumentItem[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) {
      return documents;
    }
    return documents.filter((doc) => doc.title.toLowerCase().includes(q));
  }, [query, documents]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (unitId) {
      await loadDocuments(unitId);
    }
    setRefreshing(false);
  };

  const handleDownload = async (doc: DocumentItem) => {
    const fileUrl = doc.fileUrl;
    if (!fileUrl) {
      Alert.alert('Descarga', 'Este documento no tiene archivo disponible.');
      return;
    }
    const cleanUrl = fileUrl.startsWith('//') ? `https:${fileUrl}` : fileUrl;
    const fileName = doc.title.includes('.') ? doc.title : `${doc.title}.pdf`;
    // Unique timestamped name avoids DestinationAlreadyExistsException on repeat downloads.
    const safeName = `${Date.now()}_${fileName}`;
    setDownloadingId(doc._id);
    try {
      const localFile = await File.downloadFileAsync(cleanUrl, new File(Paths.document, safeName));
      if (!localFile?.uri) {
        throw new Error('No se pudo guardar el archivo.');
      }
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Compartir', 'La compartición de archivos no está disponible en este dispositivo.');
        return;
      }
      await Sharing.shareAsync(localFile.uri);
    } catch (error) {
      Alert.alert(
        'Error al descargar',
        error instanceof Error ? error.message : 'No fue posible descargar el documento.',
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const renderDocument = ({ item }: { item: DocumentItem }) => (
    <Pressable
      style={({ pressed }) => [styles.docCard, pressed && styles.pressed]}
      onPress={() => setActiveDoc(item)}
    >
      <View style={styles.iconChip}>
        <FileText size={22} color={COLORS.primary} strokeWidth={2} />
      </View>
      <View style={styles.docInfo}>
        <Text style={styles.docTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.docDate}>{formatDateTime(item.createdDate)}</Text>
      </View>
      {item.size ? <Text style={styles.docSize}>{item.size}</Text> : null}
      <Pressable
        style={({ pressed }) => [styles.rowDownload, pressed && styles.pressed]}
        onPress={() => handleDownload(item)}
        disabled={downloadingId === item._id}
        accessibilityLabel={`Descargar ${item.title}`}
        hitSlop={8}
      >
        {downloadingId === item._id ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : (
          <Download size={18} color={COLORS.primary} strokeWidth={2.2} />
        )}
      </Pressable>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.topBar}>
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Regresar"
          >
            <ChevronLeft size={22} color={COLORS.primary} />
          </Pressable>
          <Text style={styles.topBarTitle}>Documentos</Text>
        </View>
      </SafeAreaView>

      <View style={styles.searchArea}>
        <View style={[styles.searchBox, searchFocused && styles.searchBoxFocused]}>
          <Search size={18} color={searchFocused ? COLORS.gold : '#94A3B8'} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar Documentos"
            placeholderTextColor={COLORS.textSecondary}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            autoCorrect={false}
          />
          {query.length > 0 ? (
            <Pressable
              style={styles.searchClear}
              onPress={() => setQuery('')}
              accessibilityLabel="Limpiar búsqueda"
            >
              <X size={16} color={COLORS.textSecondary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {showOverlay ? (
        <View style={styles.list}>
          {[0, 1, 2].map((key) => (
            <SkeletonCard key={key}>
              <View style={styles.skeletonRow}>
                <SkeletonBlock width={48} height={48} borderRadius={12} />
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
            <EmptyState
              icon={FileText}
              title={documents.length === 0 ? 'Aún no tienes ningún documento.' : 'No se encontraron documentos'}
              description={
                documents.length === 0
                  ? 'Cuando se generen documentos para tu propiedad, aparecerán aquí.'
                  : 'Intenta con otro término de búsqueda'
              }
            />
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
              <Text style={styles.modalHeaderTitle}>Documento</Text>
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
                  <View style={styles.previewIconChip}>
                    <FileText size={40} color={COLORS.primary} strokeWidth={1.6} />
                  </View>
                  <Text style={styles.previewHint}>Vista previa PDF</Text>
                </View>

                <Text style={styles.docModalTitle}>{activeDoc.title}</Text>
                <View style={styles.docMetaRow}>
                  <Text style={styles.docMetaLabel}>Fecha</Text>
                  <Text style={styles.docMetaValue}>{formatDateTime(activeDoc.createdDate)}</Text>
                </View>
                <View style={styles.docMetaRow}>
                  <Text style={styles.docMetaLabel}>Tamaño</Text>
                  <Text style={styles.docMetaValue}>{activeDoc.size ?? 'N/D'}</Text>
                </View>

                <Pressable
                  style={({ pressed }) => [styles.modalButton, pressed && styles.modalButtonPressed]}
                  onPress={() => handleDownload(activeDoc)}
                  disabled={downloadingId === activeDoc._id}
                >
                  {downloadingId === activeDoc._id ? (
                    <ActivityIndicator color={COLORS.surface} />
                  ) : (
                    <Download size={16} color={COLORS.surface} strokeWidth={2.2} />
                  )}
                  <Text style={styles.modalButtonText}>
                    {downloadingId === activeDoc._id ? 'Descargando...' : 'Descargar PDF'}
                  </Text>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  topBarTitle: {
    marginLeft: SPACING.md,
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  pressed: {
    opacity: 0.85,
  },
  searchArea: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: SPACING.md,
    height: 52,
    borderWidth: 1.5,
    borderColor: 'transparent',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  searchBoxFocused: {
    borderColor: COLORS.gold,
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  searchClear: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
  },
  list: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
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
    borderRadius: 18,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(203,213,225,0.7)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  iconChip: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(203,213,225,0.9)',
  },
  docInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  docTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.1,
  },
  docDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  docSize: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gold,
    marginLeft: SPACING.sm,
    backgroundColor: COLORS.goldLight,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  rowDownload: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
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
    height: 170,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  previewIconChip: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.lg,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingVertical: 8,
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