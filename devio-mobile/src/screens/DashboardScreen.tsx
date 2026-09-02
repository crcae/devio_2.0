import React, { useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bath, BedDouble, Bell, Building2, FileText, HardHat, Home, Ruler, User, Wallet, X } from 'lucide-react-native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import { useApp } from '../context/AppContext';
import type { Unit } from '../types';
import { MOCK_PROPERTIES } from '../services/mockData';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import type { AdaptedProperty } from '../services/bubbleAdapter';
import EnvBadge from '../components/EnvBadge';
import EmptyState from '../components/EmptyState';
import { SkeletonBlock, SkeletonCard } from '../components/SkeletonCard';

type DashboardNavigationProp = BottomTabNavigationProp<MainTabParamList, 'home'>;

interface Props {
  navigation: DashboardNavigationProp;
}

const LOCATION = 'José Hernandez Guerra, 78421 San Luis Potosí, S.L.P.';

interface AppNotification {
  id: string;
  icon: typeof Bell;
  title: string;
  detail: string;
  time: string;
}

const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    icon: HardHat,
    title: 'Nuevo reporte de avance de obra disponible',
    detail: 'Solea Residencial | 1A',
    time: 'Hace 2 días',
  },
  {
    id: 'notif-2',
    icon: Wallet,
    title: 'Recibo de pago de Agosto disponible',
    detail: 'Pago 3 - Mensualidad',
    time: 'Hace 5 días',
  },
  {
    id: 'notif-3',
    icon: FileText,
    title: 'Comprobante de enganche generado',
    detail: 'Enganche (Contado)',
    time: 'Hace 1 semana',
  },
];

function PropertyImage({ unit }: { unit: Unit }) {
  if (unit.image) {
    return <Image source={{ uri: unit.image }} style={styles.propertyImage} resizeMode="cover" />;
  }
  return (
    <View style={[styles.propertyImage, styles.propertyImagePlaceholder]}>
      <Building2 size={48} color={COLORS.gold} strokeWidth={1.5} />
    </View>
  );
}

