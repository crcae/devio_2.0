import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff, FlaskConical, Lock, Mail } from 'lucide-react-native';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import { useApp } from '../context/AppContext';
import EnvBadge from '../components/EnvBadge';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const { login, isLoading: isAuthenticating, isDemoMode } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mockEnabled, setMockEnabled] = useState(isDemoMode);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }
    setError(null);
    try {
      await login(email.trim(), password.trim(), mockEnabled);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible iniciar sesión.');
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Recuperar contraseña',
      'Por motivos de seguridad, para recuperar tu contraseña comunícate directamente con tu asesor DEVIO o a soporte@deviomx.com',
      [{ text: 'Entendido' }],
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.branding}>
        <View style={styles.brandRow}>
          <View style={styles.brandSpacer} />
          <Text style={styles.logo}>DEVIO</Text>
          <View style={styles.badgeWrap}>
            <EnvBadge />
          </View>
        </View>
        <Text style={styles.heading}>Bienvenido a DEVIO</Text>
        <Text style={styles.subtitle}>Ingresa con los accesos proporcionados por tu asesor</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Acceso Inversionistas</Text>

        <Text style={styles.label}>Email</Text>
        <View style={[styles.field, emailFocused && styles.fieldFocused]}>
          <Mail size={20} color={emailFocused ? COLORS.gold : COLORS.textSecondary} strokeWidth={2} />
          <TextInput
            style={styles.fieldInput}
            placeholder="ejemplo@dominio.com"
            placeholderTextColor={COLORS.textSecondary}
            value={email}
            onChangeText={setEmail}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />
        </View>

        <Text style={styles.label}>Contraseña</Text>
        <View style={[styles.field, passwordFocused && styles.fieldFocused]}>
          <Lock size={20} color={passwordFocused ? COLORS.gold : COLORS.textSecondary} strokeWidth={2} />
          <TextInput
            style={styles.fieldInput}
            placeholder="••••••••"
            placeholderTextColor={COLORS.textSecondary}
            value={password}
            onChangeText={setPassword}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <Pressable
            style={styles.eyeButton}
            onPress={() => setShowPassword((current) => !current)}
            accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            hitSlop={8}
          >
            {showPassword ? (
              <EyeOff size={20} color={COLORS.textSecondary} />
            ) : (
              <Eye size={20} color={COLORS.textSecondary} />
            )}
          </Pressable>
        </View>

        <Pressable style={styles.forgotRow} onPress={handleForgotPassword}>
          <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={handleLogin}
          disabled={isAuthenticating}
        >
          {isAuthenticating ? (
            <ActivityIndicator color={COLORS.surface} />
          ) : (
            <Text style={styles.buttonText}>Iniciar Sesión</Text>
          )}
        </Pressable>

        <View style={styles.demoToggle}>
          <View style={styles.demoToggleIcon}>
            <FlaskConical size={16} color={COLORS.gold} strokeWidth={2} />
          </View>
          <View style={styles.demoToggleText}>
            <Text style={styles.demoToggleLabel}>Modo Pruebas (Mock Data)</Text>
            <Text style={styles.demoToggleHint}>
              {mockEnabled
                ? 'Inicia sesión sin conexión a Bubble'
                : 'Usa autenticación real de Bubble'}
            </Text>
          </View>
          <Switch
            value={mockEnabled}
            onValueChange={setMockEnabled}
            trackColor={{ false: COLORS.border, true: COLORS.gold }}
            thumbColor={COLORS.surface}
            style={styles.demoSwitch}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  branding: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  brandSpacer: {
    width: 70,
  },
  badgeWrap: {
    width: 70,
    alignItems: 'flex-end',
  },
  logo: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.surface,
    letterSpacing: 5,
    textAlign: 'center',
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.surface,
    marginTop: SPACING.lg,
  },
  subtitle: {
    marginTop: SPACING.xs,
    fontSize: 14,
    color: '#B8C4D4',
    textAlign: 'center',
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  fieldFocused: {
    borderColor: COLORS.gold,
  },
  fieldInput: {
    flex: 1,
    height: '100%',
    marginLeft: SPACING.sm,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  eyeButton: {
    paddingHorizontal: SPACING.xs,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  forgotRow: {
    alignSelf: 'flex-start',
    marginBottom: SPACING.md,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  error: {
    color: COLORS.danger,
    fontSize: 13,
    marginBottom: SPACING.md,
  },
  button: {
    height: 54,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '700',
  },
  demoToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  demoToggleIcon: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoToggleText: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  demoToggleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  demoToggleHint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  demoSwitch: {
    transform: [{ scale: 0.8 }],
  },
});