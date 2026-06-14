import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { authAPI, paymentAPI } from '../services/api';

const initialRegister = {
  razonSocial: '',
  nombreComercial: '',
  ruc: '',
  nombres: '',
  apellidos: '',
  email: '',
  password: '',
  planId: 'TRIAL',
  acceptedTerms: true,
  acceptedPrivacy: true,
};

function getErrorMessage(err, fallback) {
  return err?.response?.data?.message || err?.response?.data?.error || err?.message || fallback;
}

export default function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [plans, setPlans] = useState([]);
  const [registerForm, setRegisterForm] = useState(initialRegister);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    paymentAPI.plans()
      .then((response) => setPlans(response.data?.data || []))
      .catch((err) => {
        console.error('[MOBILE] No se pudieron cargar planes', {
          code: err?.response?.data?.error || 'PLANES_LOAD_FAILED',
          message: getErrorMessage(err, 'Error cargando planes.'),
        });
      });
  }, []);

  const updateRegister = (key, value) => {
    setRegisterForm((current) => ({ ...current, [key]: value }));
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Datos requeridos', 'Ingrese email y contraseña.');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.login(email, password);
      onLogin(response.data.token);
    } catch (err) {
      Alert.alert('No se pudo iniciar sesión', getErrorMessage(err, 'Credenciales inválidas.'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!registerForm.razonSocial || !registerForm.email || !registerForm.password || !registerForm.nombres) {
      Alert.alert('Datos requeridos', 'Complete empresa, nombres, email y contraseña.');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.publicRegister(registerForm);
      onLogin(response.data.token);
    } catch (err) {
      Alert.alert('No se pudo crear la cuenta', getErrorMessage(err, 'Revise los datos ingresados.'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!email) {
      Alert.alert('Email requerido', 'Ingrese su correo para solicitar recuperación.');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.forgotPassword(email);
      Alert.alert('Solicitud registrada', response.data?.message || 'Revise su correo para continuar.');
      setMode('reset');
    } catch (err) {
      Alert.alert('No se pudo solicitar recuperación', getErrorMessage(err, 'Intente nuevamente.'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!email || !resetCode || !password) {
      Alert.alert('Datos requeridos', 'Ingrese email, código y nueva contraseña.');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.resetPassword({ email, code: resetCode, password });
      Alert.alert('Contraseña actualizada', response.data?.message || 'Ya puede iniciar sesión.');
      setMode('login');
    } catch (err) {
      Alert.alert('No se pudo actualizar', getErrorMessage(err, 'Código inválido o expirado.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Nómina-Ec</Text>
        <Text style={styles.subtitle}>Marcaciones y nómina Ecuador</Text>

        <View style={styles.tabs}>
          {['login', 'registro', 'recuperar'].map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.tab, mode === item && styles.tabActive]}
              onPress={() => setMode(item)}
            >
              <Text style={[styles.tabText, mode === item && styles.tabTextActive]}>
                {item === 'login' ? 'Login' : item === 'registro' ? 'Registro' : 'Clave'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {mode === 'login' && (
          <>
            <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            <TextInput style={styles.input} placeholder="Contraseña" value={password} onChangeText={setPassword} secureTextEntry />
            <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleLogin} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Ingresando...' : 'Ingresar'}</Text>
            </TouchableOpacity>
          </>
        )}

        {mode === 'registro' && (
          <>
            <TextInput style={styles.input} placeholder="Razón social" value={registerForm.razonSocial} onChangeText={(value) => updateRegister('razonSocial', value)} />
            <TextInput style={styles.input} placeholder="Nombre comercial" value={registerForm.nombreComercial} onChangeText={(value) => updateRegister('nombreComercial', value)} />
            <TextInput style={styles.input} placeholder="RUC opcional" value={registerForm.ruc} onChangeText={(value) => updateRegister('ruc', value)} keyboardType="number-pad" />
            <TextInput style={styles.input} placeholder="Nombres" value={registerForm.nombres} onChangeText={(value) => updateRegister('nombres', value)} />
            <TextInput style={styles.input} placeholder="Apellidos" value={registerForm.apellidos} onChangeText={(value) => updateRegister('apellidos', value)} />
            <TextInput style={styles.input} placeholder="Email" value={registerForm.email} onChangeText={(value) => updateRegister('email', value)} autoCapitalize="none" keyboardType="email-address" />
            <TextInput style={styles.input} placeholder="Contraseña" value={registerForm.password} onChangeText={(value) => updateRegister('password', value)} secureTextEntry />
            <Text style={styles.planHint}>Plan inicial: {plans.find((plan) => plan.id === registerForm.planId)?.nombre || registerForm.planId}</Text>
            <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleRegister} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Creando...' : 'Crear cuenta'}</Text>
            </TouchableOpacity>
          </>
        )}

        {mode === 'recuperar' && (
          <>
            <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
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
            <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            <TextInput style={styles.input} placeholder="Código" value={resetCode} onChangeText={setResetCode} keyboardType="number-pad" />
            <TextInput style={styles.input} placeholder="Nueva contraseña" value={password} onChangeText={setPassword} secureTextEntry />
            <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleReset} disabled={loading}>
              <Text style={styles.buttonText}>Actualizar contraseña</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0fdfa',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#0f766e',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#6b7280',
    marginBottom: 22,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
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
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  planHint: {
    color: '#475569',
    fontSize: 13,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#0f766e',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 4,
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
    borderWidth: 1,
    borderColor: '#0f766e',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#0f766e',
    fontSize: 16,
    fontWeight: '700',
  },
  linkButton: {
    padding: 14,
    alignItems: 'center',
  },
  linkText: {
    color: '#0f766e',
    fontWeight: '600',
  },
});

