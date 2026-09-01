import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Bell,
  ChevronRight,
  CircleUserRound,
  FileText,
  HelpCircle,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Shield,
} from 'lucide-react-native';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import { useApp } from '../context/AppContext';
import * as Application from 'expo-application';

const APP_VERSION = Application.nativeApplicationVersion ?? '1.0.0';

function initialsOf(name: string | undefined): string {
  if (!name) return 'D';
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

export default function ProfileScreen() {
  const { user, logout } = useApp();
  const [showPersonal, setShowPersonal] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  const personalInfo = {
    email: user?.email ?? 'cliente@devio.mx',
    phone: '+52 444 123 4567',
    address: 'Av. Carranza 1020, San Luis Potosí, S.L.P.',
  };

  const handleChangePassword = () => {
    Alert.alert('Seguridad', 'El cambio de contraseña se habilitará próximamente.');
  };

  const handleLink = (label: string) => {
    Alert.alert(label, 'Documento disponible próximamente en el portal DEVIO.');
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header} edges={['top']}>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initialsOf(user?.name)}</Text>
          </View>
          <Text style={styles.name}>{user?.name ?? 'Carlos Mendoza'}</Text>
          <Text style={styles.email}>{user?.email ?? personalInfo.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>Inversionista / Propietario</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Configuración de cuenta</Text>

        <View style={styles.sectionCard}>
          <Pressable
            style={styles.sectionRow}
            onPress={() => setShowPersonal((current) => !current)}
          >
            <View style={[styles.sectionIcon, { backgroundColor: COLORS.goldLight }]}>
              <CircleUserRound size={20} color={COLORS.gold} strokeWidth={2} />
            </View>
            <Text style={styles.sectionLabel}>Información Personal</Text>
            <ChevronRight
              size={18}
              color={COLORS.textSecondary}
              style={showPersonal ? styles.chevronOpen : undefined}
            />
          </Pressable>

          {showPersonal ? (
            <View style={styles.personalDetails}>
              <View style={styles.detailRow}>
                <Mail size={16} color={COLORS.textSecondary} strokeWidth={2} />
                <Text style={styles.detailText}>{personalInfo.email}</Text>
              </View>
              <View style={styles.detailRow}>
                <Phone size={16} color={COLORS.textSecondary} strokeWidth={2} />
                <Text style={styles.detailText}>{personalInfo.phone}</Text>
              </View>
              <View style={styles.detailRow}>
                <MapPin size={16} color={COLORS.textSecondary} strokeWidth={2} />
                <Text style={styles.detailText}>{personalInfo.address}</Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          <Pressable style={styles.sectionRow} onPress={handleChangePassword}>
            <View style={[styles.sectionIcon, { backgroundColor: COLORS.goldLight }]}>
              <Lock size={20} color={COLORS.gold} strokeWidth={2} />
            </View>
            <Text style={styles.sectionLabel}>Seguridad</Text>
            <ChevronRight size={18} color={COLORS.textSecondary} />
          </Pressable>
          <View style={styles.sectionDivider} />
          <View style={styles.sectionRow}>
            <View style={[styles.sectionIcon, { backgroundColor: COLORS.goldLight }]}>
              <Shield size={20} color={COLORS.gold} strokeWidth={2} />
            </View>
            <View style={styles.sectionBody}>
              <Text style={styles.sectionLabel}>Cambiar contraseña</Text>
              <Text style={styles.sectionHint}>Actualiza tu contraseña de acceso</Text>
            </View>
            <Pressable onPress={handleChangePassword}>
              <ChevronRight size={18} color={COLORS.textSecondary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionRow}>
            <View style={[styles.sectionIcon, { backgroundColor: COLORS.goldLight }]}>
              <Bell size={20} color={COLORS.gold} strokeWidth={2} />
            </View>
            <View style={styles.sectionBody}>
              <Text style={styles.sectionLabel}>Notificaciones por correo</Text>
              <Text style={styles.sectionHint}>Resumen de pagos y avances</Text>
            </View>
            <Switch
              value={emailNotifications}
              onValueChange={setEmailNotifications}
              trackColor={{ false: COLORS.border, true: COLORS.gold }}
              thumbColor={COLORS.surface}
            />
          </View>
          <View style={styles.sectionDivider} />
          <View style={styles.sectionRow}>
            <View style={[styles.sectionIcon, { backgroundColor: COLORS.goldLight }]}>
              <Bell size={20} color={COLORS.gold} strokeWidth={2} />
            </View>
            <View style={styles.sectionBody}>
              <Text style={styles.sectionLabel}>Notificaciones push</Text>
              <Text style={styles.sectionHint}>Alertas en tiempo real</Text>
            </View>
            <Switch
              value={pushNotifications}
              onValueChange={setPushNotifications}
              trackColor={{ false: COLORS.border, true: COLORS.gold }}
              thumbColor={COLORS.surface}
            />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Pressable style={styles.sectionRow} onPress={() => handleLink('Términos y Condiciones')}>
            <View style={[styles.sectionIcon, { backgroundColor: COLORS.goldLight }]}>
              <FileText size={20} color={COLORS.gold} strokeWidth={2} />
            </View>
            <Text style={styles.sectionLabel}>Soporte y Legales</Text>
            <ChevronRight size={18} color={COLORS.textSecondary} />
          </Pressable>
          <View style={styles.sectionDivider} />
          <Pressable
            style={styles.linkRow}
            onPress={() => handleLink('Términos y Condiciones')}
          >
            <Text style={styles.linkText}>Términos y Condiciones</Text>
            <ChevronRight size={16} color={COLORS.textSecondary} />
          </Pressable>
          <Pressable style={styles.linkRow} onPress={() => handleLink('Aviso de Privacidad')}>
            <Text style={styles.linkText}>Aviso de Privacidad</Text>
            <ChevronRight size={16} color={COLORS.textSecondary} />
          </Pressable>
          <Pressable style={styles.linkRow} onPress={() => handleLink('Contacto DEVIO')}>
            <Text style={styles.linkText}>Contacto DEVIO</Text>
            <ChevronRight size={16} color={COLORS.textSecondary} />
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutPressed]}
          onPress={logout}
        >
          <LogOut size={18} color={COLORS.danger} strokeWidth={2.2} />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </Pressable>

        <Text style={styles.versionText}>DEVIO Mobile v{APP_VERSION}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.surface,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.gold,
  },
  name: {
    marginTop: SPACING.md,
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  email: {
    marginTop: 2,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  roleBadge: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.goldLight,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  sectionBody: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    flex: 1,
    marginLeft: SPACING.md,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  sectionHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    marginLeft: SPACING.md,
  },
  chevronOpen: {
    transform: [{ rotate: '90deg' }],
  },
  personalDetails: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  detailText: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginLeft: SPACING.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  linkText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    height: 52,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: COLORS.danger,
    backgroundColor: COLORS.surface,
  },
  logoutPressed: {
    backgroundColor: '#FDEBEB',
  },
  logoutText: {
    marginLeft: SPACING.sm,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.danger,
  },
  versionText: {
    marginTop: SPACING.lg,
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});