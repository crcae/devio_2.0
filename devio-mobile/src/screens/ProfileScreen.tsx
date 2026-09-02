import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Camera,
  ChevronRight,
  CircleUserRound,
  HelpCircle,
  Lock,
  LogOut,
  Save,
  Shield,
  X,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import { useApp } from '../context/AppContext';

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
  const { user, logout, updateProfile } = useApp();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [pickedAvatarUri, setPickedAvatarUri] = useState<string | null>(user?.photoUrl ?? null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (user?.name) setName(user.name);
    if (user?.email) setEmail(user.email);
    if (user?.photoUrl !== undefined) setPickedAvatarUri(user.photoUrl || null);
  }, [user]);

  const avatarUri = pickedAvatarUri ?? user?.photoUrl ?? null;

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Se necesita acceso a la galería para cambiar tu foto de perfil.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      setPickedAvatarUri(uri);
      try {
        await updateProfile({ photoUrl: uri });
      } catch (err) {
        console.warn('Error saving picked avatar:', err);
      }
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Datos requeridos', 'El nombre no puede estar vacío.');
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile({
        name: name.trim(),
        photoUrl: pickedAvatarUri ?? user?.photoUrl,
      });
      Alert.alert('Guardado', 'Tu información personal se actualizó correctamente.');
    } catch (err) {
      Alert.alert(
        'Error al guardar',
        err instanceof Error ? err.message : 'No fue posible actualizar tu perfil.',
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Campos requeridos', 'Completa todos los campos de contraseña.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Contraseñas no coinciden', 'La nueva contraseña y su confirmación deben ser iguales.');
      return;
    }
    setPasswordModalOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    Alert.alert('Contraseña actualizada', 'Tu contraseña se cambió correctamente.');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Eliminar cuenta',
      '¿Estás seguro de que deseas eliminar tu cuenta? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => logout() },
      ],
    );
  };

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Deseas cerrar tu sesión en este dispositivo?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const openUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'No fue posible abrir el enlace.');
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>Perfil</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initialsOf(user?.name)}</Text>
              </View>
            )}
            <Pressable
              style={styles.avatarEdit}
              onPress={handlePickImage}
              accessibilityLabel="Cambiar foto de perfil"
            >
              <Camera size={16} color={COLORS.surface} strokeWidth={2.2} />
            </Pressable>
          </View>
          <Text style={styles.avatarName}>{user?.name ?? 'Usuario DEVIO'}</Text>
          <Pressable style={styles.avatarEditLink} onPress={handlePickImage}>
            <Text style={styles.avatarEditText}>Cambiar foto de perfil</Text>
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Información Personal</Text>

          <Text style={styles.label}>Nombre</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Tu nombre completo"
            placeholderTextColor={COLORS.textSecondary}
            autoCorrect={false}
          />

          <Text style={styles.label}>Correo electrónico</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="tu@correo.com"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Pressable
            style={({ pressed }) => [styles.passwordRow, pressed && styles.pressed]}
            onPress={() => setPasswordModalOpen(true)}
          >
            <Lock size={18} color={COLORS.gold} strokeWidth={2} />
            <Text style={styles.passwordRowText}>Cambiar contraseña</Text>
            <ChevronRight size={18} color={COLORS.textSecondary} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
            onPress={handleSave}
            disabled={savingProfile}
          >
            {savingProfile ? (
              <ActivityIndicator color={COLORS.surface} />
            ) : (
              <>
                <Save size={18} color={COLORS.surface} strokeWidth={2.2} />
                <Text style={styles.saveButtonText}>Guardar</Text>
              </>
            )}
          </Pressable>

          <Pressable style={styles.deleteRow} onPress={handleDeleteAccount}>
            <Text style={styles.deleteText}>Eliminar cuenta</Text>
          </Pressable>
        </View>

        <Text style={styles.moduleLabel}>General</Text>
        <View style={styles.sectionCard}>
          <Pressable
            style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
            onPress={() => openUrl('https://app.deviomx.com/terminos_y_condiciones')}
          >
            <View style={styles.linkIcon}>
              <Shield size={20} color={COLORS.gold} strokeWidth={2} />
            </View>
            <Text style={styles.linkLabel}>Legal</Text>
            <ChevronRight size={18} color={COLORS.textSecondary} />
          </Pressable>
          <View style={styles.linkDivider} />
          <Pressable
            style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
            onPress={() => openUrl('https://wa.me/3321772355')}
          >
            <View style={styles.linkIcon}>
              <HelpCircle size={20} color={COLORS.gold} strokeWidth={2} />
            </View>
            <Text style={styles.linkLabel}>Soporte</Text>
            <ChevronRight size={18} color={COLORS.textSecondary} />
          </Pressable>
          <View style={styles.linkDivider} />
          <Pressable
            style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
            onPress={handleLogout}
          >
            <View style={[styles.linkIcon, { backgroundColor: '#FDEBEB' }]}>
              <LogOut size={20} color={COLORS.danger} strokeWidth={2} />
            </View>
            <Text style={[styles.linkLabel, { color: COLORS.danger }]}>Cerrar sesión</Text>
            <ChevronRight size={18} color={COLORS.textSecondary} />
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={passwordModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPasswordModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cambiar contraseña</Text>
              <Pressable
                style={styles.modalClose}
                onPress={() => setPasswordModalOpen(false)}
                accessibilityLabel="Cerrar"
              >
                <X size={22} color={COLORS.textPrimary} />
              </Pressable>
            </View>

            <Text style={styles.label}>Contraseña actual</Text>
            <TextInput
              style={styles.input}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textSecondary}
              secureTextEntry
            />

            <Text style={styles.label}>Nueva contraseña</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textSecondary}
              secureTextEntry
            />

            <Text style={styles.label}>Confirmar nueva contraseña</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textSecondary}
              secureTextEntry
            />

            <Pressable
              style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
              onPress={handleChangePassword}
            >
              <Lock size={18} color={COLORS.surface} strokeWidth={2.2} />
              <Text style={styles.saveButtonText}>Actualizar contraseña</Text>
            </Pressable>
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
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  topBarTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: 110,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: RADIUS.pill,
  },
  avatarText: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.gold,
  },
  avatarEdit: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
    borderWidth: 3,
    borderColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarName: {
    marginTop: SPACING.md,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  avatarEditLink: {
    marginTop: SPACING.xs,
  },
  avatarEditText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gold,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  input: {
    height: 50,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
  },
  passwordRowText: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    marginTop: SPACING.md,
  },
  saveButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.surface,
  },
  deleteRow: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
  },
  deleteText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.danger,
  },
  moduleLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  linkIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkLabel: {
    flex: 1,
    marginLeft: SPACING.md,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  linkDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    marginLeft: SPACING.lg,
  },
  pressed: {
    opacity: 0.85,
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
});