import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { API_URL, IS_LOCAL_API_URL, authAPI } from '../services/api';

const APP_ICON = require('../../assets/icon.png');

const initialActivation = {
  email: '',
  cedula: '',
  inviteCode: '',
  password: '',
  confirmPassword: '',
  acceptedPrivacy: false,
  lopdpConsent: false,
  geolocationConsent: false,
};

const PLACEHOLDER_COLOR = '#64748b';

function getErrorMessage(err, fallback) {
  if (!err?.response && err?.message === 'Network Error') {
    if (IS_LOCAL_API_URL) {
      return `No se pudo conectar con ${API_URL}. En Expo Go usa la IP local de tu PC en EXPO_PUBLIC_API_URL.`;
    }
    return `No se pudo conectar con ${API_URL}. Verifica conexion a internet o disponibilidad del servidor.`;
  }
  return err?.response?.data?.message || err?.response?.data?.error || err?.message || fallback;
}

function getAuthToken(response) {
  return response?.data?.token || response?.data?.data?.token || response?.data?.accessToken || '';
}

function FieldLabel({ label }) {
  return <Text style={styles.fieldLabel}>{label}</Text>;
}

function FormInput({ label, style, ...props }) {
  return (
    <>
      <FieldLabel label={label} />
      <TextInput
        placeholderTextColor={PLACEHOLDER_COLOR}
        selectionColor="#0f766e"
        style={[styles.input, style]}
        {...props}
      />
    </>
  );
}

function PasswordInput({ label, value, onChangeText, placeholder, returnKeyType, onSubmitEditing }) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <FieldLabel label={label} />
      <View style={styles.passwordRow}>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmitEditing}
          placeholder={placeholder}
          placeholderTextColor={PLACEHOLDER_COLOR}
          returnKeyType={returnKeyType}
          secureTextEntry={!visible}
          selectionColor="#0f766e"
          style={styles.passwordInput}
          textContentType="password"
          value={value}
        />
        <TouchableOpacity
          accessibilityLabel={visible ? 'Ocultar clave' : 'Mostrar clave'}
          onPress={() => setVisible((current) => !current)}
          style={styles.eyeButton}
        >
          <Text style={styles.eyeText}>{visible ? 'Ocultar' : 'Ver'}</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

