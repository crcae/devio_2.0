import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Camera, Hammer, Images, LandPlot, PaintRoller, X, Zap } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import { useApp } from '../context/AppContext';
import type { Progress } from '../types';
import type { RootStackParamList } from '../navigation/types';
import AppHeader from '../components/AppHeader';
import { SkeletonBlock, SkeletonCard } from '../components/SkeletonCard';

type Props = NativeStackScreenProps<RootStackParamList, 'Progress'>;

const SPECIALTY_ICONS = [LandPlot, Zap, PaintRoller, Hammer];

interface Specialty {
  id: string;
  name: string;
  percentage: number;
  icon: typeof LandPlot;
}

interface Photo {
  id: string;
  label: string;
  tone: string;
}

const MOCK_PHOTOS: Photo[] = [
  { id: 'photo-1', label: 'Actualización - Agosto 2026', tone: '#274565' },
  { id: 'photo-2', label: 'Actualización - Julio 2026', tone: COLORS.primary },
  { id: 'photo-3', label: 'Actualización - Junio 2026', tone: '#314F6E' },
  { id: 'photo-4', label: 'Actualización - Mayo 2026', tone: '#3A5A7C' },
];

export default function ProgressScreen({ navigation }: Props) {
  const { selectedProperty, progress, loadProgress, dataLoading } = useApp();
  const { width: lightboxWidth } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const unitId = selectedProperty?._id ?? '';
  const showOverlay = dataLoading && progress.length === 0;

  useEffect(() => {
    if (unitId) {
      loadProgress(unitId);
    }
  }, [unitId, loadProgress]);

  const specialties: Specialty[] = useMemo(() => {
    if (progress.length === 0) {
      return [
        { id: 'estructura', name: 'Estructura y Cimentación', percentage: 100, icon: LandPlot },
        { id: 'electricas', name: 'Instalaciones Eléctricas', percentage: 85, icon: Zap },
        { id: 'acabados', name: 'Acabados y Pintura', percentage: 60, icon: PaintRoller },
        { id: 'carpinteria', name: 'Carpintería y Pisos', percentage: 40, icon: Hammer },
      ];
    }
    return progress.map((item: Progress, index: number) => ({
      id: item._id,
      name: item.specialtyName,
      percentage: item.percentage,
      icon: SPECIALTY_ICONS[index % SPECIALTY_ICONS.length],
    }));
  }, [progress]);

  const overall = useMemo(() => {
    if (selectedProperty?.generalProgress != null) return selectedProperty.generalProgress;
    if (specialties.length > 0) {
      const avg = specialties.reduce((sum, s) => sum + s.percentage, 0) / specialties.length;
      return Math.round(avg);
    }
    return 78;
  }, [selectedProperty?.generalProgress, specialties]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (unitId) {
      await loadProgress(unitId);
    }
    setRefreshing(false);
  };

  const renderSpecialty = ({ item }: { item: Specialty }) => (
    <View style={styles.specialtyCard}>
      <View style={styles.specialtyHeader}>
        <View style={styles.specialtyIcon}>
          <item.icon size={18} color={COLORS.gold} strokeWidth={2} />
        </View>
        <Text style={styles.specialtyName}>{item.name}</Text>
        <Text style={styles.specialtyPercent}>{item.percentage}%</Text>
      </View>
      <View style={styles.specialtyTrack}>
        <View style={[styles.specialtyFill, { width: `${item.percentage}%` }]} />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <AppHeader title="Avance de Obra" onBack={() => navigation.goBack()} />

      {showOverlay ? (
        <View style={styles.list}>
          <SkeletonCard>
            <SkeletonBlock width="100%" height={140} borderRadius={12} />
          </SkeletonCard>
          <Text style={styles.sectionTitle}>Especialidades</Text>
          <SkeletonCard>
            <SkeletonBlock width="70%" height={16} />
            <View style={{ height: 10 }} />
            <SkeletonBlock width="100%" height={8} borderRadius={4} />
          </SkeletonCard>
          <SkeletonCard>
            <SkeletonBlock width="70%" height={16} />
            <View style={{ height: 10 }} />
            <SkeletonBlock width="100%" height={8} borderRadius={4} />
          </SkeletonCard>
          <SkeletonCard>
            <SkeletonBlock width="70%" height={16} />
            <View style={{ height: 10 }} />
            <SkeletonBlock width="100%" height={8} borderRadius={4} />
          </SkeletonCard>
        </View>
      ) : (
        <FlatList
          data={specialties}
          keyExtractor={(item) => item.id}
          renderItem={renderSpecialty}
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
          ListHeaderComponent={
            <View>
              <View style={styles.heroCard}>
                <Text style={styles.heroCaption}>
                  {selectedProperty?.name ?? 'Solea Residencial | 1A'}
                </Text>
                <Text style={styles.heroPercent}>{overall}%</Text>
                <Text style={styles.heroLabel}>Completado</Text>
                <View style={styles.heroTrack}>
                  <View style={[styles.heroFill, { width: `${overall}%` }]} />
                </View>
              </View>

              <Text style={styles.sectionTitle}>Especialidades</Text>

              <View style={styles.photosHeader}>
                <Text style={styles.sectionTitleNoMargin}>Galería de avances</Text>
                <Images size={18} color={COLORS.gold} strokeWidth={2} />
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.photosScroll}
              >
                {MOCK_PHOTOS.map((photo, index) => (
                  <Pressable
                    key={photo.id}
                    style={({ pressed }) => [
                      styles.photoCard,
                      { backgroundColor: photo.tone },
                      pressed && styles.photoPressed,
                    ]}
                    onPress={() => setLightboxIndex(index)}
                  >
                    <Camera size={34} color={COLORS.gold} strokeWidth={1.6} />
                    <Text style={styles.photoLabel}>{photo.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          }
        />
      )}

      <Modal
        visible={lightboxIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxIndex(null)}
      >
        <View style={styles.lightboxBackdrop}>
          <View style={styles.lightboxTopBar}>
            <Text style={styles.lightboxCount}>
              {lightboxIndex !== null ? `${lightboxIndex + 1} / ${MOCK_PHOTOS.length}` : ''}
            </Text>
            <Pressable
              style={styles.lightboxClose}
              onPress={() => setLightboxIndex(null)}
              accessibilityLabel="Cerrar"
            >
              <X size={26} color={COLORS.surface} />
            </Pressable>
          </View>

          {lightboxIndex !== null ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentOffset={{ x: lightboxIndex * lightboxWidth, y: 0 }}
            >
              {MOCK_PHOTOS.map((photo) => (
                <View
                  key={photo.id}
                  style={[styles.lightboxSlide, { width: lightboxWidth }]}
                >
                  <ScrollView
                    maximumZoomScale={4}
                    minimumZoomScale={1}
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                    style={styles.lightboxZoom}
                    contentContainerStyle={styles.lightboxZoomContent}
                  >
                    <View
                      style={[styles.lightboxImage, { backgroundColor: photo.tone }]}
                    >
                      <Camera size={96} color={COLORS.gold} strokeWidth={1} />
                    </View>
                  </ScrollView>
                  <Text style={styles.lightboxLabel}>{photo.label}</Text>
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
  list: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  heroCard: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  heroCaption: {
    fontSize: 13,
    color: COLORS.goldLight,
    textAlign: 'center',
  },
  heroPercent: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.surface,
    marginTop: SPACING.sm,
  },
  heroLabel: {
    fontSize: 14,
    color: '#B8C4D4',
    marginTop: 2,
  },
  heroTrack: {
    width: '100%',
    height: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginTop: SPACING.lg,
    overflow: 'hidden',
  },
  heroFill: {
    height: '100%',
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.gold,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionTitleNoMargin: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  specialtyCard: {
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
  specialtyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  specialtyIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialtyName: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  specialtyPercent: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gold,
  },
  specialtyTrack: {
    height: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(31,54,82,0.15)',
    overflow: 'hidden',
  },
  specialtyFill: {
    height: '100%',
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.gold,
  },
  photosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  photosScroll: {
    marginHorizontal: -SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  photoCard: {
    width: 160,
    height: 130,
    borderRadius: RADIUS.lg,
    marginRight: SPACING.md,
    padding: SPACING.md,
    justifyContent: 'space-between',
  },
  photoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.surface,
  },
  photoPressed: {
    opacity: 0.85,
  },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: '#000',
  },
  lightboxTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: 56,
    paddingBottom: SPACING.md,
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
    flex: 1,
  },
  lightboxZoom: {
    flex: 1,
  },
  lightboxZoomContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImage: {
    width: '100%',
    height: 280,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxLabel: {
    color: COLORS.surface,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },
});