export default function DashboardScreen({ navigation }: Props) {
  const { user, userProperties, selectedProperty, setSelectedProperty, loadUserProperties, dataLoading, isDemoMode } =
    useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const data = userProperties.length > 0 ? userProperties : isDemoMode ? MOCK_PROPERTIES : [];
  const showOverlay = dataLoading && userProperties.length === 0;

  const openProfileTab = () => {
    navigation.navigate('user');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (user) {
      await loadUserProperties(user._id);
    }
    setRefreshing(false);
  };

  const handlePress = (item: Unit) => {
    setSelectedProperty(item);
    navigation
      .getParent<NativeStackNavigationProp<RootStackParamList>>()
      ?.navigate('PropertyDetail', { unitId: item._id });
  };

  const renderProperty = ({ item }: { item: Unit }) => {
    const adapted = item as AdaptedProperty;
    const isActive = selectedProperty?._id === item._id;
    const tipo = adapted.tipo ? `${adapted.tipo.charAt(0).toUpperCase()}${adapted.tipo.slice(1)}` : 'Departamento';
    return (
      <Pressable
        style={[styles.card, isActive && styles.cardActive]}
        onPress={() => handlePress(item)}
      >
        <View style={styles.imageWrap}>
          <PropertyImage unit={item} />
          <View style={styles.tag}>
            <Text style={styles.tagText}>{tipo}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardLocation}>{adapted.location || LOCATION}</Text>

          <View style={styles.badgesRow}>
            <View style={styles.badge}>
              <Ruler size={13} color={COLORS.textSecondary} strokeWidth={2} />
              <Text style={styles.badgeText}>{item.surfaceM2} m²</Text>
            </View>
            <View style={styles.badge}>
              <BedDouble size={13} color={COLORS.textSecondary} strokeWidth={2} />
              <Text style={styles.badgeText}>{item.bedrooms} Cuartos</Text>
            </View>
            <View style={styles.badge}>
              <Bath size={13} color={COLORS.textSecondary} strokeWidth={2} />
              <Text style={styles.badgeText}>{item.bathrooms} Baños</Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.topBar} edges={['top']}>
        <View style={styles.topBarRow}>
          <View style={styles.logoWrap}>
            <Text style={styles.logo}>DEVIO</Text>
            <EnvBadge />
          </View>
          <View style={styles.topBarActions}>
            <Pressable
              style={({ pressed }) => [styles.notificationCircle, pressed && styles.pressed]}
              onPress={() => setNotificationsOpen(true)}
              accessibilityLabel="Notificaciones"
            >
              <Bell size={18} color={COLORS.primary} strokeWidth={2} />
              <View style={styles.notificationDot}>
                <Text style={styles.notificationDotText}>1</Text>
              </View>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.avatarCircle, pressed && styles.pressed]}
              onPress={openProfileTab}
              accessibilityLabel="Perfil"
            >
              {user?.name ? (
                <Text style={styles.avatarInitial}>{user.name.charAt(0).toUpperCase()}</Text>
              ) : (
                <User size={18} color={COLORS.primary} strokeWidth={2} />
              )}
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      {showOverlay ? (
        <View style={styles.list}>
          {[0, 1].map((key) => (
            <SkeletonCard key={key}>
              <SkeletonBlock width="100%" height={150} borderRadius={16} />
              <View style={styles.skeletonBody}>
                <SkeletonBlock width="70%" height={18} />
                <View style={{ height: 8 }} />
                <SkeletonBlock width="90%" height={13} />
                <View style={styles.skeletonBadges}>
                  <SkeletonBlock width={64} height={26} borderRadius={13} />
                  <SkeletonBlock width={64} height={26} borderRadius={13} />
                  <SkeletonBlock width={64} height={26} borderRadius={13} />
                </View>
              </View>
            </SkeletonCard>
          ))}
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item._id}
          renderItem={renderProperty}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          ListHeaderComponent={
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Mis Propiedades</Text>
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icon={Home}
              title="No tienes unidades asignadas"
              description="Cuando se asigne una unidad a tu cuenta, aparecerá aquí."
            />
          }
        />
      )}

      <Modal
        visible={notificationsOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setNotificationsOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setNotificationsOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Notificaciones</Text>
                <Text style={styles.modalSubtitle}>3 novedades recientes</Text>
              </View>
              <Pressable
                style={styles.modalClose}
                onPress={() => setNotificationsOpen(false)}
                accessibilityLabel="Cerrar notificaciones"
              >
                <X size={22} color={COLORS.textPrimary} />
              </Pressable>
            </View>

            {MOCK_NOTIFICATIONS.map((notification) => (
              <View key={notification.id} style={styles.notificationRow}>
                <View style={styles.notificationIcon}>
                  <notification.icon size={20} color={COLORS.gold} strokeWidth={2} />
                </View>
                <View style={styles.notificationBody}>
                  <Text style={styles.notificationTitle}>{notification.title}</Text>
                  <Text style={styles.notificationDetail}>{notification.detail}</Text>
                </View>
                <Text style={styles.notificationTime}>{notification.time}</Text>
              </View>
            ))}
          </Pressable>
        </Pressable>
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
    backgroundColor: COLORS.primary,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  logo: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.surface,
    letterSpacing: 4,
  },
  logoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationCircle: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  notificationDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.danger,
    borderWidth: 2,
    borderColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notificationDotText: {
    color: COLORS.surface,
    fontSize: 10,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.8,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: 110,
  },
  skeletonBody: {
    paddingTop: SPACING.md,
  },
  skeletonBadges: {
    flexDirection: 'row',
    marginTop: SPACING.md,
  },
  sectionHeader: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  cardActive: {
    borderColor: COLORS.gold,
    borderWidth: 2,
  },
  imageWrap: {
    position: 'relative',
  },
  propertyImage: {
    width: '100%',
    height: 160,
    borderRadius: 16,
  },
  propertyImagePlaceholder: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tag: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cardBody: {
    padding: SPACING.md,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cardLocation: {
    marginTop: 2,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  badgesRow: {
    flexDirection: 'row',
    marginTop: SPACING.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    marginRight: SPACING.sm,
  },
  badgeText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
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
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  notificationIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBody: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  notificationDetail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  notificationTime: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
  },
});