import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import {
  Building2,
  Calendar,
  Camera,
  ChevronLeft,
  Grid3x3,
  PaintRoller,
  Wrench,
  X,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import { useApp } from '../context/AppContext';
import type { Progress } from '../types';
import type { RootStackParamList } from '../navigation/types';
import type { AdaptedProgressUpdate } from '../services/bubbleAdapter';
import { MOCK_PROGRESS_HISTORY } from '../services/mockData';
import { SkeletonBlock, SkeletonCard } from '../components/SkeletonCard';

type Props = NativeStackScreenProps<RootStackParamList, 'Progress'>;

interface SpecialtyRow {
  id: string;
  name: string;
  percentage: number;
  icon: typeof Wrench;
}

const SPECIALTY_DEFS = [
  { key: 'cimenta', name: 'Cimentación', icon: Wrench },
  { key: 'estruct', name: 'Estructura', icon: Building2 },
  { key: 'instal', name: 'Instalaciones', icon: Grid3x3 },
  { key: 'acabad', name: 'Acabados', icon: PaintRoller },
];

const MOCK_SPECIALTIES: SpecialtyRow[] = SPECIALTY_DEFS.map((def, index) => ({
  id: `mock-spec-${index}`,
  name: def.name,
  percentage: 0,
  icon: def.icon,
}));

function formatDeliveryDate(iso: string): string {
  if (!iso) return 'May 15, 2028';
  const [y, m, d] = iso.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[Number(m) - 1]} ${Number(d)}, ${y}`;
}

function ProgressRing({ percentage }: { percentage: number }) {
  const size = 92;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(Math.max(percentage, 0), 100) / 100);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={COLORS.gold}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={styles.ringPercent}>{percentage}%</Text>
      </View>
    </View>
  );
}

export default function ProgressScreen({ navigation }: Props) {
  const { selectedProperty, progress, progressHistory, loadProgress, dataLoading } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [activeUpdate, setActiveUpdate] = useState<AdaptedProgressUpdate | null>(null);
  const [lightboxPhotos, setLightboxPhotos] = useState<AdaptedProgressUpdate['photos'] | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const historyList = progressHistory.length > 0 ? progressHistory : MOCK_PROGRESS_HISTORY;

  const unitId = selectedProperty?._id ?? '';
  const showOverlay = dataLoading && progress.length === 0;

  useEffect(() => {
    if (unitId) {
      loadProgress(unitId);
    }
  }, [unitId, loadProgress]);

  const projectTitle = selectedProperty?.name ?? 'Castellana Residences';
  const unitLabel = selectedProperty
    ? `Unidad ${selectedProperty.unitCode.replace(/^S-/, '')}`
    : 'Unidad 1A';
  const deliveryDate = formatDeliveryDate(selectedProperty?.estimatedDeliveryDate ?? '');

  const specialties: SpecialtyRow[] = useMemo(() => {
    if (progress.length === 0) {
      return MOCK_SPECIALTIES;
    }
    const used = new Set<string>();
    return SPECIALTY_DEFS.map((def, index) => {
      const item = progress.find((p: Progress) => {
        const name = p.specialtyName.toLowerCase();
        return name.includes(def.key) && !used.has(p._id);
      });
      if (item) {
        used.add(item._id);
      }
      return {
        id: item?._id ?? `spec-${index}`,
        name: def.name,
        percentage: item?.percentage ?? 0,
        icon: def.icon,
      };
    });
  }, [progress]);

  const lastUpdate = useMemo(() => {
    if (progress.length === 0) return 'N/A';
    const latest = progress.reduce((acc, p) => (p.lastUpdate > acc ? p.lastUpdate : acc), '');
    return latest || 'N/A';
  }, [progress]);

  const overall = useMemo(() => {
    const fromProgress = progress.reduce((sum, p) => sum + (p.percentage ?? 0), 0) / Math.max(progress.length, 1);
    if (progress.length > 0 && fromProgress > 0) {
      return Math.round(fromProgress);
    }
    return selectedProperty?.generalProgress ?? 21;
  }, [progress, selectedProperty?.generalProgress]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (unitId) {
      await loadProgress(unitId);
    }
    setRefreshing(false);
  };

  const renderSpecialty = (row: SpecialtyRow) => (
    <View key={row.id} style={styles.specialtyRow}>
      <View style={styles.specialtyChip}>
        <row.icon size={16} color={COLORS.gold} strokeWidth={2} />
      </View>
      <Text style={styles.specialtyLabel}>{row.name}</Text>
      <View style={styles.specialtyTrack}>
        <View style={[styles.specialtyFill, { width: `${row.percentage}%` }]} />
      </View>
      <Text style={styles.specialtyPercent}>{row.percentage}%</Text>
    </View>
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
        </View>
      </SafeAreaView>

      {showOverlay ? (
        <View style={styles.content}>
          <SkeletonCard>
            <SkeletonBlock width="100%" height={130} borderRadius={12} />
          </SkeletonCard>
          <SkeletonCard>
            <SkeletonBlock width="100%" height={120} borderRadius={12} />
          </SkeletonCard>
          <SkeletonCard>
            <SkeletonBlock width="70%" height={16} />
            <View style={{ height: 10 }} />
            <SkeletonBlock width="100%" height={8} borderRadius={4} />
          </SkeletonCard>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        >
          <View style={styles.hero}>
            <View style={styles.heroThumb}>
              <Building2 size={40} color={COLORS.gold} strokeWidth={1.2} />
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.heroTitle} numberOfLines={2}>
                {projectTitle}
              </Text>
              <View style={styles.unitBadge}>
                <Text style={styles.unitBadgeText}>{unitLabel}</Text>
              </View>
            </View>
          </View>

          <View style={styles.kpiCard}>
            <View style={styles.kpiLeft}>
              <ProgressRing percentage={overall} />
              <Text style={styles.kpiLabel}>Avance General</Text>
            </View>
            <View style={styles.kpiDivider} />
            <View style={styles.kpiRight}>
              <View style={styles.kpiCalendarBadge}>
                <Calendar size={22} color={COLORS.gold} strokeWidth={2} />
              </View>
              <Text style={styles.kpiRightLabel}>Entrega estimada</Text>
              <Text style={styles.kpiRightValue}>{deliveryDate}</Text>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Avance por Especialidad</Text>
              <View style={styles.updateRow}>
                <View style={styles.greenDot} />
                <Text style={styles.updateText}>Última actualización {lastUpdate}</Text>
              </View>
            </View>
            {specialties.map(renderSpecialty)}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Histórico Avances de Obra</Text>
            {historyList.map((update) => (
              <Pressable
                key={update.id}
                style={({ pressed }) => [styles.historyCard, pressed && styles.pressed]}
                onPress={() => setActiveUpdate(update)}
              >
                <View style={styles.historyThumb}>
                  <Camera size={18} color={COLORS.gold} strokeWidth={1.8} />
                </View>
                <View style={styles.historyBody}>
                  <Text style={styles.historyTitle}>{update.title}</Text>
                  <Text style={styles.historyDate}>{update.date}</Text>
                </View>
                <Text style={styles.historyPercent}>{update.overall}%</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}

      <Modal
        visible={activeUpdate !== null}
        animationType="slide"
        onRequestClose={() => setActiveUpdate(null)}
      >
        <View style={styles.modalScreen}>
          <SafeAreaView edges={['top']}>
            <View style={styles.modalTopBar}>
              <View />
              <Pressable
                style={styles.modalClose}
                onPress={() => setActiveUpdate(null)}
                accessibilityLabel="Cerrar"
              >
                <X size={22} color={COLORS.textPrimary} />
              </Pressable>
            </View>
          </SafeAreaView>

          {activeUpdate ? (
            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.modalTitleBlock}>
                <View style={styles.modalCalendarBadge}>
                  <Calendar size={24} color={COLORS.gold} strokeWidth={2} />
                </View>
                <View style={styles.modalTitleText}>
                  <Text style={styles.modalSubtitle}>Avance de Obra</Text>
                  <Text style={styles.modalTitle}>{activeUpdate.title}</Text>
                  <Text style={styles.modalDate}>{activeUpdate.date}</Text>
                </View>
              </View>

              <Text style={styles.modalSectionTitle}>Fotos del Avance</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {activeUpdate.photos.map((photo, index) => (
                  <Pressable
                    key={photo.id}
                    style={styles.modalPhoto}
                    onPress={() => {
                      setLightboxPhotos(activeUpdate.photos);
                      setLightboxIndex(index);
                    }}
                  >
                    {photo.url ? (
                      <Image source={{ uri: photo.url }} style={styles.modalPhotoImage} resizeMode="cover" />
                    ) : (
                      <View
                        style={[
                          styles.modalPhotoTone,
                          { backgroundColor: photo.tone ?? COLORS.primary },
                        ]}
                      >
                        <Camera size={30} color={COLORS.gold} strokeWidth={1.6} />
                      </View>
                    )}
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.modalSectionTitle}>Resumen del avance por partida</Text>
              <View style={styles.modalSummaryHeader}>
                <Text style={styles.modalSummaryLabel}>Avance General</Text>
                <Text style={styles.modalSummaryValue}>{activeUpdate.overall}%</Text>
              </View>
              <View style={styles.updateRow}>
                <View style={styles.greenDot} />
                <Text style={styles.updateText}>Última actualización {activeUpdate.dateShort}</Text>
              </View>

              {activeUpdate.parts.map((part, index) => (
                <View key={part.id} style={styles.modalPartRow}>
                  <Text style={styles.modalPartIndex}>{index + 1}.</Text>
                  <Text style={styles.modalPartName}>{part.name}</Text>
                  <View style={styles.specialtyTrack}>
                    <View style={[styles.specialtyFill, { width: `${part.percentage}%` }]} />
                  </View>
                  <Text style={styles.specialtyPercent}>{part.percentage}%</Text>
                </View>
              ))}
            </ScrollView>
          ) : null}
        </View>
      </Modal>

      <Modal
        visible={lightboxPhotos !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxPhotos(null)}
      >
        <View style={styles.lightboxScreen}>
          <View style={styles.lightboxTopBar}>
            <Text style={styles.lightboxCount}>
              {lightboxPhotos ? `${lightboxIndex + 1} / ${lightboxPhotos.length}` : ''}
            </Text>
            <Pressable
              style={styles.lightboxClose}
              onPress={() => setLightboxPhotos(null)}
              accessibilityLabel="Cerrar"
            >
              <X size={24} color={COLORS.surface} />
            </Pressable>
          </View>
          {lightboxPhotos ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentOffset={{ x: lightboxIndex * 360, y: 0 }}
            >
              {lightboxPhotos.map((photo) => (
                <View key={photo.id} style={styles.lightboxSlide}>
                  {photo.url ? (
                    <Image source={{ uri: photo.url }} style={styles.lightboxImage} resizeMode="contain" />
                  ) : (
                    <View
                      style={[
                        styles.lightboxFill,
                        { backgroundColor: photo.tone ?? COLORS.primary },
                      ]}
                    >
                      <Camera size={80} color={COLORS.gold} strokeWidth={1} />
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          ) : null}
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
  pressed: {
    opacity: 0.85,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  heroThumb: {
    width: 84,
    height: 84,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  unitBadge: {
    alignSelf: 'flex-start',
    marginTop: SPACING.sm,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
  },
  unitBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gold,
  },
  kpiCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  kpiLeft: {
    flex: 1,
    alignItems: 'center',
  },
  ringCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPercent: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  kpiLabel: {
    marginTop: SPACING.sm,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  kpiDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.lg,
  },
  kpiRight: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiCalendarBadge: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  kpiRightLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  kpiRightValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  sectionCard: {
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
  sectionHeader: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  updateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
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
  specialtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  specialtyChip: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialtyLabel: {
    width: 88,
    marginLeft: SPACING.sm,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  specialtyTrack: {
    flex: 1,
    height: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  specialtyFill: {
    height: '100%',
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.gold,
  },
  specialtyPercent: {
    width: 38,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gold,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  historyThumb: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBody: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  historyDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  historyPercent: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.gold,
  },
  modalScreen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  modalClose: {
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
  modalContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  modalTitleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalCalendarBadge: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitleText: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  modalPhoto: {
    width: 120,
    height: 96,
    borderRadius: RADIUS.md,
    marginRight: SPACING.sm,
    overflow: 'hidden',
  },
  modalPhotoImage: {
    width: '100%',
    height: '100%',
  },
  modalPhotoTone: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
  },
  modalSummaryLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalSummaryValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.success,
  },
  modalPartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  modalPartIndex: {
    width: 18,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  modalPartName: {
    width: 92,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  lightboxScreen: {
    flex: 1,
    backgroundColor: '#000',
  },
  lightboxTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: 56,
  },
  lightboxCount: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.surface,
  },
  lightboxClose: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxSlide: {
    width: 360,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
  },
  lightboxFill: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});