function ConsentRow({ checked, label, onPress }) {
  return (
    <TouchableOpacity
      accessibilityLabel={label}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.consentRow, checked && styles.consentRowOn]}
    >
      <Text style={[styles.checkbox, checked && styles.checkboxOn]}>{checked ? 'OK' : ''}</Text>
      <Text style={styles.consentText}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState('activar');
  const [email, setEmail] = useState('');
  const [tenantRuc, setTenantRuc] = useState('');
  const [password, setPassword] = useState('');
  const [keepSession, setKeepSession] = useState(true);
  const [resetCode, setResetCode] = useState('');
  const [activation, setActivation] = useState(initialActivation);
  const [loading, setLoading] = useState(false);

  const updateActivation = (key, value) => {
    setActivation((current) => ({ ...current, [key]: value }));
  };

  const handleActivate = async () => {
    const normalizedEmail = activation.email.trim().toLowerCase();
    const code = activation.inviteCode.trim().toUpperCase();

    if (!normalizedEmail || !code || !activation.password || !activation.confirmPassword) {
      Alert.alert('Datos requeridos', 'Ingresa email, código, clave y confirmación.');
      return;
    }

    if (activation.password !== activation.confirmPassword) {
      Alert.alert('Clave no coincide', 'La confirmación debe ser igual a la clave.');
      return;
    }

    if (!activation.acceptedPrivacy || !activation.lopdpConsent || !activation.geolocationConsent) {
      Alert.alert('Consentimiento requerido', 'Acepta privacidad, tratamiento de datos y geolocalización para usar asistencia móvil.');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.activateEmployee({
        email: normalizedEmail,
        cedula: activation.cedula.trim(),
        inviteCode: code,
        password: activation.password,
        acceptedPrivacy: activation.acceptedPrivacy,
        lopdpConsent: activation.lopdpConsent,
        geolocationConsent: activation.geolocationConsent,
      });
      const token = getAuthToken(response);
      if (!token) {
        throw new Error('La activación fue aceptada, pero el backend no devolvió token.');
      }
      await onLogin(token, response.data);
    } catch (err) {
      Alert.alert('No se pudo activar', getErrorMessage(err, 'Solicita a RRHH un código nuevo.'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      Alert.alert('Datos requeridos', 'Ingrese email y clave.');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.login(normalizedEmail, password, tenantRuc);
      const token = getAuthToken(response);
      if (!token) {
        throw new Error('El backend autenticó la solicitud pero no devolvió token.');
      }
      await onLogin(token, response.data, { persistLocal: keepSession });
    } catch (err) {
      Alert.alert('No se pudo iniciar sesión', getErrorMessage(err, 'Credenciales inválidas.'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      Alert.alert('Email requerido', 'Ingrese su correo para solicitar recuperación.');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.forgotPassword(normalizedEmail);
      Alert.alert('Solicitud registrada', response.data?.message || 'Revise su correo para continuar.');
      setMode('reset');
    } catch (err) {
      Alert.alert('No se pudo solicitar recuperación', getErrorMessage(err, 'Intente nuevamente.'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !resetCode || !password) {
      Alert.alert('Datos requeridos', 'Ingrese email, código y nueva clave.');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.resetPassword({ email: normalizedEmail, code: resetCode, password });
      Alert.alert('Clave actualizada', response.data?.message || 'Ya puede iniciar sesión.');
      setMode('login');
    } catch (err) {
      Alert.alert('No se pudo actualizar', getErrorMessage(err, 'Código inválido o expirado.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <View style={styles.brandHeader}>
          <Image
            accessibilityLabel="Icono de SKNOMINA"
            accessible
            resizeMode="contain"
            source={APP_ICON}
            style={styles.appIcon}
          />
          <Text style={styles.title}>SKNOMINA</Text>
          <Text style={styles.subtitle}>Asistencia móvil para empleados</Text>
        </View>

        <View style={styles.tabs}>
          {['activar', 'login', 'recuperar'].map((item) => (
            <TouchableOpacity
              key={item}
              onPress={() => setMode(item)}
              style={[styles.tab, mode === item && styles.tabActive]}
            >
              <Text style={[styles.tabText, mode === item && styles.tabTextActive]}>
                {item === 'activar' ? 'Activar' : item === 'login' ? 'Ingresar' : 'Clave'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {mode === 'activar' && (
          <>
            <Text style={styles.sectionTitle}>Activa tu acceso de empleado</Text>
            <FormInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              label="Correo registrado por RRHH"
              onChangeText={(value) => updateActivation('email', value)}
              placeholder="Email registrado por RRHH"
              textContentType="emailAddress"
              value={activation.email}
            />
            <FormInput
              keyboardType="number-pad"
              label="Cédula"
              onChangeText={(value) => updateActivation('cedula', value)}
              placeholder="Cédula opcional"
              value={activation.cedula}
            />
            <FormInput
              autoCapitalize="characters"
              label="Código de activación"
              onChangeText={(value) => updateActivation('inviteCode', String(value || '').replace(/[^a-zA-Z0-9-]/g, '').toUpperCase())}
              placeholder="Código de activación"
              value={activation.inviteCode}
            />
            <PasswordInput
              label="Crear clave"
              onChangeText={(value) => updateActivation('password', value)}
              placeholder="Crear clave"
              returnKeyType="next"
              value={activation.password}
            />
            <PasswordInput
              label="Confirmar clave"
              onChangeText={(value) => updateActivation('confirmPassword', value)}
              onSubmitEditing={handleActivate}
              placeholder="Confirmar clave"
              returnKeyType="go"
              value={activation.confirmPassword}
            />
            <ConsentRow
              checked={activation.acceptedPrivacy}
              label="Acepto la política de privacidad aplicable a la app de asistencia."
              onPress={() => updateActivation('acceptedPrivacy', !activation.acceptedPrivacy)}
            />
            <ConsentRow
              checked={activation.lopdpConsent}
              label="Acepto el tratamiento de mis datos laborales para registrar asistencia."
              onPress={() => updateActivation('lopdpConsent', !activation.lopdpConsent)}
            />
            <ConsentRow
              checked={activation.geolocationConsent}
              label="Acepto el uso de geolocalización durante cada marcación."
              onPress={() => updateActivation('geolocationConsent', !activation.geolocationConsent)}
            />
            <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleActivate} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Activando...' : 'Activar y entrar'}</Text>
            </TouchableOpacity>
          </>
        )}

        {mode === 'login' && (
          <>
            <FormInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              label="Correo"
              onChangeText={setEmail}
              placeholder="Email"
              textContentType="emailAddress"
              value={email}
            />
            <FormInput
              keyboardType="number-pad"
              label="RUC de empresa"
              onChangeText={(value) => setTenantRuc(String(value || '').replace(/\D/g, '').slice(0, 13))}
              placeholder="RUC de empresa (opcional)"
              value={tenantRuc}
            />
            <PasswordInput
              label="Clave"
              onChangeText={setPassword}
              onSubmitEditing={handleLogin}
              placeholder="Clave"
              returnKeyType="go"
              value={password}
            />
            <ConsentRow
              checked={keepSession}
              label="Mantener sesión en este equipo"
              onPress={() => setKeepSession((current) => !current)}
            />
            <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleLogin} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Ingresando...' : 'Ingresar'}</Text>
            </TouchableOpacity>
          </>
        )}

        {mode === 'recuperar' && (
          <>
            <FormInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              label="Correo"
              onChangeText={setEmail}
              placeholder="Email"
              textContentType="emailAddress"
              value={email}
            />
            <TouchableOpacity style={styles.secondaryButton} onPress={handleForgot} disabled={loading}>
              <Text style={styles.secondaryButtonText}>Solicitar código</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkButton} onPress={() => setMode('reset')}>
              <Text style={styles.linkText}>Ya tengo un código</Text>
            </TouchableOpacity>
          </>
        )}

        {mode === 'reset' && (
          <>
            <FormInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              label="Correo"
              onChangeText={setEmail}
              placeholder="Email"
              textContentType="emailAddress"
              value={email}
            />
            <FormInput
              keyboardType="number-pad"
              label="Código de recuperación"
              onChangeText={setResetCode}
              placeholder="Código"
              value={resetCode}
            />
            <PasswordInput
              label="Nueva clave"
              onChangeText={setPassword}
              placeholder="Nueva clave"
              returnKeyType="done"
              value={password}
            />
            <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleReset} disabled={loading}>
              <Text style={styles.buttonText}>Actualizar clave</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#f0fdfa',
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingBottom: 28,
    paddingHorizontal: 18,
    paddingTop: 42,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 3,
    maxWidth: 420,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    width: '100%',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 18,
  },
  appIcon: {
    borderRadius: 16,
    height: 72,
    marginBottom: 10,
    width: 72,
  },
  title: {
    color: '#0f766e',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  tab: {
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    flex: 1,
    paddingVertical: 10,
  },
  tabActive: {
    backgroundColor: '#0f766e',
  },
  tabText: {
    color: '#334155',
    fontWeight: '600',
  },
  tabTextActive: {
    color: 'white',
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  fieldLabel: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
    borderRadius: 8,
    borderWidth: 1,
    color: '#0f172a',
    fontSize: 16,
    marginBottom: 12,
    minHeight: 48,
    padding: 12,
  },
  passwordRow: {
    alignItems: 'center',
    borderColor: '#d1d5db',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
  },
  passwordInput: {
    color: '#0f172a',
    flex: 1,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  eyeButton: {
    alignItems: 'center',
    borderLeftColor: '#e2e8f0',
    borderLeftWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 76,
    paddingHorizontal: 12,
  },
  eyeText: {
    color: '#0f766e',
    fontWeight: '700',
  },
  consentRow: {
    alignItems: 'flex-start',
    borderColor: '#e2e8f0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
    padding: 12,
  },
  consentRowOn: {
    backgroundColor: '#ecfdf5',
    borderColor: '#99f6e4',
  },
  checkbox: {
    borderColor: '#94a3b8',
    borderRadius: 4,
    borderWidth: 1,
    color: '#0f766e',
    fontWeight: '900',
    height: 20,
    lineHeight: 18,
    textAlign: 'center',
    width: 20,
  },
  checkboxOn: {
    backgroundColor: '#ccfbf1',
    borderColor: '#0f766e',
  },
  consentText: {
    color: '#334155',
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#0f766e',
    borderRadius: 8,
    marginTop: 4,
    padding: 15,
  },
  buttonDisabled: {
    backgroundColor: '#99f6e4',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#0f766e',
    borderRadius: 8,
    borderWidth: 1,
    padding: 15,
  },
  secondaryButtonText: {
    color: '#0f766e',
    fontSize: 16,
    fontWeight: '700',
  },
  linkButton: {
    alignItems: 'center',
    padding: 14,
  },
  linkText: {
    color: '#0f766e',
    fontWeight: '600',
  },
});
